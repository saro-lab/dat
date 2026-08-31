# dat-npm Error Reference

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here. It describes the stable public error strings in `saro-dat`; DAT wire and CMS v1 error contracts are unchanged across the 4.7.x line.

## Accessing errors in JavaScript/TypeScript

All library failures throw/reject with `DatError` (`instanceof Error`):

```typescript
try {
  await manager.parse(dat)
} catch (e) {
  if (e instanceof DatError) {
    console.log(e.code)          // stable "DAT_*" string, e.g. "DAT_SIG_MISMATCH"
    console.log(e.retry)          // "transient" | "permanent" | "state" (getter)
    console.log(e.securityEvent)  // boolean (getter)
    console.log(e.cause)          // underlying error, if any (standard Error.cause)
  }
}
```

`e.code`, `e.retry`, and `e.securityEvent` are **getters**, not methods — do not call them as functions. `DatError.wrap(code, detail, e)` re-wraps a non-`DatError` into one; `DatError.codeOf(e)` returns `e.code` if `e instanceof DatError`, else `undefined`.

There are **57 public `DAT_*` codes** in this catalog: 47 client/common codes and 10 CMS-server codes (server-side; not thrown by this client library, but present in CMS JSON error bodies this client does not parse — see "Server response to client observation" below). The string is the contract; message text and any wrapped native error are not.

```text
DAT_<AREA>_<REASON>
```

`_UNKNOWN` is the fallback for an unexpected error inside that area. It does not mean an unknown algorithm; that is `_ALG_UNSUPPORTED`.

## Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `transient` | The condition may clear without a configuration change | Back off and retry |
| `permanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `state` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use the `state` retry class in this client.

## Security-event flag

`e.securityEvent` returns `true` for exactly two codes:

- `DAT_SIG_MISMATCH`
- `DAT_CRYPTO_TAG_MISMATCH`

It returns `false` for every other code. Malformed input, an unknown `cid`, invalid key material, and authorization failures may be operationally suspicious in volume, but are not flagged by this getter.

## TOKEN — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | permanent | Token is not exactly five fields; `expire` is not strict decimal; `cid` is not strict hex; a Base64Url field is invalid; or another token structural rule fails |
| `DAT_TOKEN_EXPIRED` | permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | permanent | Unexpected token-area fallback |

## CERT — 9 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CERT_MALFORMED` | permanent | Certificate is not exactly eight fields; numeric or key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows |
| `DAT_CERT_EXPIRED` | permanent | `start + duration + ttl < now`; equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | transient | `now < start` |
| `DAT_CERT_ISSUANCE_ENDED` | permanent | `now > start + duration` while certificate TTL remains; verification still possible |
| `DAT_CERT_VERIFY_ONLY` | permanent | ECDSA certificate has no signing private key |
| `DAT_CERT_NOT_FOUND` | permanent | Manager has no certificate for the token `cid` |
| `DAT_CERT_NOT_SYNCED` | transient | The certificate `cid` is expected from CMS but has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | permanent | One import input contains the same `cid` more than once; the import is rejected |
| `DAT_CERT_UNKNOWN` | permanent | Unexpected certificate-area fallback |

## SIG — 5 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_SIG_MISMATCH` | permanent | HMAC comparison or ECDSA verification reports mismatch; security event |
| `DAT_SIG_MALFORMED` | permanent | Signature field is empty, invalid Base64Url, or has an algorithm-invalid length |
| `DAT_SIG_KEY_MISSING` | permanent | Signing was requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | permanent | The signature/verification operation could not execute |
| `DAT_SIG_UNKNOWN` | permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | permanent | AES-GCM authentication tag verification failed; security event |
| `DAT_CRYPTO_DATA_INVALID` | permanent | Non-empty encrypted bytes are too short for the 12-byte IV or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | permanent | AES-GCM operation/context is unavailable or failed |
| `DAT_CRYPTO_UNKNOWN` | permanent | Unexpected encryption-area fallback |

An empty `secure` field is valid and round-trips as empty bytes; it produces no error.

## KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | permanent | Key length or structure does not match its algorithm |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | permanent | Verify-only export was requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | transient | Manager holds no certificates |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from cause | Certificates exist, but none is currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | permanent | Not applicable to this GC'd client — reserved for cross-language parity |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

`e.cause` for `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` is one of:

| Cause | Meaning | Retry/action |
| --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Signing-capable certificate exists, but its window starts later | transient; wait |
| `DAT_CERT_ISSUANCE_ENDED` | Signing windows ended | permanent; distribute a successor |
| `DAT_CERT_EXPIRED` | Held certificates are expired | permanent; refresh certificates |
| `DAT_CERT_VERIFY_ONLY` | No held certificate contains signing authority | permanent; correct issuer deployment |

## CONFIG — 4 codes

All permanent.

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument is missing or out of range. Sync interval `0` is valid and disables automatic sync |
| `DAT_CONFIG_URI_INVALID` | CMS URI is unparseable, not `http`/`https`, or has a path/query |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability is absent |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure |

## CMS client — 13 codes

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | `fetch` failure, non-ASCII/unreadable body |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Any other non-success status |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Empty body, non-ASCII body, missing/non-decimal version, or unsafe-integer version |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | `DatManager.imports()` rejected the response; cause is chained via `e.cause` |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Certificate-bearing response has a lower server version than the client's current version |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | `lastError()` before the first sync attempt |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | Another `syncOrThrow()` call is already running; `lastError()` is left unchanged |
| `DAT_CMS_NOT_SUPPORTED` | permanent | n/a | Reserved for cross-language parity; not produced by this transport |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Any non-`DatError` thrown inside `syncOrThrow()` is wrapped here |

## CMS server — 10 codes (received in JSON error bodies, not parsed by this client)

`DatCmsManager` maps non-2xx responses **only by HTTP status** (table above); it does not parse the server's JSON `code`/`details`. These are the codes a CMS v1 server may emit in that body, for reference when reading server logs directly:

### AUTH — 3 codes

`DAT_AUTH_UNAUTHORIZED` (401), `DAT_AUTH_FORBIDDEN` (403), `DAT_AUTH_DISABLED` (startup warning, not an HTTP response).

### REQ — 5 codes

`DAT_REQ_MALFORMED` (400), `DAT_REQ_ALG_UNSUPPORTED` (400), `DAT_REQ_NOT_FOUND` (404/405), `DAT_REQ_TOO_LARGE` (413, reserved), `DAT_REQ_UNKNOWN` (400, reserved).

### STORE — 2 codes

`DAT_STORE_UNAVAILABLE` (503, transient), `DAT_STORE_UNKNOWN` (500, permanent).

See [https://dat.saro.me/llms/dat-cms/errors.md](https://dat.saro.me/llms/dat-cms/errors.md) for the exact meaning of each server code.
