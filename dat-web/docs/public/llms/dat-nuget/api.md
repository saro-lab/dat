# saro-dat (C# / .NET) — API Reference

This document targets DAT 4.7.x and later; any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. Source-verified against `Saro.Dat/*.cs`. All types live in namespace `Saro.Dat`.

## `DatManager`

Certificate-holding manager used for local issue/parse without CMS.

| Member | Signature | Behavior |
| --- | --- | --- |
| `Issue` | `string Issue(byte[] plain, byte[] secure)` / `string Issue(string plain, string secure)` | Issues a DAT with the manager's currently selected issuer certificate. Throws `DAT_MANAGER_NO_CERTIFICATE` if no certificate is held, or `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` (with an inner-exception cause) if none is currently signing-capable |
| `Parse` | `Payload Parse(Dat dat)` / `Payload Parse(string dat)` | Verifies the signature against the resolved certificate, then decrypts `secure`. Throws `DAT_SIG_MISMATCH` on signature failure |
| `ParseWithoutVerifying` | `Payload ParseWithoutVerifying(Dat dat)` / `Payload ParseWithoutVerifying(string dat)` | Decrypts without verifying the signature first. **Do not use for authentication/authorization** |
| `ExportsIds` | `List<long> ExportsIds()` | Held certificate IDs |
| `ExportsCertificates` | `List<DatCertificate> ExportsCertificates()` | Cloned copies of held certificates |
| `Exports` | `string Exports(bool verifyOnly)` | Wire-format certificate lines, newline-joined; `verifyOnly` strips signing keys per algorithm rules |
| `Imports` | `int Imports(string format, bool clear)` / `int Imports(List<DatCertificate> certs, bool clear)` | Parses/merges certificates. `clear:false` is a `cid`-preserving merge (existing `cid` wins, new ones added, expired ones evicted); `clear:true` replaces the whole set. A duplicate `cid` inside one call throws `DAT_CERT_DUPLICATE_CID`. Returns the number of newly added certificates |
| `Dispose` | `void Dispose()` | Disposes all held certificates; a disposed manager throws `DAT_MANAGER_DISPOSED` on further use |
| static `Issue` | `static string Issue(DatCertificate certificate, byte[] plain, byte[] secure)` | Stateless issue against one explicit certificate |
| static `Parse` / `ParseWithoutVerifying` | `static Payload Parse(DatCertificate certificate, Dat dat)`, etc. | Stateless parse against one explicit certificate |
| static `NewInstance` | `static DatManager NewInstance()` | Creates an empty manager |

Issuer selection: after any `Imports` call, the manager selects the certificate with the latest `DatIssuanceEndSeconds` among those that are currently `Issuable` as the active issuer. `Issue()` always uses that selected issuer, not a re-evaluation per call — a CMS outage does not immediately break issuance if a previously selected issuer's window is still open.

## `Payload`

| Member | Type | Notes |
| --- | --- | --- |
| `PlainBytes` | `byte[]` | Raw `plain` bytes |
| `SecureBytes` | `byte[]` | Raw decrypted `secure` bytes |
| `Plain` / `Secure` | `string` | UTF-8 decoding convenience; use the byte properties for arbitrary/binary payloads |
| `ToUnsafeString()` | `string` | `"{Plain} {Secure}"` — text convenience, not for binary payloads |

## `DatCmsManager`

Wraps a `DatManager` with CMS v1 synchronization. Implements `IDisposable` and `IAsyncDisposable`.

### Builder

`DatCmsManager.Builder()` returns a `DatCmsManagerBuilder`:

| Method | Default | Notes |
| --- | --- | --- |
| `Uri(string uri)` | `http://localhost:8088` | Must be `http`/`https`, path-less, query-less, or throws `DAT_CONFIG_URI_INVALID` |
| `Host(string host)` / `Port(int port)` | — | Convenience mutators on the configured URI |
| `Token(string token)` | `""` | Sent verbatim in the `Authorization` header, no `Bearer` prefix |
| `VerifyOnly(bool verifyOnly)` | `false` | Selects `/v1/certs/verify-only` instead of `/v1/certs` |
| `IntervalSeconds(long seconds)` / `IntervalOff()` | `60` | `0`/`IntervalOff()` disables the background `PeriodicTimer` sync loop |
| `ConnectTimeoutSeconds(long seconds)` | `5` | `0` maps to `Timeout.InfiniteTimeSpan` for the owned `SocketsHttpHandler`'s `ConnectTimeout`. Negative values throw `DAT_CONFIG_ARGUMENT_INVALID` |
| `RequestTimeoutSeconds(long seconds)` | `15` | `0` disables the per-request cancellation timeout. Negative values throw `DAT_CONFIG_ARGUMENT_INVALID` |
| `Client(HttpClient client)` | owned client | Supplying a client means the caller owns its lifetime and its own redirect/timeout configuration; `DatCmsManager` does not `Dispose()` a supplied client |
| `Logger(ILogger? logger)` | `null` | Optional `Microsoft.Extensions.Logging` sink for sync-loop diagnostics |
| `BuildAsync()` | — | `Task<DatCmsManager>`. Performs one best-effort `Sync()` before returning; the manager is returned regardless of that sync's outcome |

The owned `HttpClient` is constructed with `AllowAutoRedirect = false` — redirects are never followed on the owned transport. A supplied client keeps whatever redirect policy it was configured with.

### Instance members

| Member | Signature | Behavior |
| --- | --- | --- |
| `GetManager()` | `DatManager GetManager()` | The underlying certificate manager for `Issue`/`Parse` |
| `LastError` | `DatException? LastError { get; }` | `null` after a successful sync; otherwise the most recent non-state failure. Starts as `DAT_CMS_NOT_SYNCED` before the first attempt completes |
| `GetVersion()` | `long GetVersion()` | Current CMS version cursor |
| `Sync()` | `async Task Sync()` | Non-throwing: calls `SyncOrThrow()`, catches `DatException`/other exceptions, and records the result into `LastError`. State-class errors (`DAT_CMS_SYNC_IN_PROGRESS`, `DAT_CMS_VERSION_RESET`) are logged but never replace `LastError` |
| `SyncOrThrow()` | `async Task SyncOrThrow()` | Immediate result: throws `DatException` on failure. Single-flight — a concurrent call throws `DAT_CMS_SYNC_IN_PROGRESS` immediately without touching state |
| `Dispose()` / `DisposeAsync()` | `void Dispose()` / `async ValueTask DisposeAsync()` | Cancels the internal `CancellationTokenSource`, disposes the `PeriodicTimer`, awaits the sync loop task, disposes the underlying `DatManager`, and disposes the `HttpClient` only if it was owned (not supplied via `.Client(...)`). Prefer `await DisposeAsync()`; `Dispose()` blocks synchronously on it |

### Sync algorithm (as implemented)

1. Acquire a single-flight `SemaphoreSlim` (`WaitAsync(0)`); if already held, throw `DAT_CMS_SYNC_IN_PROGRESS` without changing state.
2. `GET {uri}?version={version}` with header `Authorization: {token}`, request-scoped cancellation from `RequestTimeoutSeconds`.
3. Non-2xx → status-mapped `DatException` (`401`→`DAT_CMS_UNAUTHORIZED`, `403`→`DAT_CMS_FORBIDDEN`, `404`→`DAT_CMS_ENDPOINT_NOT_FOUND`, `5xx`→`DAT_CMS_SERVER_ERROR`, else `DAT_CMS_HTTP_STATUS`). Connection failure or timeout → `DAT_CMS_UNREACHABLE`.
4. Response bytes must be non-empty and strict ASCII (every byte in `0x01..0x7f`), else `DAT_CMS_MALFORMED`.
5. First line up to `\n` must be a non-negative decimal `long` (`i64` range), else `DAT_CMS_MALFORMED`.
6. If the remainder after the first `\n` is empty, the version is **not** committed and the current certificates/issuer/version are preserved (version-only response).
7. Otherwise `_manager.Imports(newCertificates, clear: false)` is called; import failure is rethrown as `DAT_CMS_IMPORT_FAILED` with the original exception as `InnerException`. A response version lower than the current version is logged as `DAT_CMS_VERSION_RESET` before the merge, then committed after a successful import.

## Byte vs. string handling

`Issue`/`Parse` overloads accept either `byte[]` or `string` (UTF-8 encoded via `Encoding.UTF8`). Use the `byte[]` overloads and `Payload.PlainBytes`/`SecureBytes` for arbitrary/binary payloads — the `string` properties on `Payload` decode as UTF-8 and are not appropriate for non-UTF-8 binary data.
