# Error Codes

These are the error codes shared by every service library DAT officially supports.

Each code carries two values — **impact** and **retry** — and some also carry a **suspect** tag.

## Impact — the damage to the service

This is the basis for alerting. It answers one question: "Is the service down right now?"

| Impact | Meaning | Example |
| --- | --- | --- |
| <span class="lg lg-critical">Critical</span> | The service or a specific feature **stops.** Issuance impossible, synchronization permanently failing, initialization failing | The issuing server holds no usable certificate at all |
| <span class="lg lg-partial">Partial</span> | Some requests or cycles fail, but the service keeps running. It usually recovers on its own | One CMS cycle failed. The existing certificates keep working |
| <span class="lg lg-none">No impact</span> | The request is rejected. Nothing else happens | A tampered token arrived. Filtering it out is all that is needed |

**No impact** is not something to alert on. If every engineer on call has to look at a single piece of bad input, the alert stops meaning anything.

## Suspect — investigate when it persists

A code tagged <span class="lg lg-suspect">Suspect</span> is **part of normal operation when it happens once**. A client can send a bad value at any time, and filtering it out is exactly the library's job.

But if such errors show up **continuously, or in bursts from one source**, it is one of two things.

- **A configuration problem** — a bad deployment, an old client still running, or certificates that no longer line up.
- **An attack attempt** — someone tampering with tokens or keys to get past verification, or probing for values that work.

So for these codes, **track the count as a metric**. Alert only when it crosses a threshold.

## Retry

| Retry | Meaning |
| --- | --- |
| <span class="lg lg-transient">Transient</span> | Retrying after a backoff will clear it |
| <span class="lg">Permanent</span> | Do not retry. Configuration or input has to be fixed |
| <span class="lg">State</span> | A signal, not an error |

---

## Token

Problems with the received token string itself.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Reject the request">
The dot-separated parts are not exactly five, or <code>expire</code> is not plain decimal, or <code>cid</code> is not plain hexadecimal, or <code>plain</code>/<code>secure</code> is not base64url, or a numeric field exceeded the integer range.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Prompt for a token refresh">
<code>expire &lt;= now</code>. <strong>The exact second counts as expired</strong> — <code>expire == now</code> is already treated as expired.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A token error that falls into none of the categories above.
</ErrorCode>

::: tip Expiry and a malformed token must stay separate
The responses are opposites — expiry is a normal end of life, so refreshing the token is enough, while a malformed token was never one we issued and has to be rejected.

Parsing **settles the structure first**, then looks at values. A string with too few parts, like `"1.2.3"`, is not an expired token but not a token at all, so it is `DAT_TOKEN_MALFORMED`.

A signed `expire` field such as `+100` is a format error too, not an expiry. Only plain ASCII digits are accepted.
:::

---

## Certificate

The format of the certificate string, and whether that certificate is usable right now.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Redeploy the certificate">
The dot-separated parts are not exactly eight, or parsing <code>cid</code>/<code>start</code>/<code>duration</code>/<code>ttl</code> failed, or a key field is not base64url, or <code>start + duration + ttl</code> overflowed u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Renew the certificate">
<code>start + duration + ttl &lt; now</code>. Fully expired — neither issuance nor verification is possible.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Wait">
<code>now &lt; start</code>. The issuance window has not opened yet.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Deploy a new certificate">
<code>now &gt; start + duration</code>, but the ttl still has time left. Issuance is no longer possible; only verification is.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Check the deployment configuration">
A certificate that holds only the public key, without the signing private key. It can verify but cannot issue.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Reject the request">
No certificate is held for the token's <code>cid</code>. Either the token is forged or the deployment is wrong.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Retry after synchronization">
That <code>cid</code> has not arrived from the CMS yet. It appears briefly right after a new certificate is deployed.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Check the server response">
The same <code>cid</code> appears more than once in the list being imported.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A certificate error that falls into none of the categories above.
</ErrorCode>

`DAT_CERT_NOT_FOUND` and `DAT_CERT_NOT_SYNCED` look the same from outside but call for different responses. The first is a `cid` we never issued, so waiting will not produce it; the second clears as soon as synchronization catches up.

A single `DAT_CERT_NOT_FOUND` just gets filtered out, but a sudden increase means the deployment has drifted or forged tokens are circulating.

---

## Signature

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Block the session, log to security">
Signature verification ended in a <strong>mismatch</strong>. The HMAC value differs, or ECDSA verify returned false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Reject the request">
The signature part is empty, or is not base64url, or the ECDSA <code>r‖s</code> length does not match the curve, or the DER conversion failed.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Check the issuing server configuration">
Signing was attempted with a verify-only key. At runtime, no private key is present.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Check the key type and library">
The signing or verification <strong>operation itself could not run.</strong> A wrong key type, a released handle, or an internal error in the crypto library.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A signature error that falls into none of the categories above.
</ErrorCode>

::: warning Do not conflate a mismatch with a backend failure
The two codes sit on opposite axes.

- `DAT_SIG_MISMATCH` — an incoming signature simply did not match, so there is **no service impact**, but it is a **suspect** case if it persists.
- `DAT_SIG_BACKEND` — the verification operation itself could not run, so it is **our problem**, and it is not a suspect case.

Reporting a wrong key type or a library bug as a "signature mismatch" mixes our own broken code into the attack metrics. Conversely, classifying a real forgery as a backend error drops it out of the suspect metrics entirely.
:::

---

## Encryption

Problems encrypting and decrypting the secure payload.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Block the session, log to security">
The AES-GCM authentication tag does not match. Either secure was tampered with, or the certificate key is different.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Reject the request">
The ciphertext is non-empty yet no longer than the IV (12 bytes), or the input exceeded an implementation limit such as <code>INT_MAX</code>.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Check platform support">
The encryption or decryption operation could not run. The platform does not support GCM, or context initialization failed.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
An encryption or decryption error that falls into none of the categories above.
</ErrorCode>

**An empty secure payload is not an error.** Empty input yields empty output and produces no code at all.

On the path that skips signature verification, the GCM tag is the **only integrity check**. That is why `DAT_CRYPTO_TAG_MISMATCH` is not folded into the same code as other decryption failures.

---

## Key

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Replace the key">
The key length does not match the declared algorithm (HMAC 32/48/64, AES 16/32), or the point is not on the curve, or <code>d ∉ [1,n-1]</code>, or the format is not uncompressed (0x04), or the private and public keys are not a pair.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Change the algorithm">
A verify-only export was requested for an HMAC-family algorithm.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A key error that falls into none of the categories above.
</ErrorCode>

**Three that look alike but are not:**

| Code | Meaning |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **A structural limit of the algorithm.** HMAC is symmetric, so it has no notion of a public key |
| `DAT_SIG_KEY_MISSING` | **A runtime state.** This particular key does not currently hold a private key |
| `DAT_CERT_VERIFY_ONLY` | **A deployment shape.** This certificate was deployed for verification only |

---

## Manager

The state of the object that holds certificates and uses them to issue and verify.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Check the CMS connection">
No certificate is held at all. Either import has not run yet, or the first CMS synchronization failed.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Decide from the cause — see the table below">
Certificates exist, but none of them can be used for issuance right now. <strong>The cause is delivered along with it.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Fix the calling code">
An already-disposed manager or certificate was used.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A manager error that falls into none of the categories above.
</ErrorCode>

The `cause` of `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` is one of four. **Each one calls for something completely different.**

| Cause | Meaning | Retry | Response |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Before the issuance window starts | **Transient** | Waiting clears it |
| `DAT_CERT_ISSUANCE_ENDED` | Issuance window closed; verification only | Permanent | A new certificate has to be deployed |
| `DAT_CERT_EXPIRED` | Everything held has expired | Permanent | Certificates need renewing |
| `DAT_CERT_VERIFY_ONLY` | Everything held is verify-only | Permanent | **A deployment configuration mistake** |

If an issuing server is configured to receive only verify-only certificates, `DAT_CERT_VERIFY_ONLY` is what comes out. Waiting will never clear it, so it is not a retry case.

---

## Configuration

Problems with the values the caller passed in. Every `CONFIG` code is **an error that requires a code fix**; seeing one in production means the deployment is wrong.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Check the algorithm name">
An unrecognized algorithm name. It has to match the wire notation exactly (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Fix the calling code">
A required argument is null, or out of range (a negative time value, <code>interval &lt;= 0</code>), or of an unsupported type (passing a number or boolean as the payload in a dynamically typed language), or the body to be signed is empty.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Fix the URI">
The CMS server URI is out of spec — unparseable, a scheme other than http/https, or carrying a path or query.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Check the logs">
A configuration error that falls into none of the categories above.
</ErrorCode>

---

## Internal

Problems with the execution environment and the runtime.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Check the deployment and platform">
The crypto backend or a runtime API is missing entirely. No <code>crypto.subtle</code>, a platform without AES-GCM, or a runtime version below the minimum.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Check the logs">
Memory allocation failed, random generation failed, a lock could not be acquired, or a branch designed to be unreachable was reached.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` is fixed by correcting the deployment environment, while `DAT_INTERNAL_UNKNOWN` is usually a runtime fault or a library bug.

---

## CMS Sync

These codes never appear if CMS synchronization is not used.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Retry after a backoff">
DNS failure, connection refused, TLS failure, or a <strong>timeout</strong>. A timeout is not a separate code but is folded in here — the response is the same.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Check the token configuration">
The server responded with 401. The token is missing or wrong.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Check the token tier">
The server responded with 403. The token is valid but has no permission for this endpoint.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Check the URL configuration">
The server responded with 404. The URL is wrong.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Retry after a backoff">
The server responded with 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Check the status code">
A non-2xx response not covered above.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Check the server version">
The response has no version line, or the version line is not plain decimal, or it is out of range.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Check CERT_* / KEY_* in the cause">
The response arrived, but the certificates could not be applied. <strong>The reason is carried in <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Handled automatically">
The server returned a version older than ours. This is an instruction to resynchronize everything.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Wait for the first synchronization">
Synchronization has never succeeded even once.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
The previous synchronization is still running, so this cycle was skipped. Not an error.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Check the build options">
CMS support was not compiled in. The feature is disabled, or CURL is not bundled.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Check the logs">
A CMS error that falls into none of the categories above.
</ErrorCode>

The codes that mark synchronization as a **permanent failure** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`) are all critical. Retrying will not clear them while certificates keep expiring, so leaving them alone guarantees the service will stop.

`UNREACHABLE` and `SERVER_ERROR`, by contrast, are partial. The existing certificates keep working and the next cycle usually recovers — **though repeated failure eventually escalates to critical.** Alert on the number of consecutive failures.

::: tip Synchronization failures are not thrown
Even if the first synchronization fails, the manager is returned normally — synchronizing late is better than not starting at all. The failure is instead kept as **queryable state**.

| Client | How to read it |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

It holds `DAT_CMS_NOT_SYNCED` if synchronization has never succeeded, and is empty when everything is fine.
:::

---

## Server

Codes produced by the CMS server. Clients **never produce these; they only receive them.**

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
The <code>Authorization</code> header is missing, or the token is not registered at any tier.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
The token is registered but is not of the tier this endpoint requires.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Set a token immediately">
Not a single token is configured, so authentication is disabled outright. <strong>Even the certificate issuance API is open without authentication.</strong> It is not returned in a response; it is only printed to the startup log.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
A path or query parameter could not be parsed, or an argument is out of range (a negative delay, more than ten years, and so on).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
The algorithm name in the request path is unrecognized.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
No such route, or the method does not match.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
The request body exceeded the size limit.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
A request error that falls into none of the categories above.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Retry after a backoff">
The database connection dropped, the connection pool is exhausted, locks are contended, or a timeout occurred. <strong>The only code that uses 503</strong>, which is how a client learns "this one clears if you wait."
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Check the database state">
A read or write failed, a table is missing, the schema does not match, or a stored certificate row is corrupt.
</ErrorCode>

Response envelope:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

For errors that arise while creating and handling certificates, the server uses the same common codes as above (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### When a server code arrives

The client wraps the server code in its own `CMS` code and preserves the original in `cause`.

| Received | HTTP | Code the client produces |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (others) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (version rollback) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Finding it by symptom

| Symptom | Code |
| --- | --- |
| Works right after login, then gets rejected a while later | `DAT_TOKEN_EXPIRED` — the token reached the end of its life. Refreshing it is enough |
| Verification fails on one server only | `DAT_CERT_NOT_SYNCED` — that server has not received the new CID yet |
| The same token is rejected on every server | `DAT_CERT_NOT_FOUND` — a CID we never issued |
| The issuing server cannot create tokens | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **it was deployed verify-only** |
| Issuance fails only right after startup | `DAT_MANAGER_NO_CERTIFICATE` — before the first synchronization. It clears shortly |
| CMS synchronization keeps failing | `DAT_CMS_UNAUTHORIZED` — the token is wrong. Retrying will not clear it |
| No certificates arrive at all | `DAT_CMS_ENDPOINT_NOT_FOUND` — a typo in the URL |
| Fails on one platform only | `DAT_INTERNAL_UNAVAILABLE` — the crypto backend is missing |
| Verification failures suddenly spike | `DAT_SIG_MISMATCH` — one is harmless, but **a burst means forgery attempts** |
| Secure decryption suddenly fails | `DAT_CRYPTO_TAG_MISMATCH` — certificates drifted apart, or **tampering** |
| A warning in the CMS startup log | `DAT_AUTH_DISABLED` — **authentication is off.** The issuance API is wide open |

---

## Appendix

### Code syntax

```
DAT_<area>_<reason>
```

- When the same reason arises in different areas, **the reason name is the same.** `DAT_TOKEN_MALFORMED` and `DAT_CERT_MALFORMED` differ only in their subject; the meaning is identical.
- `_UNKNOWN` is **reserved for the fallback** in each area. It is never used to mean "unknown algorithm" or the like — that is `_UNSUPPORTED`.
- The code string is a public contract. Messages may change freely, but codes do not.

| Area | Code prefix |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Certificate | `DAT_CERT_` |
| Signature | `DAT_SIG_` |
| Encryption | `DAT_CRYPTO_` |
| Key | `DAT_KEY_` |
| Manager | `DAT_MANAGER_` |
| Configuration | `DAT_CONFIG_` |
| Internal | `DAT_INTERNAL_` |
| CMS Sync | `DAT_CMS_` |
| Server | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### How each client exposes it

| Client | Error type | Code | Retry class | Security event |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS server | JSON envelope | `code` field | — | — |

`security event` returns `true` only for the two cases where forgery or tampering is certain (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). The **suspect** tag in this document covers a wider range — tampered tokens, keys, and requests as well — and for now it is a documentation classification only, not exposed through the client API.

The **impact** grade is likewise a documentation classification, because the same code hits differently depending on where it arose — `DAT_KEY_INVALID` has no impact when it filters an incoming token, but if it comes up while reading certificates during CMS synchronization, the whole synchronization fails.

**The underlying cause is never discarded.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` and `DAT_CMS_IMPORT_FAILED` carry the reason through each language's exception chaining (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ keeps the integer values too
The existing integer values of `dat_error_t` stay in place for ABI compatibility, but **the string code is authoritative**. The library no longer returns the old values, so a comparison like `err == DAT_ERROR_INVALID_DAT` will not match. Compare with `dat_error_code(e)` instead.

C has no exception chaining, so the cause is read separately via `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
