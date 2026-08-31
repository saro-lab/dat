# dat-rust API Reference

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here. Source-verified against `dat-rust/src/{manager,cms_manager,certificate,payload,dat,error}.rs`. Module paths below assume `use dat::...`.

## `DatManager` (`dat::manager::DatManager`)

In-process certificate store. Not networked; `DatCmsManager` wraps one of these.

| Method | Signature | Notes |
| --- | --- | --- |
| `new()` / `Default` | `fn new() -> Self` | Starts with no certificates and no issuer |
| `issue` | `fn issue(&self, plain: &str, secure: &str) -> Result<String, DatError>` | Text-only input. There is no separate byte-input `issue` in 4.7.0; Base64/hex-encode binary payloads yourself before calling `issue` if you need literal bytes in `plain`/`secure` |
| `parse` | `fn parse<E: Into<DatError>>(&self, dat: impl TryInto<Dat, Error = E>) -> Result<DatPayload, DatError>` | Verifies the signature before returning; accepts `&str`, `String`, or an already-parsed `Dat` |
| `parse_without_verify` | same shape as `parse` | Skips signature verification. Do not use for authentication/authorization — see [integration.md](./integration.md) |
| `export_cids` | `fn export_cids(&self) -> Vec<u64>` | Currently held certificate IDs |
| `export` | `fn export(&self, verify_only: bool) -> Result<String, DatError>` | Newline-joined certificate wire text for all held certificates |
| `export_certificates` | `fn export_certificates(&self) -> Result<Vec<DatCertificate>, DatError>` | Cloned certificate objects |
| `import` | `fn import(&self, format: &str, clear: bool) -> Result<usize, DatError>` | Parses newline-separated certificate wire text, then calls `import_certificates` |
| `import_certificates` | `fn import_certificates(&self, new_certificates: Vec<DatCertificate>, clear: bool) -> Result<usize, DatError>` | `clear=false` merges (`DAT_CERT_DUPLICATE_CID` if the input itself repeats a `cid`; an existing `cid` in the store wins over a repeated one in `new_certificates`); `clear=true` replaces the store outright. Expired certificates are dropped after merge; the issuer is recomputed as the certificate with the latest issuance-window end that is currently `issuable()` |

`Dat` (`dat::dat::Dat`) implements `FromStr` and `TryFrom<&str>`/`TryFrom<String>` with `Error = DatError`, so `manager.parse("expire.cid.plain.secure.signature")` and `manager.parse(dat_string)` both work directly.

`DatPayload` (`dat::payload::DatPayload`), returned by `parse`/`parse_without_verify`:

| Method | Returns |
| --- | --- |
| `plain()` | `&[u8]` |
| `plain_text()` | `Result<&str, DatError>` — `DAT_TOKEN_MALFORMED` on invalid UTF-8 |
| `secure()` | `&[u8]` |
| `secure_text()` | `Result<&str, DatError>` — `DAT_TOKEN_MALFORMED` on invalid UTF-8 |

## `DatCertificate` (`dat::certificate::DatCertificate`)

| Method | Signature | Notes |
| --- | --- | --- |
| `generate` | `fn generate(cid: u64, start: u64, duration: u64, ttl: u64, sig_alg: DatSignatureAlgorithm, crypto_alg: DatCryptoAlgorithm) -> Result<Self, DatError>` | Generates fresh signing/AES key material for local/dev use |
| `from` | `fn from(cid, start, duration, ttl, signature: DatSignature, crypto: DatCrypto) -> Result<Self, DatError>` | Builds a certificate from already-constructed key objects |
| `FromStr` | `fn from_str(format: &str) -> Result<Self, DatError>` | Parses the 8-field certificate wire text |
| `export` | `fn export(&self, verify_only: bool) -> Result<String, DatError>` | `verify_only=true` emits an HMAC error (`DAT_KEY_VERIFY_ONLY_UNSUPPORTED`) or an ECDSA public-key-only certificate |
| `expired()` / `issuable()` / `signable()` / `support_verify_only()` | `bool` | `issuable()` requires `signable()` and `start <= now <= end` |
| `signature_algorithm()` / `crypto_algorithm()` | `DatSignatureAlgorithm` / `DatCryptoAlgorithm` | |
| `try_clone()` | `Result<Self, DatError>` | Deep-clones key material |

`DatSignatureAlgorithm`: `HmacSha256Mfs`, `HmacSha384Mfs`, `HmacSha512Mfs`, `EcdsaP256`, `EcdsaP384`, `EcdsaP521`. `DatCryptoAlgorithm`: `IvAes128Gcm`, `IvAes256Gcm`. Each has an `as_str()`/`FromStr` pair matching the exact wire names in the main protocol reference.

## `DatCmsManager` / `DatCmsManagerBuilder` (`dat::cms_manager`, feature `dat_cms` or `full`)

```rust
DatCmsManager::builder()
    .url(url: &str) -> Result<Self, DatError>   // must be http(s), path-less, query-less
    .token(token: impl Into<String>) -> Self
    .verify_only(bool) -> Self                  // selects /v1/certs vs /v1/certs/verify-only
    .interval(Duration) -> Self                  // default 60s; see interval_off
    .interval_off() -> Self                       // interval(Duration::ZERO), disables background sync
    .connect_timeout(Duration) -> Self            // default 5s; a zero Duration clears the limit
    .total_timeout(Duration) -> Self              // default 15s; a zero Duration clears the limit
    .timeout(Duration) -> Self                    // alias for total_timeout
    .build() -> Arc<DatCmsManager>                // async; performs one best-effort sync().await
```

Default base URL if `.url(...)` is never called: `http://localhost:8088`.

`DatCmsManager` methods:

| Method | Signature | Notes |
| --- | --- | --- |
| `builder()` | `fn builder() -> DatCmsManagerBuilder` | Static constructor |
| `issue` | `fn issue(&self, plain: &str, secure: &str) -> Result<String, DatError>` | Delegates to the internal `DatManager` |
| `parse` / `parse_without_verify` | same shape as `DatManager` | Delegates to the internal `DatManager` |
| `get_manager()` | `fn get_manager(&self) -> &DatManager` | Escape hatch to the underlying store, e.g. for `export_cids` |
| `get_version()` | `async fn get_version(&self) -> u64` | Current CMS version cursor |
| `last_error()` | `async fn last_error(&self) -> Option<DatError>` | Last non-state sync error; `None` after a successful sync |
| `sync()` | `async fn sync(&self) -> Result<(), DatError>` | Single-flight; a concurrent call returns `DAT_CMS_SYNC_IN_PROGRESS` without touching `last_error` |

Lifecycle: `build()` starts at CMS version `0` with `last_error = Some(DatCmsNotSynced)`, then immediately calls `sync()` once. Regardless of that result, the returned `Arc<DatCmsManager>` is live. If `interval` is non-zero, a `tokio::spawn`ed background task ticks `sync()` on that interval, holding only a `Weak` reference to the manager so it does not keep it alive. **There is no explicit `close()`/`stop()` method** — dropping the last `Arc<DatCmsManager>` runs `Drop`, which aborts the background task's `AbortHandle`. The CMS token is stored in a `Zeroizing<String>` so it is wiped from memory on drop.

Redirect policy: a custom `reqwest` policy that follows only same-origin (scheme + host + effective port) redirects and errors after more than 10 hops.

Sync response mapping (from `sync_inner`): non-2xx → `401`→`CmsUnauthorized`, `403`→`CmsForbidden`, `404`→`CmsEndpointNotFound`, `500..=599`→`CmsServerError(code)`, anything else non-2xx → `CmsHttpStatus(code)`. Transport failures (connect/TLS/redirect-policy/read) → `CmsUnreachable(String)`. A non-ASCII body or an unparseable version line → `CmsMalformed`. A version-only body (empty or whitespace-only certificate section) returns `Ok(())` without changing the stored version. Certificate import uses `manager.import(certs, false)` (`clear=false`); import failure wraps the cause in `CmsImportFailed(Box<DatError>)`.

## `DatError` / `DatRetry`

See [errors.md](./errors.md) for the full code table and accessors (`.code()`, `.retry()`, `.security_event()`, `.cause()`).
