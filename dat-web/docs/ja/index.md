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
    {icon: '⚡', title: 'バイナリフレームフォーマット', desc: '固定幅のバイナリフィールドとして設計されており、パース処理を経ずにオフセットで直接読み取ります。JSON のエンコード/デコードなしに、最小限のオーバーヘッドで発行・検証します。'},
    {icon: '🔐', title: '必須のキーローリング', desc: '証明書が定められた周期で自動的に入れ替わり、有効期限が切れる前に必ず次の証明書が用意されます。キーが長期間そのまま残り続ける JWT 的な運用事故を構造的に防ぎます。'},
    {icon: '⏱️', title: '発行期間と TTL の分離', desc: '証明書の「発行できる期間」と「発行されたトークンの有効期間」が分離されているため、証明書が発行を停止した後も、すでに発行済みのトークンは TTL が尽きるまで検証され続けます。'},
    {icon: '🌐', title: '主要言語のネイティブクライアント', desc: 'Rust、Java/Kotlin、JavaScript/TypeScript、Python、Go、C#、Ruby、C/C++ など、各言語の慣用的な API で提供される公式クライアントを利用できます。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) は、セッションを発行・検証するすべてのサーバーが単一の仕様を共有するだけで済む分散認証トークンです。
バイナリの固定幅フィールドを基盤に設計されているためパースコストなしにオフセットで直接読み書きでき、証明書の交換 (キーローリング) を
言語・実装に依存せず強制できるよう、プロトコルのレベルで発行期間と TTL を分離しています。
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) がクラスタ全体の証明書の生成・伝播・失効をあらかじめ定めたスケジュール (Cron) に従って
自動的に処理するため、複数のサーバーが新しい証明書を完全に同期し終える前に発行されたトークンが検証に失敗するといった事故を起こすことなく、
安全にキーを循環させられます。
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">全体構成</div>

<ArchFlow
    :user="{label: 'ユーザー', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['有効期間ごとに証明書を生成', '期限切れの証明書を整理']}"
    :service="{servers: [
        {label: 'ログインサーバー', kind: 'issuer', icon: 'login',
         request: 'ログイン要求', response: '証明書で DAT を発行', sync: 'DAT 発行可能な証明書の同期'},
        {label: 'コンテンツサーバー', kind: 'verifier', icon: 'apps',
         request: 'DAT でコンテンツ要求', response: 'DAT を検証してサービス提供', sync: 'DAT 検証専用の証明書の同期'},
    ]}"
/>

<div class="hero-desc">
発行可能な証明書を受け取るのはログインサーバーだけで、コンテンツサーバーは検証専用の証明書だけを受け取り、
届いた DAT を確認します。ユーザーはサービス一つだけを相手にすればよく、コンテンツサーバーがログインサーバーと
直接通信する必要もありません。
</div>

<div class="section-title">トークン構造</div>

<WireFormat
    hint="各フィールドにマウスを乗せると説明が表示されます。"
    :segments="[
        {name: 'expire', type: 'uint64 (10進)', kind: 'meta', note: 'トークンの有効期限 — 仕様で必須とされています。'},
        {name: 'cid', type: 'uint64 (16進)', kind: 'meta', note: '検証に使用する証明書 ID。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '誰でも読み取れる公開データ。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM で暗号化されたデータ。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '先行する 4 つのフィールド全体に対する署名。'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} デプロイガイド</div>
        <div class="cta-desc">Kubernetes (マルチ Pod) · Docker · バイナリ (Linux, macOS, Windows) — 今すぐ実行コマンドを生成</div>
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
