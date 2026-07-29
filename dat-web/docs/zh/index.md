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
    {icon: '⚡', title: '二进制帧协议', desc: '从底层开始采用定长二进制字段设计，直接按字节偏移读取，无需解析过程——以最小的开销签发和验证，完全不涉及JSON编解码。'},
    {icon: '🔐', title: '强制密钥轮换', desc: '证书按固定周期自动轮换，下一张证书总是在当前证书过期前就已就绪——从结构上杜绝了JWT式的密钥长期不变的事故。'},
    {icon: '⏱️', title: '签发窗口与TTL分离', desc: '证书的签发窗口与令牌的有效期（TTL）是分开跟踪的，因此即使证书已停止签发新令牌，已签发的令牌仍会持续验证直到其TTL耗尽。'},
    {icon: '🌐', title: '主流语言原生客户端', desc: '为Rust、Java/Kotlin、JavaScript/TypeScript、Python、Go、C#、Ruby和C/C++提供官方客户端，每种客户端都具备该语言的惯用API。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT（Distributed Access Token）是一种分布式认证令牌——所有签发或验证会话的服务器只需遵循同一套规范即可。它基于定长二进制
字段构建，直接按偏移量读写，无需解析过程；协议本身将签发窗口与TTL分离，使证书轮换（密钥轮换）可以独立于语言或实现方式强制执行。
</div>

<div class="hero-desc">
DAT证书管理服务（CMS）按照预定的cron任务在整个集群范围内生成、传播和使证书过期，因此即使其他服务器尚未完全同步到新证书，
密钥也能安全轮换，而不会导致任何已签发的令牌验证失败。
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
        <div class="cta-title">{{t('dat_cms')}} 部署指南</div>
        <div class="cta-desc">Kubernetes（多副本）· Docker · 二进制文件（Linux、macOS、Windows）— 现在就生成运行命令</div>
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
