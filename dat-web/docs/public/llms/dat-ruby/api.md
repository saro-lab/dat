# DAT Ruby — API Reference

This document targets DAT 4.7.x and later for the `saro-dat` gem. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. This describes the actual API (`lib/saro/dat/*.rb`); all classes live under `Saro::Dat`.

## `Saro::Dat::DatManager`

In-process certificate store. Not thread-unsafe for writes: `import_certificates` takes an internal write lock and publishes a new immutable state atomically.

| Method | Signature | Behavior |
| --- | --- | --- |
| `new` | `DatManager.new` | Starts with an empty certificate state. |
| `import_certificates` | `import_certificates(certs, clear: false)` | `certs` is an `Array<DatCertificate>`. Raises `DAT_CERT_DUPLICATE_CID` if the input array itself repeats a `cid`. Merge semantics (`clear: false`): existing `cid`s are kept as-is, new `cid`s are added, expired certificates are dropped, and the issuer is recomputed. Returns the count of newly added certificates. |
| `imports` | `imports(format_str, clear: false)` | Parses newline-separated certificate wire lines (as returned by a CMS plain-text response body, minus the version line) via `DatCertificate.imports`, then calls `import_certificates`. |
| `exports` | `exports(verify_only = false)` | Serializes all held certificates as newline-joined wire text. `verify_only: true` exports ECDSA certificates without the private scalar; raises `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` per-key if an HMAC certificate is present (HMAC has no verify-only form). |
| `issue` | `issue(plain, secure)` | Selects the current issuer certificate and returns a signed DAT wire string. Raises `DAT_MANAGER_NO_CERTIFICATE` (no certificates at all) or `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` (certificates exist but none is currently signable/in-window), with `.cause` set to the specific `DAT_CERT_*` reason. |
| `parse` | `parse(dat_input)` | `dat_input` is a `String` or an already-parsed `Dat`. Validates structure, expiry, resolves the certificate by `cid`, verifies the signature, and decrypts `secure`. Returns a `DatPayload`. Raises `Saro::Dat::Error` on any failure — see `errors.md`. |

## `Saro::Dat::DatCmsManager`

Wraps a `DatManager` and adds CMS v1 synchronization over `Net::HTTP`.

### Construction

```ruby
Saro::Dat::DatCmsManager.new(
  uri:,                         # full endpoint, e.g. "http://host:8088/v1/certs"
  token:,                       # Authorization header value, sent as-is (no "Bearer " prefix)
  interval_seconds: 60,          # 0 disables the background sync thread
  verify_only: false,
  dat_manager: nil,              # inject an existing DatManager; defaults to DatManager.new
  connect_timeout_seconds: 5,
  sync_timeout_seconds: 15
)
```

The constructor performs one best-effort `sync` synchronously before returning, and starts a background thread only if `interval_seconds > 0`. Prefer the builder below, which builds the full endpoint URI for you.

### `Saro::Dat::DatCmsManager.builder` → `DatCmsManagerBuilder`

Fluent builder; every setter returns `self`.

| Method | Default | Notes |
| --- | --- | --- |
| `uri(uri)` | `"http://localhost:8088"` | Base URI, trailing `/` stripped. Must be a path-less, query-less `http`/`https` URI; violations raise `DAT_CONFIG_URI_INVALID` from `build`. |
| `token(token)` | `""` | Sent verbatim in the `Authorization` header. |
| `verify_only(bool)` | `false` | Selects `/v1/certs` vs `/v1/certs/verify-only` as the path appended to `uri` in `build`. |
| `interval_seconds(n)` | `60` | Background sync period. |
| `interval_off` | — | Shorthand for `interval_seconds(0)`. |
| `connect_timeout_seconds(n)` | `5` | Passed to `Net::HTTP` as `open_timeout`; `0` means no timeout (`nil`). |
| `sync_timeout_seconds(n)` | `15` | Passed to `Net::HTTP` as `read_timeout`; `0` means no timeout (`nil`). |
| `build` | — | Validates the URI, appends `/v1/certs` or `/v1/certs/verify-only`, and constructs the `DatCmsManager` (which immediately runs one `sync`). |

### Instance methods

| Method | Behavior |
| --- | --- |
| `sync` | Non-throwing. Calls `sync_or_raise` internally; on any `Saro::Dat::Error` whose `.retry != :state`, records it in `last_error` and logs it; state-class errors (`DAT_CMS_SYNC_IN_PROGRESS`) are logged at debug level without touching `last_error`. A successful sync clears `last_error` to `nil`. Always returns `nil`. |
| `sync_or_raise` | Throwing. Performs one synchronization cycle over `Net::HTTP` and raises `Saro::Dat::Error` on any transport, HTTP-status, parse, or import failure. Single-flight: if another sync is in progress, raises `DAT_CMS_SYNC_IN_PROGRESS` immediately without blocking. |
| `last_error` | Attribute reader. Starts as `DAT_CMS_NOT_SYNCED` before the first sync attempt completes. |
| `version` | Attribute reader — the current client cursor (`Integer`), starts at `0`. |
| `issue(plain, secure)` | Delegates to the wrapped `DatManager#issue`. |
| `parse(dat)` | Delegates to the wrapped `DatManager#parse`. |
| `get_manager` | Returns the wrapped `DatManager` for direct access (e.g. manual `exports`). |
| `stop` | Idempotent. Signals the background thread to exit, closes any in-flight `Net::HTTP` connection, and joins the thread with a 1-second timeout. Call this on application shutdown. |
| `stopped?` | Whether `stop` has been called. |

### Transport and redirect behavior

Uses `Net::HTTP.start(host, port, use_ssl: scheme == "https", open_timeout:, read_timeout:)`. **`Net::HTTP` does not follow redirects automatically** — a `3xx` response is treated by status-code mapping like any other non-2xx status (see `errors.md`), not silently followed. There is no independent connect-vs-read timeout split beyond what `Net::HTTP`'s `open_timeout`/`read_timeout` provide.

### Sync response handling

`sync_or_raise` requires the response body to be non-empty and `ascii_only?` (`DAT_CMS_MALFORMED` otherwise), splits on the first `\n` into a version line (`/\A[0-9]+\z/`, unbounded — Ruby has no fixed integer width) and a certificate-lines remainder. An empty remainder is a valid version-only response: the client version is **not** advanced and existing certificates/issuer are preserved. A non-empty remainder is imported via `DatManager#imports(..., clear: false)`; import failure raises `DAT_CMS_IMPORT_FAILED` wrapping the original cause and leaves prior state untouched (import validates and applies atomically inside `DatManager`). If the new version is lower than the current version, a `DAT_CMS_VERSION_RESET` warning is logged before the (successful) import commits the lower version.

## `Saro::Dat::Dat` / `Saro::Dat::DatPayload`

`Dat.new(dat_str)` parses a raw token string into fields (`expire`, `cid`, `plain`, `secure`, `signature`) without verifying the signature; a parse failure is recorded in `.error` rather than raised immediately — call `#raise_if_invalid!` to raise it. `#expired?` checks `Time.now.to_i >= expire`. Prefer `DatManager#parse`/`DatCmsManager#parse` for verified parsing; do not use `Dat.new` output for authentication or authorization.

`DatPayload#plain_bytes` / `#secure_bytes` are the raw decoded bytes (ASCII-8BIT). `#plain` / `#secure` return the same bytes with `force_encoding('utf-8')` — invalid UTF-8 is not rejected at this layer, it is returned as an invalidly-encoded Ruby string; use `#plain_bytes`/`#secure_bytes` for arbitrary/binary payloads.

## `Saro::Dat::DatCertificate`

`DatCertificate.new(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_key, crypto_key)` and `DatCertificate.generate(cid, start, duration, ttl, signature_algorithm, crypto_algorithm)` (generates fresh key material via `DatSignature.generate` / `DatCrypto.generate`). `.exports(verify_only = false)` / `.imports(wire_string)` round-trip the 8-field certificate wire format. `.issuable?`, `.expired?`, `.signable?` mirror the protocol's certificate time-boundary rules described in the shared contract.

Algorithm name constants: `Saro::Dat::DatSignatureAlgorithm::{ECDSA_P256, ECDSA_P384, ECDSA_P521, HMAC_SHA256_MFS, HMAC_SHA384_MFS, HMAC_SHA512_MFS}` and `Saro::Dat::DatCryptoAlgorithm::{IV_AES128_GCM, IV_AES256_GCM}`.
