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
    {icon: '⚡', title: '二进制帧格式', desc: '采用定长二进制字段设计，无需解析过程，直接按偏移量读取。不涉及 JSON 编解码，以最小的开销完成签发与验证。'},
    {icon: '🔐', title: '强制的密钥轮换', desc: '证书按既定周期自动更换，在过期之前下一张证书总是已经就绪。从结构上杜绝了密钥长期原封不动的 JWT 式运维事故。'},
    {icon: '⏱️', title: '签发期限与 TTL 的分离', desc: '证书的“可签发期限”与“已签发令牌的有效期”相互分离，因此即使证书停止签发之后，已经发出的令牌仍会持续通过验证，直到其 TTL 结束。'},
    {icon: '🌐', title: '主流语言的原生客户端', desc: '可使用 Rust、Java/Kotlin、JavaScript/TypeScript、Python、Go、C#、Ruby、C/C++ 等各语言以惯用 API 提供的官方客户端。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT（Distributed Access Token）是一种分布式认证令牌——所有签发和验证会话的服务器只需共享同一套规范即可。
它基于定长二进制字段设计，无需解析开销即可按偏移量直接读写；并在协议层面将签发期限与 TTL 分离，
使证书更换（密钥轮换）能够独立于语言与实现被强制执行。
</div>

<div class="hero-desc">
DAT 证书管理服务（CMS）会按照预定的调度（Cron）自动处理整个集群的证书生成、传播与过期，
因此可以安全地轮换密钥，而不会发生多台服务器尚未完全同步新证书时已签发的令牌验证失败的事故。
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">整体架构</div>

<ArchFlow
    :user="{label: '用户', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['按有效期生成证书', '清理过期证书']}"
    :service="{servers: [
        {label: '登录服务器', kind: 'issuer', icon: 'login',
         request: '登录请求', response: '用证书签发 DAT', sync: '同步可签发 DAT 的证书'},
        {label: '内容服务器', kind: 'verifier', icon: 'apps',
         request: '携带 DAT 请求内容', response: '验证 DAT 后提供服务', sync: '同步仅供验证的证书'},
    ]}"
/>

<div class="hero-desc">
只有登录服务器会拿到可用于签发的证书，内容服务器只拿到仅供验证的证书，用来核对送来的 DAT。
用户只需面对一个服务，内容服务器也无需与登录服务器直接通信。
</div>

<div class="section-title">令牌结构</div>

<WireFormat
    hint="将鼠标悬停在各字段上即可查看说明。"
    :segments="[
        {name: 'expire', type: 'uint64 (十进制)', kind: 'meta', note: '令牌过期时间 — 由规范强制要求。'},
        {name: 'cid', type: 'uint64 (十六进制)', kind: 'meta', note: '用于验证的证书 ID。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '任何人都可以读取的公开数据。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: '使用 AES-GCM 加密的数据。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '对前面四个字段整体的签名。'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} 部署指南</div>
        <div class="cta-desc">Kubernetes（多 Pod）· Docker · 二进制文件（Linux、macOS、Windows）— 立即生成运行命令</div>
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
