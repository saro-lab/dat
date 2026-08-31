# Error codes

DAT implementation মানুষের পড়ার message থেকে আলাদাভাবে স্থিতিশীল error codes দেয়। Programs-এর সিদ্ধান্ত message string তুলনা করে নয়, code ও retry classification থেকে নেওয়া উচিত।

## Code format

```text
DAT_<AREA>_<CAUSE>
```

| Prefix | ক্ষেত্র |
| --- | --- |
| `DAT_TOKEN_` | DAT strings ও expiration |
| `DAT_CERT_` | Certificate strings ও state |
| `DAT_SIG_` | Signatures ও verification |
| `DAT_CRYPTO_` | Encryption ও decryption |
| `DAT_KEY_` | Key formats ও authority |
| `DAT_MANAGER_` | Certificate managers |
| `DAT_CONFIG_` | Call arguments ও configuration |
| `DAT_INTERNAL_` | Runtime internals |
| `DAT_CMS_` | CMS client synchronization |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS server |

`_UNKNOWN` শুধু তখন ব্যবহৃত হয় যখন error-কে তার ক্ষেত্রের অন্য code-এ classify করা যায় না। একই cause সব ক্ষেত্রে একই নাম ব্যবহার করে।

## Retry classifications

| শ্রেণি | অর্থ | ব্যবস্থা |
| --- | --- | --- |
| Transient | বাহ্যিক অবস্থা ঠিক হলে সফল হতে পারে | backoff-সহ সীমিতবার retry করুন |
| State | certificate synchronization বা সময় বদলালে সফল হতে পারে | প্রয়োজনীয় state refresh করে retry করুন |
| Permanent | একই input-এ আবার ব্যর্থ হবে | input, configuration বা code ঠিক করুন |

## Tokens ও certificates

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT-এ অবৈধ field count, numeric value বা Base64Url representation আছে। input বাদ দিন।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT-এর expiration time বর্তমান সময়ের সমান বা আগের। নতুন DAT নিন।
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Certificate string-এর structure বা field representation অবৈধ।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT-এর `cid`-এর সঙ্গে কোনো certificate মেলে না। certificate synchronization state পরীক্ষা করুন।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
প্রয়োজনীয় certificate এখনও service-এ পৌঁছায়নি। এখনই synchronize করে আবার মূল্যায়ন করুন।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Certificate-এর start time এখনও আসেনি। system clock ও certificate distribution timing পরীক্ষা করুন।
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Certificate-এর verification period শেষ।
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
এক import list-এ একই `cid` একাধিকবার আছে। পুরো import প্রত্যাখ্যান করুন।
</ErrorCode>

## Signatures, encryption ও keys

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Signature body-এর সঙ্গে মেলে না। DAT বদলানো হয়েছে বা ভিন্ন key দিয়ে signed।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM authentication tag মেলে না। ciphertext tampering বা certificate mismatch পরীক্ষা করুন।
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Key length, format বা algorithm combination অবৈধ।
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Verify-only certificate দিয়ে DAT ইস্যুর চেষ্টা হয়েছে। issuing service-এর full certificate দরকার।
</ErrorCode>

`DAT_SIG_MISMATCH` ও `DAT_CRYPTO_TAG_MISMATCH` public security-event API-তে true classified error। একটি invalid input service outage নয়, তবে বারবার হলে security observation হিসেবে ধরুন।

## Managers ও configuration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Manager-এর কোনো certificates নেই। certificates import করুন বা CMS synchronization সম্পন্ন করুন।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Manager-এর certificates আছে, তবে এখন কোনো full certificate issuable নয়। expiration, start time বা verify-only state-এর cause chain দেখুন।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Call argument বা configuration value অনুমোদিত range-এর বাইরে।
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
বর্তমান platform-এর প্রয়োজনীয় cryptographic বা network capability পাওয়া যায়নি।
</ErrorCode>

## CMS clients

| Code | অর্থ | সাধারণ ব্যবস্থা |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | অবৈধ CMS URI | configuration ঠিক করুন |
| `DAT_CMS_UNAUTHORIZED` | authentication ব্যর্থ | token ঠিক করুন |
| `DAT_CMS_FORBIDDEN` | token role-এর permission নেই | token role পরীক্ষা করুন |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | path নেই বা ভিন্ন | CMS URL ও path পরীক্ষা করুন |
| `DAT_CMS_NETWORK` | connection বা transfer ব্যর্থ | network পরীক্ষা করে backoff করুন |
| `DAT_CMS_TIMEOUT` | time limit ছাড়িয়েছে | network ও timeout settings সামঞ্জস্য করুন |
| `DAT_CMS_SERVER_ERROR` | CMS server error | server state দেখে backoff করুন |
| `DAT_CMS_RESPONSE_INVALID` | সফল response format অবৈধ | server-client contract পরীক্ষা করুন |
| `DAT_CMS_VERSION_RESET` | server version পেছনে গেছে | CMS data ও deployment state পরীক্ষা করুন |
| `DAT_CMS_IMPORT_FAILED` | পাওয়া certificates প্রয়োগ হয়নি | cause chain দেখুন |
| `DAT_CMS_STOPPED` | বন্ধ manager ব্যবহার করা হয়েছে | নতুন manager তৈরি বা call order ঠিক করুন |

Best-effort initial synchronization-যুক্ত libraries error last-error field-এ রাখে। startup ব্যর্থ করতে সরাসরি error return বা throw করা immediate synchronization API ব্যবহার করুন।

## CMS server

| Code | HTTP | অর্থ |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | token নেই বা অবৈধ |
| `DAT_AUTH_FORBIDDEN` | 403 | token role অনুরোধ অনুমোদন করে না |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | unsupported algorithm name |
| `DAT_REQ_NOT_FOUND` | 404·405 | path বা method mismatch |
| `DAT_REQ_TOO_LARGE` | 413 | oversized request body-এর reserved code |
| `DAT_STORE_UNAVAILABLE` | 503 | storage সাময়িক unavailable |
| `DAT_STORE_UNKNOWN` | 500 | unclassified storage-processing error |

বর্তমান clients non-2xx JSON response-এর server code সরাসরি প্রকাশ না করে HTTP status-কে `DAT_CMS_*` code-এ বদলায়। তাই server logs ও client error codes ভিন্ন হতে পারে।

## ভাষা অনুযায়ী access

| পরিবেশ | Error code | Retry classification |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Lower-level cause-সহ error-এর ক্ষেত্রে ভাষার exception chain বা cause-access API দেখুন।

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
