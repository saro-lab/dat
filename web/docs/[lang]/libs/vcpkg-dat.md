# DAT C Library
- [Github](https://github.com/saro-lab/dat-vcpkg/tree/master) / [Test Code](https://github.com/saro-lab/dat-vcpkg/tree/master/tests)

## {{t('repository')}}
> Until it is officially merged into vcpkg, you will need to manually install and integrate the project using this repository.<br/>
> https://github.com/microsoft/vcpkg/pull/52088 <br/>
> version: {{ver}}


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: example_cms_manager_test.c](https://github.com/saro-lab/dat-vcpkg/blob/master/tests/example_cms_manager_test.c)
#### log
```c
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
```
#### init
```c
const char* url = "http://localhost:8088";
const char* token = "1234";
bool verify_only = false;
// uint64_t interval_seconds = 0; // disable auto sync
uint64_t interval_seconds = 60;
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
``` 
#### issue / parse
```c
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
``` 

## {{t('example')}}: {{t('manual_code')}}
- [{{t('example')}}: hard_test.c](https://github.com/saro-lab/dat-vcpkg/blob/master/tests/hard_test.c)
- [{{t('example')}}: manager_example_test.c](https://github.com/saro-lab/dat-vcpkg/blob/master/tests/manager_example_test.c)
```c
static const char* PLAIN  = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
static const char* SECURE = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

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
```




<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Vcpkg', 'dat');
const ver = lib.version;
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
