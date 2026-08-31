# DAT nedir?

DAT (Distributed Access Token), token veren servis ile doğrulama servisinin aynı sertifikaları paylaşarak kullandığı bir erişim tokenı standardıdır. Doğrulama sırasında tokenı veren servise veya merkezi bir oturum deposuna yeniden istek göndermek gerekmez; böylece servisler arası bağımlılık azalırken kimlik doğrulama sonucu aktarılabilir.

<WireFormat
  hint="Noktalarla ayrılan alanlar tek bir DAT oluşturur."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Sona erme Unix time değeri'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Sertifika kimliği'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Açık veri'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Şifreli veri'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Gövde imzası'},
  ]"
/>

## Bileşenler

### DAT

Kullanıcının veya servisin istekle birlikte gönderdiği dizgedir. Sona erme zamanını ve sertifika kimliğini içerir; açık ve şifreli veriyi birlikte taşıyabilir.

### Sertifika

DAT oluşturmak ve denetlemek için gereken algoritmaları, anahtarları ve zaman aralığını içerir. Sertifika kimliği olan `cid` değişmez; anahtar değiştirilirken yeni bir `cid` kullanılır.

### Yönetici

İstemci kütüphanesindeki yönetici sertifikaları saklar, o anda token verebilen sertifikayla DAT oluşturur ve DAT'nin `cid` değerine uyan sertifikayla doğrulama yapar.

### DAT CMS

Sertifikaları oluşturup saklayan ve servislere ileten isteğe bağlı bir sunucudur. Token veren servislere tam sertifika, yalnızca doğrulama yapan servislere yalnızca doğrulama sertifikası sağlayabilir.

## Token verme ve doğrulama

<ArchFlow
  :user="{label: 'Kullanıcı', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Sertifika yönetimi', 'Sürüm tabanlı eşitleme']}"
  :service="{servers: [
    {label: 'Token veren servis', kind: 'issuer', icon: 'login', request: 'Kimlik bilgileri', response: 'DAT', sync: 'Tam sertifika'},
    {label: 'Doğrulama servisi', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Korunan işlev', sync: 'Yalnızca doğrulama sertifikası'},
  ]}"
/>

Token veren servis `plain` ve `secure` verilerini belirleyip DAT oluşturur. Doğrulama servisi sona erme zamanını, imzayı ve şifreli metni denetledikten sonra iki veri alanını uygulamaya iletir. `plain` imzalanır ancak şifrelenmez; bu nedenle gizli veya kişisel bilgi içermemelidir.

## Sertifika değişse bile neden doğrulanabilir?

Yeni sertifika token verebilir duruma geldiğinde sonraki DAT'ler yeni `cid` değerini kullanır. Önceki sertifika, daha önce verilen DAT'lerin TTL'i bitene kadar doğrulama için tutulur. Böylece anahtar değişimi ile mevcut tokenların doğrulama süresi birlikte yönetilebilir.

## Hangi ortamlara uygundur?

- Kimlik doğrulamayı ve asıl işlevi farklı servislerin yürüttüğü ortamlar
- Birden çok çalışma zamanının aynı tokenı verdiği veya doğruladığı ortamlar
- Merkezi oturum sorgusu olmadan kısa ömürlü yetki bilgisi aktarmak isteyen ortamlar
- Açık yönlendirme bilgisi ile korunacak verinin tek tokenda ayrı alanlarda taşınması gereken ortamlar

DAT, yetkilendirme politikasının kendisini tanımlamaz. DAT'nin geçerli olması ile uygulamanın ilgili isteğe izin vermesi ayrı kararlardır.

## Sonraki belgeler

- [DAT standardı](./spec/dat): Token alanları ve doğrulama kuralları
- [Sertifika](./spec/dat-certificate): Anahtarlar ve zaman aralığı
- [DAT CMS standardı](./spec/cms): Eşitleme sözleşmesi
- [Kütüphaneler](./libs/): Uygulamaya ekleme

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
