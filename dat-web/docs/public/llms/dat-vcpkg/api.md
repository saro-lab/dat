# dat-vcpkg API Reference

This document targets DAT 4.7.x and later; any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. It describes the headers in `include/dat/`: `dat.h`, `dat_cms.h`, `dat_error.h`. This is a C API (usable from C++ via `extern "C"`) — see [overview.md](./overview.md).

## Ownership rules

- Every `dat_error_t`-returning function that produces a `char*`, `uint8_t*`, or `dat_payload_t*` output allocates it; the caller owns and must free it.
- Plain C strings (`char*`) returned by `dat_manager_issue`, `dat_manager_export`, `dat_certificate_export`, key-export functions, etc. are freed with the standard `free()`.
- `dat_payload_t*` (from `dat_manager_parse`/`dat_manager_parse_without_verify` and their `_with_cert` variants) is freed with `dat_payload_free(payload)`, never `free()` directly — it owns two internal byte buffers.
- `dat_payload_t.plain_bytes` / `secure_bytes` are **length-delimited, not NUL-terminated**. Always use `plain_len` / `secure_len`; do not treat them as C strings.
- Objects created with `_new`/`_create`/`_clone` (`dat_crypto_t`, `dat_signature_t`, `dat_certificate_t`, `dat_manager_t`, `dat_cms_manager_t`) are freed with their matching `_free` function.
- On failure (`err != DAT_SUCCESS`) no output pointer is allocated; do not call an output's free function.

## Algorithms

```c
typedef enum {
    DAT_SIG_HMAC_SHA256_MFS, DAT_SIG_HMAC_SHA384_MFS, DAT_SIG_HMAC_SHA512_MFS,
    DAT_SIG_ECDSA_P256, DAT_SIG_ECDSA_P384, DAT_SIG_ECDSA_P521
} dat_signature_alg_t;

typedef enum { DAT_CRYPTO_IV_AES128_GCM, DAT_CRYPTO_IV_AES256_GCM } dat_crypto_alg_t;

extern const dat_signature_alg_t DAT_SIGNATURE_ALG_LIST[6];
extern const size_t DAT_SIGNATURE_ALG_COUNT;
extern const dat_crypto_alg_t DAT_CRYPTO_ALG_LIST[2];
extern const size_t DAT_CRYPTO_ALG_COUNT;

const char* dat_signature_alg_to_str(dat_signature_alg_t alg);
dat_error_t  dat_signature_alg_from_str(const char* s, dat_signature_alg_t* out);
const char* dat_crypto_alg_to_str(dat_crypto_alg_t alg);
dat_error_t  dat_crypto_alg_from_str(const char* s, dat_crypto_alg_t* out);
```

`*_to_str`/`*_from_str` round-trip the exact DAT wire algorithm names (`HMAC-SHA256-MFS`, `ECDSA-P256`, `IV-AES128-GCM`, ...).

## Payload

```c
typedef struct dat_payload {
    uint8_t* plain_bytes;  size_t plain_len;
    uint8_t* secure_bytes; size_t secure_len;
} dat_payload_t;

void dat_payload_free(dat_payload_t* payload);
```

## Crypto and signature primitives

```c
dat_error_t dat_crypto_new(dat_crypto_alg_t alg, dat_crypto_t** out);
dat_error_t dat_crypto_from_key(dat_crypto_alg_t alg, const uint8_t* key, size_t key_len, dat_crypto_t** out);
void        dat_crypto_free(dat_crypto_t* crypto);
dat_crypto_alg_t dat_crypto_algorithm(const dat_crypto_t* crypto);
size_t      dat_crypto_key_base64_len(const dat_crypto_t* crypto);
dat_error_t dat_crypto_export_key(const dat_crypto_t* crypto, uint8_t** key, size_t* key_len);
dat_error_t dat_crypto_encrypt(const dat_crypto_t* crypto, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);
dat_error_t dat_crypto_decrypt(const dat_crypto_t* crypto, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);

dat_error_t dat_signature_new(dat_signature_alg_t alg, dat_signature_t** out);
dat_error_t dat_signature_from_key(dat_signature_alg_t alg, const uint8_t* key, size_t key_len, dat_signature_t** out);
void        dat_signature_free(dat_signature_t* sig);
dat_signature_alg_t dat_signature_algorithm(const dat_signature_t* sig);
size_t      dat_signature_key_base64_len(const dat_signature_t* sig);
dat_error_t dat_signature_export_key(const dat_signature_t* sig, uint8_t** key, size_t* key_len);
dat_error_t dat_signature_export_verify_only_key(const dat_signature_t* sig, uint8_t** key, size_t* key_len);
dat_error_t dat_signature_sign(const dat_signature_t* sig, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);
dat_error_t dat_signature_verify(const dat_signature_t* sig, const uint8_t* data, size_t data_len, const uint8_t* sign, size_t sign_len);
bool        dat_signature_signable(const dat_signature_t* sig);
bool        dat_signature_support_verify_only(const dat_signature_t* sig);
dat_error_t dat_signature_clone(const dat_signature_t* sig, dat_signature_t** out);
```

`dat_signature_export_verify_only_key` on an HMAC signature fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` (HMAC has no public-key form).

## Certificate

```c
dat_error_t dat_certificate_create(uint64_t cid,
                                    uint64_t dat_issuance_start_seconds,
                                    uint64_t dat_issuance_duration_seconds,
                                    uint64_t dat_ttl_seconds,
                                    dat_signature_alg_t sig_alg,
                                    dat_crypto_alg_t crypto_alg,
                                    dat_certificate_t** out);
dat_error_t dat_certificate_parse(const char* str, dat_certificate_t** out);
dat_error_t dat_certificate_export(const dat_certificate_t* cert, bool verify_only, char** out);
void        dat_certificate_free(dat_certificate_t* cert);
dat_error_t dat_certificate_clone(const dat_certificate_t* cert, dat_certificate_t** out);
bool        dat_certificate_expired(const dat_certificate_t* cert);
bool        dat_certificate_issuable(const dat_certificate_t* cert);
bool        dat_certificate_signable(const dat_certificate_t* cert);
bool        dat_certificate_support_verify_only(const dat_certificate_t* cert);
dat_signature_alg_t dat_certificate_signature_algorithm(const dat_certificate_t* cert);
dat_crypto_alg_t    dat_certificate_crypto_algorithm(const dat_certificate_t* cert);
uint64_t    dat_certificate_cid(const dat_certificate_t* cert);
```

`dat_certificate_export(cert, true, &out)` requires the certificate to support verify-only (ECDSA only; fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` for HMAC).

## Manager (issue/parse)

```c
dat_manager_t* dat_manager_new(void);
void           dat_manager_free(dat_manager_t* manager);

dat_error_t dat_manager_issue(dat_manager_t* manager, const char* plain, const char* secure, char** out);
dat_error_t dat_manager_parse(dat_manager_t* manager, const char* dat_str, dat_payload_t** out);
dat_error_t dat_manager_parse_without_verify(dat_manager_t* manager, const char* dat_str, dat_payload_t** out);

dat_error_t dat_manager_import(dat_manager_t* manager, const char* format, bool clear, size_t* count_out);
dat_error_t dat_manager_import_certificates(dat_manager_t* manager, dat_certificate_t** certs, size_t count, bool clear, size_t* count_out);
dat_error_t dat_manager_export(dat_manager_t* manager, bool verify_only, char** out);
dat_error_t dat_manager_export_certificates(dat_manager_t* manager, dat_certificate_t*** certs, size_t* count);
dat_error_t dat_manager_export_cids(dat_manager_t* manager, uint64_t** cids, size_t* count);
dat_error_t dat_manager_issuable_cause(dat_manager_t* manager);

/* Stateless single-certificate variants — no manager, no certificate lookup */
dat_error_t dat_manager_issue_with_cert(const dat_certificate_t* cert, const char* plain, const char* secure, char** out);
dat_error_t dat_manager_parse_with_cert(const dat_certificate_t* cert, const char* dat_str, dat_payload_t** out);
dat_error_t dat_manager_parse_without_verify_with_cert(const dat_certificate_t* cert, const char* dat_str, dat_payload_t** out);
```

- `import(..., clear=false, ...)` merges: an existing `cid` is kept, new ones are added, expired ones are dropped, and a duplicate `cid` within the same input rejects the whole call with `DAT_CERT_DUPLICATE_CID`.
- `dat_manager_parse_without_verify*` returns fields without signature verification — **never** use its output for authentication or authorization (see [integration.md](./integration.md)).
- `dat_manager_issuable_cause` returns `DAT_SUCCESS` when an issuable certificate exists, `DAT_MANAGER_NO_CERTIFICATE` when the manager holds none, or the specific `DAT_CERT_*` cause (`DAT_CERT_NOT_YET_ISSUABLE`, `DAT_CERT_ISSUANCE_ENDED`, `DAT_CERT_EXPIRED`, `DAT_CERT_VERIFY_ONLY`) otherwise. This is the C substitute for the exception-chained cause other languages expose via `cause`/`__cause__`/`InnerException`.

## CMS manager (optional, requires libcurl at build time)

```c
typedef enum { DAT_LOG_DEBUG = 0, DAT_LOG_INFO = 1, DAT_LOG_WARN = 2, DAT_LOG_ERROR = 3 } dat_log_level_t;
typedef void (*dat_log_fn_t)(dat_log_level_t level, const char* message, void* userdata);

typedef struct {
    uint64_t connect_timeout_seconds;  /* default 5, matches every other client */
    uint64_t total_timeout_seconds;    /* default 15, matches every other client */
} dat_cms_manager_options_t;

dat_cms_manager_options_t dat_cms_manager_default_options(void);

dat_error_t dat_cms_manager_create(
    const char* url, const char* token, bool verify_only,
    uint64_t interval_seconds, dat_log_fn_t log_fn, void* log_userdata,
    dat_cms_manager_t** out);

dat_error_t dat_cms_manager_create_with_options(
    const char* url, const char* token, bool verify_only,
    uint64_t interval_seconds, dat_log_fn_t log_fn, void* log_userdata,
    const dat_cms_manager_options_t* options,
    dat_cms_manager_t** out);

void        dat_cms_manager_free(dat_cms_manager_t* cms);
dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms);
dat_error_t dat_cms_manager_last_error(dat_cms_manager_t* cms);
dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms, const char* plain, const char* secure, char** out);
dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
uint64_t     dat_cms_manager_get_version(dat_cms_manager_t* cms);
dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms);
```

- `dat_cms_manager_create[_with_options]` performs a best-effort initial `sync()` internally and still returns a usable manager (`DAT_SUCCESS`) even when that sync fails; check `dat_cms_manager_last_error` for the concrete cause. There is no throwing variant in C — `dat_cms_manager_sync` is the only immediate/manual sync call, and its returned `dat_error_t` **is** the immediate result.
- `interval_seconds = 0` disables the background periodic sync thread; a positive value starts one.
- The C transport (libcurl) never follows redirects. `connect_timeout_seconds` / `total_timeout_seconds` of `0` disable that limit; defaults are 5s/15s via `dat_cms_manager_default_options()`.
- If the library was built without libcurl (`find_package(CURL)` not found), every `dat_cms_manager_*` call returns `DAT_CMS_NOT_SUPPORTED`.
- `dat_cms_manager_free()` interrupts the transport and joins the background worker before returning; call it during shutdown instead of leaking the manager.
- `dat_cms_manager_get_manager()` returns the internal `dat_manager_t*` for read access (e.g. `dat_manager_export_cids`); it is owned by the CMS manager — do not free it separately.

See [errors.md](./errors.md) for the full error catalog and accessor functions, and [integration.md](./integration.md) for a deployment checklist.
