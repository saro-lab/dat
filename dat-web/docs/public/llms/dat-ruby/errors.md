# DAT Ruby — Error Contract

`saro-dat` raises `Saro::Dat::Error < StandardError` for every DAT-specific failure. The stable `DAT_*` code string is the contract; `Error#message`/log text is not.

```ruby
begin
  manager.parse(dat)
rescue Saro::Dat::Error => e
  e.code            # => "DAT_SIG_MISMATCH" (String, one of the DAT_* codes below)
  e.retry           # => :transient | :permanent | :state
  e.security_event? # => true only for DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH
  e.detail          # => human-readable detail string or nil
  e.cause           # => wrapped Saro::Dat::Error or original exception, or nil
end
```

`Saro::Dat::Error.wrap(code, detail, e)` returns `e` unchanged if it is already a `Saro::Dat::Error`, otherwise wraps it. `Saro::Dat::Error.code_of(e)` returns `e.code` if `e` is a `Saro::Dat::Error`, else `nil`.

`#retry` classification in this gem: `:transient` for `DAT_CERT_NOT_YET_ISSUABLE`, `DAT_CERT_NOT_SYNCED`, `DAT_MANAGER_NO_CERTIFICATE`, `DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`, `DAT_CMS_NOT_SYNCED`; `:state` for `DAT_CMS_VERSION_RESET`, `DAT_CMS_SYNC_IN_PROGRESS`; `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` is `:transient` only when its `.cause` is `DAT_CERT_NOT_YET_ISSUABLE`, otherwise `:permanent`; everything else is `:permanent`. `#security_event?` is `true` only for `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH`.

This gem does not raise the CMS-server-only codes (`DAT_AUTH_*`, `DAT_REQ_*`, `DAT_STORE_*`) — those originate from the `dat-cms` server; see `dat-cms/errors.md`. The client-relevant codes below are the ones this gem can actually raise.

## Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `transient` | The condition may clear without a configuration change | Back off and retry |
| `permanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `state` | Observation, not an operation failure | Record if useful; do not error-loop |

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
| `DAT_CRYPTO_BACKEND` | permanent | AES-GCM operation/context is unavailable or failed to initialize/execute (OpenSSL `Cipher` error) |
| `DAT_CRYPTO_UNKNOWN` | permanent | Unexpected encryption-area fallback |

An empty `secure` field is valid and round-trips as empty bytes; it produces no error.

## KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | permanent | Key length or structure does not match its algorithm: HMAC 32/48/64 bytes, AES 16/32 bytes, ECDSA point/scalar/uncompressed format/pair invalid |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | permanent | Verify-only export was requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | transient | Manager holds no certificates, commonly before import or after initial CMS sync failure |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from `.cause` | Certificates exist, but none is currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | permanent | An already disposed/freed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` carries one of four causes via `.cause`; `#retry` returns `:transient` only when the cause's code is `DAT_CERT_NOT_YET_ISSUABLE`, otherwise `:permanent`.

| Cause | Meaning | Retry/action |
| --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Signing-capable certificate exists, but its window starts later | transient; wait |
| `DAT_CERT_ISSUANCE_ENDED` | Signing windows ended | permanent; distribute a successor |
| `DAT_CERT_EXPIRED` | Held certificates are expired | permanent; refresh certificates |
| `DAT_CERT_VERIFY_ONLY` | No held certificate contains signing authority | permanent; correct issuer deployment |

## CONFIG — 4 codes

All configuration failures are permanent.

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument is null/missing, a time/timeout is out of range, a payload type is unsupported, or an operation-specific argument is invalid. Sync interval `0` is valid and disables automatic sync |
| `DAT_CONFIG_URI_INVALID` | CMS URI is unparseable, not HTTP/HTTPS, or contains a disallowed path/query — raised by `DatCmsManagerBuilder#build` |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

Both are permanent for the current operation; retrying unchanged code is not recovery.

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability is absent |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure such as allocation, RNG, lock, or an unreachable branch |

## CMS client — 13 codes

Raised by `DatCmsManager#sync_or_raise` (and surfaced as `last_error` by `#sync`).

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | DNS, connect, TLS, or `Net::HTTP` request failure |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Non-success status not covered above |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Empty body, non-ASCII body, or missing/non-decimal version line |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | `DatManager#imports` raised; wraps the original `Saro::Dat::Error` as `.cause` |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Certificate-bearing response has a lower server version; logged as a warning, then merged and committed |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | `last_error` value before the constructor's first sync attempt completes |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | Another `sync_or_raise` already holds the internal lock; this call raises immediately without blocking or touching `last_error` |
| `DAT_CMS_NOT_SUPPORTED` | permanent | build/runtime | Not raised by this gem (no optional CMS build variant) |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Any `StandardError` other than `Saro::Dat::Error` raised during sync (network library internals, etc.) |

## Client accessors

| Client | Code | Retry | Security event |
| --- | --- | --- | --- |
| Ruby (this gem) | `e.code` | `e.retry` | `e.security_event?` |
| Rust | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript/TypeScript | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `e.code` | `e.retry` | `e.security_event` |
| Java/Kotlin | `e.code` | `e.retry` | `e.securityEvent` |
| C#/.NET | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |

See https://dat.saro.me/llms.txt and the other platforms' `errors.md` for the CMS-server-only codes (`DAT_AUTH_*`, `DAT_REQ_*`, `DAT_STORE_*`) that `dat-cms` returns in its JSON error envelope.
