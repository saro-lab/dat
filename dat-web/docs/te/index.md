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
    {icon: '⏱️', title: 'గడువు స్పెసిఫికేషన్‌లో భాగం', desc: 'ప్రతి DATకు గడువు సమయం ఉంటుంది. ప్రతి అప్లికేషన్ టోకెన్ జీవితకాలాన్ని విడిగా నిర్వచించదు.'},
    {icon: '🔏', title: 'బహిరంగ మరియు గుప్తీకరించిన ప్రాంతాలు వేరు', desc: 'రూటింగ్‌కు అవసరమైన విలువలను plainలో, బయటకు కనిపించకూడని విలువలను secureలో ఉంచాలి.'},
    {icon: '🔑', title: 'సర్టిఫికేట్ కీని ఎంచుకుంటుంది', desc: 'టోకెన్‌లోని cid ధృవీకరించాల్సిన సర్టిఫికేట్‌ను సూచిస్తుంది. కీ మార్పిడి సమయంలో కూడా పాత టోకెన్‌లను ధృవీకరించవచ్చు.'},
    {icon: '🌐', title: 'సేవలు ఒకదానిని మరొకటి నేరుగా సంప్రదించవు', desc: 'ప్రతి సేవ ఒకే సర్టిఫికేట్‌లను కలిగి ఉంటే, జారీ సర్వర్ మరియు ధృవీకరణ సర్వర్‌ను విడిగా నిర్వహించవచ్చు.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT అనేది పలు సేవలు ఒకే స్పెసిఫికేషన్‌తో జారీ చేసి ధృవీకరించే యాక్సెస్ టోకెన్. టోకెన్‌లో గడువు సమయం, సర్టిఫికేట్ ID,
బహిరంగ డేటా, గుప్తీకరించిన డేటా మరియు సంతకం ఉంటాయి. ధృవీకరణ సర్వర్ ప్రతిసారి జారీ సర్వర్‌ను అడగకుండా, తన వద్ద ఉన్న సర్టిఫికేట్‌తో టోకెన్‌ను తనిఖీ చేస్తుంది.
</div>

<div class="hero-desc">
సర్టిఫికేట్ టోకెన్ సంతకం మరియు గుప్తీకరణ విధానాలు, కీలు, జారీ వ్యవధి మరియు TTLను ఒకటిగా కూర్చుతుంది. DAT CMSను ఉపయోగిస్తే ప్రతి సేవకు
సర్టిఫికేట్‌లను నేరుగా పంపిణీ చేయకుండా, జారీ కోసం లేదా ధృవీకరణ కోసం మాత్రమే ఉపయోగించే సర్టిఫికేట్‌లను సమకాలీకరించవచ్చు.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">వినియోగ ప్రవాహం</div>

<ArchFlow
    :user="{label: 'వినియోగదారు', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['సర్టిఫికేట్ సృష్టి మరియు నిల్వ', 'సేవలకు సర్టిఫికేట్‌ల పంపిణీ']}"
    :service="{servers: [
        {label: 'జారీ సేవ', kind: 'issuer', icon: 'login', request: 'ప్రామాణీకరణ అభ్యర్థన', response: 'DAT జారీ', sync: 'జారీ చేయగల సర్టిఫికేట్‌ల సమకాలీకరణ'},
        {label: 'ధృవీకరణ సేవ', kind: 'verifier', icon: 'apps', request: 'DATతో అభ్యర్థన', response: 'ధృవీకరణ తరువాత ప్రతిస్పందన', sync: 'ధృవీకరణ-మాత్రమే సర్టిఫికేట్‌ల సమకాలీకరణ'},
    ]}"
/>

<div class="hero-desc">
జారీ సేవ పూర్తి సర్టిఫికేట్‌తో DATను సృష్టిస్తుంది; ధృవీకరణ సేవ ధృవీకరణ-మాత్రమే సర్టిఫికేట్‌తో DATను తనిఖీ చేస్తుంది.
DAT CMS ఐచ్ఛికం. సర్టిఫికేట్‌లను నేరుగా పంపిణీ చేసే పరిసరాల్లో క్లయింట్ స్థానిక మేనేజర్‌ను మాత్రమే ఉపయోగించవచ్చు.
</div>

<div class="section-title">DAT నిర్మాణం</div>

<WireFormat
    hint="వివరణ చూడటానికి ప్రతి ఫీల్డ్‌పై మౌస్‌ను ఉంచండి."
    :segments="[
        {name: 'expire', type: 'uint64 (దశాంశం)', kind: 'meta', note: 'DAT గడువు ముగిసే Unix time.'},
        {name: 'cid', type: 'uint64 (హెక్సాడెసిమల్)', kind: 'meta', note: 'ధృవీకరణకు ఉపయోగించే సర్టిఫికేట్ ID.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'గుప్తీకరించని బహిరంగ బైట్‌లు.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCMతో రక్షించిన బైట్‌లు.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'ముందరి ఫీల్డ్‌లన్నింటినీ ధృవీకరించే సంతకం.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">ముందుగా DAT గురించి తెలుసుకోండి</div>
        <div class="cta-desc">టోకెన్, సర్టిఫికేట్, జారీ సేవ మరియు ధృవీకరణ సేవ పాత్రలను క్రమంగా వివరిస్తుంది.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">లైబ్రరీలు</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
