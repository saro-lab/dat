# DAT (Distributed Access Token)

## 1. 概要

同時接続ユーザー数の増加にともないセッション (Session) の数も増え、セッションサーバーに過大な負荷が発生します。

**DAT** は、このようなセッションサーバーの負荷問題を解決し、サーバー間で状態を共有しない (Stateless) 効率的な認証を実現するために考案されたトークン仕様です。

DAT はピリオド (`.`) で区切られた **5 つの固定フィールド**から成る文字列です。JSON パースなしに区切り文字の位置だけで各フィールドを切り出すことができ、有効期限と暗号化領域が仕様そのものに含まれています。

---

## 2. ワイヤーフォーマット

<WireFormat
    title="DAT ワイヤーフォーマット"
    hint="各フィールドにマウスを乗せると説明が表示されます。"
    :segments="[
        {name: 'expire', type: 'uint64 (10進)', kind: 'meta', note: 'トークンの有効期限。Unixtime 秒単位の 10 進整数です。'},
        {name: 'cid', type: 'uint64 (16進)', kind: 'meta', note: '検証に使用する証明書 ID。小文字の 16 進数で表記します。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'クライアントに公開されるデータ。誰でもデコードできます。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: '暗号化されたデータ。IV(96bit) + AES-GCM 暗号文の構造で、空の場合は空文字列です。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '先行する 4 つのフィールド全体に対する署名。このフィールドが改ざんを防ぎます。'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| フィールド | 型 | エンコーディング | 備考 |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | 10 進文字列 | Unixtime (秒) |
| `CID` | uint64 | 16 進文字列 | 証明書 ID |
| `{{t('dat_plain')}}` | Binary | Base64Url (パディングなし) | 公開データ |
| `{{t('dat_secure')}}` | Binary | Base64Url (パディングなし) | 暗号化データ |
| `{{t('sig')}}` | Binary | Base64Url (パディングなし) | 署名 |

<Struct type="dat" />

### 2.1. フィールド別詳細仕様

`{{t('dat_expire')}}` : uint64 (Unix Time)
- トークンの有効期限を秒 (Seconds) 単位の 64 ビット符号なし整数で表します。
- **純粋な 10 進数字のみを許可**します。符号・空白・区切り文字が含まれる場合は形式エラーです。

`CID` : Hex (uint64)
- トークン検証に使用する証明書 ID (Certificate ID) です。
- **純粋な 16 進数字のみを許可**し、`0x` プレフィックスは使用しません。

`{{t('dat_plain')}}` : Base64Url (Binary)
- クライアントに公開するデータを格納します。文字列だけでなくバイナリデータもサポートしており、クライアント側でデコードして確認できます。
- **暗号化されません。** 機密性のある値を入れてはいけません。

`{{t('dat_secure')}}` : Base64Url (Binary)
- クライアントに非公開とするデータを格納します。証明書の暗号化アルゴリズムで暗号化されているため、証明書を持たないクライアントは内容を復号できません。
- 内部構造は `IV(96bit) + 暗号文` であり、IV は暗号化のたびに新しく生成されます。

`{{t('sig')}}` : Base64Url (Binary)
- トークンの改ざんを検証するための署名データです。先行するフィールドを証明書の署名アルゴリズムで署名して生成します。
- 署名検証に失敗したトークンは、どのフィールドも信頼してはいけません。

---

## 3. 正規ルール (Canonical Rules)

複数の言語で実装されたクライアントが**同じトークンを同じように解釈する**ためには、以下のルールが実装ごとに食い違ってはなりません。リファレンス実装は Rust (`dat-rust`) であり、その他の実装はすべてこのルールに合わせられています。

### 3.1. 数値フィールドのパース

`expire` と `cid` は**厳格に**解釈します。以下の入力はすべて形式エラーとして拒否されます。

| 入力例 | 結果 | 理由 |
| --- | --- | --- |
| `100` | 通過 | 純粋な 10 進 |
| `007` | 通過 | 先行ゼロは許可 |
| `+100` | 拒否 | 符号は使用不可 |
| `-1` | 拒否 | 符号は使用不可 |
| `" 100 "` | 拒否 | 空白は不可 |
| `1_0` | 拒否 | 区切り文字は不可 |
| `0x10` | 拒否 | プレフィックスは不可 |
| `zzzz` | 拒否 | 数字ではない |
| `""` | 拒否 | 空文字列 |
| `18446744073709551616` | 拒否 | uint64 の範囲を超過 |

::: warning なぜ厳格でなければならないのか
寛容なパーサーは `-1` を uint64 の最大値に折り返して**事実上失効しないトークン**を作り出したり、数字でない値を黙って `0` に置き換えたりします。実装ごとに寛容さが異なると、同じトークンが一方では通過し他方では拒否され、相互運用が壊れます。
:::

### 3.2. 有効期限の判定

**DAT トークンと証明書では有効期限の境界が異なります。** 混同しないでください。

| 対象 | 有効条件 | 有効期限ちょうど (`expire == now`) |
| --- | --- | --- |
| **DAT トークン** | `expire > now` | **失効として拒否** |
| **証明書** | `expire >= now` | **まだ有効** |

トークンは有効期限に達した瞬間ただちに無効となり、証明書はその時刻まで有効です。境界で発行されたトークンを検証できるようにするため、証明書はトークンより 1 ティック長く生きている必要があるからです。

### 3.3. 空の secure ペイロード

暗号化するデータがない場合、`secure` は**空文字列**です。

- `encrypt(空の入力)` → 空の出力 (IV も GCM タグも付きません)
- `decrypt(空の入力)` → 空の出力
- 空でないのに IV の長さ (12 バイト) 以下である場合は**復号エラー**です。

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ secure の位置が空である正常なトークン
```

---

## 4. 発行と検証

<FlowDiagram
    title="DAT 発行 → 受け渡し → 検証"
    :legend="{req: 'リクエスト', res: 'レスポンス', sync: '証明書の同期'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '発行サーバー', kind: 'issuer'},
        {id: 'client', label: 'クライアント', kind: 'client'},
        {id: 'verifier', label: '検証サーバー', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: '証明書の配布', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: '証明書の配布', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'ログイン', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'DAT の発行', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'DAT 付きリクエスト', kind: 'req'},
        {from: 'verifier', label: 'CID で証明書を照会 → 署名検証 → 復号', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'レスポンス', kind: 'res'},
    ]"
/>

### 4.1. 発行手順

1. マネージャーが保有する証明書のうち、**発行可能な (issuable)** 証明書を選びます。
2. `expire = now + dat_ttl_seconds` を計算します。
3. `plain` を Base64Url でエンコードし、`secure` は暗号化したうえで Base64Url でエンコードします。
4. `expire.cid.plain.secure` の文字列に署名し、最後のフィールドとして付け加えます。

### 4.2. 検証手順

1. ピリオド (`.`) で 5 つのフィールドに分割します。フィールド数が異なる場合は形式エラーです。
2. `expire` を確認します。失効したトークンは署名検証より前に拒否されます。
3. `cid` で証明書を探します。見つからなければ検証できません。
4. `expire.cid.plain.secure` の区間に対して署名を検証します。
5. 検証に成功した後で初めて `secure` を復号します。

::: danger 署名検証前の値を信頼しないでください
一部の実装は、署名を確認せずにフィールドを取り出す API (`parse without verify` 系) を提供しています。この値は**完全に攻撃者が操作できる値**であり、ログ出力やデバッグ用途にのみ使用してください。
:::

---

## 5. JWT との比較

DAT と JWT (JSON Web Token) は、ピリオド (`.`) で区切られたトークン構造と署名による検証方式を共有していますが、内部設計において次のような重要な違いがあります。

### 5.1. 構造的な差異の比較

* **JWT 構造**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 構造**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. 主要な相違点

* **Binary ベースの軽量化:** JWT は Header と Body を JSON 文字列の形で扱いますが、DAT は**バイナリ (Binary) データを直接扱う**ことでデータサイズを最適化し、パース効率を高めています。
* **セキュリティの内在化 (`{{t('dat_secure')}}` フィールド):** JWT は基本的にペイロード (Payload) が平文で露出しており、暗号化が必要な場合は JWE のような別途の仕様を適用する必要があります。一方 DAT は、**`{{t('dat_secure')}}` フィールドによってトークン自体が暗号化機能をサポート**します。
* **有効期限の制約の強制:** JWT では `exp` (Claims) フィールドが任意項目ですが、DAT は**`{{t('dat_expire')}}` フィールドがトークン構造上で強制**されているため、有効期限の検証が必ず実行されます。
* **アルゴリズム交渉なし:** JWT はヘッダーの `alg` 値をトークン自身が持ち歩くため、アルゴリズム混同攻撃の攻撃面が生じます。DAT はアルゴリズムを**証明書が決定**し、トークンにはアルゴリズム情報が含まれません。

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
