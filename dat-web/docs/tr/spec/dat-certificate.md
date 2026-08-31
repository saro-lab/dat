# Sertifika

DAT sertifikası, token vermek ve doğrulamak için gereken zaman aralığını, algoritmaları ve anahtarları tek bir dizgeyle ifade eder.

<WireFormat
  hint="Sertifika da noktalarla ayrılan, sabit sıralı ASCII alanlarından oluşur."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Değişmez sertifika kimliği'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Token verme başlangıç zamanı'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Token verilebilen süre'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT geçerlilik süresi'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'İmza algoritması'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Şifreleme algoritması'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'İmzalama veya doğrulama anahtarı'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Şifreleme anahtarı'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Zaman aralığı

<CertTimeline />

- Sertifika, `start` zamanından `start + duration` zamanına kadar DAT verebilir. Her iki uç zaman da dahildir.
- Verilen DAT, verildiği zamandan başlayarak `ttl` boyunca geçerlidir.
- Sertifika, `start + duration + ttl` zamanına kadar doğrulama için gereklidir. Tam o anda da doğrulanabilir durumdadır.

Token verme süresi sona erer ermez sertifika silinirse daha önce verilmiş DAT'ler doğrulanamaz. Yönetici ve CMS, token verebilme ile doğrulanabilme durumlarını ayrı ele alır.

## Sertifika kimliği ve anahtar değişimi

`cid`, anahtarları ve zaman aralığını tanımlayan açık sözleşmedir. Var olan bir `cid` üzerine farklı anahtar yazılmaz. Anahtar değiştirilirken yeni bir sertifika oluşturulup yeni bir `cid` kullanılır. Servisler yeni sertifikayı önceden eşitler; eski sertifika ise onunla verilen tüm DAT'ler sona erdikten sonra kaldırılır.

## İmza algoritmaları

| Ad | Kullanım | Yalnızca doğrulama sertifikası |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Desteklenmez |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Desteklenmez |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Desteklenmez |
| `ECDSA-P256` | ECDSA P-256 | Desteklenir |
| `ECDSA-P384` | ECDSA P-384 | Desteklenir |
| `ECDSA-P521` | ECDSA P-521 | Desteklenir |

HMAC aynı anahtarla imzalama ve doğrulama yaptığından anahtarı doğrulama sunucusuna vermek token verme yetkisini de verir. Token verme yetkisinin ayrılması gereken ortamlarda ECDSA ve yalnızca doğrulama sertifikaları kullanın.

## Şifreleme algoritmaları

| Ad | Anahtar |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Algoritma adları aktarım sözleşmesinin parçasıdır. JWT'de kullanılan takma adlarla değiştirilmez.

## Tam sertifika ve yalnızca doğrulama sertifikası

Tam ECDSA sertifikası imzalama için gereken özel anahtarı içerir. Yalnızca doğrulama sertifikasında sadece ECDSA açık anahtarı bırakılır, ancak `secure` verisinin şifresini çözmek için gereken AES anahtarı korunur. Bu nedenle yalnızca doğrulama servisi DAT'yi denetleyip şifresini çözebilir, fakat yeni DAT veremez.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
