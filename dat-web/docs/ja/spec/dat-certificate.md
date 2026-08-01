# DAT 証明書

## 1. 概要

**DAT 証明書**は、DAT の発行権限を制御し、トークンの署名および暗号化アルゴリズムとキー (Key) 情報を管理するための仕様です。

各証明書は固有の ID (`CID`) を持ち、DAT の発行可能期間および生成されるトークンの有効期間 (TTL) を強制することで、トークンのライフサイクルを安全に管理します。

DAT において**キーローリングは選択ではありません。** 証明書に発行可能期間が仕様のレベルで埋め込まれているため、期間を過ぎるとその証明書では新しいトークンを作れません。

---

## 2. 証明書の構造

<WireFormat
    title="証明書のワイヤーフォーマット"
    hint="各フィールドにマウスを乗せると説明が表示されます。"
    :segments="[
        {name: 'cid', type: 'uint64 (16進)', kind: 'meta', note: '証明書の固有 ID。DAT の cid フィールドと突き合わされます。'},
        {name: 'start', type: 'uint64 (10進)', kind: 'meta', note: '発行開始時刻 (Unixtime 秒)。'},
        {name: 'duration', type: 'uint64 (10進)', kind: 'meta', note: '発行可能な期間 (秒)。絶対時刻ではなく期間です。'},
        {name: 'ttl', type: 'uint64 (10進)', kind: 'meta', note: 'この証明書で発行される DAT の有効期間 (秒)。'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: '署名アルゴリズム名。'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: '暗号化アルゴリズム名。'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '署名キー。verify-only でエクスポートすると、ECDSA では公開鍵のみが出力されます。'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '暗号化キー。対称鍵であるため、verify-only かどうかにかかわらず常に全体が出力されます。'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. フィールド別詳細仕様

`CID` : Hex (uint64)

* 証明書を識別する固有の証明書 ID です。DAT の `CID` フィールドとマッピングされ、検証時にどの証明書を使用するかを決定します。
* **CID は不変の識別子です。** キーを交換する際は同じ CID を再利用せず、新しい CID で証明書を発行します。

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 該当の証明書を使用して DAT を発行できる**開始時刻**を秒 (Seconds) 単位で表します。

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 証明書の**発行有効期間**です。`{{t('dat_issue_start')}}`から本期間 (秒) が経過した後は、この証明書で新しい DAT を発行することはできません。
* **絶対時刻ではなく期間 (duration) です。** 終了時刻は `start + duration` で計算されます。

`{{t('dat_ttl')}}` : uint64 (Seconds)

* この証明書で発行される DAT の有効期間 (Time To Live) です。DAT 生成時の `expire` 値は、発行時刻にこの値を加算して設定されます。

`{{t('sig_alg')}}` : String / Enum

* DAT の `signature` フィールドを生成および検証する際に使用する**署名アルゴリズム**です。

`{{t('crypto_alg')}}` : String / Enum

* DAT の `secure` フィールドを暗号化および復号する際に使用する**暗号化アルゴリズム**です。

`{{t('sig_key')}}` : Base64Url (Binary)

* 署名および検証に使用されるキーデータです。(アルゴリズムに応じて、非対称鍵の Public/Private Key または対称鍵となります。)

`{{t('crypto_key')}}` : Base64Url (Binary)

* `secure` フィールドの暗号化・復号に使用される暗号化キーデータです。

### 2.2. 時間の計算

```
end    = start + duration        発行終了時刻
expire = end + ttl               証明書の最終失効時刻
```

* すべての計算は uint64 上で行い、**オーバーフローのみをエラー**として拒否します。
* `duration = 0`、`ttl = 0` は**正当な値**です。発行ウィンドウがただちに閉じる証明書や、失効と同時に無効になるトークンを作る証明書を表現できます。
* フィールドがすべて符号なし整数であるため、**負の値は型として存在しません。**

### 2.3. コンストラクタのシグネチャ

すべての言語実装が以下の引数順序を使用します。

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning 3 番目の引数は終了時刻ではなく期間です
3 番目の引数に絶対的な終了時刻 (end) を渡すと、エラーにならずに**まったく違う有効ウィンドウを持つ証明書**が作られます。値がそのまま `start + duration` に入るためです。
:::

---

## 3. 証明書のライフサイクル

<CertTimeline
    title="証明書の 4 つの区間"
    caption="証明書は発行遅延 → 発行可能 → DAT TTL の残余区間をすべて過ぎた後で、ようやく最終的に失効します。"
    :marks="['生成', '発行開始', '発行終了', '最終失効']"
    :phases="[
        {label: '発行遅延 (delay)', weight: 1.2, kind: 'delay', note: 'すべてのノードが証明書を取得するための時間'},
        {label: '発行可能 (duration)', weight: 3, kind: 'issue', note: 'DAT の発行・検証がいずれも可能'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: '発行は不可、検証のみ可能'},
    ]"
/>

| 区間 | 発行 | 検証 | 判定 |
| --- | --- | --- | --- |
| 発行遅延 | ✕ | ○ | `issuable() == false` |
| 発行可能 | ○ | ○ | `issuable() == true` |
| DAT TTL 残余 | ✕ | ○ | 発行ウィンドウは閉じているが失効前 |
| 最終失効以降 | ✕ | ✕ | `expired() == true` |

* **発行可能かどうか**は `signable() && start <= now <= end` で判定し、**両端を含みます**。
* 発行ウィンドウが閉じた後も、証明書は `ttl` の分だけさらに生き続けます。ウィンドウが閉じる直前に発行されたトークンが自らの寿命を全うできる必要があるからです。
* **発行遅延 (delay)** の区間は、クラスタ内のすべてのノードが新しい証明書を取得する時間を確保するためのものです。詳細は [{{t('menu_spec_cms')}}](./cms) のドキュメントを参照してください。

---

## 4. アルゴリズム

### 4.1. 署名アルゴリズム

DAT の改ざんを防止するための署名アルゴリズムの一覧です。対称鍵方式と非対称鍵方式をサポートしています。

| 名称 | 方式 | 備考 |
| --- | --- | --- |
| `ECDSA-P256` | 非対称 | 楕円曲線デジタル署名 (NIST secp256r1) |
| `ECDSA-P384` | 非対称 | 楕円曲線デジタル署名 (NIST secp384r1) |
| `ECDSA-P521` | 非対称 | 楕円曲線デジタル署名 (NIST secp521r1) |
| `HMAC-SHA256-MFS` | 対称 | 256-bit 固定サイズ秘密鍵ベースの Keyed-Hashing |
| `HMAC-SHA384-MFS` | 対称 | 384-bit 固定サイズ秘密鍵ベースの Keyed-Hashing |
| `HMAC-SHA512-MFS` | 対称 | 512-bit 固定サイズ秘密鍵ベースの Keyed-Hashing |

> **MFS (Maximum Fixed Secret):** ハッシュアルゴリズムの出力 (Output) サイズと同じビット数の固定サイズ秘密鍵を使用する方式です。

### 4.2. 暗号化アルゴリズム

DAT 内部の機密データ (`secure` フィールド) を保護するための認証付き暗号化 (Authenticated Encryption) アルゴリズムの一覧です。

| 名称 | キー長 | 構造 |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV(96bit) + 暗号化結果 |
| `IV-AES256-GCM` | 256-bit | IV(96bit) + 暗号化結果 |

> **IV (Initialization Vector) の内在化:** 暗号化のたびに生成される固有の 96 ビットの NONCE (IV) が、暗号化結果の先頭に接頭辞 (Prefix) として結合されます。復号時には先頭の 96 ビットを IV として分離し、復号を行います。

### 4.3. キー長の検証

証明書を読み込む際に、**宣言されたアルゴリズムのビット数と実際のキー長が一致するかを確認**します。

たとえば `IV-AES256-GCM` と宣言された証明書に 16 バイトのキーが入っていた場合、インポート自体が拒否されます。この検査がないと、AES-256 を使っているつもりで実際には AES-128 で動作してしまいます。

---

## 5. verify-only エクスポート

検証のみを行うサーバーには、署名用の秘密鍵を渡す必要がありません。DAT 証明書はそのために **verify-only エクスポート**を提供します。

<FlowDiagram
    title="完全な証明書と verify-only 証明書の配布経路"
    :legend="{req: 'リクエスト', res: 'レスポンス', sync: '証明書の配布'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '発行サーバー', kind: 'issuer'},
        {id: 'verifier', label: '検証専用サーバー', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: '完全な証明書 (署名用秘密鍵を含む)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'verify-only 証明書', kind: 'sync'},
    ]"
/>

| 署名アルゴリズム | `support_verify_only()` | verify-only エクスポートの結果 |
| --- | --- | --- |
| **ECDSA** 系 | `true` | 署名キーは**公開鍵のみ**が出力されます (Base64 130 文字 → 87 文字) |
| **HMAC** 系 | `false` | **明示的なエラー**が発生します |

HMAC は対称鍵であるため、「検証だけができるキー」というものが存在しません。したがって verify-only エクスポートを試みた場合、黙ってスキップするのではなく**エラーとして即座に通知します。** HMAC 証明書が混ざった状態で verify-only エクスポートを呼び出すと失敗するため、検証専用ノードを運用するのであれば ECDSA 系を使用する必要があります。

::: danger 暗号化キーは verify-only でも全体が出力されます
`secure` フィールド用の AES キーは**対称鍵**であるため、verify-only かどうかにかかわらず**常に全体がエクスポートされます。** 復号するには暗号化に使ったものと同じキーが必要だからです。

つまり verify-only 証明書を受け取ったサーバーは:

* **署名を偽造できません** — 秘密鍵がないため新しい DAT を作れません。
* **`secure` ペイロードは復号できます** — そのサーバーに対する機密性は提供されません。

verify-only は*発行権限*を分けるための仕組みであって、*機密性*を分けるための仕組みではありません。検証ノードに隠すべき値であれば、`secure` に入れてはいけません。
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
