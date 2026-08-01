# خرابی کے کوڈ

یہ DAT کی سرکاری طور پر معاونت یافتہ سروس لائبریریوں کے مشترکہ خرابی کوڈ ہیں۔

ہر کوڈ کے ساتھ **اثر** اور **دوبارہ کوشش** دو قدریں لگتی ہیں، اور بعض کے ساتھ اضافی طور پر **مشتبہ** کا لیبل بھی لگتا ہے۔

## اثر — سروس پر پڑنے والا نقصان

یہ الرٹ لگانے کا معیار ہے۔ صرف یہی دیکھا جاتا ہے کہ "کیا اس وقت سروس رک گئی ہے؟"

| اثر | مطلب | مثال |
| --- | --- | --- |
| <span class="lg lg-critical">نازک</span> | سروس یا کوئی خاص فعل **رک جاتا ہے۔** اجرا ناممکن، ہم آہنگی کی مستقل ناکامی، ابتدائیہ کی ناکامی | اجرا کرنے والے سرور کے پاس استعمال کے قابل ایک بھی سرٹیفکیٹ نہیں |
| <span class="lg lg-partial">جزوی</span> | کچھ درخواستیں یا چکر ناکام ہوتے ہیں مگر سروس چلتی رہتی ہے۔ عموماً خود بحال ہو جاتی ہے | CMS کا ایک چکر ناکام۔ موجودہ سرٹیفکیٹس سے کام جاری |
| <span class="lg lg-none">بے اثر</span> | ایک درخواست مسترد کر کے بات ختم | چھیڑ چھاڑ شدہ ٹوکن آیا۔ چھان کر نکال دینا کافی ہے |

**بے اثر** الرٹ کا ہدف نہیں۔ اگر ایک بار غلط ان پٹ آنے پر تمام ذمہ داروں کو دیکھنا پڑے تو الرٹ بے معنی ہو جاتا ہے۔

## مشتبہ — مسلسل ہو تو تحقیق

<span class="lg lg-suspect">مشتبہ</span> لیبل والے کوڈ **ایک بار آنے پر معمول کے آپریشن کا حصہ** ہیں۔ کلائنٹ کسی بھی وقت غلط قدر بھیج سکتا ہے، اور اسے چھان کر نکالنا ہی لائبریری کا اصل کام ہے۔

البتہ یہ خرابیاں اگر **مسلسل، یا کسی خاص ماخذ سے جھنڈ کی صورت میں** آئیں تو دو میں سے ایک بات ہے۔

- **کنفیگریشن کی خرابی** — تعیناتی غلط ہے، یا پرانے ورژن کے کلائنٹ باقی ہیں، یا سرٹیفکیٹس میل نہیں کھاتے۔
- **ہیکنگ کی کوشش** — ٹوکن یا کی میں چھیڑ چھاڑ کر کے تصدیق سے گزرنے کی کوشش، یا درست قدر ڈھونڈنے کی جستجو۔

اسی لیے ان کوڈز کے **گنتی کو اشاریے کے طور پر رکھنا** درست ہے۔ صرف حد سے تجاوز پر اطلاع دینا کافی ہے۔

## دوبارہ کوشش

| دوبارہ کوشش | مطلب |
| --- | --- |
| <span class="lg lg-transient">عارضی</span> | بیک آف کے بعد دوبارہ کوشش سے حل ہو جاتا ہے |
| <span class="lg">مستقل</span> | دوبارہ کوشش ممنوع۔ کنفیگریشن یا ان پٹ درست کرنا ہوگا |
| <span class="lg">حالت</span> | خرابی نہیں بلکہ ایک اشارہ ہے |

---

## ٹوکن

موصولہ ٹوکن سٹرنگ میں خود مسئلہ۔

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="درخواست مسترد کریں">
نقطوں سے الگ ہونے والے حصے پانچ نہیں ہیں، یا <code>expire</code> خالص اعشاری عدد نہیں، یا <code>cid</code> خالص سولہ عددی نہیں، یا <code>plain</code> یا <code>secure</code> base64url نہیں، یا کوئی عددی فیلڈ صحیح عدد کی حد سے تجاوز کر گیا۔
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="ٹوکن دوبارہ جاری کرنے کی ترغیب">
<code>expire &lt;= now</code>۔ <strong>عین وقت بھی میعاد ختم شمار ہوتا ہے</strong> — یعنی <code>expire == now</code> ہو تو پہلے ہی ختم شدہ سمجھا جاتا ہے۔
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی ٹوکن خرابی۔
</ErrorCode>

::: tip میعاد کا خاتمہ اور صیغے کی خرابی لازماً مختلف ہیں
ردعمل بالکل الٹ ہے — میعاد کا خاتمہ عمر کا معمول کا اختتام ہے سو ٹوکن تجدید کرا دینا کافی ہے، جبکہ صیغے کی خرابی کا مطلب ہے کہ ٹوکن سرے سے ہمارا جاری کردہ ہی نہیں، لہٰذا اسے مسترد کرنا ہوگا۔

تجزیہ **پہلے ساخت کو حتمی کرتا ہے، پھر قدروں کو دیکھتا ہے**۔ `"1.2.3"` جیسی ناقص حصوں والی سٹرنگ ختم شدہ ٹوکن نہیں بلکہ سرے سے ٹوکن ہی نہیں، اس لیے وہ `DAT_TOKEN_MALFORMED` ہے۔

`expire` فیلڈ میں `+100` جیسی علامت لگی ہو تو یہ بھی میعاد کا معاملہ نہیں بلکہ صیغے کی خرابی ہے۔ صرف خالص ASCII ہندسے قبول ہیں۔
:::

---

## سرٹیفکیٹ

سرٹیفکیٹ سٹرنگ کے صیغے کا، اور اس سرٹیفکیٹ کو اس وقت استعمال کیا جا سکتا ہے یا نہیں، اس کا مسئلہ۔

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="سرٹیفکیٹ دوبارہ تعینات کریں">
نقطوں سے الگ ہونے والے حصے آٹھ نہیں ہیں، یا <code>cid</code>، <code>start</code>، <code>duration</code>، <code>ttl</code> کا تجزیہ ناکام ہوا، یا کی فیلڈ base64url نہیں، یا <code>start + duration + ttl</code> نے u64 کی حد پار کر لی۔
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="سرٹیفکیٹ کی تجدید">
<code>start + duration + ttl &lt; now</code>۔ مکمل طور پر ختم شدہ حالت جس میں نہ اجرا ممکن ہے نہ تصدیق۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="انتظار">
<code>now &lt; start</code>۔ اجرا کی کھڑکی ابھی کھلی نہیں۔
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="نیا سرٹیفکیٹ تعینات کریں">
<code>now &gt; start + duration</code> ہے مگر ttl باقی ہے۔ اجرا نہیں ہو سکتا، صرف تصدیق ممکن ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="تعیناتی کی ترتیب دیکھیں">
دستخطی نجی کی کے بغیر صرف عوامی کی رکھنے والا سرٹیفکیٹ۔ تصدیق ہو جاتی ہے مگر اجرا ناممکن ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="درخواست مسترد کریں">
ٹوکن کے <code>cid</code> سے متعلقہ سرٹیفکیٹ ہمارے پاس نہیں۔ یا تو جعلی ٹوکن ہے یا غلط تعیناتی۔
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="ہم آہنگی کے بعد دوبارہ کوشش">
وہ <code>cid</code> ابھی CMS سے موصول نہیں ہوا۔ نیا سرٹیفکیٹ تعینات ہونے کے فوراً بعد تھوڑی دیر کے لیے ہوتا ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="سرور کا جواب دیکھیں">
import کی جانے والی فہرست میں ایک ہی <code>cid</code> دو یا زیادہ بار موجود ہے۔
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی سرٹیفکیٹ خرابی۔
</ErrorCode>

`DAT_CERT_NOT_FOUND` اور `DAT_CERT_NOT_SYNCED` کی ظاہری علامت ایک جیسی ہے مگر ردعمل مختلف۔ پہلا وہ `cid` ہے جو ہم نے کبھی جاری ہی نہیں کیا سو انتظار سے کچھ نہیں ہوتا، جبکہ دوسرا ہم آہنگی ہوتے ہی حل ہو جاتا ہے۔

`DAT_CERT_NOT_FOUND` ایک بار آئے تو بس چھان کر نکال دینا کافی ہے، مگر اچانک بڑھ جائے تو مطلب ہے کہ تعیناتی بگڑ گئی ہے یا جعلی ٹوکن گردش کر رہے ہیں۔

---

## دستخط

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="سیشن بند کریں، سیکیورٹی لاگ">
دستخط کی تصدیق <strong>عدم مطابقت</strong> پر ختم ہوئی۔ HMAC کی قدر مختلف ہے یا ECDSA verify نے false دیا۔
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="درخواست مسترد کریں">
دستخط کا حصہ خالی ہے، یا base64url نہیں، یا ECDSA کی <code>r‖s</code> لمبائی منحنی سے میل نہیں کھاتی، یا DER میں تبدیلی ناکام ہوئی۔
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="اجرا سرور کی ترتیب دیکھیں">
verify-only کی سے دستخط کی کوشش کی گئی۔ یعنی رن ٹائم پر نجی کی موجود نہیں۔
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="کی کی قسم اور لائبریری دیکھیں">
دستخط یا تصدیق کا <strong>عمل ہی نہ چل سکا۔</strong> غلط کی قسم، آزاد شدہ ہینڈل، یا خفیہ نگاری لائبریری کی اندرونی خرابی۔
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی دستخط کی خرابی۔
</ErrorCode>

::: warning عدم مطابقت اور بیک اینڈ کی ناکامی کو خلط ملط نہ کریں
دونوں کوڈز کے محور بالکل الٹ ہیں۔

- `DAT_SIG_MISMATCH` — آنے والا دستخط بس میل نہیں کھاتا، سو **سروس پر کوئی اثر نہیں**، البتہ مسلسل ہو تو **مشتبہ** کا معاملہ بن جاتا ہے۔
- `DAT_SIG_BACKEND` — تصدیق کا عمل ہی نہ چل سکا، سو یہ **ہماری طرف کا مسئلہ** ہے، مشتبہ کا معاملہ نہیں۔

اگر غلط کی قسم یا لائبریری کے بگ کو "دستخط کی عدم مطابقت" کہہ کر رپورٹ کیا جائے تو درحقیقت ہمارے اپنے کوڈ کی خرابی حملے کے اشاریوں میں گھل مل جاتی ہے۔ اور اس کے برعکس اگر حقیقی جعل سازی بیک اینڈ خرابی میں شمار ہو جائے تو وہ مشتبہ اشاریوں سے سرے سے نکل جاتی ہے۔
:::

---

## خفیہ کاری

secure پے لوڈ کی خفیہ کاری اور کشائی کا مسئلہ۔

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="سیشن بند کریں، سیکیورٹی لاگ">
AES-GCM کا تصدیقی ٹیگ میل نہیں کھاتا۔ یا تو secure میں چھیڑ چھاڑ ہوئی ہے یا سرٹیفکیٹ کی مختلف ہے۔
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="درخواست مسترد کریں">
خفیہ متن خالی نہیں مگر IV (12 بائٹ) سے چھوٹا یا برابر ہے، یا ان پٹ نفاذ کی حد (<code>INT_MAX</code> وغیرہ) سے تجاوز کر گیا۔
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="پلیٹ فارم سپورٹ دیکھیں">
خفیہ کاری یا کشائی کا عمل نہ چل سکا۔ GCM کی سپورٹ نہ رکھنے والا پلیٹ فارم یا سیاق کی ابتدائیہ کی ناکامی۔
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی خفیہ کاری/کشائی کی خرابی۔
</ErrorCode>

**خالی secure پے لوڈ خرابی نہیں ہے۔** خالی ان پٹ خالی آؤٹ پٹ بن جاتی ہے اور کوئی کوڈ جاری نہیں ہوتا۔

دستخط کی تصدیق چھوڑ دینے والے راستے پر GCM ٹیگ ہی **واحد سالمیت کی جانچ** ہے۔ اسی لیے `DAT_CRYPTO_TAG_MISMATCH` کو کشائی کی دیگر ناکامیوں کے ساتھ ایک ہی کوڈ میں نہیں باندھا جاتا۔

---

## کی

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="کی تبدیل کریں">
اعلان کردہ الگورتھم اور کی کی لمبائی میں عدم مطابقت (HMAC 32/48/64، AES 16/32)، یا منحنی سے باہر کا نقطہ، یا <code>d ∉ [1,n-1]</code>، یا غیر دبی ہوئی (0x04) صورت نہ ہونا، یا نجی اور عوامی کی کا آپس میں جوڑا نہ ہونا۔
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="الگورتھم تبدیل کریں">
HMAC خاندان سے verify-only برآمد کرنے کی درخواست دی گئی۔
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی کی کی خرابی۔
</ErrorCode>

**دیکھنے میں ملتے جلتے مگر مختلف تین:**

| کوڈ | مطلب |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **الگورتھم کی ساختی حد۔** HMAC متناسق کی ہے سو اس میں عوامی کی کا تصور ہی نہیں |
| `DAT_SIG_KEY_MISSING` | **رن ٹائم حالت۔** اس وقت اس کی میں نجی کی موجود نہیں |
| `DAT_CERT_VERIFY_ONLY` | **تعیناتی کی صورت۔** یہ سرٹیفکیٹ صرف تصدیق کے لیے تعینات ہوا ہے |

---

## منیجر

سرٹیفکیٹ رکھنے اور اجرا و تصدیق میں استعمال کرنے والے آبجیکٹ کی حالت۔

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS کنکشن دیکھیں">
ایک بھی سرٹیفکیٹ موجود نہیں۔ یا تو import سے پہلے ہے یا CMS کی پہلی ہم آہنگی ناکام ہوئی ہے۔
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="سبب (cause) دیکھ کر فیصلہ — نیچے جدول">
سرٹیفکیٹ تو ہیں مگر اس وقت اجرا کے لیے قابلِ استعمال کوئی نہیں۔ <strong>سبب ساتھ بھیجا جاتا ہے۔</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="کالنگ کوڈ درست کریں">
پہلے سے آزاد کیا جا چکا منیجر یا سرٹیفکیٹ استعمال کیا گیا۔
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی منیجر کی خرابی۔
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` کا سبب (`cause`) چار میں سے ایک ہوتا ہے۔ **ہر سبب کے لیے کرنے کا کام بالکل مختلف ہے۔**

| سبب | مطلب | دوبارہ کوشش | ردعمل |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | اجرا کی کھڑکی شروع ہونے سے پہلے | **عارضی** | انتظار سے حل ہو جاتا ہے |
| `DAT_CERT_ISSUANCE_ENDED` | اجرا کی کھڑکی ختم، صرف تصدیق ممکن | مستقل | نیا سرٹیفکیٹ تعینات کرنا ہوگا |
| `DAT_CERT_EXPIRED` | موجود تمام سرٹیفکیٹس ختم شدہ | مستقل | سرٹیفکیٹ کی تجدید درکار ہے |
| `DAT_CERT_VERIFY_ONLY` | موجود تمام سرٹیفکیٹس صرف تصدیقی | مستقل | **تعیناتی کی ترتیب کی غلطی ہے** |

اگر اجرا کرنے والا سرور صرف تصدیقی سرٹیفکیٹ وصول کرنے پر ترتیب دیا جائے تو `DAT_CERT_VERIFY_ONLY` آتا ہے۔ انتظار سے یہ کبھی حل نہیں ہوتا سو دوبارہ کوشش کا ہدف نہیں۔

---

## کنفیگریشن

کالر کی دی گئی قدر کا مسئلہ۔ `CONFIG` خاندان کے سب **ایسی خرابیاں ہیں جن میں کوڈ درست کرنا پڑتا ہے**، اور آپریشن کے دوران آئیں تو مطلب ہے کہ تعیناتی غلط ہے۔

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="الگورتھم کا نام دیکھیں">
نامعلوم الگورتھم نام۔ وائر نوٹیشن (<code>ECDSA-P256</code>، <code>IV-AES256-GCM</code>) سے بالکل مطابقت ضروری ہے۔
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="کالنگ کوڈ درست کریں">
لازمی آرگیومنٹ null ہے، یا مجاز حد سے باہر (منفی وقت کی قدر، <code>interval &lt;= 0</code>)، یا غیر معاون قسم (متحرک قسم والی زبانوں میں payload کو عدد یا بولین دینا)، یا دستخط کے لیے دیا گیا body خالی ہے۔
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI درست کریں">
CMS سرور کا URI معیار سے باہر ہے۔ تجزیہ ناممکن، سکیم http/https نہیں، یا اس کے ساتھ راستہ یا کوئری لگی ہوئی ہے۔
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی کنفیگریشن خرابی۔
</ErrorCode>

---

## اندرونی

عمل درآمد کے ماحول اور رن ٹائم کا مسئلہ۔

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="تعیناتی اور پلیٹ فارم دیکھیں">
خفیہ نگاری بیک اینڈ یا رن ٹائم API سرے سے موجود ہی نہیں۔ <code>crypto.subtle</code> کی عدم موجودگی، AES-GCM کی سپورٹ نہ رکھنے والا پلیٹ فارم، یا رن ٹائم ورژن کا کم ہونا۔
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="لاگ دیکھیں">
میموری مختص کرنے کی ناکامی، بے ترتیب عدد کی تخلیق کی ناکامی، لاک حاصل کرنے کی ناکامی، یا ایسی شاخ تک پہنچنا جو ناقابلِ رسائی ڈیزائن کی گئی تھی۔
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` تعیناتی کا ماحول درست کرنے سے حل ہو جاتا ہے، جبکہ `DAT_INTERNAL_UNKNOWN` عموماً رن ٹائم کی خرابی یا لائبریری کا بگ ہوتا ہے۔

---

## CMS ہم آہنگی

اگر CMS ہم آہنگی استعمال نہ کی جائے تو یہ کوڈ نہیں آتے۔

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="بیک آف کے بعد دوبارہ کوشش">
DNS کی ناکامی، کنکشن سے انکار، TLS کی ناکامی، <strong>ٹائم آؤٹ</strong>۔ ٹائم آؤٹ الگ کوڈ نہیں بلکہ اسی میں شامل ہے — کیونکہ ردعمل ایک ہی ہے۔
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="ٹوکن کی ترتیب دیکھیں">
سرور نے 401 سے جواب دیا۔ ٹوکن موجود نہیں یا غلط ہے۔
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="ٹوکن کا درجہ دیکھیں">
سرور نے 403 سے جواب دیا۔ ٹوکن درست ہے مگر اس اینڈ پوائنٹ کا اختیار نہیں۔
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL کی ترتیب دیکھیں">
سرور نے 404 سے جواب دیا۔ URL غلط ہے۔
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="بیک آف کے بعد دوبارہ کوشش">
سرور نے 5xx سے جواب دیا۔
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="سٹیٹس کوڈ دیکھیں">
اوپر شامل نہ ہونے والا غیر 2xx جواب۔
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="سرور کا ورژن دیکھیں">
جواب میں ورژن کی سطر نہیں، یا ورژن کی سطر خالص اعشاری عدد نہیں، یا حد سے تجاوز کر گئی۔
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="cause میں CERT_* / KEY_* دیکھیں">
جواب تو مل گیا مگر سرٹیفکیٹ لاگو نہ ہو سکے۔ <strong>سبب <code>cause</code> میں شامل ہوتا ہے۔</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="خودکار طور پر سنبھال لیا جاتا ہے">
سرور نے ہم سے پرانا ورژن واپس کیا۔ یہ مکمل دوبارہ ہم آہنگی کا حکم ہے۔
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="پہلی ہم آہنگی کا انتظار">
ابھی تک ایک بار بھی ہم آہنگی کامیاب نہیں ہوئی۔
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
پچھلی ہم آہنگی ابھی چل رہی ہے اس لیے یہ چکر چھوڑ دیا گیا۔ یہ خرابی نہیں ہے۔
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="بلڈ آپشن دیکھیں">
CMS کی سہولت بلڈ میں شامل نہیں۔ یا تو فیچر فعال نہیں یا CURL شامل نہیں۔
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="لاگ دیکھیں">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی CMS خرابی۔
</ErrorCode>

جن کوڈز میں ہم آہنگی **مستقل ناکامی** قرار پاتی ہے (`UNAUTHORIZED`، `FORBIDDEN`، `ENDPOINT_NOT_FOUND`، `MALFORMED`، `IMPORT_FAILED`) وہ سب نازک ہیں۔ دوبارہ کوشش سے حل نہیں ہوتے جبکہ سرٹیفکیٹ مسلسل ختم ہوتے رہتے ہیں، سو نظر انداز کرنے پر سروس لازماً رک جائے گی۔

اس کے برعکس `UNREACHABLE` اور `SERVER_ERROR` جزوی ہیں۔ موجودہ سرٹیفکیٹس سے کام چلتا رہتا ہے اور اگلے چکر میں خود بحال ہو جاتے ہیں — **البتہ مسلسل ناکامی بالآخر انہیں نازک میں بدل دیتی ہے۔** لہٰذا مسلسل ناکامیوں کی تعداد کی بنیاد پر الرٹ لگائیں۔

::: tip ہم آہنگی کی ناکامی استثنا کے طور پر نہیں پھینکی جاتی
پہلی ہم آہنگی ناکام ہو تب بھی منیجر درست واپس ہوتا ہے — کیونکہ دیر سے ہی سہی، ہم آہنگ ہو جانا بہتر ہے۔ اس کے بجائے ناکامی ایک **قابلِ استفسار حالت** کے طور پر باقی رہتی ہے۔

| کلائنٹ | استفسار کا طریقہ |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

اگر ایک بار بھی کامیابی نہ ہوئی ہو تو `DAT_CMS_NOT_SYNCED`، اور سب ٹھیک ہو تو خالی ہوتا ہے۔
:::

---

## سرور

یہ CMS سرور کے جاری کردہ کوڈ ہیں۔ کلائنٹ انہیں **بناتا نہیں، صرف وصول کرتا ہے**۔

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
<code>Authorization</code> ہیڈر موجود نہیں، یا ٹوکن کسی بھی درجے میں رجسٹرڈ نہیں۔
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
ٹوکن رجسٹرڈ تو ہے مگر وہ درجہ نہیں جو یہ اینڈ پوائنٹ مانگتا ہے۔
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="فوراً ٹوکن مقرر کریں">
ایک بھی ٹوکن مقرر نہ ہونے کی وجہ سے توثیق سرے سے غیر فعال ہے۔ <strong>سرٹیفکیٹ اجرا کی API تک بغیر توثیق کے کھلی ہے۔</strong> یہ جواب میں نہیں جاتا بلکہ صرف بوٹ لاگ میں درج ہوتا ہے۔
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
راستے یا کوئری کے پیرامیٹر سمجھ نہیں آئے، یا آرگیومنٹ مجاز حد سے باہر ہے (منفی delay، دس سال سے زیادہ وغیرہ)۔
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
درخواست کے راستے میں دیا گیا الگورتھم نام معلوم نہیں۔
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
ایسا کوئی راستہ نہیں یا میتھڈ مختلف ہے۔
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
درخواست کے body کا حجم حد سے تجاوز کر گیا۔
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
اوپر کسی زمرے میں درجہ بند نہ ہونے والی درخواست کی خرابی۔
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="بیک آف کے بعد دوبارہ کوشش">
DB کنکشن ٹوٹنا، کنکشن پول کا ختم ہونا، لاک کا تنازع، ٹائم آؤٹ۔ یہ <strong>503 استعمال کرنے والا واحد کوڈ</strong> ہے، جس سے کلائنٹ کو معلوم ہوتا ہے کہ "یہ انتظار سے ٹھیک ہو جائے گا"۔
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB کی حالت دیکھیں">
پڑھنے یا لکھنے کی ناکامی، ٹیبل کا نہ ہونا، سکیما کی عدم مطابقت، محفوظ شدہ سرٹیفکیٹ قطار کا خراب ہونا۔
</ErrorCode>

جواب کا لفافہ:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

سرٹیفکیٹ بناتے اور برتتے ہوئے پیدا ہونے والی خرابیوں کے لیے سرور بھی اوپر دیے گئے مشترکہ کوڈ (`DAT_CERT_*`، `DAT_KEY_*`، `DAT_CONFIG_*`) ہی استعمال کرتا ہے۔

### سرور سے کوڈ ملنے پر

کلائنٹ سرور کے کوڈ کو اپنے `CMS` کوڈ میں لپیٹ لیتا ہے، اور اصل کو `cause` میں محفوظ رکھتا ہے۔

| موصولہ | HTTP | کلائنٹ کا جاری کردہ کوڈ |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (دیگر) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (ورژن کی تنزلی) | 200 | `DAT_CMS_VERSION_RESET` |

---

## علامت سے تلاش

| علامت | کوڈ |
| --- | --- |
| لاگ ان کے فوراً بعد چلتا ہے پھر تھوڑی دیر میں مسترد ہونے لگتا ہے | `DAT_TOKEN_EXPIRED` — ٹوکن کی عمر ختم ہو گئی۔ دوبارہ جاری کرنے سے کام چل جائے گا |
| صرف کسی خاص سرور پر تصدیق ناکام | `DAT_CERT_NOT_SYNCED` — اس سرور کو ابھی نیا CID نہیں ملا |
| تمام سرورز پر ایک ہی ٹوکن مسترد | `DAT_CERT_NOT_FOUND` — یہ ایسا CID ہے جو ہم نے کبھی جاری نہیں کیا |
| اجرا کرنے والا سرور ٹوکن نہیں بنا پا رہا | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **verify-only کے طور پر تعینات ہوا ہے** |
| صرف بوٹ کے فوراً بعد اجرا ناکام | `DAT_MANAGER_NO_CERTIFICATE` — پہلی ہم آہنگی سے پہلے ہے۔ تھوڑی دیر میں حل ہو جائے گا |
| CMS ہم آہنگی مسلسل ناکام | `DAT_CMS_UNAUTHORIZED` — ٹوکن غلط ہے۔ دوبارہ کوشش سے بھی حل نہیں ہوگا |
| ایک بھی سرٹیفکیٹ نہیں آ رہا | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL میں ہجے کی غلطی ہے |
| صرف کسی خاص پلیٹ فارم پر ناکامی | `DAT_INTERNAL_UNAVAILABLE` — خفیہ نگاری بیک اینڈ موجود نہیں |
| تصدیق کی ناکامیاں اچانک بڑھ گئیں | `DAT_SIG_MISMATCH` — ایک واقعہ بے ضرر ہے مگر **جھنڈ کی صورت میں آئے تو جعل سازی کی کوشش ہے** |
| secure کی کشائی اچانک ناکام | `DAT_CRYPTO_TAG_MISMATCH` — یا تو سرٹیفکیٹ میل نہیں کھاتے یا یہ **چھیڑ چھاڑ کی کوشش** ہے |
| CMS بوٹ لاگ میں انتباہ | `DAT_AUTH_DISABLED` — **توثیق بند ہے۔** اجرا کی API کھلی پڑی ہے |

---

## ضمیمہ

### کوڈ کا صیغہ

```
DAT_<شعبہ>_<سبب>
```

- ایک ہی سبب مختلف شعبوں میں پیدا ہو تو **سبب کا نام ایک ہی رہتا ہے۔** `DAT_TOKEN_MALFORMED` اور `DAT_CERT_MALFORMED` میں صرف ہدف مختلف ہے، مطلب ایک ہی ہے۔
- `_UNKNOWN` ہر شعبے کے لیے **صرف فال بیک** ہے۔ "نامعلوم الگورتھم" جیسے کسی اور مفہوم میں استعمال نہیں ہوتا (وہ `_UNSUPPORTED` ہے)۔
- کوڈ کی سٹرنگ ایک عوامی معاہدہ ہے۔ پیغام آزادانہ بدلا جا سکتا ہے مگر کوڈ نہیں بدلا جاتا۔

| زمرہ | کوڈ کا سابقہ |
| --- | --- |
| ٹوکن | `DAT_TOKEN_` |
| سرٹیفکیٹ | `DAT_CERT_` |
| دستخط | `DAT_SIG_` |
| خفیہ کاری | `DAT_CRYPTO_` |
| کی | `DAT_KEY_` |
| منیجر | `DAT_MANAGER_` |
| کنفیگریشن | `DAT_CONFIG_` |
| اندرونی | `DAT_INTERNAL_` |
| CMS ہم آہنگی | `DAT_CMS_` |
| سرور | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### کلائنٹ کے لحاظ سے رسائی کا طریقہ

| کلائنٹ | خرابی کی قسم | کوڈ | دوبارہ کوشش کا زمرہ | سیکیورٹی ایونٹ |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS سرور | JSON لفافہ | `code` فیلڈ | — | — |

`سیکیورٹی ایونٹ` صرف ان دو حالتوں میں `true` دیتا ہے جہاں جعل سازی یا چھیڑ چھاڑ یقینی ہو (`DAT_SIG_MISMATCH`، `DAT_CRYPTO_TAG_MISMATCH`)۔ اس دستاویز کا **مشتبہ** لیبل اس سے وسیع تر دائرہ رکھتا ہے (چھیڑ چھاڑ شدہ ٹوکن، کی اور درخواستیں تک)، اور فی الحال یہ محض دستاویزی درجہ بندی ہے، کلائنٹ API میں ظاہر نہیں ہوتا۔

**اثر** کا درجہ بھی اسی طرح دستاویزی درجہ بندی ہے۔ کیونکہ ایک ہی کوڈ کہاں پیدا ہوا اس کے لحاظ سے نقصان بدل جاتا ہے — مثلاً `DAT_KEY_INVALID` آنے والے ٹوکن کو چھاننے کے وقت بے اثر ہے، مگر CMS ہم آہنگی کے دوران سرٹیفکیٹ پڑھتے ہوئے پیدا ہو تو پوری ہم آہنگی ناکام کر دیتا ہے۔

**ذیلی اسباب ضائع نہیں ہوتے۔** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` اور `DAT_CMS_IMPORT_FAILED` ہر زبان کی استثنا زنجیر (`cause` / `__cause__` / `InnerException` / `Unwrap()`) کے ذریعے سبب پہنچاتے ہیں۔

::: warning C/C++ عددی قدریں بھی برقرار رکھتی ہے
`dat_error_t` کی پرانی عددی قدریں ABI مطابقت کے لیے جوں کی توں رکھی گئی ہیں، مگر **متنی کوڈ ہی اصل ہے**۔ لائبریری اب پرانی قدریں واپس نہیں کرتی، اس لیے `err == DAT_ERROR_INVALID_DAT` جیسا موازنہ درست نہیں رہا۔ `dat_error_code(e)` سے موازنہ کریں۔

C میں استثنا زنجیر نہیں ہوتی، سو سبب الگ سے `dat_manager_issuable_cause()` کے ذریعے دیکھا جاتا ہے۔
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
