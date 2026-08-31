# DAT CMS — Server Error Reference

This document targets DAT 4.7.x and later; the error-code catalog below is unchanged across the 4.7.x line. Source-verified against `dat-cms/src/codes.rs`.

All server error responses are the JSON envelope `{"code":"<CODE>","details":{...}}`; `details` is optional. See [api.md](./api.md) for where each code is emitted.

## Server-defined codes — 10 total

### AUTH — 3 codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | `401` | `Authorization` missing or unknown to any role, and the required role's token list is non-empty |
| `DAT_AUTH_FORBIDDEN` | `403` | Token is known but not registered for the endpoint's required role |
| `DAT_AUTH_DISABLED` | none (startup log only) | Logged once per empty role list (`TOKEN_MASTER`, `TOKEN_CERT_FULL`, `TOKEN_CERT_VERIFY`) at process start; never returned as an HTTP response |

### REQ — 5 codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `DAT_REQ_MALFORMED` | `400` | Path argument invalid: negative delay, non-positive duration/TTL, or any of the three exceeding `315360000` seconds (10 years) |
| `DAT_REQ_ALG_UNSUPPORTED` | `400` | `{signature_algorithm}` or `{crypto_algorithm}` path segment is not an exact DAT wire algorithm name |
| `DAT_REQ_NOT_FOUND` | `404` (unknown route) or `405` (existing route, wrong method) | Route does not exist or method is not allowed |
| `DAT_REQ_TOO_LARGE` | `413` | Defined in the code table; current routes never construct it |
| `DAT_REQ_UNKNOWN` | `400` | Defined in the code table; current routes never construct it |

### STORE — 2 codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `DAT_STORE_UNAVAILABLE` | `503` | Certificate-list query exceeded `DB_QUERY_TIMEOUT_SECS` with no last-known-good snapshot available, or another transient database-unavailability condition |
| `DAT_STORE_UNKNOWN` | `500` | Corrupt certificate row, exhausted the bounded registration-retry loop, exhausted 1000 `cid`-collision attempts, or another non-transient storage failure |

## Common `DAT_*` codes the server can also emit

Certificate generation/loading can surface common DAT codes through the same JSON envelope. `dat-cms/src/codes.rs::status_of` maps them explicitly:

| Codes mapped to `400` | Codes mapped to `500` (everything else, including unrecognized codes) |
| --- | --- |
| `DAT_CONFIG_ALG_UNSUPPORTED`, `DAT_CONFIG_URI_INVALID`, `DAT_CONFIG_ARGUMENT_INVALID` | `DAT_CONFIG_UNKNOWN` |
| `DAT_TOKEN_MALFORMED`, `DAT_TOKEN_EXPIRED`, `DAT_TOKEN_UNKNOWN` | `DAT_CERT_*` (all 9 codes; certificate rows are server-generated, so a certificate error here is a server fault, not caller input) |
| `DAT_SIG_MISMATCH`, `DAT_SIG_MALFORMED` | `DAT_SIG_KEY_MISSING`, `DAT_SIG_BACKEND`, `DAT_SIG_UNKNOWN` |
| `DAT_CRYPTO_TAG_MISMATCH`, `DAT_CRYPTO_DATA_INVALID` | `DAT_CRYPTO_BACKEND`, `DAT_CRYPTO_UNKNOWN` |
| | `DAT_KEY_INVALID`, `DAT_KEY_VERIFY_ONLY_UNSUPPORTED`, `DAT_KEY_UNKNOWN` |
| | `DAT_INTERNAL_UNAVAILABLE`, `DAT_INTERNAL_UNKNOWN` |

An unrecognized code string (including the empty string) maps to `500`, matching the CMS design principle that the server never guesses a caller fault for a code it does not explicitly classify as one.

## Client-side observation

CMS synchronization clients (in every language) do not parse the non-2xx JSON body: they map only the HTTP status to a `DAT_CMS_*` error and discard the server's `code`/`details`. See the per-client `errors.md` documents (linked from [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt)) for that client-side mapping.
