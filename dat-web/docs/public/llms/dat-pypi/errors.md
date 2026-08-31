# dat-pypi error contract

`dat-pypi` raises `saro_dat.DatError`, a subclass of both `ValueError` and `RuntimeError`. Catch it with `except DatError as e:`.

```python
try:
    manager.issue(plain, secure)
except DatError as e:
    e.code            # str, e.g. "DAT_SIG_MISMATCH"
    e.retry           # DatRetry.TRANSIENT | DatRetry.PERMANENT | DatRetry.STATE
    e.security_event  # bool property, True only for DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH
    e.detail          # Optional[str] free-text detail; not part of the stable contract
    e.__cause__       # chained DatError for DAT_MANAGER_NO_ISSUABLE_CERTIFICATE / DAT_CMS_IMPORT_FAILED
```

`saro_dat.code_of(exc)` returns `exc.code` if `exc` is a `DatError`, else `None` — use it when catching a broader exception type. `DatRetry` is a `str` `Enum` (`"transient"`, `"permanent"`, `"state"`), so `e.retry == "transient"` and `e.retry == DatRetry.TRANSIENT` both work.

`error.py` defines exactly the 47 client/common codes below as module-level string constants (e.g. `saro_dat.error.SIG_MISMATCH == "DAT_SIG_MISMATCH"`); the 10 CMS-server-only codes are never raised by this client and are included here only for completeness when reading CMS server responses/logs.

## Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `transient` | The condition may clear without a configuration change | Back off and retry |
| `permanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `state` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use `state`. `DAT_AUTH_DISABLED` is a CMS-server startup state/warning, never raised client-side.

## Security-event flag

`e.security_event` is `True` for exactly two codes: `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH`. Every other code returns `False`, even authorization and malformed-input failures that may be operationally suspicious in volume.

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
| `DAT_SIG_BACKEND` | permanent | The signature/verification operation could not execute because of key-handle, key-type, or crypto-backend failure |
| `DAT_SIG_UNKNOWN` | permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | permanent | AES-GCM authentication tag verification failed; security event |
| `DAT_CRYPTO_DATA_INVALID` | permanent | Non-empty encrypted bytes are too short for the 12-byte IV or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | permanent | AES-GCM operation/context is unavailable or failed to initialize/execute |
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
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from cause | Certificates exist, but none is currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | permanent | An already disposed/freed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s `e.retry` is `TRANSIENT` only when `e.__cause__.code == "DAT_CERT_NOT_YET_ISSUABLE"`; otherwise it is `PERMANENT`.

| Cause (`e.__cause__.code`) | Meaning | Retry/action |
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
| `DAT_CONFIG_URI_INVALID` | CMS URI is unparseable, not HTTP/HTTPS, or contains a disallowed path/query |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability is absent |
| `DAT_INTERNAL_UNKNOWN` | Unexpected internal failure such as allocation, RNG, lock, or an unreachable branch |

## CMS client — 13 codes

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | DNS, connect, TLS, redirect-policy, timeout, or response-read failure (`urllib.error.URLError`, socket/OS errors) |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Non-success status not covered above |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Empty body, any byte `> 0x7f`, missing/non-decimal version line |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | `DatManager.imports` raised; original `DatError` chained via `__cause__` |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Certificate-bearing response has a lower server version than the client's cursor; logged only, not raised |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | `last_error()`'s value before the first sync attempt completes |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | `sync_or_raise()` could not acquire the sync lock; skipped without replacing `last_error()` |
| `DAT_CMS_NOT_SUPPORTED` | permanent | build/runtime | Not raised by this pure-Python client; reserved for parity with runtimes that can omit CMS support at build time |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Unclassified exception during `sync_or_raise`, wrapped with the original exception as `__cause__` |

## CMS server — 10 codes (not raised by this client)

Received only inside a CMS server JSON error body; this Python client does not parse non-2xx JSON `code`/`details` and never raises these directly — it maps HTTP status to the CMS client codes above instead.

| Code | HTTP | Area |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | `401` | AUTH |
| `DAT_AUTH_FORBIDDEN` | `403` | AUTH |
| `DAT_AUTH_DISABLED` | none (startup log) | AUTH |
| `DAT_REQ_MALFORMED` | `400` | REQ |
| `DAT_REQ_ALG_UNSUPPORTED` | `400` | REQ |
| `DAT_REQ_NOT_FOUND` | `404`/`405` | REQ |
| `DAT_REQ_TOO_LARGE` | `413` | REQ |
| `DAT_REQ_UNKNOWN` | `400` | REQ |
| `DAT_STORE_UNAVAILABLE` | `503` | STORE |
| `DAT_STORE_UNKNOWN` | `500` | STORE |

See [dat.saro.me/llms.txt](https://dat.saro.me/llms.txt) and the DAT CMS server docs for the authoritative descriptions of these server-side codes.
