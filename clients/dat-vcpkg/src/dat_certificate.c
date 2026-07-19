#include "../include/dat/dat.h"
#include "dat_util.h"
#include "dat_crypto.h"
#include "dat_signature.h"
#include "dat_certificate_internal.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <inttypes.h>
#include <stdint.h>
#include <limits.h>

/* ── Internal struct ─────────────────────────────────────────────────────── */

struct dat_certificate {
    uint64_t         cid;
    dat_signature_t* signature;
    dat_crypto_t*    crypto;
    uint64_t         dat_issuance_start_seconds;
    uint64_t         dat_issuance_end_seconds;
    uint64_t         dat_ttl_seconds;
    uint64_t         expire_seconds;
};

/* ── Package-private accessors ───────────────────────────────────────────── */

dat_signature_t* dat_certificate_get_signature(const dat_certificate_t* cert) {
    return cert->signature;
}
dat_crypto_t* dat_certificate_get_crypto(const dat_certificate_t* cert) {
    return cert->crypto;
}
uint64_t dat_certificate_get_ttl(const dat_certificate_t* cert) {
    return cert->dat_ttl_seconds;
}
uint64_t dat_certificate_get_end(const dat_certificate_t* cert) {
    return cert->dat_issuance_end_seconds;
}

/* ── Internal constructor ────────────────────────────────────────────────── */

static dat_error_t cert_from(uint64_t cid,
                              uint64_t start, uint64_t duration, uint64_t ttl,
                              dat_signature_t* sig, dat_crypto_t* cryp,
                              dat_certificate_t** out) {
    if (duration > UINT64_MAX - start) {
        dat_signature_free(sig); dat_crypto_free(cryp);
        return DAT_ERROR_CERTIFICATE_ERROR;
    }
    uint64_t end = start + duration;
    if (ttl > UINT64_MAX - end) {
        dat_signature_free(sig); dat_crypto_free(cryp);
        return DAT_ERROR_CERTIFICATE_ERROR;
    }
    uint64_t expire = end + ttl;

    dat_certificate_t* c = malloc(sizeof(struct dat_certificate));
    if (!c) { dat_signature_free(sig); dat_crypto_free(cryp); return DAT_ERROR_MALLOC_FAILED; }
    c->cid                        = cid;
    c->signature                  = sig;
    c->crypto                     = cryp;
    c->dat_issuance_start_seconds = start;
    c->dat_issuance_end_seconds   = end;
    c->dat_ttl_seconds            = ttl;
    c->expire_seconds             = expire;
    *out = c;
    return DAT_SUCCESS;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

dat_error_t dat_certificate_create(uint64_t cid,
                                    uint64_t start, uint64_t duration, uint64_t ttl,
                                    dat_signature_alg_t sig_alg,
                                    dat_crypto_alg_t crypto_alg,
                                    dat_certificate_t** out) {
    dat_signature_t* sig = NULL;
    dat_error_t err = dat_signature_new(sig_alg, &sig);
    if (err != DAT_SUCCESS) return err;

    dat_crypto_t* cryp = NULL;
    err = dat_crypto_new(crypto_alg, &cryp);
    if (err != DAT_SUCCESS) { dat_signature_free(sig); return err; }

    return cert_from(cid, start, duration, ttl, sig, cryp, out);
}

dat_error_t dat_certificate_parse(const char* str, dat_certificate_t** out) {
    if (!str || !out) return DAT_ERROR_CERTIFICATE_ERROR;

    const char* parts[8];
    size_t      lens[8];
    int         count = 0;
    const char* p = str;
    while (count < 8) {
        const char* dot = strchr(p, '.');
        if (!dot) {
            if (count < 7) return DAT_ERROR_CERTIFICATE_ERROR;
            parts[count] = p;
            lens[count]  = strlen(p);
            count++;
            break;
        }
        parts[count] = p;
        lens[count]  = (size_t)(dot - p);
        count++;
        p = dot + 1;
    }
    if (count != 8) return DAT_ERROR_CERTIFICATE_ERROR;
    /* Must be exactly 8 parts — no extra dots */
    if (strchr(parts[7] + lens[7], '.') != NULL) return DAT_ERROR_CERTIFICATE_ERROR;
    /* Actually parts[7] ends at its length, check no dot in remaining input */
    /* (Already handled by the loop stopping at count==8) */

    char buf[33];
    char* endptr;

#define PARSE_FIELD(idx, base, dest) \
    do { \
        if (lens[idx] == 0 || lens[idx] >= sizeof(buf)) return DAT_ERROR_CERTIFICATE_ERROR; \
        memcpy(buf, parts[idx], lens[idx]); buf[lens[idx]] = '\0'; \
        dest = (uint64_t)strtoull(buf, &endptr, base); \
        if (*endptr != '\0') return DAT_ERROR_CERTIFICATE_ERROR; \
    } while(0)

    uint64_t cid, start, duration, ttl;
    PARSE_FIELD(0, 16, cid);
    PARSE_FIELD(1, 10, start);
    PARSE_FIELD(2, 10, duration);
    PARSE_FIELD(3, 10, ttl);
#undef PARSE_FIELD

    char alg_str[32];
    if (lens[4] == 0 || lens[4] >= sizeof(alg_str)) return DAT_ERROR_CERTIFICATE_ERROR;
    memcpy(alg_str, parts[4], lens[4]); alg_str[lens[4]] = '\0';
    dat_signature_alg_t sig_alg;
    dat_error_t err = dat_signature_alg_from_str(alg_str, &sig_alg);
    if (err != DAT_SUCCESS) return err;

    char calg_str[32];
    if (lens[5] == 0 || lens[5] >= sizeof(calg_str)) return DAT_ERROR_CERTIFICATE_ERROR;
    memcpy(calg_str, parts[5], lens[5]); calg_str[lens[5]] = '\0';
    dat_crypto_alg_t crypto_alg;
    err = dat_crypto_alg_from_str(calg_str, &crypto_alg);
    if (err != DAT_SUCCESS) return err;

    uint8_t* sig_key = NULL;  size_t sig_key_len = 0;
    err = decode_base64_url(parts[6], lens[6], &sig_key, &sig_key_len);
    if (err != DAT_SUCCESS) return err;

    uint8_t* cryp_key = NULL; size_t cryp_key_len = 0;
    err = decode_base64_url(parts[7], lens[7], &cryp_key, &cryp_key_len);
    if (err != DAT_SUCCESS) { free(sig_key); return err; }

    dat_signature_t* sig = NULL;
    err = dat_signature_from_key(sig_alg, sig_key, sig_key_len, &sig);
    free(sig_key);
    if (err != DAT_SUCCESS) { free(cryp_key); return err; }

    dat_crypto_t* cryp = NULL;
    err = dat_crypto_from_key(crypto_alg, cryp_key, cryp_key_len, &cryp);
    free(cryp_key);
    if (err != DAT_SUCCESS) { dat_signature_free(sig); return err; }

    return cert_from(cid, start, duration, ttl, sig, cryp, out);
}

dat_error_t dat_certificate_export(const dat_certificate_t* cert, bool verify_only,
                                    char** out) {
    if (!cert || !out) return DAT_ERROR_CERTIFICATE_ERROR;

    uint8_t* sig_key = NULL; size_t sig_key_len = 0;
    dat_error_t err = verify_only
        ? dat_signature_export_verify_only_key(cert->signature, &sig_key, &sig_key_len)
        : dat_signature_export_key(cert->signature, &sig_key, &sig_key_len);
    if (err != DAT_SUCCESS) return err;

    uint8_t* cryp_key = NULL; size_t cryp_key_len = 0;
    err = dat_crypto_export_key(cert->crypto, &cryp_key, &cryp_key_len);
    if (err != DAT_SUCCESS) { free(sig_key); return err; }

    size_t cap = 80 + dat_signature_key_base64_len(cert->signature)
                    + dat_crypto_key_base64_len(cert->crypto) + 10;
    dat_sbuf_t v;
    err = sbuf_init(&v, cap);
    if (err != DAT_SUCCESS) { free(sig_key); free(cryp_key); return err; }

    to_hex_u64_out(cert->cid, &v);

    char nb[21];
    sbuf_push_char(&v, '.');
    snprintf(nb, sizeof(nb), "%" PRIu64, cert->dat_issuance_start_seconds);
    sbuf_push_str(&v, nb);

    sbuf_push_char(&v, '.');
    snprintf(nb, sizeof(nb), "%" PRIu64,
             cert->dat_issuance_end_seconds - cert->dat_issuance_start_seconds);
    sbuf_push_str(&v, nb);

    sbuf_push_char(&v, '.');
    snprintf(nb, sizeof(nb), "%" PRIu64, cert->dat_ttl_seconds);
    sbuf_push_str(&v, nb);

    sbuf_push_char(&v, '.');
    sbuf_push_str(&v, dat_signature_alg_to_str(dat_signature_algorithm(cert->signature)));
    sbuf_push_char(&v, '.');
    sbuf_push_str(&v, dat_crypto_alg_to_str(dat_crypto_algorithm(cert->crypto)));

    sbuf_push_char(&v, '.');
    err = encode_base64_url_out(sig_key, sig_key_len, &v);
    free(sig_key);
    if (err != DAT_SUCCESS) { sbuf_free(&v); free(cryp_key); return err; }

    sbuf_push_char(&v, '.');
    err = encode_base64_url_out(cryp_key, cryp_key_len, &v);
    free(cryp_key);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }

    *out = sbuf_take(&v);
    return DAT_SUCCESS;
}

void dat_certificate_free(dat_certificate_t* cert) {
    if (!cert) return;
    dat_signature_free(cert->signature);
    dat_crypto_free(cert->crypto);
    free(cert);
}

dat_error_t dat_certificate_clone(const dat_certificate_t* cert, dat_certificate_t** out) {
    if (!cert || !out) return DAT_ERROR_CERTIFICATE_ERROR;
    char* s = NULL;
    dat_error_t err = dat_certificate_export(cert, false, &s);
    if (err != DAT_SUCCESS) return err;
    err = dat_certificate_parse(s, out);
    free(s);
    return err;
}

bool dat_certificate_expired(const dat_certificate_t* cert) {
    return cert->expire_seconds < now_unix_timestamp();
}

bool dat_certificate_issuable(const dat_certificate_t* cert) {
    if (!dat_certificate_signable(cert)) return false;
    uint64_t now = now_unix_timestamp();
    return cert->dat_issuance_start_seconds <= now &&
           now <= cert->dat_issuance_end_seconds;
}

bool dat_certificate_signable(const dat_certificate_t* cert) {
    return dat_signature_signable(cert->signature);
}

bool dat_certificate_support_verify_only(const dat_certificate_t* cert) {
    return dat_signature_support_verify_only(cert->signature);
}

dat_signature_alg_t dat_certificate_signature_algorithm(const dat_certificate_t* cert) {
    return dat_signature_algorithm(cert->signature);
}

dat_crypto_alg_t dat_certificate_crypto_algorithm(const dat_certificate_t* cert) {
    return dat_crypto_algorithm(cert->crypto);
}

uint64_t dat_certificate_cid(const dat_certificate_t* cert) {
    return cert->cid;
}
