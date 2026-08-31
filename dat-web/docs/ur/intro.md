# DAT کیا ہے؟

DAT (Distributed Access Token) ایک access-token specification ہے جسے یکساں certificates share کرنے والی issuing اور verifying services استعمال کرتی ہیں۔ چونکہ verification کے لیے issuing service یا central session store کو مزید request بھیجنے کی ضرورت نہیں، اس لیے authentication کے نتائج کم مضبوطی سے منسلک services کے درمیان منتقل کیے جا سکتے ہیں۔

<WireFormat
  hint="نقطوں سے الگ fields مل کر ایک DAT بناتے ہیں۔"
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'میعاد ختم ہونے کا Unix وقت'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Certificate ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'عوامی data'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Encrypted data'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Body signature'},
  ]"
/>

## اجزاء

### DAT

وہ string جسے صارف یا service درخواست کے ساتھ بھیجتی ہے۔ اس میں میعاد ختم ہونے کا وقت اور certificate ID ہوتے ہیں، اور یہ عوامی اور encrypted دونوں data لے جا سکتی ہے۔

### Certificate

DAT بنانے اور verify کرنے کے لیے درکار algorithms، keys اور time ranges رکھتا ہے۔ certificate ID `cid` ناقابلِ تبدیلی ہے؛ keys rotate کرتے وقت نیا `cid` استعمال کریں۔

### Manager

Client library کا manager certificates محفوظ کرتا ہے، موجودہ issuable certificate سے DAT بناتا ہے اور ہر DAT کو اس کے `cid` سے ملنے والے certificate سے verify کرتا ہے۔

### DAT CMS

ایک اختیاری server جو certificates بناتا، محفوظ کرتا اور services میں تقسیم کرتا ہے۔ یہ issuing services کو full certificates اور صرف token verify کرنے والی services کو verify-only certificates دے سکتا ہے۔

## Issue اور verification

<ArchFlow
  :user="{label: 'صارف', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Certificate management', 'Version-based synchronization']}"
  :service="{servers: [
    {label: 'Issuing service', kind: 'issuer', icon: 'login', request: 'اسناد', response: 'DAT', sync: 'Full certificates'},
    {label: 'Verifying service', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'محفوظ feature', sync: 'Verify-only certificates'},
  ]}"
/>

Issuing service `plain` اور `secure` data منتخب کرکے DAT بناتی ہے۔ Verifying service دونوں data regions کو application تک پہنچانے سے پہلے expiration time، signature اور ciphertext چیک کرتی ہے۔ چونکہ `plain` signed ہے مگر encrypted نہیں، اس میں secrets یا personal data نہ رکھیں۔

## Certificates بدلنے کے بعد بھی verification کیوں چلتی ہے

نیا certificate issuable ہوتے ہی بعد کے DAT اس کا نیا `cid` استعمال کرتے ہیں۔ پچھلا certificate verification کے لیے اس وقت تک دستیاب رہتا ہے جب تک اس کے جاری کردہ ہر DAT کا TTL گزر نہ جائے۔ یوں key rotation اور موجودہ tokens کی verification period ساتھ manage ہوتی ہے۔

## DAT کہاں موزوں ہے

- ایسے ماحول جہاں authentication اور application features مختلف services سنبھالتی ہیں
- ایسے ماحول جہاں متعدد runtimes ایک ہی token format issue یا verify کرتے ہیں
- ایسے systems جنہیں central session lookup کے بغیر مختصر مدت کا authorization data لے جانا ہو
- ایسے systems جنہیں ایک token میں عوامی routing information اور protected data الگ رکھنا ہو

DAT خود authorization policy متعین نہیں کرتا۔ Valid DAT اور application کا request کی اجازت دینے کا فیصلہ الگ معاملات ہیں۔

## اگلے مراحل

- [DAT specification](./spec/dat): token fields اور verification rules
- [Certificates](./spec/dat-certificate): keys اور time ranges
- [DAT CMS specification](./spec/cms): synchronization contract
- [Libraries](./libs/): application integration

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
