#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>
#include "../include/dat/dat.h"
#include "../src/dat_util.h"

#ifndef NDEBUG
int main(void) {
    printf("performance test is disabled in debug mode.\n");
    return 0;
}
#else

static void rand_string(char* buf, size_t len) {
    static const char CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (size_t i = 0; i < len; i++)
        buf[i] = CHARS[rand() % 62];
    buf[len] = '\0';
}

static long long ms_elapsed(struct timespec s, struct timespec e) {
    return (e.tv_sec - s.tv_sec) * 1000LL + (e.tv_nsec - s.tv_nsec) / 1000000LL;
}

int main(void) {
    srand((unsigned)time(NULL));

    int loop_size = 10000;

    static const char GANA[] = "\xEA\xB0\x80\xEB\x82\x98\xEB\x8B\xA4";
    char rand_buf[101];
    rand_string(rand_buf, 100);

    char text[200];
    memcpy(text, GANA, 9);
    memcpy(text + 9, rand_buf, 101);
    size_t text_len = 9 + 100;

    printf("text: %s\n", text);

    size_t total_len = 0;

    for (size_t a = 0; a < DAT_CRYPTO_ALG_COUNT; a++) {
        dat_crypto_alg_t alg = DAT_CRYPTO_ALG_LIST[a];
        const char* tag = dat_crypto_alg_to_str(alg);

        dat_crypto_t* key = NULL;
        dat_error_t err = dat_crypto_new(alg, &key);
        assert(err == DAT_SUCCESS);

        uint8_t* enc = NULL;
        size_t enc_len = 0;
        struct timespec t0, t1;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            free(enc);
            enc = NULL;
            err = dat_crypto_encrypt(key, (const uint8_t*)text, text_len, &enc, &enc_len);
            assert(err == DAT_SUCCESS);
            total_len += enc_len;
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%s copy encode * %d : %lldms\n", tag, loop_size, ms_elapsed(t0, t1));

        char* enc_b64 = NULL;
        size_t enc_b64_len = 0;
        encode_base64_url(enc, enc_len, &enc_b64, &enc_b64_len);
        printf("encode: %s\n", enc_b64);
        free(enc_b64);

        uint8_t* dec = NULL;
        size_t dec_len = 0;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            free(dec);
            dec = NULL;
            /* decrypt needs a fresh copy each iteration (decrypt may modify buffer) */
            uint8_t* enc_copy = (uint8_t*)malloc(enc_len);
            memcpy(enc_copy, enc, enc_len);
            err = dat_crypto_decrypt(key, enc_copy, enc_len, &dec, &dec_len);
            free(enc_copy);
            assert(err == DAT_SUCCESS);
            total_len += enc_len;
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        /* Note: Rust source has "$" prefix on this line — replicate exactly */
        printf("$%s copy encode * %d : %lldms\n", tag, loop_size, ms_elapsed(t0, t1));

        /* Rust prints decoded bytes as lossy utf8 string */
        printf("decode: %.*s\n", (int)dec_len, (char*)dec);
        printf("len: %zu\n", total_len);

        assert(dec_len == text_len);
        assert(memcmp(dec, text, text_len) == 0);

        free(enc);
        free(dec);
        dat_crypto_free(key);
    }

    return 0;
}
#endif
