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

    /* "가나다" UTF-8: 9 bytes */
    static const char GANA[] = "\xEA\xB0\x80\xEB\x82\x98\xEB\x8B\xA4";
    char rand_buf[101];
    rand_string(rand_buf, 100);

    /* text = "가나다" + rand_string */
    char text[200];
    memcpy(text, GANA, 9);
    memcpy(text + 9, rand_buf, 101); /* includes null */
    size_t text_len = 9 + 100;

    printf("text: %s\n", text);

    /* === base64_zero_copy_test === */
    dat_sbuf_t encode_buf;
    sbuf_init(&encode_buf, 1000);

    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int i = 0; i < loop_size; i++) {
        sbuf_clear(&encode_buf);
        encode_base64_url_out((const uint8_t*)text, text_len, &encode_buf);
    }
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("Base64 zero copy encode * %d : %lldms\n", loop_size, ms_elapsed(t0, t1));
    printf("encode: %s\n", encode_buf.data);

    dat_sbuf_t decode_buf;
    sbuf_init(&decode_buf, 1000);

    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int i = 0; i < loop_size; i++) {
        sbuf_clear(&decode_buf);
        decode_base64_url_out_str(encode_buf.data, encode_buf.len, &decode_buf);
    }
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("Base64 zero copy encode * %d : %lldms\n", loop_size, ms_elapsed(t0, t1));
    printf("decode: %s\n", decode_buf.data);

    assert(decode_buf.len == text_len);
    assert(memcmp(decode_buf.data, text, text_len) == 0);

    sbuf_free(&encode_buf);
    sbuf_free(&decode_buf);

    /* === base64_copy_test === */
    size_t total_len = 0;

    clock_gettime(CLOCK_MONOTONIC, &t0);
    char* enc_copy = NULL;
    size_t enc_copy_len = 0;
    for (int i = 0; i < loop_size; i++) {
        free(enc_copy);
        enc_copy = NULL;
        encode_base64_url((const uint8_t*)text, text_len, &enc_copy, &enc_copy_len);
        total_len += enc_copy_len;
    }
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("Base64 copy encode * %d : %lldms\n", loop_size, ms_elapsed(t0, t1));
    printf("encode: %s\n", enc_copy);

    clock_gettime(CLOCK_MONOTONIC, &t0);
    char* dec_copy = NULL;
    size_t dec_copy_len = 0;
    for (int i = 0; i < loop_size; i++) {
        free(dec_copy);
        dec_copy = NULL;
        uint8_t* tmp = NULL;
        size_t tmp_len = 0;
        decode_base64_url(enc_copy, enc_copy_len, &tmp, &tmp_len);
        dec_copy = (char*)tmp;
        dec_copy_len = tmp_len;
        total_len += enc_copy_len;
    }
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("Base64 copy encode * %d : %lldms\n", loop_size, ms_elapsed(t0, t1));
    /* Rust prints decode as string */
    if (dec_copy) printf("decode: %.*s\n", (int)dec_copy_len, dec_copy);
    printf("len: %zu\n", total_len);

    assert(dec_copy_len == text_len);
    assert(memcmp(dec_copy, text, text_len) == 0);

    free(enc_copy);
    free(dec_copy);
    return 0;
}
#endif
