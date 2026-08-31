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
    {icon: '⏱️', title: 'মেয়াদ শেষ হওয়া স্পেসিফিকেশনের অংশ', desc: 'প্রতিটি DAT-এর মেয়াদ শেষ হওয়ার সময় আছে। প্রতিটি অ্যাপ্লিকেশন আলাদাভাবে টোকেনের আয়ু ব্যাখ্যা করে না।'},
    {icon: '🔏', title: 'পাবলিক ও এনক্রিপ্ট করা অঞ্চল আলাদা', desc: 'রাউটিংয়ের প্রয়োজনীয় মান plain-এ এবং প্রকাশ করা যাবে না এমন মান secure-এ রাখুন।'},
    {icon: '🔑', title: 'সার্টিফিকেট কী নির্বাচন করে', desc: 'টোকেনের cid যাচাইয়ের সার্টিফিকেট নির্দেশ করে। কী পরিবর্তনের সময়ও বিদ্যমান টোকেন যাচাইযোগ্য থাকে।'},
    {icon: '🌐', title: 'সার্ভিসগুলো একে অপরকে জিজ্ঞাসা করে না', desc: 'প্রতিটি সার্ভিস একই সার্টিফিকেট রাখলে ইস্যু ও যাচাইকারী সার্ভার আলাদাভাবে কাজ করতে পারে।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT হলো একটি access token যা একাধিক সার্ভিস একই স্পেসিফিকেশন অনুযায়ী ইস্যু ও যাচাই করে। টোকেনে মেয়াদ শেষ হওয়ার সময়,
সার্টিফিকেট ID, পাবলিক ডেটা, এনক্রিপ্ট করা ডেটা এবং স্বাক্ষর থাকে। যাচাইকারী সার্ভার প্রতিবার ইস্যুকারী সার্ভারকে না জিজ্ঞেস করে নিজের সার্টিফিকেট দিয়ে টোকেন যাচাই করে।
</div>

<div class="hero-desc">
একটি সার্টিফিকেটে টোকেনের স্বাক্ষর ও এনক্রিপশন পদ্ধতি, কী, ইস্যুর সময়কাল এবং TTL থাকে। DAT CMS ব্যবহার করে সার্ভিসগুলো
নিজেরা সার্টিফিকেট বিতরণ না করে পূর্ণ বা verify-only সার্টিফিকেট সিঙ্ক্রোনাইজ করতে পারে।
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">এটি যেভাবে কাজ করে</div>

<ArchFlow
    :user="{label: 'ব্যবহারকারী', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['সার্টিফিকেট তৈরি ও সংরক্ষণ', 'সার্ভিসে সার্টিফিকেট বিতরণ']}"
    :service="{servers: [
        {label: 'ইস্যুকারী সার্ভিস', kind: 'issuer', icon: 'login', request: 'প্রমাণীকরণ অনুরোধ', response: 'DAT ইস্যু', sync: 'ইস্যুযোগ্য সার্টিফিকেট সিঙ্ক্রোনাইজ'},
        {label: 'যাচাইকারী সার্ভিস', kind: 'verifier', icon: 'apps', request: 'DAT-সহ অনুরোধ', response: 'যাচাইয়ের পর উত্তর', sync: 'verify-only সার্টিফিকেট সিঙ্ক্রোনাইজ'},
    ]}"
/>

<div class="hero-desc">
ইস্যুকারী সার্ভিস পূর্ণ সার্টিফিকেট দিয়ে DAT তৈরি করে, আর যাচাইকারী সার্ভিস verify-only সার্টিফিকেট দিয়ে তা যাচাই করে।
DAT CMS ঐচ্ছিক; সরাসরি সার্টিফিকেট বিতরণকারী পরিবেশে শুধু ক্লায়েন্টের স্থানীয় ম্যানেজার ব্যবহার করা যায়।
</div>

<div class="section-title">DAT-এর গঠন</div>

<WireFormat
    hint="বর্ণনা দেখতে প্রতিটি ফিল্ডের ওপর পয়েন্টার রাখুন।"
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'DAT মেয়াদ শেষ হওয়ার Unix সময়।'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'যাচাইয়ে ব্যবহৃত সার্টিফিকেট ID।'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'এনক্রিপ্ট না করা পাবলিক bytes।'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM দিয়ে সুরক্ষিত bytes।'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'আগের সব ফিল্ড যাচাইকারী স্বাক্ষর।'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT দিয়ে শুরু করুন</div>
        <div class="cta-desc">টোকেন, সার্টিফিকেট, ইস্যুকারী ও যাচাইকারী সার্ভিসের ভূমিকা ক্রমানুসারে জানুন।</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">লাইব্রেরি</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
