# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/gems-saro-dat)

### Support Platform
- [Rust](https://github.com/saro-lab/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat-npm)
- [C#](https://github.com/saro-lab/dat-nuget)
- [Python](https://github.com/saro-lab/dat-pypi)
- [Go](https://github.com/saro-lab/dat-go)
- [Ruby](https://github.com/saro-lab/dat-ruby)
- [C/C++ (Vcpkg)](https://github.com/saro-lab/dat-vcpkg)
- [Cert(key) Server (Docker)](https://github.com/saro-lab/dat-cms)

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
Plain: fCFP97qkmv2cGlQ3GVUpcj6th1TBPNxAoLGiN7XC3XlnQdN1xs4U6qZOYkfkPYcqbXSHCIabTzH8kFI9uY062mqKhjXmy4D8Os4B
Secure: 9wNnNCLvhuAfgvbcjNLXdKY9qXTqhIHBhgc62B7EgeH7fcDWOmJyah8zH0XcZhmgiDPJw4zTay7ArYosxR9NObjN0YWtKjQDrFme

--- Multi-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 150ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 152ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 138ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 162ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 130ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 145ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 132ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 165ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 130ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 149ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 130ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 150ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 170ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 189ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 155ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 194ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 339ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 441ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 320ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 490ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 352ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 554ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 374ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 529ms

--- Single-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 64ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 60ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 58ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 66ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 62ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 61ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 66ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 73ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 58ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 63ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 60ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 67ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 177ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 392ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 172ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 394ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1055ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 2155ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1039ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 2160ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 1358ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 2390ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 1381ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 2398ms
```