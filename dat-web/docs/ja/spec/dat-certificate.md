# 証明書

DAT 証明書は、トークンの発行と検証に必要な期間、アルゴリズム、鍵を 1 つの文字列として表現します。

<WireFormat
  hint="証明書も、ドットで区切られた固定順序の ASCII フィールドで構成されます。"
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: '不変の証明書 ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: '発行開始時刻'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: '発行期間'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT の寿命'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: '署名アルゴリズム'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: '暗号化アルゴリズム'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '署名鍵または検証鍵'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '暗号化鍵'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## 期間

<CertTimeline />

- 証明書は `start` から `start + duration` まで、両端を含めて DAT を発行できます。
- 発行された DAT は発行時刻から `ttl` の間有効です。
- 証明書は `start + duration + ttl` まで検証に必要で、その時刻ちょうどでも検証できます。

発行期間の終了直後に証明書を削除すると、すでに発行された DAT を検証できなくなります。マネージャーと CMS は、発行可否と検証可否を別々に扱います。

## 証明書 ID と鍵のローテーション

`cid` は、鍵とその期間を識別する公開契約です。既存の `cid` を異なる鍵で上書きしてはいけません。鍵をローテーションするには、新しい `cid` で新しい証明書を作成します。サービスは新しい証明書を事前に同期し、古い証明書が発行したすべての DAT が失効した後にのみそれを削除します。

## 署名アルゴリズム

| 名前 | 用途 | 検証専用証明書 |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | 非対応 |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | 非対応 |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | 非対応 |
| `ECDSA-P256` | ECDSA P-256 | 対応 |
| `ECDSA-P384` | ECDSA P-384 | 対応 |
| `ECDSA-P521` | ECDSA P-521 | 対応 |

HMAC は同じ鍵で署名と検証を行うため、検証サーバーにその鍵を与えると発行権限も与えることになります。発行権限を分離する必要がある環境では、ECDSA と検証専用証明書を使用してください。

## 暗号化アルゴリズム

| 名前 | 鍵 |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

アルゴリズム名はワイヤ契約の一部です。JWT の別名に置き換えないでください。

## 完全な証明書と検証専用証明書

完全な ECDSA 証明書には署名に必要な秘密鍵が含まれます。検証専用証明書は ECDSA 公開鍵だけを保持しますが、`secure` の復号に必要な AES 鍵は維持します。そのため、検証専用サービスは DAT の検証と復号はできますが、新しい DAT は発行できません。

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
