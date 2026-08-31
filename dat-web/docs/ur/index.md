---
layout: home
---

<script setup lang="ts">
import {useRoot} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
import WireFormat from "../.vitepress/ui/WireFormat.vue";

const root = useRoot();
const tags = getLibTags(root.value);
const TAG_ICON: Record<string, string> = {
    Rust: '🦀', Cargo: '📦', Java: '☕', Kotlin: '🟣', Maven: '📦',
    JavaScript: '🟨', TypeScript: '🔷', Npm: '📦', Python: '🐍', Pypi: '📦',
    'C#': '🟩', Nuget: '📦', Go: '🐹', Ruby: '💎', Gems: '📦',
    'C++': '🔧', C: '🔧', Vcpkg: '📦',
};
function tagIcon(name: string): string {
    return TAG_ICON[name] || (name === '...' ? '' : '📦');
}
const features = [
    {icon: '⏱️', title: 'میعاد ختم ہونا specification کا حصہ ہے', desc: 'ہر DAT کی میعاد ختم ہونے کا وقت ہوتا ہے۔ ہر application ٹوکن کی مدت کی الگ تشریح نہیں کرتی۔'},
    {icon: '🔏', title: 'عوامی اور encrypted حصے الگ ہیں', desc: 'routing کے لیے درکار values کو plain میں اور پوشیدہ رہنے والی values کو secure میں رکھیں۔'},
    {icon: '🔑', title: 'Certificates keys منتخب کرتے ہیں', desc: 'ٹوکن کا cid تصدیق کے certificate کی نشاندہی کرتا ہے۔ keys rotate ہونے پر بھی موجودہ ٹوکن قابلِ تصدیق رہتے ہیں۔'},
    {icon: '🌐', title: 'Services ایک دوسرے سے query نہیں کرتیں', desc: 'جب ہر service کے پاس یکساں certificates ہوں تو issuing اور verifying servers الگ کام کر سکتے ہیں۔'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT ایک access token ہے جسے متعدد services ایک ہی specification کے تحت issue اور verify کرتی ہیں۔ ٹوکن میں میعاد ختم ہونے کا وقت،
certificate ID، عوامی data، encrypted data اور signature ہوتے ہیں۔ verifying server ہر بار issuing server سے پوچھنے کے بجائے اپنے certificate سے ٹوکن چیک کرتا ہے۔
</div>

<div class="hero-desc">
Certificate میں ٹوکن کے signature اور encryption methods، keys، issuance period اور TTL شامل ہوتے ہیں۔ DAT CMS کے ذریعے services
certificates خود تقسیم کرنے کے بجائے full یا verify-only certificates synchronize کر سکتی ہیں۔
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">یہ کیسے کام کرتا ہے</div>

<ArchFlow
    :user="{label: 'صارف', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['certificates بنائیں اور محفوظ کریں', 'services کو certificates تقسیم کریں']}"
    :service="{servers: [
        {label: 'Issuing service', kind: 'issuer', icon: 'login', request: 'تصدیقی درخواست', response: 'DAT issue کریں', sync: 'issuable certificates synchronize کریں'},
        {label: 'Verifying service', kind: 'verifier', icon: 'apps', request: 'DAT کے ساتھ درخواست', response: 'تصدیق کے بعد جواب', sync: 'verify-only certificates synchronize کریں'},
    ]}"
/>

<div class="hero-desc">
Issuing service full certificates سے DAT بناتی ہے، جبکہ verifying service انہیں verify-only certificates سے چیک کرتی ہے۔
DAT CMS اختیاری ہے؛ certificates براہِ راست تقسیم کرنے والے ماحول صرف client کا local manager استعمال کر سکتے ہیں۔
</div>

<div class="section-title">DAT کی ساخت</div>

<WireFormat
    hint="تفصیل دیکھنے کے لیے ہر field پر pointer رکھیں۔"
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'وہ Unix وقت جب DAT کی میعاد ختم ہوتی ہے۔'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'تصدیق میں استعمال ہونے والی certificate ID۔'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'عوامی bytes جو encrypted نہیں ہیں۔'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM سے محفوظ bytes۔'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'تمام پچھلے fields کی تصدیق کرنے والا signature۔'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT کے ساتھ شروع کریں</div>
        <div class="cta-desc">tokens، certificates، issuing services اور verifying services کے کردار ترتیب سے جانیں۔</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Libraries</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
