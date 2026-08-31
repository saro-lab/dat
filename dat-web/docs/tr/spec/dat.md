# DAT

DAT, noktalarla (`.`) ayrılan bir ASCII dizgesidir. Alanlar belirlenmiş sırada birer kez yer alır ve imza, önceki alanların iletildiği biçimde kaldığını doğrular.

<WireFormat
  hint="Alan sırası ve ayırıcılar standardın parçasıdır."
  :segments="[
    {name: 'expire', type: 'uint64 (ondalık)', kind: 'meta', note: 'Sona erme Unix time değeri'},
    {name: 'cid', type: 'uint64 (onaltılık)', kind: 'meta', note: 'Sertifika kimliği'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Açık baytlar'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Şifreli baytlar'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Önceki dört alanın imzası'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Alanlar

| Alan | Gösterim | Anlam |
| --- | --- | --- |
| `expire` | İşaretsiz tamsayının ondalık gösterimi | DAT'nin sona erdiği Unix time |
| `cid` | İşaretsiz tamsayının küçük harfli onaltılık gösterimi | Doğrulamada kullanılacak sertifika kimliği |
| `plain` | Dolgusuz Base64Url | Şifrelenmeyen baytlar |
| `secure` | Dolgusuz Base64Url | Sertifikanın şifreleme algoritmasıyla korunan baytlar |
| `signature` | Dolgusuz Base64Url | `expire.cid.plain.secure` dizgesinin özgün ASCII baytlarına ait imza |

`plain` imza kapsamında olduğundan değiştirilemez, ancak herkes tarafından çözülebilir. Gizli bilgileri, kişisel bilgileri ve yetkilendirme kararında doğrudan kullanılacak değerleri `secure` alanına koyun. Boş bir `secure` alanı da geçerlidir.

## Standart gösterim

- DAT'nin tamamı ASCII olmalıdır.
- Sayılar işaret, boşluk, önek veya gereksiz baştaki `0` olmadan yazılır. Yalnızca `0` değeri `0` olarak yazılır.
- Base64Url, URL-safe alfabeyi kullanır; `=` dolgusu ve boşluğa izin verilmez.
- Aynı baytları farklı dizgelerle gösteren standart dışı Base64Url reddedilir.
- Alan sayısı veya sırası farklıysa dizge DAT değildir.

Bu kurallar, farklı uygulamaların farklı dizgeleri aynı DAT olarak kabul etmesini önler.

## Token verme

1. O anda token verebilen sertifikayı seçin.
2. Geçerli zamana sertifikanın TTL'ini ekleyerek `expire` değerini oluşturun.
3. `plain` verisini Base64Url olarak kodlayın.
4. `secure` verisini sertifikanın şifreleme algoritmasıyla şifreleyin.
5. Önceki alanları noktalarla birleştiren ASCII baytlarını imzalayın.

Token verme yalnızca sertifikanın `start <= now <= start + duration` aralığında yapılabilir.

## Doğrulama

1. DAT'yi standart gösterim kurallarına göre ayrıştırın.
2. `expire > now` olduğunu denetleyin. `expire == now` ise tokenın süresi dolmuştur.
3. `cid` değerine karşılık gelen sertifikayı bulup doğrulanabilir durumda olduğunu denetleyin.
4. Özgün `expire.cid.plain.secure` baytlarının imzasını doğrulayın.
5. `secure` verisini doğrulayıp şifresini çözün ve `plain` ile birlikte döndürün.

İmzayı doğrulamayan ayrıştırma API'leri yalnızca gözlem ve tanılama için kullanılır. Bu sonuçlarla kimlik doğrulamayın veya yetki vermeyin.

## Standardın dışındaki sorumluluklar

DAT; kullanıcı deposunu, oturum açma yöntemini, yetki modelini, token aktarım başlığını veya iptal listesini belirlemez. Doğrulanmış payload'un hangi isteklere izin vereceğine uygulama karar verir.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
