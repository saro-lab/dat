# AI Coding Guide

## Vibe coding example

```
Apply DAT to the session authentication in this web server.
It is a distributed access token like JWT, and the docs are at https://dat.saro.me/llms.txt
Read them first. Download the whole llms doc set into a docs/dat folder and update the agent docs too.

- Project: Java Spring Boot, using Spring Security
- Goal: replace the session with DAT
- DAT-CMS server: http://localhost:8088 - move it into properties
- Signature algorithm: HMAC-SHA512-MFS
- Encryption algorithm: IV-AES256-GCM
- Defaults for everything else

Do not invent APIs that are not in the docs.
```


## Algorithms

### Signature

| Algorithm | Notes |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · Hash based<br/>· Symmetric key<br/>· Fast<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · Elliptic curve based<br/>· Asymmetric key<br/>· Security bought with speed<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- HMAC is overwhelmingly faster, so if keeping outside attackers out is all that matters, HMAC is the one to pick.
- ECDSA lets you separate the issuing server from the verifying servers thanks to its public key structure. On a large system where authority and roles are already separated, it strengthens security against insider attacks.

### Encryption

| Name | Key length |
| --- |---|
| `IV-AES128-GCM` | 128-bit |
| `IV-AES256-GCM` | 256-bit |

- The data DAT encrypts is short, so there is almost no measurable difference between 128-bit and 256-bit.
- AES costs practically nothing, so 256-bit is recommended for the extra security margin.


## DAT-CMS server

**[Install DAT-CMS](./svc/docker-saro-lab-dat-cms)**

DAT-CMS is not required, but installing it is strongly recommended when you need to distribute certificates across several servers and automate key rolling.

## Next

- [What is DAT?](./intro) - why DAT was designed
- [DAT specification](./spec/dat) - the token wire format
- [All libraries](./libs/) - installation and examples per language
