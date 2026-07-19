#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#ifdef _WIN32
#include <windows.h>
#else
#include <time.h>
#endif
#ifdef DAT_CMS_CURL
#include "../include/dat/dat_cms.h"

static const char* log_level_str(dat_log_level_t level) {
    switch (level) {
        case DAT_LOG_DEBUG:    return "DEBUG";
        case DAT_LOG_INFO:     return "INFO";
        case DAT_LOG_WARN:     return "WARN";
        case DAT_LOG_ERROR:    return "ERROR";
        default:               return "UNKNOWN";
    }
}

static void example_log_fn(dat_log_level_t level, const char* message, void* userdata) {
    (void)userdata;
    printf("[CMS][%s] %s\n", log_level_str(level), message);
}
#endif

int main(void) {
#ifndef DAT_CMS_CURL
    printf("CMS support not compiled in, skipping.\n");
    return 0;
#else
    const char* url = "http://localhost:8088";
    const char* token = "1234";
    bool verify_only = false;
    // uint64_t interval_seconds = 0; // disable auto sync
    uint64_t interval_seconds = 1;
    // dat_log_fn_t log_fn = NULL; // disable log
    dat_log_fn_t log_fn = example_log_fn;

    dat_cms_manager_t* manager = NULL;
    dat_error_t err = dat_cms_manager_create(
        url, token, verify_only, interval_seconds,
        log_fn, NULL, &manager);
    if (err == DAT_SUCCESS) {
        printf("CMS manager created\n");
    } else if (err == DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL) {
        printf("CMS manager created but initial sync failed (network unavailable).\n");
    } else {
        printf("Failed to create cms manager: %d\n", (int)err);
        return 1;
    }

    // manual sync
    // dat_cms_manager_sync(manager);

    static const char* plain  = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
    static const char* secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";
    char* dat_str = NULL;
    err = dat_cms_manager_issue(manager, plain, secure, &dat_str);
    if (err != DAT_SUCCESS) {
        printf("Issue failed: %d\n", (int)err);
    } else {
        printf("dat: %s\n", dat_str);

        dat_payload_t* payload = NULL;
        err = dat_cms_manager_parse(manager, dat_str, &payload);
        assert(err == DAT_SUCCESS);
        printf("payload plain: %.*s\n",  (int)payload->plain_len,  (char*)payload->plain_bytes);
        printf("payload secure: %.*s\n", (int)payload->secure_len, (char*)payload->secure_bytes);

        assert(payload->plain_len  == strlen(plain));
        assert(memcmp(payload->plain_bytes,  plain,  payload->plain_len)  == 0);
        assert(payload->secure_len == strlen(secure));
        assert(memcmp(payload->secure_bytes, secure, payload->secure_len) == 0);
        dat_payload_free(payload);
    }
    free(dat_str);

#ifdef _WIN32
    Sleep(5000);
#else
    struct timespec ts = { 5, 0 };
    nanosleep(&ts, NULL);
#endif

    dat_cms_manager_free(manager);
    return 0;
#endif
}
