# saro-dat (C# / .NET) — Error Contract

This document describes the stable public error strings and targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. DAT wire and CMS v1 error contracts are unchanged.

## C# error surface

All errors are `Saro.Dat.DatException : Exception`.

| Member | Type | Notes |
| --- | --- | --- |
| `Code` | `string` | Stable `DAT_*` identity. Use this for programmatic branching, never `Message` text |
| `Detail` | `string?` | Optional human-readable detail, folded into `Message` as `"{Code}: {Detail}"` when present |
| `Retry` | `DatRetry` enum: `Permanent`, `Transient`, `State` | See retry classes below |
| `SecurityEvent` | `bool` | `true` only for `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH` |
| `InnerException` | `Exception?` | Chains the causing exception, e.g. `DAT_CMS_IMPORT_FAILED`'s inner exception is the original `DAT_CERT_*`/`DAT_KEY_*` failure; `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s inner exception carries its cause code |
| static `DatException.CodeOf(Exception? e)` | `string?` | Returns `Code` if `e is DatException`, else `null` |

There are **57 public `DAT_*` codes** in this catalog: 47 client/common codes and 10 CMS-server codes. The string is the contract; `Message` text and any numeric representation are not.

```text
DAT_<AREA>_<REASON>
```

`_UNKNOWN` is the fallback for an unexpected error inside that area. It does not mean an unknown algorithm; that is `_ALG_UNSUPPORTED`.

## Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `Permanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `Transient` | The condition may clear without a configuration change | Back off and retry |
| `State` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use `DatRetry.State`. `DAT_AUTH_DISABLED` is a server startup state/warning, not an HTTP error response, and has no `DatException` representation on the client.

## Security-event flag

`DatException.SecurityEvent` returns `true` for exactly two codes:

- `DAT_SIG_MISMATCH`
- `DAT_CRYPTO_TAG_MISMATCH`

It returns `false` for every other code. Malformed input, an unknown `cid`, invalid key material, and authorization failures may be operationally suspicious in volume, but they are not flagged by `SecurityEvent`.

## TOKEN — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | Permanent | Token is not exactly five fields; `expire` is not strict ASCII decimal `uint64`; `cid` is not strict ASCII hexadecimal `uint64`; a Base64Url field is invalid; or another token structural rule fails |
| `DAT_TOKEN_EXPIRED` | Permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | Permanent | Unexpected token-area fallback |

## CERT — 9 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CERT_MALFORMED` | Permanent | Certificate is not exactly eight fields; numeric or key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows `uint64` |
| `DAT_CERT_EXPIRED` | Permanent | `start + duration + ttl < now`; the certificate can neither issue nor verify. Equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | Transient | `now < start`; the inclusive issuance window has not opened |
| `DAT_CERT_ISSUANCE_ENDED` | Permanent | `now > start + duration` while certificate TTL remains; verification is possible but issuance is not |
| `DAT_CERT_VERIFY_ONLY` | Permanent | ECDSA certificate has no signing private key; verification/decryption is possible but issuance is not |
| `DAT_CERT_NOT_FOUND` | Permanent | Manager has no certificate for the token `cid` |
| `DAT_CERT_NOT_SYNCED` | Transient | The certificate `cid` is expected from CMS but has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | Permanent | One import input contains the same `cid` more than once; the import is rejected |
| `DAT_CERT_UNKNOWN` | Permanent | Unexpected certificate-area fallback |

## SIG — 5 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_SIG_MISMATCH` | Permanent | HMAC comparison or ECDSA verification reports mismatch; security event |
| `DAT_SIG_MALFORMED` | Permanent | Signature field is empty, invalid Base64Url, or has an algorithm-invalid fixed signature layout/length |
| `DAT_SIG_KEY_MISSING` | Permanent | Signing was requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | Permanent | The signature/verification operation could not execute because of key-handle, key-type, or crypto-backend failure |
| `DAT_SIG_UNKNOWN` | Permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | Permanent | AES-GCM authentication tag verification failed; security event |
| `DAT_CRYPTO_DATA_INVALID` | Permanent | Non-empty encrypted bytes are too short for the 12-byte IV or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | Permanent | AES-GCM operation/context is unavailable or failed to initialize/execute |
| `DAT_CRYPTO_UNKNOWN` | Permanent | Unexpected encryption-area fallback |

## KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | Permanent | Key length or structure does not match its algorithm: HMAC 32/48/64 bytes, AES 16/32 bytes, ECDSA point/scalar/uncompressed format/pair invalid |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | Permanent | Verify-only export was requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | Permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | Transient | Manager holds no certificates, commonly before import or after initial CMS sync failure |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | Derived from `InnerException` | Certificates exist, but none is currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | Permanent | An already disposed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | Permanent | Unexpected manager-area fallback |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s `Retry` is `Transient` only when `InnerException is DatException { Code: DAT_CERT_NOT_YET_ISSUABLE }`; otherwise `Permanent`.

| Cause (`InnerException.Code`) | Meaning | Retry/action |
| --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Signing-capable certificate exists, but its window starts later | Transient; wait |
| `DAT_CERT_ISSUANCE_ENDED` | Signing windows ended | Permanent; distribute a successor |
| `DAT_CERT_EXPIRED` | Held certificates are expired | Permanent; refresh certificates |
| `DAT_CERT_VERIFY_ONLY` | No held certificate contains signing authority | Permanent; correct issuer deployment |

## CONFIG — 4 codes

All configuration failures are `Permanent`.

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument is null/missing, a time/timeout is out of range (e.g. negative `ConnectTimeoutSeconds`/`RequestTimeoutSeconds`), a payload type is unsupported, or an operation-specific argument is invalid. `IntervalSeconds(0)`/`IntervalOff()` is valid and disables automatic sync |
| `DAT_CONFIG_URI_INVALID` | CMS URI is unparseable, not `http`/`https`, or has a non-empty path/query |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

Both are `Permanent` for the current operation; retrying unchanged code is not recovery.

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability is absent |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure such as allocation, RNG, lock, or an unreachable branch |

## CMS client — 13 codes

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | Transient | transport | DNS, connect, TLS, redirect-policy, timeout, or response-read failure |
| `DAT_CMS_UNAUTHORIZED` | Permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | Permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | Transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | Permanent | other non-2xx | Non-success status not covered above; includes `400`, `405`, `408`, `425`, and `429` |
| `DAT_CMS_MALFORMED` | Permanent | 2xx body | Empty body, non-ASCII body, missing/non-decimal/out-of-range version, or another plain-response grammar failure. `204` empty is malformed |
| `DAT_CMS_IMPORT_FAILED` | Permanent | 2xx import | Response certificates could not be applied; the entire state change is rejected. `InnerException` carries the original `DAT_CERT_*`/`DAT_KEY_*` cause |
| `DAT_CMS_VERSION_RESET` | State | 2xx observation | Certificate-bearing response has a lower server version; merge then commit the lower cursor on success |
| `DAT_CMS_NOT_SYNCED` | Transient | initial state | `LastError`'s pre-attempt value before a successful or concrete failed synchronization is recorded |
| `DAT_CMS_SYNC_IN_PROGRESS` | State | local | `SyncOrThrow()` is already running elsewhere; this call fails immediately without replacing `LastError` |
| `DAT_CMS_NOT_SUPPORTED` | Permanent | build/runtime | CMS support is absent in this build |
| `DAT_CMS_UNKNOWN` | Permanent | fallback | Unexpected CMS-client error |

Initial sync is best-effort: failure does not prevent `BuildAsync()` from returning a manager. A concrete initial failure replaces the constructor's default `DAT_CMS_NOT_SYNCED`; success clears `LastError` to `null`.

## CMS server — 10 codes

The CMS server (`dat-cms`) returns these in a JSON envelope: `{"code":"DAT_REQ_ALG_UNSUPPORTED","details":{"kind":"signature","algorithm":"BOGUS"}}`. The current `DatCmsManager` does not parse this body; see the CMS-client mapping table below. Full server-side definitions are in [../dat-cms/errors.md](../dat-cms/errors.md).

## Server response to client observation

`SyncOrThrow()` does not parse a non-2xx JSON body. Mapping is based only on HTTP status:

| Server response example | HTTP | Client observation |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | `401` | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | `403` | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | `404` | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| any body with `400`, `405`, `408`, `413`, `425`, or `429` | corresponding status | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | `503` | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | `500` | `DAT_CMS_SERVER_ERROR` |

`DAT_CMS_VERSION_RESET` is never produced from an error envelope; it is a state observation from a valid 2xx certificate response carrying a lower version.
