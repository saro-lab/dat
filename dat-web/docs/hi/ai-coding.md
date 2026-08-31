# AI वाइब कोडिंग

AI को अपने मौजूदा प्रोजेक्ट और अपेक्षित व्यवहार के बारे में बताकर DAT का एकीकरण आसान बनाएँ। नीचे के उदाहरणों में केवल URL और environment variable के नाम अपने प्रोजेक्ट के अनुसार बदलें।

## सरल कार्यान्वयन

बुनियादी संरचना जल्दी बनानी हो तो यह prompt उपयोग करें।

```text
मैं Kotlin और Spring Boot का उपयोग कर रहा हूँ।
Spring Security में DAT authentication जोड़ें।

पहले https://dat.saro.me/llms.txt पढ़ें और
DAT specification तथा official library documentation की समीक्षा करें।

Authorization header से Bearer token सत्यापित करें,
और authentication सफल होने पर user information को SecurityContext में रखें।

यह server DAT जारी नहीं करता; केवल उन्हें सत्यापित करता है।
इसे DAT CMS से verify-only certificates मिलने चाहिए।

पहले project में CMS server URL और token settings खोजें।
न मिलें तो मुझसे पूछें। मान न गढ़ें।

official Java/Kotlin DAT library का उपयोग करें,
और project की मौजूदा structure तथा coding style का पालन करें।
```

## विस्तृत कार्यान्वयन

authentication flow और error handling ठीक-ठीक निर्दिष्ट करनी हो तो यह prompt उपयोग करें।

```text
यह project Kotlin, Spring Boot और Spring Security का उपयोग करता है।
वर्तमान security configuration की समीक्षा करके DAT authentication जोड़ें।

पहले https://dat.saro.me/llms.txt पढ़ें और
DAT specification, certificate synchronization और official library API की समीक्षा करें।

निम्न आवश्यकताएँ लागू करें।

- Authorization: Bearer header से DAT पढ़ें।
- DAT न हो तो anonymous request के रूप में जारी रखें।
- DAT invalid या expired हो तो 401 उत्तर दें।
- सत्यापन सफल होने पर user ID और permissions को SecurityContext में रखें।
- plain से केवल ऐसे मान पढ़ें जिन्हें उजागर करना सुरक्षित है।
- सत्यापित secure data से user ID और permissions पढ़ें।
- यह server verify-only है, इसलिए DAT CMS के verify-only certificates उपयोग करें।
- CMS URL और token environment variables से पढ़ें।
- startup पर certificate synchronization विफल हो तो application startup भी विफल करें।
- चलते समय certificates स्वतः refresh करें और shutdown पर manager बंद करें।
- failure causes को error messages नहीं, DAT error codes से अलग करें।
- मूल DAT, CMS token या personal data log न करें।

पहले project का Spring Security configuration और user/permission model जाँचें।
CMS URL, token environment variable या secure data format अस्पष्ट हो तो लागू करने से पहले पूछें।
official Java/Kotlin DAT library के केवल public API उपयोग करें।

code बदलने से पहले authentication flow और बदली जाने वाली files संक्षेप में बताएँ।
```

## कौन-सा उदाहरण चुनूँ?

- पहले काम करने वाला code चाहिए तो **सरल कार्यान्वयन** चुनें।
- production environment के लिए authentication flow चाहिए तो **विस्तृत कार्यान्वयन** चुनें।

AI प्रश्न पूछे तो पहले CMS URL, token रखने वाला environment variable और `secure` में संग्रहित user information दें।
