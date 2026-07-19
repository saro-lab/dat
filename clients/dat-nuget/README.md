# DAT - Distributed Access Token

### Document
- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [C# Example](https://dat.saro.me/--/libs/nuget-saro-dat)

### Support Platform
- [Rust](https://github.com/saro-lab/dat-rust)
- [Java, Kotlin](https://github.com/saro-lab/dat-maven)
- [Javascript, Typescript](https://github.com/saro-lab/dat-npm)
- [C#](https://github.com/saro-lab/dat-nuget)
- [Python](https://github.com/saro-lab/dat-pypi)
- [Go](https://github.com/saro-lab/dat-go)
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
- [BenchTest.cs](Saro.Dat.Tests/BenchTest.cs)
```
Plain : AyQpljQgoxX5TCZj4MqVXDCbI0jJe6I2Fk8UW0QnRVfG2r6DTYgCdR9brxiOKvp1IyIggmxrdBWSDzWab1NeV1kI1gpMNS4KfKwx
Secure : ljaUNr2LTgM0wG8gJnEOJ130NC128f7rAgmWq5u2PcY817jOVU24CbfMuaahH4JYjlkbFJEtXZa6eOQHOPjh4qB73jxrEd8mN7GJ

Multi-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 22ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 15ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 19ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 15ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 18ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 15ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 19ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 11ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 16ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 11ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 19ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 11ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 208ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 203ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 235ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 185ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 560ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 547ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 536ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 504ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 1523ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 1462ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 1450ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 1465ms

Single-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 35ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 34ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 35ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 35ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 55ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 44ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 40ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 34ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 38ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 36ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 37ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 35ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 870ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 785ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 845ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 782ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 2176ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 2113ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 2155ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 2126ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 6039ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 5958ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 5944ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 5856ms
```
