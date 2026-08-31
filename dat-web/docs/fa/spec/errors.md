# کدهای خطا

پیاده‌سازی‌های DAT علاوه بر پیام خوانا برای انسان، کد خطای پایدار ارائه می‌دهند. برنامه باید بر اساس کد و طبقه‌بندی تکرار تصمیم بگیرد، نه با مقایسه متن پیام.

## روش خواندن

```text
DAT_<حوزه>_<علت>
```

| پیشوند | حوزه |
| --- | --- |
| `DAT_TOKEN_` | رشته DAT و انقضا |
| `DAT_CERT_` | رشته و وضعیت گواهی |
| `DAT_SIG_` | امضا و راستی‌آزمایی |
| `DAT_CRYPTO_` | رمزگذاری و رمزگشایی |
| `DAT_KEY_` | قالب و اختیار کلید |
| `DAT_MANAGER_` | مدیر گواهی |
| `DAT_CONFIG_` | آرگومان‌های فراخوانی و تنظیمات |
| `DAT_INTERNAL_` | قابلیت‌های داخلی runtime |
| `DAT_CMS_` | همگام‌سازی کلاینت CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | سرور CMS |

`_UNKNOWN` فقط زمانی در هر حوزه استفاده می‌شود که خطا در هیچ کد دیگری نگنجد. علت یکسان، حتی در حوزه‌های مختلف، نام یکسانی دارد.

## طبقه‌بندی تکرار

| طبقه | معنا | پردازش |
| --- | --- | --- |
| موقت | با بازیابی وضعیت خارجی ممکن است موفق شود | تکرار محدود پس از backoff |
| وضعیت | با تغییر همگام‌سازی گواهی یا زمان ممکن است موفق شود | به‌روزرسانی وضعیت لازم و سپس تکرار |
| دائمی | با همان ورودی دوباره شکست می‌خورد | اصلاح ورودی، تنظیمات یا کد |

## توکن و گواهی

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
تعداد فیلدها، عدد یا نمایش Base64Url در DAT با مشخصات متفاوت است. ورودی را دور بیندازید.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
زمان انقضای DAT برابر زمان فعلی یا در گذشته است. باید DAT جدیدی دریافت شود.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
ساختار یا نمایش فیلدهای رشته گواهی نادرست است.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
گواهی مطابق `cid` در DAT وجود ندارد. وضعیت همگام‌سازی گواهی را بررسی کنید.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
ممکن است گواهی موردنیاز هنوز به سرویس نرسیده باشد. فوراً همگام کنید و دوباره بررسی کنید.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
زمان شروع گواهی هنوز فرا نرسیده است. ساعت سیستم و زمان توزیع گواهی را بررسی کنید.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
دوره قابل راستی‌آزمایی گواهی به پایان رسیده است.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
در یک فهرست واردات، `cid` یکسان تکرار شده است. کل واردات رد می‌شود.
</ErrorCode>

## امضا، رمزگذاری و کلید

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
امضا با متن مطابقت ندارد. DAT دستکاری شده یا با کلید دیگری امضا شده است.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
برچسب اصالت AES-GCM مطابقت ندارد. دستکاری متن رمزشده یا عدم تطابق گواهی را بررسی کنید.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
طول، قالب یا ترکیب الگوریتم کلید نادرست است.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
با گواهی فقط راستی‌آزمایی تلاش شده DAT صادر شود. سرویس صدور به گواهی کامل نیاز دارد.
</ErrorCode>

`DAT_SIG_MISMATCH` و `DAT_CRYPTO_TAG_MISMATCH` خطاهایی هستند که API عمومی رویداد امنیتی، آن‌ها را true طبقه‌بندی می‌کند. یک ورودی نادرست به‌تنهایی اختلال سرویس نیست، اما تکرار آن باید به‌عنوان مورد نظارت امنیتی پردازش شود.

## مدیر و تنظیمات

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
مدیر هیچ گواهی‌ای ندارد. گواهی وارد کنید یا همگام‌سازی CMS را به پایان برسانید.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
گواهی وجود دارد، اما در حال حاضر هیچ گواهی کامل قابل صدوری نیست. در زنجیره علت، انقضا، زمان شروع یا verify-only بودن را بررسی کنید.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
آرگومان فراخوانی یا مقدار تنظیمات خارج از محدوده مجاز است.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
قابلیت رمزنگاری یا شبکه موردنیاز در پلتفرم فعلی وجود ندارد.
</ErrorCode>

## کلاینت CMS

| کد | معنا | پردازش معمول |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | قالب URI مربوط به CMS نادرست است | اصلاح تنظیمات |
| `DAT_CMS_UNAUTHORIZED` | احراز هویت ناموفق | اصلاح توکن |
| `DAT_CMS_FORBIDDEN` | نقش، اختیار ندارد | بررسی نقش توکن |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | مسیر وجود ندارد یا متفاوت است | بررسی نشانی و مسیر CMS |
| `DAT_CMS_NETWORK` | اتصال یا انتقال ناموفق | بررسی شبکه و backoff |
| `DAT_CMS_TIMEOUT` | مهلت به پایان رسید | تنظیم شبکه و timeout |
| `DAT_CMS_SERVER_ERROR` | خطای سرور CMS | بررسی وضعیت سرور و backoff |
| `DAT_CMS_RESPONSE_INVALID` | قالب پاسخ موفق نادرست | بررسی قرارداد سرور و کلاینت |
| `DAT_CMS_VERSION_RESET` | نسخه سرور عقب رفته است | بررسی داده و وضعیت استقرار CMS |
| `DAT_CMS_IMPORT_FAILED` | اعمال گواهی دریافت‌شده ناموفق | بررسی زنجیره علت |
| `DAT_CMS_STOPPED` | استفاده از مدیر خاتمه‌یافته | ساخت مدیر جدید یا اصلاح ترتیب فراخوانی |

کتابخانه‌ای که همگام‌سازی اولیه‌اش best-effort است، خطا را در فیلد آخرین خطا نگه می‌دارد. اگر راه‌اندازی باید ناموفق شود، از API همگام‌سازی فوری که خطا را مستقیم بازمی‌گرداند یا پرتاب می‌کند استفاده کنید.

## سرور CMS

| کد | HTTP | معنا |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | توکن وجود ندارد یا نادرست است |
| `DAT_AUTH_FORBIDDEN` | 403 | نقش توکن با اختیار درخواست متفاوت است |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | نام الگوریتم پشتیبانی نمی‌شود |
| `DAT_REQ_NOT_FOUND` | 404·405 | مسیر یا متد مطابق نیست |
| `DAT_REQ_TOO_LARGE` | 413 | کد رزروشده برای عبور از محدوده بدنه درخواست |
| `DAT_STORE_UNAVAILABLE` | 503 | مخزن موقتاً قابل استفاده نیست |
| `DAT_STORE_UNKNOWN` | 500 | خطای طبقه‌بندی‌نشده هنگام پردازش مخزن |

کلاینت فعلی کد سرور در JSON مربوط به non-2xx را عیناً نمایش نمی‌دهد، بلکه وضعیت HTTP را به کد `DAT_CMS_*` تبدیل می‌کند. بنابراین ممکن است کد خطای لاگ سرور با کد خطای کلاینت متفاوت باشد.

## روش بررسی در هر زبان

| محیط | کد خطا | طبقه‌بندی تکرار |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

خطاهای دارای علت زیرین را از زنجیره استثنا یا API دریافت علت در هر زبان بررسی کنید.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
