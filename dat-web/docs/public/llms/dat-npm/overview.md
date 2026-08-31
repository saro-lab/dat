# dat-npm Overview

This document targets DAT 4.7.x and later for the `saro-dat` npm package. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible with what is described here.

For the full DAT wire protocol, certificate grammar, CMS v1 contract, and cross-language error catalog, see [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt). This file only covers what is specific to the JavaScript/TypeScript implementation.

## Package identity

- npm package: `saro-dat`
- Module system: **ESM only**. The package ships a single ES module entry point (`import { ... } from 'saro-dat'`). There is no CommonJS (`require`) build.
- Runtime requirement: **Node.js 24 or newer**. The byte encoders use `Uint8Array.fromBase64`/`toBase64`/`fromHex`/`toHex`, which land in Node 24. On Node 20/22 every encode and decode throws a `TypeError`.

## Install

```shell
npm install saro-dat
```

## Quick usage

```typescript
import {DatCertificate, DatCrypto, DatManager, DatSignature} from 'saro-dat'

const certificate = new DatCertificate(
  255n,                 // cid
  now - 10, 3600n, 1800n, // start, duration, ttl
  await DatSignature.generate('ECDSA-P256'),
  await DatCrypto.generate('IV-AES128-GCM'),
)

const manager = DatManager.from([certificate])

const dat = await manager.issue('plain data', 'secure data')
const payload = await manager.parse(dat)

console.log(payload.plain, payload.secure)
```

`issue` and `parse` accept `string` or byte-like input (`ArrayBufferLike`/`Uint8Array`) for `plain`/`secure`. `DatPayload.plain`/`.secure` decode as UTF-8; use `payload.plainBytes`/`payload.secureBytes` to keep the raw `ArrayBuffer` when the payload schema is binary or invalid-UTF-8 must not be silently converted.

See [api.md](./api.md) for the full `DatManager`/`DatCmsManager` surface, [errors.md](./errors.md) for `DatError`, and [integration.md](./integration.md) for the release checklist adapted to this library.
