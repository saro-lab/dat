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
    {icon: '⚡', title: 'बाइनरी फ़्रेम फ़ॉर्मैट', desc: 'निश्चित-चौड़ाई वाले बाइनरी फ़ील्ड्स के साथ डिज़ाइन किया गया है, इसलिए किसी पार्सिंग चरण के बिना सीधे ऑफ़सेट से पढ़ा जाता है। JSON एन्कोडिंग/डिकोडिंग के बिना, न्यूनतम ओवरहेड के साथ जारी और सत्यापित होता है।'},
    {icon: '🔐', title: 'अनिवार्य की रोलिंग', desc: 'प्रमाणपत्र एक निश्चित चक्र पर स्वतः बदलते रहते हैं, और समाप्त होने से पहले अगला प्रमाणपत्र हमेशा तैयार रहता है। इससे वह JWT-शैली की परिचालन दुर्घटना संरचनात्मक रूप से रुक जाती है जिसमें एक कुंजी वर्षों तक वैसी ही पड़ी रहती है।'},
    {icon: '⏱️', title: 'जारी करने की अवधि और TTL का पृथक्करण', desc: 'प्रमाणपत्र की "जारी करने योग्य अवधि" और "जारी किए गए टोकन की वैधता अवधि" अलग-अलग हैं, इसलिए प्रमाणपत्र द्वारा जारी करना बंद कर देने के बाद भी पहले से जारी टोकन अपने TTL के समाप्त होने तक सत्यापित होते रहते हैं।'},
    {icon: '🌐', title: 'प्रमुख भाषाओं के लिए नेटिव क्लाइंट', desc: 'Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, C/C++ आदि के लिए आधिकारिक क्लाइंट उपलब्ध हैं, प्रत्येक अपनी भाषा के अनुरूप API के साथ।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) एक वितरित प्रमाणीकरण टोकन है जिसमें सत्र जारी करने और सत्यापित करने वाले सभी सर्वरों को
केवल एक ही विनिर्देश साझा करना होता है। यह निश्चित-चौड़ाई वाले बाइनरी फ़ील्ड्स पर आधारित है, इसलिए पार्सिंग लागत के बिना
सीधे ऑफ़सेट से पढ़ता-लिखता है, और प्रमाणपत्र रोटेशन (की रोलिंग) को भाषा व कार्यान्वयन से स्वतंत्र रूप से लागू किया जा सके,
इसके लिए प्रोटोकॉल स्तर पर ही जारी करने की अवधि और TTL को अलग रखा गया है।
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) पूरे क्लस्टर के प्रमाणपत्रों का निर्माण, प्रसार और समाप्ति एक निर्धारित
शेड्यूल (Cron) के अनुसार स्वतः संभालती है, इसलिए कई सर्वरों के नए प्रमाणपत्र के साथ पूरी तरह सिंक होने से पहले जारी हुए
टोकन के सत्यापन में विफल होने की दुर्घटना के बिना कुंजियों को सुरक्षित रूप से घुमाया जा सकता है।
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">समग्र संरचना</div>

<ArchFlow
    :user="{label: 'उपयोगकर्ता', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['वैधता अवधि के अनुसार प्रमाणपत्र निर्माण', 'समाप्त प्रमाणपत्रों की सफ़ाई']}"
    :service="{servers: [
        {label: 'लॉगिन सर्वर', kind: 'issuer', icon: 'login',
         request: 'लॉगिन अनुरोध', response: 'प्रमाणपत्र से DAT जारी', sync: 'जारी करने योग्य प्रमाणपत्र सिंक'},
        {label: 'कंटेंट सर्वर', kind: 'verifier', icon: 'apps',
         request: 'DAT के साथ कंटेंट अनुरोध', response: 'DAT सत्यापित कर सेवा', sync: 'केवल सत्यापन प्रमाणपत्र सिंक'},
    ]}"
/>

<div class="hero-desc">
जारी करने योग्य प्रमाणपत्र केवल लॉगिन सर्वर को मिलते हैं; कंटेंट सर्वर को केवल सत्यापन वाले प्रमाणपत्र मिलते हैं जिनसे वे आए हुए DAT की
जाँच करते हैं। उपयोगकर्ता को सिर्फ़ एक सेवा से काम पड़ता है, और कंटेंट सर्वर को लॉगिन सर्वर से बात करने की ज़रूरत कभी नहीं पड़ती।
</div>

<div class="section-title">टोकन संरचना</div>

<WireFormat
    hint="प्रत्येक फ़ील्ड पर माउस ले जाने पर उसका विवरण दिखता है।"
    :segments="[
        {name: 'expire', type: 'uint64 (दशमलव)', kind: 'meta', note: 'टोकन की समाप्ति का समय — विनिर्देश द्वारा अनिवार्य है।'},
        {name: 'cid', type: 'uint64 (हेक्साडेसिमल)', kind: 'meta', note: 'सत्यापन में उपयोग होने वाली प्रमाणपत्र ID।'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'सार्वजनिक डेटा जिसे कोई भी पढ़ सकता है।'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM से एन्क्रिप्ट किया गया डेटा।'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'पिछले चारों फ़ील्ड्स पर किया गया हस्ताक्षर।'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} परिनियोजन गाइड</div>
        <div class="cta-desc">Kubernetes (मल्टी-पॉड) · Docker · बाइनरी (Linux, macOS, Windows) — अभी रन कमांड जनरेट करें</div>
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
