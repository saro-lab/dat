# DAT for Python

Package: `saro-dat` | import name `saro_dat` | Python >= 3.10 | source: `dat-pypi/`

## Install

```sh
pip install "saro-dat~=4.6.2"
```

## Imports

```python
from saro_dat import (
    DatCmsManager, DatManager, DatCertificate,
    DatCrypto, DatCryptoAlgorithm,
    DatSignature, DatSignatureAlgorithm,
    DatError, DatRetry, error as E,
)
```

`error` is a module of code constants - `E.TOKEN_EXPIRED` is the string `"DAT_TOKEN_EXPIRED"`.

## With a CMS (production)

```python
from saro_dat import DatCmsManager, DatRetry

manager = (
    DatCmsManager.builder()
    .uri("http://localhost:8088")
    .token("12345678901b")
    .verify_only(False)          # True only when a separate service does the issuing
    # .interval_off()            # no background timer; call sync() yourself
    .interval_seconds(60)
    .build()
)

# build() never raises on a failed first sync - it returns a manager with no
# certificates so a CMS outage cannot stop your app from starting.
sync_error = manager.last_error()
if sync_error is not None and sync_error.retry is DatRetry.PERMANENT:
    # Retrying will not help - the token or the URL is wrong.
    print("fix the CMS config:", sync_error.code)
```

The URI must be scheme + host + port - no path, no query. `manager.sync()` forces a cycle;
`manager.stop()` cancels the background timer; `manager.get_manager()` reaches the inner
`DatManager`.

Synchronization runs on a background thread, so build the manager once at process start. Under a
pre-forking server (gunicorn, uWSGI) build it **after** the fork - in a worker hook, not at import
time in the parent - so each worker owns its own timer.

## Issue and parse

```python
plain = "42|acme|admin"
secure = "42|s-91af|billing:rw"

dat = manager.issue(plain, secure)

payload = manager.parse(dat)
payload.plain    # "42|acme|admin"
payload.secure   # "42|s-91af|billing:rw"
```

`issue` accepts `str` or `bytes`. `DatPayload` also exposes `plain_bytes` / `secure_bytes` for
non-text payloads.

## Without a CMS

```python
import time
from saro_dat import DatCertificate, DatCrypto, DatCryptoAlgorithm, DatManager, DatSignature, DatSignatureAlgorithm

dat_manager = DatManager()

# (cid, issuance_start, issuance_duration, dat_ttl, signature, crypto)
now = int(time.time())
cert = DatCertificate(
    0,
    now - 10,
    3600,
    1800,
    DatSignature.generate(DatSignatureAlgorithm.ECDSA_P256),
    DatCrypto.generate(DatCryptoAlgorithm.IV_AES128_GCM),
)

dat_manager.import_certificates([cert])

dat = dat_manager.issue(plain, secure)
payload = dat_manager.parse(dat)
assert payload.plain == plain
assert payload.secure == secure
```

`int(time.time())` - **seconds**. The third argument is a duration, not an end time.

Enums: `DatSignatureAlgorithm.{ECDSA_P256, ECDSA_P384, ECDSA_P521, HMAC_SHA256_MFS,
HMAC_SHA384_MFS, HMAC_SHA512_MFS}`, `DatCryptoAlgorithm.{IV_AES128_GCM, IV_AES256_GCM}`.

Note the constructor takes an already-generated `DatSignature` / `DatCrypto`, unlike the Rust and
JVM `generate(...)` helpers that take the algorithm enums directly.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `DatManager()` | manager |
| `issue(plain, secure)` | `str` |
| `parse(dat)` | `DatPayload` |
| `import_certificates(certs, clear=False)` | `int` |
| `imports(format_str, clear=False)` | `int` - text format |
| `exports(verify_only=False)` | `str` |

`DatCmsManager` adds `sync()`, `last_error()`, `stop()`, `get_manager()` and forwards
`issue` / `parse`.

## Verify-only export

```python
# ECDSA certificates export the public key only.
verify_only_format = dat_manager.exports(True)

verifier = DatManager()
verifier.imports(verify_only_format)

# HMAC is symmetric, so it has no verify-only form: exports(True) raises DatError with
# code DAT_KEY_VERIFY_ONLY_UNSUPPORTED when the manager holds an HMAC certificate.
```

## Error handling

Every failure is a `DatError` carrying a `code` identical across all official clients. The split
that matters most: **an expired token is not a forged one.**

```python
from saro_dat import DatError, DatRetry, error as E

def verify(manager, dat):
    try:
        return manager.parse(dat)
    except DatError as e:
        if e.code == E.TOKEN_EXPIRED:
            # Normal end of life. Send the client back to log in again.
            return refresh_flow()
        if e.security_event:
            # Forged signature or tampered payload - exactly two codes set this.
            security_log(e.code)
            return block_session()
        # Malformed, unknown cid, ... - just reject the request.
        return reject(e.code)
```

`retry` tells you whether trying again can ever help. Do not loop on a permanent one - a wrong CMS
token stays wrong no matter how many times you retry.

```python
# TRANSIENT -> back off and retry | PERMANENT -> fix config | STATE -> not an error
if e.retry is DatRetry.TRANSIENT:
    backoff()
    return retry()
```

`DatError` inherits from **both** `ValueError` and `RuntimeError`. The same condition used to raise
different types depending on the call path, so existing `except ValueError` / `except RuntimeError`
blocks keep working - but new code should catch `DatError` and branch on `code`.

Full code table: [errors.md](https://dat.saro.me/llms/errors.md).

## FastAPI dependency

```python
from fastapi import Depends, Header, HTTPException
from saro_dat import DatError

def current_payload(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401)
    try:
        return manager.parse(authorization[7:])
    except DatError as e:
        if e.security_event:
            security_log(e.code)
        raise HTTPException(401)

@app.get("/me")
def me(payload = Depends(current_payload)):
    return {"plain": payload.plain}
```

`manager` is the module-level singleton built at startup.

## Notes

- One manager per process (per worker under a pre-forking server).
- `parse` is synchronous and cheap; no thread pool needed in async frameworks.
- Test code worth reading: `dat-pypi/tests/test_cms_manager.py`, `test_manager.py`, `test_hard.py`,
  `test_error_code.py`.
