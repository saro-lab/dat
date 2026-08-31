# DAT Ruby — Integration Checklist

This document targets DAT 4.7.x and later for the `saro-dat` gem. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. This is the Ruby-specific checklist; see `dat-web/docs/public/llms.txt` for the protocol-wide checklist this extends.

## Role and certificate deployment

- [ ] Classify the service as **issuer** or **verifier**; build the `DatCmsManager` with `.verify_only(true)` for a verifier (targets `/v1/certs/verify-only` and requires only a `TOKEN_CERT_VERIFY` credential).
- [ ] Never point an issuer's manager at `/v1/certs/verify-only`: `manager.issue` will raise `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` with cause `DAT_CERT_VERIFY_ONLY` once only verify-only ECDSA certificates are held.
- [ ] Do not call `DatCertificate#exports(true)` (verify-only export) on an HMAC certificate: `DatSignature` raises `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure` payload arguments to `issue`.
- [ ] Put only non-sensitive routing/schema information in the `plain` argument; it is Base64Url-encoded, not encrypted.
- [ ] Put user IDs, authority snapshots, and other confidential data in the `secure` argument.
- [ ] Use `DatPayload#plain_bytes`/`#secure_bytes` (raw `ASCII-8BIT` bytes) instead of `#plain`/`#secure` when the payload is binary or not guaranteed valid UTF-8 — `#plain`/`#secure` only `force_encoding('utf-8')` and do not validate or raise on invalid UTF-8.
- [ ] Do not use `Saro::Dat::Dat.new(token)` / `#raise_if_invalid!` output for authentication or authorization — it does not verify the signature. Always go through `DatManager#parse` or `DatCmsManager#parse`.
- [ ] Rescue `Saro::Dat::Error` and branch on `.code`, not on `.message` text. Treat `DAT_TOKEN_EXPIRED` as a normal refresh signal, and `DAT_SIG_MISMATCH` / `DAT_CRYPTO_TAG_MISMATCH` (`.security_event?` true) as security events worth alerting on.

## CMS manager startup and lifecycle

- [ ] Build the manager with `Saro::Dat::DatCmsManager.builder...build` (not the raw constructor) so the `/v1/certs` or `/v1/certs/verify-only` path is appended correctly.
- [ ] Accept that construction runs one best-effort `sync` synchronously: a network/auth/parse failure does not raise from `build`; it is recorded in `manager.last_error`. Check `last_error` after construction if the application needs to gate readiness on an initial successful sync.
- [ ] For an operator action that must fail immediately (e.g. an admin "force refresh" endpoint), call `manager.sync_or_raise` and rescue `Saro::Dat::Error` — do not rely on the background-thread `sync`, which only records `last_error`.
- [ ] Configure `connect_timeout_seconds` (default `5`) and `sync_timeout_seconds` (default `15`) explicitly for production; `0` disables the corresponding `Net::HTTP` timeout.
- [ ] `Net::HTTP` does not follow redirects. If the CMS endpoint sits behind a redirecting proxy, fix the base URI rather than expecting the client to follow `3xx` responses.
- [ ] Call `manager.stop` during application shutdown (e.g. in a `SIGTERM`/`at_exit` handler). `stop` is idempotent, closes any in-flight connection, and joins the background thread with a bounded 1-second timeout.

## Errors and retry

- [ ] Retry/back off only `DAT_CMS_UNREACHABLE` and `DAT_CMS_SERVER_ERROR` (`.retry == :transient`); treat configuration, authentication, malformed-response, and import failures (`.retry == :permanent`) as non-retryable.
- [ ] Treat `DAT_CMS_SYNC_IN_PROGRESS` and `DAT_CMS_VERSION_RESET` (`.retry == :state`) as observations, not failures — do not error-loop on them.
- [ ] Alert on a sustained non-`nil` `manager.last_error`: currently held certificates keep working until they expire, then issuance/verification starts failing.
- [ ] For `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` and `DAT_CMS_IMPORT_FAILED`, inspect `.cause` (a chained `Saro::Dat::Error` or the original exception) rather than discarding it.

## Release and environment validation

- [ ] Pin `gem "saro-dat", "~> 4.7"` (or the exact patch version in use) so any 4.7.x upgrade stays wire- and API-compatible.
- [ ] The 4.7.0 test suite passed 76 test runs / 1,795 assertions on Ruby `3.1.7`; re-validate on the deployment's actual Ruby minor version, and confirm `openssl` gem `~> 4.0.2` compatibility on that platform.
- [ ] Preserve protocol compatibility: do not introduce a new DAT field, endpoint contract, or error-code meaning as a "Ruby-side" change.

See `overview.md` for install/usage, `api.md` for exact method signatures, and `errors.md` for the full error catalog.
