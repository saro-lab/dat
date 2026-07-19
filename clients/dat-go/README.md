# DAT - Distributed Access Token


### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Go Example](https://dat.saro.me/libs/go-saro-dat)

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
- [bench_test.go](bench_test.go)
```
=== RUN   TestBenchmark
performance test (plain, secure)
plain: QheYmFHedNUXoEYd96XsnzmXRJ1h1WE7hjRhxZRoWU51ClNuWpeXkgFMyoGgloG1UZVZxfMXm1rh4pEuYsN0cY2qkNAXtNQwo4gn
secure: KlpOYIEKFQYdLsSnec3LYM2Y6KJF9zGUO1klicTpWg4tEG9cF8UQxf0eCYFNJHiQb63bpTAMobynfGUBp7JyWEFV25CrfTJfARJP

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 11ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 10ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 10ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 5ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 53ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 71ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 58ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 72ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 214ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 593ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 220ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 566ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 468ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1466ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 467ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1507ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 7ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 6ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 165ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 358ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 156ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 345ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1095ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 3129ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1073ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 3151ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2653ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 8665ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2652ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 8683ms
```
