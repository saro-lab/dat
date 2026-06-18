## Generate
```shell
curl -X POST http://localhost:8088/v1/cert/HMAC-SHA512-MFS/IV-AES256-GCM/1200/10800/600
```
## pair key (verify only) test
```
SINGLE_NODE="ECDSA-P521,IV-AES256-GCM" \
./target/debug/dat-cms
```
## get
```shell
curl http://localhost:8088/v1/certs
curl http://localhost:8088/v1/certs/verify-only
```
## get with version
```shell
curl http://localhost:8088/v1/certs?version=1
curl http://localhost:8088/v1/certs/verify-only?version=2
```
## basic info
```shell

curl http://localhost:8088/health
curl http://localhost:8088/ip
curl http://localhost:8088/version
curl http://localhost:8088/version/api
```
## debug error
```shell
curl http://localhost:8088/404
curl http://localhost:8088/debug/error1
curl http://localhost:8088/debug/error2
curl http://localhost:8088/debug/error3
curl http://localhost:8088/debug/error4
curl http://localhost:8088/debug/error5
curl http://localhost:8088/debug/error6
curl http://localhost:8088/debug/error7
```

# token
## linux, mac
```
TOKEN_MASTER="123456789012" \
TOKEN_CERT_FULL="12345678901a,12345678901b" \
TOKEN_CERT_VERIFY="12345678901C,12345678901D" \
./target/debug/dat-cms
```
## windows
```
$env:TOKEN_MASTER="123456789012"
$env:TOKEN_CERT_FULL="12345678901a,12345678901b"
$env:TOKEN_CERT_VERIFY="12345678901C,12345678901D"
.\target\debug\dat-cms.exe
```
```shell
# ERROR
curl -X POST http://localhost:8088/v1/cert/HMAC-SHA512-MFS/IV-AES256-GCM/1200/10800/600
curl -H "Authorization: 12345678901a" -X POST http://localhost:8088/v1/cert/HMAC-SHA512-MFS/IV-AES256-GCM/1200/10800/600

# PASS
curl -H "Authorization: 123456789012" -X POST http://localhost:8088/v1/cert/HMAC-SHA512-MFS/IV-AES256-GCM/1200/10800/600

# ERROR
curl -H "Authorization: error" http://localhost:8088/v1/certs
curl http://localhost:8088/v1/certs/verify-only

# PASS
curl -H "Authorization: 12345678901b" http://localhost:8088/v1/certs?version=0
curl -H "Authorization: 12345678901C" http://localhost:8088/v1/certs/verify-only
```
