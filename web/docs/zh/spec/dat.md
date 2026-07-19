# DAT (Data Authentication Token)

## 1. 概述 (Introduction)

随着同时在线用户数量的增加，会话（Session）的数量也随之增多，从而对会话服务器造成过大的负载。

**DAT** 是为了解决会话服务器的负载问题，并实现服务器间不共享状态（Stateless）的高效认证而设计的令牌规范。

---

## 2. 令牌结构 (Structure)

<Struct type="dat" />

### 2.1. 各字段详细说明

`{{t('dat_expire')}}` : uint64 (Unix Time)
- 以64位无符号整数表示令牌的过期时间，单位为秒（Seconds）。

`CID` : Hex (uint64)
- 用于令牌验证的证书 ID（Certificate ID）。

`{{t('dat_plain')}}` : Base64Url (Binary)
- 存放向客户端公开的数据。不仅支持字符串，还支持二进制数据，客户端可解码后查看内容。

`{{t('dat_secure')}}` : Base64Url (Binary)
- 存放对客户端保密的数据。使用基于证书的加密算法进行加密，客户端无法解密其内容。

`{{t('sig')}}` : Base64Url (Binary)
- 用于验证令牌是否被篡改的签名数据。通过对前述各字段使用证书的签名算法进行签名来生成。

---

## 3. 与 JWT 的比较

DAT 与 JWT（JSON Web Token）共享以点（`.`）分隔的令牌结构以及通过签名（`signature`）进行验证的方式，但在内部设计上存在以下几项核心差异。

### 3.1. 结构差异比较

* **JWT 结构**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 结构**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. 核心差异点

* **基于 Binary 的轻量化：** JWT 以 JSON 字符串形式处理 Header 和 Body，而 DAT 通过**直接处理二进制（Binary）数据**来优化数据大小，提高解析效率。
* **安全性内置（`{{t('dat_secure')}} (secure)` 字段）：** JWT 的 Payload 默认以明文暴露，若需加密则须另行采用 JWE 等独立规范。而 DAT **通过 `{{t('dat_secure')}}` 字段在令牌自身层面支持加密功能**。
* **强制过期时间约束：** 在 JWT 中，`exp`（Claims）字段为可选项，而 DAT 的 **`{{t('dat_expire')}} (expire)` 字段在令牌结构上为强制字段**，有效期验证必须执行。

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
