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
    {icon: '⚡', title: 'বাইনারি ফ্রেম ফরম্যাট', desc: 'নির্দিষ্ট-প্রস্থের বাইনারি ফিল্ড দিয়ে ডিজাইন করা, তাই কোনো পার্সিং ধাপ ছাড়াই সরাসরি অফসেট থেকে পড়া হয়। JSON এনকোডিং/ডিকোডিং ছাড়াই ন্যূনতম ওভারহেডে ইস্যু ও যাচাই করা হয়।'},
    {icon: '🔐', title: 'বাধ্যতামূলক কী রোলিং', desc: 'সার্টিফিকেট একটি নির্ধারিত চক্র অনুযায়ী স্বয়ংক্রিয়ভাবে প্রতিস্থাপিত হয়, এবং মেয়াদ শেষ হওয়ার আগেই পরবর্তী সার্টিফিকেট সবসময় প্রস্তুত থাকে। এটি কাঠামোগতভাবে সেই JWT-ধাঁচের পরিচালন দুর্ঘটনা প্রতিরোধ করে যেখানে একটি কী দীর্ঘকাল অপরিবর্তিত থেকে যায়।'},
    {icon: '⏱️', title: 'ইস্যু-মেয়াদ ও TTL-এর পৃথকীকরণ', desc: 'সার্টিফিকেটের "ইস্যু করার সম্ভাব্য মেয়াদ" এবং "ইস্যু হওয়া টোকেনের বৈধতার মেয়াদ" আলাদা, তাই সার্টিফিকেট ইস্যু বন্ধ করার পরও ইতিমধ্যে বেরিয়ে যাওয়া টোকেনগুলো তাদের TTL শেষ না হওয়া পর্যন্ত যাচাই হতে থাকে।'},
    {icon: '🌐', title: 'প্রধান ভাষাগুলোর জন্য নেটিভ ক্লায়েন্ট', desc: 'Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, C/C++ প্রভৃতি ভাষার জন্য অফিসিয়াল ক্লায়েন্ট ব্যবহার করা যায়, প্রতিটি সেই ভাষার নিজস্ব ধাঁচের API সহ।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) হলো একটি বিতরণকৃত প্রমাণীকরণ টোকেন — সেশন ইস্যু ও যাচাই করা প্রতিটি সার্ভারের শুধু
একটি একক স্পেসিফিকেশন ভাগাভাগি করলেই চলে। এটি নির্দিষ্ট-প্রস্থের বাইনারি ফিল্ডের ভিত্তিতে ডিজাইন করা, তাই পার্সিং
খরচ ছাড়াই সরাসরি অফসেট থেকে পড়ে ও লেখে, এবং সার্টিফিকেট প্রতিস্থাপন (কী রোলিং) ভাষা বা ইমপ্লিমেন্টেশন নির্বিশেষে
বলবৎ করার জন্য প্রোটোকল স্তরেই ইস্যু-মেয়াদ ও TTL আলাদা রাখা হয়েছে।
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) পুরো ক্লাস্টারের সার্টিফিকেট তৈরি, প্রচার ও মেয়াদোত্তীর্ণকরণ একটি নির্ধারিত
সময়সূচি (Cron) অনুযায়ী স্বয়ংক্রিয়ভাবে সামলায়, ফলে একাধিক সার্ভার নতুন সার্টিফিকেটের সাথে সম্পূর্ণ সিঙ্ক হওয়ার আগেই
ইস্যু হওয়া টোকেন যাচাইয়ে ব্যর্থ হওয়ার দুর্ঘটনা ছাড়াই নিরাপদে কী রোটেট করা যায়।
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">সামগ্রিক আর্কিটেকচার</div>

<ArchFlow
    :user="{label: 'ব্যবহারকারী', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['মেয়াদ অনুযায়ী সার্টিফিকেট তৈরি', 'মেয়াদোত্তীর্ণগুলো পরিষ্কার']}"
    :service="{servers: [
        {label: 'লগইন সার্ভার', kind: 'issuer', icon: 'login',
         request: 'লগইন অনুরোধ', response: 'সার্টিফিকেট দিয়ে DAT ইস্যু', sync: 'ইস্যু-যোগ্য সার্টিফিকেট সিঙ্ক'},
        {label: 'কনটেন্ট সার্ভার', kind: 'verifier', icon: 'apps',
         request: 'DAT দিয়ে কনটেন্ট অনুরোধ', response: 'DAT যাচাই করে সেবা প্রদান', sync: 'শুধু যাচাইয়ের সার্টিফিকেট সিঙ্ক'},
    ]}"
/>

<div class="hero-desc">
ইস্যু করার উপযোগী সার্টিফিকেট কেবল লগইন সার্ভারই পায়; কনটেন্ট সার্ভারগুলো শুধু যাচাইয়ের সার্টিফিকেট পেয়ে আসা DAT পরীক্ষা করে।
ব্যবহারকারীকে একটিমাত্র সার্ভিসের সাথেই কাজ করতে হয়, আর কনটেন্ট সার্ভারের লগইন সার্ভারের সাথে কথা বলার দরকার পড়ে না।
</div>

<div class="section-title">টোকেন কাঠামো</div>

<WireFormat
    hint="প্রতিটি ফিল্ডের উপর মাউস রাখলে বিবরণ দেখা যাবে।"
    :segments="[
        {name: 'expire', type: 'uint64 (দশমিক)', kind: 'meta', note: 'টোকেনের মেয়াদ শেষের সময় — স্পেসিফিকেশনে বাধ্যতামূলক করা আছে।'},
        {name: 'cid', type: 'uint64 (হেক্স)', kind: 'meta', note: 'যাচাইয়ে ব্যবহৃত সার্টিফিকেট ID।'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'যে কেউ পড়তে পারে এমন প্রকাশ্য ডেটা।'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM দিয়ে এনক্রিপ্ট করা ডেটা।'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'আগের চারটি ফিল্ডের সম্পূর্ণ অংশের উপর স্বাক্ষর।'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} ডিপ্লয়মেন্ট গাইড</div>
        <div class="cta-desc">Kubernetes (মাল্টি-পড) · Docker · বাইনারি (Linux, macOS, Windows) — এখনই রান কমান্ড তৈরি করুন</div>
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
