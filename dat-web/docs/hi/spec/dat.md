# DAT

DAT बिंदुओं (`.`) से अलग की गई ASCII string है। हर फ़ील्ड निश्चित क्रम में ठीक एक बार आता है और हस्ताक्षर पुष्टि करता है कि पहले के फ़ील्ड ठीक उसी रूप में भेजे गए थे।

<WireFormat
  hint="फ़ील्ड क्रम और विभाजक विनिर्देश का हिस्सा हैं।"
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'समाप्ति का Unix समय'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'प्रमाणपत्र ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'सार्वजनिक bytes'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'एन्क्रिप्टेड bytes'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'पहले चार फ़ील्ड पर हस्ताक्षर'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## फ़ील्ड

| फ़ील्ड | निरूपण | अर्थ |
| --- | --- | --- |
| `expire` | दशमलव unsigned integer | DAT समाप्त होने का Unix समय |
| `cid` | lowercase hexadecimal unsigned integer | सत्यापन में प्रयुक्त प्रमाणपत्र ID |
| `plain` | padding-रहित Base64Url | एन्क्रिप्ट न किए गए bytes |
| `secure` | padding-रहित Base64Url | प्रमाणपत्र के encryption algorithm से सुरक्षित bytes |
| `signature` | padding-रहित Base64Url | `expire.cid.plain.secure` के मूल ASCII bytes पर हस्ताक्षर |

`plain` हस्ताक्षर के अंतर्गत आता है, इसलिए बदला नहीं जा सकता, पर कोई भी उसे decode कर सकता है। गोपनीय डेटा, व्यक्तिगत डेटा और authorization निर्णयों में सीधे प्रयुक्त मान `secure` में रखें। खाली `secure` फ़ील्ड मान्य है।

## Canonical निरूपण

- पूरा DAT ASCII होना चाहिए।
- संख्याएँ sign, space, prefix या अनावश्यक शुरुआती zero के बिना लिखी जाती हैं। केवल zero का मान `0` लिखा जाता है।
- Base64Url URL-safe alphabet उपयोग करता है और `=` padding या whitespace स्वीकार नहीं करता।
- समान bytes को कई तरीकों से दिखाने वाली non-canonical Base64Url strings अस्वीकार की जाती हैं।
- अलग फ़ील्ड संख्या या क्रम वाली string DAT नहीं है।

ये नियम अलग-अलग implementations को अलग strings को एक ही DAT मानने से रोकते हैं।

## जारी करना

1. वर्तमान में जारी करने योग्य प्रमाणपत्र चुनें।
2. वर्तमान समय में प्रमाणपत्र का TTL जोड़कर `expire` बनाएँ।
3. `plain` को Base64Url से encode करें।
4. प्रमाणपत्र के encryption algorithm से `secure` को encrypt करें।
5. पहले के फ़ील्ड बिंदुओं से जोड़ें और उनके ASCII bytes पर हस्ताक्षर करें।

जारी करना केवल प्रमाणपत्र की issuance window में अनुमत है: `start <= now <= start + duration`।

## सत्यापन

1. canonical नियमों के अनुसार DAT parse करें।
2. जाँचें कि `expire > now`। `expire == now` वाला DAT समाप्त है।
3. `cid` से मेल खाने वाला प्रमाणपत्र खोजें और पुष्टि करें कि वह सत्यापन के लिए अभी मान्य है।
4. मूल `expire.cid.plain.secure` bytes पर हस्ताक्षर सत्यापित करें।
5. `secure` को authenticate और decrypt करें, फिर उसे `plain` के साथ लौटाएँ।

हस्ताक्षर सत्यापित न करने वाला parsing API केवल निरीक्षण या diagnostics के लिए है। उसके output को authentication या authorization में कभी उपयोग न करें।

## विनिर्देश से बाहर की जिम्मेदारियाँ

DAT user store, login method, authorization model, token transport header या revocation list निर्धारित नहीं करता। एप्लिकेशन तय करता है कि कौन-से अनुरोध सत्यापित payload उपयोग कर सकते हैं।

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
