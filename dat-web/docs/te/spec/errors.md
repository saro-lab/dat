# లోప కోడ్‌లు

DAT అమలులు మనుషులు చదవగల సందేశాలతో పాటు స్థిరమైన లోప కోడ్‌లను అందిస్తాయి. ప్రోగ్రామ్‌లు సందేశ స్ట్రింగ్‌లను పోల్చకుండా, కోడ్ మరియు పునఃప్రయత్న వర్గీకరణ ఆధారంగా చర్యను నిర్ణయించాలి.

## చదివే విధానం

```text
DAT_<ప్రాంతం>_<కారణం>
```

| ఉపసర్గ | ప్రాంతం |
| --- | --- |
| `DAT_TOKEN_` | DAT స్ట్రింగ్ మరియు గడువు |
| `DAT_CERT_` | సర్టిఫికేట్ స్ట్రింగ్ మరియు స్థితి |
| `DAT_SIG_` | సంతకం మరియు ధృవీకరణ |
| `DAT_CRYPTO_` | గుప్తీకరణ మరియు డీక్రిప్షన్ |
| `DAT_KEY_` | కీ రూపం మరియు అనుమతులు |
| `DAT_MANAGER_` | సర్టిఫికేట్ మేనేజర్ |
| `DAT_CONFIG_` | కాల్ ఆర్గ్యుమెంట్‌లు మరియు సెట్టింగ్‌లు |
| `DAT_INTERNAL_` | రన్‌టైమ్ అంతర్గత సామర్థ్యాలు |
| `DAT_CMS_` | CMS క్లయింట్ సమకాలీకరణ |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS సర్వర్ |

ప్రతి ప్రాంతంలో ఇతర కోడ్‌గా వర్గీకరించలేని లోపాలకు మాత్రమే `_UNKNOWN`ను ఉపయోగించాలి. ప్రాంతం వేరైనా ఒకే కారణానికి ఒకే పేరు ఉపయోగించాలి.

## పునఃప్రయత్న వర్గీకరణ

| వర్గం | అర్థం | నిర్వహణ |
| --- | --- | --- |
| తాత్కాలికం | బాహ్య స్థితి కోలుకుంటే విజయవంతం కావచ్చు | backoff తరువాత పరిమితంగా పునఃప్రయత్నించాలి |
| స్థితి | సర్టిఫికేట్ సమకాలీకరణ లేదా సమయం మారితే విజయవంతం కావచ్చు | అవసరమైన స్థితిని నవీకరించిన తరువాత పునఃప్రయత్నించాలి |
| శాశ్వతం | అదే ఇన్‌పుట్‌తో మళ్లీ ప్రయత్నించినా విఫలమవుతుంది | ఇన్‌పుట్, సెట్టింగ్ లేదా కోడ్‌ను సరిచేయాలి |

## టోకెన్ మరియు సర్టిఫికేట్

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DATలోని ఫీల్డ్‌ల సంఖ్య, సంఖ్యా రూపం లేదా Base64Url రూపం స్పెసిఫికేషన్‌కు అనుగుణంగా లేదు. ఇన్‌పుట్‌ను విస్మరించాలి.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT గడువు సమయం ప్రస్తుత సమయానికి సమానం లేదా గతంలో ఉంది. కొత్త DATను పొందాలి.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
సర్టిఫికేట్ స్ట్రింగ్ నిర్మాణం లేదా ఫీల్డ్ రూపం తప్పుగా ఉంది.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DATలోని `cid`కు సంబంధించిన సర్టిఫికేట్ లేదు. సర్టిఫికేట్ సమకాలీకరణ స్థితిని తనిఖీ చేయాలి.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
ఉపయోగించాల్సిన సర్టిఫికేట్ ఇంకా సేవకు చేరకపోయి ఉండవచ్చు. వెంటనే సమకాలీకరించి మళ్లీ నిర్ణయించాలి.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
సర్టిఫికేట్ ప్రారంభ సమయం ఇంకా రాలేదు. సిస్టమ్ సమయం మరియు సర్టిఫికేట్ విస్తరణ సమయాన్ని తనిఖీ చేయాలి.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
సర్టిఫికేట్ ధృవీకరణకు అందుబాటులో ఉండే వ్యవధి ముగిసింది.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
ఒకే దిగుమతి జాబితాలో ఒకే `cid` పునరావృతమైంది. మొత్తం దిగుమతిని తిరస్కరించాలి.
</ErrorCode>

## సంతకం, గుప్తీకరణ మరియు కీలు

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
సంతకం విషయంతో సరిపోలడం లేదు. ఇది మార్చబడిన DAT కావచ్చు లేదా వేరే కీతో సంతకం చేసిన DAT కావచ్చు.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM ప్రామాణీకరణ tag సరిపోలడం లేదు. ciphertext మార్పు లేదా సర్టిఫికేట్ అసమతుల్యతను తనిఖీ చేయాలి.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
కీ పొడవు, రూపం లేదా అల్గోరిథం కలయిక సరైనది కాదు.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
ధృవీకరణ-మాత్రమే సర్టిఫికేట్‌తో DATను జారీ చేయడానికి ప్రయత్నించారు. జారీ సేవకు పూర్తి సర్టిఫికేట్ అవసరం.
</ErrorCode>

`DAT_SIG_MISMATCH` మరియు `DAT_CRYPTO_TAG_MISMATCH` లోపాలను పబ్లిక్ భద్రతా ఘటన API అనుమానాస్పదంగా వర్గీకరిస్తుంది. ఒక తప్పు ఇన్‌పుట్ సేవా వైఫల్యం కాదు, కానీ అది పునరావృతమైతే భద్రతా పరిశీలనకు లోబరచాలి.

## మేనేజర్ మరియు సెట్టింగ్‌లు

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
మేనేజర్‌లో సర్టిఫికేట్‌లు లేవు. సర్టిఫికేట్‌లను పొందాలి లేదా CMS సమకాలీకరణను పూర్తి చేయాలి.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
సర్టిఫికేట్‌లు ఉన్నాయి, కానీ ప్రస్తుతం జారీ చేయగల పూర్తి సర్టిఫికేట్ లేదు. కారణాల గొలుసులో గడువు, ప్రారంభ సమయం లేదా verify-only స్థితిని తనిఖీ చేయాలి.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
కాల్ ఆర్గ్యుమెంట్ లేదా సెట్టింగ్ విలువ అనుమతించిన పరిధికి వెలుపల ఉంది.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
ప్రస్తుత ప్లాట్‌ఫారమ్‌లో అవసరమైన క్రిప్టోగ్రఫీ లేదా నెట్‌వర్క్ సామర్థ్యం లేదు.
</ErrorCode>

## CMS క్లయింట్

| కోడ్ | అర్థం | సాధారణ నిర్వహణ |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI రూపం తప్పు | సెట్టింగ్‌ను సరిచేయాలి |
| `DAT_CMS_UNAUTHORIZED` | ప్రామాణీకరణ విఫలమైంది | టోకెన్‌ను సరిచేయాలి |
| `DAT_CMS_FORBIDDEN` | పాత్రకు అనుమతి లేదు | టోకెన్ పాత్రను తనిఖీ చేయాలి |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | మార్గం లేదు లేదా భిన్నంగా ఉంది | CMS చిరునామా మరియు మార్గాన్ని తనిఖీ చేయాలి |
| `DAT_CMS_NETWORK` | కనెక్షన్ లేదా ప్రసారం విఫలమైంది | నెట్‌వర్క్ తనిఖీ తరువాత backoff చేయాలి |
| `DAT_CMS_TIMEOUT` | సమయ పరిమితి ముగిసింది | నెట్‌వర్క్ మరియు timeoutను సర్దుబాటు చేయాలి |
| `DAT_CMS_SERVER_ERROR` | CMS సర్వర్ లోపం | సర్వర్ స్థితి తనిఖీ తరువాత backoff చేయాలి |
| `DAT_CMS_RESPONSE_INVALID` | విజయవంతమైన ప్రతిస్పందన రూపం తప్పు | సర్వర్-క్లయింట్ ఒప్పందాన్ని తనిఖీ చేయాలి |
| `DAT_CMS_VERSION_RESET` | సర్వర్ వెర్షన్ వెనక్కి వెళ్లింది | CMS డేటా మరియు విస్తరణ స్థితిని తనిఖీ చేయాలి |
| `DAT_CMS_IMPORT_FAILED` | అందుకున్న సర్టిఫికేట్‌లను వర్తింపజేయడం విఫలమైంది | కారణాల గొలుసును తనిఖీ చేయాలి |
| `DAT_CMS_STOPPED` | ఆపివేసిన మేనేజర్‌ను ఉపయోగించారు | కొత్త మేనేజర్‌ను సృష్టించాలి లేదా కాల్ క్రమాన్ని సరిచేయాలి |

ప్రారంభ సమకాలీకరణను best-effortగా నిర్వహించే లైబ్రరీలు లోపాన్ని చివరి లోపం ఫీల్డ్‌లో ఉంచుతాయి. ప్రారంభం విఫలం కావాలంటే, లోపాన్ని నేరుగా తిరిగి ఇచ్చే లేదా విసిరే తక్షణ సమకాలీకరణ APIని ఉపయోగించాలి.

## CMS సర్వర్

| కోడ్ | HTTP | అర్థం |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | టోకెన్ లేదు లేదా చెల్లదు |
| `DAT_AUTH_FORBIDDEN` | 403 | టోకెన్ పాత్ర అభ్యర్థన అనుమతితో సరిపోలదు |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | మద్దతు లేని అల్గోరిథం పేరు |
| `DAT_REQ_NOT_FOUND` | 404·405 | మార్గం లేదా పద్ధతి సరిపోలడం లేదు |
| `DAT_REQ_TOO_LARGE` | 413 | అభ్యర్థన body పరిమితి మించడానికై కేటాయించిన కోడ్ |
| `DAT_STORE_UNAVAILABLE` | 503 | నిల్వను తాత్కాలికంగా ఉపయోగించలేరు |
| `DAT_STORE_UNKNOWN` | 500 | నిల్వను ప్రాసెస్ చేస్తున్నప్పుడు వర్గీకరించని లోపం |

ప్రస్తుత క్లయింట్ 2xx కాని JSONలోని సర్వర్ కోడ్‌ను యథాతథంగా బహిర్గతం చేయకుండా, HTTP స్థితిని `DAT_CMS_*` కోడ్‌గా మారుస్తుంది. సర్వర్ లాగ్ మరియు క్లయింట్ లోప కోడ్ భిన్నంగా ఉండవచ్చు.

## భాషల వారీగా తనిఖీ చేసే విధానం

| పరిసరం | లోప కోడ్ | పునఃప్రయత్న వర్గీకరణ |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

అంతర్గత కారణాలు ఉన్న లోపాలను ప్రతి భాషలోని exception chain లేదా కారణాన్ని పొందే APIతో తనిఖీ చేయాలి.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
