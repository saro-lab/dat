# Error codes

DAT implementations provide stable error codes separately from human-readable messages. Programs should make decisions from the code and retry classification, not by comparing message strings.

## Code format

```text
DAT_<AREA>_<CAUSE>
```

| Prefix | Area |
| --- | --- |
| `DAT_TOKEN_` | DAT strings and expiration |
| `DAT_CERT_` | Certificate strings and state |
| `DAT_SIG_` | Signatures and verification |
| `DAT_CRYPTO_` | Encryption and decryption |
| `DAT_KEY_` | Key formats and authority |
| `DAT_MANAGER_` | Certificate managers |
| `DAT_CONFIG_` | Call arguments and configuration |
| `DAT_INTERNAL_` | Runtime internals |
| `DAT_CMS_` | CMS client synchronization |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS server |

`_UNKNOWN` is used only when an error cannot be classified under another code in its area. The same cause uses the same name across areas.

## Retry classifications

| Classification | Meaning | Handling |
| --- | --- | --- |
| Transient | May succeed when an external condition recovers | Retry a limited number of times with backoff |
| State | May succeed after certificate synchronization or time changes | Refresh the required state, then retry |
| Permanent | Fails again with the same input | Fix the input, configuration, or code |

## Tokens and certificates

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
The DAT has an invalid field count, numeric value, or Base64Url representation. Discard the input.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
The DAT's expiration time is equal to or earlier than the current time. Obtain a new DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
The certificate string has an invalid structure or field representation.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
No certificate matches the DAT's `cid`. Check certificate synchronization state.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
The required certificate may not have reached the service yet. Synchronize immediately, then evaluate again.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
The certificate's start time has not arrived. Check the system clock and certificate distribution timing.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
The certificate's verification period has ended.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
The same `cid` appears more than once in a single import list. Reject the entire import.
</ErrorCode>

## Signatures, encryption, and keys

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
The signature does not match the body. The DAT has been altered or was signed with a different key.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
The AES-GCM authentication tag does not match. Check for ciphertext tampering or a certificate mismatch.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
The key length, format, or algorithm combination is invalid.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
An attempt was made to issue a DAT with a verify-only certificate. An issuing service requires a full certificate.
</ErrorCode>

`DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH` are the errors classified as true by the public security-event API. A single invalid input is not a service outage, but repeated occurrences should be treated as a security observation.

## Managers and configuration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
The manager has no certificates. Import certificates or complete CMS synchronization.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
The manager has certificates, but no full certificate is currently issuable. Inspect the cause chain for expiration, start time, or verify-only state.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
A call argument or configuration value is outside its allowed range.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
A cryptographic or network capability required by the current platform is unavailable.
</ErrorCode>

## CMS clients

| Code | Meaning | Typical handling |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Invalid CMS URI | Fix the configuration |
| `DAT_CMS_UNAUTHORIZED` | Authentication failed | Fix the token |
| `DAT_CMS_FORBIDDEN` | Token role lacks permission | Check the token role |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Path is missing or different | Check the CMS URL and path |
| `DAT_CMS_NETWORK` | Connection or transfer failed | Check the network, then back off |
| `DAT_CMS_TIMEOUT` | Time limit exceeded | Adjust the network and timeout settings |
| `DAT_CMS_SERVER_ERROR` | CMS server error | Check server state, then back off |
| `DAT_CMS_RESPONSE_INVALID` | Invalid successful response format | Check the server-client contract |
| `DAT_CMS_VERSION_RESET` | Server version moved backward | Check CMS data and deployment state |
| `DAT_CMS_IMPORT_FAILED` | Received certificates could not be applied | Inspect the cause chain |
| `DAT_CMS_STOPPED` | A stopped manager was used | Create a new manager or fix the call order |

Libraries whose initial synchronization is best-effort store the error in their last-error field. If startup must fail, use the immediate synchronization API that returns or throws the error directly.

## CMS server

| Code | HTTP | Meaning |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token is missing or invalid |
| `DAT_AUTH_FORBIDDEN` | 403 | Token role does not permit the request |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Unsupported algorithm name |
| `DAT_REQ_NOT_FOUND` | 404·405 | Path or method mismatch |
| `DAT_REQ_TOO_LARGE` | 413 | Reserved code for an oversized request body |
| `DAT_STORE_UNAVAILABLE` | 503 | Storage is temporarily unavailable |
| `DAT_STORE_UNKNOWN` | 500 | Unclassified storage-processing error |

Current clients do not expose the server code from non-2xx JSON responses directly; they convert the HTTP status to a `DAT_CMS_*` code. Server logs and client error codes may therefore differ.

## Access by language

| Environment | Error code | Retry classification |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

For errors with a lower-level cause, inspect the language's exception chain or cause-access API.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
