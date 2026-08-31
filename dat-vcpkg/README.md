# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Example](https://dat.saro.me/libs/vcpkg-dat)
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
- release mode
- [bench_test.c](tests/bench_test.c)
```
plain: NwaFHujW23BeN6zIsFKzORkOha0R1cgwdjrImsjDIpuDpVZAX08aigQBI8pS1103K7uuLo8Arp8euYNbAha49t5bcZ2P0QLzjSzR
secure: t3QD0n3QxmY1JytcUpoGBSHQo9pPDVMyoXebG5ZVPQ9ZOlFReLauuKPIOlcY1nc97tbkQyqWm12UuHbZOR9Li1962Ye85uddWfrC

Multi-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 8ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 8ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 8ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 8ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 8ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 8ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 8ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 8ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 29ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 65ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 29ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 64ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 177ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 362ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 180ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 363ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 239ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 420ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 236ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 421ms

Single-Thread
HMAC-SHA256-MFS IV-AES128-GCM Issue * 10000 : 14ms
HMAC-SHA256-MFS IV-AES128-GCM Parse * 10000 : 13ms
HMAC-SHA256-MFS IV-AES256-GCM Issue * 10000 : 14ms
HMAC-SHA256-MFS IV-AES256-GCM Parse * 10000 : 13ms
HMAC-SHA384-MFS IV-AES128-GCM Issue * 10000 : 16ms
HMAC-SHA384-MFS IV-AES128-GCM Parse * 10000 : 15ms
HMAC-SHA384-MFS IV-AES256-GCM Issue * 10000 : 15ms
HMAC-SHA384-MFS IV-AES256-GCM Parse * 10000 : 15ms
HMAC-SHA512-MFS IV-AES128-GCM Issue * 10000 : 16ms
HMAC-SHA512-MFS IV-AES128-GCM Parse * 10000 : 15ms
HMAC-SHA512-MFS IV-AES256-GCM Issue * 10000 : 16ms
HMAC-SHA512-MFS IV-AES256-GCM Parse * 10000 : 15ms
ECDSA-P256 IV-AES128-GCM Issue * 10000 : 130ms
ECDSA-P256 IV-AES128-GCM Parse * 10000 : 344ms
ECDSA-P256 IV-AES256-GCM Issue * 10000 : 133ms
ECDSA-P256 IV-AES256-GCM Parse * 10000 : 343ms
ECDSA-P384 IV-AES128-GCM Issue * 10000 : 1027ms
ECDSA-P384 IV-AES128-GCM Parse * 10000 : 2135ms
ECDSA-P384 IV-AES256-GCM Issue * 10000 : 1025ms
ECDSA-P384 IV-AES256-GCM Parse * 10000 : 2141ms
ECDSA-P521 IV-AES128-GCM Issue * 10000 : 1320ms
ECDSA-P521 IV-AES128-GCM Parse * 10000 : 2360ms
ECDSA-P521 IV-AES256-GCM Issue * 10000 : 1324ms
ECDSA-P521 IV-AES256-GCM Parse * 10000 : 2358ms
```
