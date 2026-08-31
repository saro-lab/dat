# dat-rust Integration Checklist

This document targets DAT 4.7.x and later for the `dat` crate. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here. See [main llms.txt](https://dat.saro.me/llms.txt) for the protocol-wide checklist; this file is the Rust-specific translation.

## Role and certificate deployment

- [ ] Classify the service as an **issuer** (`verify_only(false)` / import full certificates) or **verifier** (`verify_only(true)` / import verify-only certificates when using ECDSA).
- [ ] Never import verify-only certificates into an issuer process: `issue()` fails with `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, cause `DAT_CERT_VERIFY_ONLY`.
- [ ] Do not call `DatCertificate::export(true)` on an HMAC certificate — it fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`; HMAC has no public-key form.

## Payload and token handling

- [ ] `DatManager::issue` only accepts `&str` for `plain`/`secure`; if you need binary payloads, encode them (e.g. Base64) before calling `issue`.
- [ ] Prefer `DatPayload::plain()`/`secure()` (`&[u8]`) over `plain_text()`/`secure_text()` unless you control the payload schema and know it is valid UTF-8; the latter return `DAT_TOKEN_MALFORMED` on invalid UTF-8 rather than lossily converting.
- [ ] Put only non-sensitive routing/schema data in `plain` — it is Base64Url, not encryption.
- [ ] Never call `parse_without_verify` on a path that feeds authentication/authorization decisions; it returns attacker-controlled fields with no signature check.
- [ ] Treat `DAT_TOKEN_EXPIRED` as a normal refresh signal, and `DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH` (`.security_event() == true`) as security events worth separate alerting/logging.

## `DatCmsManager` startup and lifecycle

- [ ] `DatCmsManagerBuilder::build()` always returns a live `Arc<DatCmsManager>`, even if the initial `sync()` failed — check `last_error().await` and decide an explicit startup policy (fail fast vs. run degraded) rather than assuming success.
- [ ] For a path that must observe sync failure immediately (an admin "reload now" action, a readiness probe), call `manager.sync().await` directly and match on the returned `Result`; there is no separate throwing variant in Rust — the async return value is already the immediate result.
- [ ] Set `connect_timeout`/`total_timeout` (defaults 5s/15s) explicitly for your deployment; pass a zero `Duration` only if you intend to disable that limit.
- [ ] Redirects: the crate's CMS HTTP client follows only same-origin redirects, capped at 10 hops. If your CMS sits behind a redirecting proxy that changes origin, synchronization will fail with `DAT_CMS_UNREACHABLE` — fix the proxy/DNS setup rather than trying to relax this from client code.
- [ ] Shutdown: there is no explicit `close()`/`stop()`. Drop the last `Arc<DatCmsManager>` (let it go out of scope) to abort the background sync task; holding a stray clone anywhere (e.g. in a static, a spawned task, or a channel) prevents shutdown.
- [ ] Do not call `sync()` in a tight loop expecting every call to run the network request — concurrent calls are single-flight and return `DAT_CMS_SYNC_IN_PROGRESS` without touching `last_error`.

## Errors and retry

- [ ] Match on `.code()` (`&'static str`), never on the `Display` string or the enum variant name, across crate versions.
- [ ] Retry/back off only on `.retry() == DatRetry::Transient` (`DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`, `DAT_CERT_NOT_YET_ISSUABLE`, `DAT_CERT_NOT_SYNCED`, `DAT_MANAGER_NO_CERTIFICATE`, and `ManagerNoIssuableCertificate` when its `.cause()` is `CertNotYetIssuable`).
- [ ] Treat `DatRetry::State` (`DAT_CMS_SYNC_IN_PROGRESS`, `DAT_CMS_VERSION_RESET`) as observations, not failures — do not error-loop or alert on them alone.
- [ ] Alert on sustained transient CMS failures: existing certificates keep working until their issuance window/TTL ends, then issuance/verification starts failing.
- [ ] Preserve `.cause()`/`.source()` when logging `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` or `DAT_CMS_IMPORT_FAILED` — the wrapped `DatError` carries the actionable reason.

## CMS configuration and rotation

- [ ] Rotate keys with a new `cid`. `import_certificates(_, clear=false)` keeps the existing certificate if the server repeats a `cid` with different key material — it does not overwrite it.
- [ ] Decide your process's redirect and TLS posture before deployment; this crate's CMS client cannot be configured to follow cross-origin redirects.
- [ ] If you construct certificates locally with `DatCertificate::generate` instead of importing from CMS, ensure `start`/`duration`/`ttl` reflect your actual propagation delay and TTL policy — there is no server-side validation on the client side.

## Testing and release status

- [ ] The 4.7.0 core and strictness test suites pass under Miri. The full macOS async test suite cannot run under Miri because Miri does not implement the `kqueue` syscall it depends on — do not treat a Miri run on macOS as covering the async/CMS path; rely on the native async test run for that coverage.

See [api.md](./api.md) for exact signatures and [errors.md](./errors.md) for the full code catalog.
