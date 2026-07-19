# DAT Go Library
- [Github / Test Code](https://github.com/saro-lab/dat-go)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: cms_manager_test.go](https://github.com/saro-lab/dat-go/blob/master/cms_manager_test.go)

#### init
```go
// logger example
opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
}
testLogger := slog.New(slog.NewTextHandler(os.Stdout, opts))

builder, err := NewDatCmsManagerBuilder().
    Url("http://localhost:8088")
if err != nil {
    t.Fatal(err)
}

manager, err := builder.
    // IntervalOff(). // disable auto sync
    Interval(60 * time.Second).
    Logger(testLogger).
    Token("12345678901b").
    Build()

if err != nil {
    t.Fatalf("failed to build manager: %v", err)
}

// manual sync
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

## {{t('example')}}: {{t('manual_code')}}
- [{{t('example')}}: manager_test.go](https://github.com/saro-lab/dat-go/blob/master/manager_test.go)
- [{{t('example')}}: manager_example_test.go](https://github.com/saro-lab/dat-go/blob/master/manager_example_test.go)
- [{{t('example')}}: hard_test.go](https://github.com/saro-lab/dat-go/blob/master/hard_test.go)
```go
manager := dat.NewManager()

now := dat.NowUnixTimestamp()
cert, err := dat.GenerateCertificate(1, now-10, 610, 60, dat.EcdsaP256, dat.IvAes256Gcm)
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



<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Go', 'github.com/saro-lab/dat-go/v4');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
