# dat-vcpkg Integration Checklist

Applies to DAT 4.7.x and later; any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. DAT wire protocol and CMS v1 remain compatible with every other client.

## Role and certificate deployment

- [ ] Classify each service as an **issuer** (calls `dat_manager_issue`/`dat_cms_manager_issue`) or **verifier** (only `dat_manager_parse`/`dat_cms_manager_parse`).
- [ ] Issuers create a CMS manager with `verify_only = false` against `/v1/certs` (needs a `TOKEN_CERT_FULL` credential server-side).
- [ ] Verifiers create a CMS manager with `verify_only = true` against `/v1/certs/verify-only` (needs `TOKEN_CERT_VERIFY`) only when ECDSA is used.
- [ ] Never deploy a verify-only certificate set to an issuer process: issuance fails with `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, cause `DAT_CERT_VERIFY_ONLY` (query via `dat_manager_issuable_cause`).
- [ ] Do not call `dat_signature_export_verify_only_key` / `dat_certificate_export(cert, true, ...)` on HMAC key material: it fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure`.
- [ ] Put only non-sensitive routing/schema information in `plain` (`dat_manager_issue`'s `plain` argument); it is Base64Url, not encryption.
- [ ] Put user IDs, authority snapshots, and other confidential data in `secure`.
- [ ] Treat `dat_payload_t.plain_bytes`/`secure_bytes` as raw length-delimited bytes (`plain_len`/`secure_len`), never as NUL-terminated C strings.
- [ ] Never use `dat_manager_parse_without_verify`/`dat_manager_parse_without_verify_with_cert` output for authentication or authorization — its fields are unverified and attacker-controlled.
- [ ] Treat `DAT_TOKEN_EXPIRED` as normal refresh, and `DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH` as security events (`dat_error_is_security_event(e) == true`).

## Memory ownership

- [ ] Free every `char*` output (`dat_manager_issue`, `dat_manager_export`, `dat_certificate_export`, key exports) with `free()`.
- [ ] Free every `dat_payload_t*` with `dat_payload_free()`, never `free()`.
- [ ] Free every `dat_manager_t*`, `dat_certificate_t*`, `dat_signature_t*`, `dat_crypto_t*`, `dat_cms_manager_t*` with its matching `_free` function.
- [ ] Never call a free function on an output pointer left unset by a failed (`err != DAT_SUCCESS`) call.

## CMS manager startup and lifecycle

- [ ] Accept that `dat_cms_manager_create[_with_options]` performs a best-effort initial sync and returns `DAT_SUCCESS` (a live, usable manager) even when that sync fails. Read `dat_cms_manager_last_error(cms)` and decide an explicit application startup policy.
- [ ] There is no throwing/immediate-vs-background split in C: `dat_cms_manager_sync(cms)` is both the manual sync call and returns the immediate `dat_error_t` result. Call it directly when a caller must observe failure immediately.
- [ ] Set `dat_cms_manager_options_t.connect_timeout_seconds` (default 5) and `.total_timeout_seconds` (default 15) via `dat_cms_manager_create_with_options`; `0` disables the respective limit.
- [ ] The C/libcurl transport never follows redirects — a CMS server behind a redirecting proxy will surface as `DAT_CMS_UNREACHABLE` or an unexpected HTTP status, not a followed hop.
- [ ] Call `dat_cms_manager_free(cms)` on shutdown; it interrupts the transport and joins the background sync thread before returning.
- [ ] If the library is built without libcurl available, every `dat_cms_manager_*` call returns `DAT_CMS_NOT_SUPPORTED` — detect this at startup rather than treating it as a transient network failure.

## Errors and retry

- [ ] Compare `dat_error_code(e)` (the canonical string), never the raw `dat_error_t` integer, across processes/log analysis — the numeric value is not the cross-language identity.
- [ ] Use `dat_error_retry(e)` (`DAT_RETRY_TRANSIENT`/`_PERMANENT`/`_STATE`) to decide retry policy; retry/back off only transient CMS failures (`DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`).
- [ ] Treat `DAT_CMS_SYNC_IN_PROGRESS` and `DAT_CMS_VERSION_RESET` (`DAT_RETRY_STATE`) as observations, not failures.
- [ ] Alert on sustained transient failures: existing certificates keep working initially but eventually expire.
- [ ] Use `dat_manager_issuable_cause(manager)` to get the specific reason behind `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`; there is no separate accessor for the cause wrapped inside `DAT_CMS_IMPORT_FAILED` in C.

## CMS configuration and rotation

- [ ] Configure the CMS server's `TOKEN_MASTER`/`TOKEN_CERT_FULL`/`TOKEN_CERT_VERIFY` roles and pass the matching token string as `dat_cms_manager_create`'s `token` argument.
- [ ] Never leave a production role list empty server-side. Client-side, treat `DAT_CMS_UNAUTHORIZED`/`DAT_CMS_FORBIDDEN` as permanent configuration errors, not retryable.
- [ ] Rotate with a **new `cid`** passed to `dat_certificate_create`. `dat_manager_import`/`dat_manager_import_certificates` with `clear=false` keeps the existing certificate if the server repeats a `cid` with different key material — it does not replace it.
- [ ] Reject a duplicate `cid` inside one import call: `dat_manager_import_certificates` returns `DAT_CERT_DUPLICATE_CID` and applies none of that batch.

## Build and release validation

- [ ] Confirm OpenSSL, pthreads (or PThreads4W on Windows), and — if CMS support is required — libcurl are resolvable by CMake (`find_package`) before building; a missing libcurl silently degrades to `DAT_CMS_NOT_SUPPORTED` rather than a build failure.
- [ ] Preserve protocol compatibility: do not introduce a new DAT field, endpoint contract, or error-code meaning.
- [ ] The current build has no Windows DLL export annotations (`DAT_EXPORT` was never applied) — `BUILD_SHARED_LIBS=ON` on Windows exports no symbols; consume this library as a static library until that is addressed.

See [api.md](./api.md) for exact function signatures and [errors.md](./errors.md) for the full error catalog.
