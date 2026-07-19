#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../include/dat/dat.h"
#include "../src/dat_util.h"

static const char* PLAIN  = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
static const char* SECURE = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";


int main(void) {
    dat_manager_t* manager = dat_manager_new();
    assert(manager);

    dat_certificate_t* cert = NULL;
    dat_error_t err = dat_certificate_create(1, now_unix_timestamp() - 10, 200, 100, DAT_SIG_ECDSA_P256, DAT_CRYPTO_IV_AES256_GCM, &cert);
    assert(err == DAT_SUCCESS);

    err = dat_manager_import_certificates(manager, &cert, 1, false, NULL);
    assert(err == DAT_SUCCESS);

    char* dat = NULL;
    err = dat_manager_issue(manager, PLAIN, SECURE, &dat);
    assert(err == DAT_SUCCESS);

    dat_payload_t* payload = NULL;
    err = dat_manager_parse(manager, dat, &payload);
    assert(err == DAT_SUCCESS);

    char* plain = (char*)payload->plain_bytes;
    char* secure = (char*)payload->secure_bytes;

    assert(memcmp(plain, PLAIN, payload->plain_len) == 0);
    assert(memcmp(secure, SECURE, payload->secure_len) == 0);

    printf("PASS DAT %s\n", dat);
    printf("PASS PLAIN %s\n", plain);
    printf("PASS SECURE %s\n", secure);

    free(dat);
    dat_payload_free(payload);
    dat_manager_free(manager);

    return 0;
}
