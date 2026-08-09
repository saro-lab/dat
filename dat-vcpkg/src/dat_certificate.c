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
#include <openssl/crypto.h>

#ifndef __STDC_NO_ATOMICS__
#  include <stdatomic.h>
#  define DAT_REFCOUNT_T        atomic_uint
#  define DAT_REFCOUNT_INIT(p)  atomic_init(&(p), 1u)
#  define DAT_REFCOUNT_INC(p)   atomic_fetch_add_explicit(&(p), 1u, memory_order_relaxed)
#  define DAT_REFCOUNT_DEC(p)   atomic_fetch_sub_explicit(&(p), 1u, memory_order_acq_rel)
#else
#  include <pthread.h>
static pthread_mutex_t g_refcount_lock = PTHREAD_MUTEX_INITIALIZER;
static unsigned refcount_add(unsigned* p, int delta) {
    pthread_mutex_lock(&g_refcount_lock);
    unsigned prev = *p;
    *p = (unsigned)((int)prev + delta);
    pthread_mutex_unlock(&g_refcount_lock);
    return prev;
}
#  define DAT_REFCOUNT_T        unsigned
#  define DAT_REFCOUNT_INIT(p)  ((p) = 1u)
#  define DAT_REFCOUNT_INC(p)   refcount_add(&(p), 1)
#  define DAT_REFCOUNT_DEC(p)   refcount_add(&(p), -1)
#endif

struct dat_certificate {
    uint64_t         cid;
    dat_signature_t* signature;
    dat_crypto_t*    crypto;
    uint64_t         dat_issuance_start_seconds;
    uint64_t         dat_issuance_end_seconds;
    uint64_t         dat_ttl_seconds;
    uint64_t         expire_seconds;
    DAT_REFCOUNT_T   refcount;
};

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

static dat_error_t cert_from(uint64_t cid,
                              uint64_t start, uint64_t duration, uint64_t ttl,
                              dat_signature_t* sig, dat_crypto_t* cryp,
                              dat_certificate_t** out) {
    if (duration > UINT64_MAX - start) {
        dat_signature_free(sig); dat_crypto_free(cryp);
        return DAT_CERT_MALFORMED;
    }
    uint64_t end = start + duration;
    if (ttl > UINT64_MAX - end) {
        dat_signature_free(sig); dat_crypto_free(cryp);
        return DAT_CERT_MALFORMED;
    }
    uint64_t expire = end + ttl;

    dat_certificate_t* c = malloc(sizeof(struct dat_certificate));
    if (!c) { dat_signature_free(sig); dat_crypto_free(cryp); return DAT_INTERNAL_UNKNOWN; }
    c->cid                        = cid;
    c->signature                  = sig;
    c->crypto                     = cryp;
    c->dat_issuance_start_seconds = start;
    c->dat_issuance_end_seconds   = end;
    c->dat_ttl_seconds            = ttl;
    c->expire_seconds             = expire;
    DAT_REFCOUNT_INIT(c->refcount);
    *out = c;
    return DAT_SUCCESS;
}

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
    if (!str || !out) return DAT_CONFIG_ARGUMENT_INVALID;

    const char* parts[8];
    size_t      lens[8];
    int         count = 0;
    const char* p = str;
    while (count < 8) {
        const char* dot = strchr(p, '.');
        if (!dot) {
            if (count < 7) return DAT_CERT_MALFORMED;
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
    if (count != 8) return DAT_CERT_MALFORMED;
    if (strchr(parts[7] + lens[7], '.') != NULL) return DAT_CERT_MALFORMED;

#define PARSE_FIELD(idx, base, dest) \
    do { \
        if (!parse_u64_strict(parts[idx], lens[idx], base, &dest)) return DAT_CERT_MALFORMED; \
    } while(0)

    uint64_t cid, start, duration, ttl;
    PARSE_FIELD(0, 16, cid);
    PARSE_FIELD(1, 10, start);
    PARSE_FIELD(2, 10, duration);
    PARSE_FIELD(3, 10, ttl);
#undef PARSE_FIELD

    char alg_str[32];
    if (lens[4] == 0 || lens[4] >= sizeof(alg_str)) return DAT_CERT_MALFORMED;
    memcpy(alg_str, parts[4], lens[4]); alg_str[lens[4]] = '\0';
    dat_signature_alg_t sig_alg;
    dat_error_t err = dat_signature_alg_from_str(alg_str, &sig_alg);
    if (err != DAT_SUCCESS) return err;

    char calg_str[32];
    if (lens[5] == 0 || lens[5] >= sizeof(calg_str)) return DAT_CERT_MALFORMED;
    memcpy(calg_str, parts[5], lens[5]); calg_str[lens[5]] = '\0';
    dat_crypto_alg_t crypto_alg;
    err = dat_crypto_alg_from_str(calg_str, &crypto_alg);
    if (err != DAT_SUCCESS) return err;

    uint8_t* sig_key = NULL;  size_t sig_key_len = 0;
    err = decode_base64_url(parts[6], lens[6], &sig_key, &sig_key_len);
    if (err != DAT_SUCCESS) return (err == DAT_CONFIG_ARGUMENT_INVALID) ? DAT_CERT_MALFORMED : err;

    uint8_t* cryp_key = NULL; size_t cryp_key_len = 0;
    err = decode_base64_url(parts[7], lens[7], &cryp_key, &cryp_key_len);
    if (err != DAT_SUCCESS) { free(sig_key); return (err == DAT_CONFIG_ARGUMENT_INVALID) ? DAT_CERT_MALFORMED : err; }

    dat_signature_t* sig = NULL;
    err = dat_signature_from_key(sig_alg, sig_key, sig_key_len, &sig);
    OPENSSL_cleanse(sig_key, sig_key_len);
    free(sig_key);
    if (err != DAT_SUCCESS) { OPENSSL_cleanse(cryp_key, cryp_key_len); free(cryp_key); return err; }

    dat_crypto_t* cryp = NULL;
    err = dat_crypto_from_key(crypto_alg, cryp_key, cryp_key_len, &cryp);
    OPENSSL_cleanse(cryp_key, cryp_key_len);
    free(cryp_key);
    if (err != DAT_SUCCESS) { dat_signature_free(sig); return err; }

    return cert_from(cid, start, duration, ttl, sig, cryp, out);
}

dat_error_t dat_certificate_export(const dat_certificate_t* cert, bool verify_only,
                                    char** out) {
    if (!cert || !out) return DAT_CONFIG_ARGUMENT_INVALID;

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

#define PUSH(expr)                                                             \
    do {                                                                       \
        dat_error_t _e = (expr);                                               \
        if (_e != DAT_SUCCESS) {                                               \
            sbuf_free(&v);                                                     \
            OPENSSL_cleanse(sig_key, sig_key_len);   free(sig_key);            \
            OPENSSL_cleanse(cryp_key, cryp_key_len); free(cryp_key);           \
            return _e;                                                         \
        }                                                                      \
    } while (0)

    PUSH(to_hex_u64_out(cert->cid, &v));

    char nb[21];
    PUSH(sbuf_push_char(&v, '.'));
    snprintf(nb, sizeof(nb), "%" PRIu64, cert->dat_issuance_start_seconds);
    PUSH(sbuf_push_str(&v, nb));

    PUSH(sbuf_push_char(&v, '.'));
    snprintf(nb, sizeof(nb), "%" PRIu64,
             cert->dat_issuance_end_seconds - cert->dat_issuance_start_seconds);
    PUSH(sbuf_push_str(&v, nb));

    PUSH(sbuf_push_char(&v, '.'));
    snprintf(nb, sizeof(nb), "%" PRIu64, cert->dat_ttl_seconds);
    PUSH(sbuf_push_str(&v, nb));

    PUSH(sbuf_push_char(&v, '.'));
    PUSH(sbuf_push_str(&v, dat_signature_alg_to_str(dat_signature_algorithm(cert->signature))));
    PUSH(sbuf_push_char(&v, '.'));
    PUSH(sbuf_push_str(&v, dat_crypto_alg_to_str(dat_crypto_algorithm(cert->crypto))));

    PUSH(sbuf_push_char(&v, '.'));
#undef PUSH
    err = encode_base64_url_out(sig_key, sig_key_len, &v);
    OPENSSL_cleanse(sig_key, sig_key_len);
    free(sig_key);
    if (err != DAT_SUCCESS) {
        sbuf_free(&v);
        OPENSSL_cleanse(cryp_key, cryp_key_len);
        free(cryp_key);
        return err;
    }

    err = sbuf_push_char(&v, '.');
    if (err != DAT_SUCCESS) {
        sbuf_free(&v);
        OPENSSL_cleanse(cryp_key, cryp_key_len);
        free(cryp_key);
        return err;
    }
    err = encode_base64_url_out(cryp_key, cryp_key_len, &v);
    OPENSSL_cleanse(cryp_key, cryp_key_len);
    free(cryp_key);
    if (err != DAT_SUCCESS) { sbuf_free(&v); return err; }

    *out = sbuf_take(&v);
    return DAT_SUCCESS;
}

void dat_certificate_free(dat_certificate_t* cert) {
    if (!cert) return;
    if (DAT_REFCOUNT_DEC(cert->refcount) != 1u) return;
    dat_signature_free(cert->signature);
    dat_crypto_free(cert->crypto);
    free(cert);
}

dat_error_t dat_certificate_clone(const dat_certificate_t* cert, dat_certificate_t** out) {
    if (!cert || !out) return DAT_CONFIG_ARGUMENT_INVALID;
    dat_certificate_t* c = (dat_certificate_t*)cert;
    DAT_REFCOUNT_INC(c->refcount);
    *out = c;
    return DAT_SUCCESS;
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
