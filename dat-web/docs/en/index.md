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
    {icon: '⚡', title: 'Binary Frame Protocol', desc: 'Designed from the ground up with fixed-width binary fields, read straight off byte offsets with no parsing pass — issued and verified with minimal overhead, no JSON encoding/decoding involved.'},
    {icon: '🔐', title: 'Mandatory Key Rolling', desc: 'Certificates rotate automatically on a fixed schedule, with the next certificate always ready before the current one expires — structurally ruling out the JWT-style incident where a key stays unchanged for years.'},
    {icon: '⏱️', title: 'Issuance Window vs. TTL', desc: "A certificate's issuance window and a token's validity period (TTL) are tracked separately, so tokens already issued keep verifying until their TTL runs out even after the certificate stops issuing new ones."},
    {icon: '🌐', title: 'Native Clients for Major Languages', desc: 'Official clients for Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, and C/C++, each with an idiomatic API for its language.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) is a distributed authentication token — every server issuing or verifying sessions
only needs to agree on a single specification. Built on fixed-width binary fields, it reads and writes directly by
offset with no parsing pass, and the protocol itself separates issuance windows from TTL so certificate rotation
(key rolling) can be enforced independently of language or implementation.
</div>

<div class="hero-desc">
The DAT Certificate Management Service (CMS) generates, propagates, and expires certificates across the whole
cluster on a scheduled cron job, so keys can rotate safely without any already-issued token ever failing
verification while other servers are still catching up on the new certificate.
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

<div class="section-title">{{t('example')}}</div>

</div>

<DatExample />
