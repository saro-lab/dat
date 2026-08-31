import type { SharedGuideLocale } from './types'

export const hiGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'लाइब्रेरियाँ',
    intro: 'अपने एप्लिकेशन की भाषा के लिए DAT क्लाइंट चुनें। सभी क्लाइंट एक ही DAT और सर्टिफिकेट विनिर्देश का उपयोग करते हैं और स्थानीय सर्टिफिकेट प्रबंधन तथा DAT CMS सिंक्रनाइज़ेशन प्रदान करते हैं।',
    criteriaTitle: 'चुनने का तरीका',
    criteriaBody: 'DAT जारी करने वाली सेवा को पूर्ण सर्टिफिकेट का उपयोग कर पाना चाहिए। केवल सत्यापन और डिक्रिप्शन करने वाली सेवा को ECDSA verify-only सर्टिफिकेट और CMS की verify-only भूमिका का उपयोग करना चाहिए।',
    flowTitle: 'गाइड की संरचना',
    flowBody: 'हर लाइब्रेरी गाइड इंस्टॉलेशन, सबसे सरल जारीकरण और सत्यापन प्रवाह, DAT CMS कनेक्शन, सिंक्रनाइज़ेशन नीति, शटडाउन और त्रुटि प्रबंधन को समझाती है।',
  },
  library: {
    titleSuffix: 'लाइब्रेरी',
    install: 'इंस्टॉलेशन',
    quickTitle: 'त्वरित शुरुआत',
    quickIntro: 'यह पूरा प्रवाह CMS से सर्टिफिकेट प्राप्त करता है, JSON डेटा वाला DAT बनाता है और उसका सत्यापन करता है।',
    stepTitle: 'चरणबद्ध उपयोग',
    connectTitle: '1. CMS से कनेक्ट करें',
    connectBody: 'जारीकर्ता सेवा पूर्ण सर्टिफिकेट के लिए टोकन का उपयोग करती है। स्टार्टअप पर तुरंत सिंक्रनाइज़ करने से सर्टिफिकेट उपलब्ध होने से पहले जारीकरण रुकता है।',
    issueTitle: '2. DAT जारी करें',
    issueBody: 'इस उदाहरण में सार्वजनिक JSON को `plain` में और संरक्षित उपयोगकर्ता जानकारी को JSON के रूप में `secure` में रखा गया है।',
    parseTitle: '3. DAT सत्यापित करें',
    parseBody: '`parse` समाप्ति और हस्ताक्षर की जाँच करता है, फिर `secure` को डिक्रिप्ट करता है। केवल सफल सत्यापन के बाद मिले payload का उपयोग करें।',
    functionsTitle: 'प्रमुख फ़ंक्शन',
    functionHeader: 'फ़ंक्शन',
    purposeHeader: 'उद्देश्य',
    dataTitle: 'डेटा क्षेत्र',
    plainBody: 'हस्ताक्षरित, लेकिन एन्क्रिप्ट न किए गए बाइट्स।',
    secureBody: 'एन्क्रिप्ट किए गए बाइट्स।',
    payloadBody: 'इस पर केवल `parse` के सफल होने के बाद ही भरोसा करें।',
    optionsTitle: 'JSON के अलावा विकल्प',
    optionsBody: 'उदाहरण परिचित JSON का उपयोग करते हैं। तेज़ प्रसंस्करण के लिए बाइनरी डेटा JSON serialization और parsing को हटाकर डेटा का आकार भी घटा सकता है।',
    formatsBody: 'सरल मानों को text के रूप में रखें, या Protobuf और MessagePack जैसे बाइनरी प्रारूपों में संरचित डेटा को `plain` और `secure` में रखें।',
    verifyTitle: 'केवल-सत्यापन सेवाएँ',
    verifyBody: 'DAT जारी न करने वाली सेवा verify-only विकल्प और verify-only टोकन का उपयोग करती है और केवल `parse` कॉल करती है।',
    lifecycleTitle: 'शटडाउन और त्रुटियाँ',
    errorsBefore: 'त्रुटि संदेशों के बजाय ',
    errorsLink: 'त्रुटि कोड और पुनःप्रयास वर्गीकरण',
    errorsAfter: ' का उपयोग करें।',
  },
  guides: {
    rust: {
      binaryNote: 'क्योंकि `issue` अभी string स्वीकार करता है, arbitrary bytes को Base64Url या Hex में encode करें और सत्यापन के बाद फिर decode करें।',
      lifecycle: 'अंतिम `Arc<DatCmsManager>` drop होने पर automatic synchronization task भी समाप्त हो जाता है।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'वर्तमान issuing certificate से DAT बनाता है।', 'DAT सत्यापित करके payload लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    java: {
      binaryNote: '`ByteArray` overload बिना किसी अतिरिक्त प्रारूप के bytes को सीधे रखता और निकालता है।',
      lifecycle: '`DatCmsManager`, `AutoCloseable` है; इसे `use` या `close()` से बंद करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करके विफलता बताता है।', 'DAT बनाकर DatResult लौटाता है।', 'DAT सत्यापित करके Payload लौटाता है।', 'अंतिम background synchronization error लौटाता है।'],
    },
    javascript: {
      binaryNote: '`Uint8Array` या `ArrayBuffer` दें और `plainBytes` तथा `secureBytes` से मूल bytes प्राप्त करें।',
      lifecycle: 'शटडाउन पर timers और in-progress requests को साफ़ करने के लिए `stop()` कॉल करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string को asynchronously बनाता है।', 'DAT सत्यापित करके DatPayload लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    python: {
      binaryNote: '`bytes` सीधे दें और उन्हें `plain_bytes` तथा `secure_bytes` से प्राप्त करें।',
      lifecycle: 'automatic synchronization सक्रिय होने पर शटडाउन में `stop()` कॉल करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string बनाता है।', 'DAT सत्यापित करके DatPayload लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    csharp: {
      binaryNote: '`byte[]` overload और `PlainBytes` तथा `SecureBytes` का उपयोग करें।',
      lifecycle: 'manager और background synchronization को साफ़ करने के लिए `await using` का उपयोग करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string बनाता है।', 'DAT सत्यापित करके Payload लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    go: {
      binaryNote: 'Go strings bytes रख सकती हैं। byte slice को `string` के रूप में दें और परिणाम को फिर `[]byte` में बदलें।',
      lifecycle: 'automatic synchronization सक्रिय होने पर cleanup सुनिश्चित करने के लिए `defer cms.Close()` का उपयोग करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string और error लौटाता है।', 'सत्यापित Payload और error लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    ruby: {
      binaryNote: 'binary strings दें और उन्हें `plain_bytes` तथा `secure_bytes` से प्राप्त करें।',
      lifecycle: 'automatic synchronization सक्रिय होने पर background thread को समाप्त करने के लिए `stop` कॉल करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string बनाता है।', 'DAT सत्यापित करके DatPayload लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
    },
    c: {
      binaryNote: 'वर्तमान C issuance API NUL-terminated strings स्वीकार करता है। arbitrary bytes को Base64Url या Hex में encode करें और payload lengths का उपयोग करके परिणाम पढ़ें।',
      lifecycle: '`dat`, `payload` और `cms` को उनके संबंधित cleanup functions से release करें।',
      apiPurposes: ['सर्टिफिकेट को तुरंत सिंक्रनाइज़ करता है।', 'DAT string allocate करके लौटाता है।', 'सत्यापित payload allocate करके लौटाता है।', 'अंतिम synchronization error लौटाता है।'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* plain_bytes और secure_bytes को उनकी अपनी lengths के साथ उपयोग करें। */`,
      binary: `/* issue C strings लेता है, इसलिए NUL वाले डेटा को पहले encode करें। */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS सर्टिफिकेट बनाता है, उन्हें database में रखता है और उपयुक्त सर्टिफिकेट issuing तथा verifying services को देता है। Protocol behavior का वर्णन ',
    specLink: 'DAT CMS विनिर्देश',
    introAfter: ' में है।',
    configTitle: 'runtime configuration बनाएँ',
    dockerTitle: 'Docker के साथ चलाएँ',
    dockerBody: 'container को non-root user के रूप में चलाएँ। SQLite का उपयोग करते समय writable data directory mount करें। tokens और database passwords को command history के बजाय secret-injection mechanism से दें।',
    databaseTitle: 'डेटाबेस',
    databaseBody1: 'SQLite, PostgreSQL या MySQL connection configure करने के लिए `DB_URI` का उपयोग करें। MariaDB, MySQL protocol से connect होता है। CMS certificate query results को snapshot के रूप में cache करता है और storage refresh की अस्थायी विफलता पर अंतिम सफल snapshot देता रहता है।',
    databaseBody2: '`DB_CACHE_SECS` snapshot refresh interval तय करता है, जबकि `DB_QUERY_TIMEOUT_SECS` refresh queries को सीमित करता है। यदि कोई सफल snapshot नहीं है और storage पढ़ा नहीं जा सकता, तो सेवा `DAT_STORE_UNAVAILABLE` लौटाती है।',
    rolesTitle: 'पहुँच भूमिकाएँ',
    roleHeaders: ['environment variable', 'अनुमति', 'उपयोगकर्ता'],
    roleRows: [
      ['सर्टिफिकेट register करना और protected version प्राप्त करना', 'ऑपरेशंस'],
      ['पूर्ण सर्टिफिकेट प्राप्त करना', 'DAT issuing services'],
      ['verify-only सर्टिफिकेट प्राप्त करना', 'सत्यापन और decryption services'],
    ],
    rolesNote: 'हर variable comma-separated alphanumeric tokens स्वीकार करता है। किसी role की token list खाली होने पर उसके endpoints खुल जाते हैं और warning log होती है।',
    certificateTitle: 'सर्टिफिकेट जनरेशन',
    certificateBody: 'master role signature algorithm, encryption algorithm, propagation delay, issuance period और TTL निर्दिष्ट करके सर्टिफिकेट register करती है। propagation delay के दौरान सेवाएँ नए सर्टिफिकेट को उसके issuable होने से पहले synchronize करती हैं।',
    clientTitle: 'क्लाइंट एकीकरण',
    clientSteps: [
      'issuing services के लिए full token और full-certificate endpoint का उपयोग करें।',
      'verifying services के लिए verify token और verify-only option का उपयोग करें।',
      'पहले synchronization का परिणाम जाँचें; यदि startup विफल होना चाहिए, तो immediate synchronization API कॉल करें।',
      'automatic synchronization सक्रिय होने पर application shutdown में manager बंद करें।',
    ],
    libraryBefore: 'हर भाषा के builder और shutdown behavior के लिए ',
    libraryLink: 'लाइब्रेरी गाइड',
    libraryAfter: ' देखें।',
    operationsTitle: 'ऑपरेशनल जाँच',
    operationsItems: [
      '`/health` और `/version/api` बिना authentication के status बताते हैं।',
      'उस role के configured होने पर `/version` को master token चाहिए।',
      'standard output और standard error से logs एकत्र करें।',
      'shutdown signals forward करें और database तथा scheduler को बंद होने का समय दें।',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'container port और probes को service port से मिलाएँ, और data directory को non-root user के write access के साथ mount करें। tokens और database connection details को Secrets के माध्यम से inject करें।',
  },
}
