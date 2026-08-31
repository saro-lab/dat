# DAT - Distributed Access Token


### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Go Example](https://dat.saro.me/libs/go-saro-dat)
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
- [bench_test.go](bench_test.go)
```
=== RUN   TestBenchmark
performance test (plain, secure)
plain: SDJO6Je44u1yBrIgFQ95bQzqfQXUo8XCqxHaZTW5vpKCbflGmsRUtaNjGGqIYuTIJPihH0pfQNXKTHDBXmMNfhdlwU7XrEJHAxwL
secure: 71tEMvy6GlalQV25ZTGFNpTbwAN0MYFmDRSpMdFObMpOZ5FWkhnESCzxOar5xPdYA9jibIsH0NfZzLfbbBZJMGISPQi8rXZpw5UC

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 13ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 10ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 5ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 9ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 5ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 50ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 67ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 49ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 68ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 203ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 543ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 200ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 544ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 444ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1377ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 443ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1379ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 7ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 4ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 7ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 4ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 6ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 6ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 161ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 357ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 159ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 358ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1115ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 3201ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1101ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 3196ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 2612ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 8355ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 2602ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 8326ms
```
