# رموز الخطأ

توفر تطبيقات DAT رموز خطأ مستقرة إلى جانب الرسائل المقروءة. يجب أن يقرر البرنامج سلوكه استنادًا إلى الرمز وتصنيف إعادة المحاولة من دون مقارنة نصوص الرسائل.

## طريقة القراءة

```text
DAT_<المجال>_<السبب>
```

| البادئة | المجال |
| --- | --- |
| `DAT_TOKEN_` | سلسلة DAT وانتهاء الصلاحية |
| `DAT_CERT_` | سلسلة الشهادة وحالتها |
| `DAT_SIG_` | التوقيع والتحقق |
| `DAT_CRYPTO_` | التشفير وفك التشفير |
| `DAT_KEY_` | تنسيق المفتاح وصلاحياته |
| `DAT_MANAGER_` | مدير الشهادات |
| `DAT_CONFIG_` | معاملات الاستدعاء والإعدادات |
| `DAT_INTERNAL_` | وظائف runtime الداخلية |
| `DAT_CMS_` | مزامنة عميل CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | خادم CMS |

يُستخدم `_UNKNOWN` فقط للأخطاء التي لا يمكن تصنيفها برمز آخر داخل المجال. ويُستخدم الاسم نفسه للسبب نفسه حتى إن اختلف المجال.

## تصنيف إعادة المحاولة

| التصنيف | المعنى | المعالجة |
| --- | --- | --- |
| مؤقت | قد ينجح بعد تعافي الحالة الخارجية | إعادة محاولة محدودة بعد backoff |
| حالة | قد ينجح بعد تغير مزامنة الشهادات أو الوقت | تحديث الحالة المطلوبة ثم إعادة المحاولة |
| دائم | ستفشل إعادة المحاولة بنفس الإدخال | تصحيح الإدخال أو الإعداد أو الشيفرة |

## الرمز والشهادة

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
عدد حقول DAT أو تمثيل الأعداد أو Base64Url لا يطابق المواصفة. تجاهل الإدخال.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
وقت انتهاء DAT يساوي الوقت الحالي أو يسبقه. يلزم الحصول على DAT جديد.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
بنية سلسلة الشهادة أو تمثيل حقولها غير صحيح.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
لا توجد شهادة تطابق `cid` في DAT. افحص حالة مزامنة الشهادات.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
ربما لم تصل الشهادة المطلوبة إلى الخدمة بعد. نفّذ مزامنة فورية ثم أعد التقييم.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
لم يأت وقت بدء الشهادة بعد. افحص وقت النظام وموعد توزيع الشهادة.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
انتهت فترة صلاحية الشهادة للتحقق.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
تكرر `cid` نفسه في قائمة استيراد واحدة. يُرفض الاستيراد كاملًا.
</ErrorCode>

## التوقيع والتشفير والمفاتيح

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
لا يطابق التوقيع المحتوى. قد يكون DAT قد عُدّل أو وُقّع بمفتاح آخر.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
علامة مصادقة AES-GCM غير مطابقة. افحص احتمال تعديل النص المشفّر أو عدم تطابق الشهادة.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
طول المفتاح أو تنسيقه أو تركيبة الخوارزمية غير صحيحة.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
جرت محاولة إصدار DAT بشهادة تحقق فقط. تحتاج خدمة الإصدار إلى شهادة كاملة.
</ErrorCode>

يصنّف API العام لأحداث الأمان الخطأين `DAT_SIG_MISMATCH` و`DAT_CRYPTO_TAG_MISMATCH` على أنهما حدثان حقيقيان. لا يعني إدخال غير صالح واحد تعطل الخدمة، لكن يجب التعامل مع التكرار بوصفه حدثًا أمنيًا محتملًا.

## المدير والإعدادات

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
لا يحتوي المدير على شهادات. استورد الشهادات أو أكمل مزامنة CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
توجد شهادات، لكن لا توجد شهادة كاملة قابلة للإصدار حاليًا. افحص انتهاء الصلاحية أو وقت البدء أو حالة verify-only في سلسلة الأسباب.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
معامل الاستدعاء أو قيمة الإعداد خارج النطاق المسموح.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
وظيفة التشفير أو الشبكة المطلوبة غير متاحة على المنصة الحالية.
</ErrorCode>

## عميل CMS

| الرمز | المعنى | المعالجة المعتادة |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | تنسيق CMS URI غير صالح | تصحيح الإعداد |
| `DAT_CMS_UNAUTHORIZED` | فشل المصادقة | تصحيح الرمز |
| `DAT_CMS_FORBIDDEN` | الدور لا يملك الصلاحية | فحص دور الرمز |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | المسار غير موجود أو مختلف | فحص عنوان CMS ومساره |
| `DAT_CMS_NETWORK` | فشل الاتصال أو النقل | فحص الشبكة ثم تطبيق backoff |
| `DAT_CMS_TIMEOUT` | انتهاء المهلة | ضبط الشبكة والمهلة |
| `DAT_CMS_SERVER_ERROR` | خطأ في خادم CMS | فحص حالة الخادم ثم تطبيق backoff |
| `DAT_CMS_RESPONSE_INVALID` | تنسيق الاستجابة الناجحة غير صالح | فحص العقد بين الخادم والعميل |
| `DAT_CMS_VERSION_RESET` | تراجع إصدار الخادم | فحص بيانات CMS وحالة النشر |
| `DAT_CMS_IMPORT_FAILED` | فشل تطبيق الشهادات المستلمة | فحص سلسلة الأسباب |
| `DAT_CMS_STOPPED` | استخدام مدير متوقف | إنشاء مدير جديد أو تصحيح ترتيب الاستدعاءات |

تحتفظ المكتبات التي تكون مزامنتها الأولية best-effort بالخطأ في حقل آخر خطأ. وإذا كان يجب أن يفشل بدء التشغيل، فاستخدم API المزامنة الفورية التي تعيد الخطأ أو ترميه مباشرة.

## خادم CMS

| الرمز | HTTP | المعنى |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | الرمز غير موجود أو غير صالح |
| `DAT_AUTH_FORBIDDEN` | 403 | دور الرمز لا يطابق صلاحية الطلب |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | اسم خوارزمية غير مدعوم |
| `DAT_REQ_NOT_FOUND` | 404·405 | المسار أو الطريقة غير متطابقين |
| `DAT_REQ_TOO_LARGE` | 413 | رمز محجوز لتجاوز حد محتوى الطلب |
| `DAT_STORE_UNAVAILABLE` | 503 | المخزن غير متاح مؤقتًا |
| `DAT_STORE_UNKNOWN` | 500 | خطأ غير مصنف أثناء معالجة المخزن |

لا تعرض العملاء حاليًا رمز الخادم في JSON غير 2xx كما هو، بل تحوّل حالة HTTP إلى رمز `DAT_CMS_*`. ولذلك قد يختلف رمز سجل الخادم عن رمز خطأ العميل.

## طريقة الفحص حسب اللغة

| البيئة | رمز الخطأ | تصنيف إعادة المحاولة |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

يمكن فحص الأخطاء ذات السبب الداخلي من خلال سلسلة الاستثناءات أو API الاستعلام عن السبب في كل لغة.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
