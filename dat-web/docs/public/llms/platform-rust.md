# DAT for Rust

Crate: `dat` | reference implementation | Rust edition 2024 | source: `dat-rust/`

Where any other client's behaviour differs from this one, this one is correct.

## Install

```toml
# CMS client + tracing logs
dat = { version = "4.6.2", features = ["full"] }

# CMS client only
# dat = { version = "4.6.2", features = ["dat_cms"] }

# core only - no CMS, no async runtime
# dat = { version = "4.6.2" }
```

| Feature | Pulls in | Gives you |
| --- | --- | --- |
| (none) | - | `DatManager`, certificates, issue/parse |
| `dat_cms` | `tokio`, `reqwest` | `dat::cms_manager::DatCmsManager` |
| `tracing` | `tracing` | sync progress and failure logs |
| `full` | both | everything |

Without `dat_cms`, `dat::cms_manager` does not exist - that is what `DAT_CMS_NOT_SUPPORTED`
describes in other ports.

## Module map

```rust
use dat::manager::DatManager;
use dat::cms_manager::DatCmsManager;       // feature = "dat_cms"
use dat::certificate::DatCertificate;
use dat::signature::DatSignatureAlgorithm;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::{DatError, DatRetry};
use dat::util::now_unix_timestamp;
```

## With a CMS (production)

`build()` is async and returns `Arc<DatCmsManager>` - hold it in a `OnceLock` or your DI container.

```rust
use dat::cms_manager::DatCmsManager;
use dat::error::DatError;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

static DAT_CMS_MANAGER: OnceLock<Arc<DatCmsManager>> = OnceLock::new();

#[inline]
pub fn get_cms_manager() -> Result<Arc<DatCmsManager>, DatError> {
    DAT_CMS_MANAGER.get()
        .map(Arc::clone)
        .ok_or(DatError::InternalUnknown("dat cms manager not initialized"))
}

pub async fn init() -> Result<(), DatError> {
    let manager = DatCmsManager::builder()
        .url("http://localhost:8088")?
        .token("12345678901b")
        // .verify_only(true)  // only when a separate service does the issuing
        // .interval_off()      // no background timer; call sync() yourself
        .interval(Duration::from_secs(60))
        .build().await;

    DAT_CMS_MANAGER.set(manager).map_err(|_| DatError::InternalUnknown("already initialized"))?;

    // build() hands back the manager even when the first sync failed, so a later
    // tick can still recover. Ask for the failure instead of assuming success.
    if let Some(e) = get_cms_manager()?.last_error().await {
        eprintln!("certificates are not being refreshed yet: {}", e.code());
    }
    Ok(())
}
```

`.url()` returns `Result` - the URI must be scheme + host + port with no path and no query.
The background timer needs a tokio runtime; `build()` spawns onto the ambient one.

## Issue and parse

```rust
let manager = get_cms_manager()?;

let plain = "42|acme|admin";
let secure = "42|s-91af|billing:rw";

let dat = manager.issue(plain, secure)?;

let payload = manager.parse(dat)?;
assert_eq!(plain, payload.plain_text()?);
assert_eq!(secure, payload.secure_text()?);
```

`parse` accepts anything convertible into `Dat`, so `&str` and `String` both work.
`DatPayload` gives you `plain()` / `secure()` for `&[u8]`, `plain_text()` / `secure_text()` for
`&str`, plus `expire()` and `cid()`.

## Without a CMS

```rust
use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;

let manager = DatManager::new();

// (cid, issuance_start, issuance_duration, dat_ttl, signature_alg, crypto_alg)
let now = now_unix_timestamp();
let certificate = DatCertificate::generate(
    0, now - 10, 3600, 1800,
    DatSignatureAlgorithm::HmacSha512Mfs,
    DatCryptoAlgorithm::IvAes256Gcm,
)?;

manager.import_certificates(vec![certificate], false)?;

let dat = manager.issue("42|acme|admin", "42|s-91af")?;
let payload = manager.parse(dat)?;
```

The third argument is a **duration in seconds**, not an end time. All times are Unix seconds.

Algorithm enums: `DatSignatureAlgorithm::{HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs, EcdsaP256,
EcdsaP384, EcdsaP521}` and `DatCryptoAlgorithm::{IvAes128Gcm, IvAes256Gcm}`.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `new()` | `DatManager` |
| `issue(&str, &str)` | `Result<String, DatError>` |
| `parse(impl TryInto<Dat>)` | `Result<DatPayload, DatError>` |
| `parse_without_verify(..)` | `Result<DatPayload, DatError>` - **logging only** |
| `import(&str, clear: bool)` | `Result<usize, DatError>` - text format |
| `import_certificates(Vec<DatCertificate>, clear: bool)` | `Result<usize, DatError>` |
| `export(verify_only: bool)` | `Result<String, DatError>` |
| `export_certificates()` | `Result<Vec<DatCertificate>, DatError>` |
| `export_cids()` | `Vec<u64>` |

`DatCmsManager` adds `sync()`, `last_error()`, `get_version()` (all async) and `get_manager()`, and
forwards `issue` / `parse` / `parse_without_verify`.

`clear = true` drops everything currently held before importing. CMS sync uses `false`, merging.

## Error handling

```rust
use dat::error::{DatError, DatRetry};

// Expiry, forgery and a malformed token each need a different response.
match manager.parse(dat) {
    Ok(payload) => println!("plain: {}", payload.plain_text()?),
    // Normal end of life. Let the caller refresh and try again.
    Err(DatError::TokenExpired) => println!("expired: ask the client to re-issue"),
    // DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH - direct evidence of tampering.
    Err(e) if e.security_event() => eprintln!("{}: drop the session", e.code()),
    // Anything else is simply a bad request.
    Err(e) => println!("rejected {}: {e}", e.code()),
}

// Never retry a permanent failure. A wrong token answers 401 forever.
if let Err(e) = manager.sync().await {
    match e.retry() {
        DatRetry::Transient => eprintln!("{}: retrying on the next tick", e.code()),
        DatRetry::Permanent => eprintln!("{}: fix the token, url or deployment", e.code()),
        DatRetry::State => {} // not a failure - a sync was already running
    }
}

// Sync failures never surface at build(). Poll to notice a stalled rollout.
if let Some(e) = manager.last_error().await {
    eprintln!("certificates are not being refreshed: {}", e.code());
}
```

`DatError` is an enum, so exhaustive `match` works, but prefer `e.code()` (the stable string) and
`e.retry()` / `e.security_event()` for branching - new variants are additive.

Full code table: [errors.md](https://dat.saro.me/llms/errors.md).

## Notes

- `DatManager` is internally synchronized; share it across threads behind `Arc`. `DatCmsManager` is
  already handed to you as `Arc`.
- `last_error()`, `sync()` and `get_version()` are `async` because they take an internal lock.
- Async is confined to CMS sync. `issue` and `parse` are synchronous.
- The release profile in this crate uses `panic = 'abort'` with fat LTO - expect that in
  benchmarks; it is not a requirement for consumers.
- Test code worth reading: `dat-rust/tests/example_cms_manager_test.rs`, `manager_test.rs`,
  `hard_test.rs`, `bench_test.rs`.
