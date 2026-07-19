# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Java / Kotlin Example](https://dat.saro.me/libs/maven-me.saro-dat)

### Support Platform
- [Rust](https://github.com/saro-lab/dat/tree/master/clients/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat/tree/master/clients/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat-npm)
- [C#](https://github.com/saro-lab/dat-nuget)
- [Python](https://github.com/saro-lab/dat-pypi)
- [Go](https://github.com/saro-lab/dat-go)
- [Ruby](https://github.com/saro-lab/dat-ruby)
- [C/C++ (Vcpkg)](https://github.com/saro-lab/dat-vcpkg)
- [Cert(Key) Server (Docker)](https://github.com/saro-lab/dat-cms)


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
- [BenchTest.java](src/test/java/test/java/BenchTest.java)
- [BenchTest.kt](src/test/kotlin/test/kt/BenchTest.kt)
```
Plain : iFpSJTKINZnvDwZnZTZQA6yc4tMTDLJIQPOd6tN3BHSXThwKjmopb2wJh2K49aIBcECTTaib55uAGYEpVFrnq3fg54ZPYbkQdEoF
Secure : msrJSyWq7d71HEqNFtuI3os4Ks4uDlh2oqUZ61FPi5HERW3R3bPJ3uz3uTNagPKYqL2KmUL0b3fwwxSJXS1EMRjy18liSvbGSUVA

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 121ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 30ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 22ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 13ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 50ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 31ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 22ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 7ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 35ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 7ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 13ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 7ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 253ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 240ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 158ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 118ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 507ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 513ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 248ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 277ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 592ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 681ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 473ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 580ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 30ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 30ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 32ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 30ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 28ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 27ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 30ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 29ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 28ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 27ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 30ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 29ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 521ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 492ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 473ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 503ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1284ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 1423ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1284ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1676ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2697ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 3278ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2639ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 3283ms
```
