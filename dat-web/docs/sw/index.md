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
    {icon: '⏱️', title: 'Muda wa kuisha ni sehemu ya kiwango', desc: 'Kila DAT ina muda wa kuisha. Muda wa tokeni hautafsiriwi tofauti kwa kila programu.'},
    {icon: '🔏', title: 'Sehemu wazi na iliyosimbwa kwa njia fiche zimetenganishwa', desc: 'Weka thamani za uelekezaji katika plain, na thamani zisizopaswa kufichuliwa katika secure.'},
    {icon: '🔑', title: 'Cheti huchagua ufunguo', desc: 'cid ya tokeni huelekeza kwenye cheti cha uthibitishaji. Tokeni za zamani bado zinaweza kuthibitishwa wakati funguo zinabadilishwa.'},
    {icon: '🌐', title: 'Huduma haziulizani moja kwa moja', desc: 'Kila huduma ikiwa na vyeti sawa, seva ya utoaji na seva ya uthibitishaji zinaweza kuendeshwa kando.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT ni tokeni ya ufikiaji ambayo huduma nyingi hutoa na kuthibitisha kwa kiwango kilekile. Tokeni ina muda wa kuisha, kitambulisho cha cheti,
data wazi, data iliyosimbwa kwa njia fiche na sahihi. Seva ya uthibitishaji hukagua tokeni kwa cheti ilicho nacho bila kuuliza seva ya utoaji kila mara.
</div>

<div class="hero-desc">
Cheti huunganisha mbinu za kusaini na kusimba, funguo, kipindi cha utoaji na TTL. Kwa DAT CMS, vyeti kamili au vya uthibitishaji pekee
vinaweza kusawazishwa bila kuvisambaza kwa mkono kwa kila huduma.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Mtiririko wa matumizi</div>

<ArchFlow
    :user="{label: 'Mtumiaji', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Kuunda na kuhifadhi vyeti', 'Kupeleka vyeti kwa huduma']}"
    :service="{servers: [
        {label: 'Huduma ya utoaji', kind: 'issuer', icon: 'login', request: 'Ombi la uthibitishaji', response: 'Kutoa DAT', sync: 'Kusawazisha vyeti vinavyoweza kutoa tokeni'},
        {label: 'Huduma ya uthibitishaji', kind: 'verifier', icon: 'apps', request: 'Ombi lenye DAT', response: 'Jibu baada ya uthibitishaji', sync: 'Kusawazisha vyeti vya uthibitishaji pekee'},
    ]}"
/>

<div class="hero-desc">
Huduma ya utoaji huunda DAT kwa cheti kamili, na huduma ya uthibitishaji hukagua DAT kwa cheti cha uthibitishaji pekee.
DAT CMS si lazima; katika mazingira yanayosambaza vyeti moja kwa moja, kidhibiti cha ndani cha mteja pekee kinaweza kutumika.
</div>

<div class="section-title">Muundo wa DAT</div>

<WireFormat
    hint="Elekeza kipanya juu ya sehemu ili kuona maelezo."
    :segments="[
        {name: 'expire', type: 'uint64 (desimali)', kind: 'meta', note: 'Unix time ambapo DAT inaisha.'},
        {name: 'cid', type: 'uint64 (heksadesimali)', kind: 'meta', note: 'Kitambulisho cha cheti cha uthibitishaji.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Baiti wazi zisizosimbwa.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Baiti zinazolindwa kwa AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Sahihi inayothibitisha sehemu zote zilizotangulia.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Anza kuifahamu DAT</div>
        <div class="cta-desc">Inaeleza kwa mpangilio majukumu ya tokeni, cheti, huduma ya utoaji na huduma ya uthibitishaji.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Maktaba</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
