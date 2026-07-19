#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>

#include "dat_util.h"
#include "../include/dat/dat.h"

static void rand_string(char* buf, size_t len) {
    static const char CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (size_t i = 0; i < len; i++)
        buf[i] = CHARS[rand() % 62];
    buf[len] = '\0';
}

static void unit(
    const dat_certificate_t* fail_certificate,
    uint64_t cid,
    dat_signature_alg_t sig_alg,
    dat_crypto_alg_t crypto_alg,
    const char* plain,
    const char* secure
) {
    /* tag: "dat.<sig>.<crypto>.<hex_cid>" */
    char tag[128];
    char hex_cid[17];
    /* hex cid: no leading zeros */
    if (cid == 0) {
        snprintf(hex_cid, sizeof(hex_cid), "0");
    } else {
        char tmp[17];
        int cursor = 16;
        uint64_t n = cid;
        tmp[16] = '\0';
        while (n > 0) {
            tmp[--cursor] = "0123456789abcdef"[n & 0xF];
            n >>= 4;
        }
        snprintf(hex_cid, sizeof(hex_cid), "%s", tmp + cursor);
    }
    snprintf(tag, sizeof(tag), "dat.%s.%s.%s",
             dat_signature_alg_to_str(sig_alg),
             dat_crypto_alg_to_str(crypto_alg),
             hex_cid);

    uint64_t now = now_unix_timestamp();
    dat_certificate_t* new_cert = NULL;
    dat_error_t err = dat_certificate_create(cid, now - 10, 200, 100, sig_alg, crypto_alg, &new_cert);
    assert(err == DAT_SUCCESS);

    char* cert_str = NULL;
    err = dat_certificate_export(new_cert, false, &cert_str);
    assert(err == DAT_SUCCESS);

    dat_certificate_t* read_cert = NULL;
    err = dat_certificate_parse(cert_str, &read_cert);
    assert(err == DAT_SUCCESS);

    char* dat_token = NULL;
    err = dat_manager_issue_with_cert(new_cert, plain, secure, &dat_token);
    assert(err == DAT_SUCCESS);

    printf("%s: %s\n", tag, dat_token);

    dat_payload_t* payload = NULL;
    err = dat_manager_parse_with_cert(read_cert, dat_token, &payload);
    assert(err == DAT_SUCCESS);

    assert(strlen(plain) == payload->plain_len);
    assert(memcmp(payload->plain_bytes, plain, payload->plain_len) == 0);
    assert(strlen(secure) == payload->secure_len);
    assert(memcmp(payload->secure_bytes, secure, payload->secure_len) == 0);

    dat_payload_t* fail_payload = NULL;
    dat_error_t fail_err = dat_manager_parse_with_cert(fail_certificate, dat_token, &fail_payload);
    assert(fail_err != DAT_SUCCESS);
    if (fail_payload) dat_payload_free(fail_payload);

    free(cert_str);
    free(dat_token);
    dat_payload_free(payload);
    dat_certificate_free(new_cert);
    dat_certificate_free(read_cert);
}

int main(void) {
    srand((unsigned)time(NULL));

    uint64_t now = now_unix_timestamp();
    dat_certificate_t* fail_cert = NULL;
    dat_error_t err = dat_certificate_create(192874, now - 10, 200, 100,
                                              DAT_SIG_ECDSA_P256, DAT_CRYPTO_IV_AES128_GCM, &fail_cert);
    assert(err == DAT_SUCCESS);

    for (size_t sa = 0; sa < DAT_SIGNATURE_ALG_COUNT; sa++) {
        dat_signature_alg_t sig_alg = DAT_SIGNATURE_ALG_LIST[sa];
        for (size_t ca = 0; ca < DAT_CRYPTO_ALG_COUNT; ca++) {
            dat_crypto_alg_t crypto_alg = DAT_CRYPTO_ALG_LIST[ca];
            /* 19 random, cid = 1..19 */
            for (uint64_t i = 1; i < 20; i++) {
                char plain[101], secure_str[101];
                rand_string(plain, 100);
                rand_string(secure_str, 100);
                unit(fail_cert, i, sig_alg, crypto_alg, plain, secure_str);
            }
            /* empty, cid = 0 */
            unit(fail_cert, 0, sig_alg, crypto_alg, "", "");
        }
    }

    dat_certificate_free(fail_cert);
    return 0;
}
