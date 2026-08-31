# dat-pypi API reference

Source-verified against `dat-pypi/src/saro_dat/*.py`. This document targets DAT 4.7.x and later; any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. Package/module: `saro_dat`.

## `DatManager`

Certificate-holding manager with no network I/O. Use it directly when certificates are imported from a non-CMS trusted channel.

| Method | Signature | Behavior |
| --- | --- | --- |
| `import_certificates` | `(input_certs: List[DatCertificate], clear: bool = False) -> int` | Merge (`clear=False`) or replace (`clear=True`) certificates; returns the number of newly added certificates. Raises `DatError(CERT_DUPLICATE_CID)` if `input_certs` itself repeats a `cid` |
| `imports` | `(format_str: str, clear: bool = False) -> int` | Parse newline-separated certificate wire lines, then `import_certificates` |
| `exports` | `(verify_only: bool = False) -> str` | Serialize held certificates as newline-joined wire lines |
| `issue` | `(plain: bytes \| str \| None, secure: bytes \| str \| None) -> str` | Issue a DAT with the currently selected issuer certificate |
| `parse` | `(dat_input: Dat \| str \| None) -> DatPayload` | Verify signature, check expiry, decrypt `secure` |

`import_certificates` merge semantics: existing `cid`s win (an already-held `cid` in the input is skipped, not replaced), certificates are re-sorted by `dat_issuance_end_seconds`, expired certificates are dropped, and the issuer is recomputed as the last issuable certificate. This exactly matches the CMS `clear=false` contract in the main llms.txt.

`issue` raises `DatError(MANAGER_NO_CERTIFICATE)` when no certificates are held, or `DatError(MANAGER_NO_ISSUABLE_CERTIFICATE)` with a chained cause (`CERT_NOT_YET_ISSUABLE`, `CERT_ISSUANCE_ENDED`, `CERT_VERIFY_ONLY`, or `CERT_EXPIRED`) via `__cause__` when certificates exist but none can currently sign.

## `DatCmsManager` / `DatCmsManagerBuilder`

Wraps a `DatManager` with CMS v1 synchronization over `urllib`.

```python
manager = DatCmsManager.builder() \
    .uri("http://localhost:8088") \
    .token("fullToken") \
    .verify_only(False) \
    .interval_seconds(60) \
    .connect_timeout_seconds(5) \
    .sync_timeout_seconds(15) \
    .build()
```

| Builder method | Default | Notes |
| --- | --- | --- |
| `uri(str)` | `http://localhost:8088` | Scheme must be `http`/`https`, path-less, query-less, or `build()` raises `DatError(CONFIG_URI_INVALID)`. The builder appends `/v1/certs` (or `/v1/certs/verify-only`) itself |
| `token(str)` | `""` | Sent verbatim in the `Authorization` header, no `Bearer` prefix |
| `verify_only(bool)` | `False` | Selects `/v1/certs/verify-only` instead of `/v1/certs` |
| `interval_seconds(int)` | `60` | Background sync period |
| `interval_off()` | — | Shorthand for `interval_seconds(0)`, disabling background sync |
| `connect_timeout_seconds(float)` | `5` | See transport limitation below |
| `sync_timeout_seconds(float)` | `15` | See transport limitation below |

`build()` constructs the `DatCmsManager`, whose `__init__` immediately calls `self.sync()` (best-effort — a failure does not raise) and, if `interval_seconds > 0`, schedules a daemon `threading.Timer` for periodic sync. The manager is always usable after `build()` even if that first sync failed.

| Instance method | Signature | Behavior |
| --- | --- | --- |
| `sync()` | `() -> None` | Non-throwing; on failure (except the `STATE`-class `DAT_CMS_SYNC_IN_PROGRESS`) stores the error and logs it, retrievable via `last_error()` |
| `sync_or_raise()` | `() -> None` | Raises `DatError` immediately on failure; this is the manual/immediate sync operation |
| `last_error()` | `() -> Optional[DatError]` | Last non-state error; `None` after a successful sync |
| `stop()` | `() -> None` | Cancels the pending `threading.Timer` and marks the manager stopped; see transport limitation |
| `get_manager()` | `() -> DatManager` | The wrapped certificate manager |
| `issue` / `parse` | same as `DatManager` | Delegates to the wrapped `DatManager` |

### `urllib` transport limitation

`DatCmsManager` uses `urllib.request` with a single timeout value passed to `opener.open(request, timeout=...)`: `sync_timeout_seconds` if non-zero, otherwise `connect_timeout_seconds`, otherwise no timeout (blocking). This is **one socket-operation timeout**, not independently enforced connect and total/wall-clock phases. Redirects are restricted to the same `(scheme, netloc)` origin as `uri` via a custom `HTTPRedirectHandler`; a cross-origin redirect raises `urllib.error.URLError`, which is mapped to `DAT_CMS_UNREACHABLE`.

`stop()` cancels the timer and prevents future scheduling but does **not** forcibly cancel a blocked in-flight `urllib` call. If a sync is in flight when `stop()` is called, that call runs to completion (or to its socket timeout) before releasing its references; do not assume `stop()` bounds worst-case shutdown latency to less than the configured timeout.

## Response parsing (internal, `sync_or_raise`)

The plain-endpoint response is read as bytes, rejected as `DAT_CMS_MALFORMED` if empty or if any byte is `> 0x7f` (non-ASCII), then decoded as ASCII and split on the first `\n` into a version line and an optional certificate block. An empty/non-decimal version line is `DAT_CMS_MALFORMED`. A version-only body (no certificate block after stripping) returns successfully without touching `self._version` or the held certificates — matching the shared "version-only response preserves state" rule. A server version lower than the client's current version only logs `DAT_CMS_VERSION_RESET`; it does not raise. Import failures from `DatManager.imports` are re-raised as `DAT_CMS_IMPORT_FAILED` with the original `DatError` attached via `__cause__`.

## `Dat` / `DatPayload`

`Dat(dat_str)` parses (but does not verify) a token string into `_expire`, `_cid`, `_plain`, `_secure`, `_signature`; `.error` holds a `DatError` on structural failure (checked lazily via `raise_if_invalid()`), covering the exact-5-fields rule, `expire`/`cid` numeric syntax, Base64Url decoding of `plain`/`secure`/`signature`, and non-empty `signature`. `.expired()` checks `now >= expire` (unformed tokens are treated as expired). `DatManager.parse` additionally raises `DAT_TOKEN_EXPIRED` and `DAT_SIG_MISMATCH` after structural parsing succeeds — never trust `Dat` fields before `DatManager.parse`/`raise_if_invalid` succeeds.

`DatPayload(plain_bytes, secure_bytes)` exposes both the raw `plain_bytes`/`secure_bytes` and UTF-8-decoding `.plain`/`.secure` string properties. The string properties raise `UnicodeDecodeError` on invalid UTF-8 rather than silently replacing or truncating — use the `*_bytes` attributes for binary payloads.

## `DatCertificate`

`DatCertificate(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_key, crypto_key)` validates every numeric field fits `uint64` and that `start + duration` and `end + ttl` do not overflow (raises `DAT_CERT_MALFORMED` otherwise). `.exports(verify_only=False)` serializes the 8-field wire line; `.imports(format_str)` (classmethod) parses one. `.issuable()`, `.expired()`, `.signable()`, `.pair()`, and `.support_verify_only()` mirror the certificate state rules in the main contract (inclusive issuance window, `certificate_expire >= now` validity, HMAC has no verify-only form).
