# saro-dat (C# / .NET) — Integration Checklist

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. DAT wire protocol and CMS v1 remain compatible with existing clients.

## Role and certificate deployment

- [ ] Classify each service as an **issuer** (calls `manager.Issue(...)`) or **verifier** (only calls `manager.Parse(...)`/decrypts).
- [ ] Issuers build with `DatCmsManager.Builder().VerifyOnly(false)...` against `/v1/certs`, using a `TOKEN_CERT_FULL` credential.
- [ ] Verifiers build with `.VerifyOnly(true)` against `/v1/certs/verify-only`, using a `TOKEN_CERT_VERIFY` credential, only when ECDSA is used.
- [ ] Never deploy verify-only certificates to an issuer: `Issue()` throws `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` with an inner `DAT_CERT_VERIFY_ONLY`.
- [ ] Do not request HMAC verify-only export: `Exports(verifyOnly: true)` on an HMAC certificate fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` because HMAC has no public key.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure`.
- [ ] Put only non-sensitive routing/schema information in `plain`; it is Base64Url, not encryption.
- [ ] Put user IDs, authority snapshots, and other confidential data in `secure`.
- [ ] Use `Payload.PlainBytes`/`SecureBytes` for arbitrary payloads; do not rely on `Payload.Plain`/`Secure` (UTF-8 string convenience) for binary data.
- [ ] Do not use `manager.ParseWithoutVerifying(...)` output for authentication/authorization.
- [ ] Treat `DAT_TOKEN_EXPIRED` as normal refresh, and `DatException.SecurityEvent == true` (`DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH`) as security events.

## CMS manager startup and lifecycle

- [ ] Accept that `BuildAsync()`'s initial sync is best-effort: it always returns a live `DatCmsManager` even on failure. Read `cms.LastError` and decide an explicit application startup policy.
- [ ] Treat `DAT_CMS_NOT_SYNCED` as the manager's pre-attempt state (the constructor's default `LastError`). A failed initial attempt may replace it with a concrete non-state error before any success.
- [ ] For an operator action that must fail immediately, call `await cms.SyncOrThrow()` instead of `await cms.Sync()`.
- [ ] Set `.ConnectTimeoutSeconds(long)` (default `5`) and `.RequestTimeoutSeconds(long)` (default `15`) on the builder; `0` disables the corresponding limit. Negative values throw `DAT_CONFIG_ARGUMENT_INVALID`.
- [ ] Redirects: the owned `HttpClient` (`SocketsHttpHandler { AllowAutoRedirect = false }`) never follows redirects. If you supply your own `HttpClient` via `.Client(...)`, its redirect behavior is entirely up to your configuration — `DatCmsManager` does not override it.
- [ ] Stop the manager on shutdown: prefer `await cms.DisposeAsync()` over synchronous `Dispose()` — it cancels the sync loop and awaits it before returning. `Dispose()`/`DisposeAsync()` only disposes the `HttpClient` if it was owned (not supplied via `.Client(...)`).

## Errors and retry

- [ ] Branch on `DatException.Code`, never on `Message` text.
- [ ] Retry/back off only `DatRetry.Transient` CMS failures (`DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`); configuration/authentication/malformed/import failures are `DatRetry.Permanent`.
- [ ] Treat `DAT_CMS_SYNC_IN_PROGRESS` and `DAT_CMS_VERSION_RESET` (`DatRetry.State`) as observations, not failures — `Sync()` already excludes them from replacing `LastError`.
- [ ] Alert on sustained transient failures: existing certificates keep working initially, but eventually expire.
- [ ] Keep the cause for `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` and `DAT_CMS_IMPORT_FAILED` via `InnerException`.

## CMS configuration and rotation

- [ ] Configure `TOKEN_MASTER` for certificate creation, `TOKEN_CERT_FULL` for full export, and `TOKEN_CERT_VERIFY` for verify-only export on the `dat-cms` server side.
- [ ] Never leave a production role list empty on the server. Set `.Token(...)` on every client to match the deployed CMS token for its role.
- [ ] Rotate with a **new CID**. `DatManager.Imports(..., clear: false)` retains the existing certificate if the server repeats a `cid` with a different key.
- [ ] Validate strict ASCII/plain-decimal CMS responses; `SyncOrThrow()` already enforces this and throws `DAT_CMS_MALFORMED` otherwise.

## Release and environment validation

- [ ] Preserve protocol compatibility: do not introduce a new DAT field, endpoint contract, or error-code meaning.
- [ ] Confirm the target `saro-dat` NuGet version is 4.7.x or later before relying on the behavior described here.
- [ ] `Saro.Dat` targets `net8.0` and `net10.0`; verify your project's `TargetFramework` is compatible.
- [ ] Treat CMS version (`cms.GetVersion()`) as a monotonic cursor, not a row count.

See [api.md](./api.md) for exact API signatures and [../dat-cms/operations.md](../dat-cms/operations.md) for CMS server deployment details.
