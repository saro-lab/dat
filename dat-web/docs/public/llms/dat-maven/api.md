# dat-maven API Reference

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. Source-verified against `dat-maven/src/main/kotlin/me/saro/dat/`. Package identity: Maven `me.saro:dat`. All classes below are `me.saro.dat.dat.*` unless noted.

## `DatManager`

Certificate-holding manager. Thread-safe (`ReentrantReadWriteLock`). No network access; certificates are imported explicitly or through `DatCmsManager`.

```kotlin
DatManager.newInstance(): DatManager
```

### Instance methods

| Method | Signature | Behavior |
| --- | --- | --- |
| `issue` | `issue(plain: ByteArray, secure: ByteArray): DatResult<String>` | Issues with the manager's current issuer certificate. `DAT_MANAGER_NO_CERTIFICATE` if no certificates are held; `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` (with cause) if none is currently signable |
| `issue` | `issue(plain: String, secure: String): DatResult<String>` | UTF-8 convenience overload |
| `parse` | `parse(dat: Dat): DatResult<Payload>` / `parse(dat: String?): DatResult<Payload>` | Resolves certificate by `cid`, verifies signature, then decrypts `secure`. `DAT_CERT_NOT_FOUND` if the `cid` is unknown to this manager |
| `parseWithoutVerifying` | `parseWithoutVerifying(dat: Dat): DatResult<Payload>` / `(dat: String?)` | Decrypts without verifying the signature. **Never use this for authentication or authorization** — see `overview.md`'s linked protocol contract |
| `exportsIds` | `exportsIds(): List<Long>` | Held certificate IDs (decimal `Long`, not the hex wire form) |
| `exportsCertificates` | `exportsCertificates(): List<DatCertificate>` | Defensive-cloned snapshot of held certificates |
| `exports` | `exports(verifyOnly: Boolean): String` | Newline-joined wire-format certificate text; `verifyOnly = true` strips signing authority per algorithm rules |
| `imports` | `imports(format: String, clear: Boolean): Int` | Parses newline-delimited wire-format certificates and merges/replaces. Returns the count of newly added certificates. Throws `DatException(CERT_DUPLICATE_CID)` if the input itself repeats a `cid` |
| `imports` | `imports(certificates: List<DatCertificate>, clear: Boolean): Int` | Same merge semantics for already-parsed certificates |

`imports(..., clear = false)` is a `clear=false` merge: an existing `cid` in the manager wins over a repeated `cid` in the input, expired certificates are dropped, and the issuer is recomputed from the merged set — matching the CMS v1 import contract in the main protocol document.

### Static (companion) methods — certificate-scoped, no manager state

| Method | Signature |
| --- | --- |
| `DatManager.issue` | `issue(certificate: DatCertificate, plain: ByteArray, secure: ByteArray): DatResult<String>` |
| `DatManager.issue` | `issue(certificate: DatCertificate, plain: String, secure: String): DatResult<String>` |
| `DatManager.parse` | `parse(certificate: DatCertificate, dat: Dat): DatResult<Payload>` / `(certificate, dat: String?)` |
| `DatManager.parseWithoutVerifying` | `parseWithoutVerifying(certificate: DatCertificate, dat: Dat): DatResult<Payload>` / `(certificate, dat: String?)` |

## `DatCmsManager`

CMS v1 synchronizing manager. Implements `AutoCloseable`. Wraps an internal `DatManager` and exposes the same `issue`/`parse`/`parseWithoutVerifying` methods by delegation, plus CMS lifecycle.

```kotlin
DatCmsManager.builder(): DatCmsManagerBuilder
```

### `DatCmsManagerBuilder`

| Method | Default | Notes |
| --- | --- | --- |
| `uri(uri: String)` | `http://localhost:8088` | Must be `http`/`https`, path-less and query-less (path/query are appended internally: `/v1/certs` or `/v1/certs/verify-only`); otherwise throws `DatException(CONFIG_URI_INVALID)` |
| `token(token: String)` | `""` | Sent verbatim as the `Authorization` header value — no `Bearer` prefix |
| `verifyOnly(verifyOnly: Boolean)` | `false` | Selects `/v1/certs/verify-only` instead of `/v1/certs` |
| `httpClient(client: HttpClient)` | internally built | Supply your own `java.net.http.HttpClient`; the builder's `connectTimeoutSeconds`/redirect policy only apply to the internally-built client |
| `intervalSeconds(seconds: Long)` | `60` | Background sync period |
| `intervalOff()` | — | Sets interval to `0`, disabling the background scheduler entirely |
| `connectTimeoutSeconds(seconds: Long)` | `5` | Requires `>= 0`; applied only when the builder constructs its own `HttpClient` |
| `requestTimeoutSeconds(seconds: Long)` | `15` | Requires `>= 0`; `0` means no per-request timeout is set on the `HttpRequest` |
| `build(): DatCmsManager` | — | Performs one best-effort `sync()` synchronously before returning |

The internally-built `HttpClient` always sets `followRedirects(HttpClient.Redirect.NEVER)` — redirects are never followed regardless of `connectTimeoutSeconds`. A client supplied via `httpClient(...)` keeps its own redirect configuration.

### Instance methods

| Method | Signature | Behavior |
| --- | --- | --- |
| `getManager` | `getManager(): DatManager` | The underlying certificate manager, for direct `exports`/`exportsIds` access |
| `lastError` | `lastError(): DatException?` | Last non-state synchronization error; starts as `DatException(CMS_NOT_SYNCED)`, `null` after a successful sync |
| `getVersion` | `getVersion(): Long` | Current CMS cursor (signed `Long` — server/JVM profile is `0..Long.MAX_VALUE`) |
| `sync` | `sync()` | Non-throwing. Runs `syncOrThrow()` internally; on failure with `retry != STATE`, records the error via `lastError()` and logs at `error` level. `DAT_CMS_SYNC_IN_PROGRESS` (a `STATE` retry) is swallowed without touching `lastError` |
| `syncOrThrow` | `@Throws(DatException::class) syncOrThrow()` | Immediate-result synchronization. Throws on any failure, including `DAT_CMS_SYNC_IN_PROGRESS` if a sync is already running (single-flight via `tryLock()`) |
| `close` | `close()` (`AutoCloseable`) | Shuts down the scheduler (`shutdownNow()`, waits up to 15s), then acquires/releases the write lock to ensure no in-flight `syncOrThrow()` is left running |

`issue`/`parse`/`parseWithoutVerifying` on `DatCmsManager` simply delegate to `getManager()`'s methods of the same name and signature.

### Synchronization body parsing (as implemented)

`syncOrThrow()` requests `<uri>?version=<currentVersion>` with the configured `Authorization` header:

- Non-2xx status maps to `DAT_CMS_UNAUTHORIZED` (401), `DAT_CMS_FORBIDDEN` (403), `DAT_CMS_ENDPOINT_NOT_FOUND` (404), `DAT_CMS_SERVER_ERROR` (500–599), or `DAT_CMS_HTTP_STATUS` (any other non-2xx).
- Transport failure (connect, TLS, timeout, etc.) maps to `DAT_CMS_UNREACHABLE`.
- Empty body or any byte outside strict 7-bit ASCII (`> 0x7f` or a NUL byte) is `DAT_CMS_MALFORMED`.
- The first line up to `\n` must be a plain non-negative decimal `Long`; anything else is `DAT_CMS_MALFORMED`.
- If there is no certificate text after the version line, the sync is a no-op: the manager's certificates and version are left untouched.
- Otherwise, `manager.imports(newCertificates, clear = false)` is called; import failure is wrapped as `DAT_CMS_IMPORT_FAILED`. A server version lower than the client's current version only logs a warning (`DAT_CMS_VERSION_RESET`) — it does not throw, and the local version is still updated to the (lower) server value after a successful import.

## Byte handling

`plain`/`secure` accept `ByteArray` directly, or `String` via UTF-8 convenience overloads (`toByteArray(Charsets.UTF_8)`). Use the `ByteArray` overloads for arbitrary/binary payloads; do not round-trip binary data through the `String` overloads.

## `DatResult<T>`

Issue/parse methods return `me.saro.dat.exception.DatResult<T>`, a `Result`-style wrapper. Use `.getOrThrow()` to unwrap and propagate `DatException`, or `.fold(onSuccess = ..., onFailure = ...)` to handle both branches explicitly.
