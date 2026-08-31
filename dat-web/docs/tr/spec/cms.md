# DAT CMS

DAT CMS, sertifikaları oluşturup saklayan ve istemci yöneticilerine ileten isteğe bağlı bir servistir. Bu belge istemciyle sunucu arasındaki eşitleme sözleşmesini açıklar. Kurulum ve işletim için [DAT CMS servis kılavuzuna](../svc/docker-saro-lab-dat-cms) bakın.

<FlowDiagram
  title="Sertifika eşitleme"
  :actors="[
    {id: 'client', label: 'İstemci', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Geçerli sürümü ve sertifikaları isteme', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Sürüm ve sertifikalarla yanıtlama', kind: 'res'},
    {from: 'client', label: 'Tümünü doğruladıktan sonra atomik olarak uygulama', kind: 'note'},
  ]"
/>

## Role göre uç noktalar

| Rol | Yol | Amaç |
| --- | --- | --- |
| Tam sertifikaları alma | `GET /v1/certs?version=<n>` | DAT veren servisler |
| Yalnızca doğrulama sertifikalarını alma | `GET /v1/certs/verify-only?version=<n>` | Yalnızca doğrulama ve şifre çözme yapan servisler |
| Sertifika kaydetme | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | İşletici veya sertifika oluşturma işi |

Tam ve yalnızca doğrulama sorguları farklı token rolleriyle korunabilir. Yalnızca doğrulama servisinin tam sertifika istememesi için istemci yöneticisinin `verifyOnly` seçeneğini ayarlayın.

## Sürüm imleci

İstemci, en son uyguladığı sürümü sunucuya iletir. Sunucunun durumu aynıysa sertifikaları yeniden göndermesi gerekmez. Yeni durum varsa ilk satırda sürüm, sonraki satırlarda sertifikalar döndürülür.

Başarılı yanıt yalnızca sürümü içeriyor ve sertifika içermiyorsa mevcut sertifikalar ile token veren sertifika korunur. Sunucu sürümünün istemciden daha düşük olduğu yanıt, durumu geri almaz ve hata olarak işlenir.

## Sertifikaları uygulama kuralları

- Yanıtta aynı `cid` tekrarlanıyorsa yanıtın tamamı reddedilir.
- Zaten tutulan bir `cid`, yeni yanıttaki `cid` ile aynıysa mevcut sertifika korunur.
- Tüm sertifikalar ayrıştırılıp doğrulandıktan sonra durum tek seferde uygulanır.
- Yalnızca bazı sertifikaların başarıyla uygulandığı bir durum bırakılmaz.
- Geçerli zamanda token verebilen sertifikalar arasından uygun olanı token veren sertifika olarak seçilir.

## İlk ve elle eşitleme

İstemci yöneticisi oluşturulurken ilk eşitleme genellikle best-effort yaklaşımıyla yapılır. Başarısız olsa bile yönetici oluşturulur ve son ayrıntılı hata saklanır. Uygulamanın başlamasını engellemek gerekiyorsa ilgili kütüphanenin anında eşitleme API'sini çağırıp hatayı çağırana iletin.

Otomatik eşitleme kullanmayan ortamlar interval ayarını kapatıp gerektiğinde doğrudan eşitleme yapabilir. Otomatik eşitleme kullanılıyorsa uygulama kapanırken yöneticiyi kapatın veya durdurun.

## Ağ ve hatalar

Bağlantı ve toplam istek zaman aşımlarını üretim ortamına göre ayarlayın. Yönlendirme ilkesi çalışma zamanına göre değiştiğinden kütüphane belgesine bakın. 2xx olmayan CMS yanıtları mevcut istemcilerde HTTP durumuna karşılık gelen `DAT_CMS_*` hataları olarak sınıflandırılır; sunucu JSON'undaki ayrıntılı hata kodu olduğu gibi korunmaz.

Geçici bir depo arızasında sunucu, son başarılı sertifika anlık görüntüsünü sunabilir. Henüz başarılı bir anlık görüntü yoksa `DAT_STORE_UNAVAILABLE` yanıtı verilir.

## Servis belgesi

Dağıtım, veritabanı, erişim tokenları ve çalıştırma yapılandırması [DAT CMS servis kılavuzunda](../svc/docker-saro-lab-dat-cms) anlatılır.

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
