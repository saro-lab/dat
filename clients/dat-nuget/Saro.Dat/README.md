# DAT - Distributed Access Token

## Document

### [DAT Run Online](https://dat.saro.me)

### [What is DAT](https://dat.saro.me/--/intro)

### [C# Example](https://dat.saro.me/--/libs/nuget-saro-dat)

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
Plain : gvtC1jHD5aNdaNmsbmEQbSqCj5mncD8dJ1jvEMcwEmwEejrzGtxNNDgf9YdQ0ff8YWhLQ2GJNnwegUp39NFuOrlKkyzBXEBnS0me
Secure : vUQGM107ZTOLNuquwMClampmJfcc4isNlieu7YmFCDZ6GShgldKHVTJBGefVHbFaj1gIwN65hE9ljedZz6a6fKijxNSZzzy4xTjc

Multi-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 25ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 16ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 17ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 17ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 18ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 18ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 19ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 18ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 18ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 19ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 24ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 16ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 209ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 198ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 219ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 199ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 547ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 505ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 573ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 508ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 1470ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 1477ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 1498ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 1678ms

Single-Thread
HmacSha256Mfs IvAes128Gcm Issue * 10000 : 43ms
HmacSha256Mfs IvAes128Gcm Parse * 10000 : 44ms
HmacSha256Mfs IvAes256Gcm Issue * 10000 : 48ms
HmacSha256Mfs IvAes256Gcm Parse * 10000 : 44ms
HmacSha384Mfs IvAes128Gcm Issue * 10000 : 51ms
HmacSha384Mfs IvAes128Gcm Parse * 10000 : 52ms
HmacSha384Mfs IvAes256Gcm Issue * 10000 : 53ms
HmacSha384Mfs IvAes256Gcm Parse * 10000 : 51ms
HmacSha512Mfs IvAes128Gcm Issue * 10000 : 51ms
HmacSha512Mfs IvAes128Gcm Parse * 10000 : 46ms
HmacSha512Mfs IvAes256Gcm Issue * 10000 : 50ms
HmacSha512Mfs IvAes256Gcm Parse * 10000 : 51ms
EcdsaP256 IvAes128Gcm Issue * 10000 : 890ms
EcdsaP256 IvAes128Gcm Parse * 10000 : 810ms
EcdsaP256 IvAes256Gcm Issue * 10000 : 873ms
EcdsaP256 IvAes256Gcm Parse * 10000 : 822ms
EcdsaP384 IvAes128Gcm Issue * 10000 : 2235ms
EcdsaP384 IvAes128Gcm Parse * 10000 : 2161ms
EcdsaP384 IvAes256Gcm Issue * 10000 : 2246ms
EcdsaP384 IvAes256Gcm Parse * 10000 : 2160ms
EcdsaP521 IvAes128Gcm Issue * 10000 : 6032ms
EcdsaP521 IvAes128Gcm Parse * 10000 : 6060ms
EcdsaP521 IvAes256Gcm Issue * 10000 : 6076ms
EcdsaP521 IvAes256Gcm Parse * 10000 : 6065ms
```
