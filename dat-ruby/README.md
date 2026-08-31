# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/gems-saro-dat)
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
- [test_bench.rb](test/test_bench.rb)
```
Performance Test (Plain, Secure)
Plain: JViHXwUHzJOm76bJjfkWTokM7h9dF4eFqXGWneOVbEt8OYXwEI9FEPoYlCSB33j8nNZCaj3rqFP8iy35GZJJAxNweHlJoVSItKog
Secure: zNnyO1umoZ7wXf2VyQVlLLmzVl4aHoDmR5pIlS8UBkPyO03wiOdDnrU2xNUM12qszw7tWsOv9Ip4fuePQSJoCptZuwWBElzOVdZT

--- Multi-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 122ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 129ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 116ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 131ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 116ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 141ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 121ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 145ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 130ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 122ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 125ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 121ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 146ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 182ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 144ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 182ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 247ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 433ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 243ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 430ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 308ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 492ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 308ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 491ms

--- Single-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 61ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 69ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 57ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 67ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 60ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 67ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 58ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 67ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 58ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 70ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 60ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 68ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 172ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 396ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 173ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 401ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1070ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 2198ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1069ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 2192ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 1366ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 2417ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 1365ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 2405ms
```
