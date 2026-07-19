#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>
#include <openssl/ec.h>
#include <openssl/ecdsa.h>
#include <openssl/evp.h>
#include <openssl/obj_mac.h>
#include "../include/dat/dat.h"

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

static void bench_ecdsa(int loop_size, const char* text, size_t text_len) {
    printf("ECDSA\n");

    static const dat_signature_alg_t ECDSA_ALGS[] = {
        DAT_SIG_ECDSA_P256, DAT_SIG_ECDSA_P384, DAT_SIG_ECDSA_P521
    };
    static const size_t ECDSA_ALG_COUNT = 3;

    for (size_t a = 0; a < ECDSA_ALG_COUNT; a++) {
        dat_signature_alg_t alg = ECDSA_ALGS[a];
        const char* tag = dat_signature_alg_to_str(alg);

        dat_signature_t* key = NULL;
        dat_error_t err = dat_signature_new(alg, &key);
        assert(err == DAT_SUCCESS);

        uint8_t* sign = NULL;
        size_t sign_len = 0;
        struct timespec t0, t1;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            free(sign);
            sign = NULL;
            err = dat_signature_sign(key, (const uint8_t*)text, text_len, &sign, &sign_len);
            assert(err == DAT_SUCCESS);
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%s copy sign * %d : %lldms\n", tag, loop_size, ms_elapsed(t0, t1));

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            err = dat_signature_verify(key, (const uint8_t*)text, text_len, sign, sign_len);
            assert(err == DAT_SUCCESS);
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%s copy verify * %d : %lldms\n", tag, loop_size, ms_elapsed(t0, t1));

        free(sign);
        dat_signature_free(key);
    }
}

static void bench_openssl(int loop_size, const char* text, size_t text_len) {
    printf("OPENSSL\n");

    static const struct { int nid; int bits; const EVP_MD* (*md)(void); } CURVES[] = {
        { NID_X9_62_prime256v1, 256, EVP_sha256 },
        { NID_secp384r1,        384, EVP_sha384 },
        { NID_secp521r1,        521, EVP_sha512 },
    };

    for (int c = 0; c < 3; c++) {
        int bits = CURVES[c].bits;
        const EVP_MD* md = CURVES[c].md();

        EVP_PKEY_CTX* kctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, NULL);
        EVP_PKEY_keygen_init(kctx);
        EVP_PKEY_CTX_set_ec_paramgen_curve_nid(kctx, CURVES[c].nid);
        EVP_PKEY* pkey = NULL;
        EVP_PKEY_keygen(kctx, &pkey);
        EVP_PKEY_CTX_free(kctx);

        unsigned char* sig = NULL;
        size_t sig_len = 0;
        struct timespec t0, t1;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            free(sig);
            sig = NULL;
            EVP_MD_CTX* mctx = EVP_MD_CTX_new();
            EVP_DigestSignInit(mctx, NULL, md, NULL, pkey);
            EVP_DigestSignUpdate(mctx, text, text_len);
            EVP_DigestSignFinal(mctx, NULL, &sig_len);
            sig = (unsigned char*)malloc(sig_len);
            EVP_DigestSignFinal(mctx, sig, &sig_len);
            EVP_MD_CTX_free(mctx);
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%d copy sign * %d : %lldms\n", bits, loop_size, ms_elapsed(t0, t1));

        clock_gettime(CLOCK_MONOTONIC, &t0);
        for (int i = 0; i < loop_size; i++) {
            EVP_MD_CTX* mctx = EVP_MD_CTX_new();
            EVP_DigestVerifyInit(mctx, NULL, md, NULL, pkey);
            EVP_DigestVerifyUpdate(mctx, text, text_len);
            EVP_DigestVerifyFinal(mctx, sig, sig_len);
            EVP_MD_CTX_free(mctx);
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%d copy verify * %d : %lldms\n", bits, loop_size, ms_elapsed(t0, t1));

        free(sig);
        EVP_PKEY_free(pkey);
    }
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

    bench_ecdsa(loop_size, text, text_len);
    bench_openssl(loop_size, text, text_len);

    return 0;
}
#endif
