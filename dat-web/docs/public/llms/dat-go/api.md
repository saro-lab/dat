# dat-go API Reference

This document targets DAT 4.7.x and later, for `github.com/saro-lab/dat/dat-go/v4`. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. Package name is `dat`.

## Local manager (no CMS)

```go
func NewManager() *Manager
```

| Method | Signature | Notes |
| --- | --- | --- |
| `Issue` | `(m *Manager) Issue(plain, secure string) (string, error)` | Uses text (`string`) payloads |
| `Parse` | `(m *Manager) Parse(datStr string) (Payload, error)` | Verifies signature before returning |
| `ParseDat` | `(m *Manager) ParseDat(dat *Dat) (Payload, error)` | Verifies a pre-parsed `*Dat` |
| `ParseWithoutVerify` | `(m *Manager) ParseWithoutVerify(datStr string) (Payload, error)` | **MUST NOT** be used for authentication/authorization |
| `ParseDatWithoutVerify` | `(m *Manager) ParseDatWithoutVerify(dat *Dat) (Payload, error)` | Same caveat as above |
| `IssueWithCertificate` | `(m *Manager) IssueWithCertificate(certificate *Certificate, plain, secure string) (string, error)` | Bypasses issuer selection; uses the given certificate directly |
| `ParseWithCertificate` | `(m *Manager) ParseWithCertificate(certificate *Certificate, dat *Dat) (Payload, error)` | Verifies against one specific certificate |
| `ParseWithoutVerifyWithCertificate` | `(m *Manager) ParseWithoutVerifyWithCertificate(certificate *Certificate, dat *Dat) (Payload, error)` | Unverified, certificate-scoped |
| `Import` | `(m *Manager) Import(format string, clear bool) (int, error)` | Imports certificate wire text; `clear=true` replaces the whole set, `clear=false` merges (existing `cid` wins) |
| `ImportCertificates` | `(m *Manager) ImportCertificates(newCertificates []*Certificate, clear bool) (int, error)` | Same merge semantics as `Import`, from parsed `*Certificate` values |
| `Export` | `(m *Manager) Export(verifyOnly bool) string` | Serializes held certificates back to wire text |
| `ExportCertificates` | `(m *Manager) ExportCertificates() ([]*Certificate, error)` | Returns the held `*Certificate` values |
| `ExportCids` | `(m *Manager) ExportCids() []uint64` | Lists held certificate IDs |

`Payload` (from `Parse`/`ParseDat`) exposes `PlainText() string`, `SecureText() string`, and `String() string`. There is no separate byte-typed payload accessor in this client — `plain`/`secure` are handled as Go `string`; invalid UTF-8 handling follows the language's normal string semantics, so use `[]byte(payload.PlainText())` only after confirming the payload is intended to be text.

## `Certificate`

```go
func NewCertificate(cid uint64, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds uint64, signatureKey *Signature, cryptoKey *Crypto) (*Certificate, error)
func GenerateCertificate(cid uint64, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds uint64, signatureAlgorithm SignatureAlgorithm, cryptoAlgorithm CryptoAlgorithm) (*Certificate, error)
func ParseCertificate(format string) (*Certificate, error)
```

| Method | Notes |
| --- | --- |
| `(*Certificate) Expired() bool` | `certificate_expire < now` |
| `(*Certificate) Issuable() bool` | Signing-capable and `start <= now <= start+duration` |
| `(*Certificate) Signable() bool` | Certificate holds a private signing key |
| `(*Certificate) SupportVerifyOnly() bool` | Whether a verify-only export is possible for this algorithm (`false` for HMAC) |
| `(*Certificate) SignatureAlgorithm() SignatureAlgorithm` / `(*Certificate) CryptoAlgorithm() CryptoAlgorithm` | Accessors |
| `(*Certificate) Export(verifyOnly bool) (string, error)` | Serializes one certificate to wire text; `verifyOnly=true` on HMAC returns `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` |
| `(*Certificate) TryClone() (*Certificate, error)` | Deep copy |

## `Signature` / `Crypto` key material

```go
func NewSignatureKey(algorithm SignatureAlgorithm, privateBytes, publicBytes []byte) (*Signature, error)
func GenerateSignatureKey(algorithm SignatureAlgorithm) (*Signature, error)
func NewCryptoKey(algorithm CryptoAlgorithm, data []byte) (*Crypto, error)
func GenerateCryptoKey(algorithm CryptoAlgorithm) (*Crypto, error)
```

`(*Signature).Sign([]byte) ([]byte, error)`, `.Verify(body, sign []byte) error`, `.ExportKey()`/`.ExportVerifyOnlyKey()`/`.ExportKeyOption(verifyOnly bool)`, `.Signable() bool`, `.SupportVerifyOnly() bool`. `(*Crypto).Encrypt([]byte) ([]byte, error)`, `.Decrypt([]byte) ([]byte, error)`. Algorithm name constants (exact wire spelling): `EcdsaP256`, `EcdsaP384`, `EcdsaP521`, `HmacSha256Mfs`, `HmacSha384Mfs`, `HmacSha512Mfs` (`SignatureAlgorithm`); `IvAes128Gcm`, `IvAes256Gcm` (`CryptoAlgorithm`).

## `Dat` (parsed token)

```go
func ParseDat(s string) (*Dat, error)
```

`(*Dat).String() string`, `.BodyBytes() []byte` (the exact signed `expire.cid.plain.secure` bytes), `.Plain() ([]byte, error)`, `.Secure() ([]byte, error)` — these two decode the raw Base64Url fields **without** signature verification; do not treat their output as trusted.

## `CmsManager`

Built through `CmsManagerBuilder`, not a plain constructor:

```go
func NewDatCmsManagerBuilder() *CmsManagerBuilder
```

| Builder method | Default | Notes |
| --- | --- | --- |
| `Url(rawUrl string) (*CmsManagerBuilder, error)` | `http://localhost:8088` | Must be scheme `http`/`https`, path-less, query-less; returns `DAT_CONFIG_URI_INVALID` otherwise |
| `Token(token string) *CmsManagerBuilder` | `""` | Sent verbatim in `Authorization` (no `Bearer` prefix) |
| `VerifyOnly(verifyOnly bool) *CmsManagerBuilder` | `false` | Selects `/v1/certs` vs `/v1/certs/verify-only` |
| `Interval(interval time.Duration) *CmsManagerBuilder` / `IntervalOff()` | `60 * time.Second` | `IntervalOff()` is `Interval(0)`; `0` disables background sync |
| `ConnectTimeout(timeout time.Duration) *CmsManagerBuilder` | `5 * time.Second` | Negative values clamp to `0` |
| `Timeout(timeout time.Duration) *CmsManagerBuilder` | `15 * time.Second` | Applied as the HTTP client's total request timeout; negative values clamp to `0` |
| `Logger(logger *slog.Logger) *CmsManagerBuilder` | `slog.Default()` | `nil` is ignored |
| `Build() (*CmsManager, error)` | — | Performs one best-effort `Sync()` internally (its error is discarded); **always returns a live, usable manager** even if that sync fails |

Redirect policy: the builder's `http.Client.CheckRedirect` rejects any redirect that is not same-origin with the configured base URL (`ErrCmsUnreachable`), and rejects redirect chains of `10` or more hops.

| `CmsManager` method | Signature | Notes |
| --- | --- | --- |
| `Sync` | `(m *CmsManager) Sync() error` | Explicit, immediate synchronization; returns the concrete error (no throw-vs-non-throw split in Go — this **is** the "or throw" form) |
| `LastError` | `(m *CmsManager) LastError() error` | Last non-state error recorded by background/explicit sync; starts as `ErrCmsNotSynced` |
| `Issue` | `(m *CmsManager) Issue(plain string, secure string) (string, error)` | Delegates to the internal `*Manager` using CMS-synced certificates |
| `Parse` / `ParseDat` / `ParseWithoutVerify` / `ParseDatWithoutVerify` | same shapes as `*Manager` | Delegate to the internal `*Manager` |
| `GetManager` | `(m *CmsManager) GetManager() *Manager` | Escape hatch to the underlying local manager |
| `GetVersion` | `(m *CmsManager) GetVersion() uint64` | Current CMS cursor |
| `Close` | `(m *CmsManager) Close()` | Cancels the background-sync context and waits (`sync.WaitGroup`) for the worker goroutine to exit |

## Errors

See [errors.md](./errors.md) for the `Error` type, `Code`/`Retry`/`SecurityEvent` accessors, and the full public code catalog.
