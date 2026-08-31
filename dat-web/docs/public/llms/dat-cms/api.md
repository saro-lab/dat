# DAT CMS — API Reference

This document targets DAT 4.7.x and later; the endpoint contract below is unchanged across the 4.7.x line. Source-verified against `dat-cms/src/routes/cert.rs`, `dat-cms/src/dto/cert.rs`, and `dat-cms/src/services/cert_service.rs`.

## Endpoints

| Method and path | Required role | Success body |
| --- | --- | --- |
| `GET /health` | none | `OK` |
| `GET /ip` | none | request client IP as text |
| `GET /version/api` | none | `v1` |
| `GET /version` | `TOKEN_MASTER` | CMS server version string (`CARGO_PKG_VERSION`, e.g. `4.7.0`) |
| `POST /v1/cert/{signature_algorithm}/{crypto_algorithm}/{certificate_propagation_delay_seconds}/{dat_issuance_duration_seconds}/{dat_ttl_seconds}` | `TOKEN_MASTER` | `OK` |
| `GET /v1/certs?version=N` | `TOKEN_CERT_FULL` | plain full-certificate response |
| `GET /v1/certs.json?version=N` | `TOKEN_CERT_FULL` | JSON success envelope |
| `GET /v1/certs/verify-only?version=N` | `TOKEN_CERT_VERIFY` | plain verify-only response |
| `GET /v1/certs/verify-only.json?version=N` | `TOKEN_CERT_VERIFY` | JSON success envelope |

`version` on the `GET` endpoints is an optional `i64` query parameter. Any other path returns `404 DAT_REQ_NOT_FOUND`; an existing path called with the wrong HTTP method returns `405 DAT_REQ_NOT_FOUND`.

### Authorization

Send the raw token value in the `Authorization` header — no `Bearer` prefix. `TOKEN_MASTER`, `TOKEN_CERT_FULL`, and `TOKEN_CERT_VERIFY` are independent, comma-separated, alphanumeric (`[A-Za-z0-9]+`) token lists.

- Token absent or unknown to every role and the required role list is non-empty → `401 DAT_AUTH_UNAUTHORIZED`.
- Token known but not registered for the endpoint's role → `403 DAT_AUTH_FORBIDDEN`.
- A role's list is empty → only the endpoints protected by that specific role become unauthenticated; the server logs `DAT_AUTH_DISABLED` for that role at startup. The other two roles remain enforced independently.

## Certificate creation

`POST /v1/cert/{sig}/{crypto}/{delay}/{duration}/{ttl}` validates in this order:

1. `sig`/`crypto` must be exact DAT wire algorithm names (`DatSignatureAlgorithm`/`DatCryptoAlgorithm`); otherwise `400 DAT_REQ_ALG_UNSUPPORTED` with `details: {"kind": "signature"|"crypto", "algorithm": "<value>"}`.
2. `delay >= 0`, `duration > 0`, `ttl > 0`, and each value `<= 315360000` (`MAX_SECONDS`, 10 years); otherwise `400 DAT_REQ_MALFORMED` with a `details` reason string.

On success the server, inside one database transaction:

1. Deletes certificate rows whose `expire` is older than a 30-day retention window (`DB_DAT_CMS_CERT_RETENTION_SECONDS`).
2. Chooses the issuance window:
   - Normal case (an issuable certificate already exists covering `now`): `start = now + delay`, `duration = requested duration`.
   - Emergency-continuity case (no certificate is currently issuable): `start = now`, `duration = delay + requested duration`, and the server logs a warning that the certificate was issued without delay.
3. Generates key material for the requested algorithms and inserts the row with a random `u32` `cid`, retrying up to 1000 times on a `cid` collision (`STORE_UNKNOWN` if none is free after 1000 attempts).
4. Commits the transaction, then invalidates the certificate cache.

The delay is a propagation window: clients should receive the certificate via sync before any issuer selects it for new DATs.

## Plain certificate success (`/v1/certs`, `/v1/certs/verify-only`)

Any HTTP status `200..299` is a success body. Strict ASCII; first line is the version, later lines are certificates, LF-separated:

```text
42
a.0.32506363000.32506358400.HMAC-SHA256-MFS.IV-AES256-GCM.<sig-key>.<aes-key>
```

A version-only body (`42\n` or `42`) is valid when there are no eligible certificates to return for that query. `verify-only` requests return each certificate's ECDSA-public-only / no-signing-key form; HMAC certificates never appear in the verify-only response (HMAC has no verify-only export).

The returned `version` is always the server's current cache version, not necessarily the requested `version`: if the cache version is `>=` the requested version, the server returns only certificates newer than the requested cursor; otherwise it returns the full eligible set from cursor `0`.

## JSON certificate success (`/v1/certs.json`, `/v1/certs/verify-only.json`)

```json
{"code":"ok","data":{"version":42,"list":["<certificate>"]}}
```

`version` is `i64`; `list` is an array of certificate wire strings (possibly empty).

## Server error envelope

Every non-success response, including from the plain-text endpoints, is JSON:

```json
{"code":"DAT_REQ_ALG_UNSUPPORTED","details":{"kind":"signature","algorithm":"BOGUS"}}
```

`details` is optional. See [errors.md](./errors.md) for the full code catalog and HTTP status mapping.
