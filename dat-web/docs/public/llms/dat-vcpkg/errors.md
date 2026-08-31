# dat-vcpkg Error Contract

This document targets DAT 4.7.x and later; any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. It describes the stable public error strings. DAT wire and CMS v1 error contracts are unchanged. This catalog has **57 public `DAT_*` codes**: 47 client/common codes (all reachable through this C library's `dat_error_t`) and 10 CMS-server-only codes (server-side JSON `code` values this library never returns directly — a non-2xx CMS response is instead mapped to one of the `DAT_CMS_*` client codes below).

```text
DAT_<AREA>_<REASON>
```

`_UNKNOWN` is the fallback for an unexpected error inside that area; it does not mean an unknown algorithm — that is `_ALG_UNSUPPORTED`.

## Accessors

```c
dat_error_t err = dat_manager_issue(manager, plain, secure, &out);
if (err != DAT_SUCCESS) {
    const char* code       = dat_error_code(err);            /* canonical string, e.g. "DAT_CERT_EXPIRED" */
    dat_retry_t retry      = dat_error_retry(err);            /* DAT_RETRY_PERMANENT / _TRANSIENT / _STATE */
    bool        is_sec_evt = dat_error_is_security_event(err); /* true only for DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH */
}
```

**Compare `dat_error_code(e)`, the canonical string, not the raw `dat_error_t` numeric value.** The numeric enum is retained for ABI stability across builds but is not the cross-language public identity — the same code has a different underlying integer in another language's SDK.

`dat_error_t` has no exception chain. When a wrapping error needs its underlying cause (equivalent to `cause`/`__cause__`/`InnerException`/`Unwrap` in other languages), query it explicitly:

- `dat_manager_issuable_cause(manager)` returns the specific `DAT_CERT_*` reason behind `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, or `DAT_MANAGER_NO_CERTIFICATE`, or `DAT_SUCCESS` when issuance is currently possible.
- `dat_cms_manager_last_error(cms)` returns the last non-state CMS error recorded by background/manual sync, including a chained cause where the underlying failure was `DAT_CMS_IMPORT_FAILED`'s certificate/import error — the C library returns `DAT_CMS_IMPORT_FAILED` itself but has no separate accessor for the wrapped cause; do not invent one.

## Retry and state

| Retry class | `dat_retry_t` | Meaning | Required handling |
| --- | --- | --- | --- |
| `transient` | `DAT_RETRY_TRANSIENT` | The condition may clear without a configuration change | Back off and retry |
| `permanent` | `DAT_RETRY_PERMANENT` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `state` | `DAT_RETRY_STATE` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use the `state` class.

## Security-event flag

`dat_error_is_security_event(e)` returns `true` for exactly two codes:

- `DAT_SIG_MISMATCH`
- `DAT_CRYPTO_TAG_MISMATCH`

It returns `false` for every other code. Malformed input, an unknown `cid`, invalid key material, and authorization failures may be operationally suspicious in volume, but are not flagged by this API.

## TOKEN — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | permanent | Token is not exactly five fields; `expire` is not strict ASCII decimal `uint64`; `cid` is not strict ASCII hexadecimal `uint64`; a Base64Url field is invalid; or another token structural rule fails |
| `DAT_TOKEN_EXPIRED` | permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | permanent | Unexpected token-area fallback |

## CERT — 9 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CERT_MALFORMED` | permanent | Certificate is not exactly eight fields; numeric or key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows `uint64` |
| `DAT_CERT_EXPIRED` | permanent | `start + duration + ttl < now`; the certificate can neither issue nor verify. Equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | transient | `now < start`; the inclusive issuance window has not opened |
| `DAT_CERT_ISSUANCE_ENDED` | permanent | `now > start + duration` while certificate TTL remains; verification is possible but issuance is not |
| `DAT_CERT_VERIFY_ONLY` | permanent | ECDSA certificate has no signing private key; verification/decryption is possible but issuance is not |
| `DAT_CERT_NOT_FOUND` | permanent | Manager has no certificate for the token `cid` |
| `DAT_CERT_NOT_SYNCED` | transient | The certificate `cid` is expected from CMS but has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | permanent | One import input contains the same `cid` more than once; the import is rejected |
| `DAT_CERT_UNKNOWN` | permanent | Unexpected certificate-area fallback |

## SIG — 5 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_SIG_MISMATCH` | permanent | HMAC comparison or ECDSA verification reports mismatch; security event |
| `DAT_SIG_MALFORMED` | permanent | Signature field is empty, invalid Base64Url, or has an algorithm-invalid fixed signature layout/length |
| `DAT_SIG_KEY_MISSING` | permanent | Signing was requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | permanent | The signature/verification operation could not execute because of key-handle, key-type, or crypto-backend (OpenSSL) failure |
| `DAT_SIG_UNKNOWN` | permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | permanent | AES-GCM authentication tag verification failed; security event |
| `DAT_CRYPTO_DATA_INVALID` | permanent | Non-empty encrypted bytes are too short for the 12-byte IV or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | permanent | AES-GCM operation/context (OpenSSL) is unavailable or failed to initialize/execute |
| `DAT_CRYPTO_UNKNOWN` | permanent | Unexpected encryption-area fallback |

## KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | permanent | Key length or structure does not match its algorithm: HMAC 32/48/64 bytes, AES 16/32 bytes, ECDSA point/scalar/uncompressed format/pair invalid |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | permanent | Verify-only export was requested for HMAC (`dat_signature_export_verify_only_key`), which has no public-key form |
| `DAT_KEY_UNKNOWN` | permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | transient | Manager holds no certificates, commonly before import or after initial CMS sync failure |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from cause | Certificates exist, but none is currently usable for issuance — query `dat_manager_issuable_cause(manager)` for the specific reason |
| `DAT_MANAGER_DISPOSED` | permanent | An already-freed manager or certificate handle was used |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s retry class is transient only when `dat_manager_issuable_cause` returns `DAT_CERT_NOT_YET_ISSUABLE`; otherwise it is permanent.

## CONFIG — 4 codes

All configuration failures are permanent.

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument is null/missing, a time/timeout is out of range, or an operation-specific argument is invalid. `interval_seconds = 0` is valid and disables automatic CMS sync |
| `DAT_CONFIG_URI_INVALID` | CMS URL is unparseable, not HTTP/HTTPS, or contains a disallowed path/query |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

Both are permanent for the current operation; retrying unchanged input is not recovery.

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability is absent (e.g. an OpenSSL primitive) |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure such as allocation, RNG, lock, or an unreachable branch |

## CMS client — 13 codes

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | DNS, connect, TLS, redirect-policy, timeout, or response-read failure (libcurl error) |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Non-success status not covered above; includes `400`, `405`, `408`, `425`, and `429` |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Empty body, non-ASCII body, missing/non-decimal/out-of-range version, or another plain-response grammar failure. `204` empty is malformed |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | Response certificates could not be applied; the entire state change is rejected. No separate cause accessor in C |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Certificate-bearing response has a lower server version; merge then commit the lower cursor on success |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | Manager's pre-attempt state before a successful or concrete failed synchronization is recorded |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | Another sync owns the single-flight lock; this call is skipped without replacing last error |
| `DAT_CMS_NOT_SUPPORTED` | permanent | build/runtime | The library was built without libcurl; every `dat_cms_manager_*` call returns this |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Unexpected CMS-client error |

Initial sync is best-effort: failure does not prevent `dat_cms_manager_create[_with_options]` from succeeding. A concrete initial failure may replace `DAT_CMS_NOT_SYNCED` before any success; a successful sync clears the last error.

## CMS server — 10 codes (reference only; not returned by this library)

These are the server-side JSON `code` values `dat-cms` returns in its error envelope. This C library never surfaces them directly through `dat_error_t` — a non-2xx CMS HTTP response is mapped to one of the 13 `DAT_CMS_*` client codes above instead. Listed for cross-reference when reading CMS server logs or the JSON error body (`{"code":"...","details":{...}}`).

| Code | Retry | HTTP | Exact situation |
| --- | --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | permanent | `401` | `Authorization` missing/unknown, unless the required role list is empty |
| `DAT_AUTH_FORBIDDEN` | permanent | `403` | Token is registered but not for the endpoint's role |
| `DAT_AUTH_DISABLED` | state | none | Per-role startup warning when a token-role list is empty |
| `DAT_REQ_MALFORMED` | permanent | `400` | Path/query decoding failed or an argument is invalid |
| `DAT_REQ_ALG_UNSUPPORTED` | permanent | `400` | Path names an unsupported signature or encryption algorithm |
| `DAT_REQ_NOT_FOUND` | permanent | `404`/`405` | Route does not exist or method is not allowed |
| `DAT_REQ_TOO_LARGE` | permanent | `413` | Reserved for future request-body size rejection |
| `DAT_REQ_UNKNOWN` | permanent | `400` | Reserved for future unclassified request errors |
| `DAT_STORE_UNAVAILABLE` | transient | `503` | Temporary database unavailability |
| `DAT_STORE_UNKNOWN` | permanent | `500` | Non-transient storage failure |

See [dat-cms/errors.md](../dat-cms/errors.md) for the full server-side error contract.
