---
layout: home
---

<script setup lang="ts">
import {useRoot, useTranslate} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";

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
    {icon: '⚡', title: 'بائنری فریم پروٹوکول', desc: 'شروع سے ہی فکسڈ چوڑائی والے بائنری فیلڈز کے ساتھ ڈیزائن کیا گیا، بغیر کسی پارسنگ مرحلے کے براہ راست بائٹ آفسیٹ سے پڑھا جاتا ہے — کسی JSON انکوڈنگ/ڈی کوڈنگ کے بغیر، کم سے کم اوور ہیڈ کے ساتھ جاری اور تصدیق کیا جاتا ہے۔'},
    {icon: '🔐', title: 'لازمی کی رولنگ', desc: 'سرٹیفکیٹس ایک مقررہ شیڈول پر خود بخود روٹیٹ ہوتے ہیں، موجودہ سرٹیفکیٹ کی میعاد ختم ہونے سے پہلے اگلا سرٹیفکیٹ ہمیشہ تیار ہوتا ہے — یہ ساختی طور پر اس JWT طرز کے واقعے کو روکتا ہے جہاں ایک کی برسوں تک تبدیل نہیں ہوتی۔'},
    {icon: '⏱️', title: 'اجرا کی مدت اور TTL کی علیحدگی', desc: 'سرٹیفکیٹ کی اجرا کی مدت اور ٹوکن کی میعاد (TTL) الگ الگ ٹریک کی جاتی ہیں، تاکہ سرٹیفکیٹ کے نئے ٹوکن جاری کرنا بند کرنے کے بعد بھی، پہلے سے جاری ٹوکنز ان کی TTL ختم ہونے تک تصدیق ہوتے رہیں۔'},
    {icon: '🌐', title: 'بڑی زبانوں کے لیے نیٹو کلائنٹس', desc: 'Rust، Java/Kotlin، JavaScript/TypeScript، Python، Go، C#، Ruby اور C/C++ کے لیے سرکاری کلائنٹس، ہر ایک اپنی زبان کے مطابق API کے ساتھ۔'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) ایک تقسیم شدہ توثیقی ٹوکن ہے — سیشنز جاری یا تصدیق کرنے والے ہر سرور کو صرف ایک ہی
وضاحت پر متفق ہونا ہوتا ہے۔ یہ فکسڈ چوڑائی والے بائنری فیلڈز پر بنایا گیا ہے، بغیر کسی پارسنگ مرحلے کے براہ راست
آفسیٹ سے پڑھتا اور لکھتا ہے، اور پروٹوکول خود اجرا کی مدت کو TTL سے الگ رکھتا ہے تاکہ سرٹیفکیٹ روٹیشن (کی رولنگ)
کو زبان یا نفاذ سے آزادانہ طور پر نافذ کیا جا سکے۔
</div>

<div class="hero-desc">
DAT سرٹیفکیٹ مینجمنٹ سروس (CMS) ایک شیڈول شدہ cron جاب کے مطابق پورے کلسٹر میں سرٹیفکیٹس بناتی، پھیلاتی اور ختم
کرتی ہے، تاکہ کیز محفوظ طریقے سے روٹیٹ ہو سکیں بغیر اس کے کہ پہلے سے جاری کوئی ٹوکن اس وقت تک تصدیق میں ناکام ہو
جب تک دیگر سرورز نئے سرٹیفکیٹ کے ساتھ مکمل طور پر ہم آہنگ نہ ہو جائیں۔
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} ڈیپلائمنٹ گائیڈ</div>
        <div class="cta-desc">Kubernetes (ملٹی پوڈ) · Docker · بائنری (Linux، macOS، Windows) — ابھی ایک رن کمانڈ تیار کریں</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">{{t('platform_support')}}</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

<div class="section-title">{{t('example')}}</div>

</div>

<DatExample />
