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
    {icon: '⏱️', title: '만료가 규격에 포함됩니다', desc: '모든 DAT에는 만료 시각이 있습니다. 애플리케이션마다 토큰 수명을 따로 해석하지 않습니다.'},
    {icon: '🔏', title: '공개 영역과 암호화 영역을 나눕니다', desc: '라우팅에 필요한 값은 plain에, 외부에 드러나면 안 되는 값은 secure에 넣습니다.'},
    {icon: '🔑', title: '인증서로 키를 선택합니다', desc: '토큰의 cid가 검증할 인증서를 가리킵니다. 키 교체 중에도 기존 토큰을 검증할 수 있습니다.'},
    {icon: '🌐', title: '서비스끼리 직접 조회하지 않습니다', desc: '각 서비스가 같은 인증서를 보유하면 발급 서버와 검증 서버를 분리해서 운영할 수 있습니다.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT는 여러 서비스가 같은 규격으로 발급하고 검증하는 액세스 토큰입니다. 토큰 안에는 만료 시각, 인증서 ID,
공개 데이터, 암호화 데이터와 서명이 들어갑니다. 검증 서버는 발급 서버에 매번 묻지 않고 자신이 가진 인증서로 토큰을 확인합니다.
</div>

<div class="hero-desc">
인증서는 토큰의 서명과 암호화 방법, 키, 발급 기간과 TTL을 하나로 묶습니다. DAT CMS를 사용하면 서비스마다
인증서를 직접 배포하지 않고 발급용 또는 검증 전용 인증서를 동기화할 수 있습니다.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">사용 흐름</div>

<ArchFlow
    :user="{label: '사용자', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['인증서 생성과 보관', '서비스에 인증서 전달']}"
    :service="{servers: [
        {label: '발급 서비스', kind: 'issuer', icon: 'login', request: '인증 요청', response: 'DAT 발급', sync: '발급 가능한 인증서 동기화'},
        {label: '검증 서비스', kind: 'verifier', icon: 'apps', request: 'DAT와 함께 요청', response: '검증 후 응답', sync: '검증 전용 인증서 동기화'},
    ]}"
/>

<div class="hero-desc">
발급 서비스는 전체 인증서로 DAT를 만들고, 검증 서비스는 검증 전용 인증서로 DAT를 확인합니다.
DAT CMS는 선택 사항이며, 인증서를 직접 배포하는 환경에서는 클라이언트의 로컬 매니저만 사용할 수 있습니다.
</div>

<div class="section-title">DAT 구조</div>

<WireFormat
    hint="각 필드에 마우스를 올리면 설명이 표시됩니다."
    :segments="[
        {name: 'expire', type: 'uint64 (10진수)', kind: 'meta', note: 'DAT가 만료되는 Unix time.'},
        {name: 'cid', type: 'uint64 (16진수)', kind: 'meta', note: '검증에 사용할 인증서 ID.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '암호화하지 않는 공개 바이트.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM으로 보호한 바이트.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '앞의 필드 전체를 검증하는 서명.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT부터 알아보기</div>
        <div class="cta-desc">토큰, 인증서, 발급 서비스와 검증 서비스의 역할을 순서대로 설명합니다.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">라이브러리</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
