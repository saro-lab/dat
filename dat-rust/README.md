# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Rust Example](https://dat.saro.me/libs/cargo-dat)
- [AI Vibe Coding](https://dat.saro.me/ai-coding)

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
- release compile
- [bench_test.rs](https://github.com/saro-lab/dat/tree/master/dat-rust/tests/bench_test.rs)
```
performance test (plain, secure)
plain: 8r3u4iNaRkvmYY5nMpaohJdBcHoYahV5daORh294YWcrNY2EkCQj29QRucIsRGnGltEYA8w0PjjCv9trAKIDs89gsfG9nJsJUaF6
secure: u0L5ke5zDIDNcdxnBs7ttibTWnc2u60kmRpsxTlPUhH8wq3CsMx62IIRAiCpohIGHJjCwcHUL9OEXJOUi3lY9DE8kNScqtJrHHy9

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 6ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 6ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 4ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 23ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 47ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 22ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 46ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 80ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 183ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 82ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 185ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 145ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 295ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 144ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 294ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 11ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 10ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 12ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 12ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 12ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 12ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 6ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 118ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 268ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 117ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 269ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 484ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 1044ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 484ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1052ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 835ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1637ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 835ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1636ms
```
