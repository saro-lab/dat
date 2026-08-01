# رموز الأخطاء

هذه هي رموز الأخطاء المشتركة لمكتبات الخدمة المدعومة رسمياً في DAT.

يحمل كل رمز قيمتين: **التأثير** و**إعادة المحاولة**، ويحمل بعضها بطاقة **اشتباه** إضافية.

## التأثير — الضرر الواقع على الخدمة

هذا هو معيار ضبط التنبيهات. ولا ينظر إلا في سؤال واحد: "هل توقفت الخدمة الآن؟"

| التأثير | المعنى | مثال |
| --- | --- | --- |
| <span class="lg lg-critical">حرج</span> | **تتوقف** الخدمة أو وظيفة بعينها. تعذّر الإصدار، فشل دائم في المزامنة، فشل التهيئة | لا تتوفر لدى خادم الإصدار أي شهادة صالحة للاستخدام |
| <span class="lg lg-partial">جزئي</span> | تفشل بعض الطلبات أو الدورات لكن الخدمة تستمر بالعمل. وغالباً ما تتعافى ذاتياً | فشل دورة واحدة من CMS. ويستمر العمل بالشهادات الحالية |
| <span class="lg lg-none">بلا تأثير</span> | يُرفض طلب واحد وينتهي الأمر | ورود رمز DAT مُلاعب به. يكفي ترشيحه |

**بلا تأثير** ليست هدفاً للتنبيهات. فإذا كان على جميع المسؤولين مراجعة ورود مُدخل خاطئ مرة واحدة، يفقد التنبيه معناه.

## الاشتباه — التحقيق عند الاستمرار

الرموز التي تحمل بطاقة <span class="lg lg-suspect">اشتباه</span> هي **جزء من التشغيل الطبيعي عندما ترد مرة واحدة**. فالعميل قد يرسل قيمة خاطئة في أي وقت، وترشيحها هو دور المكتبة أصلاً.

غير أن ورود هذه الأخطاء **باستمرار، أو بكثافة من مصدر بعينه** يعني أحد أمرين.

- **خلل في الإعداد** — نشر خاطئ، أو بقاء عملاء بإصدارات قديمة، أو عدم تطابق الشهادات.
- **محاولة اختراق** — محاولة تجاوز التحقق بالتلاعب برموز DAT والمفاتيح، أو استكشاف بحثاً عن قيم صالحة.

لذلك يصحّ في هذه الرموز **رصد عددها كمؤشر**. ويكفي التنبيه عند تجاوز العتبة فقط.

## إعادة المحاولة

| إعادة المحاولة | المعنى |
| --- | --- |
| <span class="lg lg-transient">مؤقت</span> | تنحل المشكلة بإعادة المحاولة بعد فترة تراجع (backoff) |
| <span class="lg">دائم</span> | ممنوع إعادة المحاولة. يجب تصحيح الإعداد أو المُدخل |
| <span class="lg">حالة</span> | إشارة وليست خطأً |

---

## رمز DAT

مشكلة في نص رمز DAT الوارد نفسه.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="رفض الطلب">
الأجزاء المفصولة بالنقاط ليست خمسة، أو <code>expire</code> ليس عدداً عشرياً صرفاً، أو <code>cid</code> ليس عدداً ست عشرياً صرفاً، أو <code>plain</code> أو <code>secure</code> ليس base64url، أو تجاوز حقل عددي مدى التمثيل الصحيح.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="حث المستخدم على إعادة إصدار الرمز">
<code>expire &lt;= now</code>. <strong>اللحظة نفسها تُعد انتهاءً</strong> — فإذا كان <code>expire == now</code> يُعتبر منتهياً بالفعل.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في الرمز لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

::: tip الانتهاء وخطأ الصيغة مختلفان قطعاً
الاستجابة متعاكسة تماماً — الانتهاء نهاية عمر طبيعية فيكفي تجديد الرمز، أما خطأ الصيغة فيعني أن الرمز لم يصدر عنّا أصلاً فيجب رفضه.

يتحقق التحليل من **البنية أولاً ثم ينظر في القيم**. فنص ناقص الأجزاء مثل `"1.2.3"` ليس رمزاً منتهياً بل ليس رمزاً من الأساس، ولذلك فهو `DAT_TOKEN_MALFORMED`.

وكذلك وجود إشارة في حقل `expire` مثل `+100` خطأ صيغة لا انتهاء. فلا يُقبل سوى أرقام ASCII الصرفة.
:::

---

## الشهادة

مشكلة في صيغة نص الشهادة، وفي إمكانية استخدام تلك الشهادة الآن.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="إعادة نشر الشهادة">
الأجزاء المفصولة بالنقاط ليست ثمانية، أو فشل تحليل <code>cid</code>، <code>start</code>، <code>duration</code>، <code>ttl</code>، أو حقل المفتاح ليس base64url، أو تجاوز <code>start + duration + ttl</code> حدود u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="تجديد الشهادة">
<code>start + duration + ttl &lt; now</code>. حالة انتهاء كامل لا يمكن معها الإصدار ولا التحقق.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="الانتظار">
<code>now &lt; start</code>. لم تُفتح نافذة الإصدار بعد.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="نشر شهادة جديدة">
<code>now &gt; start + duration</code> لكن ttl ما زال متبقياً. الإصدار متعذر والتحقق فقط ممكن.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="مراجعة إعداد النشر">
شهادة تحتوي المفتاح العام فقط دون مفتاح التوقيع الخاص. التحقق ممكن أما الإصدار فمتعذر.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="رفض الطلب">
لا توجد لدينا شهادة تقابل <code>cid</code> الوارد في رمز DAT. إما رمز مزوَّر أو خطأ في النشر.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="إعادة المحاولة بعد المزامنة">
لم يُستلم ذلك الـ <code>cid</code> بعد من CMS. ويحدث ذلك لبرهة عقب نشر شهادة جديدة مباشرة.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="مراجعة استجابة الخادم">
يتكرر الـ <code>cid</code> نفسه مرتين أو أكثر داخل قائمة الاستيراد.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في الشهادة لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

يتشابه ظاهر `DAT_CERT_NOT_FOUND` و`DAT_CERT_NOT_SYNCED` لكن الاستجابة مختلفة. فالأول `cid` لم نصدره قط فلا ينفع معه الانتظار، أما الثاني فينحل بمجرد تمام المزامنة.

و`DAT_CERT_NOT_FOUND` يكفي ترشيحه إذا ورد مرة واحدة، لكن ازدياده المفاجئ يعني أن النشر اختل أو أن رموز DAT مزوَّرة تدور في الخدمة.

---

## التوقيع

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="قطع الجلسة وتسجيل حدث أمني">
انتهى التحقق من التوقيع بـ<strong>عدم تطابق</strong>. قيمة HMAC مختلفة أو أعاد ECDSA verify القيمة false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="رفض الطلب">
جزء التوقيع فارغ، أو ليس base64url، أو طول <code>r‖s</code> في ECDSA لا يطابق المنحنى، أو فشل التحويل إلى DER.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="مراجعة إعداد خادم الإصدار">
جرت محاولة توقيع بمفتاح verify-only. أي أن المفتاح الخاص غير متوفر في وقت التشغيل.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="مراجعة نوع المفتاح والمكتبة">
<strong>لم تُنفَّذ عملية</strong> التوقيع أو التحقق أصلاً. نوع مفتاح خاطئ، أو مقبض محرَّر، أو خطأ داخلي في مكتبة التشفير.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في التوقيع لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

::: warning لا تخلط بين عدم التطابق وفشل الواجهة الخلفية
محورا الرمزين متعاكسان تماماً.

- `DAT_SIG_MISMATCH` — مجرد أن التوقيع الوارد غير مطابق، فـ**لا تأثير على الخدمة**، لكنه يصبح محل **اشتباه** إن استمر.
- `DAT_SIG_BACKEND` — عملية التحقق نفسها لم تعمل، فهي **مشكلة من جهتنا**، وليست محل اشتباه.

فإذا أُبلغ عن نوع مفتاح خاطئ أو خلل في المكتبة بوصفه "عدم تطابق توقيع"، اختلط عطبٌ في شفرتنا نحن بمؤشرات الهجوم. وعلى العكس، إذا صُنّف تزوير حقيقي بوصفه خطأ واجهة خلفية، سقط كلياً من مؤشرات الاشتباه.
:::

---

## التشفير

مشكلة في تشفير وفك تشفير حمولة secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="قطع الجلسة وتسجيل حدث أمني">
وسم مصادقة AES-GCM غير مطابق. إما أن secure عُبث بها أو أن مفتاح الشهادة مختلف.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="رفض الطلب">
النص المشفَّر غير فارغ لكنه أقصر من IV (12 بايت) أو يساويه، أو تجاوز المُدخل حدود التنفيذ (مثل <code>INT_MAX</code>).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="مراجعة دعم المنصة">
لم تُنفَّذ عملية التشفير أو فك التشفير. منصة لا تدعم GCM أو فشل تهيئة السياق.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في التشفير أو فك التشفير لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

**حمولة secure الفارغة ليست خطأً.** فالمُدخل الفارغ يصبح مُخرجاً فارغاً ولا يُصدر أي رمز خطأ.

وفي المسار الذي يتخطى التحقق من التوقيع، يكون وسم GCM هو **فحص السلامة الوحيد**. ولهذا لا يُدمج `DAT_CRYPTO_TAG_MISMATCH` مع بقية حالات فشل فك التشفير في رمز واحد.

---

## المفتاح

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="استبدال المفتاح">
عدم تطابق بين الخوارزمية المعلنة وطول المفتاح (HMAC 32/48/64، AES 16/32)، أو نقطة ليست على المنحنى، أو <code>d ∉ [1,n-1]</code>، أو صيغة غير مضغوطة (0x04) غير متحققة، أو أن المفتاحين الخاص والعام ليسا زوجاً.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="تغيير الخوارزمية">
طُلب تصدير verify-only من عائلة HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في المفتاح لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

**ثلاثة تبدو متشابهة لكنها مختلفة:**

| رمز الخطأ | المعنى |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **حدّ بنيوي في الخوارزمية.** فـ HMAC مفتاح متماثل ولا وجود لمفهوم المفتاح العام فيه |
| `DAT_SIG_KEY_MISSING` | **حالة وقت التشغيل.** هذا المفتاح لا يحمل مفتاحاً خاصاً الآن |
| `DAT_CERT_VERIFY_ONLY` | **صيغة النشر.** هذه الشهادة نُشرت للتحقق فقط |

---

## المدير

حالة الكائن الذي يحتفظ بالشهادات ويستخدمها في الإصدار والتحقق.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="مراجعة الاتصال بـ CMS">
لا توجد أي شهادة محفوظة. إما قبل الاستيراد أو بعد فشل أول مزامنة مع CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="الحكم بحسب السبب (cause) — انظر الجدول أدناه">
توجد شهادات لكن لا شيء منها صالح للإصدار الآن. <strong>يُرسل السبب مرفقاً.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="تصحيح شفرة الاستدعاء">
استُخدم مدير أو شهادة سبق تحريرها.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في المدير لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

سبب (`cause`) الرمز `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` واحد من أربعة. **وما يجب فعله يختلف كلياً باختلاف السبب.**

| السبب | المعنى | إعادة المحاولة | الاستجابة |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | قبل بدء نافذة الإصدار | **مؤقت** | تنحل بالانتظار |
| `DAT_CERT_ISSUANCE_ENDED` | انتهت نافذة الإصدار، والتحقق فقط ممكن | دائم | يلزم نشر شهادة جديدة |
| `DAT_CERT_EXPIRED` | جميع الشهادات المحفوظة منتهية | دائم | يلزم تجديد الشهادات |
| `DAT_CERT_VERIFY_ONLY` | جميع الشهادات المحفوظة للتحقق فقط | دائم | **خطأ في إعداد النشر** |

إذا ضُبط خادم الإصدار بحيث لا يتلقى إلا شهادات التحقق فقط، ظهر `DAT_CERT_VERIFY_ONLY`. ولا ينحل ذلك بالانتظار أبداً فليس هدفاً لإعادة المحاولة.

---

## الإعداد

مشكلة في القيمة التي مرّرها المستدعي. وعائلة `CONFIG` كلها **أخطاء تستوجب تصحيح الشفرة**، وظهورها أثناء التشغيل يعني أن النشر خاطئ.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="مراجعة اسم الخوارزمية">
اسم خوارزمية غير معروف. يجب أن يطابق تماماً الصيغة السلكية (<code>ECDSA-P256</code>، <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="تصحيح شفرة الاستدعاء">
وسيط مطلوب قيمته null، أو خارج المدى المسموح (قيمة زمنية سالبة، <code>interval &lt;= 0</code>)، أو نوع غير مدعوم (تمرير رقم أو قيمة منطقية إلى payload في اللغات ديناميكية النوع)، أو أن الـ body المراد توقيعه فارغ.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="تصحيح الـ URI">
الـ URI الخاص بخادم CMS خارج المواصفة. تعذّر التحليل، أو المخطط ليس http/https، أو أنه يحمل مساراً أو استعلاماً.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="مراجعة السجلات">
خطأ في الإعداد لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

---

## الداخلي

مشكلة في بيئة التشغيل ووقت التشغيل.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="مراجعة النشر والمنصة">
لا وجود أصلاً لواجهة التشفير الخلفية أو لواجهة برمجة وقت التشغيل. غياب <code>crypto.subtle</code>، أو منصة لا تدعم AES-GCM، أو إصدار وقت تشغيل أقل من المطلوب.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="مراجعة السجلات">
فشل تخصيص الذاكرة، أو فشل توليد الأرقام العشوائية، أو فشل الحصول على القفل، أو بلوغ فرع صُمم بحيث لا يُبلَغ.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` ينحل بإصلاح بيئة النشر، أما `DAT_INTERNAL_UNKNOWN` فهو غالباً عطل في وقت التشغيل أو خلل في المكتبة.

---

## مزامنة CMS

لا تظهر رموز هذا القسم إن لم تُستخدم مزامنة CMS.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="إعادة المحاولة بعد فترة تراجع">
فشل DNS، أو رفض الاتصال، أو فشل TLS، أو <strong>انتهاء المهلة</strong>. وانتهاء المهلة ليس رمزاً منفصلاً بل يندرج هنا — لأن الاستجابة واحدة.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="مراجعة إعداد رمز المصادقة">
استجاب الخادم بـ 401. رمز المصادقة غير موجود أو خاطئ.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="مراجعة درجة رمز المصادقة">
استجاب الخادم بـ 403. رمز المصادقة صالح لكن لا صلاحية له على نقطة النهاية هذه.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="مراجعة إعداد الـ URL">
استجاب الخادم بـ 404. الـ URL خاطئ.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="إعادة المحاولة بعد فترة تراجع">
استجاب الخادم بـ 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="مراجعة رمز الحالة">
استجابة غير 2xx لا تندرج ضمن ما سبق.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="مراجعة إصدار الخادم">
لا يوجد سطر نسخة في الاستجابة، أو أن سطر النسخة ليس عدداً عشرياً صرفاً، أو أنه تجاوز المدى.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="مراجعة CERT_* / KEY_* في cause">
وصلت الاستجابة لكن تعذّر تطبيق الشهادات. <strong>السبب مُضمَّن في <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="يُعالَج تلقائياً">
أعاد الخادم نسخة أقدم من نسختنا. وهذا أمرٌ بإعادة مزامنة كاملة.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="انتظار المزامنة الأولى">
حالة لم تنجح فيها المزامنة ولا مرة واحدة حتى الآن.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
تُخطّيت هذه الدورة لأن المزامنة السابقة ما زالت جارية. وليس هذا خطأً.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="مراجعة خيارات البناء">
وظيفة CMS غير مُضمَّنة في البناء. إما أن الميزة غير مفعّلة أو أن CURL غير مُدرج.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="مراجعة السجلات">
خطأ في CMS لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

الرموز التي يُحكم فيها على المزامنة بـ**الفشل الدائم** (`UNAUTHORIZED`، `FORBIDDEN`، `ENDPOINT_NOT_FOUND`، `MALFORMED`، `IMPORT_FAILED`) كلها حرجة. فهي لا تنحل بإعادة المحاولة بينما تستمر الشهادات في الانتهاء، ولذلك فإن إهمالها يوقف الخدمة حتماً.

وعلى العكس فإن `UNREACHABLE` و`SERVER_ERROR` جزئية. إذ يستمر العمل بالشهادات الحالية وتتعافى ذاتياً في الدورة التالية — **غير أن استمرار الفشل ينقلها في النهاية إلى الحرج.** فاضبط التنبيه على أساس عدد مرات الفشل المتتالية.

::: tip فشل المزامنة لا يُرمى كاستثناء
حتى عند فشل المزامنة الأولى يُعاد المدير سليماً — لأن المزامنة ولو متأخرة أفضل. وبدلاً من ذلك يبقى الفشل **حالةً يمكن الاستعلام عنها**.

| العميل | طريقة الاستعلام |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

فإن لم تنجح ولا مرة واحدة كانت القيمة `DAT_CMS_NOT_SYNCED`، وإن كان الوضع سليماً كانت فارغة.
:::

---

## الخادم

رموز يُصدرها خادم CMS. والعميل **لا يُنشئها بل يستقبلها فقط**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
لا وجود لترويسة <code>Authorization</code>، أو أن رمز المصادقة غير مسجَّل في أي درجة.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
رمز المصادقة مسجَّل لكنه ليس بالدرجة التي تتطلبها نقطة النهاية هذه.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="ضبط رموز المصادقة فوراً">
لم يُضبط أي رمز فالمصادقة معطّلة بالكامل. <strong>حتى واجهة إصدار الشهادات مفتوحة دون مصادقة.</strong> ولا يخرج هذا في الاستجابة بل يُسجَّل في سجل الإقلاع فقط.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
تعذّر تفسير معاملات المسار أو الاستعلام، أو أن الوسيط خارج المدى المسموح (delay سالب، تجاوز عشر سنوات، إلخ).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
اسم الخوارزمية في مسار الطلب غير معروف.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
لا وجود لهذا المسار أو أن الطريقة (method) مختلفة.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
تجاوز حجم جسم الطلب الحدَّ المسموح.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
خطأ في الطلب لم يُصنَّف ضمن أي مما سبق.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="إعادة المحاولة بعد فترة تراجع">
انقطاع اتصال قاعدة البيانات، أو نفاد تجمّع الاتصالات، أو تنازع الأقفال، أو انتهاء المهلة. وهو <strong>الرمز الوحيد الذي يستخدم 503</strong>، وبه يعرف العميل أن "هذا ينصلح بالانتظار".
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="مراجعة حالة قاعدة البيانات">
فشل القراءة أو الكتابة، أو غياب الجدول، أو عدم تطابق المخطط، أو تلف صف شهادة مخزَّن.
</ErrorCode>

مغلّف الاستجابة:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

والأخطاء الناتجة عن إنشاء الشهادات والتعامل معها يستخدم فيها الخادم أيضاً الرموز المشتركة أعلاه (`DAT_CERT_*`، `DAT_KEY_*`، `DAT_CONFIG_*`) كما هي.

### عند استقبال رمز من الخادم

يغلّف العميل رمز الخادم برمز `CMS` الخاص به، ويحفظ الأصل في `cause`.

| المستلَم | HTTP | الرمز الذي يُصدره العميل |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (غير ذلك) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (تراجع النسخة) | 200 | `DAT_CMS_VERSION_RESET` |

---

## البحث حسب العَرَض

| العَرَض | الرمز |
| --- | --- |
| يعمل بعد تسجيل الدخول مباشرة ثم يُرفض بعد قليل | `DAT_TOKEN_EXPIRED` — انتهى عمر الرمز. ويكفي إعادة إصداره |
| فشل التحقق في خادم بعينه فقط | `DAT_CERT_NOT_SYNCED` — لم يستلم ذلك الخادم الـ CID الجديد بعد |
| رفض الرمز نفسه في جميع الخوادم | `DAT_CERT_NOT_FOUND` — إنه CID لم نصدره قط |
| خادم الإصدار لا يستطيع إنشاء الرموز | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **نُشر بصيغة verify-only** |
| فشل الإصدار عقب الإقلاع مباشرة فقط | `DAT_MANAGER_NO_CERTIFICATE` — قبل المزامنة الأولى. وينحل بعد قليل |
| استمرار فشل مزامنة CMS | `DAT_CMS_UNAUTHORIZED` — رمز المصادقة خاطئ. ولا ينحل بإعادة المحاولة |
| لا تصل أي شهادة | `DAT_CMS_ENDPOINT_NOT_FOUND` — خطأ إملائي في الـ URL |
| الفشل على منصة بعينها فقط | `DAT_INTERNAL_UNAVAILABLE` — لا توجد واجهة تشفير خلفية |
| ازدياد مفاجئ في فشل التحقق | `DAT_SIG_MISMATCH` — الحالة الواحدة غير ضارة لكن **تكاثرها محاولة تزوير** |
| فشل مفاجئ في فك تشفير secure | `DAT_CRYPTO_TAG_MISMATCH` — إما أن الشهادات اختلت أو أنها **محاولة عبث** |
| تحذير في سجل إقلاع CMS | `DAT_AUTH_DISABLED` — **المصادقة معطّلة.** وواجهة الإصدار مفتوحة |

---

## الملحق

### صيغة الرمز

```
DAT_<المجال>_<السبب>
```

- إذا نتج السبب نفسه في مجالات مختلفة **بقي اسم السبب واحداً.** فـ `DAT_TOKEN_MALFORMED` و`DAT_CERT_MALFORMED` يختلفان في الهدف فقط ويتفقان في المعنى.
- `_UNKNOWN` **مخصص للاحتياط** في كل مجال. ولا يُستخدم بمعنى آخر مثل "خوارزمية غير معروفة" (فذلك `_UNSUPPORTED`).
- نص الرمز عقد عام. فيمكن تغيير الرسالة بحرية أما الرمز فلا يُغيَّر.

| التصنيف | بادئة الرمز |
| --- | --- |
| رمز DAT | `DAT_TOKEN_` |
| الشهادة | `DAT_CERT_` |
| التوقيع | `DAT_SIG_` |
| التشفير | `DAT_CRYPTO_` |
| المفتاح | `DAT_KEY_` |
| المدير | `DAT_MANAGER_` |
| الإعداد | `DAT_CONFIG_` |
| الداخلي | `DAT_INTERNAL_` |
| مزامنة CMS | `DAT_CMS_` |
| الخادم | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### طريقة الوصول حسب العميل

| العميل | نوع الخطأ | الرمز | تصنيف إعادة المحاولة | الحدث الأمني |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| خادم CMS | مغلّف JSON | حقل `code` | — | — |

`الحدث الأمني` لا يعيد `true` إلا في الحالتين المؤكدتين للتزوير والعبث (`DAT_SIG_MISMATCH`، `DAT_CRYPTO_TAG_MISMATCH`). أما بطاقة **الاشتباه** في هذا المستند فنطاقها أوسع (تشمل الرموز والمفاتيح والطلبات المُلاعب بها)، وهي حالياً تصنيف توثيقي فقط ولا تُعرض عبر واجهة العميل البرمجية.

ودرجة **التأثير** كذلك تصنيف توثيقي. فالضرر يختلف باختلاف موضع نشوء الرمز الواحد — فمثلاً `DAT_KEY_INVALID` بلا تأثير عند ترشيح رمز DAT وارد، لكنه إن نشأ أثناء قراءة شهادة في مزامنة CMS أفشل المزامنة بأكملها.

**الأسباب الأدنى لا تُهمَل.** فـ `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` و`DAT_CMS_IMPORT_FAILED` ينقلان السبب عبر تسلسل الاستثناءات في كل لغة (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ تحتفظ بالقيم العددية أيضاً
تبقى القيم العددية القديمة في `dat_error_t` كما هي حفاظاً على توافق ABI، لكن **النص الرمزي هو المرجع**. فالمكتبة لم تعد تُعيد القيم القديمة، ولذلك فإن مقارنة مثل `err == DAT_ERROR_INVALID_DAT` لم تعد صحيحة. قارِن باستخدام `dat_error_code(e)`.

ولا يوجد في C تسلسل للاستثناءات، فيُستعلم عن السبب على حدة عبر `dat_manager_issuable_cause()`.
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
