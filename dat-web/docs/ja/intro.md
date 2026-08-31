# DAT とは？

DAT (Distributed Access Token) は、同じ証明書を共有する発行サービスと検証サービスが使用するアクセストークン仕様です。検証時に発行サービスへの別のリクエストや中央セッションストアを必要としないため、結合度の低いサービス間で認証結果を受け渡せます。

<WireFormat
  hint="ドットで区切られたフィールドが 1 つの DAT を構成します。"
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: '有効期限の Unix 時刻'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: '証明書 ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: '公開データ'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: '暗号化データ'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: '本文の署名'},
  ]"
/>

## 構成要素

### DAT

ユーザーまたはサービスがリクエストとともに送信する文字列です。有効期限と証明書 ID が含まれ、公開データと暗号化データの両方を格納できます。

### 証明書

DAT の作成と検証に必要なアルゴリズム、鍵、期間が含まれます。証明書 ID である `cid` は不変です。鍵をローテーションするときは新しい `cid` を使用してください。

### マネージャー

クライアントライブラリのマネージャーは証明書を保存し、現在発行可能な証明書で DAT を作成し、各 DAT をその `cid` に対応する証明書で検証します。

### DAT CMS

証明書を作成・保存し、サービスへ配布する任意のサーバーです。発行サービスには完全な証明書を、トークンの検証のみを行うサービスには検証専用証明書を提供できます。

## 発行と検証

<ArchFlow
  :user="{label: 'ユーザー', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['証明書管理', 'バージョンベースの同期']}"
  :service="{servers: [
    {label: '発行サービス', kind: 'issuer', icon: 'login', request: '認証情報', response: 'DAT', sync: '完全な証明書'},
    {label: '検証サービス', kind: 'verifier', icon: 'apps', request: 'DAT', response: '保護された機能', sync: '検証専用証明書'},
  ]}"
/>

発行サービスは `plain` と `secure` のデータを選び、DAT を作成します。検証サービスは有効期限、署名、暗号文を確認してから、両方のデータ領域をアプリケーションに渡します。`plain` は署名されますが暗号化されないため、秘密情報や個人データを格納しないでください。

## 証明書が変更されても検証できる理由

新しい証明書が発行可能になると、以後の DAT はその新しい `cid` を使用します。以前の証明書は、それが発行したすべての DAT の TTL が経過するまで検証に使用できます。これにより、鍵のローテーションと既存トークンの検証期間を一緒に管理できます。

## DAT の適用領域

- 認証とアプリケーション機能を異なるサービスで処理する環境
- 複数のランタイムが同じトークン形式を発行または検証する環境
- 中央セッションを参照せずに、短期間の認可データを伝達する必要があるシステム
- 1 つのトークン内で公開ルーティング情報と保護データを分離する必要があるシステム

DAT 自体は認可ポリシーを定義しません。有効な DAT であることと、アプリケーションがリクエストを許可するかどうかの判断は別の問題です。

## 次のステップ

- [DAT 仕様](./spec/dat): トークンのフィールドと検証ルール
- [証明書](./spec/dat-certificate): 鍵と期間
- [DAT CMS 仕様](./spec/cms): 同期契約
- [ライブラリ](./libs/): アプリケーションへの統合

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
