# Hata kodları

DAT uygulamaları, insanların okuyabildiği mesajlardan ayrı olarak kararlı hata kodları sunar. Programlar kararı mesaj dizgelerini karşılaştırarak değil, kodu ve yeniden deneme sınıfını kullanarak verir.

## Okuma biçimi

```text
DAT_<alan>_<neden>
```

| Önek | Alan |
| --- | --- |
| `DAT_TOKEN_` | DAT dizgesi ve sona erme |
| `DAT_CERT_` | Sertifika dizgesi ve durumu |
| `DAT_SIG_` | İmzalama ve doğrulama |
| `DAT_CRYPTO_` | Şifreleme ve şifre çözme |
| `DAT_KEY_` | Anahtar biçimi ve yetkiler |
| `DAT_MANAGER_` | Sertifika yöneticisi |
| `DAT_CONFIG_` | Çağrı bağımsız değişkenleri ve ayarlar |
| `DAT_INTERNAL_` | Çalışma zamanının iç işlevleri |
| `DAT_CMS_` | CMS istemci eşitlemesi |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS sunucusu |

`_UNKNOWN` yalnızca ilgili alanda başka bir kodla sınıflandırılamayan hatalarda kullanılır. Aynı neden farklı alanlarda da aynı adı kullanır.

## Yeniden deneme sınıfları

| Sınıf | Anlam | İşlem |
| --- | --- | --- |
| Geçici | Dış durum düzelirse başarılı olabilir | Gecikmeli ve sınırlı yeniden deneme |
| Durum | Sertifika eşitlemesi veya zaman değişirse başarılı olabilir | Gerekli durumu yeniledikten sonra yeniden deneme |
| Kalıcı | Aynı girdiyle tekrarlandığında başarısız olur | Girdiyi, ayarı veya kodu düzeltme |

## Token ve sertifika

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT'nin alan sayısı, sayısal veya Base64Url gösterimi standarda uymuyor. Girdiyi atın.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT'nin sona erme zamanı geçerli zamana eşit veya daha eski. Yeni bir DAT alınmalıdır.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Sertifika dizgesinin yapısı veya alan gösterimi yanlıştır.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT'nin `cid` değerine karşılık gelen sertifika yok. Sertifika eşitleme durumunu denetleyin.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Kullanılacak sertifika servise henüz ulaşmamış olabilir. Hemen eşitleyip yeniden değerlendirin.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Sertifikanın başlangıç zamanı henüz gelmedi. Sistem zamanını ve sertifika dağıtım zamanını denetleyin.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Sertifikanın doğrulanabilir süresi sona erdi.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Tek bir içe aktarma listesinde aynı `cid` tekrarlandı. İçe aktarmanın tamamı reddedilir.
</ErrorCode>

## İmza, şifreleme ve anahtarlar

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
İmza gövdeyle uyuşmuyor. DAT değiştirilmiş veya farklı bir anahtarla imzalanmış olabilir.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM kimlik doğrulama etiketi uyuşmuyor. Şifreli metnin değiştirilip değiştirilmediğini veya sertifika uyuşmazlığını denetleyin.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Anahtar uzunluğu, biçimi veya algoritma birleşimi geçersiz.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Yalnızca doğrulama sertifikasıyla DAT verilmeye çalışıldı. Token veren servisin tam sertifikaya ihtiyacı vardır.
</ErrorCode>

`DAT_SIG_MISMATCH` ve `DAT_CRYPTO_TAG_MISMATCH`, açık güvenlik olayı API'sinin doğru olarak sınıflandırdığı hatalardır. Tek bir geçersiz girdi servis arızası değildir, ancak yinelenirse güvenlik gözlemine alınır.

## Yönetici ve yapılandırma

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Yöneticide sertifika yok. Sertifikaları içe aktarın veya CMS eşitlemesini tamamlayın.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Sertifikalar var, ancak o anda token verebilen tam sertifika yok. Neden zincirinde sona ermeyi, başlangıç zamanını veya verify-only durumunu denetleyin.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Çağrı bağımsız değişkeni veya ayar değeri izin verilen aralığın dışında.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Geçerli platformda gereken şifreleme veya ağ işlevi yok.
</ErrorCode>

## CMS istemcisi

| Kod | Anlam | Genel işlem |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI biçimi hatalı | Ayarı düzeltme |
| `DAT_CMS_UNAUTHORIZED` | Kimlik doğrulama başarısız | Tokenı düzeltme |
| `DAT_CMS_FORBIDDEN` | Rolün yetkisi yok | Token rolünü denetleme |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Yol yok veya farklı | CMS adresini ve yolunu denetleme |
| `DAT_CMS_NETWORK` | Bağlantı veya aktarım başarısız | Ağı denetleyip gecikmeli yeniden deneme |
| `DAT_CMS_TIMEOUT` | Zaman aşımı | Ağı ve zaman aşımını ayarlama |
| `DAT_CMS_SERVER_ERROR` | CMS sunucu hatası | Sunucu durumunu denetleyip gecikmeli yeniden deneme |
| `DAT_CMS_RESPONSE_INVALID` | Başarılı yanıtın biçimi hatalı | Sunucu-istemci sözleşmesini denetleme |
| `DAT_CMS_VERSION_RESET` | Sunucu sürümü geriledi | CMS verisini ve dağıtım durumunu denetleme |
| `DAT_CMS_IMPORT_FAILED` | Alınan sertifikalar uygulanamadı | Neden zincirini denetleme |
| `DAT_CMS_STOPPED` | Kapatılmış yönetici kullanıldı | Yeni yönetici oluşturma veya çağrı sırasını düzeltme |

İlk eşitlemesi best-effort olan kütüphaneler hatayı son hata alanında saklar. Başlangıcın başarısız olması gerekiyorsa hatayı doğrudan döndüren veya fırlatan anında eşitleme API'sini kullanın.

## CMS sunucusu

| Kod | HTTP | Anlam |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token yok veya geçersiz |
| `DAT_AUTH_FORBIDDEN` | 403 | Token rolü istek yetkisiyle uyuşmuyor |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Desteklenmeyen algoritma adı |
| `DAT_REQ_NOT_FOUND` | 404·405 | Yol veya yöntem uyuşmazlığı |
| `DAT_REQ_TOO_LARGE` | 413 | İstek gövdesi sınırının aşılması için ayrılmış kod |
| `DAT_STORE_UNAVAILABLE` | 503 | Depo geçici olarak kullanılamıyor |
| `DAT_STORE_UNKNOWN` | 500 | Depo işlemi sırasında sınıflandırılamayan hata |

Mevcut istemciler 2xx olmayan JSON yanıtlarındaki sunucu kodunu olduğu gibi göstermez; HTTP durumunu `DAT_CMS_*` koduna dönüştürür. Sunucu günlüğü ile istemci hata kodu farklı olabilir.

## Dile göre denetleme

| Ortam | Hata kodu | Yeniden deneme sınıfı |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Alt nedeni olan hatalar, ilgili dilin istisna zinciri veya neden sorgulama API'siyle incelenir.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
