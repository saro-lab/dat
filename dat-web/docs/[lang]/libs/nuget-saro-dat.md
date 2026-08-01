# DAT C# Library
<GithubBadge label="GitHub" /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-nuget/Saro.Dat.Tests)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** .NET 8.0 or .NET 10.0 (`net8.0` / `net10.0` multi-target)
>
> `DatManager`, `DatCmsManager`, `DatCertificate` and the signature types hold native
> crypto handles and implement `IDisposable` — dispose them (or use `using`).


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.cs](https://github.com/saro-lab/dat/blob/master/dat-nuget/Saro.Dat.Tests/ExampleCmsManagerTest.cs)
```cs
// singleton — dispose on shutdown (stops the sync loop and releases the HttpClient)
DatCmsManager manager = await DatCmsManager.Builder()
    .Host("localhost")
    .Port(8088)
    //.IntervalOff() // auto sync off
    .IntervalSeconds(60)
    .Token("12345678901b")
    //.Logger(logger)
    .BuildAsync();

// BuildAsync always returns a manager, even when the first sync failed — it
// becomes usable once the network recovers. Ask separately whether it synced.
DatException? syncError = manager.LastError;
if (syncError is not null)
{
    // A permanent failure (bad token, wrong URL) will never resolve on its own.
    Console.WriteLine($"initial sync failed: {syncError.Code} (retry={syncError.Retry})");
}
Console.WriteLine($"synced version: {manager.GetVersion()}");

// manual sync
// await manager.Sync();

string plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
string secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

Console.WriteLine("plain : " + plain);
Console.WriteLine("secure : " + secure);

// issue dat
string dat = manager.Issue(plain, secure);
Console.WriteLine("dat : " + dat);

// parse dat
Payload payload = manager.Parse(dat);

string payloadPlain = payload.Plain;
string payloadSecure = payload.Secure;

Console.WriteLine("payload plain : " + payloadPlain);
Console.WriteLine("payload secure : " + payloadSecure);
```

#### {{t('manual_code')}}
- [{{t('example')}}: ExampleTest.cs](https://github.com/saro-lab/dat/blob/master/dat-nuget/Saro.Dat.Tests/ExampleTest.cs)
- [{{t('example')}}: HardTest.cs](https://github.com/saro-lab/dat/blob/master/dat-nuget/Saro.Dat.Tests/HardTest.cs)
```cs
using var datManager = DatManager.NewInstance();

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
long now = Unixtime.Now();
using var cert = DatCertificate.Generate(
    0,
    now - 10,
    7200,
    1800,
    DatSignatureAlgorithm.EcdsaP256,
    DatCryptoAlgorithm.IvAes128Gcm
);

// Imports copies the certificates, so the caller keeps ownership of `cert`.
datManager.Imports(new List<DatCertificate> { cert }, false);

string plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
string secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

string dat = datManager.Issue(plain, secure);

Payload payload = datManager.Parse(dat);

Assert.That(payload.Plain, Is.EqualTo(plain));
Assert.That(payload.Secure, Is.EqualTo(secure));

TestContext.Progress.WriteLine($"PARSE DAT: {dat}");
TestContext.Progress.WriteLine($"plain: {payload.Plain}");
TestContext.Progress.WriteLine($"secure: {payload.Secure}");
```

#### {{t('error_handling')}}
- [{{t('example')}}: ErrorCodeTest.cs](https://github.com/saro-lab/dat/blob/master/dat-nuget/Saro.Dat.Tests/ErrorCodeTest.cs)

Every failure is a `DatException` carrying a `Code`. The string is the contract;
the message is free to change.

```cs
// Expiry, forgery and malformed input each need a different response.
try
{
    Payload payload = manager.Parse(dat);
}
catch (DatException e) when (e.Code == DatErrorCode.TokenExpired)
{
    // Normal end of life — let the client refresh its token.
}
catch (DatException e) when (e.SecurityEvent)
{
    // DAT_SIG_MISMATCH or DAT_CRYPTO_TAG_MISMATCH: forged or tampered with.
    Console.Error.WriteLine($"[SECURITY] {e.Code}");
}
catch (DatException e)
{
    // Anything else: just reject the request.
    Console.Error.WriteLine($"rejected: {e.Code}");
}
```
```cs
try
{
    string dat = manager.Issue(plain, secure);
}
catch (DatException e)
{
    // Never retry a permanent failure — it will not resolve on its own.
    if (e.Retry == DatRetry.Transient)
    {
        // back off, then retry
    }

    // Why issuing failed is chained, not folded into the outer code.
    // Waiting helps for DAT_CERT_NOT_YET_ISSUABLE and nothing else.
    if (e.Code == DatErrorCode.ManagerNoIssuableCertificate)
    {
        Console.Error.WriteLine($"cannot issue: {DatException.CodeOf(e.InnerException)}");
    }
}
```




<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Nuget', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
