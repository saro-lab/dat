# AI vibe coding

AI کو اپنے موجودہ project اور مطلوبہ behavior کے بارے میں بتا کر DAT integration آسان بنائیں۔ ذیل کی مثالوں میں صرف URL اور environment variable names اپنے project کے مطابق بدلیں۔

## سادہ implementation

Basic structure تیزی سے بنانی ہو تو یہ prompt استعمال کریں۔

```text
میں Kotlin اور Spring Boot استعمال کر رہا ہوں۔
Spring Security میں DAT authentication شامل کریں۔

پہلے https://dat.saro.me/llms.txt پڑھیں اور
DAT specification اور official library documentation کا جائزہ لیں۔

Authorization header سے Bearer token verify کریں،
اور authentication کامیاب ہونے پر user information کو SecurityContext میں رکھیں۔

یہ server DAT issue نہیں کرتا؛ صرف verify کرتا ہے۔
اسے DAT CMS سے verify-only certificates ملنے چاہییں۔

پہلے project میں CMS server URL اور token settings تلاش کریں۔
نہ ملیں تو مجھ سے پوچھیں۔ values ایجاد نہ کریں۔

official Java/Kotlin DAT library استعمال کریں،
اور project کی موجودہ structure اور coding style پر عمل کریں۔
```

## تفصیلی implementation

authentication flow اور error handling واضح طور پر متعین کرنے کے لیے یہ prompt استعمال کریں۔

```text
یہ project Kotlin، Spring Boot اور Spring Security استعمال کرتا ہے۔
موجودہ security configuration کا جائزہ لے کر DAT authentication شامل کریں۔

پہلے https://dat.saro.me/llms.txt پڑھیں اور
DAT specification، certificate synchronization اور official library API کا جائزہ لیں۔

درج ذیل requirements نافذ کریں۔

- Authorization: Bearer header سے DAT پڑھیں۔
- DAT نہ ہو تو anonymous request کے طور پر جاری رکھیں۔
- DAT invalid یا expired ہو تو 401 دیں۔
- verification کامیاب ہو تو user ID اور permissions کو SecurityContext میں رکھیں۔
- plain سے صرف وہ values پڑھیں جنہیں ظاہر کرنا محفوظ ہے۔
- verified secure data سے user ID اور permissions پڑھیں۔
- یہ server verify-only ہے، اس لیے DAT CMS کے verify-only certificates استعمال کریں۔
- CMS URL اور token کو environment variables سے پڑھیں۔
- startup پر certificate synchronization ناکام ہو تو application startup بھی ناکام کریں۔
- چلتے وقت certificates خودکار refresh کریں اور shutdown پر manager بند کریں۔
- failure causes کو error messages نہیں، DAT error codes سے الگ کریں۔
- اصل DAT، CMS token یا personal data log نہ کریں۔

پہلے project کی Spring Security configuration اور user/permission model دیکھیں۔
CMS URL، token environment variable یا secure data format واضح نہ ہو تو implementation سے پہلے پوچھیں۔
official Java/Kotlin DAT library کا صرف public API استعمال کریں۔

code edit کرنے سے پہلے authentication flow اور بدلنے والی files مختصراً بتائیں۔
```

## کون سی مثال منتخب کروں؟

- پہلے working code چاہیے تو **سادہ implementation** استعمال کریں۔
- production environment کے لیے authentication flow چاہیے تو **تفصیلی implementation** استعمال کریں۔

AI سوال کرے تو پہلے CMS URL، token رکھنے والا environment variable اور `secure` میں محفوظ user information دیں۔
