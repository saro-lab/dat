# DAT CMS - Certificate Management Service

### Document

- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Quick Start](https://dat.saro.me/svc/docker-saro-lab-dat-cms)
- [Download](https://github.com/saro-lab/dat-cms/releases)

### Build
- Install Rust: https://rust-lang.org/
- Build: ```cargo build --release```
- Binary Path: ```target/release/dat-cms```
- Run: ```cargo run --package dat-cms --bin dat-cms```
- Run: [Example with Options](https://dat.saro.me/svc/docker-saro-lab-dat-cms?binary)


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
