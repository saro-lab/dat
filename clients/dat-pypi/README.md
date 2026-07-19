# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/pypi-saro-dat)

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
- [test_bench.py](tests/test_bench.py)
```
Plain: IOqrtFwsNxnwV6FjQVj93pZf9UaI2TkvhIY3ixBDljTJChN0vKE7v3qznmv25Vm6k08g0uUAJvdi6SK3fAnoohOszDERQAWyjv0y
Secure: KNsu331iwBxUVt5ppNVRSo1yEFlacBwAVO5yfG5iRhS4iD7b0q0dIGcKPpjCCcuqMhcd1vHxAsRsyN256zhEZ2jachwUtmSREYnk

--- Multi-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 88ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 83ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 106ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 82ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 100ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 80ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 92ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 80ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 94ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 79ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 93ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 89ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 191ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 181ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 192ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 182ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 867ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 2036ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 869ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1972ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 728ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1446ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 704ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1395ms

--- Single-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 35ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 37ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 34ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 36ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 35ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 37ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 36ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 38ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 36ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 38ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 35ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 37ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 210ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 431ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 202ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 434ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 4760ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 11279ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 4745ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 11278ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 3499ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 7115ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 3488ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 7116ms
```
