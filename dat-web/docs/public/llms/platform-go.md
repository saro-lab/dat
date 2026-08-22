# DAT for Go

Module: `github.com/saro-lab/dat/dat-go/v4` | Go >= 1.25 | source: `dat-go/v4/`

Go 1.25 is required because raw ECDSA key parsing moved to `crypto/ecdsa`, replacing the deprecated
`elliptic.Marshal` family.

## Install

```sh
go get github.com/saro-lab/dat/dat-go/v4@v4.6.0
```

```go
import dat "github.com/saro-lab/dat/dat-go/v4"
```

## With a CMS (production)

`Url()` validates eagerly and returns `(builder, error)`, so it is a separate statement from the
rest of the chain.

```go
opts := &slog.HandlerOptions{Level: slog.LevelDebug}
logger := slog.New(slog.NewTextHandler(os.Stdout, opts))

builder, err := dat.NewDatCmsManagerBuilder().
    Url("http://localhost:8088")
if err != nil {
    return err
}

manager, err := builder.
    Token("12345678901b").
    // VerifyOnly(true).  // only when a separate service does the issuing
    // IntervalOff().     // no background timer; call Sync() yourself
    Interval(60 * time.Second).
    Logger(logger).
    Build()
if err != nil {
    return err
}
defer manager.Close()

// Build() hands back the manager even when the first sync failed, so that a
// later tick can still recover. Ask for the failure instead of assuming success.
if syncErr := manager.LastError(); syncErr != nil {
    logger.Warn("certificates are not being refreshed yet", "code", dat.Code(syncErr))
}
```

The URL must be scheme + host + port - no path, no query. `manager.Sync()` forces a cycle,
`manager.GetVersion()` reports the synced version, `manager.Close()` stops the background
goroutine, `manager.GetManager()` reaches the inner `*Manager`.

## Issue and parse

```go
plain := "42|acme|admin"
secure := "42|s-91af|billing:rw"

datStr, err := manager.Issue(plain, secure)
if err != nil {
    return err
}

payload, err := manager.Parse(datStr)
if err != nil {
    return err
}

fmt.Printf("payload plain: %q\n", payload.PlainText())
fmt.Printf("payload secure: %q\n", payload.SecureText())
```

`Payload` is a value, not a pointer. It offers `PlainText()` / `SecureText()` for strings and the
byte accessors for binary payloads.

## Without a CMS

```go
manager := dat.NewManager()

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
now := dat.NowUnixTimestamp()
cert, err := dat.GenerateCertificate(1, now-10, 3600, 1800, dat.EcdsaP256, dat.IvAes256Gcm)
if err != nil {
    return err
}

if _, err = manager.ImportCertificates([]*dat.Certificate{cert}, false); err != nil {
    return err
}

datStr, err := manager.Issue(plain, secure)
```

`dat.NowUnixTimestamp()` returns **seconds**. The third argument is a duration, not an end time.

Algorithm constants: `dat.EcdsaP256`, `dat.EcdsaP384`, `dat.EcdsaP521`, `dat.HmacSha256Mfs`,
`dat.HmacSha384Mfs`, `dat.HmacSha512Mfs`, `dat.IvAes128Gcm`, `dat.IvAes256Gcm`.

## `Manager` surface

| Method | Returns |
| --- | --- |
| `dat.NewManager()` | `*Manager` |
| `Issue(plain, secure string)` | `(string, error)` |
| `Parse(datStr string)` | `(Payload, error)` |
| `ParseDat(*Dat)` | `(Payload, error)` |
| `ParseWithoutVerify(datStr string)` | `(Payload, error)` - **logging only** |
| `ImportCertificates([]*Certificate, clear bool)` | `(int, error)` |
| `Import(format string, clear bool)` | `(int, error)` - text format |
| `Export(verifyOnly bool)` | `string` |
| `ExportCertificates()` | `([]*Certificate, error)` |
| `ExportCids()` | `[]uint64` |

`CmsManager` adds `Sync()`, `LastError()`, `GetVersion()`, `GetManager()`, `Close()` and forwards
the issue/parse family.

Note that `ExportCertificates` and `GenerateCryptoKey` both return an error - a failing RNG must
never be silently turned into an all-zero key.

```go
certs, err := manager.ExportCertificates()
if err != nil {
    return err
}

crypto, err := dat.GenerateCryptoKey(dat.IvAes256Gcm)
if err != nil {
    return err
}
```

## Error handling

Errors are sentinel-comparable with `errors.Is`, and three package-level helpers read the
classification off any DAT error.

```go
// needs "errors" in the file imports

// 1. Expiry, forgery and a malformed token each need a different response.
payload, err := manager.Parse(datStr)
switch {
case err == nil:
    fmt.Printf("plain: %q\n", payload.PlainText())
// Normal end of life. Let the caller refresh and try again.
case errors.Is(err, dat.ErrTokenExpired):
    fmt.Println("expired: ask the client to re-issue")
// DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH - direct evidence of tampering.
case dat.SecurityEvent(err):
    logger.Warn("drop the session", "code", dat.Code(err))
// Anything else is simply a bad request.
default:
    fmt.Printf("rejected %s: %v\n", dat.Code(err), err)
}

// 2. Never retry a permanent failure. A wrong token answers 401 forever.
if err := manager.Sync(); err != nil {
    switch dat.Retry(err) {
    case dat.RetryTransient:
        logger.Info("retrying on the next tick", "code", dat.Code(err))
    case dat.RetryPermanent:
        logger.Error("fix the token, url or deployment", "code", dat.Code(err))
    case dat.RetryState:
        // not a failure - a sync was already running
    }
}

// 3. Sync failures are never returned to the caller of Build(). Poll the
//    manager to notice a stalled rollout.
if err := manager.LastError(); err != nil {
    logger.Error("certificates are not being refreshed", "code", dat.Code(err))
}
```

| Helper | Gives you |
| --- | --- |
| `dat.Code(err)` | the stable code string |
| `dat.Retry(err)` | `dat.RetryTransient` / `RetryPermanent` / `RetryState` |
| `dat.SecurityEvent(err)` | `true` only for the two forgery codes |

Wrapped causes unwrap normally, so `errors.Is` and `errors.As` work through a chain.

Full code table: [errors.md](https://dat.saro.me/llms/errors.md).

## net/http middleware

```go
func DatAuth(m *dat.CmsManager, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        payload, err := m.Parse(token)
        if err != nil {
            if dat.SecurityEvent(err) {
                slog.Warn("forged dat", "code", dat.Code(err), "ip", r.RemoteAddr)
            }
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), datKey{}, payload)))
    })
}
```

## Notes

- One manager per process; it is safe for concurrent use.
- `defer manager.Close()` in `main`, so the sync goroutine and HTTP client are released.
- Test code worth reading: `dat-go/v4/cms_manager_test.go`, `manager_test.go`,
  `manager_example_test.go`, `hard_test.go`.
