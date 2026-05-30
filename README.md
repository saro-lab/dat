# DAT CMS - Certificate Management Service

## Document

### [DAT Run Online](https://dat.saro.me)

### [What is DAT](https://dat.saro.me/intro)

### [Quick Start!! Docker, Kubernetes, Binary](https://dat.saro.me/svc/docker-saro-lab-dat-cms)

### [Support Languages](https://dat.saro.me)
- Rust -> Crates
- Kotlin, Java -> Maven
- TypeScript, JavaScript -> Npm
- Python -> Pypi
- C# -> Nuget
- Ruby -> Gem
- Go

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


## Build
- Linux amd64
```shell
# sudo apt-get install musl-tools
./build/linux_amd64.sh
```
- Linux arm64
```shell
# sudo apt-get install musl-tools
./build/linux_arm64.sh
```
- Mac amd64,
```shell
./build/mac_amd64.sh
```
- Mac arm64,
```shell
./build/mac_arm64.sh
```
- Windows amd64,
```shell
powershell -ExecutionPolicy Bypass -File .\build\win_amd64.ps1
```
- Windows arm64,
```shell
powershell -ExecutionPolicy Bypass -File .\build\win_arm64.ps1
```

