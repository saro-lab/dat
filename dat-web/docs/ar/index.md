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
    {icon: '⚡', title: 'بروتوكول الإطارات الثنائية', desc: 'مصمم من الأساس بحقول ثنائية ثابتة العرض، تُقرأ مباشرة عبر إزاحة البايت دون أي مرحلة تحليل — يتم الإصدار والتحقق بأقل قدر من العبء، دون أي ترميز أو فك ترميز JSON.'},
    {icon: '🔐', title: 'تدوير إلزامي للمفاتيح', desc: 'تتناوب الشهادات تلقائيًا وفق جدول ثابت، مع بقاء الشهادة التالية جاهزة دائمًا قبل انتهاء صلاحية الحالية — مما يمنع هيكليًا الحادثة الشائعة في JWT حيث يبقى المفتاح دون تغيير لسنوات.'},
    {icon: '⏱️', title: 'الفصل بين نافذة الإصدار و TTL', desc: 'يتم تتبع نافذة إصدار الشهادة ومدة صلاحية الرمز (TTL) بشكل منفصل، بحيث تستمر الرموز التي تم إصدارها بالفعل في التحقق حتى تنتهي مدة TTL الخاصة بها، حتى بعد توقف الشهادة عن إصدار رموز جديدة.'},
    {icon: '🌐', title: 'عملاء أصليون للغات الرئيسية', desc: 'عملاء رسميون لـ Rust وJava/Kotlin وJavaScript/TypeScript وPython وGo وC# وRuby وC/C++، كل منها بواجهة برمجية مناسبة للغته.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) هو رمز مصادقة موزع — يحتاج كل خادم يُصدر أو يتحقق من الجلسات إلى الاتفاق على مواصفة
واحدة فقط. مبني على حقول ثنائية ثابتة العرض، يقرأ ويكتب مباشرة عبر الإزاحة دون أي مرحلة تحليل، والبروتوكول نفسه
يفصل بين نافذة الإصدار و TTL بحيث يمكن فرض تدوير الشهادات (تدوير المفاتيح) بغض النظر عن اللغة أو التنفيذ.
</div>

<div class="hero-desc">
تقوم خدمة إدارة شهادات DAT (CMS) بإنشاء الشهادات ونشرها وإنهاء صلاحيتها عبر المجموعة بأكملها وفق مهمة cron مجدولة،
بحيث يمكن تدوير المفاتيح بأمان دون أن يفشل أي رمز تم إصداره بالفعل في التحقق أثناء مزامنة الخوادم الأخرى مع الشهادة
الجديدة.
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
        <div class="cta-title">دليل نشر {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (متعدد الحاويات) · Docker · ثنائي (Linux، macOS، Windows) — أنشئ أمر التشغيل الآن</div>
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
