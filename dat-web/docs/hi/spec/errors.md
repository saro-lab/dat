# त्रुटि कोड

DAT द्वारा आधिकारिक रूप से समर्थित क्लाइंट लाइब्रेरियों के साझा त्रुटि कोड।

प्रत्येक कोड के साथ **प्रभाव** और **पुनः प्रयास** दो मान जुड़े होते हैं, और कुछ पर अतिरिक्त रूप से **संदेह** का लेबल लगता है।

## प्रभाव — सेवा को कितनी क्षति

यह अलर्ट लगाने की कसौटी है। केवल एक बात देखी जाती है: "क्या सेवा अभी रुकी हुई है"।

| प्रभाव | अर्थ | उदाहरण |
| --- | --- | --- |
| <span class="lg lg-critical">गंभीर</span> | सेवा या कोई विशिष्ट फ़ंक्शन **रुक जाता है।** जारी करना असंभव, सिंक स्थायी रूप से विफल, आरंभीकरण विफल | जारी करने वाले सर्वर पर एक भी उपयोग योग्य प्रमाणपत्र नहीं |
| <span class="lg lg-partial">आंशिक</span> | कुछ अनुरोध या चक्र विफल होते हैं, पर सेवा चलती रहती है। आमतौर पर स्वयं ठीक हो जाती है | CMS का एक चक्र विफल। मौजूदा प्रमाणपत्रों से काम जारी |
| <span class="lg lg-none">प्रभाव नहीं</span> | एक अनुरोध अस्वीकार हुआ, बस इतना ही | छेड़छाड़ किया गया टोकन आया। छानकर हटा दिया |

**प्रभाव नहीं** अलर्ट का विषय नहीं है। यदि एक बार आए गलत इनपुट की जाँच पूरी टीम को करनी पड़े, तो अलर्ट का अर्थ ही समाप्त हो जाता है।

## संदेह — लगातार हो तो जाँच करें

<span class="lg lg-suspect">संदेह</span> लेबल वाले कोड **एक बार होने पर सामान्य संचालन का ही हिस्सा हैं**। क्लाइंट कभी भी गलत मान भेज सकता है, और उसे छानना लाइब्रेरी का अपना काम है।

लेकिन यदि ऐसी त्रुटियाँ **लगातार, या किसी विशेष स्रोत से एक साथ बड़ी संख्या में** आएँ, तो कारण दो में से एक है।

- **कॉन्फ़िगरेशन की गड़बड़ी** — डिप्लॉयमेंट गलत है, पुराने संस्करण का क्लाइंट बचा हुआ है, या प्रमाणपत्र आपस में मेल नहीं खा रहे।
- **हैकिंग का प्रयास** — सत्यापन पास कराने के लिए टोकन या कुंजी से छेड़छाड़, अथवा वैध मान खोजने के लिए टोह लेना।

इसीलिए इन कोडों को **संख्या के आधार पर मेट्रिक बनाकर रखना** उचित है। सीमा पार होने पर ही सूचित करना पर्याप्त है।

## पुनः प्रयास

| पुनः प्रयास | अर्थ |
| --- | --- |
| <span class="lg lg-transient">अस्थायी</span> | बैकऑफ़ के बाद पुनः प्रयास करने पर हल हो जाता है |
| <span class="lg">स्थायी</span> | पुनः प्रयास वर्जित। कॉन्फ़िगरेशन या इनपुट ठीक करना होगा |
| <span class="lg">स्थिति</span> | यह त्रुटि नहीं, एक संकेत है |

---

## टोकन

प्राप्त टोकन स्ट्रिंग की स्वयं की समस्याएँ।

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="अनुरोध अस्वीकार करें">
बिंदु से अलग किए गए भाग पाँच नहीं हैं; या <code>expire</code> शुद्ध दशमलव नहीं है; या <code>cid</code> शुद्ध षोडश आधारी नहीं है; या <code>plain</code>·<code>secure</code> base64url नहीं है; या संख्यात्मक फ़ील्ड पूर्णांक प्रतिनिधित्व की सीमा पार कर गया।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="टोकन पुनः जारी कराएँ">
<code>expire &lt;= now</code>. <strong>ठीक उसी क्षण भी समाप्त</strong> — <code>expire == now</code> होने पर टोकन को समाप्त ही माना जाता है।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली टोकन त्रुटि।
</ErrorCode>

::: tip समाप्ति और प्रारूप त्रुटि अनिवार्य रूप से अलग हैं
प्रतिक्रिया बिल्कुल विपरीत है — समाप्ति जीवनकाल का सामान्य अंत है, इसलिए टोकन नवीनीकृत करा देना पर्याप्त है; जबकि प्रारूप त्रुटि का अर्थ है कि टोकन मूलतः जारी ही नहीं किया गया, इसलिए उसे अस्वीकार करना चाहिए।

पार्सिंग **पहले संरचना तय करती है**, उसके बाद ही मान देखती है। `"1.2.3"` जैसी कम भागों वाली स्ट्रिंग समाप्त हुआ टोकन नहीं बल्कि टोकन है ही नहीं, इसलिए `DAT_TOKEN_MALFORMED` है।

`expire` फ़ील्ड में `+100` जैसा चिह्न लगा होना भी समाप्ति नहीं बल्कि प्रारूप त्रुटि है। केवल शुद्ध ASCII अंक ही मान्य हैं।
:::

---

## प्रमाणपत्र

प्रमाणपत्र स्ट्रिंग के प्रारूप की, और यह कि वह प्रमाणपत्र अभी उपयोग किया जा सकता है या नहीं, इसकी समस्याएँ।

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="प्रमाणपत्र पुनः डिप्लॉय करें">
बिंदु से अलग किए गए भाग आठ नहीं हैं; या <code>cid</code>·<code>start</code>·<code>duration</code>·<code>ttl</code> की पार्सिंग विफल रही; या कुंजी फ़ील्ड base64url नहीं है; या <code>start + duration + ttl</code> u64 से आगे निकल गया।
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="प्रमाणपत्र नवीनीकृत करें">
<code>start + duration + ttl &lt; now</code>. पूर्ण रूप से समाप्त स्थिति: न जारी करना संभव है, न सत्यापन।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="प्रतीक्षा करें">
<code>now &lt; start</code>. जारी करने की विंडो अभी खुली नहीं है।
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="नया प्रमाणपत्र डिप्लॉय करें">
<code>now &gt; start + duration</code> है पर ttl अभी बचा है। जारी करना संभव नहीं, केवल सत्यापन हो सकता है।
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="डिप्लॉय सेटिंग जाँचें">
हस्ताक्षर की निजी कुंजी के बिना केवल सार्वजनिक कुंजी वाला प्रमाणपत्र है। सत्यापन होता है, जारी करना असंभव है।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="अनुरोध अस्वीकार करें">
टोकन के <code>cid</code> से मेल खाने वाला प्रमाणपत्र मौजूद नहीं है। यह जाली टोकन है या गलत डिप्लॉयमेंट।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="सिंक के बाद पुनः प्रयास करें">
वह <code>cid</code> अभी तक CMS से प्राप्त नहीं हुआ। नया प्रमाणपत्र डिप्लॉय करने के तुरंत बाद थोड़े समय के लिए होता है।
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="सर्वर प्रतिक्रिया जाँचें">
आयात की जा रही सूची में एक ही <code>cid</code> दो या अधिक बार है।
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली प्रमाणपत्र त्रुटि।
</ErrorCode>

`DAT_CERT_NOT_FOUND` और `DAT_CERT_NOT_SYNCED` के लक्षण देखने में एक जैसे हैं, पर प्रतिक्रिया अलग है। पहला ऐसा `cid` है जो कभी जारी ही नहीं हुआ, इसलिए प्रतीक्षा से नहीं बनेगा; दूसरा सिंक होते ही हल हो जाता है।

`DAT_CERT_NOT_FOUND` एक बार आए तो बस छान देना पर्याप्त है, पर अचानक बढ़ जाए तो इसका अर्थ है कि डिप्लॉयमेंट बेमेल है या जाली टोकन घूम रहे हैं।

---

## हस्ताक्षर

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="सत्र अवरुद्ध करें, सुरक्षा लॉग">
हस्ताक्षर सत्यापन <strong>बेमेल</strong> के साथ समाप्त हुआ। HMAC मान भिन्न है या ECDSA verify ने false लौटाया।
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="अनुरोध अस्वीकार करें">
हस्ताक्षर वाला भाग खाली है; या base64url नहीं है; या ECDSA <code>r‖s</code> की लंबाई वक्र से मेल नहीं खाती; या DER रूपांतरण विफल रहा।
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="जारीकर्ता सर्वर सेटिंग जाँचें">
verify-only कुंजी से हस्ताक्षर करने का प्रयास किया गया। रनटाइम में निजी कुंजी उपलब्ध नहीं है।
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="कुंजी प्रकार और लाइब्रेरी जाँचें">
<strong>हस्ताक्षर या सत्यापन की संक्रिया स्वयं चल ही नहीं सकी।</strong> गलत कुंजी प्रकार, मुक्त किया जा चुका हैंडल, या क्रिप्टो लाइब्रेरी की आंतरिक त्रुटि।
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली हस्ताक्षर त्रुटि।
</ErrorCode>

::: warning बेमेल और बैकएंड विफलता को न मिलाएँ
इन दोनों कोडों की धुरी बिल्कुल विपरीत है।

- `DAT_SIG_MISMATCH` — आया हुआ हस्ताक्षर बस मेल नहीं खाया, इसलिए **सेवा पर कोई प्रभाव नहीं**, पर लगातार होने पर यह **संदेह** का विषय है।
- `DAT_SIG_BACKEND` — सत्यापन की संक्रिया स्वयं नहीं चल सकी, अर्थात यह **लाइब्रेरी की ओर की समस्या** है, संदेह का विषय नहीं।

गलत कुंजी प्रकार या लाइब्रेरी बग को "हस्ताक्षर बेमेल" के रूप में रिपोर्ट करें, तो वास्तव में कोड टूटा होने की स्थिति हमले के मेट्रिक में जा मिलेगी। इसके उलट, असली जालसाज़ी को बैकएंड त्रुटि में वर्गीकृत करें, तो वह संदेह के मेट्रिक से पूरी तरह बाहर हो जाएगी।
:::

---

## एन्क्रिप्शन

secure पेलोड के एन्क्रिप्शन और डिक्रिप्शन की समस्याएँ।

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="सत्र अवरुद्ध करें, सुरक्षा लॉग">
AES-GCM प्रमाणीकरण टैग मेल नहीं खाता। या तो secure से छेड़छाड़ हुई है, या प्रमाणपत्र की कुंजी अलग है।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="अनुरोध अस्वीकार करें">
सिफरटेक्स्ट खाली नहीं है पर IV (12 बाइट) से कम या बराबर है; या इनपुट कार्यान्वयन की सीमा (<code>INT_MAX</code> आदि) पार कर गया।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="प्लेटफ़ॉर्म समर्थन जाँचें">
एन्क्रिप्शन या डिक्रिप्शन की संक्रिया चल नहीं सकी। GCM समर्थन रहित प्लेटफ़ॉर्म, या कॉन्टेक्स्ट आरंभीकरण विफल।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली एन्क्रिप्शन-डिक्रिप्शन त्रुटि।
</ErrorCode>

**खाली secure पेलोड त्रुटि नहीं है।** खाली इनपुट से खाली आउटपुट बनता है और कोई कोड उत्पन्न नहीं होता।

जिस मार्ग में हस्ताक्षर सत्यापन छोड़ दिया जाता है, वहाँ GCM टैग ही **एकमात्र अखंडता जाँच** है। इसीलिए `DAT_CRYPTO_TAG_MISMATCH` को अन्य डिक्रिप्शन विफलताओं के साथ एक ही कोड में नहीं बाँधा जाता।

---

## कुंजी

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="कुंजी बदलें">
घोषित एल्गोरिदम और कुंजी की लंबाई बेमेल है (HMAC 32/48/64, AES 16/32); या बिंदु वक्र पर नहीं है; या <code>d ∉ [1,n-1]</code>; या प्रारूप असंपीड़ित (0x04) नहीं है; या निजी और सार्वजनिक कुंजी आपस में जोड़ा नहीं हैं।
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="एल्गोरिदम बदलें">
HMAC श्रेणी के लिए verify-only निर्यात का अनुरोध किया गया।
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली कुंजी त्रुटि।
</ErrorCode>

**दिखने में समान पर भिन्न तीन बातें:**

| कोड | अर्थ |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **एल्गोरिदम की संरचनात्मक सीमा।** HMAC सममित है, इसलिए उसमें सार्वजनिक कुंजी की अवधारणा ही नहीं है |
| `DAT_SIG_KEY_MISSING` | **रनटाइम की स्थिति।** इस कुंजी में अभी निजी भाग मौजूद नहीं है |
| `DAT_CERT_VERIFY_ONLY` | **डिप्लॉयमेंट का स्वरूप।** यह प्रमाणपत्र केवल सत्यापन के लिए डिप्लॉय किया गया है |

---

## मैनेजर

प्रमाणपत्र रखने और उन्हें जारी करने तथा सत्यापन में उपयोग करने वाले ऑब्जेक्ट की स्थिति।

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS कनेक्शन जाँचें">
एक भी प्रमाणपत्र मौजूद नहीं है। या तो आयात से पहले की स्थिति है, या CMS के साथ पहली सिंक विफल रही।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="कारण (cause) देखकर निर्णय लें — नीचे तालिका">
प्रमाणपत्र तो हैं, पर अभी जारी करने योग्य एक भी नहीं है। <strong>कारण साथ में भेजा जाता है।</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="कॉलिंग कोड सुधारें">
पहले ही मुक्त किए जा चुके मैनेजर या प्रमाणपत्र का उपयोग किया गया।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली मैनेजर त्रुटि।
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` का कारण (`cause`) चार में से एक होता है। **हर कारण के लिए करने योग्य काम बिल्कुल अलग है।**

| कारण | अर्थ | पुनः प्रयास | कार्रवाई |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | जारी करने की विंडो शुरू होने से पहले | **अस्थायी** | प्रतीक्षा करने पर स्वयं हल हो जाता है |
| `DAT_CERT_ISSUANCE_ENDED` | जारी करने की विंडो समाप्त, केवल सत्यापन संभव | स्थायी | नया प्रमाणपत्र डिप्लॉय करना होगा |
| `DAT_CERT_EXPIRED` | उपलब्ध सभी समाप्त हो चुके | स्थायी | प्रमाणपत्र नवीनीकरण आवश्यक है |
| `DAT_CERT_VERIFY_ONLY` | उपलब्ध सभी केवल सत्यापन के लिए हैं | स्थायी | **डिप्लॉय सेटिंग की गलती है** |

यदि जारी करने वाला सर्वर केवल सत्यापन प्रमाणपत्र लेने के लिए कॉन्फ़िगर हो, तो `DAT_CERT_VERIFY_ONLY` आता है। प्रतीक्षा से यह कभी हल नहीं होगा, इसलिए पुनः प्रयास का विषय नहीं है।

---

## कॉन्फ़िगरेशन

कॉल करने वाले द्वारा दिए गए मानों की समस्याएँ। `CONFIG` श्रेणी के सभी कोड **कोड सुधारने योग्य त्रुटियाँ** हैं; यदि ये संचालन के दौरान आएँ तो डिप्लॉयमेंट गलत है।

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="एल्गोरिदम का नाम जाँचें">
अज्ञात एल्गोरिदम नाम। प्रोटोकॉल में लिखे रूप (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>) से ठीक-ठीक मेल खाना चाहिए।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="कॉलिंग कोड सुधारें">
आवश्यक आर्ग्युमेंट null है; या अनुमत सीमा से बाहर है (ऋणात्मक समय मान, <code>interval &lt;= 0</code>); या असमर्थित प्रकार है (डायनामिक टाइप भाषाओं में payload में संख्या या बूलियन दिया गया); या हस्ताक्षर किया जाने वाला body खाली है।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI सुधारें">
CMS सर्वर का URI विनिर्देश से बाहर है: पार्स नहीं हो रहा, स्कीम http/https नहीं है, या उसमें पथ या क्वेरी जुड़ी है।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली कॉन्फ़िगरेशन त्रुटि।
</ErrorCode>

---

## आंतरिक

निष्पादन परिवेश और रनटाइम की समस्याएँ।

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="डिप्लॉयमेंट और प्लेटफ़ॉर्म जाँचें">
क्रिप्टो बैकएंड या रनटाइम API बिल्कुल ही उपलब्ध नहीं है। <code>crypto.subtle</code> अनुपस्थित, AES-GCM समर्थन रहित प्लेटफ़ॉर्म, या रनटाइम संस्करण आवश्यकता से कम।
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="लॉग जाँचें">
मेमोरी आवंटन विफल, यादृच्छिक संख्या निर्माण विफल, लॉक प्राप्ति विफल, या अगम्य मानी गई शाखा तक पहुँच गया।
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` डिप्लॉयमेंट परिवेश सुधारने से हल हो जाता है, जबकि `DAT_INTERNAL_UNKNOWN` प्रायः रनटाइम की खराबी या लाइब्रेरी का बग होता है।

---

## CMS सिंक

यदि CMS सिंक का उपयोग न किया जाए तो ये कोड नहीं आते।

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="बैकऑफ़ के बाद पुनः प्रयास">
DNS विफलता, कनेक्शन अस्वीकृत, TLS विफलता, <strong>टाइमआउट</strong>। टाइमआउट का अलग कोड नहीं है और वह यहीं शामिल है — क्योंकि प्रतिक्रिया एक जैसी है।
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="टोकन सेटिंग जाँचें">
सर्वर ने 401 दिया। टोकन नहीं है या गलत है।
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="टोकन स्तर जाँचें">
सर्वर ने 403 दिया। टोकन वैध है पर इस एंडपॉइंट का अधिकार नहीं है।
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL सेटिंग जाँचें">
सर्वर ने 404 दिया। URL गलत है।
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="बैकऑफ़ के बाद पुनः प्रयास">
सर्वर ने 5xx दिया।
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="स्टेटस कोड जाँचें">
ऊपर के किसी भी मामले में न आने वाली गैर-2xx प्रतिक्रिया।
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="सर्वर संस्करण जाँचें">
प्रतिक्रिया में संस्करण पंक्ति नहीं है; या संस्करण पंक्ति शुद्ध दशमलव नहीं है; या सीमा पार कर गई।
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="cause में CERT_* / KEY_* जाँचें">
प्रतिक्रिया तो मिली पर प्रमाणपत्र लागू नहीं हो सके। <strong>कारण <code>cause</code> में समाहित है।</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="स्वतः संभाला जाता है">
सर्वर ने क्लाइंट से पुराना संस्करण लौटाया। यह पूर्ण पुनः सिंक का निर्देश है।
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="पहली सिंक की प्रतीक्षा करें">
वह स्थिति जिसमें सिंक एक बार भी सफल नहीं हुई है।
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
पिछली सिंक अभी चल ही रही है, इसलिए इस बार का चक्र छोड़ दिया गया। यह त्रुटि नहीं है।
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="बिल्ड विकल्प जाँचें">
CMS कार्यक्षमता बिल्ड में शामिल नहीं है। feature सक्रिय नहीं है या CURL नहीं जुड़ा है।
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="लॉग जाँचें">
ऊपर की किसी भी श्रेणी में न आने वाली CMS त्रुटि।
</ErrorCode>

जिन कोडों में सिंक **स्थायी रूप से विफल** मानी जाती है (`UNAUTHORIZED`·`FORBIDDEN`·`ENDPOINT_NOT_FOUND`·`MALFORMED`·`IMPORT_FAILED`), वे सभी गंभीर हैं। पुनः प्रयास से हल नहीं होते जबकि प्रमाणपत्र लगातार समाप्त होते रहते हैं, इसलिए उपेक्षा करने पर सेवा अवश्य रुक जाएगी।

इसके विपरीत `UNREACHABLE`·`SERVER_ERROR` आंशिक हैं। मौजूदा प्रमाणपत्रों से काम चलता रहता है और अगले चक्र में स्वयं ठीक हो जाता है — **पर लगातार विफल होते रहने पर अंततः गंभीर में बदल जाता है।** लगातार विफलताओं की संख्या के आधार पर अलर्ट लगाएँ।

::: tip सिंक विफलता अपवाद के रूप में नहीं फेंकी जाती
पहली सिंक विफल होने पर भी मैनेजर सामान्य रूप से लौटाया जाता है — क्योंकि देर से ही सही, सिंक हो जाना बेहतर है। इसके बदले विफलता **जाँची जा सकने वाली स्थिति** के रूप में बनी रहती है।

| क्लाइंट | प्राप्त करने का तरीका |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

एक बार भी सफल न हुई हो तो `DAT_CMS_NOT_SYNCED`, सामान्य होने पर खाली।
:::

---

## सर्वर

CMS सर्वर द्वारा दिए जाने वाले कोड। क्लाइंट इन कोडों को **बनाता नहीं, केवल प्राप्त करता है।**

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
<code>Authorization</code> हेडर नहीं है, या टोकन किसी भी स्तर पर पंजीकृत नहीं है।
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
टोकन पंजीकृत तो है पर वह इस एंडपॉइंट के लिए अपेक्षित स्तर का नहीं है।
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="तुरंत टोकन सेट करें">
एक भी टोकन कॉन्फ़िगर न होने के कारण प्रमाणीकरण पूरी तरह निष्क्रिय है। <strong>प्रमाणपत्र जारी करने वाला API तक बिना प्रमाणीकरण के खुला रहता है।</strong> यह प्रतिक्रिया में नहीं जाता, केवल स्टार्टअप लॉग में दर्ज होता है।
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
पथ या क्वेरी पैरामीटर पार्स नहीं हो पा रहे, या आर्ग्युमेंट अनुमत सीमा से बाहर है (ऋणात्मक delay, 10 वर्ष से अधिक आदि)।
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
अनुरोध पथ में दिया गया एल्गोरिदम नाम अज्ञात है।
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
ऐसा कोई रूट नहीं है या मेथड भिन्न है।
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
अनुरोध body का आकार सीमा से अधिक है।
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
ऊपर की किसी भी श्रेणी में न आने वाली अनुरोध त्रुटि।
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="बैकऑफ़ के बाद पुनः प्रयास">
DB कनेक्शन टूटना, कनेक्शन पूल समाप्त होना, लॉक प्रतिस्पर्धा, टाइमआउट। <strong>503 का उपयोग करने वाला एकमात्र कोड</strong>, जिससे क्लाइंट जान पाता है कि "यह प्रतीक्षा करने से ठीक हो जाएगा"।
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB स्थिति जाँचें">
पढ़ने या लिखने में विफलता, तालिका न होना, स्कीमा बेमेल, संग्रहीत प्रमाणपत्र पंक्ति का क्षतिग्रस्त होना।
</ErrorCode>

प्रतिक्रिया आवरण:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

प्रमाणपत्र बनाते और संभालते समय आने वाली त्रुटियाँ सर्वर भी ऊपर दिए साझा कोडों (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`) से ही देता है।

### सर्वर कोड मिलने पर

क्लाइंट सर्वर के कोड को अपने `CMS` कोड में लपेटता है, और मूल कोड `cause` में सुरक्षित रखता है।

| जो प्राप्त हुआ | HTTP | क्लाइंट जो कोड देता है |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (अन्य) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (संस्करण घटाना) | 200 | `DAT_CMS_VERSION_RESET` |

---

## लक्षण से खोजें

| लक्षण | कोड |
| --- | --- |
| लॉगिन के तुरंत बाद तो चलता है, पर थोड़ी देर बाद अस्वीकार हो जाता है | `DAT_TOKEN_EXPIRED` — टोकन का जीवनकाल समाप्त हो गया। पुनः जारी करने से हल हो जाता है |
| सत्यापन केवल कुछ सर्वरों पर विफल होता है | `DAT_CERT_NOT_SYNCED` — उस सर्वर को अभी नया CID नहीं मिला है |
| वही टोकन सभी सर्वरों पर अस्वीकार होता है | `DAT_CERT_NOT_FOUND` — यह ऐसा CID है जो कभी जारी ही नहीं हुआ |
| जारी करने वाला सर्वर टोकन नहीं बना पाता | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **verify-only रूप में डिप्लॉय हुआ है** |
| जारी करना केवल स्टार्टअप के तुरंत बाद विफल होता है | `DAT_MANAGER_NO_CERTIFICATE` — यह पहली सिंक से पहले की स्थिति है। थोड़ी देर में हल हो जाएगी |
| CMS सिंक लगातार विफल हो रही है | `DAT_CMS_UNAUTHORIZED` — टोकन गलत है। पुनः प्रयास से हल नहीं होगा |
| एक भी प्रमाणपत्र नहीं आ रहा | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL में टाइपो है |
| विफलता केवल किसी विशेष प्लेटफ़ॉर्म पर होती है | `DAT_INTERNAL_UNAVAILABLE` — क्रिप्टो बैकएंड उपलब्ध नहीं है |
| सत्यापन विफलताएँ अचानक बढ़ गईं | `DAT_SIG_MISMATCH` — एक बार होना हानिरहित है, पर **एक साथ बहुत आना जालसाज़ी का प्रयास है** |
| secure का डिक्रिप्शन अचानक विफल होने लगा | `DAT_CRYPTO_TAG_MISMATCH` — प्रमाणपत्र बेमेल हैं या **छेड़छाड़ का प्रयास है** |
| CMS स्टार्टअप लॉग में चेतावनी | `DAT_AUTH_DISABLED` — **प्रमाणीकरण बंद है।** जारी करने वाला API खुला हुआ है |

---

## परिशिष्ट

### कोड सिंटैक्स

```
DAT_<क्षेत्र>_<कारण>
```

- एक ही कारण अलग-अलग क्षेत्रों में आए तो **कारण का नाम समान रहता है।** `DAT_TOKEN_MALFORMED` और `DAT_CERT_MALFORMED` में केवल विषय भिन्न है, अर्थ एक ही है।
- `_UNKNOWN` प्रत्येक क्षेत्र के लिए **केवल फ़ॉलबैक** है। इसे "अज्ञात एल्गोरिदम" जैसे अर्थ में प्रयोग नहीं किया जाता (उसके लिए `_UNSUPPORTED` है)।
- कोड स्ट्रिंग एक सार्वजनिक अनुबंध है। संदेश स्वतंत्र रूप से बदला जा सकता है, कोड नहीं।

| श्रेणी | कोड उपसर्ग |
| --- | --- |
| टोकन | `DAT_TOKEN_` |
| प्रमाणपत्र | `DAT_CERT_` |
| हस्ताक्षर | `DAT_SIG_` |
| एन्क्रिप्शन | `DAT_CRYPTO_` |
| कुंजी | `DAT_KEY_` |
| मैनेजर | `DAT_MANAGER_` |
| कॉन्फ़िगरेशन | `DAT_CONFIG_` |
| आंतरिक | `DAT_INTERNAL_` |
| CMS सिंक | `DAT_CMS_` |
| सर्वर | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### क्लाइंट के अनुसार पहुँच

| क्लाइंट | त्रुटि प्रकार | कोड | पुनः प्रयास वर्गीकरण | सुरक्षा घटना |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS सर्वर | JSON आवरण | `code` फ़ील्ड | — | — |

`सुरक्षा घटना` केवल उन दो कोडों के लिए `true` लौटाता है जहाँ जालसाज़ी या छेड़छाड़ निश्चित है (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`)। इस दस्तावेज़ का **संदेह** लेबल उससे व्यापक दायरा (छेड़छाड़ किए गए टोकन, कुंजी और अनुरोध तक) समेटता है, और फ़िलहाल केवल दस्तावेज़ का वर्गीकरण है, क्लाइंट API के रूप में उपलब्ध नहीं है।

**प्रभाव** का स्तर भी इसी तरह दस्तावेज़ का वर्गीकरण है। एक ही कोड कहाँ उत्पन्न हुआ, इसके अनुसार चोट भिन्न होती है — उदाहरण के लिए `DAT_KEY_INVALID` आने वाले टोकन को छानते समय कोई प्रभाव नहीं डालता, पर CMS सिंक के दौरान प्रमाणपत्र पढ़ते समय आए तो पूरी सिंक विफल हो जाती है।

**मूल कारण नष्ट नहीं होता।** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` और `DAT_CMS_IMPORT_FAILED` कारण को प्रत्येक भाषा की अपवाद शृंखला (`cause` / `__cause__` / `InnerException` / `Unwrap()`) के माध्यम से आगे पहुँचाते हैं।

::: warning C/C++ में संख्यात्मक मान भी बनाए रखे गए हैं
`dat_error_t` के पुराने संख्यात्मक मान ABI संगतता के लिए यथावत रखे गए हैं, पर **मानक स्ट्रिंग कोड ही है**। लाइब्रेरी अब पुराने मान नहीं लौटाती, इसलिए `err == DAT_ERROR_INVALID_DAT` जैसी तुलना मेल नहीं खाएगी। `dat_error_code(e)` से मिलान करें।

C में अपवाद शृंखला नहीं होती, इसलिए कारण अलग से `dat_manager_issuable_cause()` द्वारा प्राप्त किया जाता है।
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
