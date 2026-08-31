# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/pypi-saro-dat)
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
- [test_bench.py](tests/test_bench.py)
```
Plain: 2EexE9HuqbhQATo82VFwDHuiVnMLvMLOGGcYbPAx8SJKLZMw2PqnTGD0BPgBOqMRsWAnCs5DXcb6XZ3gOifAAGxonr8MlmbDV9wm
Secure: xrVselkHRjEzgUY7ESallX1TbcqD96qZGH44bP3tqo6AUFRl5SfKAJb7AdTlni1SrMryUJaLdrqNH4rIRcSoGXXaeJkQGFR1uCYH

--- Multi-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 79ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 132ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 75ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 125ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 83ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 128ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 84ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 124ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 81ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 138ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 75ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 132ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 178ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 277ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 184ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 289ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 798ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 1835ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 800ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 1836ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 673ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 1342ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 670ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 1346ms

--- Single-Thread ---
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 33ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 100ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 33ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 100ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 34ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 104ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 33ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 104ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 33ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 108ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 33ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 107ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 205ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 514ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 204ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 513ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 4843ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 11528ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 4795ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 11433ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 3484ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 7136ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 3476ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 7127ms
```
