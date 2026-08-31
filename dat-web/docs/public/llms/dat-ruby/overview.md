# DAT Ruby — Overview

This document targets DAT 4.7.x and later for the `saro-dat` gem (`dat-ruby`). Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. See https://dat.saro.me/llms.txt for the full cross-language protocol contract (wire grammar, certificate grammar, algorithm names, CMS v1 endpoints, and the complete `DAT_*` error catalog).

## What this gem does

`saro-dat` issues and parses DAT bearer tokens and DAT certificates in pure Ruby, using `openssl` for ECDSA/HMAC/AES-GCM. It ships:

- `Saro::Dat::DatManager` — in-process certificate store, issuance, and verification.
- `Saro::Dat::DatCmsManager` — wraps a `DatManager` with periodic synchronization against a DAT CMS v1 server.
- `Saro::Dat::DatCertificate`, `Saro::Dat::DatSignature`, `Saro::Dat::DatCrypto` — certificate and key material.
- `Saro::Dat::Dat`, `Saro::Dat::DatPayload` — parsed-token and decrypted-payload value objects.
- `Saro::Dat::Error` / `Saro::Dat::ErrorCode` — the stable `DAT_*` error contract.

Required Ruby: `>= 2.7.0` (per `saro-dat.gemspec`). Runtime dependencies: `openssl ~> 4.0.2`, `base64`, `logger`.

## Install

```ruby
# Gemfile
gem "saro-dat"
```

```shell
gem install saro-dat
```

## Minimal usage — local manager (no CMS)

```ruby
require "saro-dat"

now = Time.now.to_i
cert = Saro::Dat::DatCertificate.new(
  0x1,                                                    # cid (uint64)
  now,                                                     # dat_issuance_start_seconds
  20,                                                       # dat_issuance_duration_seconds
  1800,                                                     # dat_ttl_seconds
  Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::ECDSA_P256),
  Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM)
)

manager = Saro::Dat::DatManager.new
manager.import_certificates([cert])

dat = manager.issue("route-id", "user-id-or-other-secret")
payload = manager.parse(dat)

payload.plain   # => "route-id"
payload.secure  # => "user-id-or-other-secret"
```

`plain`/`secure` accept Ruby strings; `DatPayload#plain`/`#secure` return UTF-8-decoded strings, while `#plain_bytes`/`#secure_bytes` return the raw (binary, `.b`-encoded) bytes if the payload is not UTF-8 text. `manager.issue`/`manager.parse` raise `Saro::Dat::Error` — see `errors.md`.

## Minimal usage — DAT CMS-backed manager

```ruby
require "saro-dat"

manager = Saro::Dat::DatCmsManager.builder
  .uri("https://cms.example.com")
  .token(ENV.fetch("DAT_CMS_TOKEN"))
  .verify_only(false)               # true for a verifier-only service
  .interval_seconds(60)              # 0 disables background sync
  .connect_timeout_seconds(5)
  .sync_timeout_seconds(15)
  .build

dat = manager.issue("route-id", "secret-payload")
payload = manager.parse(dat)

manager.stop # call on application shutdown
```

`DatCmsManagerBuilder#build` appends `/v1/certs` (or `/v1/certs/verify-only` when `verify_only(true)`) to the given base URI and performs one best-effort `sync` during construction — see `api.md` and `integration.md`.

See `api.md` for the full API surface, `errors.md` for the error contract, and `integration.md` for a Ruby-specific integration checklist.
