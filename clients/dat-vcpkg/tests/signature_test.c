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

static int is_ecdsa(dat_signature_alg_t alg) {
    return alg == DAT_SIG_ECDSA_P256 || alg == DAT_SIG_ECDSA_P384 || alg == DAT_SIG_ECDSA_P521;
}

static void test_key(dat_signature_alg_t alg) {
    const char* tag_base = dat_signature_alg_to_str(alg);
    char tag[64];
    snprintf(tag, sizeof(tag), "Signature %s", tag_base);

    dat_signature_t* key = NULL;
    dat_error_t err = dat_signature_new(alg, &key);
    assert(err == DAT_SUCCESS);

    uint8_t* key_b = NULL;
    size_t key_b_len = 0;
    err = dat_signature_export_key(key, &key_b, &key_b_len);
    assert(err == DAT_SUCCESS);

    char* b64_key = NULL;
    size_t b64_key_len = 0;
    err = encode_base64_url(key_b, key_b_len, &b64_key, &b64_key_len);
    assert(err == DAT_SUCCESS);

    printf("%s Export %zu %s\n", tag, b64_key_len, b64_key);
    assert(b64_key_len == dat_signature_key_base64_len(key));

    uint8_t* decoded_key = NULL;
    size_t decoded_key_len = 0;
    err = decode_base64_url(b64_key, b64_key_len, &decoded_key, &decoded_key_len);
    assert(err == DAT_SUCCESS);

    dat_signature_t* parse_key = NULL;
    err = dat_signature_from_key(alg, decoded_key, decoded_key_len, &parse_key);
    assert(err == DAT_SUCCESS);

    printf("%s Import %s\n", tag, b64_key);

    char rand_str[101];
    rand_string(rand_str, 100);

    uint8_t* sign_out = NULL;
    size_t sign_out_len = 0;
    err = dat_signature_sign(key, (const uint8_t*)rand_str, strlen(rand_str), &sign_out, &sign_out_len);
    assert(err == DAT_SUCCESS);

    char* sign_b64 = NULL;
    size_t sign_b64_len = 0;
    err = encode_base64_url(sign_out, sign_out_len, &sign_b64, &sign_b64_len);
    assert(err == DAT_SUCCESS);

    printf("%s Sign %s\n", tag, rand_str);

    uint8_t* sign_decoded = NULL;
    size_t sign_decoded_len = 0;
    err = decode_base64_url(sign_b64, sign_b64_len, &sign_decoded, &sign_decoded_len);
    assert(err == DAT_SUCCESS);

    dat_error_t verify_err = dat_signature_verify(parse_key, (const uint8_t*)rand_str, strlen(rand_str), sign_decoded, sign_decoded_len);
    int verify = (verify_err == DAT_SUCCESS);

    printf("%s Verify %s\n", tag, rand_str);
    assert(verify);

    if (is_ecdsa(alg)) {
        uint8_t* vo_key_b = NULL;
        size_t vo_key_b_len = 0;
        err = dat_signature_export_verify_only_key(key, &vo_key_b, &vo_key_b_len);
        assert(err == DAT_SUCCESS);

        char* vo_b64 = NULL;
        size_t vo_b64_len = 0;
        err = encode_base64_url(vo_key_b, vo_key_b_len, &vo_b64, &vo_b64_len);
        assert(err == DAT_SUCCESS);

        uint8_t* vo_decoded = NULL;
        size_t vo_decoded_len = 0;
        err = decode_base64_url(vo_b64, vo_b64_len, &vo_decoded, &vo_decoded_len);
        assert(err == DAT_SUCCESS);

        dat_signature_t* vo_key = NULL;
        err = dat_signature_from_key(alg, vo_decoded, vo_decoded_len, &vo_key);
        assert(err == DAT_SUCCESS);

        /* reuse sign_decoded which was from original sign */
        dat_error_t vo_verify_err = dat_signature_verify(vo_key, (const uint8_t*)rand_str, strlen(rand_str), sign_decoded, sign_decoded_len);
        int vo_verify = (vo_verify_err == DAT_SUCCESS);
        assert(vo_verify);
        printf("%s verify (verify only) %s\n", tag, vo_verify ? "true" : "false");

        free(vo_key_b);
        free(vo_b64);
        free(vo_decoded);
        dat_signature_free(vo_key);
    }

    /* un_verify: sign with a different key, verify should fail */
    dat_signature_t* other_key = NULL;
    err = dat_signature_new(alg, &other_key);
    assert(err == DAT_SUCCESS);

    uint8_t* other_sign = NULL;
    size_t other_sign_len = 0;
    err = dat_signature_sign(other_key, (const uint8_t*)rand_str, strlen(rand_str), &other_sign, &other_sign_len);
    assert(err == DAT_SUCCESS);

    dat_error_t un_verify_err = dat_signature_verify(parse_key, (const uint8_t*)rand_str, strlen(rand_str), other_sign, other_sign_len);
    int un_verify = (un_verify_err == DAT_SUCCESS);

    printf("%s verify %s / unverify %s\n", tag, verify ? "true" : "false", un_verify ? "true" : "false");
    assert(!un_verify);

    free(key_b);
    free(b64_key);
    free(decoded_key);
    free(sign_out);
    free(sign_b64);
    free(sign_decoded);
    free(other_sign);
    dat_signature_free(key);
    dat_signature_free(parse_key);
    dat_signature_free(other_key);
}

int main(void) {
    srand((unsigned)time(NULL));

    for (size_t a = 0; a < DAT_SIGNATURE_ALG_COUNT; a++) {
        dat_signature_alg_t alg = DAT_SIGNATURE_ALG_LIST[a];
        for (int i = 1; i < 20; i++) {
            test_key(alg);
        }
    }

    return 0;
}
