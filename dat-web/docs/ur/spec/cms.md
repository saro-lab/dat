# DAT CMS

DAT CMS ایک اختیاری service ہے جو certificates بناتی، database میں محفوظ کرتی اور client managers کو تقسیم کرتی ہے۔ یہ document clients اور server کے synchronization contract کی وضاحت کرتا ہے۔ installation اور operations کے لیے [DAT CMS service guide](../svc/docker-saro-lab-dat-cms) دیکھیں۔

<FlowDiagram
  title="Certificate synchronization"
  :actors="[
    {id: 'client', label: 'Client', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'موجودہ version اور certificates کی درخواست', kind: 'req'},
    {from: 'cms', to: 'client', label: 'version اور certificates واپس کریں', kind: 'res'},
    {from: 'client', label: 'سب کو validate کرکے atomically apply کریں', kind: 'note'},
  ]"
/>

## کردار کے لحاظ سے endpoints

| کردار | Path | استعمال |
| --- | --- | --- |
| Full certificate retrieval | `GET /v1/certs?version=<n>` | DAT issue کرنے والی services |
| Verify-only certificate retrieval | `GET /v1/certs/verify-only?version=<n>` | صرف verify اور decrypt کرنے والی services |
| Certificate registration | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operators یا certificate-generation jobs |

Full اور verify-only retrieval کو الگ token roles سے محفوظ کیا جا سکتا ہے۔ client manager کا `verifyOnly` option set کریں تاکہ verify-only service full certificates کی request نہ کرے۔

## Version cursor

Client server کو آخری apply کیا گیا version بھیجتا ہے۔ server state نہ بدلی ہو تو certificates دوبارہ بھیجنے کی ضرورت نہیں۔ نئی state میں response کی پہلی line پر version اور بعد کی lines پر certificates ہوتے ہیں۔

Successful response میں صرف version ہو اور certificates نہ ہوں تو client موجودہ certificates اور issuer برقرار رکھتا ہے۔ server version client سے کم ہو تو state rollback کرنے کے بجائے error سمجھا جاتا ہے۔

## Certificate import rules

- ایک response میں ایک ہی `cid` ایک سے زیادہ بار آئے تو پورا response رد کریں۔
- نئے response میں پہلے سے موجود `cid` ہو تو موجودہ certificate رکھیں۔
- state کو ایک operation میں apply کرنے سے پہلے ہر certificate parse اور validate کریں۔
- کامیابی سے import ہونے والے certificates کا partial set نہ چھوڑیں۔
- موجودہ وقت کے issuable certificates میں سے مناسب issuer منتخب کریں۔

## ابتدائی اور manual synchronization

Client manager بناتے وقت پہلا synchronization عموماً best-effort ہوتا ہے۔ ناکام ہونے پر بھی manager بنتا اور اصل last error رکھتا ہے۔ application کو startup پر ناکام کرنا ہو تو library کا immediate synchronization API call کریں تاکہ error caller تک پہنچے۔

Automatic synchronization استعمال نہ کرنے والے ماحول interval بند کرکے ضرورت پر براہِ راست synchronize کر سکتے ہیں۔ automatic synchronization فعال ہو تو application shutdown پر manager close یا stop کریں۔

## Network اور errors

Production environment کے لیے connection اور overall request timeouts set کریں۔ Redirect policies runtime کے لحاظ سے مختلف ہیں، اس لیے library documentation دیکھیں۔ موجودہ clients non-2xx CMS responses کو HTTP status کی بنیاد پر `DAT_CMS_*` errors classify کرتے ہیں اور server کے JSON response کا detailed error code محفوظ نہیں رکھتے۔

عارضی storage failure کے دوران server آخری کامیاب certificate snapshot دیتا رہ سکتا ہے۔ ابھی تک کامیاب snapshot نہ ہو تو `DAT_STORE_UNAVAILABLE` واپس کرتا ہے۔

## Service documentation

deployment، databases، access tokens اور runtime configuration کے لیے [DAT CMS service guide](../svc/docker-saro-lab-dat-cms) دیکھیں۔

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
