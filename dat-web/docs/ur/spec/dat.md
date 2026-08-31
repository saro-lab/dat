# DAT

DAT نقطوں (`.`) سے الگ کی گئی ASCII string ہے۔ ہر field مقررہ ترتیب میں صرف ایک بار آتا ہے، اور signature تصدیق کرتا ہے کہ پچھلے fields اسی طرح منتقل ہوئے تھے۔

<WireFormat
  hint="Field order اور separators specification کا حصہ ہیں۔"
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'میعاد ختم ہونے کا Unix وقت'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'Certificate ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'عوامی bytes'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Encrypted bytes'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'پہلے چار fields کا signature'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Fields

| Field | Representation | مطلب |
| --- | --- | --- |
| `expire` | Decimal unsigned integer | DAT کی میعاد ختم ہونے کا Unix وقت |
| `cid` | Lowercase hexadecimal unsigned integer | verification میں استعمال ہونے والی certificate ID |
| `plain` | Unpadded Base64Url | غیر encrypted bytes |
| `secure` | Unpadded Base64Url | certificate کے encryption algorithm سے محفوظ bytes |
| `signature` | Unpadded Base64Url | `expire.cid.plain.secure` کے اصل ASCII bytes کا signature |

چونکہ `plain` signature میں شامل ہے اس لیے اسے بدلا نہیں جا سکتا، لیکن کوئی بھی اسے decode کر سکتا ہے۔ secrets، personal data اور authorization decisions میں براہِ راست استعمال ہونے والی values کو `secure` میں رکھیں۔ خالی `secure` field درست ہے۔

## Canonical representation

- پورا DAT ASCII ہونا چاہیے۔
- Numbers کو signs، spaces، prefixes یا غیر ضروری ابتدائی zero کے بغیر لکھا جاتا ہے۔ صرف zero کی value `0` لکھی جاتی ہے۔
- Base64Url، URL-safe alphabet استعمال کرتا ہے اور `=` padding یا whitespace قبول نہیں کرتا۔
- ایک ہی bytes کو کئی طریقوں سے ظاہر کرنے والی non-canonical Base64Url strings رد کی جاتی ہیں۔
- مختلف field count یا order والی string DAT نہیں ہے۔

یہ قواعد مختلف implementations کو مختلف strings ایک ہی DAT کے طور پر قبول کرنے سے روکتے ہیں۔

## Issuance

1. اس وقت issuable certificate منتخب کریں۔
2. موجودہ وقت میں certificate کا TTL شامل کرکے `expire` بنائیں۔
3. `plain` کو Base64Url میں encode کریں۔
4. certificate کے encryption algorithm سے `secure` encrypt کریں۔
5. پچھلے fields کو نقطوں سے ملائیں اور ان کے ASCII bytes sign کریں۔

Issuance صرف certificate کی issuance window میں جائز ہے: `start <= now <= start + duration`۔

## Verification

1. canonical rules کے مطابق DAT parse کریں۔
2. چیک کریں کہ `expire > now`۔ `expire == now` والا DAT expired ہے۔
3. `cid` سے ملنے والا certificate تلاش کریں اور تصدیق کریں کہ وہ verification کے لیے valid ہے۔
4. اصل `expire.cid.plain.secure` bytes کا signature verify کریں۔
5. `secure` کو authenticate اور decrypt کرکے `plain` کے ساتھ واپس کریں۔

Signature verify نہ کرنے والا parsing API صرف observation یا diagnostics کے لیے ہے۔ اس کے output کو authentication یا authorization کے لیے کبھی استعمال نہ کریں۔

## Specification سے باہر ذمہ داریاں

DAT user store، login method، authorization model، token transport header یا revocation list متعین نہیں کرتا۔ Application فیصلہ کرتی ہے کہ کون سی requests verified payload استعمال کر سکتی ہیں۔

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
