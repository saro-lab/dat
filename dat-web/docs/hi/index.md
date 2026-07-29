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
    {icon: '⚡', title: 'बाइनरी फ़्रेम प्रोटोकॉल', desc: 'शुरू से ही निश्चित-चौड़ाई वाले बाइनरी फ़ील्ड्स के साथ डिज़ाइन किया गया, बिना किसी पार्सिंग चरण के सीधे बाइट ऑफ़सेट से पढ़ा जाता है — बिना किसी JSON एन्कोडिंग/डिकोडिंग के, न्यूनतम ओवरहेड के साथ जारी और सत्यापित किया जाता है।'},
    {icon: '🔐', title: 'अनिवार्य की रोलिंग', desc: 'प्रमाणपत्र एक निश्चित शेड्यूल पर स्वचालित रूप से घूमते हैं, और वर्तमान प्रमाणपत्र समाप्त होने से पहले अगला प्रमाणपत्र हमेशा तैयार रहता है — इससे JWT जैसी उस घटना को संरचनात्मक रूप से रोका जाता है जहाँ एक कुंजी वर्षों तक अपरिवर्तित रहती है।'},
    {icon: '⏱️', title: 'जारी करने की अवधि और TTL का पृथक्करण', desc: 'किसी प्रमाणपत्र की जारी करने की अवधि और टोकन की वैधता अवधि (TTL) को अलग-अलग ट्रैक किया जाता है, ताकि प्रमाणपत्र के नए टोकन जारी करना बंद करने के बाद भी, पहले से जारी टोकन उनके TTL समाप्त होने तक सत्यापित होते रहें।'},
    {icon: '🌐', title: 'प्रमुख भाषाओं के लिए नेटिव क्लाइंट', desc: 'Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby और C/C++ के लिए आधिकारिक क्लाइंट, प्रत्येक अपनी भाषा के अनुरूप API के साथ।'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) एक वितरित प्रमाणीकरण टोकन है — सत्र जारी करने या सत्यापित करने वाले हर सर्वर को केवल
एक ही विनिर्देश पर सहमत होना होता है। यह निश्चित-चौड़ाई वाले बाइनरी फ़ील्ड्स पर आधारित है, बिना किसी पार्सिंग चरण
के सीधे ऑफ़सेट से पढ़ता-लिखता है, और प्रोटोकॉल स्वयं जारी करने की अवधि को TTL से अलग रखता है ताकि प्रमाणपत्र
रोटेशन (की रोलिंग) को भाषा या कार्यान्वयन से स्वतंत्र रूप से लागू किया जा सके।
</div>

<div class="hero-desc">
DAT प्रमाणपत्र प्रबंधन सेवा (CMS) एक निर्धारित cron कार्य के अनुसार पूरे क्लस्टर में प्रमाणपत्र बनाती, प्रसारित
करती और समाप्त करती है, ताकि कुंजियाँ सुरक्षित रूप से घूम सकें और पहले से जारी कोई भी टोकन तब तक सत्यापन में विफल
न हो जब तक अन्य सर्वर नए प्रमाणपत्र के साथ पूरी तरह सिंक न हो जाएँ।
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
        <div class="cta-title">{{t('dat_cms')}} परिनियोजन गाइड</div>
        <div class="cta-desc">Kubernetes (मल्टी-पॉड) · Docker · बाइनरी (Linux, macOS, Windows) — अभी एक रन कमांड जनरेट करें</div>
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
