# DAT

DAT はドット (`.`) で区切られた ASCII 文字列です。各フィールドは固定順序で 1 回ずつ現れ、署名は先行するフィールドが送信されたとおりであることを検証します。

<WireFormat
  hint="フィールドの順序と区切り文字も仕様の一部です。"
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: '有効期限の Unix 時刻'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: '証明書 ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: '公開バイト'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: '暗号化バイト'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: '先頭 4 フィールドの署名'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## フィールド

| フィールド | 表現 | 意味 |
| --- | --- | --- |
| `expire` | 10 進数の符号なし整数 | DAT が失効する Unix 時刻 |
| `cid` | 小文字 16 進数の符号なし整数 | 検証に使用する証明書 ID |
| `plain` | パディングなし Base64Url | 暗号化されないバイト |
| `secure` | パディングなし Base64Url | 証明書の暗号化アルゴリズムで保護されたバイト |
| `signature` | パディングなし Base64Url | `expire.cid.plain.secure` の元の ASCII バイトに対する署名 |

`plain` は署名の対象なので改ざんできませんが、誰でもデコードできます。秘密情報、個人データ、認可判断に直接使用する値は `secure` に格納してください。空の `secure` フィールドも有効です。

## 正準表現

- DAT 全体は ASCII でなければなりません。
- 数値には符号、空白、接頭辞、不要な先頭ゼロを使いません。値 0 だけを `0` と記述します。
- Base64Url は URL セーフなアルファベットを使い、`=` パディングや空白を許容しません。
- 同じバイトを複数の方法で表す非正準 Base64Url 文字列は拒否されます。
- フィールド数や順序が異なる文字列は DAT ではありません。

これらのルールは、実装ごとに異なる文字列を同じ DAT として受け入れることを防ぎます。

## 発行

1. 現在発行可能な証明書を選びます。
2. 現在時刻に証明書の TTL を加えて `expire` を作成します。
3. `plain` を Base64Url でエンコードします。
4. `secure` を証明書の暗号化アルゴリズムで暗号化します。
5. 先行するフィールドをドットで結合し、その ASCII バイトに署名します。

発行は証明書の発行期間 `start <= now <= start + duration` に限り許可されます。

## 検証

1. 正準ルールに従って DAT を解析します。
2. `expire > now` を確認します。`expire == now` の DAT は失効しています。
3. `cid` に対応する証明書を探し、検証に有効な状態が続いていることを確認します。
4. 元の `expire.cid.plain.secure` バイトに対する署名を検証します。
5. `secure` を認証・復号し、`plain` とともに返します。

署名を検証しない解析 API は、観察または診断のためだけに使用します。その出力を認証や認可に絶対に使用しないでください。

## 仕様の範囲外の責任

DAT はユーザーストア、ログイン方法、認可モデル、トークン転送ヘッダー、失効リストを定義しません。検証済みペイロードの使用を許可するリクエストはアプリケーションが決定します。

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
