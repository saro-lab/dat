# DAT (Data Authentication Token)

## 1. 概要 (Introduction)

同時接続ユーザー数が増加するにつれて、セッション(Session)の数も増加し、セッションサーバーに過大な負荷が発生します。

**DAT**は、このようなセッションサーバーの負荷問題を解決し、サーバー間で状態を共有しない(Stateless)効率的な認証を実現するために設計されたトークン仕様です。

---

## 2. トークン構造 (Structure)

<Struct type="dat" />

### 2.1. フィールド別詳細仕様

`{{t('dat_expire')}}` : uint64 (Unix Time)
- トークンの有効期限を秒(Seconds)単位の64ビット符号なし整数で表します。

`CID` : Hex (uint64)
- トークン検証に使用する証明書ID (Certificate ID) です。

`{{t('dat_plain')}}` : Base64Url (Binary)
- クライアントに公開するデータを格納します。文字列だけでなくバイナリデータもサポートしており、クライアント側でデコードして確認することができます。

`{{t('dat_secure')}}` : Base64Url (Binary)
- クライアントに非公開とするデータを格納します。証明書ベースの暗号化アルゴリズムで暗号化されているため、クライアントは内容を復号できません。

`{{t('sig')}}` : Base64Url (Binary)
- トークンの改ざんを検証するための署名データです。前述のフィールドを証明書の署名アルゴリズムで署名して生成します。

---

## 3. JWTとの比較

DATとJWT(JSON Web Token)は、ピリオド(`.`)で区切られたトークン構造と署名(`signature`)による検証方式を共有していますが、内部設計において以下のような重要な違いがあります。

### 3.1. 構造的差異の比較

* **JWT 構造**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 構造**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. 主要な相違点

* **Binary ベースの軽量化:** JWTはHeaderとBodyをJSON文字列形式で扱いますが、DATは**バイナリ(Binary)データを直接扱う**ことでデータサイズを最適化し、パース効率を高めています。
* **セキュリティの内在化 (`{{t('dat_secure')}} (secure)` フィールド):** JWTは基本的にペイロード(Payload)が平文で公開されており、暗号化が必要な場合はJWEのような別途の仕様を適用する必要があります。一方、DATは**`{{t('dat_secure')}}` フィールドによってトークン自体が暗号化機能をサポート**しています。
* **有効期限の強制:** JWTでは `exp` (Claims) フィールドが任意項目ですが、DATは**`{{t('dat_expire')}} (expire)` フィールドがトークン構造上で強制**されており、有効期限の検証が必須で実行されます。

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
