# Lambobin kuskure

Aiwatarwar DAT tana ba da tsayayyun lambobin kuskure dabam da saƙonnin da mutum zai karanta. Shirye-shirye suna yanke shawara da lamba da nau'in sake gwadawa, ba ta kwatanta kirtanin saƙo ba.

## Yadda ake karantawa

```text
DAT_<yanki>_<dalili>
```

| Prefix | Yanki |
| --- | --- |
| `DAT_TOKEN_` | Kirtanin DAT da karewa |
| `DAT_CERT_` | Kirtani da yanayin takardar shaida |
| `DAT_SIG_` | Sa hannu da tabbatarwa |
| `DAT_CRYPTO_` | Ƙoyewa da buɗewa |
| `DAT_KEY_` | Tsarin maɓalli da izini |
| `DAT_MANAGER_` | Manajan takardun shaida |
| `DAT_CONFIG_` | Call arguments da saituna |
| `DAT_INTERNAL_` | Ayyukan ciki na runtime |
| `DAT_CMS_` | Daidaitawar abokin cinikin CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Sabar CMS |

Ana amfani da `_UNKNOWN` kawai ga kuskuren da ba za a iya rarrabawa da wata lamba a yankin ba. Dalili iri ɗaya yana amfani da suna iri ɗaya ko da yankin ya bambanta.

## Nau'in sake gwadawa

| Nau'i | Ma'ana | Mataki |
| --- | --- | --- |
| Na wucin gadi | Zai iya yin nasara idan yanayin waje ya gyaru | Sake gwadawa kaɗan bayan backoff |
| Yanayi | Zai iya yin nasara idan daidaitawar takardu ko lokaci ya canza | Sabunta yanayin da ake buƙata sannan sake gwadawa |
| Na dindindin | Zai sake gaza da shigarwa iri ɗaya | Gyara shigarwa, saiti ko code |

## Token da takardar shaida

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Adadin filaye, lamba ko wakilcin Base64Url na DAT bai dace da ƙa'ida ba. Jefar da shigarwar.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Lokacin karewar DAT ya yi daidai da lokacin yanzu ko ya wuce. Ana buƙatar sabon DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Tsari ko wakilcin filayen kirtanin takardar shaida ba daidai ba ne.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Babu takardar da ta dace da `cid` na DAT. Duba yanayin daidaita takardun shaida.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Mai yiwuwa takardar da za a yi amfani da ita ba ta iso aikin ba tukuna. Daidaita nan take sannan sake tantancewa.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Lokacin farawar takardar bai zo ba tukuna. Duba lokacin tsarin da lokacin rarraba takardar.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Lokacin da takardar za ta iya tabbatarwa ya ƙare.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
`cid` iri ɗaya ya maimaitu a jerin import guda. An ƙi dukan import.
</ErrorCode>

## Sa hannu, ɓoyewa da maɓallai

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Sa hannu bai dace da jiki ba. An canza DAT ko an sa masa hannu da wani maɓalli.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM authentication tag bai dace ba. Duba ko an canza ciphertext ko takardar shaida ba ta dace ba.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Tsawo, tsari ko haɗin algorithm na maɓalli ba daidai ba ne.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
An yi ƙoƙarin bayar da DAT da takardar tabbatarwa kaɗai. Aikin bayarwa yana buƙatar cikakkiyar takarda.
</ErrorCode>

`DAT_SIG_MISMATCH` da `DAT_CRYPTO_TAG_MISMATCH` kurakurai ne da public security event API ke rarrabawa a matsayin gaskiya. Shigarwa mara kyau guda ba matsalar aiki ba ce, amma idan ta maimaitu a kula da ita a matsayin abin tsaro.

## Manaja da saituna

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Babu takardar shaida a manaja. Import takardu ko kammala daidaitawar CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Akwai takardu, amma babu cikakkiyar takarda da za ta iya bayarwa yanzu. Duba karewa, lokacin farawa ko verify-only a cikin cause chain.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Call argument ko ƙimar saiti ta fita daga zangon da aka yarda.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Babu aikin crypto ko network da ake buƙata a platform na yanzu.
</ErrorCode>

## Abokin cinikin CMS

| Lamba | Ma'ana | Matakin gama gari |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Tsarin CMS URI ba daidai ba | Gyara saiti |
| `DAT_CMS_UNAUTHORIZED` | Tantancewa ta gaza | Gyara token |
| `DAT_CMS_FORBIDDEN` | Matsayi ba shi da izini | Duba matsayin token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Hanya ba ta nan ko ta bambanta | Duba adireshi da hanyar CMS |
| `DAT_CMS_NETWORK` | Haɗi ko isarwa ta gaza | Duba network sannan backoff |
| `DAT_CMS_TIMEOUT` | Lokacin jira ya ƙare | Daidaita network da timeout |
| `DAT_CMS_SERVER_ERROR` | Kuskuren sabar CMS | Duba sabar sannan backoff |
| `DAT_CMS_RESPONSE_INVALID` | Tsarin amsa mai nasara ba daidai ba | Duba yarjejeniyar sabar da abokin ciniki |
| `DAT_CMS_VERSION_RESET` | Sigar sabar ta koma baya | Duba bayanan CMS da deployment |
| `DAT_CMS_IMPORT_FAILED` | An kasa amfani da takardun da aka karɓa | Duba cause chain |
| `DAT_CMS_STOPPED` | An yi amfani da manajan da aka rufe | Ƙirƙiri sabon manaja ko gyara tsarin kira |

Dakunan karatu masu best-effort initial sync suna adana kuskure a last error field. Idan farawa dole ya gaza, yi amfani da immediate sync API da ke mayarwa ko jefa kuskure kai tsaye.

## Sabar CMS

| Lamba | HTTP | Ma'ana |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token babu ko ba daidai ba |
| `DAT_AUTH_FORBIDDEN` | 403 | Matsayin token bai dace da izinin buƙata ba |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Sunan algorithm marar goyon baya |
| `DAT_REQ_NOT_FOUND` | 404·405 | Hanya ko method bai dace ba |
| `DAT_REQ_TOO_LARGE` | 413 | Lambar da aka keɓe don wuce iyakar request body |
| `DAT_STORE_UNAVAILABLE` | 503 | Ba a samun ma'ajiya na wucin gadi |
| `DAT_STORE_UNKNOWN` | 500 | Kuskure marar rarrabuwa yayin sarrafa ma'ajiya |

Abokan ciniki na yanzu ba sa nuna lambar sabar daga JSON mara 2xx kai tsaye; suna juya matsayin HTTP zuwa lambar `DAT_CMS_*`. Log na sabar da lambar kuskuren abokin ciniki na iya bambanta.

## Dubawa bisa harshe

| Muhalli | Lambar kuskure | Nau'in sake gwadawa |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Ana duba kuskuren da ke da dalili na ƙasa ta exception chain ko cause lookup API na kowane harshe.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
