# dat-go Overview

This document targets DAT 4.7.x and later, for `github.com/saro-lab/dat/dat-go/v4`. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible.

`dat-go` is the Go implementation of DAT (Distributed Access Token): a bearer-token format with a fixed five-field ASCII wire layout, mandatory expiration, a public byte region, an AES-GCM encrypted byte region, and certificate-selected signatures. It also implements the DAT CMS v1 client contract for certificate distribution. The full cross-language protocol contract is at https://dat.saro.me/llms.txt — this file and its siblings (`api.md`, `errors.md`, `integration.md`) describe only the Go-specific surface.

## Install

```shell
go get github.com/saro-lab/dat/dat-go/v4
```

```go
import "github.com/saro-lab/dat/dat-go/v4"
```

Go `1.25`+ is required (the module intentionally uses `ecdsa.ParseRawPrivateKey`, `ecdsa.ParseUncompressedPublicKey`, and `(*ecdsa.Key).Bytes`, which replace the deprecated `elliptic.Marshal` family).

## Minimal usage

Local (no CMS) issue/verify, mirroring the module's own example test:

```go
package main

import (
	dat "github.com/saro-lab/dat/dat-go/v4"
)

func main() {
	manager := dat.NewManager()

	now := dat.NowUnixTimestamp()
	cert, err := dat.GenerateCertificate(1, now-10, 610, 60, dat.EcdsaP256, dat.IvAes256Gcm)
	if err != nil {
		panic(err)
	}

	if _, err := manager.ImportCertificates([]*dat.Certificate{cert}, false); err != nil {
		panic(err)
	}

	datStr, err := manager.Issue("plain text", "secure text")
	if err != nil {
		panic(err)
	}

	payload, err := manager.Parse(datStr)
	if err != nil {
		panic(err)
	}

	println(payload.PlainText())
	println(payload.SecureText())
}
```

CMS-backed usage (recommended for production — certificates arrive from a DAT CMS server instead of being generated locally):

```go
cms, err := dat.NewDatCmsManagerBuilder().Build()
if err != nil {
	panic(err)
}
defer cms.Close()

datStr, err := cms.Issue("plain text", "secure text")
```

## Supported algorithms

| Signature | Note |
| --- | --- |
| `ECDSA-P256` | secp256r1 |
| `ECDSA-P384` | secp384r1 |
| `ECDSA-P521` | secp521r1 |
| `HMAC-SHA256-MFS` | 256-bit fixed secret |
| `HMAC-SHA384-MFS` | 384-bit fixed secret |
| `HMAC-SHA512-MFS` | 512-bit fixed secret |

| Encryption | Note |
| --- | --- |
| `IV-AES128-GCM` | 96-bit IV/nonce + AES-128-GCM |
| `IV-AES256-GCM` | 96-bit IV/nonce + AES-256-GCM |

See [api.md](./api.md) for the full `Manager`/`CmsManager` surface, [errors.md](./errors.md) for the Go error type and the full `DAT_*` catalog, and [integration.md](./integration.md) for a Go-specific integration checklist.
