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

static void gen_certificate(dat_manager_t* manager) {
    uint64_t now = now_unix_timestamp();
    dat_certificate_t** certs = NULL;
    size_t cert_count = DAT_SIGNATURE_ALG_COUNT * DAT_CRYPTO_ALG_COUNT * 4;
    certs = (dat_certificate_t**)malloc(sizeof(dat_certificate_t*) * cert_count);
    assert(certs);

    uint64_t i = 0;
    size_t idx = 0;
    for (size_t sa = 0; sa < DAT_SIGNATURE_ALG_COUNT; sa++) {
        dat_signature_alg_t sig_alg = DAT_SIGNATURE_ALG_LIST[sa];
        for (size_t ca = 0; ca < DAT_CRYPTO_ALG_COUNT; ca++) {
            dat_crypto_alg_t crypto_alg = DAT_CRYPTO_ALG_LIST[ca];
            for (int k = 0; k < 4; k++) {
                dat_certificate_t* cert = NULL;
                dat_error_t err = dat_certificate_create(i, now - 10, 200, 100, sig_alg, crypto_alg, &cert);
                assert(err == DAT_SUCCESS);
                certs[idx++] = cert;
                i++;
            }
        }
    }

    /* print "Generated \n<cert_lines>" */
    printf("Generated \n");
    for (size_t j = 0; j < cert_count; j++) {
        char* cert_str = NULL;
        dat_error_t err = dat_certificate_export(certs[j], false, &cert_str);
        assert(err == DAT_SUCCESS);
        printf("%s", cert_str);
        if (j + 1 < cert_count) printf("\n");
        free(cert_str);
    }
    printf("\n");

    dat_error_t err = dat_manager_import_certificates(manager, certs, cert_count, false, NULL);
    assert(err == DAT_SUCCESS);

    for (size_t j = 0; j < cert_count; j++) {
        dat_certificate_free(certs[j]);
    }
    free(certs);
}

int main(void) {
    srand((unsigned)time(NULL));

    dat_manager_t* manager = dat_manager_new();
    assert(manager);

    char plain[101], secure[101];
    rand_string(plain, 100);
    rand_string(secure, 100);

    gen_certificate(manager);

    /* export certificates */
    dat_certificate_t** certs = NULL;
    size_t cert_count = 0;
    dat_error_t err = dat_manager_export_certificates(manager, &certs, &cert_count);
    assert(err == DAT_SUCCESS);

    /* issue dats */
    char** dats = (char**)malloc(sizeof(char*) * cert_count);
    assert(dats);
    for (size_t i = 0; i < cert_count; i++) {
        char* dat_token = NULL;
        err = dat_manager_issue_with_cert(certs[i], plain, secure, &dat_token);
        assert(err == DAT_SUCCESS);
        dats[i] = dat_token;
    }

    /* export and re-import */
    char* export_str = NULL;
    err = dat_manager_export(manager, false, &export_str);
    assert(err == DAT_SUCCESS);

    dat_manager_t* manager2 = dat_manager_new();
    assert(manager2);
    err = dat_manager_import(manager2, export_str, true, NULL);
    assert(err == DAT_SUCCESS);

    const char* tag = "dat.manager";
    for (size_t i = 0; i < cert_count; i++) {
        printf("%s.%s\n", tag, dats[i]);

        dat_payload_t* payload = NULL;
        err = dat_manager_parse(manager2, dats[i], &payload);
        assert(err == DAT_SUCCESS);

        /* DatPayload Display: encode_base64_url(plain) + " " + encode_base64_url(secure) */
        char* plain_b64 = NULL;
        size_t plain_b64_len = 0;
        encode_base64_url(payload->plain_bytes, payload->plain_len, &plain_b64, &plain_b64_len);
        char* secure_b64 = NULL;
        size_t secure_b64_len = 0;
        encode_base64_url(payload->secure_bytes, payload->secure_len, &secure_b64, &secure_b64_len);
        printf("%s.%s %s\n", tag, plain_b64, secure_b64);

        assert(strlen(plain) == payload->plain_len);
        assert(memcmp(payload->plain_bytes, plain, payload->plain_len) == 0);
        assert(strlen(secure) == payload->secure_len);
        assert(memcmp(payload->secure_bytes, secure, payload->secure_len) == 0);

        free(plain_b64);
        free(secure_b64);
        dat_payload_free(payload);
    }

    for (size_t i = 0; i < cert_count; i++) {
        dat_certificate_free(certs[i]);
        free(dats[i]);
    }
    free(certs);
    free(dats);
    free(export_str);
    dat_manager_free(manager);
    dat_manager_free(manager2);
    return 0;
}
