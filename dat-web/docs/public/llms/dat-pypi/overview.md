# dat-pypi — Python DAT client

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. See [dat.saro.me/llms.txt](https://dat.saro.me/llms.txt) for the full protocol contract, error catalog, and non-negotiable rules shared across every DAT client.

## What this library does

`dat-pypi` issues and parses/verifies DAT bearer tokens and optionally synchronizes DAT certificates from a DAT CMS v1 server. It implements the exact five-field DAT wire grammar (`expire.cid.plain.secure.signature`) and the eight-field certificate grammar (`cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key`) described in the main contract — it does not define its own token format.

- Distribution name (PyPI): `saro-dat`
- Import module name: `saro_dat` (underscore; distribution and import names differ)
- Requires Python `>=3.10` (PEP 613 `typing.TypeAlias` floor)
- Runtime dependency: `cryptography>=50.0.0`
- Source suite passed on Python 3.10, 3.11, 3.12, and 3.13

## Install

```shell
pip install saro-dat
```

## Minimal usage

```python
from saro_dat import DatCmsManager, DatError

manager = DatCmsManager.builder() \
    .uri("http://localhost:8088") \
    .token("fullToken") \
    .build()

try:
    token = manager.issue(plain=b"routing-info", secure=b"user-id:42")
    payload = manager.parse(token)
    print(payload.plain, payload.secure)
except DatError as e:
    print(e.code, e.retry, e.security_event)
finally:
    manager.stop()
```

`issue`/`parse` also accept a plain `DatManager` obtained via `DatCmsManager.get_manager()`, or a standalone `DatManager()` when certificates are imported from another trusted channel instead of CMS. See [api.md](./api.md) for the full surface and [errors.md](./errors.md) for the error catalog.
