# dat-go Integration Checklist

This document targets DAT 4.7.x and later, for `github.com/saro-lab/dat/dat-go/v4`. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible.

## Role and certificate deployment

- [ ] Classify each service as an **issuer** (calls `Issue`) or **verifier** (only calls `Parse`/`ParseDat`).
- [ ] Issuers build with `NewDatCmsManagerBuilder()...VerifyOnly(false).Build()` (the default) to synchronize `/v1/certs`.
- [ ] Verifiers that need ECDSA verify-only distribution use `.VerifyOnly(true)` to synchronize `/v1/certs/verify-only`.
- [ ] Never deploy a verify-only-synced manager as an issuer: `Issue` fails with `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, cause `DAT_CERT_VERIFY_ONLY`.
- [ ] Do not call `(*Certificate).Export(true)` / `ExportVerifyOnlyKey()` on an HMAC certificate/key: it fails with `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`.

## Payload and token handling

- [ ] Define and version the byte schema for both `plain` and `secure`.
- [ ] Put only non-sensitive routing/schema information in `plain` passed to `Issue`; it is Base64Url, not encryption.
- [ ] Put user IDs, authority snapshots, and other confidential data in `secure`.
- [ ] `Issue`/`Parse` in this client use Go `string` for `plain`/`secure`; if the payload is binary rather than text, encode/decode it explicitly at the call site rather than assuming implicit UTF-8 safety.
- [ ] Do not use `ParseWithoutVerify`/`ParseDatWithoutVerify`/`ParseWithoutVerifyWithCertificate` output for authentication/authorization.
- [ ] Treat `dat.CodeTokenExpired` as normal refresh, and `dat.CodeSigMismatch`/`dat.CodeCryptoTagMismatch` (`dat.SecurityEvent(err) == true`) as security events.

## CMS manager startup and lifecycle

- [ ] Accept that `Build()`'s internal `Sync()` is best-effort: it always returns a live `*CmsManager` even on failure. Call `LastError()` after `Build()` and decide an explicit startup policy (fail fast vs. degrade).
- [ ] Treat `dat.ErrCmsNotSynced` as the manager's pre-attempt state (`LastError()` starts there). A concrete failure replaces it before any success.
- [ ] For a code path that must observe sync failure immediately (not just via `LastError()`), call `Sync() error` directly — there is no separate "OrThrow" variant in Go; `Sync()` already returns the concrete error.
- [ ] Configure `.ConnectTimeout(5*time.Second)` and `.Timeout(15*time.Second)` (the builder's own defaults) explicitly if the deployment needs different values; `0` disables the corresponding limit.
- [ ] Account for redirect policy: the builder's HTTP client rejects any redirect that is not same-origin with the configured base URL, and any chain of 10 or more hops (`DAT_CMS_UNREACHABLE`).
- [ ] Call `Close()` on shutdown — it cancels the background-sync context and waits for the sync goroutine via `sync.WaitGroup` before returning.

## Errors and retry

- [ ] Use `dat.Code(err)` / `dat.Retry(err)` / `dat.SecurityEvent(err)`, or `errors.Is(err, dat.ErrXxx)`, not `err.Error()` string matching.
- [ ] Retry/back off only transient CMS failures (`dat.CodeCmsUnreachable`, `dat.CodeCmsServerError`); configuration/authentication/malformed/import failures are permanent.
- [ ] Treat `dat.CodeCmsSyncInProgress` and `dat.CodeCmsVersionReset` as state observations (`dat.RetryState`), not failures.
- [ ] Alert on sustained transient failures: existing certificates keep working initially but eventually expire.
- [ ] For `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`, unwrap `Cause` (`errors.Unwrap`/`errors.Is`) to distinguish `DAT_CERT_NOT_YET_ISSUABLE` (wait) from the permanent causes (`DAT_CERT_ISSUANCE_ENDED`, `DAT_CERT_EXPIRED`, `DAT_CERT_VERIFY_ONLY`).
- [ ] For `DAT_CMS_IMPORT_FAILED`, unwrap `Cause` to see the rejected certificate's underlying error (e.g. `DAT_CERT_MALFORMED`, `DAT_CERT_DUPLICATE_CID`, `DAT_KEY_INVALID`).

## CMS configuration and rotation

- [ ] Configure the CMS server's `TOKEN_MASTER`/`TOKEN_CERT_FULL`/`TOKEN_CERT_VERIFY` roles server-side; pass this client's matching bearer value via `.Token(...)`.
- [ ] Never leave a production role list empty on the server; an empty list logs `DAT_AUTH_DISABLED` there and opens only that role's protected APIs.
- [ ] `.Url(rawUrl)` must be path-less and query-less (e.g. `http://localhost:8088`, not `http://localhost:8088/v1`); it returns `DAT_CONFIG_URI_INVALID` otherwise.
- [ ] Rotate keys with a **new `cid`**; this client's merge (`clear=false`) keeps the existing certificate if the server repeats a `cid` with different key material.
- [ ] Set a propagation delay on the CMS server before a new certificate can issue, accounting for this client's `.Interval(...)` and any outage budget.

## Release and environment validation

- [ ] Preserve protocol compatibility: do not introduce a new DAT field, endpoint contract, or error-code meaning.
- [ ] Requires Go `1.25`+ (uses `ecdsa.ParseRawPrivateKey`/`ParseUncompressedPublicKey`/`(*ecdsa.Key).Bytes`).
- [ ] Treat CMS version as a monotonic cursor (`GetVersion() uint64`), not a row count.

See [api.md](./api.md) for exact method signatures and [errors.md](./errors.md) for the full error catalog.
