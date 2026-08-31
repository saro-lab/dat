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
    {icon: '⏱️', title: 'انتهاء الصلاحية جزء من المواصفة', desc: 'لكل DAT وقت انتهاء صلاحية. ولا تحتاج كل تطبيق إلى تفسير عمر الرمز بصورة منفصلة.'},
    {icon: '🔏', title: 'يفصل المنطقة العامة عن المنطقة المشفّرة', desc: 'ضع القيم اللازمة للتوجيه في plain، والقيم التي يجب ألا تظهر للخارج في secure.'},
    {icon: '🔑', title: 'يختار المفتاح بواسطة شهادة', desc: 'يشير cid في الرمز إلى الشهادة التي تتحقق منه. ويمكن التحقق من الرموز السابقة حتى أثناء تدوير المفاتيح.'},
    {icon: '🌐', title: 'لا تستعلم الخدمات من بعضها مباشرة', desc: 'إذا كانت الشهادة نفسها متوفرة لدى كل خدمة، فيمكن تشغيل خادم الإصدار وخادم التحقق بصورة منفصلة.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT هو رمز وصول تصدره خدمات متعددة وتتحقق منه وفق مواصفة واحدة. يحتوي الرمز على وقت انتهاء الصلاحية ومعرّف الشهادة
وبيانات عامة وبيانات مشفّرة وتوقيع. يتحقق خادم التحقق من الرمز باستخدام الشهادة التي لديه من دون سؤال خادم الإصدار في كل مرة.
</div>

<div class="hero-desc">
تجمع الشهادة طريقة توقيع الرمز وتشفيره والمفاتيح وفترة الإصدار وTTL. وباستخدام DAT CMS تستطيع الخدمات مزامنة الشهادات الكاملة
أو المخصصة للتحقق من دون توزيع الشهادات يدويًا على كل خدمة.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">تدفق الاستخدام</div>

<ArchFlow
    :user="{label: 'المستخدم', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['إنشاء الشهادات وحفظها', 'تسليم الشهادات إلى الخدمات']}"
    :service="{servers: [
        {label: 'خدمة الإصدار', kind: 'issuer', icon: 'login', request: 'طلب مصادقة', response: 'إصدار DAT', sync: 'مزامنة الشهادات القابلة للإصدار'},
        {label: 'خدمة التحقق', kind: 'verifier', icon: 'apps', request: 'طلب مرفق بـ DAT', response: 'استجابة بعد التحقق', sync: 'مزامنة شهادات التحقق فقط'},
    ]}"
/>

<div class="hero-desc">
تنشئ خدمة الإصدار DAT باستخدام الشهادة الكاملة، وتفحصه خدمة التحقق باستخدام شهادة مخصصة للتحقق فقط.
DAT CMS اختياري؛ وفي البيئات التي توزّع الشهادات مباشرة يمكن الاكتفاء بالمدير المحلي في العميل.
</div>

<div class="section-title">بنية DAT</div>

<WireFormat
    hint="مرّر مؤشر الفأرة فوق كل حقل لعرض وصفه."
    :segments="[
        {name: 'expire', type: 'uint64 (عشري)', kind: 'meta', note: 'Unix time الذي تنتهي عنده صلاحية DAT.'},
        {name: 'cid', type: 'uint64 (ست عشري)', kind: 'meta', note: 'معرّف الشهادة المستخدمة للتحقق.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'بايتات عامة غير مشفّرة.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'بايتات محمية باستخدام AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'توقيع يتحقق من جميع الحقول السابقة.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">تعرّف على DAT</div>
        <div class="cta-desc">شرح متسلسل لأدوار الرمز والشهادة وخدمتي الإصدار والتحقق.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">المكتبات</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
