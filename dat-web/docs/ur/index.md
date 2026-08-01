---
layout: home
---

<script setup lang="ts">
import {useRoot, useTranslate} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
import WireFormat from "../.vitepress/ui/WireFormat.vue";

const root = useRoot();
const {t} = useTranslate();
const tags = getLibTags(root.value);

/** Language/registry → emoji, purely decorative. Falls back to a generic package icon. */
const TAG_ICON: Record<string, string> = {
    Rust: '🦀', Cargo: '📦',
    Java: '☕', Kotlin: '🟣', Maven: '📦',
    JavaScript: '🟨', TypeScript: '🔷', Npm: '📦',
    Python: '🐍', Pypi: '📦',
    'C#': '🟩', Nuget: '📦',
    Go: '🐹',
    Ruby: '💎', Gems: '📦',
    'C++': '🔧', C: '🔧', Vcpkg: '📦',
};
function tagIcon(name: string): string {
    return TAG_ICON[name] || (name === '...' ? '' : '📦');
}

const features = [
    {icon: '⚡', title: 'بائنری فریم فارمیٹ', desc: 'فکسڈ چوڑائی والے بائنری فیلڈز کے ساتھ ڈیزائن کیا گیا، بغیر کسی پارسنگ مرحلے کے براہ راست آفسیٹ سے پڑھا جاتا ہے۔ کسی JSON انکوڈنگ/ڈی کوڈنگ کے بغیر، کم سے کم اوور ہیڈ کے ساتھ جاری اور تصدیق کیا جاتا ہے۔'},
    {icon: '🔐', title: 'لازمی کی رولنگ', desc: 'سرٹیفکیٹس ایک مقررہ شیڈول پر خود بخود تبدیل ہوتے ہیں، اور موجودہ سرٹیفکیٹ کی میعاد ختم ہونے سے پہلے اگلا سرٹیفکیٹ ہمیشہ تیار ہوتا ہے۔ یہ ساختی طور پر اس JWT طرز کے آپریشنل واقعے کو روکتا ہے جہاں ایک کی برسوں تک جوں کی توں رہ جاتی ہے۔'},
    {icon: '⏱️', title: 'اجراء کی مدت اور TTL کی علیحدگی', desc: 'سرٹیفکیٹ کی "اجراء کی ممکنہ مدت" اور "جاری کردہ ٹوکن کی میعاد" الگ الگ ہیں، اس لیے سرٹیفکیٹ کے اجراء بند کر دینے کے بعد بھی پہلے سے جاری ٹوکنز ان کی TTL ختم ہونے تک تصدیق ہوتے رہتے ہیں۔'},
    {icon: '🌐', title: 'بڑی زبانوں کے لیے نیٹو کلائنٹس', desc: 'Rust، Java/Kotlin، JavaScript/TypeScript، Python، Go، C#، Ruby اور C/C++ کے لیے سرکاری کلائنٹس دستیاب ہیں، ہر ایک اپنی زبان کے مطابق API کے ساتھ۔'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) ایک تقسیم شدہ توثیقی ٹوکن ہے — سیشنز جاری یا تصدیق کرنے والے ہر سرور کو صرف ایک ہی
وضاحت پر متفق ہونا ہوتا ہے۔ یہ فکسڈ چوڑائی والے بائنری فیلڈز پر بنایا گیا ہے، بغیر کسی پارسنگ لاگت کے براہ راست
آفسیٹ سے پڑھتا اور لکھتا ہے، اور پروٹوکول خود اجراء کی مدت کو TTL سے الگ رکھتا ہے تاکہ سرٹیفکیٹ روٹیشن (کی رولنگ)
کو زبان یا نفاذ سے آزادانہ طور پر نافذ کیا جا سکے۔
</div>

<div class="hero-desc">
DAT سرٹیفکیٹ مینجمنٹ سروس (CMS) ایک شیڈول شدہ cron جاب کے مطابق پورے کلسٹر میں سرٹیفکیٹس کی تخلیق، تقسیم اور
میعاد ختم ہونے کا انتظام خودکار طور پر کرتی ہے، تاکہ کیز محفوظ طریقے سے روٹیٹ ہو سکیں بغیر اس واقعے کے کہ کئی سرورز
کے نئے سرٹیفکیٹ کے ساتھ مکمل ہم آہنگ ہونے سے پہلے جاری کیا گیا ٹوکن تصدیق میں ناکام ہو جائے۔
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">مجموعی فن تعمیر</div>

<ArchFlow
    :user="{label: 'صارف', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['مدتِ میعاد کے مطابق سرٹیفکیٹ بنانا', 'ختم شدہ سرٹیفکیٹ ہٹانا']}"
    :service="{servers: [
        {label: 'لاگ ان سرور', kind: 'issuer', icon: 'login',
         request: 'لاگ ان درخواست', response: 'سرٹیفکیٹ سے DAT جاری', sync: 'اجرا کے قابل سرٹیفکیٹ ہم آہنگی'},
        {label: 'کنٹینٹ سرورز', kind: 'verifier', icon: 'apps',
         request: 'DAT کے ساتھ کنٹینٹ درخواست', response: 'DAT کی تصدیق کے بعد سروس', sync: 'صرف تصدیقی سرٹیفکیٹ ہم آہنگی'},
    ]}"
/>

<div class="hero-desc">
اجرا کے قابل سرٹیفکیٹ صرف لاگ ان سرور کو ملتے ہیں؛ کنٹینٹ سرورز کو صرف تصدیقی سرٹیفکیٹ ملتے ہیں جن سے وہ آنے والے DAT کی جانچ کرتے ہیں۔
صارف کو صرف ایک سروس سے واسطہ پڑتا ہے، اور کنٹینٹ سرور کو لاگ ان سرور سے بات کرنے کی ضرورت کبھی نہیں پڑتی۔
</div>

<div class="section-title">ٹوکن کا ڈھانچہ</div>

<WireFormat
    hint="ہر فیلڈ پر ماؤس لے جائیں تو اس کی تفصیل دکھائی دے گی۔"
    :segments="[
        {name: 'expire', type: 'uint64 (اعشاری)', kind: 'meta', note: 'ٹوکن کی میعاد ختم ہونے کا وقت — وضاحت میں لازمی ہے۔'},
        {name: 'cid', type: 'uint64 (سولہ اعشاری)', kind: 'meta', note: 'تصدیق میں استعمال ہونے والا سرٹیفکیٹ ID۔'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'عوامی ڈیٹا جسے کوئی بھی پڑھ سکتا ہے۔'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM سے خفیہ کیا گیا ڈیٹا۔'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'پہلے چاروں فیلڈز پر مکمل دستخط۔'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} ڈیپلائمنٹ گائیڈ</div>
        <div class="cta-desc">Kubernetes (ملٹی پوڈ) · Docker · بائنری (Linux، macOS، Windows) — ابھی رن کمانڈ تیار کریں</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">{{t('platform_support')}}</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
