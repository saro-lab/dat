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
    {icon: '⚡', title: 'バイナリフレームプロトコル', desc: '固定長のバイナリフィールドでゼロから設計されており、パース処理なしでバイトオフセットから直接読み取ります。JSONのエンコード/デコードを介さず、最小限のオーバーヘッドで発行・検証します。'},
    {icon: '🔐', title: '必須のキーローリング', desc: '証明書は決められたスケジュールで自動的にローテーションされ、現在の証明書が失効する前に次の証明書が常に準備されています。キーが何年も変わらないというJWT特有のインシデントを構造的に防ぎます。'},
    {icon: '⏱️', title: '発行期間とTTLの分離', desc: '証明書の発行可能期間とトークンの有効期間(TTL)は別々に管理されるため、証明書が新規発行を停止した後も、既に発行済みのトークンはTTLが切れるまで検証され続けます。'},
    {icon: '🌐', title: '主要言語向けネイティブクライアント', desc: 'Rust、Java/Kotlin、JavaScript/TypeScript、Python、Go、C#、Ruby、C/C++向けの公式クライアントを、それぞれの言語に自然なAPIで提供します。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT（Distributed Access Token）は分散認証トークンです。セッションを発行・検証するすべてのサーバーは、単一の仕様に従うだけで済みます。
固定長のバイナリフィールドを基盤に設計されており、パース処理なしでオフセットから直接読み書きします。プロトコル自体が発行期間とTTLを
分離しているため、証明書のローテーション（キーローリング）を言語や実装に関係なく強制できます。
</div>

<div class="hero-desc">
DAT Certificate Management Service（CMS）は、スケジュールされたcronジョブに従ってクラスタ全体の証明書を生成・伝播・失効させます。
そのため、他のサーバーが新しい証明書に完全に同期する前に、発行済みのトークンが検証に失敗することなく、安全にキーをローテーションできます。
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
        <div class="cta-title">{{t('dat_cms')}} デプロイガイド</div>
        <div class="cta-desc">Kubernetes（マルチPod）・Docker・バイナリ（Linux、macOS、Windows）— 今すぐ実行コマンドを生成</div>
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
