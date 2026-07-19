#include "dat_signature.h"
#include <stdlib.h>
#include <string.h>
#include <openssl/ec.h>
#include <openssl/ecdsa.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>
#include <openssl/bn.h>

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
    if (!s || !out) return DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM;
    if (strcmp(s, "HMAC-SHA256-MFS") == 0) { *out = DAT_SIG_HMAC_SHA256_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "HMAC-SHA384-MFS") == 0) { *out = DAT_SIG_HMAC_SHA384_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "HMAC-SHA512-MFS") == 0) { *out = DAT_SIG_HMAC_SHA512_MFS; return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P256")      == 0) { *out = DAT_SIG_ECDSA_P256;      return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P384")      == 0) { *out = DAT_SIG_ECDSA_P384;      return DAT_SUCCESS; }
    if (strcmp(s, "ECDSA-P521")      == 0) { *out = DAT_SIG_ECDSA_P521;      return DAT_SUCCESS; }
    return DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM;
}

/* ── ECDSA helpers ────────────────────────────────────────────────── */

static int ecdsa_nid(dat_signature_alg_t alg) {
    switch (alg) {
        case DAT_SIG_ECDSA_P256: return NID_X9_62_prime256v1;
        case DAT_SIG_ECDSA_P384: return NID_secp384r1;
        case DAT_SIG_ECDSA_P521: return NID_secp521r1;
        default: return 0;
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

/* ── Generate ─────────────────────────────────────────────────────── */

static dat_error_t generate_ecdsa(dat_signature_alg_t alg, dat_signature_t* sig) {
    int nid = ecdsa_nid(alg);
    if (!nid) return DAT_ERROR_SIGNATURE_ERROR;

    size_t pl = ecdsa_priv_len(alg);
    size_t ql = ecdsa_pub_len(alg);

    EC_KEY* key = EC_KEY_new_by_curve_name(nid);
    if (!key) return DAT_ERROR_SIGNATURE_ERROR;
    if (EC_KEY_generate_key(key) != 1) { EC_KEY_free(key); return DAT_ERROR_SIGNATURE_ERROR; }

    const BIGNUM*    priv_bn = EC_KEY_get0_private_key(key);
    const EC_GROUP*  grp     = EC_KEY_get0_group(key);
    const EC_POINT*  pub_pt  = EC_KEY_get0_public_key(key);

    BN_bn2binpad(priv_bn, sig->ecdsa.priv_bytes, (int)pl);
    EC_POINT_point2oct(grp, pub_pt, POINT_CONVERSION_UNCOMPRESSED,
                       sig->ecdsa.pub_bytes, ql, NULL);
    EC_KEY_free(key);

    sig->ecdsa.priv_len   = pl;
    sig->ecdsa.pub_len    = ql;
    sig->ecdsa.has_private = 1;
    return DAT_SUCCESS;
}

dat_error_t dat_signature_new(dat_signature_alg_t alg, dat_signature_t** out) {
    if (!out) return DAT_ERROR_MALLOC_FAILED;
    dat_signature_t* s = (dat_signature_t*)calloc(1, sizeof(dat_signature_t));
    if (!s) return DAT_ERROR_MALLOC_FAILED;
    s->alg    = alg;
    s->family = alg_family(alg);

    dat_error_t e;
    if (s->family == DAT_SIG_FAMILY_ECDSA) {
        e = generate_ecdsa(alg, s);
    } else {
        size_t kl = hmac_key_len(alg);
        if (!kl) { free(s); return DAT_ERROR_SIGNATURE_ERROR; }
        if (RAND_bytes(s->hmac.key, (int)kl) != 1) { free(s); return DAT_ERROR_SIGNATURE_ERROR; }
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
    if (!key || !out) return DAT_ERROR_SIGNATURE_ERROR;

    dat_signature_t* s = (dat_signature_t*)calloc(1, sizeof(dat_signature_t));
    if (!s) return DAT_ERROR_MALLOC_FAILED;
    s->alg    = alg;
    s->family = alg_family(alg);

    if (s->family == DAT_SIG_FAMILY_ECDSA) {
        size_t pl = ecdsa_priv_len(alg);
        size_t ql = ecdsa_pub_len(alg);
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
            free(s);
            return DAT_ERROR_SIGNATURE_ERROR;
        }
    } else {
        size_t kl = hmac_key_len(alg);
        if (key_len != kl) { free(s); return DAT_ERROR_SIGNATURE_ERROR; }
        memcpy(s->hmac.key, key, kl);
        s->hmac.key_len = kl;
    }

    *out = s;
    return DAT_SUCCESS;
}

/* ── free ─────────────────────────────────────────────────────────── */

void dat_signature_free(dat_signature_t* sig) {
    if (sig) free(sig);
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
    if (verify_only && !dat_signature_support_verify_only(sig))
        return DAT_ERROR_SIGNATURE_ERROR;

    if (sig->family == DAT_SIG_FAMILY_ECDSA) {
        if (!verify_only && sig->ecdsa.has_private) {
            size_t total = sig->ecdsa.priv_len + sig->ecdsa.pub_len;
            uint8_t* k = (uint8_t*)malloc(total);
            if (!k) return DAT_ERROR_MALLOC_FAILED;
            memcpy(k,                        sig->ecdsa.priv_bytes, sig->ecdsa.priv_len);
            memcpy(k + sig->ecdsa.priv_len,  sig->ecdsa.pub_bytes,  sig->ecdsa.pub_len);
            *key     = k;
            *key_len = total;
        } else {
            uint8_t* k = (uint8_t*)malloc(sig->ecdsa.pub_len);
            if (!k) return DAT_ERROR_MALLOC_FAILED;
            memcpy(k, sig->ecdsa.pub_bytes, sig->ecdsa.pub_len);
            *key     = k;
            *key_len = sig->ecdsa.pub_len;
        }
    } else {
        uint8_t* k = (uint8_t*)malloc(sig->hmac.key_len);
        if (!k) return DAT_ERROR_MALLOC_FAILED;
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
    if (!out || !out_len) return DAT_ERROR_SIGNATURE_ERROR;

    if (sig->family == DAT_SIG_FAMILY_HMAC) {
        const EVP_MD* md = hmac_md(sig->alg);
        unsigned char mac[64];
        unsigned int mac_len = 0;
        if (!HMAC(md, sig->hmac.key, (int)sig->hmac.key_len,
                  data, data_len, mac, &mac_len))
            return DAT_ERROR_SIGNATURE_ERROR;
        uint8_t* k = (uint8_t*)malloc(mac_len);
        if (!k) return DAT_ERROR_MALLOC_FAILED;
        memcpy(k, mac, mac_len);
        *out     = k;
        *out_len = mac_len;
        return DAT_SUCCESS;
    }

    /* ECDSA */
    if (!sig->ecdsa.has_private)
        return DAT_ERROR_SIGNING_KEY_NOT_EXISTS;

    int nid = ecdsa_nid(sig->alg);
    size_t pl = sig->ecdsa.priv_len;

    /* Hash */
    uint8_t hash[64];
    unsigned int hash_len = 0;
    EVP_MD_CTX* mctx = EVP_MD_CTX_new();
    if (!mctx) return DAT_ERROR_SIGNATURE_ERROR;
    int ok = EVP_DigestInit_ex(mctx, ecdsa_md(sig->alg), NULL)
          && EVP_DigestUpdate(mctx, data, data_len)
          && EVP_DigestFinal_ex(mctx, hash, &hash_len);
    EVP_MD_CTX_free(mctx);
    if (!ok) return DAT_ERROR_SIGNATURE_ERROR;

    /* Reconstruct EC_KEY with private + public */
    EC_KEY* ec = EC_KEY_new_by_curve_name(nid);
    if (!ec) return DAT_ERROR_SIGNATURE_ERROR;

    BIGNUM* priv_bn = BN_bin2bn(sig->ecdsa.priv_bytes, (int)pl, NULL);
    const EC_GROUP* grp = EC_KEY_get0_group(ec);
    EC_POINT* pub_pt = EC_POINT_new(grp);

    ok = (priv_bn != NULL) && (pub_pt != NULL)
      && (EC_KEY_set_private_key(ec, priv_bn) == 1)
      && (EC_POINT_oct2point(grp, pub_pt,
                             sig->ecdsa.pub_bytes, sig->ecdsa.pub_len, NULL) == 1)
      && (EC_KEY_set_public_key(ec, pub_pt) == 1);

    BN_free(priv_bn);
    EC_POINT_free(pub_pt);

    if (!ok) { EC_KEY_free(ec); return DAT_ERROR_SIGNATURE_ERROR; }

    ECDSA_SIG* esig = ECDSA_do_sign(hash, (int)hash_len, ec);
    EC_KEY_free(ec);
    if (!esig) return DAT_ERROR_SIGNATURE_ERROR;

    const BIGNUM *r, *s;
    ECDSA_SIG_get0(esig, &r, &s);

    uint8_t* fixed = (uint8_t*)malloc(2 * pl);
    if (!fixed) { ECDSA_SIG_free(esig); return DAT_ERROR_MALLOC_FAILED; }
    BN_bn2binpad(r, fixed,      (int)pl);
    BN_bn2binpad(s, fixed + pl, (int)pl);
    ECDSA_SIG_free(esig);

    *out     = fixed;
    *out_len = 2 * pl;
    return DAT_SUCCESS;
}

/* ── Verify ───────────────────────────────────────────────────────── */

dat_error_t dat_signature_verify(const dat_signature_t* sig,
                                  const uint8_t* data, size_t data_len,
                                  const uint8_t* sign, size_t sign_len) {
    if (!sign || sign_len == 0) return DAT_ERROR_INVALID_DAT;

    if (sig->family == DAT_SIG_FAMILY_HMAC) {
        const EVP_MD* md = hmac_md(sig->alg);
        unsigned char mac[64];
        unsigned int mac_len = 0;
        if (!HMAC(md, sig->hmac.key, (int)sig->hmac.key_len,
                  data, data_len, mac, &mac_len))
            return DAT_ERROR_SIGNATURE_ERROR;
        if (mac_len != sign_len) return DAT_ERROR_INVALID_DAT;
        if (CRYPTO_memcmp(mac, sign, mac_len) != 0) return DAT_ERROR_INVALID_DAT;
        return DAT_SUCCESS;
    }

    /* ECDSA */
    size_t pl = sig->ecdsa.priv_len;
    if (sign_len != 2 * pl) return DAT_ERROR_INVALID_DAT;

    /* Hash */
    uint8_t hash[64];
    unsigned int hash_len = 0;
    EVP_MD_CTX* mctx = EVP_MD_CTX_new();
    if (!mctx) return DAT_ERROR_SIGNATURE_ERROR;
    int ok = EVP_DigestInit_ex(mctx, ecdsa_md(sig->alg), NULL)
          && EVP_DigestUpdate(mctx, data, data_len)
          && EVP_DigestFinal_ex(mctx, hash, &hash_len);
    EVP_MD_CTX_free(mctx);
    if (!ok) return DAT_ERROR_SIGNATURE_ERROR;

    /* Reconstruct public key */
    int nid = ecdsa_nid(sig->alg);
    EC_KEY* ec = EC_KEY_new_by_curve_name(nid);
    if (!ec) return DAT_ERROR_SIGNATURE_ERROR;

    const EC_GROUP* grp = EC_KEY_get0_group(ec);
    EC_POINT* pub_pt = EC_POINT_new(grp);
    ok = (pub_pt != NULL)
      && (EC_POINT_oct2point(grp, pub_pt,
                             sig->ecdsa.pub_bytes, sig->ecdsa.pub_len, NULL) == 1)
      && (EC_KEY_set_public_key(ec, pub_pt) == 1);
    EC_POINT_free(pub_pt);

    if (!ok) { EC_KEY_free(ec); return DAT_ERROR_SIGNATURE_ERROR; }

    /* Parse FIXED signature → ECDSA_SIG */
    BIGNUM* r = BN_bin2bn(sign,      (int)pl, NULL);
    BIGNUM* s = BN_bin2bn(sign + pl, (int)pl, NULL);
    ECDSA_SIG* esig = ECDSA_SIG_new();
    if (!r || !s || !esig) {
        BN_free(r); BN_free(s); ECDSA_SIG_free(esig); EC_KEY_free(ec);
        return DAT_ERROR_SIGNATURE_ERROR;
    }
    ECDSA_SIG_set0(esig, r, s);  /* transfers ownership of r, s */

    int ret = ECDSA_do_verify(hash, (int)hash_len, esig, ec);
    ECDSA_SIG_free(esig);
    EC_KEY_free(ec);

    return (ret == 1) ? DAT_SUCCESS : DAT_ERROR_INVALID_DAT;
}

/* ── Clone ────────────────────────────────────────────────────────── */

dat_error_t dat_signature_clone(const dat_signature_t* sig, dat_signature_t** out) {
    uint8_t* key = NULL;
    size_t key_len = 0;
    bool verify_only = (sig->family == DAT_SIG_FAMILY_ECDSA) && !sig->ecdsa.has_private;
    dat_error_t e = export_key_option(sig, verify_only, &key, &key_len);
    if (e) return e;
    e = dat_signature_from_key(sig->alg, key, key_len, out);
    free(key);
    return e;
}
