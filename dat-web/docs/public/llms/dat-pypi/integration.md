# dat-pypi integration checklist

Python-specific checklist derived from the shared DAT integration checklist ([dat.saro.me/llms.txt](https://dat.saro.me/llms.txt)). See [api.md](./api.md) for exact signatures and [errors.md](./errors.md) for the error catalog.

## Role and certificate deployment

- [ ] Classify the service as an **issuer** or **verifier** before choosing `verify_only(False)` (full certificates, `/v1/certs`) or `verify_only(True)` (`/v1/certs/verify-only`) on `DatCmsManager.builder()`.
- [ ] Never deploy a verify-only manager as an issuer: `issue()` raises `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` with cause `DAT_CERT_VERIFY_ONLY`.
- [ ] Do not request HMAC verify-only export: `DatCertificate.exports(verify_only=True)` on an HMAC key raises `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure` passed to `issue()`.
- [ ] Put only non-sensitive routing/schema information in `plain`; it is Base64Url, not encryption.
- [ ] Put user IDs, authority snapshots, and other confidential data in `secure`.
- [ ] Read `DatPayload.plain_bytes` / `.secure_bytes` for binary payloads; the `.plain` / `.secure` string properties raise `UnicodeDecodeError` on invalid UTF-8 instead of silently converting.
- [ ] Never treat an unverified `Dat(...)` instance's fields as trusted; only use `DatManager.parse(...)`'s returned `DatPayload`.
- [ ] Treat `DAT_TOKEN_EXPIRED` as normal refresh, and `DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH` (`e.security_event is True`) as security events.

## CMS manager startup and lifecycle

- [ ] Accept that `DatCmsManager.builder().build()` performs a best-effort `sync()` internally and always returns a usable manager, even if that first sync failed. Read `manager.last_error()` and decide an explicit startup policy.
- [ ] `last_error()` starts as `DAT_CMS_NOT_SYNCED`; a concrete failure may replace it before any success; a success clears it to `None`.
- [ ] For an operation that must fail immediately (e.g. an operator-triggered manual refresh), call `sync_or_raise()` instead of `sync()`.
- [ ] Set `connect_timeout_seconds` (default `5`) and `sync_timeout_seconds` (default `15`) on the builder. **`urllib` enforces only one socket-operation timeout** — `sync_timeout_seconds` if non-zero, else `connect_timeout_seconds`, else no timeout — not independent connect/total phases. Do not assume finer-grained timeout control than this.
- [ ] Redirects: the manager only follows same-origin (`scheme://netloc` match) redirects; a cross-origin redirect fails as `DAT_CMS_UNREACHABLE`.
- [ ] Call `manager.stop()` during application shutdown. It cancels the pending timer but does **not** forcibly cancel a blocked in-flight `urllib` call — a sync already in progress can still block for up to the configured timeout after `stop()` returns.

## Errors and retry

- [ ] Use `e.code` and `e.retry` (a `DatRetry` enum, comparable to its `"transient"`/`"permanent"`/`"state"` string value), not exception message text.
- [ ] Retry/back off only `DAT_CMS_UNREACHABLE` and `DAT_CMS_SERVER_ERROR`; treat configuration/authentication/malformed/import failures as permanent.
- [ ] Treat `DAT_CMS_SYNC_IN_PROGRESS` and `DAT_CMS_VERSION_RESET` as state observations (`e.retry == DatRetry.STATE`), not failures to alert on.
- [ ] Alert on sustained transient failures: existing certificates keep working initially but eventually expire without a successful sync.
- [ ] For `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, inspect `e.__cause__.code` to distinguish `DAT_CERT_NOT_YET_ISSUABLE` (transient) from the permanent causes.

## CMS configuration and rotation

- [ ] Configure the correct role token (`TOKEN_MASTER`, `TOKEN_CERT_FULL`, or `TOKEN_CERT_VERIFY`) on the CMS server side for the endpoint this manager calls; `token(str)` sends the raw value in `Authorization` with no `Bearer` prefix.
- [ ] Rotate keys with a **new `cid`**; a response repeating an existing `cid` with different key material is ignored by `DatManager.import_certificates`'s merge (existing `cid` wins).
- [ ] Use `interval_seconds(0)` / `interval_off()` deliberately if disabling background sync; otherwise leave the 60-second default.

## Release and environment validation

- [ ] Confirm the installed `saro-dat` version is 4.7.x or later; any 4.7.x release is fully wire- and API-compatible with this document.
- [ ] Require Python `>=3.10` per `pyproject.toml`; the source suite is validated on 3.10–3.13.
- [ ] Re-test shutdown-latency assumptions in the target deployment given the `urllib` non-forcible-cancellation limitation above.
