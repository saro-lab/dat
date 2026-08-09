#include "dat_crypto.h"
#include <limits.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>

const dat_crypto_alg_t DAT_CRYPTO_ALG_LIST[2] = {
    DAT_CRYPTO_IV_AES128_GCM,
    DAT_CRYPTO_IV_AES256_GCM
};
const size_t DAT_CRYPTO_ALG_COUNT = 2;

const char* dat_crypto_alg_to_str(dat_crypto_alg_t alg) {
    switch (alg) {
        case DAT_CRYPTO_IV_AES128_GCM: return "IV-AES128-GCM";
        case DAT_CRYPTO_IV_AES256_GCM: return "IV-AES256-GCM";
        default: return NULL;
    }
}

dat_error_t dat_crypto_alg_from_str(const char* s, dat_crypto_alg_t* out) {
    if (!s || !out) return DAT_CONFIG_ARGUMENT_INVALID;
    if (strcmp(s, "IV-AES128-GCM") == 0) { *out = DAT_CRYPTO_IV_AES128_GCM; return DAT_SUCCESS; }
    if (strcmp(s, "IV-AES256-GCM") == 0) { *out = DAT_CRYPTO_IV_AES256_GCM; return DAT_SUCCESS; }
    return DAT_CONFIG_ALG_UNSUPPORTED;
}

static size_t key_len_for(dat_crypto_alg_t alg) {
    return (alg == DAT_CRYPTO_IV_AES128_GCM) ? 16 : 32;
}

dat_error_t dat_crypto_new(dat_crypto_alg_t alg, dat_crypto_t** out) {
    if (!out) return DAT_CONFIG_ARGUMENT_INVALID;
    dat_crypto_t* c = (dat_crypto_t*)malloc(sizeof(dat_crypto_t));
    if (!c) return DAT_INTERNAL_UNKNOWN;
    c->alg     = alg;
    c->key_len = key_len_for(alg);
    if (RAND_bytes(c->key, (int)c->key_len) != 1) {
        OPENSSL_cleanse(c, sizeof(*c));
        free(c);
        return DAT_INTERNAL_UNKNOWN;
    }
    *out = c;
    return DAT_SUCCESS;
}

dat_error_t dat_crypto_from_key(dat_crypto_alg_t alg, const uint8_t* key, size_t key_len, dat_crypto_t** out) {
    if (!key || !out) return DAT_CONFIG_ARGUMENT_INVALID;
    size_t expected = key_len_for(alg);
    if (key_len != expected) return DAT_KEY_INVALID;
    dat_crypto_t* c = (dat_crypto_t*)malloc(sizeof(dat_crypto_t));
    if (!c) return DAT_INTERNAL_UNKNOWN;
    c->alg     = alg;
    c->key_len = expected;
    memcpy(c->key, key, expected);
    *out = c;
    return DAT_SUCCESS;
}

void dat_crypto_free(dat_crypto_t* crypto) {
    if (!crypto) return;
    OPENSSL_cleanse(crypto, sizeof(*crypto));
    free(crypto);
}

dat_crypto_alg_t dat_crypto_algorithm(const dat_crypto_t* crypto) {
    return crypto->alg;
}

size_t dat_crypto_key_base64_len(const dat_crypto_t* crypto) {
    return (crypto->alg == DAT_CRYPTO_IV_AES128_GCM) ? 22 : 43;
}

dat_error_t dat_crypto_export_key(const dat_crypto_t* crypto, uint8_t** key, size_t* key_len) {
    if (!crypto || !key || !key_len) return DAT_CONFIG_ARGUMENT_INVALID;
    uint8_t* k = (uint8_t*)malloc(crypto->key_len);
    if (!k) return DAT_INTERNAL_UNKNOWN;
    memcpy(k, crypto->key, crypto->key_len);
    *key     = k;
    *key_len = crypto->key_len;
    return DAT_SUCCESS;
}

static const EVP_CIPHER* cipher_for(const dat_crypto_t* c) {
    return (c->alg == DAT_CRYPTO_IV_AES128_GCM) ? EVP_aes_128_gcm() : EVP_aes_256_gcm();
}

dat_error_t dat_crypto_encrypt_to_bbuf(const dat_crypto_t* crypto,
                                        const uint8_t* data, size_t data_len,
                                        dat_bbuf_t* out) {
    if (data_len == 0) return DAT_SUCCESS;
    if (data_len > INT_MAX) return DAT_CRYPTO_DATA_INVALID;

    size_t out_len = DAT_CRYPTO_IV_LEN + data_len + DAT_CRYPTO_TAG_LEN;
    dat_error_t e = bbuf_ensure(out, out_len);
    if (e) return e;

    uint8_t* buf = out->data + out->len;

    if (RAND_bytes(buf, DAT_CRYPTO_IV_LEN) != 1)
        return DAT_INTERNAL_UNKNOWN;

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) return DAT_INTERNAL_UNKNOWN;

    int ok = 1;
    int len = 0, flen = 0;

    ok &= EVP_EncryptInit_ex(ctx, cipher_for(crypto), NULL, NULL, NULL);
    ok &= EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, DAT_CRYPTO_IV_LEN, NULL);
    ok &= EVP_EncryptInit_ex(ctx, NULL, NULL, crypto->key, buf);
    ok &= EVP_EncryptUpdate(ctx, buf + DAT_CRYPTO_IV_LEN, &len, data, (int)data_len);
    ok &= EVP_EncryptFinal_ex(ctx, buf + DAT_CRYPTO_IV_LEN + len, &flen);
    ok &= EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, DAT_CRYPTO_TAG_LEN,
                               buf + DAT_CRYPTO_IV_LEN + data_len);
    EVP_CIPHER_CTX_free(ctx);

    if (!ok) return DAT_CRYPTO_BACKEND;

    out->len += out_len;
    return DAT_SUCCESS;
}

dat_error_t dat_crypto_encrypt(const dat_crypto_t* crypto,
                                const uint8_t* data, size_t data_len,
                                uint8_t** out, size_t* out_len) {
    if (!crypto || !out || !out_len) return DAT_CONFIG_ARGUMENT_INVALID;
    if (data_len == 0) {
        *out     = (uint8_t*)malloc(0);
        *out_len = 0;
        return DAT_SUCCESS;
    }
    dat_bbuf_t buf;
    dat_error_t e = bbuf_init(&buf, DAT_CRYPTO_IV_LEN + data_len + DAT_CRYPTO_TAG_LEN);
    if (e) return e;
    e = dat_crypto_encrypt_to_bbuf(crypto, data, data_len, &buf);
    if (e) { bbuf_free(&buf); return e; }
    *out_len = buf.len;
    *out     = bbuf_take(&buf, NULL);
    return DAT_SUCCESS;
}

dat_error_t dat_crypto_decrypt(const dat_crypto_t* crypto,
                                const uint8_t* data, size_t data_len,
                                uint8_t** out, size_t* out_len) {
    if (!crypto || !out || !out_len) return DAT_CONFIG_ARGUMENT_INVALID;
    if (data_len == 0) {
        *out     = (uint8_t*)malloc(0);
        *out_len = 0;
        return DAT_SUCCESS;
    }
    if (data_len < DAT_CRYPTO_IV_LEN + DAT_CRYPTO_TAG_LEN) return DAT_CRYPTO_DATA_INVALID;
    if (data_len > INT_MAX) return DAT_CRYPTO_DATA_INVALID;

    const uint8_t* iv         = data;
    const uint8_t* ciphertext = data + DAT_CRYPTO_IV_LEN;
    size_t ct_len             = data_len - DAT_CRYPTO_IV_LEN - DAT_CRYPTO_TAG_LEN;
    uint8_t tag[DAT_CRYPTO_TAG_LEN];
    memcpy(tag, data + DAT_CRYPTO_IV_LEN + ct_len, DAT_CRYPTO_TAG_LEN);

    uint8_t* plaintext = (uint8_t*)malloc(ct_len + 1);
    if (!plaintext) return DAT_INTERNAL_UNKNOWN;

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) { free(plaintext); return DAT_INTERNAL_UNKNOWN; }

    int ok = 1;
    int len = 0, flen = 0;

    ok &= EVP_DecryptInit_ex(ctx, cipher_for(crypto), NULL, NULL, NULL);
    ok &= EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, DAT_CRYPTO_IV_LEN, NULL);
    ok &= EVP_DecryptInit_ex(ctx, NULL, NULL, crypto->key, iv);
    ok &= EVP_DecryptUpdate(ctx, plaintext, &len, ciphertext, (int)ct_len);
    ok &= EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, DAT_CRYPTO_TAG_LEN, tag);
    int final_ok = EVP_DecryptFinal_ex(ctx, plaintext + len, &flen);
    EVP_CIPHER_CTX_free(ctx);

    if (!ok) {
        free(plaintext);
        return DAT_CRYPTO_BACKEND;
    }
    if (final_ok != 1) {
        free(plaintext);
        return DAT_CRYPTO_TAG_MISMATCH;
    }
    plaintext[ct_len] = '\0';
    *out     = plaintext;
    *out_len = ct_len;
    return DAT_SUCCESS;
}
