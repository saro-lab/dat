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
    {icon: '⚡', title: 'تنسيق إطار ثنائي', desc: 'مصمم بحقول ثنائية ثابتة العرض تُقرأ مباشرةً عبر الإزاحة دون أي مرحلة تحليل. يتم الإصدار والتحقق بأدنى قدر من العبء دون ترميز أو فك ترميز JSON.'},
    {icon: '🔐', title: 'تدوير إلزامي للمفاتيح', desc: 'تتبدل الشهادات تلقائياً وفق دورة محددة، وتكون الشهادة التالية جاهزة دائماً قبل انتهاء الحالية. وهذا يمنع هيكلياً الحادث التشغيلي المعروف في JWT حيث يبقى المفتاح على حاله مدة طويلة.'},
    {icon: '⏱️', title: 'الفصل بين نافذة الإصدار و TTL', desc: '"مدة إمكانية إصدار الشهادة" و"مدة صلاحية الرمز الصادر" منفصلتان، ولذلك تظل الرموز التي خرجت بالفعل تُتحقق حتى نهاية مدة TTL الخاصة بها حتى بعد توقف الشهادة عن الإصدار.'},
    {icon: '🌐', title: 'عملاء أصليون للغات الرئيسية', desc: 'يمكنك استخدام عملاء رسميين مقدَّمين بواجهة برمجية اصطلاحية لكل لغة: Rust وJava/Kotlin وJavaScript/TypeScript وPython وGo وC# وRuby وC/C++.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) هو رمز مصادقة موزّع يكفي فيه أن تتشارك جميع الخوادم التي تُصدر الجلسات وتتحقق منها
مواصفةً واحدة فقط. صُمِّم على أساس حقول ثنائية ثابتة العرض فيُقرأ ويُكتب مباشرةً عبر الإزاحة دون تكلفة تحليل، كما
يفصل البروتوكول نفسه بين نافذة الإصدار و TTL حتى يمكن فرض تبديل الشهادات (تدوير المفاتيح) بمعزل عن اللغة والتنفيذ.
</div>

<div class="hero-desc">
تتولى خدمة إدارة شهادات DAT (CMS) إنشاء شهادات المجموعة بأكملها ونشرها وإنهاء صلاحيتها تلقائياً وفق جدول مبرمَج (Cron)،
ولذلك يمكن تدوير المفاتيح بأمان دون وقوع حادث تفشل فيه الرموز الصادرة في التحقق قبل أن تُتم الخوادم المتعددة مزامنة
الشهادة الجديدة بالكامل.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">البنية العامة</div>

<ArchFlow
    :user="{label: 'المستخدم', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['إنشاء الشهادات حسب مدة الصلاحية', 'إزالة الشهادات المنتهية']}"
    :service="{servers: [
        {label: 'خادم تسجيل الدخول', kind: 'issuer', icon: 'login',
         request: 'طلب تسجيل الدخول', response: 'إصدار DAT بالشهادة', sync: 'مزامنة شهادات الإصدار'},
        {label: 'خوادم المحتوى', kind: 'verifier', icon: 'apps',
         request: 'طلب المحتوى بـ DAT', response: 'التحقق من DAT ثم تقديم الخدمة', sync: 'مزامنة شهادات التحقق فقط'},
    ]}"
/>

<div class="hero-desc">
خادم تسجيل الدخول وحده يتلقى شهادات صالحة للإصدار، أما خوادم المحتوى فتتلقى شهادات للتحقق فقط وتفحص بها الـ DAT الوارد.
يتعامل المستخدم مع خدمة واحدة فقط، ولا يحتاج خادم المحتوى إلى التواصل مع خادم تسجيل الدخول.
</div>

<div class="section-title">بنية الرمز</div>

<WireFormat
    hint="مرّر المؤشر فوق كل حقل لعرض شرحه."
    :segments="[
        {name: 'expire', type: 'uint64 (عشري)', kind: 'meta', note: 'وقت انتهاء صلاحية الرمز — مفروض في المواصفة.'},
        {name: 'cid', type: 'uint64 (ست عشري)', kind: 'meta', note: 'معرّف الشهادة المستخدمة في التحقق.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'بيانات عامة يمكن لأي جهة قراءتها.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'بيانات مشفّرة بـ AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'توقيع على الحقول الأربعة السابقة مجتمعة.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">دليل نشر {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (متعدد الـ Pods) · Docker · ملف ثنائي (Linux، macOS، Windows) — أنشئ أمر التشغيل الآن</div>
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
