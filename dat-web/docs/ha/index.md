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
    {icon: '⏱️', title: 'Lokacin karewa yana cikin ƙa\'ida', desc: 'Kowane DAT yana da lokacin karewa. Ba a fassara rayuwar token dabam a kowace manhaja.'},
    {icon: '🔏', title: 'An raba fili da ɓoyayyen sashe', desc: 'Saka ƙimomin turawa a plain, sannan ƙimomin da bai kamata a bayyana ba a secure.'},
    {icon: '🔑', title: 'Takardar shaida ce ke zaɓar maɓalli', desc: 'cid na token yana nuna takardar shaidar tabbatarwa. Ana iya tabbatar da tsofaffin token yayin sauya maɓalli.'},
    {icon: '🌐', title: 'Ayyuka ba sa tambayar juna kai tsaye', desc: 'Idan kowane aiki yana da takardun shaida iri ɗaya, ana iya gudanar da sabar bayarwa da sabar tabbatarwa dabam.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT token shiga ne da ayyuka da yawa ke bayarwa kuma suke tabbatarwa bisa ƙa'ida ɗaya. Token ɗin yana ɗauke da lokacin karewa, ID na takardar shaida,
bayanan fili, bayanan da aka ɓoye da sa hannu. Sabar tabbatarwa tana duba token da takardar shaidar da take da ita ba tare da tambayar sabar bayarwa kowane lokaci ba.
</div>

<div class="hero-desc">
Takardar shaida tana haɗa hanyoyin sa hannu da ɓoyewa, maɓallai, lokacin bayarwa da TTL. Da DAT CMS, ana iya daidaita cikakkun takardu ko na tabbatarwa kaɗai
ba tare da rarraba su da hannu ga kowane aiki ba.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Gudanarwar amfani</div>

<ArchFlow
    :user="{label: 'Mai amfani', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Ƙirƙira da adana takardun shaida', 'Isar da takardun shaida ga ayyuka']}"
    :service="{servers: [
        {label: 'Aikin bayarwa', kind: 'issuer', icon: 'login', request: 'Buƙatar tantancewa', response: 'Bayar da DAT', sync: 'Daidaita takardun da za su iya bayarwa'},
        {label: 'Aikin tabbatarwa', kind: 'verifier', icon: 'apps', request: 'Buƙata tare da DAT', response: 'Amsa bayan tabbatarwa', sync: 'Daidaita takardun tabbatarwa kaɗai'},
    ]}"
/>

<div class="hero-desc">
Aikin bayarwa yana yin DAT da cikakkiyar takardar shaida, aikin tabbatarwa kuma yana duba DAT da takardar tabbatarwa kaɗai.
DAT CMS zaɓi ne; a wuraren da ake rarraba takardu kai tsaye, ana iya amfani da manajan gida na abokin ciniki kaɗai.
</div>

<div class="section-title">Tsarin DAT</div>

<WireFormat
    hint="Kai linzamin kwamfuta kan kowane fili don ganin bayani."
    :segments="[
        {name: 'expire', type: 'uint64 (goma)', kind: 'meta', note: 'Unix time da DAT zai kare.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID na takardar shaidar da za a yi amfani da ita.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte na fili da ba a ɓoye ba.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte da AES-GCM ya kare.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Sa hannun da ke tabbatar da duk filayen baya.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Fara fahimtar DAT</div>
        <div class="cta-desc">Yana bayyana matsayin token, takardar shaida, aikin bayarwa da aikin tabbatarwa a jere.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Dakunan karatu</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
