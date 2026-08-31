# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Java / Kotlin Example](https://dat.saro.me/libs/maven-me.saro-dat)
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
- [BenchTest.java](src/test/java/test/java/BenchTest.java)
- [BenchTest.kt](src/test/kotlin/test/kt/BenchTest.kt)
```
Plain : vIU3xSCFZxugCSvvw8r6ryVCv0BRGgpKHjX66iWwtbwXxF67QiM993A2iaDPoXTSSvTSR1191ixBZt8c3rnPfePWamOkmP2EJxy7
Secure : wWOQN4S9aR5ZhiDjUYRPE1eKgGoqzSa2GiESi7BpcoMp16HqAVyaIksEOiiZutfORmy0MwVK6CtsL8yQVeASDsVFxtokU6vLL79V

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 88ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 29ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 16ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 13ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 32ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 14ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 13ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 9ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 24ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 9ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 11ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 6ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 195ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 190ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 97ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 105ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 405ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 345ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 228ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 260ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 587ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 650ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 442ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 553ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 29ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 29ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 31ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 30ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 27ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 27ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 28ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 28ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 27ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 27ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 28ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 28ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 493ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 489ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 492ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 490ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1324ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 1484ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1309ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1484ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2640ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 3279ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2674ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 3268ms
```
