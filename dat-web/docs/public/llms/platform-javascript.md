# DAT for JavaScript and TypeScript

Package: `saro-dat` | source: `dat-npm/`

## Requirements

- **Node.js >= 24.** Encoding uses `Uint8Array.fromBase64` / `toBase64` / `fromHex` / `toHex`, which
  land in Node 24. On Node 20 or 22 every encode and decode throws a `TypeError`.
- **ESM only.** `import { ... } from 'saro-dat'` works; there is no CommonJS build, so
  `require('saro-dat')` does not.

In a browser or an edge runtime, the crypto backend must provide `crypto.subtle` with AES-GCM.
Where it does not, you get `DAT_INTERNAL_UNAVAILABLE`.

## Install

```sh
npm i saro-dat@4.6.1
```

## Async surface

`issue` and `parse` are **async** - they return promises, because WebCrypto is async. So are
`DatSignature.generate`, `DatCrypto.generate`, `manager.exports()` and the CMS builder's `build()`.
`importCertificates` is synchronous.

## With a CMS (production)

```js
import {DatCmsManager} from "saro-dat";

const manager = await DatCmsManager.builder()
    .uri("http://localhost:8088")
    .token("12345678901b")
    // .verifyOnly(true)  // only when a separate service does the issuing
    // .intervalOff()      // no background timer; call sync() yourself
    .intervalSeconds(60)
    .logger(console)
    .build();

// build() never throws on a failed first sync - it returns a manager with no
// certificates so a CMS outage cannot stop your app from starting.
const syncError = manager.lastError();
if (syncError && syncError.retry === "permanent") {
    // Retrying will not help - the token or the URL is wrong.
    console.error("fix the CMS config:", syncError.code);
}
```

The URI must be scheme + host + port - no path, no query. `await manager.sync()` forces a cycle,
`manager.getVersion()` reports the synced version, `manager.stop()` cancels the timer on shutdown.

A custom logger must implement all four of `{ debug, info, warn, error }`. `console` satisfies it.
A logger missing `debug` is a type error - it used to throw at runtime inside a swallowed catch,
which made **successful syncs show up as error logs**.

## Issue and parse

```js
const plain = "42|acme|admin";
const secure = "42|s-91af|billing:rw";

const dat = await manager.issue(plain, secure);

const payload = await manager.parse(dat);
payload.plain;   // "42|acme|admin"
payload.secure;  // "42|s-91af|billing:rw"
```

`issue` accepts `string`, `Uint8Array` or `ArrayBufferLike`; `parse` accepts a `string` or a `Dat`.

## Without a CMS

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

const dat = await manager.issue(plain, secure);
const payload = await manager.parse(dat);
```

Two things to get right here:

- **The time arguments are `BigInt`.** `3600n`, not `3600`. `Unixtime.now().time` already is one.
- **The cid goes through `DatInteger.toCid()`**, which is what enforces the uint64 range.

Algorithm names are the wire strings: `"ECDSA-P256"`, `"ECDSA-P384"`, `"ECDSA-P521"`,
`"HMAC-SHA256-MFS"`, `"HMAC-SHA384-MFS"`, `"HMAC-SHA512-MFS"`, `"IV-AES128-GCM"`,
`"IV-AES256-GCM"`.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `new DatManager()` | manager |
| `issue(plain, secure)` | `Promise<string>` |
| `parse(dat)` | `Promise<DatPayload>` |
| `importCertificates(certs, clear = false)` | `number` |
| `imports(format, clear = false)` | `Promise<number>` - text format |
| `exports(verifyOnly = false)` | `Promise<string>` |
| `find(cid)` | `DatCertificate \| null` |

`DatCmsManager` adds `sync()`, `lastError()`, `getVersion()`, `getManager()`, `stop()` and forwards
`issue` / `parse`.

## Error handling

Every failure is a `DatError` carrying a `code` identical across all official clients. The split
that matters most: **an expired token is not a forged one.**

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
                // Malformed, unknown cid, ... - just reject the request.
                return reject(e.code);
        }
    }
}
```

`retry` tells you whether trying again can ever help. Do not loop on a permanent one - a wrong CMS
token stays wrong no matter how many times you retry.

```js
// "transient" -> back off and retry | "permanent" -> fix config | "state" -> not an error
if (e.retry === "transient") {
    await backoff();
    return retry();
}
```

`retry` is a lowercase string here, not an enum. Full code table:
[errors.md](https://dat.saro.me/llms/errors.md).

## Express-style middleware

```js
export function datAuth(manager) {
    return async (req, res, next) => {
        const token = req.headers.authorization?.slice(7);
        if (!token) return res.sendStatus(401);
        try {
            req.dat = await manager.parse(token);
            next();
        } catch (e) {
            if (!(e instanceof DatError)) throw e;
            if (e.securityEvent) securityLog(e.code, req.ip);
            res.sendStatus(401);
        }
    };
}
```

Build the manager once at module scope and close over it. Do not build one per request.

## Notes

- One manager per process. Call `manager.stop()` on shutdown so the interval does not keep the
  event loop alive.
- TypeScript types ship with the package; no `@types` install.
- Test code worth reading: `dat-npm/src/dat.cms.manager.test.ts`, `dat.manager.test.ts`,
  `hard.test.ts`, `error.test.ts`, `bench.test.ts`.
