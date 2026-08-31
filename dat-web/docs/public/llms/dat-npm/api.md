# dat-npm API Reference

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here. Source-verified against `dat-npm/src`. All methods that touch cryptography or CMS I/O are `async` and return `Promise`.

## `Dat`

Parses and structurally validates a token string; never throws in the constructor.

| Member | Signature | Notes |
| --- | --- | --- |
| `constructor` | `new Dat(dat: string \| undefined \| null)` | Splits into 5 fields, decodes `expire`/`cid`/Base64Url fields. On any structural failure sets `this.error` instead of throwing. |
| `format` | `boolean` | `true` only if all 5 fields parsed successfully. |
| `error` | `DatError \| null` | Set when `format` is `false`. |
| `throwIfInvalid()` | `(): void` | Throws `this.error` if set. |
| `static from(dat: Dat \| string \| undefined \| null)` | `Dat` | Returns the input unchanged if already a `Dat`. |
| `expired()` | `(): boolean` | `true` if malformed or `expire <= now`. |
| `body()` | `(): string` | The signed prefix `expire.cid.plain.secure` (substring before the last dot). |
| `expire`, `cid`, `plainBytes`, `secureBytes`, `signature` | — | Decoded fields (`cid: bigint`, byte fields as `ArrayBuffer`). |

## `DatPayload`

| Member | Signature | Notes |
| --- | --- | --- |
| `plainBytes`, `secureBytes` | `ArrayBuffer` | Raw decoded bytes; use these for binary payloads or to avoid invalid-UTF-8 conversion. |
| `plain`, `secure` | `string` (getters) | UTF-8 decode of the corresponding bytes. |
| `toString()` | `(): string` | `"<plain base64url> <secure base64url>"`. |
| `toUnsafeString()` | `(): string` | `"<plain utf8> <secure utf8>"`. |

## `DatManager`

In-memory certificate set with issue/parse and CMS-style merge import. Not itself a CMS client.

| Member | Signature | Notes |
| --- | --- | --- |
| `constructor(issuer?, certificates?)` | `new DatManager(issuer: DatCertificate \| null = null, certificates: DatCertificate[] = [])` | |
| `static from(certificates: DatCertificate[])` | `DatManager` | Convenience: builds an empty manager, then `importCertificates(certificates, true)`. |
| `imports(format: string, clear = false)` | `Promise<number>` | Parses newline-separated certificate wire text, then calls `importCertificates`. |
| `importCertificates(certificates: DatCertificate[], clear = false)` | `number` | Throws `DAT_CERT_DUPLICATE_CID` if the input list itself repeats a `cid`. `clear=false` merges: existing `cid`s win, new ones are added, expired ones are dropped. Returns the count of newly added (or, if `clear`, total) certificates. Recomputes the selected issuer as the last signable+issuable certificate. |
| `exports(verifyOnly = false)` | `Promise<string>` | Newline-joined certificate wire lines. |
| `find(cid: bigint)` | `DatCertificate \| null` | |
| `issue(plain, secure)` | `Promise<string>` | `plain`/`secure`: `ArrayBufferLike \| Uint8Array \| string \| null \| undefined`. Throws `DAT_MANAGER_NO_CERTIFICATE` if empty, or `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` (with cause) if none is currently signable. |
| `parse(dat: Dat \| string \| undefined \| null)` | `Promise<DatPayload>` | Throws `DAT_CERT_NOT_FOUND` if no certificate matches the token's `cid`. |
| `static issue(certificate, plain, secure)` | `Promise<string>` | Issue against one certificate directly, bypassing manager state. |
| `static parse(certificate, dat)` | `Promise<DatPayload>` | Verify/decrypt against one certificate directly. Throws `DAT_TOKEN_EXPIRED`, `DAT_SIG_BACKEND` (verification could not run), or `DAT_SIG_MISMATCH`. |

## `DatCmsManager` / `DatCmsManagerBuilder`

CMS v1 synchronization client built on `fetch`.

```typescript
const cms = await DatCmsManager.builder()
  .uri('http://localhost:8088')
  .token('fullToken')
  .verifyOnly(false)          // false -> /v1/certs, true -> /v1/certs/verify-only
  .intervalSeconds(60)        // 0 or intervalOff() disables background sync
  .connectTimeoutSeconds(5)
  .syncTimeoutSeconds(15)
  .logger(console)            // optional; must implement debug/info/warn/error
  .build()
```

| Member | Signature | Notes |
| --- | --- | --- |
| `DatCmsManager.builder()` | `DatCmsManagerBuilder` | |
| `.uri(uri: string)` | `this` | Must be `http`/`https`, path-less, query-less, or throws `DAT_CONFIG_URI_INVALID`. |
| `.token(token: string)` | `this` | Sent verbatim in `Authorization` (no `Bearer` prefix). |
| `.verifyOnly(boolean)` | `this` | Selects `/v1/certs` vs `/v1/certs/verify-only`. |
| `.intervalSeconds(n)` / `.intervalOff()` | `this` | Background sync period; default `60`. `0`/`intervalOff()` disables it. |
| `.connectTimeoutSeconds(n)` / `.syncTimeoutSeconds(n)` | `this` | Default `5`/`15`; each maps to a `setTimeout` that aborts the `fetch` `AbortController`. |
| `.logger(logger)` | `this` | Object with `debug`/`info`/`warn`/`error`; defaults to a no-op logger. |
| `async build()` | `Promise<DatCmsManager>` | Performs one best-effort `sync()` before returning. Sync failure does **not** reject `build()`; check `lastError()`. Starts the interval scheduler if `intervalSeconds > 0`. |
| `getManager()` | `DatManager` | The underlying manager (also usable directly for `issue`/`parse`). |
| `getVersion()` | `number` | Current CMS cursor. |
| `lastError()` | `DatError \| null` | Last non-state sync failure; `null` after a successful sync. Starts as `DAT_CMS_NOT_SYNCED`. |
| `async issue(plain, secure)` | `Promise<string>` | Delegates to the internal `DatManager`. |
| `async parse(dat)` | `Promise<DatPayload>` | Delegates to the internal `DatManager`. |
| `async sync()` | `Promise<void>` | Non-throwing: calls `syncOrThrow()` internally, records non-state failures into `lastError()`, and logs them. Never rejects. |
| `async syncOrThrow()` | `Promise<void>` | Throws `DatError` on failure. Single-flight: an overlapping call throws `DAT_CMS_SYNC_IN_PROGRESS` without touching `lastError()`. |
| `stop()` | `void` | Aborts any in-flight request, clears the interval, marks the manager stopped. |

### Sync behavior notes

- Transport uses `fetch` with `redirect: "manual"` — the client never follows redirects.
- The response body must decode as strict ASCII (`TextDecoder("ascii", {fatal: true})`); any byte `> 0x7f` is `DAT_CMS_MALFORMED`.
- A version-only body (no certificate lines) is accepted without changing certificates/version.
- A lower server version than the client's current version logs `DAT_CMS_VERSION_RESET` and still merges.
- HTTP status mapping: `401` → `DAT_CMS_UNAUTHORIZED`, `403` → `DAT_CMS_FORBIDDEN`, `404` → `DAT_CMS_ENDPOINT_NOT_FOUND`, `500..599` → `DAT_CMS_SERVER_ERROR`, any other non-2xx → `DAT_CMS_HTTP_STATUS`. Network/transport failure and non-ASCII/unreadable body → `DAT_CMS_UNREACHABLE`.
