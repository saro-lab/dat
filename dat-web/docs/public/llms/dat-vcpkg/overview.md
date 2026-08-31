# dat-vcpkg Overview

This document targets DAT 4.7.x and later for the C/C++ (vcpkg) DAT implementation. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. See https://dat.saro.me/llms.txt for the full DAT protocol contract that this library implements unchanged.

## What this is

`dat` is a static C library (C11) implementing the DAT wire format, certificate management, HMAC/ECDSA signatures, and AES-GCM encryption, plus an optional CMS v1 HTTP sync client (`dat_cms_manager_t`) built on libcurl. It links OpenSSL for crypto, pthreads for the CMS background sync thread, and (optionally) libcurl — a build without libcurl compiles the core DAT/certificate API but CMS manager calls return `DAT_CMS_NOT_SUPPORTED`.

Package identity: vcpkg port name `dat`, CMake package `dat` (`find_package(dat CONFIG REQUIRED)`, target `dat::dat` after `vcpkg_cmake_config_fixup`).

## Install

```shell
vcpkg install dat
```

or in a manifest (`vcpkg.json`):

```json
{
  "dependencies": ["dat"]
}
```

To consume this port directly from the repository, use it as an overlay port: `vcpkg install dat --overlay-ports=<path-to>/dat-vcpkg`, or add it as a git registry entry in `vcpkg-configuration.json`.

## Minimal usage

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "dat/dat.h"

int main(void) {
    dat_manager_t* manager = dat_manager_new();

    dat_certificate_t* cert = NULL;
    dat_error_t err = dat_certificate_create(
        1,                       /* cid */
        0,                       /* issuance window start (unix seconds) */
        200,                     /* issuance window duration (seconds) */
        100,                     /* DAT TTL (seconds) */
        DAT_SIG_ECDSA_P256,
        DAT_CRYPTO_IV_AES256_GCM,
        &cert);
    if (err != DAT_SUCCESS) { return 1; }

    size_t imported = 0;
    dat_manager_import_certificates(manager, &cert, 1, false, &imported);

    char* dat = NULL;
    err = dat_manager_issue(manager, "plain bytes", "secure bytes", &dat);
    if (err != DAT_SUCCESS) { return 1; }

    dat_payload_t* payload = NULL;
    err = dat_manager_parse(manager, dat, &payload);
    if (err != DAT_SUCCESS) { return 1; }

    printf("DAT: %s\n", dat);
    printf("plain: %.*s\n", (int)payload->plain_len, (char*)payload->plain_bytes);

    free(dat);                       /* dat_manager_issue output is caller-owned */
    dat_payload_free(payload);       /* dat_manager_parse output owns its own buffers */
    dat_certificate_free(cert);
    dat_manager_free(manager);
    return 0;
}
```

Link against `dat::dat` (CMake) and OpenSSL/pthreads/(curl) as pulled in transitively by the exported CMake config.

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
| `IV-AES128-GCM` | 96-bit IV + AES-128-GCM |
| `IV-AES256-GCM` | 96-bit IV + AES-256-GCM |

See [api.md](./api.md) for the full C API, [errors.md](./errors.md) for the error catalog, and [integration.md](./integration.md) for a deployment checklist.
