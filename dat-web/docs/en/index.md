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
    {icon: '⚡', title: 'Binary Frame Format', desc: 'Designed around fixed-width binary fields, read straight off byte offsets with no parsing pass. Issued and verified with minimal overhead, no JSON encoding or decoding involved.'},
    {icon: '🔐', title: 'Mandatory Key Rolling', desc: 'Certificates rotate automatically on a fixed schedule, and the next certificate is always ready before the current one expires. This structurally rules out the JWT-style operational incident where a key stays unchanged for years.'},
    {icon: '⏱️', title: 'Issuance Window Separated from TTL', desc: 'A certificate\'s "issuance window" and the "validity period of the tokens it issues" are separate values, so tokens already issued keep verifying until their TTL runs out even after the certificate stops issuing new ones.'},
    {icon: '🌐', title: 'Native Clients for Major Languages', desc: 'Official clients are available for Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, and C/C++, each exposed through an API idiomatic to its language.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) is a distributed authentication token: every server that issues or verifies sessions
only needs to share a single specification. It is built on fixed-width binary fields, so values are read and written
directly by offset with no parsing cost, and the protocol itself separates the issuance window from the TTL so that
certificate rotation (key rolling) can be enforced regardless of language or implementation.
</div>

<div class="hero-desc">
The DAT Certificate Management Service (CMS) automatically handles the creation, propagation, and expiration of
certificates across the entire cluster on a scheduled cron job, so keys can be rotated safely without tokens
failing verification because several servers have not finished synchronizing the new certificate yet.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Overall Architecture</div>

<ArchFlow
    :user="{label: 'User', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Creates certificates per validity window', 'Clears out expired ones']}"
    :service="{servers: [
        {label: 'Login server', kind: 'issuer', icon: 'login',
         request: 'Login request', response: 'Issues a DAT with the certificate', sync: 'DAT-issuing certificate sync'},
        {label: 'Content servers', kind: 'verifier', icon: 'apps',
         request: 'Content request with DAT', response: 'Verifies the DAT, then serves', sync: 'Verify-only certificate sync'},
    ]}"
/>

<div class="hero-desc">
Only the login server gets certificates it can issue with; the content servers get verify-only
certificates and just check the DAT that comes in. The user deals with a single service, and a content
server never has to talk to the login server.
</div>

<div class="section-title">Token Structure</div>

<WireFormat
    hint="Hover over a field to see its description."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Token expiration time — mandated by the specification.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID of the certificate to verify with.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Public data that anyone can read.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Data encrypted with AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature over all four preceding fields.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} Deployment Guide</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binary (Linux, macOS, Windows) — generate a run command right now</div>
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
