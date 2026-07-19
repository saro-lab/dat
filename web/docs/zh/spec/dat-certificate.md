# DAT 证书

## 1. 概述 (Introduction)

**DAT 证书**是用于控制 DAT（Data Authentication Token）的签发权限，并管理令牌的签名及加密算法与密钥（Key）信息的规范。

每张证书均拥有唯一的 ID（`CID`），通过强制约束 DAT 的可签发时间段以及所生成令牌的默认有效期（TTL），安全地管理令牌的生命周期。

---

## 2. 证书结构 (Structure)

<Struct type="cert" />


### 2.1. 各字段详细说明

`CID` : Hex (uint64)

* 用于标识证书的唯一证书 ID。与 DAT 的 `CID` 字段映射，在验证时决定使用哪张证书。

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 表示使用该证书签发 DAT 的**开始时间**，单位为秒（Seconds）。

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 证书的**签发有效期**。自 `{{t('dat_issue_start')}}` 起经过本期限（秒）后，将无法再使用该证书签发新的 DAT。

`{{t('dat_ttl')}}` : uint64 (Seconds)

* 使用该证书签发的 DAT 的默认有效期（Time To Live）。创建 DAT 时，`expire` 值将设置为签发时间（当前时间）加上 `dat-ttl` 的结果。

`{{t('sig_alg')}}` : String / Enum

* 用于生成和验证 DAT 的 `signature` 字段的**签名算法**。

`{{t('crypto_alg')}}` : String / Enum

* 用于加密和解密 DAT 的 `secure` 字段的**加密算法**。

`{{t('sig_key')}}` : Base64Url (Binary)

* 用于签名及验证的密钥数据。（根据算法不同，可以是非对称密钥的 Public/Private Key，也可以是对称密钥。）

`{{t('crypto_key')}}` : Base64Url (Binary)

* 用于 `secure` 字段加解密的加密密钥数据。

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

用于防止 DAT 被篡改的签名算法列表。

支持对称密钥与非对称密钥两种方式。

<br/>

**`ECDSA-P256`**
- 椭圆曲线数字签名算法（NIST secp256r1）


**`ECDSA-P384`**
- 椭圆曲线数字签名算法（NIST secp384r1）


**`ECDSA-P521`**
- 椭圆曲线数字签名算法（NIST secp521r1）


**`HMAC-SHA256-MFS`**
- 基于 256-bit 固定长度密钥（MFS）的 Keyed-Hashing


**`HMAC-SHA384-MFS`**
- 基于 384-bit 固定长度密钥（MFS）的 Keyed-Hashing


**`HMAC-SHA512-MFS`**
- 基于 512-bit 固定长度密钥（MFS）的 Keyed-Hashing



> **MFS（Maximum Fixed Secret）：** 使用与哈希算法输出（Output）位数相同的固定长度密钥的方式。

---

### {{t('crypto_alg')}}

用于保护 DAT 内部机密数据（`secure` 字段）的已认证加密（Authenticated Encryption）算法列表。

加密结果以 IV 与加密数据相结合的形式呈现，以防止解密及重放攻击（Replay Attack）。

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- 使用 128-bit 密钥的 AES-GCM 模式


**`IV-AES256-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- 使用 256-bit 密钥的 AES-GCM 模式


> **IV（Initialization Vector）内置化：** 为防止重放攻击（Replay Attack），每次加密时生成的唯一 96 位 NONCE（IV）以前缀（Prefix）形式拼接在加密结果数据之前，包含于二进制数据中。解密时，先将前 96 位分离作为 IV，再执行解密操作。


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
