# dat-maven Error Contract

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible.

Errors surface as `me.saro.dat.exception.DatException` (a `RuntimeException`). Its message is `"<code>"` or `"<code>: <detail>"` when a detail string was supplied.

```kotlin
try {
    manager.issue(plain, secure).getOrThrow()
} catch (e: DatException) {
    when {
        e.securityEvent -> alertSecurityTeam(e.code)
        e.retry == DatRetry.TRANSIENT -> scheduleRetry()
        else -> logAndFail(e.code)
    }
}
```

| Accessor | Type | Meaning |
| --- | --- | --- |
| `e.code` | `String` | Stable `DAT_*` code (see catalog below). This is the contract — match on this, never on `e.message` |
| `e.errorCode` | `DatErrorCode` (enum) | The typed enum backing `code`; useful for exhaustive `when` matching within this JVM client |
| `e.retry` | `DatRetry` — `TRANSIENT` / `PERMANENT` / `STATE` | Whether the same operation may succeed later without a configuration change |
| `e.securityEvent` | `Boolean` | `true` only for `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH` |
| `DatException.codeOf(throwable)` | static `String?` | Walks `cause` chain and returns the first `DatException.code` found, or `null` |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s `retry` is derived: `TRANSIENT` only when its `cause` is a `DatException` with `errorCode == CERT_NOT_YET_ISSUABLE`; otherwise `PERMANENT`. Inspect `e.cause` (a `DatException`) for the underlying reason.

## Full `DAT_*` catalog (57 codes)

There are **57 public `DAT_*` codes**: 47 client/common codes and 10 CMS-server codes (server codes are not thrown by this JVM client directly, but appear in CMS JSON error bodies this client does not parse — see `DAT_CMS_*` mapping below). The string is the contract; exception messages and enum ordinal values are not.

```text
DAT_<AREA>_<REASON>
```

`_UNKNOWN` is the fallback for an unexpected error inside that area — it does not mean an unknown algorithm; that is `_ALG_UNSUPPORTED`.

### Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `TRANSIENT` | The condition may clear without a configuration change | Back off and retry |
| `PERMANENT` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `STATE` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use `STATE`.

### TOKEN — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | permanent | Token is not exactly five fields; `expire` is not strict ASCII decimal `uint64`; `cid` is not strict ASCII hexadecimal `uint64`; a Base64Url field is invalid; or another token structural rule fails |
| `DAT_TOKEN_EXPIRED` | permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | permanent | Unexpected token-area fallback |

### CERT — 9 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CERT_MALFORMED` | permanent | Certificate is not exactly eight fields; numeric or key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows `uint64` |
| `DAT_CERT_EXPIRED` | permanent | `start + duration + ttl < now`; can neither issue nor verify. Equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | transient | `now < start`; issuance window has not opened |
| `DAT_CERT_ISSUANCE_ENDED` | permanent | `now > start + duration` while TTL remains; verification possible, issuance is not |
| `DAT_CERT_VERIFY_ONLY` | permanent | ECDSA certificate has no signing private key |
| `DAT_CERT_NOT_FOUND` | permanent | Manager has no certificate for the token `cid` |
| `DAT_CERT_NOT_SYNCED` | transient | The certificate `cid` is expected from CMS but has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | permanent | One import input contains the same `cid` more than once; import rejected |
| `DAT_CERT_UNKNOWN` | permanent | Unexpected certificate-area fallback |

### SIG — 5 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_SIG_MISMATCH` | permanent | HMAC comparison or ECDSA verification reports mismatch; **security event** |
| `DAT_SIG_MALFORMED` | permanent | Signature field is empty, invalid Base64Url, or has an algorithm-invalid fixed layout/length |
| `DAT_SIG_KEY_MISSING` | permanent | Signing was requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | permanent | Signature/verification operation failed at the crypto-backend level |
| `DAT_SIG_UNKNOWN` | permanent | Unexpected signature-area fallback |

### CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | permanent | AES-GCM authentication tag verification failed; **security event** |
| `DAT_CRYPTO_DATA_INVALID` | permanent | Non-empty encrypted bytes too short for the 12-byte IV, or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | permanent | AES-GCM operation/context unavailable or failed to initialize/execute |
| `DAT_CRYPTO_UNKNOWN` | permanent | Unexpected encryption-area fallback |

### KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | permanent | Key length/structure mismatch for its algorithm |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | permanent | Verify-only export was requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | permanent | Unexpected key-area fallback |

### MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | transient | Manager holds no certificates |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from `cause` | Certificates exist, none currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | permanent | An already disposed/closed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

### CONFIG — 4 codes

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument is null/missing, a time/timeout is out of range, or an operation-specific argument is invalid. Sync interval `0` is valid and disables automatic sync |
| `DAT_CONFIG_URI_INVALID` | CMS URI unparseable, not `http`/`https`, or has a disallowed path/query |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

All CONFIG codes are permanent.

### INTERNAL — 2 codes

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability absent |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure |

Both permanent for the current operation.

### CMS client — 13 codes

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | DNS, connect, TLS, timeout, or response-read failure |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Non-success status not covered above |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Empty body, non-ASCII body, or invalid version line |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | Response certificates could not be applied; wraps the underlying `DatException` cause |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Certificate-bearing response has a lower server version than the client's; logged as a warning, merge still applied |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | `lastError()`'s value before any sync attempt has completed |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | `syncOrThrow()` could not acquire the single-flight write lock |
| `DAT_CMS_NOT_SUPPORTED` | permanent | build/runtime | Not thrown by this JVM client (no optional CMS feature flag) |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Wraps any non-`DatException` failure from `sync()`/`syncOrThrow()` |

### CMS server — 10 codes (seen in CMS JSON error bodies, not thrown directly by this client)

This client maps non-2xx CMS responses by HTTP status only (table above); it does not parse the server's JSON `code`/`details` fields. The server-side codes below exist for completeness when reading CMS logs or a raw HTTP response body:

`DAT_AUTH_UNAUTHORIZED`, `DAT_AUTH_FORBIDDEN`, `DAT_AUTH_DISABLED`, `DAT_REQ_MALFORMED`, `DAT_REQ_ALG_UNSUPPORTED`, `DAT_REQ_NOT_FOUND`, `DAT_REQ_TOO_LARGE`, `DAT_REQ_UNKNOWN`, `DAT_STORE_UNAVAILABLE`, `DAT_STORE_UNKNOWN`. See [dat-cms/errors.md](../dat-cms/errors.md) for their exact meanings.
