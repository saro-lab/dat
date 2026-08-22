# DAT for C and C++

Port: `dat` (vcpkg) | CMake >= 3.15 | OpenSSL | Threads | CURL when the CMS client is built |
source: `dat-vcpkg/`

The API is C with `extern "C"` guards, so it is usable directly from C++.

## Install

The port is not merged into vcpkg yet, so install it from this repository until
[microsoft/vcpkg#52088](https://github.com/microsoft/vcpkg/pull/52088) lands.

```cmake
find_package(dat CONFIG REQUIRED)

add_executable(my_app main.c)
target_link_libraries(my_app PRIVATE dat)
```

`dat-config.cmake` resolves OpenSSL, Threads and CURL through `find_dependency`, so a static
consumer does not have to declare them itself.

```c
#include <dat/dat.h>
#include <dat/dat_cms.h>   // CMS client
```

## Error and ownership conventions

Two rules cover almost every call:

1. **Every fallible function returns `dat_error_t`.** `DAT_SUCCESS` is `0`, so `if (err) { ... }`
   works. Output values come back through a trailing out-parameter.
2. **Every out-parameter you receive, you free.** `char*` with `free()`, `dat_payload_t*` with
   `dat_payload_free()`, and the object types with their matching `*_free()`.

```c
char* dat_str = NULL;
dat_error_t err = dat_manager_issue(manager, plain, secure, &dat_str);
if (err != DAT_SUCCESS) { /* handle */ }
free(dat_str);
```

The integer values of `dat_error_t` are kept for ABI compatibility only. **Compare on the string**
from `dat_error_code(e)`; the library no longer returns the old integer values, so a check like
`err == DAT_ERROR_INVALID_DAT` will never match.

## With a CMS (production)

There is no builder in C - one create call takes everything.

```c
static const char* log_level_str(dat_log_level_t level) {
    switch (level) {
        case DAT_LOG_DEBUG: return "DEBUG";
        case DAT_LOG_INFO:  return "INFO";
        case DAT_LOG_WARN:  return "WARN";
        case DAT_LOG_ERROR: return "ERROR";
        default:            return "UNKNOWN";
    }
}

static void example_log_fn(dat_log_level_t level, const char* message, void* userdata) {
    (void)userdata;
    printf("[CMS][%s] %s\n", log_level_str(level), message);
}
```

```c
const char* url = "http://localhost:8088";
const char* token = "1234";
bool verify_only = false;   // true only when a separate service does the issuing
uint64_t interval_seconds = 60;   // 0 disables auto sync
dat_log_fn_t log_fn = example_log_fn;   // NULL disables logging

dat_cms_manager_t* manager = NULL;
dat_error_t err = dat_cms_manager_create(
    url, token, verify_only, interval_seconds,
    log_fn, NULL, &manager);
// A failed first sync is not a creation failure - the manager is still usable
// once the network recovers.
if (err != DAT_SUCCESS) {
    printf("Failed to create cms manager: %s\n", dat_error_code(err));
    return 1;
}

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

// on shutdown
dat_cms_manager_free(manager);
```

The URL must be scheme + host + port - no path, no query.
`dat_cms_manager_get_version(manager)` reports the synced version;
`dat_cms_manager_get_manager(manager)` returns the inner `dat_manager_t*` **borrowed**, not owned -
do not free it.

Built without CMS support (feature off, or CURL missing), these calls report
`DAT_CMS_NOT_SUPPORTED`.

## Issue and parse

```c
static const char* plain  = "42|acme|admin";
static const char* secure = "42|s-91af|billing:rw";

char* dat_str = NULL;
dat_error_t err = dat_cms_manager_issue(manager, plain, secure, &dat_str);
if (err != DAT_SUCCESS) {
    printf("issue failed: %s\n", dat_error_code(err));
} else {
    dat_payload_t* payload = NULL;
    err = dat_cms_manager_parse(manager, dat_str, &payload);
    if (err == DAT_SUCCESS) {
        printf("plain: %.*s\n",  (int)payload->plain_len,  (char*)payload->plain_bytes);
        printf("secure: %.*s\n", (int)payload->secure_len, (char*)payload->secure_bytes);
        dat_payload_free(payload);
    }
}
free(dat_str);
```

`dat_payload_t` is a plain struct:

```c
typedef struct dat_payload {
    uint8_t* plain_bytes;
    size_t   plain_len;
    uint8_t* secure_bytes;
    size_t   secure_len;
} dat_payload_t;
```

The bytes are **length-delimited, not NUL-terminated.** `printf("%s", payload->plain_bytes)` reads
past the end of the buffer - always use `%.*s` with the length, or copy into your own NUL-terminated
buffer.

## Without a CMS

```c
dat_manager_t* manager = dat_manager_new();

// (cid, issuance_start, issuance_duration, dat_ttl, signature_alg, crypto_alg)
dat_certificate_t* cert = NULL;
dat_error_t err = dat_certificate_create(
    1, (uint64_t)time(NULL) - 10, 3600, 1800,
    DAT_SIG_ECDSA_P256, DAT_CRYPTO_IV_AES256_GCM, &cert);
if (err != DAT_SUCCESS) { /* handle */ }

err = dat_manager_import_certificates(manager, &cert, 1, false, NULL);
if (err != DAT_SUCCESS) { /* handle */ }

char* dat = NULL;
err = dat_manager_issue(manager, PLAIN, SECURE, &dat);

dat_payload_t* payload = NULL;
err = dat_manager_parse(manager, dat, &payload);

free(dat);
dat_payload_free(payload);
dat_manager_free(manager);
/* import_certificates borrows the array; the caller keeps ownership. */
dat_certificate_free(cert);
```

`time(NULL)` is **seconds**. The third argument is a duration, not an end time.
`dat_manager_import_certificates` borrows the certificate array - you still free each certificate
yourself.

Algorithm enums: `DAT_SIG_ECDSA_P256`, `DAT_SIG_ECDSA_P384`, `DAT_SIG_ECDSA_P521`,
`DAT_SIG_HMAC_SHA256_MFS`, `DAT_SIG_HMAC_SHA384_MFS`, `DAT_SIG_HMAC_SHA512_MFS`,
`DAT_CRYPTO_IV_AES128_GCM`, `DAT_CRYPTO_IV_AES256_GCM`. `dat_signature_alg_from_str` /
`dat_crypto_alg_from_str` convert from the wire names.

## API surface

| Function | Purpose |
| --- | --- |
| `dat_manager_new()` / `dat_manager_free()` | lifecycle |
| `dat_manager_issue(m, plain, secure, &out)` | issue |
| `dat_manager_parse(m, str, &payload)` | verify + decode |
| `dat_manager_parse_without_verify(..)` | **logging only** |
| `dat_manager_import_certificates(m, certs, n, clear, &count)` | import objects |
| `dat_manager_import(m, format, clear, &count)` | import text |
| `dat_manager_export(m, verify_only, &out)` | export text |
| `dat_manager_export_certificates(m, &certs, &count)` | export objects |
| `dat_manager_export_cids(m, &cids, &count)` | list cids |
| `dat_manager_issuable_cause(m)` | why issuance is impossible |
| `dat_certificate_create/parse/export/clone/free` | certificates |
| `dat_crypto_*` / `dat_signature_*` | raw primitives |

CMS: `dat_cms_manager_create/free/sync/last_error/issue/parse/parse_without_verify/get_version/get_manager`.

## Error handling

```c
// Expiry, forgery and malformed input each need a different response.
dat_payload_t* payload = NULL;
dat_error_t err = dat_cms_manager_parse(manager, dat_str, &payload);
if (err != DAT_SUCCESS) {
    if (err == DAT_TOKEN_EXPIRED) {
        // Normal end of life - let the client refresh its token.
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
// Never retry a permanent failure - it will not resolve on its own.
if (dat_error_retry(err) == DAT_RETRY_TRANSIENT) {
    // back off, then retry
}
```

C has no exception chaining, so when issuing fails the reason is a **separate query**. Waiting helps
for `DAT_CERT_NOT_YET_ISSUABLE` and nothing else.

```c
char* out = NULL;
err = dat_cms_manager_issue(manager, plain, secure, &out);
if (err == DAT_MANAGER_NO_ISSUABLE_CERTIFICATE) {
    // issuable_cause() takes the inner dat_manager_t*, not the CMS wrapper.
    dat_error_t cause = dat_manager_issuable_cause(dat_cms_manager_get_manager(manager));
    fprintf(stderr, "cannot issue: %s\n", dat_error_code(cause));
}
```

Retry classes are `DAT_RETRY_TRANSIENT`, `DAT_RETRY_PERMANENT`, `DAT_RETRY_STATE`. Full code table:
[errors.md](https://dat.saro.me/llms/errors.md).

## Notes

- One manager per process. The CMS manager owns a sync thread; free it before exit.
- The managers are internally synchronized; issue and parse are safe from multiple threads.
- Test code worth reading: `dat-vcpkg/tests/example_cms_manager_test.c`,
  `manager_example_test.c`, `hard_test.c`, `error_code_test.c`.
