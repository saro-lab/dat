# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/npm-saro-dat)
- [AI Vibe Coding](https://dat.saro.me/ai-coding)

### Requirements
- **Node.js 24 or newer.** The encoders use `Uint8Array.fromBase64`/`toBase64`/`fromHex`/`toHex`,
  which land in Node 24; on Node 20/22 every encode and decode throws a `TypeError`.
- **ESM only.** This package ships a single ES module entry point — import it with
  `import { ... } from 'saro-dat'`. There is no CommonJS (`require`) build.

### Support Platform
- [Rust](https://github.com/saro-lab/dat/tree/master/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat/tree/master/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat/tree/master/dat-npm)
- [C#](https://github.com/saro-lab/dat/tree/master/dat-nuget)
- [Python](https://github.com/saro-lab/dat/tree/master/dat-pypi)
- [Go](https://github.com/saro-lab/dat/tree/master/dat-go)
- [Ruby](https://github.com/saro-lab/dat/tree/master/dat-ruby)
- [C/C++ (Vcpkg)](https://github.com/saro-lab/dat/tree/master/dat-vcpkg)
- [Cert(Key) Server (Docker)](https://github.com/saro-lab/dat)


## Support algorithm
### Signature
| name            | note                  |
|-----------------|-----------------------|
| ECDSA-P256      | = secp256r1           |
| ECDSA-P384      | = secp384r1           |
| ECDSA-P521      | = secp521r1           |
| HMAC-SHA256-MFS | = 256Bit Fixed Secret |
| HMAC-SHA384-MFS | = 384Bit Fixed Secret |
| HMAC-SHA512-MFS | = 512Bit Fixed Secret |
- MFS : Maximum(Same Bit) Fixed Secret

### Crypto
| name       | note                          |
|------------|-------------------------------|
| IV-AES128-GCM | (IV=NONCE:96BIT) + AES128 GCM |
| IV-AES256-GCM | (IV=NONCE:96BIT) + AES256 GCM |


# Performance
- random plain and secure test
- mac mini m4 2024 basic (10 core)
- [bench.test.ts](https://github.com/saro-lab/dat/tree/master/dat-npm/src/bench.test.ts)
```
plain: 3IyOGYSW2BWwigSw6zC0LMXhB76hypld4DaplHTzlKIfN7qRpsL3wS5Tx2VFBawEIPXmvNqZnu5eXkR8vsK2IhLuC7ZPreVHtE89
secure: 2oG3GLTXDtrph0Ie4sHawB1sQP6jfl1VsABcoULJ4NJ4VTeBCg9ElpWnGQTw0R2gPnRkURT4yjr0ND4Y0YsxDC4jei8KdfZZJIH4

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 157ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 159ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 148ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 153ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 138ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 149ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 137ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 149ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 138ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 150ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 136ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 150ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 187ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 183ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 185ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 178ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1073ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 900ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1079ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 898ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2509ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1884ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2499ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1864ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 265ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 258ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 262ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 256ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 258ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 245ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 261ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 253ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 260ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 233ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 253ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 248ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 430ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 698ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 434ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 697ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 4223ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 3578ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 4226ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 3561ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 9433ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 7172ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 9388ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 7261ms
```
