# Error Codes

Every official client raises the same error codes. The **string code is the contract**; messages
change freely, codes do not.

```
DAT_<area>_<reason>
```

The same reason keeps the same name across areas: `DAT_TOKEN_MALFORMED` and `DAT_CERT_MALFORMED`
differ only in subject. `_UNKNOWN` is reserved for each area's fallback and never means "unknown
algorithm" - that is `_UNSUPPORTED`.

## How each client exposes it

| Language | Error type | Code | Retry | Security event |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `dat.Code(err)` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java / Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |

Java/Kotlin and C return failures as values (`DatResult`, `dat_error_t`); the rest throw. Details
in the platform documents.

`securityEvent` is `true` for exactly two codes - `DAT_SIG_MISMATCH` and
`DAT_CRYPTO_TAG_MISMATCH` - the two where forgery or tampering is certain.

## Retry: the only classification you branch on

| Retry | Meaning | What to do |
| --- | --- | --- |
| `transient` | Will clear on its own | Back off, retry |
| `permanent` | Will not clear | Fix config, input, or deployment. **Never loop** |
| `state` | Not a failure, just a signal | Ignore |

Retrying a permanent failure is the most common mistake in DAT integrations: a wrong CMS token
answers 401 forever, and a retry loop turns one misconfiguration into sustained load.

## The three-way split every `parse()` needs

This is the branch that matters most. Expiry, forgery, and malformed input demand opposite
responses, and collapsing them is a real bug.

```
parse(token) fails:
  code == DAT_TOKEN_EXPIRED   -> normal end of life. Refresh flow. Not a security event.
  securityEvent == true       -> forged or tampered. Drop the session, log to security.
  anything else               -> bad request. Reject with 400/401. Do not alert.
```

Parsing settles structure before values, so `"1.2.3"` is `DAT_TOKEN_MALFORMED` - not an expired
token, because it was never a token. A signed `expire` like `+100` is likewise a format error.

## Token

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | none | permanent | Not 5 dot-separated parts, or `expire`/`cid` not plain decimal/hex, or a region is not base64url, or a number overflowed |
| `DAT_TOKEN_EXPIRED` | none | permanent | `expire <= now`. The exact second counts as expired |
| `DAT_TOKEN_UNKNOWN` | partial | permanent | Fallback |

## Certificate

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_CERT_MALFORMED` | critical | permanent | Not 8 parts, unparseable numbers, bad key encoding, or `start+duration+ttl` overflowed |
| `DAT_CERT_EXPIRED` | critical | permanent | Fully dead - neither issue nor verify |
| `DAT_CERT_NOT_YET_ISSUABLE` | critical | **transient** | `now < start`; the window has not opened. Waiting fixes it |
| `DAT_CERT_ISSUANCE_ENDED` | critical | permanent | Window closed, ttl remains. Verify only |
| `DAT_CERT_VERIFY_ONLY` | critical | permanent | Public key only - can verify, cannot issue |
| `DAT_CERT_NOT_FOUND` | none | permanent | No certificate for that cid. Forged token, or drifted deployment |
| `DAT_CERT_NOT_SYNCED` | partial | transient | That cid has not arrived from the CMS yet |
| `DAT_CERT_DUPLICATE_CID` | critical | permanent | The same cid appears twice in one import |
| `DAT_CERT_UNKNOWN` | partial | permanent | Fallback |

`NOT_FOUND` vs `NOT_SYNCED` look identical from outside and are not: the first is a cid nobody ever
issued, so waiting achieves nothing; the second clears when sync catches up.

## Signature

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_SIG_MISMATCH` | none | permanent | Verification returned false. **Security event** |
| `DAT_SIG_MALFORMED` | none | permanent | Empty, not base64url, wrong `r||s` length, DER conversion failed |
| `DAT_SIG_KEY_MISSING` | critical | permanent | Tried to sign with a verify-only key |
| `DAT_SIG_BACKEND` | partial | permanent | The operation could not run - wrong key type, released handle, crypto library fault |
| `DAT_SIG_UNKNOWN` | partial | permanent | Fallback |

`MISMATCH` and `BACKEND` sit on opposite axes: a mismatch is someone else's bad input with no
service impact; a backend failure is our own broken deployment. Reporting one as the other either
pollutes attack metrics with our bugs or hides a real forgery.

## Encryption

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | none | permanent | GCM tag mismatch - tampering, or certificates drifted apart. **Security event** |
| `DAT_CRYPTO_DATA_INVALID` | none | permanent | Non-empty ciphertext no longer than the 12-byte IV, or over an implementation limit |
| `DAT_CRYPTO_BACKEND` | partial | permanent | GCM unsupported on this platform, or context init failed |
| `DAT_CRYPTO_UNKNOWN` | partial | permanent | Fallback |

An empty `secure` region produces no code at all.

## Key

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_KEY_INVALID` | none | permanent | Key length does not match the declared algorithm (HMAC 32/48/64, AES 16/32), point not on curve, `d  not in  [1,n-1]`, not uncompressed (`0x04`), or private/public not a pair |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | critical | permanent | Verify-only export requested for HMAC |
| `DAT_KEY_UNKNOWN` | partial | permanent | Fallback |

Three that look alike:

| Code | It is a... |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **algorithm limit** - HMAC has no public key |
| `DAT_SIG_KEY_MISSING` | **runtime state** - this key holds no private half right now |
| `DAT_CERT_VERIFY_ONLY` | **deployment shape** - this certificate was distributed for verification |

## Manager

| Code | Impact | Retry | Meaning |
| --- | --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | critical | transient | Nothing imported yet, or the first sync failed |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | critical | permanent | Certificates exist, none can issue. **The cause is attached** |
| `DAT_MANAGER_DISPOSED` | critical | permanent | A disposed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | partial | permanent | Fallback |

Always read the cause of `NO_ISSUABLE_CERTIFICATE` - the four possibilities need four different
responses:

| Cause | Response |
| --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Wait. It opens shortly |
| `DAT_CERT_ISSUANCE_ENDED` | Deploy a new certificate |
| `DAT_CERT_EXPIRED` | Renew certificates |
| `DAT_CERT_VERIFY_ONLY` | **Deployment mistake** - an issuing node was given verify-only certs |

The cause travels through each language's chaining: `cause` / `__cause__` / `InnerException` /
`Unwrap()`. C has no chaining, so it is a separate query: `dat_manager_issuable_cause()`.

## Configuration

Every `CONFIG` code means the calling code is wrong. Seeing one in production means a bad
deployment shipped.

| Code | Meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name does not match the wire spelling (`ECDSA-P256`, `IV-AES256-GCM`) |
| `DAT_CONFIG_ARGUMENT_INVALID` | Null required argument, out-of-range value (negative time, `interval <= 0`), unsupported payload type, or an empty body to sign |
| `DAT_CONFIG_URI_INVALID` | CMS URI unparseable, wrong scheme, or carrying a path/query |
| `DAT_CONFIG_UNKNOWN` | Fallback |

## Internal

| Code | Meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Crypto backend or runtime API missing entirely - no `crypto.subtle`, no AES-GCM, runtime below the minimum version. Fix the environment |
| `DAT_INTERNAL_UNKNOWN` | Allocation failed, RNG failed, lock unobtainable, unreachable branch reached. Usually a runtime fault or a library bug |

## CMS sync

These never appear unless CMS synchronization is in use.

| Code | Impact | Retry | HTTP | Meaning |
| --- | --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | partial | transient | - | DNS, connection refused, TLS, or timeout |
| `DAT_CMS_UNAUTHORIZED` | critical | permanent | 401 | Token missing or wrong |
| `DAT_CMS_FORBIDDEN` | critical | permanent | 403 | Token valid, wrong tier for this endpoint |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | critical | permanent | 404 | Wrong URL |
| `DAT_CMS_SERVER_ERROR` | partial | transient | 5xx | Server-side failure |
| `DAT_CMS_HTTP_STATUS` | critical | permanent | - | Another non-2xx |
| `DAT_CMS_MALFORMED` | critical | permanent | - | Missing or non-decimal version line |
| `DAT_CMS_IMPORT_FAILED` | critical | permanent | - | Response arrived, certificates would not apply. **Reason in `cause`** |
| `DAT_CMS_VERSION_RESET` | none | state | 200 | Server version older than ours; resynchronize. Handled automatically |
| `DAT_CMS_NOT_SYNCED` | critical | transient | - | Never synced successfully even once |
| `DAT_CMS_SYNC_IN_PROGRESS` | none | state | - | Previous sync still running, this tick skipped |
| `DAT_CMS_NOT_SUPPORTED` | critical | permanent | - | CMS support not compiled in (feature off, CURL absent) |
| `DAT_CMS_UNKNOWN` | partial | permanent | - | Fallback |

The permanent ones (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`,
`IMPORT_FAILED`) are all critical: retrying does nothing while certificates keep expiring, so
ignoring them guarantees an eventual outage.

## Server-produced codes

The CMS server produces these; clients only ever receive them, wrapped in a `DAT_CMS_*` code with
the original preserved in `cause`.

| Received | HTTP | Client produces |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (others) | 400|405|413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (version rollback) | 200 | `DAT_CMS_VERSION_RESET` |

Server error envelope:

```json
{ "code": "DAT_REQ_ALG_UNSUPPORTED", "details": { "algorithm": "BOGUS-ALG" } }
```

`DAT_AUTH_DISABLED` is special: it means the CMS has no tokens configured at all, so **the
certificate issuance API is open to anyone**. It is never returned in a response - it is printed to
the startup log. Treat it as a critical finding.

## Impact and suspect

**Impact** answers "is the service down?" and drives alerting:

- **critical** - issuance impossible, sync permanently failing, initialization failing.
- **partial** - some requests or cycles fail, the service runs, usually self-healing.
- **none** - one request was rejected. Nothing else happened.

Never page on a **none**. If every engineer looks at a single piece of bad input, the alert stops
meaning anything.

**Suspect** codes (`DAT_TOKEN_MALFORMED`, `DAT_CERT_NOT_FOUND`, `DAT_SIG_MISMATCH`,
`DAT_SIG_MALFORMED`, `DAT_CRYPTO_TAG_MISMATCH`, `DAT_CRYPTO_DATA_INVALID`, `DAT_KEY_INVALID`, and
the server's `DAT_AUTH_UNAUTHORIZED`, `DAT_AUTH_FORBIDDEN`, `DAT_REQ_MALFORMED`,
`DAT_REQ_NOT_FOUND`, `DAT_REQ_TOO_LARGE`) are normal once and meaningful in bulk. Count them as a
metric and alert on a threshold. A sustained burst from one source is either a broken client or
someone probing.

Impact and suspect are documentation classifications, not API surface - the same code lands
differently depending on where it arose. `DAT_KEY_INVALID` filtering one incoming token is
harmless; the same code while reading certificates during sync fails the whole sync.

## Symptom index

| Symptom | Code |
| --- | --- |
| Works after login, rejected later | `DAT_TOKEN_EXPIRED` - refresh |
| Verification fails on one server only | `DAT_CERT_NOT_SYNCED` - that node lacks the new cid |
| Same token rejected everywhere | `DAT_CERT_NOT_FOUND` - a cid nobody issued |
| Issuing server cannot create tokens | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` - deployed verify-only |
| Issuance fails only right after startup | `DAT_MANAGER_NO_CERTIFICATE` - before the first sync |
| Sync keeps failing | `DAT_CMS_UNAUTHORIZED` - wrong token, retrying is useless |
| No certificates arrive at all | `DAT_CMS_ENDPOINT_NOT_FOUND` - URL typo |
| Fails on one platform only | `DAT_INTERNAL_UNAVAILABLE` - crypto backend missing |
| Verification failures spike | `DAT_SIG_MISMATCH` - one is noise, a burst is forgery |
| Secure decryption suddenly fails | `DAT_CRYPTO_TAG_MISMATCH` - drift or tampering |
| Warning in the CMS startup log | `DAT_AUTH_DISABLED` - the issuance API is wide open |
