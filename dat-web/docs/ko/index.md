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
    {icon: '⚡', title: '바이너리 프레임 포맷', desc: '고정폭 바이너리 필드로 설계되어 파싱 과정 없이 오프셋으로 바로 읽습니다. JSON 인코딩/디코딩 없이 최소한의 오버헤드로 발급하고 검증합니다.'},
    {icon: '🔐', title: '의무적인 키 롤링', desc: '인증서가 정해진 주기로 자동 교체되며, 만료되기 전에 항상 다음 인증서가 준비됩니다. 키가 오래도록 그대로 남아있는 JWT식 운영 사고를 구조적으로 차단합니다.'},
    {icon: '⏱️', title: '발급 기간과 TTL의 분리', desc: '인증서의 "발급 가능 기간"과 "발급된 토큰의 유효 기간"이 분리되어 있어, 인증서가 발급을 멈춘 뒤에도 이미 나간 토큰은 TTL이 끝날 때까지 계속 검증됩니다.'},
    {icon: '🌐', title: '주요 언어 네이티브 클라이언트', desc: 'Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, C/C++ 등 각 언어의 관용적인 API로 제공되는 공식 클라이언트를 사용할 수 있습니다.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT(Distributed Access Token)는 세션을 발급하고 검증하는 모든 서버가 하나의 규격만 공유하면 되는 분산 인증 토큰입니다.
바이너리 고정폭 필드를 기반으로 설계되어 파싱 비용 없이 오프셋으로 직접 읽고 쓰며, 인증서 교체(키 롤링)를 언어·구현체와
무관하게 강제할 수 있도록 프로토콜 차원에서 발급 기간과 TTL을 분리해 두었습니다.
</div>

<div class="hero-desc">
DAT Certificate Management Service(CMS)가 클러스터 전체의 인증서 생성·전파·만료를 예약된 스케줄(Cron)에 따라
자동으로 처리하기 때문에, 여러 서버가 새 인증서를 완전히 동기화하기 전에 발급된 토큰이 검증에 실패하는 사고 없이
안전하게 키를 순환시킬 수 있습니다.
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
        <div class="cta-title">{{t('dat_cms')}} 배포 가이드</div>
        <div class="cta-desc">Kubernetes(다중 Pod) · Docker · 바이너리(Linux, macOS, Windows) — 지금 바로 실행 명령어 생성</div>
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
