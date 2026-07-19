#include "../include/dat/dat.h"
#include "dat_util.h"
#include "dat_crypto.h"
#include "dat_signature.h"
#include "dat_certificate_internal.h"
#include "dat_dat.h"
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>
#include <limits.h>

/* ── Internal struct ─────────────────────────────────────────────────────── */

struct dat_manager {
    pthread_rwlock_t    lock;
    dat_certificate_t*  issuer;
    dat_certificate_t** certificates;
    size_t              cert_count;
    size_t              cert_cap;
};

/* ── payload ─────────────────────────────────────────────────────────────── */

void dat_payload_free(dat_payload_t* p) {
    if (!p) return;
    free(p->plain_bytes);
    free(p->secure_bytes);
    free(p);
}

static dat_error_t make_payload(uint8_t* plain, size_t plen,
                                 uint8_t* secure, size_t slen,
                                 dat_payload_t** out) {
    dat_payload_t* r = malloc(sizeof(dat_payload_t));
    if (!r) { free(plain); free(secure); return DAT_ERROR_MALLOC_FAILED; }
    r->plain_bytes  = plain;  r->plain_len  = plen;
    r->secure_bytes = secure; r->secure_len = slen;
    *out = r;
    return DAT_SUCCESS;
}

/* ── lifecycle ───────────────────────────────────────────────────────────── */

dat_manager_t* dat_manager_new(void) {
    dat_manager_t* m = calloc(1, sizeof(struct dat_manager));
    if (!m) return NULL;
    pthread_rwlock_init(&m->lock, NULL);
    return m;
}

void dat_manager_free(dat_manager_t* m) {
    if (!m) return;
    dat_certificate_free(m->issuer);
    for (size_t i = 0; i < m->cert_count; i++)
        dat_certificate_free(m->certificates[i]);
    free(m->certificates);
    pthread_rwlock_destroy(&m->lock);
    free(m);
}

/* ── _issue / _parse (low-level, cert explicit) ──────────────────────────── */

dat_error_t dat_manager_issue_with_cert(const dat_certificate_t* cert,
                                         const char* plain, const char* secure,
                                         char** out) {
    if (!cert || !out) return DAT_ERROR_MANAGER_ERROR;

    size_t plain_len  = plain  ? strlen(plain)  : 0;
    size_t secure_len = secure ? strlen(secure) : 0;

    uint64_t now = now_unix_timestamp();
    uint64_t ttl = dat_certificate_get_ttl(cert);
    if (ttl > UINT64_MAX - now) return DAT_ERROR_OVERFLOW;
    uint64_t expire = now + ttl;

    size_t cap = 100 + (plain_len + secure_len + 100) * 4 / 3 + 60;
    dat_sbuf_t v;
    dat_error_t err = sbuf_init(&v, cap);
    if (err != DAT_SUCCESS) return err;

    /* expire */
    char ebuf[21];
    snprintf(ebuf, sizeof(ebuf), "%" PRIu64, expire);
    sbuf_push_str(&v, ebuf);
    sbuf_push_char(&v, '.');

    /* hex(cid) */
    to_hex_u64_out(dat_certificate_cid(cert), &v);
    sbuf_push_char(&v, '.');

    /* b64url(plain) */
    err = encode_base64_url_out((const uint8_t*)plain, plain_len, &v);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }
    sbuf_push_char(&v, '.');

    /* b64url(encrypt(secure)) */
    uint8_t* enc = NULL; size_t enc_len = 0;
    err = dat_crypto_encrypt(dat_certificate_get_crypto(cert),
                             (const uint8_t*)secure, secure_len,
                             &enc, &enc_len);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }
    err = encode_base64_url_out(enc, enc_len, &v);
    free(enc);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }

    /* b64url(sign(body)) — body is everything written so far */
    sbuf_push_char(&v, '.');
    size_t body_len = v.len - 1; /* exclude the trailing '.' we just added */

    uint8_t* sig = NULL; size_t sig_len = 0;
    err = dat_signature_sign(dat_certificate_get_signature(cert),
                             (const uint8_t*)v.data, body_len,
                             &sig, &sig_len);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }
    err = encode_base64_url_out(sig, sig_len, &v);
    free(sig);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }

    *out = sbuf_take(&v);
    return DAT_SUCCESS;
}

static dat_error_t parse_impl(const dat_certificate_t* cert, dat_dat_t* d,
                               bool verify, dat_payload_t** out) {
    dat_error_t err = DAT_SUCCESS;
    if (verify) {
        err = dat_signature_verify(dat_certificate_get_signature(cert),
                                   (const uint8_t*)d->body, d->body_len,
                                   d->signature, d->signature_len);
        if (err != DAT_SUCCESS) { dat_dat_free(d); return DAT_ERROR_INVALID_DAT; }
    }

    uint8_t* plain = NULL; size_t plen = 0;
    err = dat_dat_plain(d, &plain, &plen);
    if (err != DAT_SUCCESS) { dat_dat_free(d); return err; }

    uint8_t* enc = NULL; size_t enc_len = 0;
    err = dat_dat_secure(d, &enc, &enc_len);
    dat_dat_free(d);
    if (err != DAT_SUCCESS) { free(plain); return err; }

    uint8_t* secure = NULL; size_t slen = 0;
    err = dat_crypto_decrypt(dat_certificate_get_crypto(cert), enc, enc_len,
                             &secure, &slen);
    free(enc);
    if (err != DAT_SUCCESS) { free(plain); return err; }

    return make_payload(plain, plen, secure, slen, out);
}

dat_error_t dat_manager_parse_with_cert(const dat_certificate_t* cert,
                                         const char* dat_str, dat_payload_t** out) {
    dat_dat_t* d = NULL;
    dat_error_t err = dat_dat_parse(dat_str, &d);
    if (err != DAT_SUCCESS) return err;
    return parse_impl(cert, d, true, out);
}

dat_error_t dat_manager_parse_without_verify_with_cert(const dat_certificate_t* cert,
                                                         const char* dat_str,
                                                         dat_payload_t** out) {
    dat_dat_t* d = NULL;
    dat_error_t err = dat_dat_parse(dat_str, &d);
    if (err != DAT_SUCCESS) return err;
    return parse_impl(cert, d, false, out);
}

/* ── import_certificates ─────────────────────────────────────────────────── */

static int cmp_u64(const void* a, const void* b) {
    uint64_t x = *(const uint64_t*)a, y = *(const uint64_t*)b;
    return (x > y) - (x < y);
}

static int cmp_cert_end(const void* a, const void* b) {
    const dat_certificate_t* ca = *(const dat_certificate_t* const*)a;
    const dat_certificate_t* cb = *(const dat_certificate_t* const*)b;
    uint64_t ea = dat_certificate_get_end(ca);
    uint64_t eb = dat_certificate_get_end(cb);
    return (ea > eb) - (ea < eb);
}

dat_error_t dat_manager_import_certificates(dat_manager_t* m,
                                             dat_certificate_t** new_certs,
                                             size_t new_count,
                                             bool clear,
                                             size_t* count_out) {
    if (!m) return DAT_ERROR_MANAGER_ERROR;
    if (new_count == 0) return DAT_SUCCESS;

    /* 1. Duplicate cid check among new_certs */
    uint64_t* ids = malloc(new_count * sizeof(uint64_t));
    if (!ids) return DAT_ERROR_MALLOC_FAILED;
    for (size_t i = 0; i < new_count; i++)
        ids[i] = dat_certificate_cid(new_certs[i]);
    qsort(ids, new_count, sizeof(uint64_t), cmp_u64);
    for (size_t i = 1; i < new_count; i++) {
        if (ids[i] == ids[i-1]) { free(ids); return DAT_ERROR_DUPLICATED_CID; }
    }
    free(ids);

    /* 2. Build working list starting from existing (if !clear) */
    pthread_rwlock_rdlock(&m->lock);
    size_t old_count = clear ? 0 : m->cert_count;
    dat_certificate_t** work = malloc((old_count + new_count) * sizeof(dat_certificate_t*));
    if (!work) { pthread_rwlock_unlock(&m->lock); return DAT_ERROR_MALLOC_FAILED; }
    size_t wcount = 0;
    dat_error_t err = DAT_SUCCESS;

    for (size_t i = 0; i < old_count; i++) {
        err = dat_certificate_clone(m->certificates[i], &work[wcount]);
        if (err != DAT_SUCCESS) {
            pthread_rwlock_unlock(&m->lock);
            goto fail;
        }
        wcount++;
    }
    pthread_rwlock_unlock(&m->lock);

    /* 3. Add new certs not already present */
    size_t applied = 0;
    for (size_t i = 0; i < new_count; i++) {
        uint64_t ncid = dat_certificate_cid(new_certs[i]);
        bool found = false;
        for (size_t j = 0; j < wcount; j++) {
            if (dat_certificate_cid(work[j]) == ncid) { found = true; break; }
        }
        if (!found) {
            err = dat_certificate_clone(new_certs[i], &work[wcount]);
            if (err != DAT_SUCCESS) goto fail;
            wcount++;
            applied++;
        }
    }

    /* 4. Filter expired */
    size_t live = 0;
    for (size_t i = 0; i < wcount; i++) {
        if (!dat_certificate_expired(work[i]))
            work[live++] = work[i];
        else
            dat_certificate_free(work[i]);
    }
    wcount = live;

    /* 5. Sort by dat_issuance_end_seconds ascending */
    qsort(work, wcount, sizeof(dat_certificate_t*), cmp_cert_end);

    /* 6. Find issuer: last issuable cert */
    dat_certificate_t* issuer = NULL;
    for (size_t i = wcount; i > 0; i--) {
        if (dat_certificate_issuable(work[i-1])) {
            err = dat_certificate_clone(work[i-1], &issuer);
            if (err != DAT_SUCCESS) goto fail;
            break;
        }
    }

    /* 7. Write-lock and swap */
    pthread_rwlock_wrlock(&m->lock);
    dat_certificate_free(m->issuer);
    for (size_t i = 0; i < m->cert_count; i++)
        dat_certificate_free(m->certificates[i]);
    free(m->certificates);
    m->issuer       = issuer;
    m->certificates = work;
    m->cert_count   = wcount;
    m->cert_cap     = wcount;
    pthread_rwlock_unlock(&m->lock);

    if (count_out) *count_out = applied;
    return DAT_SUCCESS;

fail:
    for (size_t i = 0; i < wcount; i++) dat_certificate_free(work[i]);
    free(work);
    return err;
}

dat_error_t dat_manager_import(dat_manager_t* m, const char* format, bool clear, size_t* count_out) {
    if (!m) return DAT_ERROR_MANAGER_ERROR;
    if (!format) return DAT_SUCCESS;
    /* Trim leading whitespace */
    while (*format == ' ' || *format == '\r' || *format == '\n' || *format == '\t') format++;
    if (*format == '\0') return DAT_SUCCESS;

    /* Count non-empty lines */
    size_t max_lines = 1;
    for (const char* p = format; *p; p++) if (*p == '\n') max_lines++;

    dat_certificate_t** certs = malloc(max_lines * sizeof(dat_certificate_t*));
    if (!certs) return DAT_ERROR_MALLOC_FAILED;
    size_t count = 0;
    dat_error_t err = DAT_SUCCESS;

    const char* p = format;
    while (*p) {
        const char* nl = strchr(p, '\n');
        size_t line_len = nl ? (size_t)(nl - p) : strlen(p);
        /* trim trailing \r and spaces */
        while (line_len > 0 &&
               (p[line_len-1] == '\r' || p[line_len-1] == ' ' || p[line_len-1] == '\t'))
            line_len--;
        if (line_len > 0) {
            char* line = malloc(line_len + 1);
            if (!line) { err = DAT_ERROR_MALLOC_FAILED; goto fail; }
            memcpy(line, p, line_len); line[line_len] = '\0';
            err = dat_certificate_parse(line, &certs[count]);
            free(line);
            if (err != DAT_SUCCESS) goto fail;
            count++;
        }
        if (!nl) break;
        p = nl + 1;
    }

    err = dat_manager_import_certificates(m, certs, count, clear, count_out);
fail:
    for (size_t i = 0; i < count; i++) dat_certificate_free(certs[i]);
    free(certs);
    return err;
}

/* ── manager public API ──────────────────────────────────────────────────── */

dat_error_t dat_manager_issue(dat_manager_t* m, const char* plain,
                               const char* secure, char** out) {
    if (!m || !out) return DAT_ERROR_MANAGER_ERROR;
    pthread_rwlock_rdlock(&m->lock);
    const dat_certificate_t* iss = m->issuer;
    bool has_certs = m->cert_count > 0;
    if (!iss) {
        pthread_rwlock_unlock(&m->lock);
        return has_certs
            ? DAT_ERROR_MANAGER_ERROR   /* has certs but none signable */
            : DAT_ERROR_MANAGER_ERROR;  /* no certs at all */
    }
    dat_certificate_t* clone = NULL;
    dat_error_t err = dat_certificate_clone(iss, &clone);
    pthread_rwlock_unlock(&m->lock);
    if (err != DAT_SUCCESS) return err;
    err = dat_manager_issue_with_cert(clone, plain, secure, out);
    dat_certificate_free(clone);
    return err;
}

static dat_error_t manager_parse_internal(dat_manager_t* m, const char* dat_str,
                                           bool verify, dat_payload_t** out) {
    if (!m || !dat_str || !out) return DAT_ERROR_MANAGER_ERROR;

    dat_dat_t* d = NULL;
    dat_error_t err = dat_dat_parse(dat_str, &d);
    if (err != DAT_SUCCESS) return err;
    uint64_t cid = d->cid;

    pthread_rwlock_rdlock(&m->lock);
    dat_certificate_t* clone = NULL;
    for (size_t i = 0; i < m->cert_count; i++) {
        if (dat_certificate_cid(m->certificates[i]) == cid) {
            dat_certificate_clone(m->certificates[i], &clone);
            break;
        }
    }
    pthread_rwlock_unlock(&m->lock);

    if (!clone) { dat_dat_free(d); return DAT_ERROR_CID_NOT_FOUND; }
    err = parse_impl(clone, d, verify, out);
    dat_certificate_free(clone);
    return err;
}

dat_error_t dat_manager_parse(dat_manager_t* m, const char* dat_str,
                               dat_payload_t** out) {
    return manager_parse_internal(m, dat_str, true, out);
}

dat_error_t dat_manager_parse_without_verify(dat_manager_t* m, const char* dat_str,
                                              dat_payload_t** out) {
    return manager_parse_internal(m, dat_str, false, out);
}

dat_error_t dat_manager_export_cids(dat_manager_t* m, uint64_t** cids, size_t* count) {
    if (!m || !cids || !count) return DAT_ERROR_MANAGER_ERROR;
    pthread_rwlock_rdlock(&m->lock);
    *count = m->cert_count;
    if (m->cert_count == 0) { *cids = NULL; pthread_rwlock_unlock(&m->lock); return DAT_SUCCESS; }
    *cids = malloc(m->cert_count * sizeof(uint64_t));
    if (!*cids) { pthread_rwlock_unlock(&m->lock); return DAT_ERROR_MALLOC_FAILED; }
    for (size_t i = 0; i < m->cert_count; i++)
        (*cids)[i] = dat_certificate_cid(m->certificates[i]);
    pthread_rwlock_unlock(&m->lock);
    return DAT_SUCCESS;
}

dat_error_t dat_manager_export(dat_manager_t* m, bool verify_only, char** out) {
    if (!m || !out) return DAT_ERROR_MANAGER_ERROR;
    pthread_rwlock_rdlock(&m->lock);
    if (m->cert_count == 0) {
        pthread_rwlock_unlock(&m->lock);
        *out = calloc(1, 1);
        return *out ? DAT_SUCCESS : DAT_ERROR_MALLOC_FAILED;
    }
    dat_sbuf_t v;
    dat_error_t err = sbuf_init(&v, m->cert_count * 300);
    if (err != DAT_SUCCESS) { pthread_rwlock_unlock(&m->lock); return err; }
    for (size_t i = 0; i < m->cert_count; i++) {
        char* s = NULL;
        err = dat_certificate_export(m->certificates[i], verify_only, &s);
        if (err != DAT_SUCCESS) { pthread_rwlock_unlock(&m->lock); sbuf_free(&v); return err; }
        if (i > 0) sbuf_push_char(&v, '\n');
        sbuf_push_str(&v, s);
        free(s);
    }
    pthread_rwlock_unlock(&m->lock);
    *out = sbuf_take(&v);
    return DAT_SUCCESS;
}

dat_error_t dat_manager_export_certificates(dat_manager_t* m,
                                             dat_certificate_t*** certs,
                                             size_t* count) {
    if (!m || !certs || !count) return DAT_ERROR_MANAGER_ERROR;
    pthread_rwlock_rdlock(&m->lock);
    *count = m->cert_count;
    if (m->cert_count == 0) {
        *certs = NULL; pthread_rwlock_unlock(&m->lock); return DAT_SUCCESS;
    }
    *certs = malloc(m->cert_count * sizeof(dat_certificate_t*));
    if (!*certs) { pthread_rwlock_unlock(&m->lock); return DAT_ERROR_MALLOC_FAILED; }
    size_t n = 0; dat_error_t err = DAT_SUCCESS;
    for (; n < m->cert_count; n++) {
        err = dat_certificate_clone(m->certificates[n], &(*certs)[n]);
        if (err != DAT_SUCCESS) break;
    }
    pthread_rwlock_unlock(&m->lock);
    if (err != DAT_SUCCESS) {
        for (size_t i = 0; i < n; i++) dat_certificate_free((*certs)[i]);
        free(*certs); *certs = NULL; *count = 0;
    }
    return err;
}
