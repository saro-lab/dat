# Certificates

DAT certificate ٹوکن issue اور verify کرنے کے لیے درکار time ranges، algorithms اور keys ایک string میں بیان کرتا ہے۔

<WireFormat
  hint="Certificate بھی مقررہ ترتیب میں نقطوں سے الگ ASCII fields پر مشتمل ہے۔"
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ناقابلِ تبدیلی certificate ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Issuance start time'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Issuance period'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT lifetime'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Signature algorithm'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Encryption algorithm'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Signing یا verification key'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Encryption key'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## وقت کی حدود

<CertTimeline />

- Certificate `start` سے `start + duration` تک، دونوں endpoints سمیت، DAT issue کر سکتا ہے۔
- Issued DAT اپنے issuance time سے `ttl` تک valid رہتا ہے۔
- Certificate `start + duration + ttl` تک verification کے لیے درکار ہے اور عین اس وقت بھی verifiable رہتا ہے۔

Issuance period ختم ہوتے ہی certificate حذف کرنے سے پہلے جاری شدہ DAT verify نہیں ہو سکیں گے۔ Managers اور CMS issuability اور verifiability کو الگ رکھتے ہیں۔

## Certificate IDs اور key rotation

`cid` وہ public contract ہے جو key اور اس کے time ranges شناخت کرتا ہے۔ موجودہ `cid` کو مختلف keys سے کبھی overwrite نہ کریں۔ keys rotate کرنے کے لیے نئے `cid` کے ساتھ نیا certificate بنائیں۔ services پہلے ہی نیا certificate synchronize کرتی ہیں اور پرانا صرف اس کے جاری کردہ تمام DAT ختم ہونے کے بعد ہٹاتی ہیں۔

## Signature algorithms

| نام | مقصد | Verify-only certificate |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | معاون نہیں |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | معاون نہیں |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | معاون نہیں |
| `ECDSA-P256` | ECDSA P-256 | معاون |
| `ECDSA-P384` | ECDSA P-384 | معاون |
| `ECDSA-P521` | ECDSA P-521 | معاون |

HMAC ایک ہی key سے sign اور verify کرتا ہے، اس لیے verifying server کو وہ key دینے سے issuance authority بھی ملتی ہے۔ جہاں issuance authority الگ رکھنی ہو وہاں ECDSA اور verify-only certificates استعمال کریں۔

## Encryption algorithms

| نام | Key |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Algorithm names wire contract کا حصہ ہیں۔ انہیں JWT aliases سے تبدیل نہ کریں۔

## Full اور verify-only certificates

Full ECDSA certificate میں signing کی private key ہوتی ہے۔ verify-only certificate میں صرف ECDSA public key رہتی ہے، مگر `secure` decrypt کرنے کی AES key بھی موجود رہتی ہے۔ یوں verify-only service DAT verify اور decrypt کر سکتی ہے لیکن نئے DAT issue نہیں کر سکتی۔

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
