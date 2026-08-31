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
    {icon: '⏱️', title: 'Expiration is part of the specification', desc: 'Every DAT has an expiration time. Token lifetime is not interpreted separately by each application.'},
    {icon: '🔏', title: 'Public and encrypted regions are separate', desc: 'Put values needed for routing in plain, and values that must not be exposed in secure.'},
    {icon: '🔑', title: 'Certificates select keys', desc: 'The token\'s cid points to the certificate used for verification. Existing tokens remain verifiable while keys are rotated.'},
    {icon: '🌐', title: 'Services do not query one another', desc: 'When each service holds the same certificates, issuing and verifying servers can operate separately.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT is an access token that multiple services issue and verify under the same specification. A token contains an expiration time,
certificate ID, public data, encrypted data, and a signature. A verifying server checks the token with its own certificate instead of asking the issuing server every time.
</div>

<div class="hero-desc">
A certificate combines the token's signature and encryption methods, keys, issuance period, and TTL. With DAT CMS, services can synchronize
full or verify-only certificates instead of distributing certificates themselves.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">How it works</div>

<ArchFlow
    :user="{label: 'User', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Create and store certificates', 'Distribute certificates to services']}"
    :service="{servers: [
        {label: 'Issuing service', kind: 'issuer', icon: 'login', request: 'Authentication request', response: 'Issue DAT', sync: 'Synchronize issuable certificates'},
        {label: 'Verifying service', kind: 'verifier', icon: 'apps', request: 'Request with DAT', response: 'Respond after verification', sync: 'Synchronize verify-only certificates'},
    ]}"
/>

<div class="hero-desc">
The issuing service creates DATs with full certificates, while the verifying service checks them with verify-only certificates.
DAT CMS is optional; environments that distribute certificates directly can use only the client's local manager.
</div>

<div class="section-title">DAT structure</div>

<WireFormat
    hint="Hover over each field to see its description."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'The Unix time when the DAT expires.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'The certificate ID used for verification.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Public bytes that are not encrypted.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes protected with AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'The signature that verifies all preceding fields.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Start with DAT</div>
        <div class="cta-desc">Learn the roles of tokens, certificates, issuing services, and verifying services in order.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Libraries</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
