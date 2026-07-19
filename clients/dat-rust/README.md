# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Rust Example](https://dat.saro.me/libs/cargo-dat)

### Support Platform
- [Rust](https://github.com/saro-lab/dat/tree/master/clients/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat/tree/master/clients/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat/tree/master/clients/dat-npm)
- [C#](https://github.com/saro-lab/dat/tree/master/clients/dat-nuget)
- [Python](https://github.com/saro-lab/dat/tree/master/clients/dat-pypi)
- [Go](https://github.com/saro-lab/dat/tree/master/clients/dat-go)
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
- release compile
- [bench_test.rs](tests/bench_test.rs)
```
performance test (plain, secure)
plain: 0zKhyTW1luzH3peLczCPDdiRstBLokR3xc9DFEkcoswVHnWQ0XOPKtqgrzWxw8fB5sZEGo59uFG8ovBgew4U8MxeqD67i5bkTZlo
secure: Kjc7I8JDQqQ2uF0VarSt6F4wEDoHADND0HWLJoV3IyR2kNW9rfNwRugnnNYcqlIl6Puw8Vt3jKqgR8Xm24qmBmkeAb3yVJEFhqOp

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 7ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 6ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 4ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 26ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 57ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 24ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 52ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 95ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 453ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 145ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 257ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 232ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 470ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 152ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 306ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 12ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 12ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 13ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 7ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 13ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 13ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 13ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 6ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 128ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 287ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 123ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 274ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 472ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 1090ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 474ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1074ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 833ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1657ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 844ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1677ms
```
