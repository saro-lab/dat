# Misimbo ya makosa

Utekelezaji wa DAT hutoa misimbo thabiti ya makosa kando na ujumbe unaosomeka na binadamu. Programu huamua hatua kwa msimbo na aina ya kujaribu tena, si kwa kulinganisha mifuatano ya ujumbe.

## Jinsi ya kuisoma

```text
DAT_<eneo>_<sababu>
```

| Kiambishi awali | Eneo |
| --- | --- |
| `DAT_TOKEN_` | Mfuatano wa DAT na kuisha |
| `DAT_CERT_` | Mfuatano na hali ya cheti |
| `DAT_SIG_` | Sahihi na uthibitishaji |
| `DAT_CRYPTO_` | Usimbaji fiche na usimbuaji fiche |
| `DAT_KEY_` | Umbizo na ruhusa za ufunguo |
| `DAT_MANAGER_` | Kidhibiti cha vyeti |
| `DAT_CONFIG_` | Hoja za mwito na mipangilio |
| `DAT_INTERNAL_` | Vipengele vya ndani vya runtime |
| `DAT_CMS_` | Usawazishaji wa mteja wa CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Seva ya CMS |

`_UNKNOWN` hutumiwa tu kwa kosa lisiloweza kuainishwa kwa msimbo mwingine katika eneo hilo. Sababu ileile hutumia jina lilelile hata katika maeneo tofauti.

## Aina za kujaribu tena

| Aina | Maana | Hatua |
| --- | --- | --- |
| Muda mfupi | Inaweza kufaulu hali ya nje ikirejea | Jaribu tena kwa kiwango kidogo baada ya backoff |
| Hali | Inaweza kufaulu usawazishaji wa vyeti au wakati ukibadilika | Sasisha hali inayohitajika kisha ujaribu tena |
| Kudumu | Itashindwa tena kwa ingizo lilelile | Rekebisha ingizo, mpangilio au msimbo |

## Tokeni na vyeti

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Idadi ya sehemu, namba au uwakilishi wa Base64Url wa DAT hautii kiwango. Tupa ingizo.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Muda wa kuisha wa DAT ni sawa na wakati wa sasa au umepita. DAT mpya inahitajika.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Muundo au uwakilishi wa sehemu za mfuatano wa cheti si sahihi.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Hakuna cheti kinacholingana na `cid` ya DAT. Kagua hali ya usawazishaji wa vyeti.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Huenda cheti kinachohitajika bado hakijafika kwenye huduma. Sawazisha mara moja kisha tathmini tena.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Wakati wa kuanza wa cheti bado haujafika. Kagua saa ya mfumo na wakati wa usambazaji wa cheti.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Kipindi cha uthibitishaji cha cheti kimekwisha.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
`cid` ileile imerudiwa katika orodha moja ya kuingiza. Uingizaji wote umekataliwa.
</ErrorCode>

## Sahihi, usimbaji fiche na funguo

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Sahihi hailingani na mwili. DAT imebadilishwa au imesainiwa kwa ufunguo mwingine.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Lebo ya uthibitishaji ya AES-GCM hailingani. Kagua ubadilishaji wa maandishi yaliyosimbwa au kutolingana kwa cheti.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Urefu, umbizo au mchanganyiko wa algoriti za ufunguo si sahihi.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Jaribio la kutoa DAT lilitumia cheti cha uthibitishaji pekee. Huduma ya utoaji inahitaji cheti kamili.
</ErrorCode>

`DAT_SIG_MISMATCH` na `DAT_CRYPTO_TAG_MISMATCH` ni makosa ambayo API ya umma ya matukio ya usalama huainisha kuwa kweli. Ingizo moja baya si hitilafu ya huduma, lakini likijirudia linapaswa kufuatiliwa kama tukio la usalama.

## Kidhibiti na usanidi

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Kidhibiti hakina vyeti. Ingiza vyeti au kamilisha usawazishaji wa CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Vyeti vipo, lakini hakuna cheti kamili kinachoweza kutoa kwa sasa. Kagua kuisha, wakati wa kuanza au hali ya verify-only katika mnyororo wa sababu.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Hoja ya mwito au thamani ya mpangilio iko nje ya kiwango kinachoruhusiwa.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Jukwaa la sasa halina kipengele cha usimbaji fiche au mtandao kinachohitajika.
</ErrorCode>

## Mteja wa CMS

| Msimbo | Maana | Hatua ya kawaida |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Umbizo la CMS URI si sahihi | Rekebisha mpangilio |
| `DAT_CMS_UNAUTHORIZED` | Uthibitishaji umeshindwa | Rekebisha tokeni |
| `DAT_CMS_FORBIDDEN` | Jukumu halina ruhusa | Kagua jukumu la tokeni |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Njia haipo au ni tofauti | Kagua anwani na njia ya CMS |
| `DAT_CMS_NETWORK` | Muunganisho au usafirishaji umeshindwa | Kagua mtandao kisha tumia backoff |
| `DAT_CMS_TIMEOUT` | Muda wa kusubiri umekwisha | Rekebisha mtandao na muda wa kusubiri |
| `DAT_CMS_SERVER_ERROR` | Kosa la seva ya CMS | Kagua seva kisha tumia backoff |
| `DAT_CMS_RESPONSE_INVALID` | Umbizo la jibu lenye mafanikio si sahihi | Kagua mkataba wa seva na mteja |
| `DAT_CMS_VERSION_RESET` | Toleo la seva limerudi nyuma | Kagua data ya CMS na hali ya usambazaji |
| `DAT_CMS_IMPORT_FAILED` | Vyeti vilivyopokelewa havikutumika | Kagua mnyororo wa sababu |
| `DAT_CMS_STOPPED` | Kidhibiti kilichofungwa kimetumiwa | Unda kidhibiti kipya au rekebisha mpangilio wa miito |

Maktaba zenye usawazishaji wa kwanza wa best-effort huhifadhi kosa katika sehemu ya kosa la mwisho. Ikiwa kuanza kunapaswa kushindwa, tumia API ya usawazishaji wa mara moja inayorudisha au kurusha kosa moja kwa moja.

## Seva ya CMS

| Msimbo | HTTP | Maana |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Tokeni haipo au si sahihi |
| `DAT_AUTH_FORBIDDEN` | 403 | Jukumu la tokeni halilingani na ruhusa ya ombi |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Jina la algoriti halitumiki |
| `DAT_REQ_NOT_FOUND` | 404·405 | Njia au mbinu hailingani |
| `DAT_REQ_TOO_LARGE` | 413 | Msimbo uliowekwa kwa kuvuka kikomo cha mwili wa ombi |
| `DAT_STORE_UNAVAILABLE` | 503 | Hifadhi haipatikani kwa muda |
| `DAT_STORE_UNKNOWN` | 500 | Kosa lisiloainishwa wakati wa kushughulikia hifadhi |

Wateja wa sasa hawafichui moja kwa moja msimbo wa seva katika JSON isiyo 2xx; hubadilisha hali ya HTTP kuwa msimbo wa `DAT_CMS_*`. Kumbukumbu za seva na msimbo wa kosa la mteja zinaweza kutofautiana.

## Kukagua kwa lugha

| Mazingira | Msimbo wa kosa | Aina ya kujaribu tena |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Makosa yenye sababu ya chini hukaguliwa kupitia mnyororo wa vighairi au API ya kupata sababu ya kila lugha.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
