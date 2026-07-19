# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/npm-saro-dat)

### Support Platform
- [Rust](https://github.com/saro-lab/dat/tree/master/clients/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat/tree/master/clients/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat/tree/master/clients/dat-npm)
- [C#](https://github.com/saro-lab/dat/tree/master/clients/dat-nuget)
- [Python](https://github.com/saro-lab/dat/tree/master/clients/dat-pypi)
- [Go](https://github.com/saro-lab/dat/tree/master/clients/dat-go)
- [Ruby](https://github.com/saro-lab/dat/tree/master/clients/dat-ruby)
- [C/C++ (Vcpkg)](https://github.com/saro-lab/dat/tree/master/clients/dat-vcpkg)
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
- [bench.test.ts](https://github.com/saro-lab/dat/tree/master/clients/dat-npm/src/bench.test.ts)
```
plain: nuvfRFY3cVmbERcxnVpe8OD6YnKrerwSfUWiBJUFxBewb6lfX79vNLTXIgSDuRyX35EtkMYvtQYL2rwT7S2TFTyJMw5RyXBnThOz
secure: TR2B0C1T5yZSkc0iehwSGheDpP8F4otQm2kIJaCFLDp8f3yf0cmPq8UgXeU0JEz0VBVeGXHX7DJM39UEUO3q2P6lFXyJzI7l19M0

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 174ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 182ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 152ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 148ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 152ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 142ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 141ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 141ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 139ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 148ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 134ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 143ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 184ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 170ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 179ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 167ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 996ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 858ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1041ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 877ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2541ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 2104ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2681ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1999ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 270ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 262ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 278ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 261ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 266ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 264ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 269ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 271ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 262ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 237ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 264ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 247ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 447ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 681ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 446ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 700ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 4011ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 3558ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 4064ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 3456ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 9869ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 7603ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 9799ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 7409ms
```
