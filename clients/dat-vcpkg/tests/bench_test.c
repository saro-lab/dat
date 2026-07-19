#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>
#include <pthread.h>

#include "dat_util.h"
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

static long long ms_elapsed(struct timespec start, struct timespec end) {
    return (end.tv_sec - start.tv_sec) * 1000LL + (end.tv_nsec - start.tv_nsec) / 1000000LL;
}

struct issue_worker_arg {
    const dat_certificate_t* cert;
    const char* plain;
    const char* secure;
    int count;
    char** results;
};

static void* thread_issue_worker(void* arg) {
    struct issue_worker_arg* a = (struct issue_worker_arg*)arg;
    for (int i = 0; i < a->count; i++) {
        dat_manager_issue_with_cert(a->cert, a->plain, a->secure, &a->results[i]);
    }
    return NULL;
}

struct parse_worker_arg {
    const dat_certificate_t* cert;
    const char* dat_str;
    int count;
    dat_payload_t** results;
};

static void* thread_parse_worker(void* arg) {
    struct parse_worker_arg* a = (struct parse_worker_arg*)arg;
    for (int i = 0; i < a->count; i++) {
        dat_manager_parse_with_cert(a->cert, a->dat_str, &a->results[i]);
    }
    return NULL;
}

static void loops(int multi_thread, int loop_size,
                  dat_certificate_t** certificates, size_t cert_count,
                  const char* plain, const char* secure)
{
    const int THREAD_COUNT = 10;
    if (multi_thread) {
        printf("\nMulti-Thread\n");
    } else {
        printf("\nSingle-Thread\n");
    }

    for (size_t ci = 0; ci < cert_count; ci++) {
        const dat_certificate_t* cert = certificates[ci];
        const char* sig_str = dat_signature_alg_to_str(dat_certificate_signature_algorithm(cert));
        const char* cry_str = dat_crypto_alg_to_str(dat_certificate_crypto_algorithm(cert));
        char pre[128];
        snprintf(pre, sizeof(pre), "%s %s", sig_str, cry_str);

        char* last_dat = NULL;
        struct timespec t0, t1;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        if (multi_thread) {
            pthread_t threads[THREAD_COUNT];
            struct issue_worker_arg args[THREAD_COUNT];
            char** all_results = (char**)calloc(loop_size, sizeof(char*));

            int base_count = loop_size / THREAD_COUNT;
            int rem = loop_size % THREAD_COUNT;
            int current_idx = 0;

            for (int i = 0; i < THREAD_COUNT; i++) {
                int count = base_count + (i < rem ? 1 : 0);
                args[i].cert = cert;
                args[i].plain = plain;
                args[i].secure = secure;
                args[i].count = count;
                args[i].results = &all_results[current_idx];
                pthread_create(&threads[i], NULL, thread_issue_worker, &args[i]);
                current_idx += count;
            }

            for (int i = 0; i < THREAD_COUNT; i++) {
                pthread_join(threads[i], NULL);
            }

            last_dat = all_results[loop_size - 1];
            for (int i = 0; i < loop_size - 1; i++) free(all_results[i]);
            free(all_results);
        } else {
            for (int i = 0; i < loop_size; i++) {
                char* tmp = NULL;
                dat_manager_issue_with_cert(cert, plain, secure, &tmp);
                if (last_dat) free(last_dat);
                last_dat = tmp;
            }
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%s Issue * %d : %lldms\n", pre, loop_size, ms_elapsed(t0, t1));

        /* parse */
        dat_payload_t* last_payload = NULL;

        clock_gettime(CLOCK_MONOTONIC, &t0);
        if (multi_thread) {
            pthread_t threads[THREAD_COUNT];
            struct parse_worker_arg args[THREAD_COUNT];
            dat_payload_t** all_results = (dat_payload_t**)calloc(loop_size, sizeof(dat_payload_t*));

            int base_count = loop_size / THREAD_COUNT;
            int rem = loop_size % THREAD_COUNT;
            int current_idx = 0;

            for (int i = 0; i < THREAD_COUNT; i++) {
                int count = base_count + (i < rem ? 1 : 0);
                args[i].cert = cert;
                args[i].dat_str = last_dat;
                args[i].count = count;
                args[i].results = &all_results[current_idx];
                pthread_create(&threads[i], NULL, thread_parse_worker, &args[i]);
                current_idx += count;
            }

            for (int i = 0; i < THREAD_COUNT; i++) {
                pthread_join(threads[i], NULL);
            }

            last_payload = all_results[loop_size - 1];
            for (int i = 0; i < loop_size - 1; i++) dat_payload_free(all_results[i]);
            free(all_results);
        } else {
            for (int i = 0; i < loop_size; i++) {
                dat_payload_t* tmp = NULL;
                dat_manager_parse_with_cert(cert, last_dat, &tmp);
                if (last_payload) dat_payload_free(last_payload);
                last_payload = tmp;
            }
        }
        clock_gettime(CLOCK_MONOTONIC, &t1);
        printf("%s Parse * %d : %lldms\n", pre, loop_size, ms_elapsed(t0, t1));

        assert(last_payload && last_payload->plain_len == strlen(plain));
        assert(memcmp(last_payload->plain_bytes, plain, last_payload->plain_len) == 0);
        assert(last_payload->secure_len == strlen(secure));
        assert(memcmp(last_payload->secure_bytes, secure, last_payload->secure_len) == 0);

        free(last_dat);
        dat_payload_free(last_payload);
    }
}

int main(void) {
    srand((unsigned)time(NULL));

    char plain_buf[101], secure_buf[101];
    rand_string(plain_buf, 100);
    rand_string(secure_buf, 100);

    printf("performance test (plain, secure)\n");
    printf("plain: %s\n", plain_buf);
    printf("secure: %s\n", secure_buf);

    size_t cert_count = DAT_SIGNATURE_ALG_COUNT * DAT_CRYPTO_ALG_COUNT;
    dat_certificate_t** certs = (dat_certificate_t**)malloc(sizeof(dat_certificate_t*) * cert_count);
    assert(certs);

    size_t idx = 0;
    uint64_t now = now_unix_timestamp();
    for (size_t sa = 0; sa < DAT_SIGNATURE_ALG_COUNT; sa++) {
        for (size_t ca = 0; ca < DAT_CRYPTO_ALG_COUNT; ca++) {
            dat_certificate_t* cert = NULL;
            dat_error_t err = dat_certificate_create(0, now - 10, 200, 100,
                                                      DAT_SIGNATURE_ALG_LIST[sa],
                                                      DAT_CRYPTO_ALG_LIST[ca], &cert);
            assert(err == DAT_SUCCESS);
            certs[idx++] = cert;
        }
    }

    int loop_size = 10000;
    loops(1, loop_size, certs, cert_count, plain_buf, secure_buf);
    loops(0, loop_size, certs, cert_count, plain_buf, secure_buf);

    for (size_t i = 0; i < cert_count; i++) dat_certificate_free(certs[i]);
    free(certs);
    return 0;
}
#endif
