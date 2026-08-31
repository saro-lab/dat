# dat-maven Integration Checklist

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible.

JVM-specific checklist. Applies on top of the platform-agnostic rules in [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt).

## Role and certificate deployment

- [ ] Classify the service as an **issuer** or **verifier** before choosing `verifyOnly(false)` (`/v1/certs`, needs `TOKEN_CERT_FULL`) or `verifyOnly(true)` (`/v1/certs/verify-only`, needs `TOKEN_CERT_VERIFY`) on `DatCmsManager.builder()`.
- [ ] Never point an issuer at verify-only certificates: `DatManager.issue(...)` returns `DatResult.failure` with `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` (cause `DAT_CERT_VERIFY_ONLY`) when every held certificate lacks a signing key.
- [ ] Do not request HMAC verify-only export via `exports(verifyOnly = true)` expecting a usable public form — HMAC has no public key; verify-only export of an HMAC certificate is unsupported (`DAT_KEY_VERIFY_ONLY_UNSUPPORTED`).

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure`.
- [ ] Use the `ByteArray` overloads of `issue`/`parse` for binary payloads; the `String` overloads assume UTF-8 and are for text only.
- [ ] Never use `parseWithoutVerifying(...)` output for authentication or authorization — its `Payload` is attacker-controlled until a `parse(...)` signature check succeeds.
- [ ] Treat `DAT_TOKEN_EXPIRED` as a normal refresh signal, and `e.securityEvent == true` (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`) as a security event worth alerting on.

## `DatCmsManager` lifecycle

- [ ] `DatCmsManagerBuilder.build()` runs one best-effort `sync()` synchronously and always returns a usable manager, even if that sync failed. Read `lastError()` and decide an explicit startup policy (fail fast vs. degrade) rather than assuming certificates are present.
- [ ] `lastError()` starts as `DatException(CMS_NOT_SYNCED)`. A concrete failure replaces it; a successful sync clears it to `null`. `DAT_CMS_SYNC_IN_PROGRESS` (a `STATE` retry) never replaces `lastError()`.
- [ ] For an operator action that must fail immediately, call `syncOrThrow()` (throws `DatException`) instead of `sync()` (records the error and returns).
- [ ] Configure `connectTimeoutSeconds` (default `5`) and `requestTimeoutSeconds` (default `15`) explicitly for production; both only take effect on the internally-built `HttpClient` — a client passed via `httpClient(...)` must set its own timeouts.
- [ ] The internally-built client never follows redirects (`HttpClient.Redirect.NEVER`); if you supply your own `HttpClient`, disable redirects there too unless you have a specific reason not to.
- [ ] Call `close()` (it is `AutoCloseable` — use `use { ... }` in Kotlin or try-with-resources in Java) on shutdown. It stops the scheduler and waits up to 15 seconds for termination.

## Errors and retry

- [ ] Match on `e.code` (the `DAT_*` string), never on `e.message`.
- [ ] Retry/back off only `DatRetry.TRANSIENT` failures (`DAT_CMS_UNREACHABLE`, `DAT_CMS_SERVER_ERROR`, `DAT_MANAGER_NO_CERTIFICATE`, `DAT_CERT_NOT_YET_ISSUABLE`, `DAT_CERT_NOT_SYNCED`, `DAT_CMS_NOT_SYNCED`); configuration/authentication/malformed/import failures are `PERMANENT`.
- [ ] Treat `DatRetry.STATE` (`DAT_CMS_SYNC_IN_PROGRESS`, `DAT_CMS_VERSION_RESET`) as observations, not failures — do not error-loop on them.
- [ ] Alert on a sustained non-null `lastError()`: existing certificates keep working until they expire, then issuance/verification starts failing.
- [ ] For `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, inspect `e.cause` (a `DatException`) to distinguish `CERT_NOT_YET_ISSUABLE` (wait) from `CERT_ISSUANCE_ENDED`/`CERT_EXPIRED`/`CERT_VERIFY_ONLY` (fix the deployment).

## CMS configuration and rotation

- [ ] Configure `TOKEN_MASTER`, `TOKEN_CERT_FULL`, `TOKEN_CERT_VERIFY` on the CMS server side to match this client's role. Send the raw token value as the `Authorization` header via `token(...)` — no `Bearer` prefix.
- [ ] Never leave a production CMS role list empty; an empty list logs `DAT_AUTH_DISABLED` server-side and opens that role's endpoints unauthenticated.
- [ ] Rotate keys with a **new `cid`**; `DatManager.imports(..., clear = false)` keeps the existing certificate when the server repeats a `cid` with different key material.
- [ ] Set `intervalSeconds(...)` (default `60`) to a value your outage budget tolerates, or `intervalOff()` plus your own scheduling if you need full control.

## Release validation

- [ ] Do not change CMS v1 paths, error-code meanings, or wire serialization as a refactor — see the shared protocol rules.

See [API reference](./api.md) for exact method signatures and [Errors](./errors.md) for the full code catalog.
