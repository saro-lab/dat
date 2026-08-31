# dat-rust Error Reference

`dat::error::DatError` is a `Clone + Eq + std::error::Error` enum. Match on `.code()` (the stable `DAT_*` string), not the enum variant name or the `Display`/message text, for cross-language and cross-version stability.

```rust
match manager.parse(token) {
    Ok(payload) => { /* ... */ }
    Err(e) => {
        let code = e.code();          // &'static str, e.g. "DAT_SIG_MISMATCH"
        let retry = e.retry();        // DatRetry::Transient | Permanent | State
        let is_security_event = e.security_event(); // true only for DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH
        let cause = e.cause();        // Option<&DatError>, populated for ManagerNoIssuableCertificate and CmsImportFailed
    }
}
```

`DatError` also implements `std::error::Error`, so `.source()` returns the same chained cause as `.cause()` for `ManagerNoIssuableCertificate(_)` and `CmsImportFailed(_)`, and `None` otherwise. `DatRetry` is `Transient`, `Permanent`, or `State` — see the retry-class meaning below.

There are **57 public `DAT_*` codes**: 47 client/common codes (all reachable from this crate) and 10 CMS-server codes (only reachable if you also run `dat-cms`; the Rust client observes them only indirectly, mapped to `DAT_CMS_*` by HTTP status). The string is the contract; `Display` text, variant names, and any numeric representation are not.

## Retry and state

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `Transient` | The condition may clear without a configuration change | Back off and retry |
| `Permanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `State` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use `DatRetry::State`.

## Security-event flag

`.security_event()` returns `true` for exactly two codes: `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH`. Every other code returns `false`, even ones that may be operationally suspicious in volume (malformed input, unknown `cid`, auth failures).

## TOKEN — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | permanent | Token is not exactly five fields; `expire` is not strict ASCII decimal `u64`; `cid` is not strict ASCII hex `u64`; a Base64Url field is invalid; a `DatPayload::plain_text`/`secure_text` call hit invalid UTF-8; or another structural rule fails |
| `DAT_TOKEN_EXPIRED` | permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | permanent | Unexpected token-area fallback |

## CERT — 9 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CERT_MALFORMED` | permanent | Certificate is not exactly eight fields; numeric/key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows `u64` |
| `DAT_CERT_EXPIRED` | permanent | `start + duration + ttl < now`; equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | transient | `now < start` |
| `DAT_CERT_ISSUANCE_ENDED` | permanent | `now > start + duration` while the certificate is not yet expired |
| `DAT_CERT_VERIFY_ONLY` | permanent | ECDSA certificate has no signing private key |
| `DAT_CERT_NOT_FOUND` | permanent | `DatManager` has no certificate for the token's `cid` |
| `DAT_CERT_NOT_SYNCED` | transient | Certificate `cid` expected from CMS has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | permanent | `import`/`import_certificates` input itself repeats a `cid` |
| `DAT_CERT_UNKNOWN` | permanent | Unexpected certificate-area fallback |

## SIG — 5 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_SIG_MISMATCH` | permanent | HMAC comparison or ECDSA verification reports mismatch; **security event** |
| `DAT_SIG_MALFORMED` | permanent | Signature field empty, invalid Base64Url, or algorithm-invalid fixed length |
| `DAT_SIG_KEY_MISSING` | permanent | Signing requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | permanent | `aws-lc-rs` sign/verify operation could not execute (key-handle/key-type/backend failure) |
| `DAT_SIG_UNKNOWN` | permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | permanent | AES-GCM authentication tag failed; **security event** |
| `DAT_CRYPTO_DATA_INVALID` | permanent | Non-empty encrypted bytes too short for the 12-byte IV, or exceed an implementation limit |
| `DAT_CRYPTO_BACKEND` | permanent | `aes-gcm`/`aes` operation unavailable or failed to initialize/execute |
| `DAT_CRYPTO_UNKNOWN` | permanent | Unexpected encryption-area fallback |

An empty `secure` field is valid and round-trips as empty bytes; no error.

## KEY — 3 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_KEY_INVALID` | permanent | Key length/structure mismatch for its algorithm |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | permanent | `DatCertificate::export(true)` requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Retry | Exact meaning |
| --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | transient | `DatManager` holds no certificates |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | derived from cause | Certificates exist, none currently issuable; `.cause()`/`.source()` gives the reason |
| `DAT_MANAGER_DISPOSED` | permanent | Not currently produced by this crate's manager implementation, reserved for parity with other clients |
| `DAT_MANAGER_UNKNOWN` | permanent | Unexpected manager-area fallback |

`ManagerNoIssuableCertificate` wraps one cause, with retry `Transient` only when the cause is `CertNotYetIssuable`:

| Cause | Meaning | Retry |
| --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Signing-capable certificate exists, window starts later | transient |
| `DAT_CERT_ISSUANCE_ENDED` | Signing windows ended | permanent |
| `DAT_CERT_EXPIRED` | Held certificates are expired | permanent |
| `DAT_CERT_VERIFY_ONLY` | No held certificate has signing authority | permanent |

## CONFIG — 4 codes

All permanent.

| Code | Exact meaning |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | Required argument invalid; timers/timeouts out of range |
| `DAT_CONFIG_URI_INVALID` | CMS URL is unparseable, not `http`/`https`, or has a path/query component (`DatCmsManagerBuilder::url` rejects both) |
| `DAT_CONFIG_UNKNOWN` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

Both permanent for the current operation.

| Code | Exact meaning |
| --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | Required runtime/crypto capability absent |
| `DAT_INTERNAL_UNKNOWN` | Allocation, RNG, lock-poisoning, or unreachable-branch failure — includes a poisoned `RwLock` on `DatManager`'s internal state |

## CMS client — 13 codes (feature `dat_cms`/`full`)

| Code | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | transient | transport | DNS/connect/TLS/redirect-policy/response-read failure |
| `DAT_CMS_UNAUTHORIZED` | permanent | `401` | Missing/unknown CMS token |
| `DAT_CMS_FORBIDDEN` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | permanent | `404` | CMS endpoint/base URL wrong |
| `DAT_CMS_SERVER_ERROR` | transient | `500..599` | CMS returned a server-class status |
| `DAT_CMS_HTTP_STATUS` | permanent | other non-2xx | Any other non-success status |
| `DAT_CMS_MALFORMED` | permanent | 2xx body | Non-ASCII body or unparseable version line |
| `DAT_CMS_IMPORT_FAILED` | permanent | 2xx import | `manager.import(certs, false)` failed; wraps the cause |
| `DAT_CMS_VERSION_RESET` | state | 2xx observation | Server version lower than the client's cursor; logged as a warning, sync still returns `Ok(())` |
| `DAT_CMS_NOT_SYNCED` | transient | initial state | `last_error` before the first sync attempt completes |
| `DAT_CMS_SYNC_IN_PROGRESS` | state | local | `sync()` skipped because another sync holds the single-flight lock; `last_error` untouched |
| `DAT_CMS_NOT_SUPPORTED` | permanent | build/runtime | Not currently produced by this crate (CMS support is compiled in or the crate doesn't build); reserved for parity |
| `DAT_CMS_UNKNOWN` | permanent | fallback | Unexpected CMS-client error |

`sync()` records the returned error into `last_error` unless its `.retry()` is `DatRetry::State` (`CmsVersionReset`, `CmsSyncInProgress`), matching the state/non-state distinction in the cross-client contract.

## CMS server — 10 codes

Only reachable if you also operate `dat-cms`; see [dat-cms/errors.md](../dat-cms/errors.md) for the full table (`AUTH_*`, `REQ_*`, `STORE_*`). This crate's CMS client never parses these from the server response — it maps HTTP status only, as shown in the CMS client table above.
