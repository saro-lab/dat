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
    {icon: '⏱️', title: 'காலாவதி விவரக்குறிப்பில் அடங்கியுள்ளது', desc: 'ஒவ்வொரு DAT-க்கும் காலாவதி நேரம் உண்டு. ஒவ்வொரு பயன்பாடும் டோக்கன் ஆயுளைத் தனியாக விளக்க வேண்டியதில்லை.'},
    {icon: '🔏', title: 'பொதுப் பகுதியையும் மறையாக்கப்பட்ட பகுதியையும் பிரிக்கிறது', desc: 'வழிசெலுத்தலுக்குத் தேவையான மதிப்புகளை plain-லும், வெளிப்படக்கூடாத மதிப்புகளை secure-லும் வைக்கவும்.'},
    {icon: '🔑', title: 'சான்றிதழ் மூலம் விசையைத் தேர்ந்தெடுக்கிறது', desc: 'டோக்கனின் cid சரிபார்ப்பதற்கான சான்றிதழைச் சுட்டுகிறது. விசை மாற்றத்தின்போதும் பழைய டோக்கன்களைச் சரிபார்க்க முடியும்.'},
    {icon: '🌐', title: 'சேவைகள் ஒன்றையொன்று நேரடியாக வினவுவதில்லை', desc: 'ஒவ்வொரு சேவையிடமும் அதே சான்றிதழ் இருந்தால், வழங்கும் சேவையையும் சரிபார்க்கும் சேவையையும் தனித்தனியாக இயக்கலாம்.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT என்பது பல சேவைகள் ஒரே விவரக்குறிப்பின்படி வழங்கிச் சரிபார்க்கும் அணுகல் டோக்கனாகும். டோக்கனில் காலாவதி நேரம், சான்றிதழ் ID,
பொதுத் தரவு, மறையாக்கப்பட்ட தரவு மற்றும் கையொப்பம் உள்ளன. சரிபார்ப்புச் சேவை ஒவ்வொரு முறையும் வழங்கும் சேவையை வினவாமல், தன்னிடமுள்ள சான்றிதழால் டோக்கனைச் சரிபார்க்கிறது.
</div>

<div class="hero-desc">
சான்றிதழ் டோக்கனின் கையொப்ப மற்றும் மறையாக்க முறைகள், விசைகள், வழங்கும் காலம் மற்றும் TTL ஆகியவற்றை ஒன்றாகக் கட்டமைக்கிறது. DAT CMS-ஐப் பயன்படுத்தினால், ஒவ்வொரு சேவையிலும்
சான்றிதழ்களை நேரடியாக விநியோகிக்காமல், வழங்குவதற்கான அல்லது சரிபார்ப்பு-மட்டுமான சான்றிதழ்களை ஒத்திசைக்கலாம்.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">பயன்பாட்டு ஓட்டம்</div>

<ArchFlow
    :user="{label: 'பயனர்', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['சான்றிதழ் உருவாக்கம் மற்றும் சேமிப்பு', 'சேவைகளுக்குச் சான்றிதழ்களை வழங்குதல்']}"
    :service="{servers: [
        {label: 'வழங்கும் சேவை', kind: 'issuer', icon: 'login', request: 'அங்கீகரிப்புக் கோரிக்கை', response: 'DAT வழங்குதல்', sync: 'வழங்கக்கூடிய சான்றிதழ்களை ஒத்திசைத்தல்'},
        {label: 'சரிபார்க்கும் சேவை', kind: 'verifier', icon: 'apps', request: 'DAT-உடனான கோரிக்கை', response: 'சரிபார்த்த பின் பதில்', sync: 'சரிபார்ப்பு-மட்டுமான சான்றிதழ்களை ஒத்திசைத்தல்'},
    ]}"
/>

<div class="hero-desc">
வழங்கும் சேவை முழுமையான சான்றிதழைப் பயன்படுத்தி DAT-ஐ உருவாக்கும்; சரிபார்க்கும் சேவை சரிபார்ப்பு-மட்டுமான சான்றிதழால் DAT-ஐச் சரிபார்க்கும்.
DAT CMS விருப்பத் தேர்வாகும். சான்றிதழ்கள் நேரடியாக விநியோகிக்கப்படும் சூழலில் கிளையன்டின் உள்ளூர் மேலாளரை மட்டும் பயன்படுத்தலாம்.
</div>

<div class="section-title">DAT கட்டமைப்பு</div>

<WireFormat
    hint="ஒவ்வொரு புலத்தின் மீதும் சுட்டியை நகர்த்தினால் விளக்கம் தோன்றும்."
    :segments="[
        {name: 'expire', type: 'uint64 (10 அடிமானம்)', kind: 'meta', note: 'DAT காலாவதியாகும் Unix time.'},
        {name: 'cid', type: 'uint64 (16 அடிமானம்)', kind: 'meta', note: 'சரிபார்ப்பிற்குப் பயன்படும் சான்றிதழ் ID.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'மறையாக்கப்படாத பொது பைட்டுகள்.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM-ஆல் பாதுகாக்கப்பட்ட பைட்டுகள்.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'முந்தைய அனைத்துப் புலங்களையும் சரிபார்க்கும் கையொப்பம்.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT பற்றி அறிந்துகொள்ளுங்கள்</div>
        <div class="cta-desc">டோக்கன், சான்றிதழ், வழங்கும் சேவை மற்றும் சரிபார்க்கும் சேவையின் பங்குகள் வரிசையாக விளக்கப்படுகின்றன.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">நூலகங்கள்</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
