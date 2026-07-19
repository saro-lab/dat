# DAT C# Library
- [Github](https://github.com/saro-lab/dat-nuget) / [Test Code](https://github.com/saro-lab/dat-nuget/tree/master/Saro.Dat.Tests)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.cs](https://github.com/saro-lab/dat-nuget/blob/master/Saro.Dat.Tests/ExampleCmsManagerTest.cs)
```cs
// singleton
DatCmsManager manager = await DatCmsManager.Builder()
    .Host("localhost")
    .Port(8088)
    //.IntervalOff() // auto sync off
    .IntervalSeconds(60)
    .Token("12345678901b")
    //.Logger(logger)
    .BuildAsync();

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
- [{{t('example')}}: ExampleTest.cs](https://github.com/saro-lab/dat-nuget/blob/master/Saro.Dat.Tests/ExampleTest.cs)
- [{{t('example')}}: HardTest.cs](https://github.com/saro-lab/dat-nuget/blob/master/Saro.Dat.Tests/HardTest.cs)
```cs
var datManager = DatManager.NewInstance();

long now = Unixtime.Now();
var cert = DatCertificate.Generate(
    0,
    now - 10,
    7200,
    1800,
    DatSignatureAlgorithm.EcdsaP256,
    DatCryptoAlgorithm.IvAes128Gcm
);

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




<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Nuget', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>