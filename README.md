# DAT CMS - Certificate Management Service

### Document

- [DAT Run Online](https://dat.saro.me)
- [What is DAT](https://dat.saro.me/intro)
- [Quick Start](https://dat.saro.me/svc/docker-saro-lab-dat-cms)
- [Download](https://github.com/saro-lab/dat-cms/releases)

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
