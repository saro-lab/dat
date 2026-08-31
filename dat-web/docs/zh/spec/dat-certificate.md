# 证书

DAT 证书用一个字符串表示签发和验证令牌所需的时间范围、算法和密钥。

<WireFormat
  hint="证书也由按固定顺序用点分隔的 ASCII 字段组成。"
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: '不可变证书 ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: '签发开始时间'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: '签发期间'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT 寿命'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: '签名算法'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: '加密算法'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '签名或验证密钥'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '加密密钥'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## 时间范围

<CertTimeline />

- 证书可在 `start` 至 `start + duration` 之间签发 DAT，包含两个端点。
- 已签发 DAT 从签发时间起在 `ttl` 内有效。
- 直到 `start + duration + ttl` 都需要证书进行验证，且在该时刻恰好仍可验证。

签发期结束后立即删除证书，将导致已签发的 DAT 无法验证。管理器和 CMS 分别处理可签发性与可验证性。

## 证书 ID 与密钥轮换

`cid` 是识别密钥及其时间范围的公开契约。绝不要用不同密钥覆盖现有 `cid`。要轮换密钥，请使用新 `cid` 创建新证书。服务提前同步新证书，并仅在旧证书签发的所有 DAT 过期后才将其删除。

## 签名算法

| 名称 | 用途 | 仅验证证书 |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | 不支持 |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | 不支持 |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | 不支持 |
| `ECDSA-P256` | ECDSA P-256 | 支持 |
| `ECDSA-P384` | ECDSA P-384 | 支持 |
| `ECDSA-P521` | ECDSA P-521 | 支持 |

HMAC 使用同一密钥签名和验证，因此向验证服务器提供该密钥也会授予签发权。在需要分离签发权的环境中，请使用 ECDSA 和仅验证证书。

## 加密算法

| 名称 | 密钥 |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

算法名称是线路契约的一部分。不要将它们替换为 JWT 别名。

## 完整证书与仅验证证书

完整 ECDSA 证书包含签名所需的私钥。仅验证证书只保留 ECDSA 公钥，但保留解密 `secure` 所需的 AES 密钥。因此，仅验证服务可验证和解密 DAT，但不能签发新 DAT。

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
