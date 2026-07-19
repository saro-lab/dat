# DAT 証明書

## 1. 概要 (Introduction)

**DAT 証明書**は、DAT(Data Authentication Token)の発行権限を制御し、トークンの署名および暗号化アルゴリズムとキー(Key)情報を管理するための仕様です。

各証明書は固有のID(`CID`)を持ち、DATの発行可能期間および生成されるトークンの基本有効期間(TTL)を強制することで、トークンのライフサイクルを安全に管理します。

---

## 2. 証明書構造 (Structure)

<Struct type="cert" />


### 2.1. フィールド別詳細仕様

`CID` : Hex (uint64)

* 証明書を識別する固有の証明書IDです。DATの `CID` フィールドとマッピングされ、検証時にどの証明書を使用するかを決定します。

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 該当の証明書を使用してDATを発行できる**開始時刻**を秒(Seconds)単位で表します。

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 証明書の**発行有効期間**です。`{{t('dat_issue_start')}}`から本期間(秒)が経過した後は、この証明書で新しいDATを発行することはできません。

`{{t('dat_ttl')}}` : uint64 (Seconds)

* この証明書で発行されるDATの基本有効期間(Time To Live)です。DAT生成時の `expire` 値は、発行時刻(現在時刻)に `dat-ttl` を加算した値として設定されます。

`{{t('sig_alg')}}` : String / Enum

* DATの `signature` フィールドを生成および検証する際に使用する**署名アルゴリズム**です。

`{{t('crypto_alg')}}` : String / Enum

* DATの `secure` フィールドを暗号化および復号する際に使用する**暗号化アルゴリズム**です。

`{{t('sig_key')}}` : Base64Url (Binary)

* 署名および検証に使用されるキーデータです。(アルゴリズムに応じて、非対称キーのPublic/Private Key または対称キーとなります。)

`{{t('crypto_key')}}` : Base64Url (Binary)

* `secure` フィールドの暗号化・復号に使用される暗号化キーデータです。

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

DATの改ざん防止のための署名アルゴリズム一覧です。

対称キーと非対称キーの両方式をサポートしています。

<br/>

**`ECDSA-P256`**
- 楕円曲線デジタル署名アルゴリズム (NIST secp256r1)


**`ECDSA-P384`**
- 楕円曲線デジタル署名アルゴリズム (NIST secp384r1)


**`ECDSA-P521`**
- 楕円曲線デジタル署名アルゴリズム (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- 256-bit 固定サイズ秘密鍵(MFS)ベースの Keyed-Hashing


**`HMAC-SHA384-MFS`**
- 384-bit 固定サイズ秘密鍵(MFS)ベースの Keyed-Hashing


**`HMAC-SHA512-MFS`**
- 512-bit 固定サイズ秘密鍵(MFS)ベースの Keyed-Hashing



> **MFS (Maximum Fixed Secret):** ハッシュアルゴリズムの出力(Output)サイズと同じビット数の固定サイズ秘密鍵を使用する方式です。

---

### {{t('crypto_alg')}}

DAT内部の機密データ(`secure` フィールド)を保護するための認証付き暗号化(Authenticated Encryption)アルゴリズム一覧です。

暗号化の結果は、復号および再利用攻撃防止のため、IVと暗号化データが結合された形式を持ちます。

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + 暗号化_結果(Binary)
- 128-bit キーを使用するAES-GCMモード


**`IV-AES256-GCM`**
- IV(96bit) + 暗号化_結果(Binary)
- 256-bit キーを使用するAES-GCMモード


> **IV (Initialization Vector) の内在化:** 再利用攻撃(Replay Attack)を防止するため、毎回の暗号化ごとに生成される固有の96ビットサイズのNONCE(IV)が、暗号化結果データの先頭に接頭辞(Prefix)として結合されバイナリに含まれます。復号時には先頭の96ビットをIVとして分離して復号を行います。


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
