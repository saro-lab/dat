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
    {icon: '⏱️', title: 'समाप्ति समय विनिर्देश का हिस्सा है', desc: 'हर DAT का एक समाप्ति समय होता है। टोकन की अवधि की व्याख्या प्रत्येक एप्लिकेशन अलग-अलग नहीं करता।'},
    {icon: '🔏', title: 'सार्वजनिक और एन्क्रिप्टेड क्षेत्र अलग हैं', desc: 'रूटिंग के लिए आवश्यक मान plain में और जिन्हें उजागर नहीं करना है वे secure में रखें।'},
    {icon: '🔑', title: 'प्रमाणपत्र कुंजियाँ चुनते हैं', desc: 'टोकन का cid सत्यापन में प्रयुक्त प्रमाणपत्र की ओर संकेत करता है। कुंजियाँ बदलते समय भी मौजूदा टोकन सत्यापित किए जा सकते हैं।'},
    {icon: '🌐', title: 'सेवाएँ एक-दूसरे से पूछताछ नहीं करतीं', desc: 'जब हर सेवा के पास समान प्रमाणपत्र हों, तो जारी करने और सत्यापित करने वाले सर्वर अलग-अलग काम कर सकते हैं।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT एक access token है जिसे कई सेवाएँ एक ही विनिर्देश के अंतर्गत जारी और सत्यापित करती हैं। टोकन में समाप्ति समय,
प्रमाणपत्र ID, सार्वजनिक डेटा, एन्क्रिप्टेड डेटा और हस्ताक्षर होते हैं। सत्यापन सर्वर हर बार जारीकर्ता सर्वर से पूछने के बजाय अपने प्रमाणपत्र से टोकन जाँचता है।
</div>

<div class="hero-desc">
प्रमाणपत्र में टोकन के हस्ताक्षर और एन्क्रिप्शन विधियाँ, कुंजियाँ, जारी करने की अवधि और TTL होते हैं। DAT CMS के साथ सेवाएँ
प्रमाणपत्र स्वयं वितरित करने के बजाय पूर्ण या verify-only प्रमाणपत्र सिंक्रनाइज़ कर सकती हैं।
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">यह कैसे काम करता है</div>

<ArchFlow
    :user="{label: 'उपयोगकर्ता', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['प्रमाणपत्र बनाएँ और संग्रहित करें', 'सेवाओं को प्रमाणपत्र वितरित करें']}"
    :service="{servers: [
        {label: 'जारीकर्ता सेवा', kind: 'issuer', icon: 'login', request: 'प्रमाणीकरण अनुरोध', response: 'DAT जारी करें', sync: 'जारी करने योग्य प्रमाणपत्र सिंक्रनाइज़ करें'},
        {label: 'सत्यापन सेवा', kind: 'verifier', icon: 'apps', request: 'DAT के साथ अनुरोध', response: 'सत्यापन के बाद उत्तर', sync: 'verify-only प्रमाणपत्र सिंक्रनाइज़ करें'},
    ]}"
/>

<div class="hero-desc">
जारीकर्ता सेवा पूर्ण प्रमाणपत्रों से DAT बनाती है, जबकि सत्यापन सेवा उन्हें verify-only प्रमाणपत्रों से जाँचती है।
DAT CMS वैकल्पिक है; प्रमाणपत्र सीधे वितरित करने वाले परिवेश केवल क्लाइंट के स्थानीय मैनेजर का उपयोग कर सकते हैं।
</div>

<div class="section-title">DAT की संरचना</div>

<WireFormat
    hint="विवरण देखने के लिए प्रत्येक फ़ील्ड पर पॉइंटर रखें।"
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'वह Unix समय जब DAT समाप्त होता है।'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'सत्यापन के लिए प्रयुक्त प्रमाणपत्र ID।'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'सार्वजनिक bytes जो एन्क्रिप्टेड नहीं हैं।'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM से सुरक्षित bytes।'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'पहले के सभी फ़ील्ड सत्यापित करने वाला हस्ताक्षर।'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT से शुरुआत करें</div>
        <div class="cta-desc">टोकन, प्रमाणपत्र, जारीकर्ता सेवाओं और सत्यापन सेवाओं की भूमिकाएँ क्रम से जानें।</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">लाइब्रेरी</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
