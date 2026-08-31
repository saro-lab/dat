# dat-go Error Reference

This document targets DAT 4.7.x and later, for `github.com/saro-lab/dat/dat-go/v4`. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. This file gives the Go-specific error type plus the full 57-code public catalog (47 client/common codes + 10 CMS-server codes) shared by every DAT client.

## The `dat.Error` type

```go
type Error struct {
	Code   string
	Detail string
	Cause  error
}
```

Every public failure implements Go's `error` interface as `*dat.Error`. Use `errors.As`/`errors.Is`, or the package-level accessors, rather than string-matching `Error()`:

```go
package accessors

func Code(err error) string                 // "" if err is not a *dat.Error
func Retry(err error) dat.RetryClass         // RetryPermanent if err is not a *dat.Error
func SecurityEvent(err error) bool           // false if err is not a *dat.Error
func IsCritical(err error) bool              // true if err is a non-nil error that is not a *dat.Error
```

```go
if _, err := manager.Parse(datStr); err != nil {
	switch dat.Code(err) {
	case dat.CodeTokenExpired:
		// normal refresh path
	case dat.CodeSigMismatch, dat.CodeCryptoTagMismatch:
		// security event — dat.SecurityEvent(err) == true
	}
	if dat.Retry(err) == dat.RetryTransient {
		// back off and retry
	}
}
```

`RetryClass` is `RetryPermanent`, `RetryTransient`, or `RetryState` (iota order: `0`, `1`, `2` — do not depend on the numeric value, compare against the named constants). Sentinel values (`dat.ErrTokenExpired`, `dat.ErrCmsUnreachable`, ...) exist for every code and support `errors.Is(err, dat.ErrTokenExpired)`; `(*Error).Unwrap()` exposes `Cause` for `errors.Is`/`errors.As` chains, e.g. unwrapping `dat.ErrManagerNoIssuableCertificate` to find the underlying `dat.ErrCertNotYetIssuable`.

`IsCritical(err)` is a Go-specific convenience not documented in the cross-language catalog below: it reports `false` (non-critical, expected-at-runtime) for `DAT_TOKEN_MALFORMED`, `DAT_TOKEN_EXPIRED`, `DAT_SIG_MISMATCH`, `DAT_SIG_MALFORMED`, `DAT_CRYPTO_TAG_MISMATCH`, `DAT_CRYPTO_DATA_INVALID`, `DAT_CERT_NOT_FOUND`, and `DAT_CERT_NOT_SYNCED`; every other code, and any non-`*dat.Error`, is `true`. Use it only for log-severity triage, never as a substitute for `Code`/`Retry`.

## Retry and state classes

| Retry class | Meaning | Required handling |
| --- | --- | --- |
| `RetryPermanent` | Repeating the same operation with the same input will not fix it | Correct input, configuration, deployment, or runtime |
| `RetryTransient` | The condition may clear without a configuration change | Back off and retry |
| `RetryState` | Observation, not an operation failure | Record if useful; do not error-loop |

Only `DAT_CMS_VERSION_RESET` and `DAT_CMS_SYNC_IN_PROGRESS` use `RetryState`.

## Security-event flag

`dat.SecurityEvent(err)` returns `true` for exactly two codes: `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH`. Every other code returns `false`, even malformed input, unknown `cid`, invalid keys, or authorization failures.

## TOKEN — 3 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_TOKEN_MALFORMED` | `CodeTokenMalformed` | permanent | Token is not exactly five fields; `expire` is not strict ASCII decimal `uint64`; `cid` is not strict ASCII hexadecimal `uint64`; a Base64Url field is invalid; or another token structural rule fails |
| `DAT_TOKEN_EXPIRED` | `CodeTokenExpired` | permanent | `expire <= now`; equality is already expired |
| `DAT_TOKEN_UNKNOWN` | `CodeTokenUnknown` | permanent | Unexpected token-area fallback |

## CERT — 9 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CERT_MALFORMED` | `CodeCertMalformed` | permanent | Certificate is not exactly eight fields; numeric or key Base64Url parsing fails; or checked `start + duration` / `end + ttl` overflows `uint64` |
| `DAT_CERT_EXPIRED` | `CodeCertExpired` | permanent | `start + duration + ttl < now`; the certificate can neither issue nor verify. Equality remains valid |
| `DAT_CERT_NOT_YET_ISSUABLE` | `CodeCertNotYetIssuable` | transient | `now < start`; the inclusive issuance window has not opened |
| `DAT_CERT_ISSUANCE_ENDED` | `CodeCertIssuanceEnded` | permanent | `now > start + duration` while certificate TTL remains; verification is possible but issuance is not |
| `DAT_CERT_VERIFY_ONLY` | `CodeCertVerifyOnly` | permanent | ECDSA certificate has no signing private key; verification/decryption is possible but issuance is not |
| `DAT_CERT_NOT_FOUND` | `CodeCertNotFound` | permanent | Manager has no certificate for the token `cid` |
| `DAT_CERT_NOT_SYNCED` | `CodeCertNotSynced` | transient | The certificate `cid` is expected from CMS but has not arrived yet |
| `DAT_CERT_DUPLICATE_CID` | `CodeCertDuplicateCid` | permanent | One import input contains the same `cid` more than once; the import is rejected |
| `DAT_CERT_UNKNOWN` | `CodeCertUnknown` | permanent | Unexpected certificate-area fallback |

## SIG — 5 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_SIG_MISMATCH` | `CodeSigMismatch` | permanent | HMAC comparison or ECDSA verification reports mismatch; security event |
| `DAT_SIG_MALFORMED` | `CodeSigMalformed` | permanent | Signature field is empty, invalid Base64Url, or has an algorithm-invalid fixed signature layout/length |
| `DAT_SIG_KEY_MISSING` | `CodeSigKeyMissing` | permanent | Signing was requested from an ECDSA public-only key |
| `DAT_SIG_BACKEND` | `CodeSigBackend` | permanent | The signature/verification operation could not execute because of key-handle, key-type, or crypto-backend failure |
| `DAT_SIG_UNKNOWN` | `CodeSigUnknown` | permanent | Unexpected signature-area fallback |

## CRYPTO — 4 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_CRYPTO_TAG_MISMATCH` | `CodeCryptoTagMismatch` | permanent | AES-GCM authentication tag verification failed; security event |
| `DAT_CRYPTO_DATA_INVALID` | `CodeCryptoDataInvalid` | permanent | Non-empty encrypted bytes are too short for the 12-byte IV or exceed an implementation input limit |
| `DAT_CRYPTO_BACKEND` | `CodeCryptoBackend` | permanent | AES-GCM operation/context is unavailable or failed to initialize/execute |
| `DAT_CRYPTO_UNKNOWN` | `CodeCryptoUnknown` | permanent | Unexpected encryption-area fallback |

An empty `secure` field is valid and round-trips as empty bytes; it produces no error.

## KEY — 3 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_KEY_INVALID` | `CodeKeyInvalid` | permanent | Key length or structure does not match its algorithm: HMAC 32/48/64 bytes, AES 16/32 bytes, ECDSA point/scalar/uncompressed format/pair invalid |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | `CodeKeyVerifyOnlyUnsupported` | permanent | Verify-only export was requested for HMAC, which has no public-key form |
| `DAT_KEY_UNKNOWN` | `CodeKeyUnknown` | permanent | Unexpected key-area fallback |

## MANAGER — 4 codes

| Code | Constant | Retry | Exact meaning |
| --- | --- | --- | --- |
| `DAT_MANAGER_NO_CERTIFICATE` | `CodeManagerNoCertificate` | transient | Manager holds no certificates, commonly before import or after initial CMS sync failure |
| `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` | `CodeManagerNoIssuableCertificate` | derived from cause | Certificates exist, but none is currently usable for issuance |
| `DAT_MANAGER_DISPOSED` | `CodeManagerDisposed` | permanent | An already disposed/freed manager or certificate was used |
| `DAT_MANAGER_UNKNOWN` | `CodeManagerUnknown` | permanent | Unexpected manager-area fallback |

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`'s retry class is transient only when `errors.Is(err.Cause, dat.ErrCertNotYetIssuable)`; otherwise permanent. Unwrap `Cause` to inspect it:

| Cause | Meaning | Retry/action |
| --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Signing-capable certificate exists, but its window starts later | transient; wait |
| `DAT_CERT_ISSUANCE_ENDED` | Signing windows ended | permanent; distribute a successor |
| `DAT_CERT_EXPIRED` | Held certificates are expired | permanent; refresh certificates |
| `DAT_CERT_VERIFY_ONLY` | No held certificate contains signing authority | permanent; correct issuer deployment |

## CONFIG — 4 codes

All permanent.

| Code | Constant | Exact meaning |
| --- | --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED` | `CodeConfigAlgUnsupported` | Algorithm name is not one of the exact DAT wire names |
| `DAT_CONFIG_ARGUMENT_INVALID` | `CodeConfigArgumentInvalid` | Required argument is missing, a time/timeout is out of range, or an operation-specific argument is invalid. Sync interval `0` is valid and disables automatic sync |
| `DAT_CONFIG_URI_INVALID` | `CodeConfigUriInvalid` | CMS URI is unparseable, not HTTP/HTTPS, or contains a path/query (the Go builder's `Url()` rejects both) |
| `DAT_CONFIG_UNKNOWN` | `CodeConfigUnknown` | Unexpected configuration-area fallback |

## INTERNAL — 2 codes

Both permanent for the current operation.

| Code | Constant | Exact meaning |
| --- | --- | --- |
| `DAT_INTERNAL_UNAVAILABLE` | `CodeInternalUnavailable` | Required runtime/crypto capability is absent |
| `DAT_INTERNAL_UNKNOWN` | `CodeInternalUnknown` | Unexpected internal failure such as allocation, RNG, lock, or an unreachable branch |

## CMS client — 13 codes

| Code | Constant | Retry | HTTP/phase | Exact meaning |
| --- | --- | --- | --- | --- |
| `DAT_CMS_UNREACHABLE` | `CodeCmsUnreachable` | transient | transport | DNS, connect, TLS, redirect-policy (cross-origin or >=10 hops), timeout, or response-read failure |
| `DAT_CMS_UNAUTHORIZED` | `CodeCmsUnauthorized` | permanent | `401` | Missing or unknown CMS token |
| `DAT_CMS_FORBIDDEN` | `CodeCmsForbidden` | permanent | `403` | Known token lacks the endpoint role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | `CodeCmsEndpointNotFound` | permanent | `404` | CMS endpoint/base URL is wrong |
| `DAT_CMS_SERVER_ERROR` | `CodeCmsServerError` | transient | `500..599` | CMS returned a server-class HTTP status |
| `DAT_CMS_HTTP_STATUS` | `CodeCmsHttpStatus` | permanent | other non-2xx | Non-success status not covered above |
| `DAT_CMS_MALFORMED` | `CodeCmsMalformed` | permanent | 2xx body | Empty body, non-ASCII body, missing/non-decimal/out-of-range version, or another plain-response grammar failure. `204` empty is malformed |
| `DAT_CMS_IMPORT_FAILED` | `CodeCmsImportFailed` | permanent | 2xx import | Response certificates could not be applied; the entire state change is rejected. Wraps the underlying certificate/import error as `Cause` |
| `DAT_CMS_VERSION_RESET` | `CodeCmsVersionReset` | state | 2xx observation | Certificate-bearing response has a lower server version; merge then commit the lower cursor on success |
| `DAT_CMS_NOT_SYNCED` | `CodeCmsNotSynced` | transient | initial state | `CmsManager`'s pre-`Build()` state before any successful or concrete failed synchronization |
| `DAT_CMS_SYNC_IN_PROGRESS` | `CodeCmsSyncInProgress` | state | local | Another `Sync()` owns the single-flight lock; this call is skipped without replacing `LastError()` |
| `DAT_CMS_NOT_SUPPORTED` | `CodeCmsNotSupported` | permanent | build/runtime | Reserved; not currently produced by this Go client |
| `DAT_CMS_UNKNOWN` | `CodeCmsUnknown` | permanent | fallback | Unexpected CMS-client error |

`Build()` performs one best-effort `Sync()` and always returns a live `*CmsManager` regardless of that result — read `LastError()` to see the concrete failure. `DAT_CMS_SYNC_IN_PROGRESS` never replaces `LastError()`'s recorded value.

## CMS server — 10 codes

Emitted by the `dat-cms` server, not this client; current CMS clients (including this one) map non-2xx server responses to the `DAT_CMS_*` codes above by HTTP status only and do not parse the server's JSON `code`/`details`. See [dat-cms/errors.md](https://dat.saro.me/llms/dat-cms/errors.md) for the server-side catalog (`DAT_AUTH_*`, `DAT_REQ_*`, `DAT_STORE_*`).
