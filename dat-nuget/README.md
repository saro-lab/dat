# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [C# Example](https://dat.saro.me/--/libs/nuget-saro-dat)
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
- [BenchTest.cs](https://github.com/saro-lab/dat/tree/master/dat-nuget/Saro.Dat.Tests/BenchTest.cs)
```
Plain : gBj61uokB2tkH3ARfxH9XRrEK1Zw2pAOE9toqUAdg1h6qJYoDuZQBnX8z3w0LeWxXwqkm4Pn5oYQh26N8oG2oGQEZSo5134DVi70
Secure : 6LxD2YGHj15LfwWYDJqjPY16pnwRS2FQdQFi2tz2lqAmkqti80i1zvmb1C7qnUEhDhwYiaJ6x7CUjfcmiHj6dTajUHHNRRDBblJa

Multi-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 17ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 14ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 13ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 14ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 15ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 11ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 18ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 12ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 14ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 11ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 17ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 12ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 200ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 178ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 211ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 193ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 538ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 501ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 514ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 489ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 1438ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 1416ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 1449ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 1406ms

Single-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 31ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 32ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 29ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 31ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 33ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 37ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 35ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 36ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 32ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 34ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 33ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 35ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 870ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 806ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 868ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 793ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 2205ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 2133ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 2200ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 2123ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 6215ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 6251ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 6218ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 6194ms
```
