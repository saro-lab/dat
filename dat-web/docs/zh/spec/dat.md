# DAT

DAT 是用点 (`.`) 分隔的 ASCII 字符串。每个字段按固定顺序恰好出现一次，签名用于验证前面各字段与传输时完全一致。

<WireFormat
  hint="字段顺序和分隔符都是规范的一部分。"
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: '过期 Unix 时间'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: '证书 ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: '公开字节'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: '加密字节'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: '前四个字段的签名'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## 字段

| 字段 | 表示 | 含义 |
| --- | --- | --- |
| `expire` | 十进制无符号整数 | DAT 过期的 Unix 时间 |
| `cid` | 小写十六进制无符号整数 | 验证所用的证书 ID |
| `plain` | 无填充 Base64Url | 未加密字节 |
| `secure` | 无填充 Base64Url | 由证书加密算法保护的字节 |
| `signature` | 无填充 Base64Url | 对 `expire.cid.plain.secure` 原始 ASCII 字节的签名 |

`plain` 受签名保护，无法被篡改，但任何人都能解码。将机密、个人数据和直接用于授权决策的值放入 `secure`。空 `secure` 字段也是有效的。

## 规范表示

- 整个 DAT 必须为 ASCII。
- 数字不使用符号、空格、前缀或不必要的前导零。只有零写作 `0`。
- Base64Url 使用 URL 安全字母表，不允许 `=` 填充或空白。
- 表示同一字节但非规范的 Base64Url 字符串会被拒绝。
- 字段数量或顺序不同的字符串不是 DAT。

这些规则可防止不同实现将不同字符串接受为同一 DAT。

## 签发

1. 选择当前可签发的证书。
2. 在当前时间上加证书 TTL 得到 `expire`。
3. 用 Base64Url 编码 `plain`。
4. 用证书的加密算法加密 `secure`。
5. 用点连接前面各字段，并对其 ASCII 字节签名。

只能在证书的签发窗口 `start <= now <= start + duration` 内签发。

## 验证

1. 按规范规则解析 DAT。
2. 检查 `expire > now`。`expire == now` 的 DAT 已过期。
3. 查找与 `cid` 匹配的证书，并确认其仍可用于验证。
4. 验证原始 `expire.cid.plain.secure` 字节上的签名。
5. 认证并解密 `secure`，然后与 `plain` 一起返回。

不验证签名的解析 API 仅用于观察或诊断。绝不要将其输出用于认证或授权。

## 规范之外的责任

DAT 不定义用户存储、登录方法、授权模型、令牌传输标头或撤销列表。应用决定哪些请求可使用已验证的载荷。

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
