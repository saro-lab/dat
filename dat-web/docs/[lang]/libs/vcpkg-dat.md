# DAT C Library
<GithubBadge label="GitHub" /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-vcpkg/tree/master/tests)

## {{t('repository')}}
> Until it is officially merged into vcpkg, you will need to manually install and integrate the project using this repository.<br/>
> https://github.com/microsoft/vcpkg/pull/52088 <br/>
> version: {{ver}}

> **Requires:** CMake >= 3.15 · OpenSSL · Threads (CURL only when the CMS client is built)

#### CMakeLists.txt
```cmake
find_package(dat CONFIG REQUIRED)

add_executable(my_app main.c)
target_link_libraries(my_app PRIVATE dat)
```
`dat-config.cmake` resolves OpenSSL, Threads and CURL through `find_dependency`, so a
static consumer no longer has to declare them itself.


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: example_cms_manager_test.c](https://github.com/saro-lab/dat/tree/master/dat-vcpkg/blob/master/tests/example_cms_manager_test.c)
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
// Creation now always returns DAT_SUCCESS(0) on success, so the plain `if (err)`
// idiom works. A failed first sync is not a creation failure — the manager is
// still usable once the network recovers.
if (err != DAT_SUCCESS) {
    printf("Failed to create cms manager: %s\n", dat_error_code(err));
    return 1;
}
printf("CMS manager created\n");

// Ask separately whether the first sync went through.
dat_error_t sync_err = dat_cms_manager_last_error(manager);
if (sync_err != DAT_SUCCESS) {
    // A permanent failure (bad token, wrong URL) will never resolve on its own.
    printf("initial sync failed: %s (retry=%s)\n",
           dat_error_code(sync_err),
           dat_error_retry(sync_err) == DAT_RETRY_TRANSIENT ? "transient" : "permanent");
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
#### {{t('error_handling')}}
- [{{t('example')}}: error_code_test.c](https://github.com/saro-lab/dat/tree/master/dat-vcpkg/blob/master/tests/error_code_test.c)

Every failure returns a `dat_error_t`. The string from `dat_error_code()` is the
contract — the integer is kept only for ABI compatibility.

```c
// Expiry, forgery and malformed input each need a different response.
dat_payload_t* payload = NULL;
dat_error_t err = dat_cms_manager_parse(manager, dat_str, &payload);
if (err != DAT_SUCCESS) {
    if (err == DAT_TOKEN_EXPIRED) {
        // Normal end of life — let the client refresh its token.
    } else if (dat_error_is_security_event(err)) {
        // DAT_SIG_MISMATCH or DAT_CRYPTO_TAG_MISMATCH: forged or tampered with.
        fprintf(stderr, "[SECURITY] %s\n", dat_error_code(err));
    } else {
        // Anything else: just reject the request.
        fprintf(stderr, "rejected: %s\n", dat_error_code(err));
    }
}
```
```c
// Never retry a permanent failure — it will not resolve on its own.
if (dat_error_retry(err) == DAT_RETRY_TRANSIENT) {
    // back off, then retry
}
```
```c
// C has no exception chaining, so when issuing fails the reason is a separate
// query. Waiting helps for DAT_CERT_NOT_YET_ISSUABLE and nothing else.
char* out = NULL;
err = dat_cms_manager_issue(manager, plain, secure, &out);
if (err == DAT_MANAGER_NO_ISSUABLE_CERTIFICATE) {
    // issuable_cause() takes the inner dat_manager_t*, not the CMS wrapper.
    dat_error_t cause = dat_manager_issuable_cause(dat_cms_manager_get_manager(manager));
    fprintf(stderr, "cannot issue: %s\n", dat_error_code(cause));
}
```

## {{t('example')}}: {{t('manual_code')}}
- [{{t('example')}}: hard_test.c](https://github.com/saro-lab/dat/tree/master/dat-vcpkg/blob/master/tests/hard_test.c)
- [{{t('example')}}: manager_example_test.c](https://github.com/saro-lab/dat/tree/master/dat-vcpkg/blob/master/tests/manager_example_test.c)
```c
static const char* PLAIN  = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
static const char* SECURE = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

dat_manager_t* manager = dat_manager_new();
assert(manager);

// (cid, issuance_start, issuance_duration, dat_ttl, signature_alg, crypto_alg)
dat_certificate_t* cert = NULL;
dat_error_t err = dat_certificate_create(1, now_unix_timestamp() - 10, 3600, 1800, DAT_SIG_ECDSA_P256, DAT_CRYPTO_IV_AES256_GCM, &cert);
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
/* payload bytes are length-delimited, not NUL-terminated — "%s" would read past
 * the end of the buffer. */
printf("PASS PLAIN %.*s\n", (int)payload->plain_len, plain);
printf("PASS SECURE %.*s\n", (int)payload->secure_len, secure);

free(dat);
dat_payload_free(payload);
dat_manager_free(manager);
/* import_certificates borrows the array; the caller keeps ownership. */
dat_certificate_free(cert);
```




<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Vcpkg', 'dat');
const ver = lib.version;
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
