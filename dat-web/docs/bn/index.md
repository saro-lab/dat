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
    {icon: '⚡', title: 'বাইনারি ফ্রেম প্রোটোকল', desc: 'শুরু থেকেই নির্দিষ্ট-প্রস্থের বাইনারি ফিল্ড দিয়ে ডিজাইন করা, কোনো পার্সিং ধাপ ছাড়াই সরাসরি বাইট অফসেট থেকে পড়া হয় — কোনো JSON এনকোডিং/ডিকোডিং ছাড়াই ন্যূনতম ওভারহেডে ইস্যু ও যাচাই করা হয়।'},
    {icon: '🔐', title: 'বাধ্যতামূলক কী রোলিং', desc: 'সার্টিফিকেট একটি নির্দিষ্ট সময়সূচী অনুযায়ী স্বয়ংক্রিয়ভাবে রোটেট হয়, বর্তমান সার্টিফিকেট মেয়াদোত্তীর্ণ হওয়ার আগেই পরবর্তী সার্টিফিকেট সবসময় প্রস্তুত থাকে — এটি কাঠামোগতভাবে সেই JWT-ধাঁচের ঘটনা প্রতিরোধ করে যেখানে একটি কী বছরের পর বছর অপরিবর্তিত থাকে।'},
    {icon: '⏱️', title: 'ইস্যু-উইন্ডো ও TTL-এর পৃথকীকরণ', desc: 'একটি সার্টিফিকেটের ইস্যু-উইন্ডো এবং একটি টোকেনের বৈধতার মেয়াদ (TTL) আলাদাভাবে ট্র্যাক করা হয়, ফলে সার্টিফিকেট নতুন টোকেন ইস্যু বন্ধ করার পরও, ইতিমধ্যে ইস্যু হওয়া টোকেনগুলো তাদের TTL শেষ না হওয়া পর্যন্ত যাচাই হতে থাকে।'},
    {icon: '🌐', title: 'প্রধান ভাষাগুলোর জন্য নেটিভ ক্লায়েন্ট', desc: 'Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby এবং C/C++-এর জন্য অফিসিয়াল ক্লায়েন্ট, প্রতিটি তার নিজ ভাষার উপযোগী API সহ।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) হলো একটি বিতরণকৃত প্রমাণীকরণ টোকেন — সেশন ইস্যু বা যাচাই করা প্রতিটি সার্ভারের শুধু
একটি একক স্পেসিফিকেশনে একমত হলেই চলে। এটি নির্দিষ্ট-প্রস্থের বাইনারি ফিল্ডের উপর নির্মিত, কোনো পার্সিং ধাপ ছাড়াই
সরাসরি অফসেট থেকে পড়ে ও লেখে, এবং প্রোটোকলটি নিজেই ইস্যু-উইন্ডো এবং TTL কে আলাদা রাখে যাতে সার্টিফিকেট রোটেশন
(কী রোলিং) ভাষা বা ইমপ্লিমেন্টেশন নির্বিশেষে বলবৎ করা যায়।
</div>

<div class="hero-desc">
DAT সার্টিফিকেট ম্যানেজমেন্ট সার্ভিস (CMS) একটি নির্ধারিত cron জব অনুযায়ী পুরো ক্লাস্টার জুড়ে সার্টিফিকেট তৈরি,
প্রচার এবং মেয়াদোত্তীর্ণ করে, ফলে অন্যান্য সার্ভার নতুন সার্টিফিকেটের সাথে সম্পূর্ণ সিঙ্ক না হওয়া পর্যন্ত ইতিমধ্যে
ইস্যু হওয়া কোনো টোকেন যাচাইয়ে ব্যর্থ না হয়েই নিরাপদে কী রোটেট করা যায়।
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
        <div class="cta-title">{{t('dat_cms')}} ডিপ্লয়মেন্ট গাইড</div>
        <div class="cta-desc">Kubernetes (মাল্টি-পড) · Docker · বাইনারি (Linux, macOS, Windows) — এখনই একটি রান কমান্ড তৈরি করুন</div>
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
