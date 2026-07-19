# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/vcpkg-dat)

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
- release mode
- [bench_test.c](tests/bench_test.c)
```
plain: VVzy58PUggL5AnrXduM1DAeG4ObD25O7DMVZXHNr2uZ26mnh7WvrgJYBHoJVYPtP8FglsTPzoHNWGmCAiFIVIRGZuDbQHl5AtGUE
secure: 2nkuzNQmA64ZcE3xmso1nEq6il11v2U11CbnmmytE15q2uftvBV2kHN71siqeX8Z2j6NUIa2ewI6M3XFqzHfbBzLv1QlLvahhdYj

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 9ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 8ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 8ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 8ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 8ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 8ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 32ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 75ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 32ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 69ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 196ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 424ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 186ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 379ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 250ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 449ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 260ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 454ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 16ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 15ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 15ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 14ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 17ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 18ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 17ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 17ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 17ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 17ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 17ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 16ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 156ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 373ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 147ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 361ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1039ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 2147ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1041ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 2151ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 1359ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 2394ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 1360ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 2402ms
```
