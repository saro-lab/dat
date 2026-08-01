# DAT Javascript, Typescript Library
<GithubBadge label="GitHub" /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-npm/tree/master/src)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** Node >= 24 · ESM only — `import` is supported, `require('saro-dat')` is not.
> (`Uint8Array.fromBase64` / `toBase64` / `fromHex` / `toHex` are used for encoding.)

## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: dat.cms.manager.test.ts](https://github.com/saro-lab/dat/tree/master/dat-npm/blob/master/src/dat.cms.manager.test.ts)
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

// build() never throws on a failed first sync — it returns a manager with no
// certificates so a CMS outage cannot stop your app from starting.
// Ask for the reason instead:
const syncError = manager.lastError();
if (syncError && syncError.retry === "permanent") {
    // Retrying will not help — the token or the URL is wrong.
    console.error("fix the CMS config:", syncError.code);
}

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
- [{{t('example')}}: dat.manager.test.ts](https://github.com/saro-lab/dat/tree/master/dat-npm/blob/master/src/dat.manager.test.ts)
- [{{t('example')}}: hard.test.ts](https://github.com/saro-lab/dat/tree/master/dat-npm/blob/master/src/hard.test.ts)
```js
import {DatCertificate, DatCrypto, DatInteger, DatManager, DatSignature} from "saro-dat";
import {Unixtime} from "infinite-unixtime";

const manager = new DatManager();

// (cid, issuanceStart, issuanceDuration, datTtl, signature, crypto)
const now = Unixtime.now().time;
manager.importCertificates([new DatCertificate(
    DatInteger.toCid(0), now - 10n, 3600n, 1800n,
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

#### {{t('error_handling')}}
- [{{t('example')}}: error.test.ts](https://github.com/saro-lab/dat/tree/master/dat-npm/blob/master/src/error.test.ts)

Every failure is a `DatError` carrying a `code` that is identical across all official clients.
The one split that matters most: **an expired token is not a forged one.**

```js
import {DatError, DatErrorCodes} from "saro-dat";

async function verify(manager, dat) {
    try {
        return await manager.parse(dat);
    } catch (e) {
        if (!(e instanceof DatError)) throw e;

        switch (e.code) {
            case DatErrorCodes.TOKEN_EXPIRED:
                // Normal end of life. Send the client back to log in again.
                return refreshFlow();
            case DatErrorCodes.SIG_MISMATCH:
            case DatErrorCodes.CRYPTO_TAG_MISMATCH:
                // Forged or tampered. e.securityEvent is true for exactly these two.
                securityLog(e.code);
                return blockSession();
            default:
                // Malformed, unknown cid, ... — just reject the request.
                return reject(e.code);
        }
    }
}
```

`retry` tells you whether trying again can ever help. Do not loop on a permanent one —
a wrong CMS token stays wrong no matter how many times you retry.

```js
// "transient" -> back off and retry | "permanent" -> fix config | "state" -> not an error
if (e.retry === "transient") {
    await backoff();
    return retry();
}
```

::: tip A custom logger must provide `debug`
`Logger` is `{ debug, info, warn, error }`. The built-in `console` satisfies it, but a
hand-rolled logger missing `debug` is now a type error — previously it threw at runtime
and the exception was swallowed, which made **successful syncs show up as error logs.**
:::

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Npm', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
