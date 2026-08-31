# त्रुटी कोड

DAT अंमलबजावण्या मानवाला वाचता येणाऱ्या संदेशासोबत स्थिर त्रुटी कोड देतात. प्रोग्रॅमने संदेशाची स्ट्रिंग तुलना न करता कोड आणि retry वर्गीकरणानुसार वर्तन ठरवावे.

## कसे वाचावे

```text
DAT_<क्षेत्र>_<कारण>
```

| उपसर्ग | क्षेत्र |
| --- | --- |
| `DAT_TOKEN_` | DAT स्ट्रिंग आणि कालबाह्यता |
| `DAT_CERT_` | प्रमाणपत्र स्ट्रिंग आणि स्थिती |
| `DAT_SIG_` | सही आणि पडताळणी |
| `DAT_CRYPTO_` | कूटबद्धीकरण आणि decryption |
| `DAT_KEY_` | की स्वरूप आणि अधिकार |
| `DAT_MANAGER_` | प्रमाणपत्र मॅनेजर |
| `DAT_CONFIG_` | कॉल arguments आणि सेटिंग्ज |
| `DAT_INTERNAL_` | runtime अंतर्गत कार्ये |
| `DAT_CMS_` | CMS क्लायंट समकालन |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS सर्व्हर |

`_UNKNOWN` प्रत्येक क्षेत्रात इतर कोडमध्ये वर्गीकृत न होणाऱ्या त्रुटीसाठीच वापरला जातो. क्षेत्र वेगळे असले तरी समान कारणाला समान नाव वापरले जाते.

## Retry वर्गीकरण

| वर्ग | अर्थ | हाताळणी |
| --- | --- | --- |
| तात्पुरते | बाह्य स्थिती पुनःस्थापित झाल्यास यशस्वी होऊ शकते | backoff नंतर मर्यादित retry |
| स्थिती | प्रमाणपत्र समकालन किंवा वेळ बदलल्यास यशस्वी होऊ शकते | आवश्यक स्थिती अद्यतन करून retry |
| कायमचे | समान input पुन्हा दिल्यासही अपयश | input, settings किंवा code दुरुस्त करा |

## टोकन आणि प्रमाणपत्र

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT च्या फील्ड्सची संख्या, आकडे किंवा Base64Url सादरीकरण तपशिलापेक्षा वेगळे आहे. input फेकून द्या.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT ची कालबाह्यता वेळ सध्याच्या वेळेइतकी किंवा त्यापेक्षा जुनी आहे. नवीन DAT घ्यावा लागेल.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
प्रमाणपत्र स्ट्रिंगची रचना किंवा फील्ड सादरीकरण चुकीचे आहे.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT च्या `cid` शी संबंधित प्रमाणपत्र नाही. प्रमाणपत्र समकालन स्थिती तपासा.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
वापरावयाचे प्रमाणपत्र अजून सेवेत पोहोचले नसण्याची शक्यता आहे. लगेच समकालन करून पुन्हा ठरवा.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
प्रमाणपत्राची सुरुवातीची वेळ अजून आलेली नाही. सिस्टम क्लॉक आणि प्रमाणपत्र वितरणाची वेळ तपासा.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
प्रमाणपत्राचा पडताळणीयोग्य कालावधी संपला आहे.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
एका import सूचीत समान `cid` पुन्हा आला. संपूर्ण import नाकारला जातो.
</ErrorCode>

## सही, कूटबद्धीकरण आणि की

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
सही मजकुराशी जुळत नाही. हा बदललेला DAT आहे किंवा त्यावर वेगळ्या कीने सही झाली आहे.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM authentication tag जुळत नाही. सांकेतिक मजकूर बदलला आहे किंवा प्रमाणपत्र जुळत नाही हे तपासा.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
कीची लांबी, स्वरूप किंवा अल्गोरिदम संयोजन योग्य नाही.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
केवळ-पडताळणी प्रमाणपत्राने DAT जारी करण्याचा प्रयत्न झाला. जारी सेवेला पूर्ण प्रमाणपत्र लागते.
</ErrorCode>

`DAT_SIG_MISMATCH` आणि `DAT_CRYPTO_TAG_MISMATCH` ह्या सार्वजनिक security-event API ने true ठरवलेल्या त्रुटी आहेत. एक चुकीचा input हा सेवा बिघाड नाही, पण पुनरावृत्ती झाल्यास सुरक्षा निरीक्षणाचा विषय माना.

## मॅनेजर आणि सेटिंग्ज

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
मॅनेजरमध्ये प्रमाणपत्र नाही. प्रमाणपत्र import करा किंवा CMS समकालन पूर्ण करा.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
प्रमाणपत्रे आहेत, पण सध्या जारी करता येईल असे पूर्ण प्रमाणपत्र नाही. कारणसाखळीत कालबाह्यता, सुरुवात वेळ किंवा verify-only असणे तपासा.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
कॉल argument किंवा setting मूल्य मान्य श्रेणीबाहेर आहे.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
सध्याच्या platform वर आवश्यक crypto किंवा network कार्य उपलब्ध नाही.
</ErrorCode>

## CMS क्लायंट

| कोड | अर्थ | सामान्य हाताळणी |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI स्वरूप त्रुटी | सेटिंग दुरुस्त करा |
| `DAT_CMS_UNAUTHORIZED` | प्रमाणीकरण अपयशी | टोकन दुरुस्त करा |
| `DAT_CMS_FORBIDDEN` | भूमिकेला अधिकार नाही | टोकन भूमिका तपासा |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | मार्ग नाही किंवा वेगळा आहे | CMS पत्ता आणि मार्ग तपासा |
| `DAT_CMS_NETWORK` | जोडणी किंवा प्रेषण अपयशी | नेटवर्क तपासून backoff |
| `DAT_CMS_TIMEOUT` | मुदत संपली | नेटवर्क आणि timeout समायोजित करा |
| `DAT_CMS_SERVER_ERROR` | CMS सर्व्हर त्रुटी | सर्व्हर स्थिती तपासून backoff |
| `DAT_CMS_RESPONSE_INVALID` | यशस्वी प्रतिसादाचे स्वरूप चुकीचे | सर्व्हर-क्लायंट करार तपासा |
| `DAT_CMS_VERSION_RESET` | सर्व्हर आवृत्ती मागे गेली | CMS डेटा आणि deployment स्थिती तपासा |
| `DAT_CMS_IMPORT_FAILED` | मिळालेली प्रमाणपत्रे लागू करणे अपयशी | कारणसाखळी तपासा |
| `DAT_CMS_STOPPED` | बंद मॅनेजरचा वापर | नवीन मॅनेजर बनवा किंवा कॉल क्रम सुधारा |

ज्या लायब्ररीचे प्रारंभिक समकालन best-effort आहे त्या त्रुटी शेवटच्या त्रुटी फील्डमध्ये जपतात. सुरुवात अपयशी हवी असल्यास त्रुटी थेट return किंवा throw करणारा तात्काळ समकालन API वापरा.

## CMS सर्व्हर

| कोड | HTTP | अर्थ |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | टोकन नाही किंवा योग्य नाही |
| `DAT_AUTH_FORBIDDEN` | 403 | टोकन भूमिका विनंतीच्या अधिकाराशी जुळत नाही |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | असमर्थित अल्गोरिदम नाव |
| `DAT_REQ_NOT_FOUND` | 404·405 | मार्ग किंवा method जुळत नाही |
| `DAT_REQ_TOO_LARGE` | 413 | विनंती body मर्यादा ओलांडण्यासाठी राखीव कोड |
| `DAT_STORE_UNAVAILABLE` | 503 | store तात्पुरते उपलब्ध नाही |
| `DAT_STORE_UNKNOWN` | 500 | store प्रक्रियेत अवर्गीकृत त्रुटी |

सध्याचा क्लायंट non-2xx JSON मधील सर्व्हर कोड थेट उघड करत नाही; तो HTTP स्थितीचे `DAT_CMS_*` कोडमध्ये रूपांतर करतो. त्यामुळे सर्व्हर लॉग आणि क्लायंट त्रुटी कोड वेगळे असू शकतात.

## भाषानुसार तपासण्याची पद्धत

| वातावरण | त्रुटी कोड | retry वर्गीकरण |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

अंतर्निहित कारण असलेल्या त्रुटी प्रत्येक भाषेच्या exception chain किंवा cause lookup API ने तपासा.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
