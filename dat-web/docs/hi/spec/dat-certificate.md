# प्रमाणपत्र

DAT प्रमाणपत्र टोकन जारी और सत्यापित करने के लिए आवश्यक समय-सीमाएँ, algorithms और कुंजियाँ एक string में व्यक्त करता है।

<WireFormat
  hint="प्रमाणपत्र भी निश्चित क्रम में बिंदु से अलग ASCII फ़ील्ड से बनता है।"
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'अपरिवर्तनीय प्रमाणपत्र ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'जारी करने का आरंभ समय'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'जारी करने की अवधि'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT की अवधि'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Signature algorithm'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Encryption algorithm'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'हस्ताक्षर या सत्यापन कुंजी'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Encryption कुंजी'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## समय-सीमाएँ

<CertTimeline />

- प्रमाणपत्र `start` से `start + duration` तक, दोनों endpoints सहित, DAT जारी कर सकता है।
- जारी DAT अपने issuance time से `ttl` तक मान्य रहता है।
- प्रमाणपत्र `start + duration + ttl` तक सत्यापन के लिए आवश्यक है और उस ठीक समय पर भी सत्यापित किया जा सकता है।

जारी करने की अवधि समाप्त होते ही प्रमाणपत्र हटाने से पहले से जारी DAT सत्यापित नहीं हो पाएँगे। मैनेजर और CMS issuability तथा verifiability को अलग रखते हैं।

## प्रमाणपत्र ID और कुंजी परिवर्तन

`cid` वह सार्वजनिक अनुबंध है जो कुंजी और उसकी समय-सीमाओं की पहचान करता है। मौजूदा `cid` को अलग कुंजियों से कभी overwrite न करें। कुंजियाँ बदलने के लिए नए `cid` वाला नया प्रमाणपत्र बनाएँ। सेवाएँ नए प्रमाणपत्र को पहले सिंक्रनाइज़ करती हैं और पुराने को तभी हटाती हैं जब उसके जारी किए सभी DAT समाप्त हो जाएँ।

## Signature algorithms

| नाम | उद्देश्य | Verify-only प्रमाणपत्र |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | समर्थित नहीं |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | समर्थित नहीं |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | समर्थित नहीं |
| `ECDSA-P256` | ECDSA P-256 | समर्थित |
| `ECDSA-P384` | ECDSA P-384 | समर्थित |
| `ECDSA-P521` | ECDSA P-521 | समर्थित |

HMAC एक ही कुंजी से हस्ताक्षर और सत्यापन करता है, इसलिए वह कुंजी सत्यापन सर्वर को देने से जारी करने का अधिकार भी मिल जाता है। जहाँ issuance authority अलग रखनी हो वहाँ ECDSA और verify-only प्रमाणपत्र उपयोग करें।

## Encryption algorithms

| नाम | कुंजी |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Algorithm names wire contract का हिस्सा हैं। उन्हें JWT aliases से न बदलें।

## पूर्ण और verify-only प्रमाणपत्र

पूर्ण ECDSA प्रमाणपत्र में हस्ताक्षर के लिए आवश्यक private key होती है। verify-only प्रमाणपत्र में केवल ECDSA public key रहती है, लेकिन `secure` decrypt करने वाली AES key भी रखी जाती है। इसलिए verify-only सेवा DAT सत्यापित और decrypt कर सकती है, पर नए DAT जारी नहीं कर सकती।

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
