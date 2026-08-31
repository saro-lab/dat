# DAT CMS

DAT CMS एक वैकल्पिक सेवा है जो प्रमाणपत्र बनाती, संग्रहित करती और client managers को वितरित करती है। यह दस्तावेज़ clients और server के बीच synchronization contract बताता है। installation और operations के लिए [DAT CMS service guide](../svc/docker-saro-lab-dat-cms) देखें।

<FlowDiagram
  title="प्रमाणपत्र सिंक्रनाइज़ेशन"
  :actors="[
    {id: 'client', label: 'क्लाइंट', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'वर्तमान version और प्रमाणपत्रों का अनुरोध', kind: 'req'},
    {from: 'cms', to: 'client', label: 'version और प्रमाणपत्र लौटाएँ', kind: 'res'},
    {from: 'client', label: 'सब कुछ validate करके atomically लागू करें', kind: 'note'},
  ]"
/>

## भूमिका-विशिष्ट endpoints

| भूमिका | पथ | उपयोगकर्ता |
| --- | --- | --- |
| पूर्ण प्रमाणपत्र प्राप्ति | `GET /v1/certs?version=<n>` | DAT जारी करने वाली सेवाएँ |
| Verify-only प्रमाणपत्र प्राप्ति | `GET /v1/certs/verify-only?version=<n>` | केवल सत्यापन और decryption करने वाली सेवाएँ |
| प्रमाणपत्र पंजीकरण | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operators या certificate-generation jobs |

पूर्ण और verify-only retrieval अलग token roles से सुरक्षित किए जा सकते हैं। client manager का `verifyOnly` विकल्प सेट करें ताकि verify-only सेवा पूर्ण प्रमाणपत्र न माँगे।

## Version cursor

क्लाइंट server को अपना अंतिम लागू version भेजता है। server state न बदली हो तो प्रमाणपत्र दोबारा भेजने की आवश्यकता नहीं। नई state मिलने पर response की पहली line में version और आगे की lines में प्रमाणपत्र होते हैं।

सफल response में केवल version हो और प्रमाणपत्र न हों तो क्लाइंट मौजूदा प्रमाणपत्र और issuer बनाए रखता है। server version क्लाइंट version से कम हो तो state rollback करने के बजाय error माना जाता है।

## प्रमाणपत्र import नियम

- एक response में एक ही `cid` एक से अधिक बार हो तो पूरा response अस्वीकार करें।
- नए response में पहले से मौजूद `cid` हो तो मौजूदा प्रमाणपत्र रखें।
- state को एक operation में लागू करने से पहले हर प्रमाणपत्र parse और validate करें।
- सफलतापूर्वक import हुए प्रमाणपत्रों का partial set न छोड़ें।
- वर्तमान समय में जारी करने योग्य प्रमाणपत्रों में से उचित issuer चुनें।

## प्रारंभिक और manual synchronization

client manager बनाते समय पहला synchronization सामान्यतः best-effort होता है। विफल होने पर भी manager बनता है और वास्तविक last error रखता है। startup विफल करना हो तो library का immediate synchronization API call करें ताकि error caller तक पहुँचे।

automatic synchronization न उपयोग करने वाले परिवेश interval बंद करके आवश्यकता पर सीधे synchronize कर सकते हैं। automatic synchronization चालू हो तो application shutdown पर manager को close या stop करें।

## Network और errors

production environment के लिए connection और overall request timeouts सेट करें। Redirect policies runtime के अनुसार बदलती हैं, इसलिए library documentation देखें। मौजूदा clients non-2xx CMS responses को HTTP status के आधार पर `DAT_CMS_*` errors में classify करते हैं और server के JSON response का detailed error code नहीं रखते।

अस्थायी storage failure में server अंतिम सफल certificate snapshot देता रह सकता है। अभी तक सफल snapshot न हो तो वह `DAT_STORE_UNAVAILABLE` लौटाता है।

## Service documentation

deployment, databases, access tokens और runtime configuration के लिए [DAT CMS service guide](../svc/docker-saro-lab-dat-cms) पर जाएँ।

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
