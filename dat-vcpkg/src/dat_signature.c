#include "dat_signature.h"
#include <stdlib.h>
#include <string.h>
/* ECDSA_SIG is only used as a DER <-> raw r||s converter; unlike ECDSA_do_sign
 * and the whole EC_KEY API it is not deprecated in OpenSSL 3.0. */
#include <openssl/ecdsa.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>
#include <openssl/bn.h>
#include <openssl/core_names.h>
#include <openssl/param_build.h>
#include <openssl/params.h>

/* ── Algorithm lists ──────────────────────────────────────────────── */

const dat_signature_alg_t DAT_SIGNATURE_ALG_LIST[6] = {
    DAT_SIG_HMAC_SHA256_MFS,
    DAT_SIG_HMAC_SHA384_MFS,
    DAT_SIG_HMAC_SHA512_MFS,
    DAT_SIG_ECDSA_P256,
    DAT_SIG_ECDSA_P384,
    DAT_SIG_ECDSA_P521
};
const size_t DAT_SIGNATURE_ALG_COUNT = 6;

const char* dat_signature_alg_to_str(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_HMAC_SHA256_MFS: return "HMAC-SHA256-MFS";
        case DAT_SIG_HMAC_SHA384_MFS: return "HMAC-SHA384-MFS";
        case DAT_SIG_HMAC_SHA512_MFS: return "HMAC-SHA512-MFS";
        case DAT_SIG_ECDSA_P256:      return "ECDSA-P256";
        case DAT_SIG_ECDSA_P384:      return "ECDSA-P384";
        case DAT_SIG_ECDSA_P521:      return "ECDSA-P521";
        default: return NULL;
    }
}

dat_error_t dat_signature_alg_from_str(const char* s, dat_signature_alg_t* out) {
    /* NULL 인자는 "알 수 없는 알고리즘"이 아니라 호출자의 실수다. */
    if (!s || !out) return DAT_CONFIG_ARGUMENT_INVALID;
    if (strcmp(s, "HMAC-SHA256-MFS") == 0) { *out = DAT_SIG_HMAC_SHA256_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "HMAC-SHA384-MFS") == 0) { *out = DAT_SIG_HMAC_SHA384_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "HMAC-SHA512-MFS") == 0) { *out = DAT_SIG_HMAC_SHA512_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P256")      == 0) { *out = DAT_SIG_ECDSA_P256;      return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P384")      == 0) { *out = DAT_SIG_ECDSA_P384;      return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P521")      == 0) { *out = DAT_SIG_ECDSA_P521;      return DAT_SUCCESS; }
    return DAT_CONFIG_ALG_UNSUPPORTED;
}

/* ── ECDSA helpers ────────────────────────────────────────────────── */

static const char* ecdsa_group(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256: return "P-256";
        case DAT_SIG_ECDSA_P384: return "P-384";
        case DAT_SIG_ECDSA_P521: return "P-521";
        default: return NULL;
    }
}

static size_t ecdsa_priv_len(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256: return 32;
        case DAT_SIG_ECDSA_P384: return 48;
        case DAT_SIG_ECDSA_P521: return 66;
        default: return 0;
    }
}

static size_t ecdsa_pub_len(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256: return 65;
        case DAT_SIG_ECDSA_P384: return 97;
        case DAT_SIG_ECDSA_P521: return 133;
        default: return 0;
    }
}

static const EVP_MD* ecdsa_md(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256: return EVP_sha256();
        case DAT_SIG_ECDSA_P384: return EVP_sha384();
        case DAT_SIG_ECDSA_P521: return EVP_sha512();
        default: return NULL;
    }
}

static dat_sig_family_t alg_family(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256:
        case DAT_SIG_ECDSA_P384:
        case DAT_SIG_ECDSA_P521:
            return DAT_SIG_FAMILY_ECDSA;
        default:
            return DAT_SIG_FAMILY_HMAC;
    }
}

/* ── HMAC helpers ─────────────────────────────────────────────────── */

static size_t hmac_key_len(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_HMAC_SHA256_MFS: return 32;
        case DAT_SIG_HMAC_SHA384_MFS: return 48;
        case DAT_SIG_HMAC_SHA512_MFS: return 64;
        default: return 0;
    }
}

static const EVP_MD* hmac_md(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_HMAC_SHA256_MFS: return EVP_sha256();
        case DAT_SIG_HMAC_SHA384_MFS: return EVP_sha384();
        case DAT_SIG_HMAC_SHA512_MFS: return EVP_sha512();
        default: return NULL;
    }
}

/* ── ECDSA key construction (EVP_PKEY) ────────────────────────────── */

/* Builds an EVP_PKEY from the raw wire representation: the private scalar as a
 * fixed-length big-endian integer and the public key as an uncompressed point
 * (0x04 || X || Y). Pass priv = NULL for a verify-only key. */
static EVP_PKEY* ecdsa_pkey_build(dat_signature_alg_t alg,
                                   const uint8_t* priv, size_t priv_len,
                                   const uint8_t* pub,  size_t pub_len) {
    const char* group = ecdsa_group(alg);
    if (!group) return NULL;

    EVP_PKEY*       pkey = NULL;
    EVP_PKEY_CTX*   ctx  = NULL;
    OSSL_PARAM_BLD* bld  = NULL;
    OSSL_PARAM*     par  = NULL;
    BIGNUM*         d    = NULL;

    bld = OSSL_PARAM_BLD_new();
    if (!bld) goto done;
    if (!OSSL_PARAM_BLD_push_utf8_string(bld, OSSL_PKEY_PARAM_GROUP_NAME, group, 0)) goto done;
    if (!OSSL_PARAM_BLD_push_octet_string(bld, OSSL_PKEY_PARAM_PUB_KEY, pub, pub_len)) goto done;
    if (priv) {
        d = BN_bin2bn(priv, (int)priv_len, NULL);
        if (!d) goto done;
        BN_set_flags(d, BN_FLG_CONSTTIME);
        if (!OSSL_PARAM_BLD_push_BN(bld, OSSL_PKEY_PARAM_PRIV_KEY, d)) goto done;
    }
    par = OSSL_PARAM_BLD_to_param(bld);
    if (!par) goto done;

    ctx = EVP_PKEY_CTX_new_from_name(NULL, "EC", NULL);
    if (!ctx || EVP_PKEY_fromdata_init(ctx) <= 0) goto done;
    if (EVP_PKEY_fromdata(ctx, &pkey,
                          priv ? EVP_PKEY_KEYPAIR : EVP_PKEY_PUBLIC_KEY, par) <= 0)
        pkey = NULL;

done:
    BN_clear_free(d);
    OSSL_PARAM_free(par);
    OSSL_PARAM_BLD_free(bld);
    EVP_PKEY_CTX_free(ctx);
    return pkey;
}

/* D-6: reject key material that is structurally invalid or not an actual pair.
 * Without this a mismatched priv/pub import is accepted and produces signatures
 * that can never verify. Runs at construction only, never per sign/verify. */
static int ecdsa_pkey_check(EVP_PKEY* pkey, int has_private) {
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_from_pkey(NULL, pkey, NULL);
    if (!ctx) return 0;
    /* point is on the curve, not at infinity, correct order */
    int ok = EVP_PKEY_public_check(ctx) == 1;
    if (ok && has_private) {
        /* d in [1, n-1] and pub == d*G */
        ok = EVP_PKEY_private_check(ctx) == 1 && EVP_PKEY_pairwise_check(ctx) == 1;
    }
    EVP_PKEY_CTX_free(ctx);
    return ok;
}

/* ── Generate ─────────────────────────────────────────────────────── */

static dat_error_t generate_ecdsa(dat_signature_alg_t alg, dat_signature_t* sig) {
    const char* group = ecdsa_group(alg);
    size_t pl = ecdsa_priv_len(alg);
    size_t ql = ecdsa_pub_len(alg);
    /* 표에 없는 알고리즘 = 호출자가 ecdsa 가 아닌 값을 넘겼다. */
    if (!group || !pl || !ql) return DAT_CONFIG_ALG_UNSUPPORTED;

    EVP_PKEY*     pkey = NULL;
    EVP_PKEY_CTX* ctx  = EVP_PKEY_CTX_new_from_name(NULL, "EC", NULL);
    if (!ctx) return DAT_INTERNAL_UNKNOWN;   /* 컨텍스트 할당 실패 */

    OSSL_PARAM params[2] = {
        OSSL_PARAM_construct_utf8_string(OSSL_PKEY_PARAM_GROUP_NAME, (char*)group, 0),
        OSSL_PARAM_construct_end()
    };
    int ok = EVP_PKEY_keygen_init(ctx) > 0
          && EVP_PKEY_CTX_set_params(ctx, params) > 0
          && EVP_PKEY_generate(ctx, &pkey) > 0;
    EVP_PKEY_CTX_free(ctx);
    /* 키 생성 실패는 서명 연산 실패가 아니라 환경·RNG 실패다. */
    if (!ok || !pkey) { EVP_PKEY_free(pkey); return DAT_INTERNAL_UNKNOWN; }

    /* Export to the wire representation the other ports expect. */
    BIGNUM* d = NULL;
    size_t  publen = 0;
    ok = EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_PRIV_KEY, &d) > 0
      && BN_bn2binpad(d, sig->ecdsa.priv_bytes, (int)pl) == (int)pl
      && EVP_PKEY_get_octet_string_param(pkey, OSSL_PKEY_PARAM_PUB_KEY,
                                          sig->ecdsa.pub_bytes, ql, &publen) > 0
      && publen == ql
      && sig->ecdsa.pub_bytes[0] == 0x04;  /* uncompressed */
    BN_clear_free(d);

    if (!ok) {
        OPENSSL_cleanse(sig->ecdsa.priv_bytes, pl);
        EVP_PKEY_free(pkey);
        return DAT_INTERNAL_UNKNOWN;
    }

    sig->ecdsa.priv_len    = pl;
    sig->ecdsa.pub_len     = ql;
    sig->ecdsa.has_private = 1;
    sig->ecdsa.pkey        = pkey;
    return DAT_SUCCESS;
}

dat_error_t dat_signature_new(dat_signature_alg_t alg, dat_signature_t** out) {
    if (!out) return DAT_CONFIG_ARGUMENT_INVALID;
    dat_signature_t* s = (dat_signature_t*)calloc(1, sizeof(dat_signature_t));
    if (!s) return DAT_INTERNAL_UNKNOWN;
    s->alg    = alg;
    s->family = alg_family(alg);

    dat_error_t e;
    if (s->family == DAT_SIG_FAMILY_ECDSA) {
        e = generate_ecdsa(alg, s);
    } else {
        size_t kl = hmac_key_len(alg);
        if (!kl) { free(s); return DAT_CONFIG_ALG_UNSUPPORTED; }
        /* HMAC 키 RNG 실패였는데 SIGNATURE_ERROR 를 돌려주고 있었다. crypto 쪽 RNG
         * 실패(ENCRYPT_ERROR)와 같은 원인인데 코드가 갈리던 자리다. */
        if (RAND_bytes(s->hmac.key, (int)kl) != 1) { free(s); return DAT_INTERNAL_UNKNOWN; }
        s->hmac.key_len = kl;
        e = DAT_SUCCESS;
    }

    if (e != DAT_SUCCESS) { free(s); return e; }
    *out = s;
    return DAT_SUCCESS;
}

/* ── from_key ─────────────────────────────────────────────────────── */

dat_error_t dat_signature_from_key(dat_signature_alg_t alg,
                                    const uint8_t* key, size_t key_len,
                                    dat_signature_t** out) {
    if (!key || !out) return DAT_CONFIG_ARGUMENT_INVALID;

    dat_signature_t* s = (dat_signature_t*)calloc(1, sizeof(dat_signature_t));
    if (!s) return DAT_INTERNAL_UNKNOWN;
    s->alg    = alg;
    s->family = alg_family(alg);

    if (s->family == DAT_SIG_FAMILY_ECDSA) {
        size_t pl = ecdsa_priv_len(alg);
        size_t ql = ecdsa_pub_len(alg);
        if (!pl || !ql) { free(s); return DAT_CONFIG_ALG_UNSUPPORTED; }

        if (key_len == pl + ql) {
            /* full key pair */
            memcpy(s->ecdsa.priv_bytes, key,      pl);
            memcpy(s->ecdsa.pub_bytes,  key + pl, ql);
            s->ecdsa.priv_len    = pl;
            s->ecdsa.pub_len     = ql;
            s->ecdsa.has_private = 1;
        } else if (key_len == ql) {
            /* verify-only */
            memcpy(s->ecdsa.pub_bytes, key, ql);
            s->ecdsa.priv_len    = pl;
            s->ecdsa.pub_len     = ql;
            s->ecdsa.has_private = 0;
        } else {
            /* private+public 도 public 도 아닌 길이 = 키 재료가 무효다. */
            free(s);
            return DAT_KEY_INVALID;
        }

        s->ecdsa.pkey = ecdsa_pkey_build(alg,
                                         s->ecdsa.has_private ? s->ecdsa.priv_bytes : NULL,
                                         s->ecdsa.priv_len,
                                         s->ecdsa.pub_bytes, s->ecdsa.pub_len);
        /* 곡선 위에 없는 점, d 가 [1,n-1] 밖, 개인키·공개키 쌍 불일치가 전부 여기다. */
        if (!s->ecdsa.pkey || !ecdsa_pkey_check(s->ecdsa.pkey, s->ecdsa.has_private)) {
            dat_signature_free(s);
            return DAT_KEY_INVALID;
        }
    } else {
        size_t kl = hmac_key_len(alg);
        if (!kl) { free(s); return DAT_CONFIG_ALG_UNSUPPORTED; }
        if (key_len != kl) { free(s); return DAT_KEY_INVALID; }
        memcpy(s->hmac.key, key, kl);
        s->hmac.key_len = kl;
    }

    *out = s;
    return DAT_SUCCESS;
}

/* ── free ─────────────────────────────────────────────────────────── */

void dat_signature_free(dat_signature_t* sig) {
    if (!sig) return;
    if (sig->family == DAT_SIG_FAMILY_ECDSA) EVP_PKEY_free(sig->ecdsa.pkey);
    /* D-4: the struct holds an ECDSA private scalar or an HMAC secret; wipe it
     * before handing the memory back to the allocator. Free path only. */
    OPENSSL_cleanse(sig, sizeof(*sig));
    free(sig);
}

/* ── Accessors ────────────────────────────────────────────────────── */

dat_signature_alg_t dat_signature_algorithm(const dat_signature_t* sig) {
    return sig->alg;
}

size_t dat_signature_key_base64_len(const dat_signature_t* sig) {
    switch (sig->alg) {
        case DAT_SIG_HMAC_SHA256_MFS: return 43;
        case DAT_SIG_HMAC_SHA384_MFS: return 64;
        case DAT_SIG_HMAC_SHA512_MFS: return 86;
        case DAT_SIG_ECDSA_P256:      return 130;
        case DAT_SIG_ECDSA_P384:      return 194;
        case DAT_SIG_ECDSA_P521:      return 266;
        default: return 0;
    }
}

bool dat_signature_signable(const dat_signature_t* sig) {
    if (sig->family == DAT_SIG_FAMILY_ECDSA) return sig->ecdsa.has_private != 0;
    return true;
}

bool dat_signature_support_verify_only(const dat_signature_t* sig) {
    return sig->family == DAT_SIG_FAMILY_ECDSA;
}

/* ── Export key ───────────────────────────────────────────────────── */

static dat_error_t export_key_option(const dat_signature_t* sig, bool verify_only,
                                      uint8_t** key, size_t* key_len) {
    /* 알고리즘의 구조적 한계다(HMAC 은 verify-only 를 낼 수 없다).
     * 런타임에 개인키가 없는 SIG_KEY_MISSING 과는 다른 오류다. */
    if (verify_only && !dat_signature_support_verify_only(sig))
        return DAT_KEY_VERIFY_ONLY_UNSUPPORTED;

    if (sig->family == DAT_SIG_FAMILY_ECDSA) {
        if (!verify_only && sig->ecdsa.has_private) {
            size_t total = sig->ecdsa.priv_len + sig->ecdsa.pub_len;
            uint8_t* k = (uint8_t*)malloc(total);
            if (!k) return DAT_INTERNAL_UNKNOWN;
            memcpy(k,                        sig->ecdsa.priv_bytes, sig->ecdsa.priv_len);
            memcpy(k + sig->ecdsa.priv_len,  sig->ecdsa.pub_bytes,  sig->ecdsa.pub_len);
            *key     = k;
            *key_len = total;
        } else {
            uint8_t* k = (uint8_t*)malloc(sig->ecdsa.pub_len);
            if (!k) return DAT_INTERNAL_UNKNOWN;
            memcpy(k, sig->ecdsa.pub_bytes, sig->ecdsa.pub_len);
            *key     = k;
            *key_len = sig->ecdsa.pub_len;
        }
    } else {
        uint8_t* k = (uint8_t*)malloc(sig->hmac.key_len);
        if (!k) return DAT_INTERNAL_UNKNOWN;
        memcpy(k, sig->hmac.key, sig->hmac.key_len);
        *key     = k;
        *key_len = sig->hmac.key_len;
    }
    return DAT_SUCCESS;
}

dat_error_t dat_signature_export_key(const dat_signature_t* sig,
                                      uint8_t** key, size_t* key_len) {
    return export_key_option(sig, false, key, key_len);
}

dat_error_t dat_signature_export_verify_only_key(const dat_signature_t* sig,
                                                  uint8_t** key, size_t* key_len) {
    return export_key_option(sig, true, key, key_len);
}

/* ── Sign ─────────────────────────────────────────────────────────── */

dat_error_t dat_signature_sign(const dat_signature_t* sig,
                                const uint8_t* data, size_t data_len,
                                uint8_t** out, size_t* out_len) {
    if (!sig || !out || !out_len) return DAT_CONFIG_ARGUMENT_INVALID;

    if (sig->family == DAT_SIG_FAMILY_HMAC) {
        const EVP_MD* md = hmac_md(sig->alg);
        unsigned char mac[64];
        unsigned int mac_len = 0;
        if (!HMAC(md, sig->hmac.key, (int)sig->hmac.key_len,
                  data, data_len, mac, &mac_len))
            return DAT_SIG_BACKEND;
        uint8_t* k = (uint8_t*)malloc(mac_len);
        if (!k) return DAT_INTERNAL_UNKNOWN;
        memcpy(k, mac, mac_len);
        *out     = k;
        *out_len = mac_len;
        return DAT_SUCCESS;
    }

    /* ECDSA */
    /* verify-only 키로 서명을 요청한 것 — 런타임 상태 문제다. */
    if (!sig->ecdsa.has_private)
        return DAT_SIG_KEY_MISSING;
    if (!sig->ecdsa.pkey)
        return DAT_SIG_BACKEND;

    size_t pl = sig->ecdsa.priv_len;

    EVP_MD_CTX* mctx = EVP_MD_CTX_new();
    if (!mctx) return DAT_INTERNAL_UNKNOWN;

    uint8_t*    der     = NULL;
    size_t      der_len = 0;
    ECDSA_SIG*  esig    = NULL;
    /* 여기 도달하는 실패는 전부 서명 연산 자체의 실패다(위조가 아니다). */
    dat_error_t rv      = DAT_SIG_BACKEND;

    if (EVP_DigestSignInit(mctx, NULL, ecdsa_md(sig->alg), NULL, sig->ecdsa.pkey) <= 0)
        goto sign_done;
    if (EVP_DigestSign(mctx, NULL, &der_len, data, data_len) <= 0)
        goto sign_done;
    der = (uint8_t*)malloc(der_len);
    if (!der) { rv = DAT_INTERNAL_UNKNOWN; goto sign_done; }
    if (EVP_DigestSign(mctx, der, &der_len, data, data_len) <= 0)
        goto sign_done;

    /* DER SEQUENCE{r,s} → the fixed-width r||s the wire format uses */
    {
        const uint8_t* dp = der;
        esig = d2i_ECDSA_SIG(NULL, &dp, (long)der_len);
        if (!esig) goto sign_done;

        const BIGNUM *r, *s;
        ECDSA_SIG_get0(esig, &r, &s);

        uint8_t* fixed = (uint8_t*)malloc(2 * pl);
        if (!fixed) { rv = DAT_INTERNAL_UNKNOWN; goto sign_done; }
        if (BN_bn2binpad(r, fixed,      (int)pl) != (int)pl ||
            BN_bn2binpad(s, fixed + pl, (int)pl) != (int)pl) {
            free(fixed);
            goto sign_done;
        }
        *out     = fixed;
        *out_len = 2 * pl;
        rv       = DAT_SUCCESS;
    }

sign_done:
    ECDSA_SIG_free(esig);
    free(der);
    EVP_MD_CTX_free(mctx);
    return rv;
}

/* ── Verify ───────────────────────────────────────────────────────── */

dat_error_t dat_signature_verify(const dat_signature_t* sig,
                                  const uint8_t* data, size_t data_len,
                                  const uint8_t* sign, size_t sign_len) {
    if (!sig) return DAT_CONFIG_ARGUMENT_INVALID;
    /* 빈 서명은 위조가 아니라 형식 오류다. */
    if (!sign || sign_len == 0) return DAT_SIG_MALFORMED;

    if (sig->family == DAT_SIG_FAMILY_HMAC) {
        const EVP_MD* md = hmac_md(sig->alg);
        unsigned char mac[64];
        unsigned int mac_len = 0;
        /* HMAC 계산 자체가 실패한 것은 프로그래밍·환경 오류다. 이것을 불일치로
         * 보고하면 라이브러리 버그가 위조 시도로 둔갑한다. */
        if (!HMAC(md, sig->hmac.key, (int)sig->hmac.key_len,
                  data, data_len, mac, &mac_len))
            return DAT_SIG_BACKEND;
        if (mac_len != sign_len) return DAT_SIG_MALFORMED;
        /* 여기서 갈리는 것만이 진짜 위조 증거다. */
        if (CRYPTO_memcmp(mac, sign, mac_len) != 0) return DAT_SIG_MISMATCH;
        return DAT_SUCCESS;
    }

    /* ECDSA */
    size_t pl = sig->ecdsa.priv_len;
    if (sign_len != 2 * pl) return DAT_SIG_MALFORMED;
    if (!sig->ecdsa.pkey) return DAT_SIG_BACKEND;

    /* fixed-width r||s → the DER SEQUENCE{r,s} EVP_DigestVerify expects */
    BIGNUM* r = BN_bin2bn(sign,      (int)pl, NULL);
    BIGNUM* s = BN_bin2bn(sign + pl, (int)pl, NULL);
    ECDSA_SIG* esig = ECDSA_SIG_new();
    if (!r || !s || !esig) {
        BN_free(r); BN_free(s); ECDSA_SIG_free(esig);
        return DAT_INTERNAL_UNKNOWN;
    }
    ECDSA_SIG_set0(esig, r, s);  /* transfers ownership of r, s */

    uint8_t* der = NULL;
    int der_len = i2d_ECDSA_SIG(esig, &der);
    ECDSA_SIG_free(esig);
    if (der_len <= 0 || !der) { OPENSSL_free(der); return DAT_SIG_BACKEND; }

    EVP_MD_CTX* mctx = EVP_MD_CTX_new();
    int ret = -1;
    if (mctx && EVP_DigestVerifyInit(mctx, NULL, ecdsa_md(sig->alg),
                                     NULL, sig->ecdsa.pkey) > 0)
        ret = EVP_DigestVerify(mctx, der, (size_t)der_len, data, data_len);
    EVP_MD_CTX_free(mctx);
    OPENSSL_free(der);

    /* EVP_DigestVerify: 1 = 일치, 0 = 불일치, <0 = 연산 실패.
     * 예전에는 뒤의 둘이 같은 값으로 뭉개져 백엔드 오류가 위조로 보고됐다. */
    if (ret == 1) return DAT_SUCCESS;
    return (ret == 0) ? DAT_SIG_MISMATCH : DAT_SIG_BACKEND;
}

/* ── Clone ────────────────────────────────────────────────────────── */

dat_error_t dat_signature_clone(const dat_signature_t* sig, dat_signature_t** out) {
    uint8_t* key = NULL;
    size_t key_len = 0;
    bool verify_only = (sig->family == DAT_SIG_FAMILY_ECDSA) && !sig->ecdsa.has_private;
    dat_error_t e = export_key_option(sig, verify_only, &key, &key_len);
    if (e) return e;
    e = dat_signature_from_key(sig->alg, key, key_len, out);
    /* D-4: `key` is the private scalar / HMAC secret in the clear. */
    OPENSSL_cleanse(key, key_len);
    free(key);
    return e;
}
