# DAT (Distributed Access Token)

## 1. 概述

随着同时在线用户数量的增加，会话（Session）的数量也随之增多，从而对会话服务器造成过大的负载。

**DAT** 正是为了解决这种会话服务器的负载问题，并实现服务器之间不共享状态（Stateless）的高效认证而设计的令牌规范。

DAT 是由点（`.`）分隔的 **5 个固定字段**组成的字符串。无需 JSON 解析，仅凭分隔符的位置就能切分出各个字段；并且过期时间与加密区域本身就包含在规范之中。

---

## 2. 传输格式 (Wire Format)

<WireFormat
    title="DAT 传输格式"
    hint="将鼠标悬停在各字段上即可查看说明。"
    :segments="[
        {name: 'expire', type: 'uint64 (十进制)', kind: 'meta', note: '令牌过期时间。以秒为单位的 Unixtime 十进制整数。'},
        {name: 'cid', type: 'uint64 (十六进制)', kind: 'meta', note: '用于验证的证书 ID。以小写十六进制表示。'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '向客户端公开的数据。任何人都可以解码。'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: '加密后的数据。结构为 IV(96bit) + AES-GCM 密文；若为空则是空字符串。'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '对前面四个字段整体的签名。该字段用于阻止伪造与篡改。'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| 字段 | 类型 | 编码 | 备注 |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | 十进制字符串 | Unixtime（秒） |
| `CID` | uint64 | 十六进制字符串 | 证书 ID |
| `{{t('dat_plain')}}` | Binary | Base64Url（无填充） | 公开数据 |
| `{{t('dat_secure')}}` | Binary | Base64Url（无填充） | 加密数据 |
| `{{t('sig')}}` | Binary | Base64Url（无填充） | 签名 |

<Struct type="dat" />

### 2.1. 各字段详细规范

`{{t('dat_expire')}}` : uint64 (Unix Time)
- 以秒（Seconds）为单位的 64 位无符号整数表示令牌的过期时间。
- **仅允许纯十进制数字**。若包含符号、空白或分隔符，则视为格式错误。

`CID` : Hex (uint64)
- 用于令牌验证的证书 ID（Certificate ID）。
- **仅允许纯十六进制数字**，且不使用 `0x` 前缀。

`{{t('dat_plain')}}` : Base64Url (Binary)
- 存放向客户端公开的数据。不仅支持字符串，也支持二进制数据，客户端可以解码后查看。
- **不进行加密。** 不得放入敏感值。

`{{t('dat_secure')}}` : Base64Url (Binary)
- 存放对客户端保密的数据。它使用证书的加密算法加密，因此没有证书的客户端无法解密其内容。
- 内部结构为 `IV(96bit) + 密文`，且 IV 在每次加密时都会重新生成。

`{{t('sig')}}` : Base64Url (Binary)
- 用于验证令牌是否被伪造或篡改的签名数据。通过证书的签名算法对前面各字段进行签名而生成。
- 对于签名验证失败的令牌，任何字段都不应被信任。

---

## 3. 规范化规则 (Canonical Rules)

要让用多种语言实现的客户端**以完全相同的方式解释同一个令牌**，以下规则在各实现之间就不能出现偏差。基准实现是 Rust（`dat-rust`），其余实现全部与该规则对齐。

### 3.1. 数字字段的解析

`expire` 与 `cid` 采用**严格**解释。以下输入全部会因格式错误被拒绝。

| 输入示例 | 结果 | 原因 |
| --- | --- | --- |
| `100` | 通过 | 纯十进制 |
| `007` | 通过 | 允许前导 0 |
| `+100` | 拒绝 | 不可使用符号 |
| `-1` | 拒绝 | 不可使用符号 |
| `" 100 "` | 拒绝 | 不可有空白 |
| `1_0` | 拒绝 | 不可有分隔符 |
| `0x10` | 拒绝 | 不可有前缀 |
| `zzzz` | 拒绝 | 不是数字 |
| `""` | 拒绝 | 空字符串 |
| `18446744073709551616` | 拒绝 | 超出 uint64 范围 |

::: warning 为什么必须严格
宽松的解析器会把 `-1` 折回成 uint64 的最大值，从而制造出**事实上永不过期的令牌**，或者悄悄地把非数字的值变成 `0`。如果各实现的宽松程度不一致，同一个令牌就会在一端通过、在另一端被拒绝，互操作性随之破裂。
:::

### 3.2. 过期判定

**DAT 令牌与证书的过期边界互不相同。** 请不要混淆。

| 对象 | 有效条件 | 过期时刻整点（`expire == now`） |
| --- | --- | --- |
| **DAT 令牌** | `expire > now` | **判为过期并拒绝** |
| **证书** | `expire >= now` | **仍然有效** |

令牌在到达过期时刻的那一瞬间立即失效，而证书直到该时刻为止仍然有效。这是因为证书必须比令牌多存活一个时间刻度，才能验证在边界处签发的令牌。

### 3.3. 空的 secure 载荷

若没有需要加密的数据，`secure` 就是**空字符串**。

- `encrypt(空输入)` → 空输出（既不附加 IV，也不附加 GCM 标签）
- `decrypt(空输入)` → 空输出
- 若非空但长度小于等于 IV 长度（12 字节），则为**解密错误**。

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ secure 位置为空的正常令牌
```

---

## 4. 签发与验证

<FlowDiagram
    title="DAT 签发 → 传递 → 验证"
    :legend="{req: '请求', res: '响应', sync: '证书同步'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '签发服务器', kind: 'issuer'},
        {id: 'client', label: '客户端', kind: 'client'},
        {id: 'verifier', label: '验证服务器', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: '分发证书', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: '分发证书', kind: 'sync'},
        {from: 'client', to: 'issuer', label: '登录', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: '签发 DAT', kind: 'res'},
        {from: 'client', to: 'verifier', label: '携带 DAT 的请求', kind: 'req'},
        {from: 'verifier', label: '按 CID 查找证书 → 验证签名 → 解密', kind: 'note'},
        {from: 'verifier', to: 'client', label: '响应', kind: 'res'},
    ]"
/>

### 4.1. 签发流程

1. 从管理器持有的证书中挑选**可签发（issuable）**的证书。
2. 计算 `expire = now + dat_ttl_seconds`。
3. 将 `plain` 以 Base64Url 编码，`secure` 则先加密再以 Base64Url 编码。
4. 对 `expire.cid.plain.secure` 字符串进行签名，并作为最后一个字段附加上去。

### 4.2. 验证流程

1. 以点（`.`）切分为 5 个字段。字段数量不符则为格式错误。
2. 检查 `expire`。已过期的令牌在验证签名之前就会被拒绝。
3. 用 `cid` 查找证书。找不到则无法验证。
4. 对 `expire.cid.plain.secure` 区段验证签名。
5. 只有在验证成功之后，才解密 `secure`。

::: danger 请勿信任签名验证之前的值
部分实现提供了不验证签名就取出字段的 API（`parse without verify` 之类）。这些值是**完全可以被攻击者操纵的值**，只应用于日志记录与调试用途。
:::

---

## 5. 与 JWT 的比较

DAT 与 JWT（JSON Web Token）共享以点（`.`）分隔的令牌结构以及通过签名进行验证的方式，但在内部设计上存在以下核心差异。

### 5.1. 结构差异比较

* **JWT 结构**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 结构**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. 核心差异点

* **基于 Binary 的轻量化：** JWT 以 JSON 字符串形式处理 Header 和 Body，而 DAT 通过**直接处理二进制（Binary）数据**来优化数据大小并提高解析效率。
* **安全性内置（`{{t('dat_secure')}}` 字段）：** JWT 的 Payload 默认以明文暴露，若需加密则必须另行采用 JWE 等独立规范。相比之下，DAT **通过 `{{t('dat_secure')}}` 字段在令牌自身层面支持加密功能**。
* **强制的过期时间约束：** 在 JWT 中 `exp`（Claims）字段是可选项，而 DAT 的 **`{{t('dat_expire')}}` 字段在令牌结构上是强制的**，因此必然会执行有效期验证。
* **没有算法协商：** JWT 由令牌自身携带头部的 `alg` 值，因此产生了算法混淆攻击面。DAT 的算法由**证书决定**，令牌中不含任何算法信息。

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
