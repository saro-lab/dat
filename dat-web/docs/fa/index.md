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
    {icon: '⏱️', title: 'انقضا بخشی از مشخصات است', desc: 'هر DAT زمان انقضا دارد. لازم نیست هر برنامه عمر توکن را جداگانه تفسیر کند.'},
    {icon: '🔏', title: 'بخش عمومی از بخش رمزگذاری‌شده جداست', desc: 'مقادیر لازم برای مسیریابی را در plain و مقادیری را که نباید آشکار شوند در secure قرار دهید.'},
    {icon: '🔑', title: 'کلید با گواهی انتخاب می‌شود', desc: 'cid در توکن به گواهی لازم برای راستی‌آزمایی اشاره می‌کند. حتی هنگام چرخش کلید می‌توان توکن‌های قبلی را راستی‌آزمایی کرد.'},
    {icon: '🌐', title: 'سرویس‌ها مستقیماً یکدیگر را پرس‌وجو نمی‌کنند', desc: 'اگر هر سرویس همان گواهی‌ها را داشته باشد، سرور صدور و سرور راستی‌آزمایی می‌توانند جداگانه اجرا شوند.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT توکن دسترسی‌ای است که چند سرویس با مشخصاتی یکسان آن را صادر و راستی‌آزمایی می‌کنند. توکن شامل زمان انقضا، شناسه گواهی،
داده عمومی، داده رمزگذاری‌شده و امضاست. سرور راستی‌آزمایی بدون پرسش مکرر از سرور صدور، توکن را با گواهی‌های خود بررسی می‌کند.
</div>

<div class="hero-desc">
گواهی، روش‌های امضا و رمزگذاری توکن، کلیدها، بازه صدور و TTL را در یک مجموعه قرار می‌دهد. با DAT CMS، به‌جای توزیع دستی گواهی برای هر سرویس،
می‌توان گواهی‌های قابل صدور یا فقط قابل راستی‌آزمایی را همگام کرد.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">روند استفاده</div>

<ArchFlow
    :user="{label: 'کاربر', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['ایجاد و نگهداری گواهی', 'ارسال گواهی به سرویس‌ها']}"
    :service="{servers: [
        {label: 'سرویس صدور', kind: 'issuer', icon: 'login', request: 'درخواست احراز هویت', response: 'صدور DAT', sync: 'همگام‌سازی گواهی قابل صدور'},
        {label: 'سرویس راستی‌آزمایی', kind: 'verifier', icon: 'apps', request: 'درخواست همراه DAT', response: 'پاسخ پس از راستی‌آزمایی', sync: 'همگام‌سازی گواهی فقط راستی‌آزمایی'},
    ]}"
/>

<div class="hero-desc">
سرویس صدور با گواهی کامل DAT می‌سازد و سرویس راستی‌آزمایی با گواهی فقط راستی‌آزمایی آن را بررسی می‌کند.
DAT CMS اختیاری است؛ در محیطی که گواهی‌ها مستقیماً توزیع می‌شوند، فقط می‌توان از مدیر محلی کلاینت استفاده کرد.
</div>

<div class="section-title">ساختار DAT</div>

<WireFormat
    hint="با نگه‌داشتن نشانگر روی هر فیلد، توضیح آن نمایش داده می‌شود."
    :segments="[
        {name: 'expire', type: 'uint64 (دهدهی)', kind: 'meta', note: 'زمان Unix انقضای DAT.'},
        {name: 'cid', type: 'uint64 (شانزدهی)', kind: 'meta', note: 'شناسه گواهی برای راستی‌آزمایی.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'بایت‌های عمومی بدون رمزگذاری.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'بایت‌های محافظت‌شده با AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'امضایی که همه فیلدهای پیشین را راستی‌آزمایی می‌کند.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">آشنایی با DAT</div>
        <div class="cta-desc">نقش توکن، گواهی، سرویس صدور و سرویس راستی‌آزمایی به‌ترتیب توضیح داده می‌شود.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">کتابخانه‌ها</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
