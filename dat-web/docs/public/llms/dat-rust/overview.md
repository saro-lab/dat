# dat-rust Overview

This document targets DAT 4.7.x and later for the `dat` crate (`dat-rust`). Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here.

For the full DAT wire protocol, certificate grammar, algorithm names, CMS v1 contract, and error catalog shared by every platform, see the [main llms.txt](https://dat.saro.me/llms.txt). This document only covers what is specific to the Rust crate.

## What this crate does

`dat` implements the DAT token/certificate wire format, HMAC and ECDSA signing/verification, AES-GCM encryption, and (optionally) a CMS v1 client that synchronizes certificates from a DAT CMS server. It exposes:

- `DatManager` — in-process certificate store; `issue`/`parse`/`import`/`export`.
- `DatCmsManager` — wraps a `DatManager` with CMS v1 HTTP synchronization (behind the `dat_cms` feature).
- `DatCertificate` — one immutable certificate; construct with `DatCertificate::generate(..)` (fresh key material) or parse wire text with `str::parse::<DatCertificate>()` / `DatCertificate::from_str`.
- `DatError` / `DatRetry` — the stable error type described in [errors.md](./errors.md).

## Crypto backend split

The crate deliberately uses two crypto backends:

- `aws-lc-rs` for ECDSA/HMAC signatures.
- RustCrypto `aes-gcm` (with the `aes` crate's `zeroize` feature enabled so extended AES round keys are wiped on drop) for AES-GCM.

This split is a deliberate performance choice, not unfinished backend consolidation. Do not replace or consolidate it merely for backend uniformity.

## Install

`Cargo.toml`:

```toml
[dependencies]
dat = "4.7.0"
```

Enable CMS v1 client support (pulls in `tokio` with the `time` feature and `reqwest`) with the `dat_cms` feature, or the `full` feature (`dat_cms` + `tracing` log lines):

```toml
[dependencies]
dat = { version = "4.7.0", features = ["full"] }
```

See docs.rs for the full list of feature flags.

## Minimal usage

Without CMS — generate a certificate locally and issue/parse against it (development/self-issued use; production issuers normally import certificates distributed by DAT CMS instead of generating their own):

```rust
use dat::certificate::DatCertificate;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::crypto::DatCryptoAlgorithm;

let cert = DatCertificate::generate(
    1,                              // cid
    0,                              // issuance window start (unix seconds)
    3600,                           // issuance window duration (seconds)
    900,                            // DAT TTL (seconds)
    DatSignatureAlgorithm::HmacSha256Mfs,
    DatCryptoAlgorithm::IvAes256Gcm,
)?;

let manager = DatManager::new();
manager.import_certificates(vec![cert], false)?;

let token = manager.issue("route=a", "user-id=42")?;   // issue takes &str, &str
let payload = manager.parse(token.as_str())?;          // parse verifies the signature
let plain = payload.plain_text()?;                     // Result<&str, DatError>
let secure_bytes = payload.secure();                    // &[u8]
```

With CMS (requires the `dat_cms`/`full` feature):

```rust
use dat::cms_manager::DatCmsManager;
use std::time::Duration;

let manager = DatCmsManager::builder()
    .url("http://localhost:8088")?
    .token("full-token")
    .connect_timeout(Duration::from_secs(5))
    .total_timeout(Duration::from_secs(15))
    .build()
    .await; // Arc<DatCmsManager>; best-effort sync already attempted

if let Some(err) = manager.last_error().await {
    // initial sync failed; manager is still usable, decide a startup policy
}

let token = manager.issue("route=a", "user-id=42")?;
```

See [api.md](./api.md) for the full builder/manager surface, [errors.md](./errors.md) for `DatError`, and [integration.md](./integration.md) for a Rust-specific integration checklist.
