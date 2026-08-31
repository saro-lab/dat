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
    {icon: '⏱️', title: '有効期限は仕様の一部', desc: 'すべての DAT に有効期限があります。トークンの寿命を各アプリケーションが個別に解釈する必要はありません。'},
    {icon: '🔏', title: '公開領域と暗号化領域を分離', desc: 'ルーティングに必要な値は plain に、公開してはならない値は secure に格納します。'},
    {icon: '🔑', title: '証明書で鍵を選択', desc: 'トークンの cid が検証に使う証明書を指します。鍵をローテーションしても既存のトークンは検証できます。'},
    {icon: '🌐', title: 'サービス間の問い合わせは不要', desc: '各サービスが同じ証明書を保持すれば、発行サーバーと検証サーバーは個別に運用できます。'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT は、複数のサービスが同じ仕様に従って発行・検証するアクセストークンです。トークンには有効期限、証明書 ID、公開データ、暗号化データ、署名が含まれます。検証サーバーは、毎回発行サーバーに問い合わせず、自身の証明書でトークンを検証します。
</div>

<div class="hero-desc">
証明書は、トークンの署名方式と暗号化方式、鍵、発行期間、TTL をひとつにまとめます。DAT CMS を使えば、サービスが証明書を直接配布する代わりに、完全な証明書または検証専用証明書を同期できます。
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">動作の仕組み</div>

<ArchFlow
    :user="{label: 'ユーザー', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['証明書を作成・保存', '証明書をサービスに配布']}"
    :service="{servers: [
        {label: '発行サービス', kind: 'issuer', icon: 'login', request: '認証リクエスト', response: 'DAT を発行', sync: '発行可能な証明書を同期'},
        {label: '検証サービス', kind: 'verifier', icon: 'apps', request: 'DAT 付きリクエスト', response: '検証後に応答', sync: '検証専用証明書を同期'},
    ]}"
/>

<div class="hero-desc">
発行サービスは完全な証明書で DAT を作成し、検証サービスは検証専用証明書で確認します。DAT CMS は任意です。証明書を直接配布する環境では、クライアントのローカルマネージャーだけを使用できます。
</div>

<div class="section-title">DAT の構造</div>

<WireFormat
    hint="各フィールドにカーソルを合わせると説明が表示されます。"
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'DAT が失効する Unix 時刻。'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: '検証に使用する証明書 ID。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '暗号化されない公開バイト。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM で保護されたバイト。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '先行する全フィールドを検証する署名。'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT を始める</div>
        <div class="cta-desc">トークン、証明書、発行サービス、検証サービスの役割を順に学びます。</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">ライブラリ</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
