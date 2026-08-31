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
    {icon: '⏱️', title: 'कालबाह्यता ही तपशिलाचा भाग आहे', desc: 'प्रत्येक DAT ला कालबाह्य होण्याची वेळ असते. प्रत्येक अॅप्लिकेशनला टोकनचा कालावधी स्वतंत्रपणे समजावा लागत नाही.'},
    {icon: '🔏', title: 'सार्वजनिक आणि कूटबद्ध क्षेत्रे वेगळी आहेत', desc: 'रूटिंगसाठी लागणारी मूल्ये plain मध्ये आणि उघड होऊ नयेत अशी मूल्ये secure मध्ये ठेवा.'},
    {icon: '🔑', title: 'की प्रमाणपत्राने निवडली जाते', desc: 'टोकनमधील cid पडताळणीसाठीचे प्रमाणपत्र दाखवते. की बदलत असतानाही जुन्या टोकनची पडताळणी करता येते.'},
    {icon: '🌐', title: 'सेवा थेट एकमेकांना विचारत नाहीत', desc: 'प्रत्येक सेवेकडे समान प्रमाणपत्रे असल्यास जारीकर्ता आणि पडताळणी सर्व्हर स्वतंत्रपणे चालवता येतात.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT हे अनेक सेवा समान तपशिलानुसार जारी करतात आणि पडताळतात असे अॅक्सेस टोकन आहे. टोकनमध्ये कालबाह्यता वेळ, प्रमाणपत्र ID,
सार्वजनिक डेटा, कूटबद्ध डेटा आणि सही असते. पडताळणी सर्व्हर प्रत्येक वेळी जारीकर्ता सर्व्हरला विचारत नाही; तो स्वतःकडील प्रमाणपत्राने टोकन तपासतो.
</div>

<div class="hero-desc">
प्रमाणपत्र टोकनची सही आणि कूटबद्धीकरण पद्धत, की, जारी कालावधी आणि TTL एकत्र बांधते. DAT CMS वापरल्यास प्रत्येक सेवेला प्रमाणपत्रे स्वतः वितरित करण्याऐवजी
जारी करता येणारी किंवा केवळ पडताळणीसाठीची प्रमाणपत्रे समकालित करता येतात.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">वापराचा प्रवाह</div>

<ArchFlow
    :user="{label: 'वापरकर्ता', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['प्रमाणपत्र तयार करणे आणि साठवणे', 'सेवेला प्रमाणपत्रे देणे']}"
    :service="{servers: [
        {label: 'जारी सेवा', kind: 'issuer', icon: 'login', request: 'प्रमाणीकरण विनंती', response: 'DAT जारी', sync: 'जारीयोग्य प्रमाणपत्र समकालित'},
        {label: 'पडताळणी सेवा', kind: 'verifier', icon: 'apps', request: 'DAT सह विनंती', response: 'पडताळणीनंतर प्रतिसाद', sync: 'केवळ पडताळणी प्रमाणपत्र समकालित'},
    ]}"
/>

<div class="hero-desc">
जारी सेवा पूर्ण प्रमाणपत्राने DAT बनवते, तर पडताळणी सेवा केवळ-पडताळणी प्रमाणपत्राने DAT तपासते.
DAT CMS ऐच्छिक आहे; ज्या वातावरणात प्रमाणपत्रे थेट वितरित होतात तेथे केवळ क्लायंटचा स्थानिक मॅनेजर वापरता येतो.
</div>

<div class="section-title">DAT रचना</div>

<WireFormat
    hint="प्रत्येक फील्डवर माऊस नेल्यास स्पष्टीकरण दिसते."
    :segments="[
        {name: 'expire', type: 'uint64 (दशमान)', kind: 'meta', note: 'DAT कालबाह्य होण्याची Unix time.'},
        {name: 'cid', type: 'uint64 (षोडशमान)', kind: 'meta', note: 'पडताळणीसाठी वापरावयाचा प्रमाणपत्र ID.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'कूटबद्ध नसलेले सार्वजनिक बाइट्स.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM ने संरक्षित बाइट्स.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'आधीच्या सर्व फील्ड्सची पडताळणी करणारी सही.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT पासून सुरुवात</div>
        <div class="cta-desc">टोकन, प्रमाणपत्र, जारी सेवा आणि पडताळणी सेवेच्या भूमिका क्रमाने स्पष्ट केल्या आहेत.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">लायब्ररी</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
