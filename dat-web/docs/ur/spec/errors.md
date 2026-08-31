# Error codes

DAT implementations انسانی-readable messages سے الگ stable error codes فراہم کرتی ہیں۔ Programs کو message strings کا موازنہ کرنے کے بجائے code اور retry classification سے فیصلے کرنے چاہییں۔

## Code format

```text
DAT_<AREA>_<CAUSE>
```

| Prefix | Area |
| --- | --- |
| `DAT_TOKEN_` | DAT strings اور expiration |
| `DAT_CERT_` | Certificate strings اور state |
| `DAT_SIG_` | Signatures اور verification |
| `DAT_CRYPTO_` | Encryption اور decryption |
| `DAT_KEY_` | Key formats اور authority |
| `DAT_MANAGER_` | Certificate managers |
| `DAT_CONFIG_` | Call arguments اور configuration |
| `DAT_INTERNAL_` | Runtime internals |
| `DAT_CMS_` | CMS client synchronization |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS server |

`_UNKNOWN` صرف تب استعمال ہوتا ہے جب error کو اپنے area کے کسی دوسرے code میں classify نہ کیا جا سکے۔ ایک ہی cause تمام areas میں ایک ہی نام استعمال کرتی ہے۔

## Retry classifications

| Classification | مطلب | طریقہ |
| --- | --- | --- |
| Transient | بیرونی حالت بحال ہونے پر کامیاب ہو سکتا ہے | backoff کے ساتھ محدود بار retry کریں |
| State | certificate synchronization یا وقت بدلنے کے بعد کامیاب ہو سکتا ہے | مطلوبہ state refresh کرکے retry کریں |
| Permanent | اسی input کے ساتھ پھر ناکام ہوگا | input، configuration یا code درست کریں |

## Tokens اور certificates

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT کا field count، numeric value یا Base64Url representation غلط ہے۔ input ضائع کر دیں۔
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT کا expiration time موجودہ وقت کے برابر یا پہلے ہے۔ نیا DAT حاصل کریں۔
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Certificate string کی structure یا field representation غلط ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
کوئی certificate DAT کے `cid` سے نہیں ملتا۔ certificate synchronization state چیک کریں۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
مطلوبہ certificate شاید ابھی service تک نہ پہنچا ہو۔ فوراً synchronize کرکے دوبارہ جانچیں۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Certificate کا start time ابھی نہیں آیا۔ system clock اور certificate distribution timing چیک کریں۔
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Certificate کی verification period ختم ہو گئی ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
ایک import list میں ایک ہی `cid` ایک سے زیادہ بار ہے۔ پورا import رد کریں۔
</ErrorCode>

## Signatures، encryption اور keys

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Signature body سے نہیں ملتا۔ DAT بدلا گیا ہے یا مختلف key سے signed ہے۔
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM authentication tag نہیں ملتا۔ ciphertext tampering یا certificate mismatch چیک کریں۔
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Key length، format یا algorithm combination غلط ہے۔
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Verify-only certificate سے DAT issue کرنے کی کوشش ہوئی۔ issuing service کو full certificate چاہیے۔
</ErrorCode>

`DAT_SIG_MISMATCH` اور `DAT_CRYPTO_TAG_MISMATCH` public security-event API میں true classify ہونے والے errors ہیں۔ ایک invalid input service outage نہیں، مگر بار بار ہونے کو security observation سمجھنا چاہیے۔

## Managers اور configuration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Manager کے پاس certificates نہیں۔ certificates import کریں یا CMS synchronization مکمل کریں۔
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Manager کے پاس certificates ہیں، مگر کوئی full certificate ابھی issuable نہیں۔ expiration، start time یا verify-only state کے لیے cause chain دیکھیں۔
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Call argument یا configuration value جائز range سے باہر ہے۔
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
موجودہ platform کو درکار cryptographic یا network capability دستیاب نہیں۔
</ErrorCode>

## CMS clients

| Code | مطلب | عام طریقہ |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | غلط CMS URI | configuration درست کریں |
| `DAT_CMS_UNAUTHORIZED` | authentication ناکام | token درست کریں |
| `DAT_CMS_FORBIDDEN` | token role کے پاس permission نہیں | token role چیک کریں |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | path غائب یا مختلف ہے | CMS URL اور path چیک کریں |
| `DAT_CMS_NETWORK` | connection یا transfer ناکام | network چیک کرکے backoff کریں |
| `DAT_CMS_TIMEOUT` | time limit تجاوز | network اور timeout settings بدلیں |
| `DAT_CMS_SERVER_ERROR` | CMS server error | server state چیک کرکے backoff کریں |
| `DAT_CMS_RESPONSE_INVALID` | کامیاب response format غلط | server-client contract چیک کریں |
| `DAT_CMS_VERSION_RESET` | server version پیچھے گیا | CMS data اور deployment state چیک کریں |
| `DAT_CMS_IMPORT_FAILED` | موصول certificates apply نہ ہوئے | cause chain دیکھیں |
| `DAT_CMS_STOPPED` | stopped manager استعمال ہوا | نیا manager بنائیں یا call order درست کریں |

Best-effort initial synchronization والی libraries error کو last-error field میں رکھتی ہیں۔ startup ناکام کرنا ہو تو error براہِ راست return یا throw کرنے والا immediate synchronization API استعمال کریں۔

## CMS server

| Code | HTTP | مطلب |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | token غائب یا invalid ہے |
| `DAT_AUTH_FORBIDDEN` | 403 | token role request کی اجازت نہیں دیتا |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Unsupported algorithm name |
| `DAT_REQ_NOT_FOUND` | 404·405 | Path یا method mismatch |
| `DAT_REQ_TOO_LARGE` | 413 | oversized request body کے لیے reserved code |
| `DAT_STORE_UNAVAILABLE` | 503 | storage عارضی طور پر unavailable |
| `DAT_STORE_UNKNOWN` | 500 | unclassified storage-processing error |

موجودہ clients non-2xx JSON responses کا server code براہِ راست expose نہیں کرتے بلکہ HTTP status کو `DAT_CMS_*` code میں بدلتے ہیں۔ اس لیے server logs اور client error codes مختلف ہو سکتے ہیں۔

## زبان کے لحاظ سے access

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

Lower-level cause والے errors کے لیے زبان کی exception chain یا cause-access API دیکھیں۔

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
