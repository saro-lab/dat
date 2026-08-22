# DAT Go Library
<GithubBadge label="GitHub / Test Code" /> <RegistryBadge />

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** Go >= 1.25 (`crypto/ecdsa` raw key parsing replaced the deprecated `elliptic.Marshal` family)


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: cms_manager_test.go](https://github.com/saro-lab/dat/blob/master/dat-go/v4/cms_manager_test.go)

#### init
```go
// logger example
opts := &slog.HandlerOptions{
    Level: slog.LevelDebug,
}
logger := slog.New(slog.NewTextHandler(os.Stdout, opts))

builder, err := dat.NewDatCmsManagerBuilder().
    Url("http://localhost:8088")
if err != nil {
    return err
}

manager, err := builder.
    // IntervalOff(). // disable auto sync
    Interval(60 * time.Second).
    Logger(logger).
    Token("12345678901b").
    Build()

if err != nil {
    return err
}

// Build() hands back the manager even when the first sync failed, so that a
// later tick can still recover. Ask for the failure instead of assuming success.
if syncErr := manager.LastError(); syncErr != nil {
    logger.Warn("certificates are not being refreshed yet", "code", dat.Code(syncErr))
}

// manual sync — returns error
// _ = manager.Sync()
```
#### issue / parse
```go
plain := "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
secure := "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

datStr, err := manager.Issue(plain, secure)
if err != nil {
    return err
}

fmt.Printf("dat: %v\n", datStr)

payload, err := manager.Parse(datStr)
if err != nil {
    return err
}

if plain != payload.PlainText() {
    return fmt.Errorf("plain text mismatch: expected %q, got %q", plain, payload.PlainText())
}
if secure != payload.SecureText() {
    return fmt.Errorf("secure text mismatch: expected %q, got %q", secure, payload.SecureText())
}

fmt.Printf("payload plain: %q\n", payload.PlainText())
fmt.Printf("payload secure: %q\n", payload.SecureText())
```

#### {{t('error_handling')}}
- [{{t('menu_spec_errors')}}](../spec/errors)

```go
// needs "errors" in the file imports

// 1. Expiry, forgery and a malformed token each need a different response.
//    They used to share one sentinel, so callers could not tell them apart.
payload, err := manager.Parse(datStr)
switch {
case err == nil:
    fmt.Printf("plain: %q\n", payload.PlainText())
// Normal end of life. Let the caller refresh and try again.
case errors.Is(err, dat.ErrTokenExpired):
    fmt.Println("expired: ask the client to re-issue")
// DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH — direct evidence of tampering.
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
        // not a failure — a sync was already running
    }
}

// 3. Sync failures are never returned to the caller of Build(). Poll the
//    manager to notice a stalled rollout.
if err := manager.LastError(); err != nil {
    logger.Error("certificates are not being refreshed", "code", dat.Code(err))
}
```

## {{t('example')}}: {{t('manual_code')}}
- [{{t('example')}}: manager_test.go](https://github.com/saro-lab/dat/blob/master/dat-go/v4/manager_test.go)
- [{{t('example')}}: manager_example_test.go](https://github.com/saro-lab/dat/blob/master/dat-go/v4/manager_example_test.go)
- [{{t('example')}}: hard_test.go](https://github.com/saro-lab/dat/blob/master/dat-go/v4/hard_test.go)
```go
manager := dat.NewManager()

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
now := dat.NowUnixTimestamp()
cert, err := dat.GenerateCertificate(1, now-10, 3600, 1800, dat.EcdsaP256, dat.IvAes256Gcm)
if err != nil {
    t.Fatal(err)
}

_, err = manager.ImportCertificates([]*dat.Certificate{cert}, false)
if err != nil {
    t.Fatal(err)
}

plain := "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
secure := "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

datStr, err := manager.Issue(plain, secure)
if err != nil {
    t.Fatal(err)
}

payload, err := manager.Parse(datStr)
if err != nil {
    t.Fatal(err)
}

if payload.PlainText() != plain {
    t.Errorf("expected plain %s, got %s", plain, payload.PlainText())
}
if payload.SecureText() != secure {
    t.Errorf("expected secure %s, got %s", secure, payload.SecureText())
}

println(datStr)
println(payload.PlainText())
println(payload.SecureText())
```

#### export
```go
// ExportCertificates and GenerateCryptoKey both return an error — a failing RNG
// must never be silently turned into an all-zero key.
certs, err := manager.ExportCertificates()
if err != nil {
    return err
}

crypto, err := dat.GenerateCryptoKey(dat.IvAes256Gcm)
if err != nil {
    return err
}
```



<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import RegistryBadge from '../../.vitepress/ui/RegistryBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Go', 'github.com/saro-lab/dat/dat-go/v4');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
