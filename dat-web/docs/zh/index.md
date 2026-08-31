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
    {icon: '⏱️', title: '有效期是规范的一部分', desc: '每个 DAT 都有有效期。各应用无需分别解释令牌寿命。'},
    {icon: '🔏', title: '公开区域与加密区域分离', desc: '路由所需的值放入 plain，不应暴露的值放入 secure。'},
    {icon: '🔑', title: '由证书选择密钥', desc: '令牌的 cid 指向验证所用的证书。轮换密钥时，现有令牌仍可验证。'},
    {icon: '🌐', title: '服务无需相互查询', desc: '只要各服务持有相同证书，签发服务器与验证服务器就可分开运行。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT 是一种由多个服务按同一规范签发和验证的访问令牌。令牌包含有效期、证书 ID、公开数据、加密数据和签名。验证服务器使用自身的证书检查令牌，无需每次询问签发服务器。
</div>

<div class="hero-desc">
证书将令牌的签名与加密方法、密钥、签发期间和 TTL 组合在一起。使用 DAT CMS，服务可同步完整证书或仅验证证书，而无需自行分发证书。
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">工作方式</div>

<ArchFlow
    :user="{label: '用户', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['创建并存储证书', '向服务分发证书']}"
    :service="{servers: [
        {label: '签发服务', kind: 'issuer', icon: 'login', request: '认证请求', response: '签发 DAT', sync: '同步可签发证书'},
        {label: '验证服务', kind: 'verifier', icon: 'apps', request: '携带 DAT 的请求', response: '验证后响应', sync: '同步仅验证证书'},
    ]}"
/>

<div class="hero-desc">
签发服务使用完整证书创建 DAT，验证服务使用仅验证证书检查 DAT。DAT CMS 是可选的；直接分发证书的环境可仅使用客户端本地管理器。
</div>

<div class="section-title">DAT 结构</div>

<WireFormat
    hint="将鼠标悬停在各字段上可查看说明。"
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'DAT 过期的 Unix 时间。'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: '验证所用的证书 ID。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '未加密的公开字节。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: '由 AES-GCM 保护的字节。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '验证前面所有字段的签名。'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">开始使用 DAT</div>
        <div class="cta-desc">依次了解令牌、证书、签发服务和验证服务的作用。</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">库</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
