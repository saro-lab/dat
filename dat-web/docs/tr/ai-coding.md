# AI ile vibe coding

AI'ye mevcut projenizi ve istediğiniz davranışı anlatarak DAT'yi daha kolay uygulayabilirsiniz. Aşağıdaki örneklerde yalnızca adresi ve ortam değişkeni adlarını projenize uyarlayın.

## Basit uygulama

Temel yapıyı hızla oluşturmak istediğinizde bu istemi kullanın.

```text
Kotlin ve Spring Boot kullanıyorum.
Spring Security'ye DAT kimlik doğrulaması ekle.

Önce https://dat.saro.me/llms.txt adresini oku ve
DAT standardını ve resmî kütüphanenin kullanımını incele.

Authorization başlığındaki Bearer tokenı doğrula;
kimlik doğrulama başarılı olursa kullanıcı bilgilerini SecurityContext'e koy.

Bu sunucu DAT vermiyor, yalnızca doğruluyor.
DAT CMS'den yalnızca doğrulama sertifikalarını almalı.

Önce projede CMS sunucu adresini ve token ayarlarını ara;
bulamazsan bana sor. Rastgele değerler oluşturma.

Resmî Java/Kotlin DAT kütüphanesini kullan ve
uygulamayı mevcut proje yapısına ve kodlama stiline uygun yaz.
```

## Ayrıntılı uygulama

Kimlik doğrulama yöntemini ve hata işlemeyi kesin olarak belirtmek istediğinizde bu istemi kullanın.

```text
Bu proje Kotlin, Spring Boot ve Spring Security kullanıyor.
Mevcut güvenlik yapılandırmasını inceleyip DAT kimlik doğrulaması ekle.

Önce https://dat.saro.me/llms.txt adresini oku ve
DAT standardını, sertifika eşitleme yöntemini ve resmî kütüphane API'sini incele.

Uygulama koşulları şöyle:

- DAT'yi Authorization: Bearer başlığından oku.
- DAT yoksa anonim istek olarak devam et.
- DAT bozuksa veya süresi dolmuşsa 401 yanıtı ver.
- Doğrulama başarılıysa kullanıcı kimliğini ve yetkileri SecurityContext'e koy.
- plain alanından yalnızca açıklanması sakıncalı olmayan değerleri oku.
- Kullanıcı kimliğini ve yetkileri doğrulanmış secure verisinden oku.
- Bu sunucu yalnızca doğrulama yaptığı için DAT CMS'nin verify-only sertifikalarını kullan.
- CMS adresini ve tokenı ortam değişkenlerinden al.
- Başlangıçta sertifika eşitlemesi başarısız olursa uygulama da başlamasın.
- Çalışırken sertifikaları otomatik yenile ve kapanışta yöneticiyi kapat.
- Başarısızlık nedenini hata mesajıyla değil DAT hata koduyla ayırt et.
- Günlüklere ham DAT'yi, CMS tokenını veya kişisel bilgileri yazma.

Önce projenin Spring Security ayarlarını ve kullanıcı/yetki yapısını incele.
CMS adresi, token ortam değişkeni veya secure veri biçimi anlaşılmıyorsa uygulamadan önce sor.
Yalnızca resmî Java/Kotlin DAT kütüphanesinin herkese açık API'sini kullan.

Kodu değiştirmeden önce kimlik doğrulama akışını ve değiştirilecek dosyaları kısaca açıkla.
```

## Hangi örneği seçmeliyim?

- Önce çalışan bir kod görmek istiyorsanız **Basit uygulama** istemini kullanın.
- Üretim ortamında kullanılacak bir kimlik doğrulama akışı gerekiyorsa **Ayrıntılı uygulama** istemini kullanın.

AI soru sorarsa CMS adresini, tokenı taşıyacak ortam değişkeninin adını ve `secure` verisine konacak kullanıcı bilgilerini önce yanıtlayın.
