# dat-npm Integration Checklist

This document targets DAT 4.7.x and later for `saro-dat`. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here. See [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt) for the full protocol contract.

## Runtime and packaging

- [ ] Run on **Node.js 24 or newer**. On Node 20/22 every Base64/hex encode-decode throws `TypeError`.
- [ ] Import as ESM: `import { ... } from 'saro-dat'`. There is no CommonJS build to `require()`.

## Role and certificate deployment

- [ ] Classify each service as an **issuer** or **verifier**.
- [ ] Issuers build with `.verifyOnly(false)` (default) against `/v1/certs` with a `TOKEN_CERT_FULL` token.
- [ ] Verifiers build with `.verifyOnly(true)` against `/v1/certs/verify-only` with a `TOKEN_CERT_VERIFY` token, only when ECDSA is used.
- [ ] Never deploy verify-only certificates to an issuer: `issue()` throws `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` with cause `DAT_CERT_VERIFY_ONLY`.
- [ ] Do not request HMAC verify-only export: `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure`.
- [ ] Put only non-sensitive routing/schema information in `plain`; it is Base64Url, not encryption.
- [ ] Put user IDs, authority snapshots, and other confidential data in `secure`.
- [ ] Use `payload.plainBytes`/`payload.secureBytes` (raw `ArrayBuffer`) for binary payloads; do not rely on `payload.plain`/`payload.secure` (UTF-8 string getters) when the schema is not guaranteed text.
- [ ] Do not construct a `Dat` and read its fields without calling `throwIfInvalid()` (or going through `DatManager.parse`, which calls it internally) — an unverified `Dat` exposes attacker-controlled `plainBytes`/`secureBytes`/`cid`/`expire`.
- [ ] Treat `DAT_TOKEN_EXPIRED` as normal refresh, and `e.securityEvent === true` (`DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH`) as security events.

## CMS manager startup and lifecycle

- [ ] Accept that `DatCmsManager.builder().build()` performs a best-effort `sync()` and resolves even if that sync failed — check `lastError()` after `build()` and choose an explicit startup policy.
- [ ] `lastError()` starts as `DAT_CMS_NOT_SYNCED`; a concrete failure may replace it before any success.
- [ ] For an operator action that must fail immediately, call `syncOrThrow()` directly instead of relying on the background `sync()`.
- [ ] Set `.connectTimeoutSeconds()` (default 5) and `.syncTimeoutSeconds()` (default 15); either aborts the underlying `fetch` `AbortController`.
- [ ] The transport always uses `fetch(..., { redirect: "manual" })` — it never follows redirects; there is no configuration to change this.
- [ ] Call `stop()` during application shutdown: it aborts any active request and clears the sync interval.

## Errors and retry

- [ ] Use `e.code` and `e.retry`, not message text, for branching logic.
- [ ] Retry/back off only transient CMS failures (`DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`); configuration/authentication/malformed/import failures are permanent.
- [ ] Treat `DAT_CMS_SYNC_IN_PROGRESS` and `DAT_CMS_VERSION_RESET` as state observations (`e.retry === "state"`), not failures.
- [ ] Alert on sustained transient failures: existing certificates keep working initially, but eventually expire.
- [ ] Keep `e.cause` for `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` and `DAT_CMS_IMPORT_FAILED` when logging.

## CMS configuration and rotation

- [ ] Configure `TOKEN_MASTER`, `TOKEN_CERT_FULL`, `TOKEN_CERT_VERIFY` on the CMS server side; this client only ever sends one token via `.token()`.
- [ ] Never leave a production role list empty on the server.
- [ ] Rotate with a **new `cid`**. `importCertificates`/`imports` keep the existing certificate if the server repeats a `cid` with a different key.
- [ ] `.intervalSeconds(0)` / `.intervalOff()` disables background sync — only use this when the application drives synchronization itself.

## Release and environment validation

- [ ] Preserve protocol compatibility: do not introduce a new DAT field, endpoint contract, or error-code meaning.
- [ ] Pin `package.json` to a `saro-dat` version within the `4.7.x` line.
- [ ] Verify the target runtime is Node.js 24+ and that the build/bundler preserves ESM (`"type": "module"`); a CommonJS `require('saro-dat')` will fail.

See [api.md](./api.md) for exact APIs and [errors.md](./errors.md) for the full error catalog.
