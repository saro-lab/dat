# DAT Javascript, Typescript Library
- [Github](https://github.com/saro-lab/dat-npm) / [Test Code](https://github.com/saro-lab/dat-npm/tree/master/src)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: dat.cms.manager.test.ts](https://github.com/saro-lab/dat-npm/blob/master/src/dat.cms.manager.test.ts)
```js
const manager = await DatCmsManager.builder()
    .uri("http://localhost:8088")
    //.intervalOff() // disable auto sync
    .intervalSeconds(60)
    .logger(console)
    .token("12345678901b")
    .build();

// manual sync
// await manager.sync();

let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

const dat = await manager.issue(plain, secure);
console.log("dat : " + dat);

// parse dat
const payload = await manager.parse(dat);

const payloadPlain = payload.plain;
const payloadSecure = payload.secure;

console.log("payload plain : " + payloadPlain);
console.log("payload secure : " + payloadSecure);
``` 

#### {{t('manual_code')}}
- [{{t('example')}}: dat.manager.test.ts](https://github.com/saro-lab/dat-npm/blob/master/src/dat.manager.test.ts)
- [{{t('example')}}: hard.test.ts](https://github.com/saro-lab/dat-npm/blob/master/src/hard.test.ts)
```js
const manager = new DatManager();

const now = Unixtime.now().time;
manager.importCertificates([new DatCertificate(
    DatInteger.toCid(cid), now - 10n, 3600n, 1800n,
    await DatSignature.generate("HMAC-SHA512-MFS"),
    await DatCrypto.generate("IV-AES256-GCM"),
)]);

let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

const dat = await manager.issue(plain, secure);
console.log("dat : " + dat);

// parse dat
const payload = await manager.parse(dat);

const payloadPlain = payload.plain;
const payloadSecure = payload.secure;

console.log("payload plain : " + payloadPlain);
console.log("payload secure : " + payloadSecure);
```

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Npm', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>