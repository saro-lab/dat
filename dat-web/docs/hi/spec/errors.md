# Error codes

DAT implementations मानव-पठनीय messages से अलग स्थिर error codes देते हैं। Programs को message strings की तुलना नहीं, code और retry classification के आधार पर निर्णय लेना चाहिए।

## Code format

```text
DAT_<AREA>_<CAUSE>
```

| Prefix | क्षेत्र |
| --- | --- |
| `DAT_TOKEN_` | DAT strings और expiration |
| `DAT_CERT_` | Certificate strings और state |
| `DAT_SIG_` | Signatures और verification |
| `DAT_CRYPTO_` | Encryption और decryption |
| `DAT_KEY_` | Key formats और authority |
| `DAT_MANAGER_` | Certificate managers |
| `DAT_CONFIG_` | Call arguments और configuration |
| `DAT_INTERNAL_` | Runtime internals |
| `DAT_CMS_` | CMS client synchronization |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS server |

`_UNKNOWN` केवल तब उपयोग होता है जब error को उसके क्षेत्र के किसी अन्य code में classify न किया जा सके। समान cause सभी क्षेत्रों में समान नाम उपयोग करता है।

## Retry classifications

| वर्गीकरण | अर्थ | समाधान |
| --- | --- | --- |
| Transient | बाहरी स्थिति सुधरने पर सफल हो सकता है | backoff के साथ सीमित बार retry करें |
| State | certificate synchronization या समय बदलने के बाद सफल हो सकता है | आवश्यक state refresh करके retry करें |
| Permanent | उसी input के साथ फिर विफल होगा | input, configuration या code सुधारें |

## Tokens और certificates

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT में अमान्य field count, numeric value या Base64Url representation है। input त्याग दें।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT का expiration time वर्तमान समय के बराबर या उससे पहले है। नया DAT प्राप्त करें।
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Certificate string की structure या field representation अमान्य है।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT के `cid` से कोई certificate मेल नहीं खाता। certificate synchronization state जाँचें।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
आवश्यक certificate अभी service तक नहीं पहुँचा होगा। तुरंत synchronize करके फिर जाँचें।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Certificate का start time अभी नहीं आया। system clock और certificate distribution timing जाँचें।
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Certificate की verification period समाप्त हो गई है।
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
एक import list में एक ही `cid` एक से अधिक बार है। पूरा import अस्वीकार करें।
</ErrorCode>

## Signatures, encryption और keys

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Signature body से मेल नहीं खाता। DAT बदला गया है या अलग key से signed है।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM authentication tag मेल नहीं खाता। ciphertext tampering या certificate mismatch जाँचें।
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Key length, format या algorithm combination अमान्य है।
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Verify-only certificate से DAT जारी करने का प्रयास हुआ। issuing service को full certificate चाहिए।
</ErrorCode>

`DAT_SIG_MISMATCH` और `DAT_CRYPTO_TAG_MISMATCH` public security-event API में true classify होने वाले errors हैं। एक invalid input service outage नहीं है, लेकिन बार-बार होने पर इसे security observation मानें।

## Managers और configuration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Manager के पास certificates नहीं हैं। certificates import करें या CMS synchronization पूरा करें।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Manager के पास certificates हैं, पर कोई full certificate अभी issuable नहीं है। expiration, start time या verify-only state के लिए cause chain देखें।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Call argument या configuration value अनुमत range से बाहर है।
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
वर्तमान platform के लिए आवश्यक cryptographic या network capability उपलब्ध नहीं है।
</ErrorCode>

## CMS clients

| Code | अर्थ | सामान्य समाधान |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | अमान्य CMS URI | configuration सुधारें |
| `DAT_CMS_UNAUTHORIZED` | authentication विफल | token सुधारें |
| `DAT_CMS_FORBIDDEN` | token role को permission नहीं | token role जाँचें |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | path नहीं है या अलग है | CMS URL और path जाँचें |
| `DAT_CMS_NETWORK` | connection या transfer विफल | network जाँचकर backoff करें |
| `DAT_CMS_TIMEOUT` | time limit पार | network और timeout settings बदलें |
| `DAT_CMS_SERVER_ERROR` | CMS server error | server state जाँचकर backoff करें |
| `DAT_CMS_RESPONSE_INVALID` | successful response format अमान्य | server-client contract जाँचें |
| `DAT_CMS_VERSION_RESET` | server version पीछे गया | CMS data और deployment state जाँचें |
| `DAT_CMS_IMPORT_FAILED` | मिले certificates लागू नहीं हुए | cause chain देखें |
| `DAT_CMS_STOPPED` | stopped manager उपयोग हुआ | नया manager बनाएँ या call order सुधारें |

Best-effort initial synchronization वाली libraries error को last-error field में रखती हैं। startup विफल करना हो तो error सीधे return या throw करने वाला immediate synchronization API उपयोग करें।

## CMS server

| Code | HTTP | अर्थ |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | token नहीं है या अमान्य है |
| `DAT_AUTH_FORBIDDEN` | 403 | token role request की अनुमति नहीं देता |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | unsupported algorithm name |
| `DAT_REQ_NOT_FOUND` | 404·405 | path या method mismatch |
| `DAT_REQ_TOO_LARGE` | 413 | बहुत बड़े request body के लिए reserved code |
| `DAT_STORE_UNAVAILABLE` | 503 | storage अस्थायी रूप से unavailable |
| `DAT_STORE_UNKNOWN` | 500 | unclassified storage-processing error |

मौजूदा clients non-2xx JSON response का server code सीधे expose नहीं करते; HTTP status को `DAT_CMS_*` code में बदलते हैं। इसलिए server logs और client error codes अलग हो सकते हैं।

## भाषा के अनुसार access

| परिवेश | Error code | Retry classification |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Lower-level cause वाले errors में उस भाषा की exception chain या cause-access API देखें।

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
