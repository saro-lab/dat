# DAT 证书

## 1. 概述

**DAT 证书**是用于控制 DAT 的签发权限，并管理令牌的签名及加密算法与密钥（Key）信息的规范。

每张证书都拥有唯一的 ID（`CID`），通过强制约束 DAT 的可签发期限以及所生成令牌的有效期（TTL），安全地管理令牌的生命周期。

在 DAT 中，**密钥轮换不是可选项。** 因为证书在规范层面就写死了可签发期限，一旦超出该期限，就无法再用该证书生成新的令牌。

---

## 2. 证书结构

<WireFormat
    title="证书传输格式"
    hint="将鼠标悬停在各字段上即可查看说明。"
    :segments="[
        {name: 'cid', type: 'uint64 (十六进制)', kind: 'meta', note: '证书的唯一 ID。与 DAT 的 cid 字段进行比对。'},
        {name: 'start', type: 'uint64 (十进制)', kind: 'meta', note: '签发开始时间（Unixtime 秒）。'},
        {name: 'duration', type: 'uint64 (十进制)', kind: 'meta', note: '可签发期限（秒）。它是一段时长，而不是绝对时刻。'},
        {name: 'ttl', type: 'uint64 (十进制)', kind: 'meta', note: '由该证书签发的 DAT 的有效期（秒）。'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: '签名算法名称。'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: '加密算法名称。'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '签名密钥。以 verify-only 导出时，ECDSA 只会输出公钥。'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '加密密钥。由于是对称密钥，无论是否 verify-only，始终完整输出。'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. 各字段详细规范

`CID` : Hex (uint64)

* 用于标识证书的唯一证书 ID。它与 DAT 的 `CID` 字段映射，在验证时决定使用哪张证书。
* **CID 是不可变的标识符。** 更换密钥时不复用同一个 CID，而是以新的 CID 签发证书。

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 以秒（Seconds）为单位表示可以使用该证书签发 DAT 的**开始时间**。

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 证书的**签发有效期限**。自 `{{t('dat_issue_start')}}` 起经过本期限（秒）之后，将无法再使用该证书签发新的 DAT。
* **它是一段时长（duration），而不是绝对时刻。** 结束时刻由 `start + duration` 计算得出。

`{{t('dat_ttl')}}` : uint64 (Seconds)

* 由该证书签发的 DAT 的有效期（Time To Live）。生成 DAT 时，`expire` 值会设置为签发时刻加上该值的结果。

`{{t('sig_alg')}}` : String / Enum

* 生成和验证 DAT 的 `signature` 字段时所使用的**签名算法**。

`{{t('crypto_alg')}}` : String / Enum

* 加密和解密 DAT 的 `secure` 字段时所使用的**加密算法**。

`{{t('sig_key')}}` : Base64Url (Binary)

* 用于签名及验证的密钥数据。（根据算法不同，可以是非对称密钥的 Public/Private Key，也可以是对称密钥。）

`{{t('crypto_key')}}` : Base64Url (Binary)

* 用于 `secure` 字段加解密的加密密钥数据。

### 2.2. 时间计算

```
end    = start + duration        签发结束时刻
expire = end + ttl               证书的最终过期时刻
```

* 所有计算都在 uint64 上进行，**只有溢出才会**被判为错误并拒绝。
* `duration = 0`、`ttl = 0` 都是**合法的值**。它们可以表示签发窗口立刻关闭的证书，或者签发后立即失效的令牌所对应的证书。
* 由于各字段都是无符号整数，**从类型上就不存在负数。**

### 2.3. 构造函数签名

所有语言的实现都使用以下参数顺序。

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning 第三个参数是时长，而不是结束时刻
如果把绝对结束时刻（end）传给第三个参数，不会报错，却会生成**有效窗口完全错乱的证书**。因为该值会被原样代入 `start + duration`。
:::

---

## 3. 证书的生命周期

<CertTimeline
    title="证书的四个区间"
    caption="证书要在经过签发延迟 → 可签发 → DAT TTL 剩余区间之后，才会最终过期。"
    :marks="['创建', '开始签发', '结束签发', '最终过期']"
    :phases="[
        {label: '签发延迟 (delay)', weight: 1.2, kind: 'delay', note: '让所有节点取走证书的时间'},
        {label: '可签发 (duration)', weight: 3, kind: 'issue', note: 'DAT 签发 + 验证均可'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: '不可签发，只能验证'},
    ]"
/>

| 区间 | 签发 | 验证 | 判定 |
| --- | --- | --- | --- |
| 签发延迟 | ✕ | ○ | `issuable() == false` |
| 可签发 | ○ | ○ | `issuable() == true` |
| DAT TTL 剩余 | ✕ | ○ | 签发窗口已关闭，但尚未过期 |
| 最终过期之后 | ✕ | ✕ | `expired() == true` |

* **是否可签发**由 `signable() && start <= now <= end` 判定，且**包含两端**。
* 即使签发窗口关闭之后，证书仍会多存活 `ttl` 的时长。因为在窗口即将关闭之前签发的令牌，必须能够走完自己的寿命。
* **签发延迟（delay）** 区间是为了给集群中所有节点争取时间来取走新证书。详细内容请参阅 [{{t('menu_spec_cms')}}](./cms) 文档。

---

## 4. 算法

### 4.1. 签名算法

用于防止 DAT 被伪造或篡改的签名算法列表。支持对称密钥与非对称密钥两种方式。

| 名称 | 方式 | 备注 |
| --- | --- | --- |
| `ECDSA-P256` | 非对称 | 椭圆曲线数字签名（NIST secp256r1） |
| `ECDSA-P384` | 非对称 | 椭圆曲线数字签名（NIST secp384r1） |
| `ECDSA-P521` | 非对称 | 椭圆曲线数字签名（NIST secp521r1） |
| `HMAC-SHA256-MFS` | 对称 | 基于 256-bit 固定长度密钥的 Keyed-Hashing |
| `HMAC-SHA384-MFS` | 对称 | 基于 384-bit 固定长度密钥的 Keyed-Hashing |
| `HMAC-SHA512-MFS` | 对称 | 基于 512-bit 固定长度密钥的 Keyed-Hashing |

> **MFS（Maximum Fixed Secret）：** 使用与哈希算法输出（Output）位数相同的固定长度密钥的方式。

### 4.2. 加密算法

用于保护 DAT 内部机密数据（`secure` 字段）的已认证加密（Authenticated Encryption）算法列表。

| 名称 | 密钥长度 | 结构 |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV(96bit) + 加密结果 |
| `IV-AES256-GCM` | 256-bit | IV(96bit) + 加密结果 |

> **IV（Initialization Vector）内置化：** 每次加密时生成的唯一 96 位 NONCE（IV）以前缀（Prefix）形式拼接在加密结果之前。解密时先将前 96 位分离作为 IV，再执行解密。

### 4.3. 密钥长度校验

读取证书时，会**确认所声明算法的位数与实际密钥长度是否一致**。

例如，声明为 `IV-AES256-GCM` 的证书中若含有 16 字节的密钥，则导入本身就会被拒绝。若没有这项检查，就会出现自以为在使用 AES-256、实际上却按 AES-128 运行的情况。

---

## 5. verify-only 导出

对于只执行验证的服务器，没有必要交给它签名用的私钥。为此，DAT 证书提供了 **verify-only 导出**。

<FlowDiagram
    title="完整证书与 verify-only 证书的分发路径"
    :legend="{req: '请求', res: '响应', sync: '证书分发'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '签发服务器', kind: 'issuer'},
        {id: 'verifier', label: '仅验证服务器', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: '完整证书（含签名私钥）', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'verify-only 证书', kind: 'sync'},
    ]"
/>

| 签名算法 | `support_verify_only()` | verify-only 导出结果 |
| --- | --- | --- |
| **ECDSA** 系列 | `true` | 签名密钥**只输出公钥**（Base64 由 130 字符变为 87 字符） |
| **HMAC** 系列 | `false` | 会产生**显式错误** |

HMAC 是对称密钥，因此不存在“只能用于验证的密钥”这种东西。所以在尝试 verify-only 导出时，不会被悄悄跳过，而是**立即以错误的形式告知。** 一旦混入了 HMAC 证书，调用 verify-only 导出就会失败；因此如果要运行仅验证的节点，就必须使用 ECDSA 系列。

::: danger 加密密钥在 verify-only 中同样会完整输出
用于 `secure` 字段的 AES 密钥是**对称密钥**，因此无论是否 verify-only，**都始终完整导出。** 因为解密需要与加密时相同的密钥。

也就是说，收到 verify-only 证书的服务器：

* **无法伪造签名** —— 由于没有私钥，它无法生成新的 DAT。
* **可以解密 `secure` 载荷** —— 对它们并不提供机密性。

verify-only 是划分*签发权限*的手段，而不是划分*机密性*的手段。如果某个值需要对验证节点保密，就不应该放进 `secure`。
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
