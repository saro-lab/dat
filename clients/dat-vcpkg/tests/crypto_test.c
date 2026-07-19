#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>
#include "../include/dat/dat.h"
#include "../src/dat_util.h"

static void rand_string(char* buf, size_t len) {
    static const char CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (size_t i = 0; i < len; i++)
        buf[i] = CHARS[rand() % 62];
    buf[len] = '\0';
}

static void encrypt_and_decrypt(dat_crypto_alg_t alg, const char* rand_str) {
    const char* tag = dat_crypto_alg_to_str(alg);
    printf("%s Ready\n", tag);

    dat_crypto_t* key = NULL;
    dat_error_t err = dat_crypto_new(alg, &key);
    assert(err == DAT_SUCCESS);

    uint8_t* byte_key = NULL;
    size_t byte_key_len = 0;
    err = dat_crypto_export_key(key, &byte_key, &byte_key_len);
    assert(err == DAT_SUCCESS);

    char* b64_key = NULL;
    size_t b64_key_len = 0;
    err = encode_base64_url(byte_key, byte_key_len, &b64_key, &b64_key_len);
    assert(err == DAT_SUCCESS);

    assert(b64_key_len == dat_crypto_key_base64_len(key));
    printf("%s Key %zu %s\n", tag, b64_key_len, b64_key);

    uint8_t* decoded_key = NULL;
    size_t decoded_key_len = 0;
    err = decode_base64_url(b64_key, b64_key_len, &decoded_key, &decoded_key_len);
    assert(err == DAT_SUCCESS);

    dat_crypto_t* parse_key = NULL;
    err = dat_crypto_from_key(alg, decoded_key, decoded_key_len, &parse_key);
    assert(err == DAT_SUCCESS);

    const uint8_t* rand_bytes = (const uint8_t*)rand_str;
    size_t rand_len = strlen(rand_str);

    printf("%s Rand String %s\n", tag, rand_str);

    uint8_t* enc_data = NULL;
    size_t enc_len = 0;
    err = dat_crypto_encrypt(key, rand_bytes, rand_len, &enc_data, &enc_len);
    assert(err == DAT_SUCCESS);

    char* encrypt_b64 = NULL;
    size_t encrypt_b64_len = 0;
    err = encode_base64_url(enc_data, enc_len, &encrypt_b64, &encrypt_b64_len);
    assert(err == DAT_SUCCESS);

    printf("%s Encrypt1: %s\n", tag, encrypt_b64);

    uint8_t* enc_decoded = NULL;
    size_t enc_decoded_len = 0;
    err = decode_base64_url(encrypt_b64, encrypt_b64_len, &enc_decoded, &enc_decoded_len);
    assert(err == DAT_SUCCESS);

    uint8_t* decrypt = NULL;
    size_t decrypt_len = 0;
    err = dat_crypto_decrypt(parse_key, enc_decoded, enc_decoded_len, &decrypt, &decrypt_len);
    assert(err == DAT_SUCCESS);
    assert(decrypt_len == rand_len);
    assert(memcmp(decrypt, rand_bytes, rand_len) == 0);

    /* fail decrypt: try with a different key */
    dat_crypto_t* fail_key = NULL;
    err = dat_crypto_new(alg, &fail_key);
    assert(err == DAT_SUCCESS);

    uint8_t* enc_for_fail = NULL;
    size_t enc_for_fail_len = 0;
    err = decode_base64_url(encrypt_b64, encrypt_b64_len, &enc_for_fail, &enc_for_fail_len);
    assert(err == DAT_SUCCESS);

    uint8_t* fail_out = NULL;
    size_t fail_out_len = 0;
    dat_error_t fail_err = dat_crypto_decrypt(fail_key, enc_for_fail, enc_for_fail_len, &fail_out, &fail_out_len);
    int fail_decrypt = (fail_err == DAT_SUCCESS);

    assert(!fail_decrypt || rand_len == 0);

    printf("%s Pass [", tag);
    for (size_t i = 0; i < rand_len; i++) {
        printf("%u", rand_bytes[i]);
        if (i + 1 < rand_len) printf(", ");
    }
    printf("] / Fail %s\n", fail_decrypt ? "true" : "false");

    free(byte_key);
    free(b64_key);
    free(decoded_key);
    free(enc_data);
    free(encrypt_b64);
    free(enc_decoded);
    free(decrypt);
    free(enc_for_fail);
    if (fail_out) free(fail_out);
    dat_crypto_free(key);
    dat_crypto_free(parse_key);
    dat_crypto_free(fail_key);
}

int main(void) {
    srand((unsigned)time(NULL));

    for (size_t a = 0; a < DAT_CRYPTO_ALG_COUNT; a++) {
        dat_crypto_alg_t alg = DAT_CRYPTO_ALG_LIST[a];
        /* 19 random */
        for (int i = 1; i < 20; i++) {
            char buf[101];
            rand_string(buf, 100);
            encrypt_and_decrypt(alg, buf);
        }
        /* empty */
        encrypt_and_decrypt(alg, "");
    }

    return 0;
}
