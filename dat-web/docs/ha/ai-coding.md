# Vibe coding da AI

Za ka iya amfani da DAT cikin sauƙi ta hanyar gaya wa AI aikin ka na yanzu da halayen da kake so. A misalan da ke ƙasa, canza adireshi da sunayen environment variables kawai don su dace da aikin ka.

## Aiwatarwa mai sauƙi

Yi amfani da wannan buƙata idan kana son gina tsarin asali da sauri.

```text
Ina amfani da Kotlin da Spring Boot.
Ƙara tantancewar DAT zuwa Spring Security.

Da farko karanta https://dat.saro.me/llms.txt sannan ka duba
ƙa'idar DAT da yadda ake amfani da dakin karatu na hukuma.

Tabbatar da Bearer token a Authorization header,
kuma idan tantancewa ta yi nasara saka bayanan mai amfani a SecurityContext.

Wannan sabar ba ta bayar da DAT; tana tabbatarwa ne kawai.
Dole ta karɓi takardun tabbatarwa kaɗai daga DAT CMS.

Da farko nemo adireshin sabar CMS da saitunan token a cikin aikin,
idan ba ka same su ba ka tambaye ni. Kada ka ƙirƙiri ƙima da kanka.

Yi amfani da dakin karatu na Java/Kotlin DAT na hukuma,
kuma ka aiwatar daidai da tsarin aiki da salon coding na yanzu.
```

## Cikakkiyar aiwatarwa

Yi amfani da wannan buƙata idan kana son ayyana hanyar tantancewa da sarrafa kuskure daidai.

```text
Wannan aiki yana amfani da Kotlin, Spring Boot da Spring Security.
Duba saitunan tsaro na yanzu sannan ka ƙara tantancewar DAT.

Da farko karanta https://dat.saro.me/llms.txt sannan ka duba
ƙa'idar DAT, hanyar daidaita takardun shaida da API na dakin karatu na hukuma.

Sharuɗɗan aiwatarwa su ne:

- Karanta DAT daga Authorization: Bearer header.
- Idan babu DAT, ci gaba a matsayin buƙatar da ba a tantance ba.
- Idan DAT ba daidai ba ne ko ya ƙare, amsa da 401.
- Idan tabbatarwa ta yi nasara, saka ID da izinin mai amfani a SecurityContext.
- Karanta daga plain ƙimomin da babu matsala a bayyana kawai.
- Karanta ID da izinin mai amfani daga bayanan secure da aka tabbatar.
- Saboda wannan sabar tabbatarwa kaɗai take yi, yi amfani da verify-only certificates na DAT CMS.
- Karɓi adireshin CMS da token ta environment variables.
- Idan daidaita takardun shaida ya gaza a farawa, hana manhajar farawa.
- Sabunta takardun kai tsaye yayin aiki kuma rufe manaja lokacin kashewa.
- Bambanta dalilin gazawa da lambar kuskuren DAT, ba saƙon kuskure ba.
- Kada ka rubuta DAT na asali, CMS token ko bayanan mutum a log.

Da farko duba saitunan Spring Security da tsarin masu amfani da izini na aikin.
Idan ba a san adireshin CMS, environment variable na token ko tsarin bayanan secure ba, tambaya kafin aiwatarwa.
Yi amfani da public API na dakin karatu na Java/Kotlin DAT na hukuma kawai.

Kafin canza code, bayyana a taƙaice hanyar tantancewa da fayilolin da za a canza.
```

## Wane misali zan zaɓa?

- Idan kana son fara da code mai aiki, yi amfani da **Aiwatarwa mai sauƙi**.
- Idan kana buƙatar hanyar tantancewa ta production, yi amfani da **Cikakkiyar aiwatarwa**.

Idan AI ta tambaya, fara da amsa adireshin CMS, sunan environment variable da ke ɗauke da token, da bayanan mai amfani da za a saka a `secure`.
