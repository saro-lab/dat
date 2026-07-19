# DAT 인증서

## 1. 개요 (Introduction)

**DAT 인증서**는 DAT(Data Authentication Token)의 발급 권한을 제어하고, 토큰의 서명 및 암호화 알고리즘과 키(Key) 정보를 관리하기 위한 명세입니다.

각 인증서는 고유한 ID(`CID`)를 가지며, DAT의 발급 가능 기간 및 생성되는 토큰의 기본 유효기간(TTL)을 강제함으로써 토큰 생명주기를 안전하게 관리합니다.

---

## 2. 인증서 구조 (Structure)

<Struct type="cert" />


### 2.1. 필드별 세부 명세

`CID` : Hex (uint64)

* 인증서를 식별하는 고유한 인증서 ID입니다. DAT의 `CID` 필드와 매핑되어 검증 시 어떤 인증서를 사용할지 결정합니다.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 해당 인증서를 사용하여 DAT를 발급할 수 있는 **시작 시간**을 초(Seconds) 단위로 나타냅니다.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 인증서의 **발급 유효 기간**입니다. `{{t('dat_issue_start')}}`으로부터 본 기간(초)이 지난 후에는 이 인증서로 새로운 DAT를 발급할 수 없습니다.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* 이 인증서로 발급되는 DAT의 기본 유효기간(Time To Live)입니다. DAT 생성 시 `expire` 값은 발급 시간(현재 시간)에 `dat-ttl`을 더한 값으로 설정됩니다.

`{{t('sig_alg')}}` : String / Enum

* DAT의 `signature` 필드를 생성하고 검증할 때 사용할 **서명 알고리즘**입니다.

`{{t('crypto_alg')}}` : String / Enum

* DAT의 `secure` 필드를 암호화하고 복호화할 때 사용할 **암호화 알고리즘**입니다.

`{{t('sig_key')}}` : Base64Url (Binary)

* 서명 및 검증에 사용되는 키 데이터입니다. (알고리즘에 따라 비대칭키의 Public/Private Key 또는 대칭키가 될 수 있습니다.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* `secure` 필드 암·복호화에 사용되는 암호화 키 데이터입니다.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

DAT의 위·변조 방지를 위한 서명 알고리즘 목록입니다.

대칭키와 비대칭키 방식을 지원합니다.

<br/>

**`ECDSA-P256`**
- 타원곡선 디지털 서명 알고리즘 (NIST secp256r1)


**`ECDSA-P384`**
- 타원곡선 디지털 서명 알고리즘 (NIST secp384r1)


**`ECDSA-P521`**
- 타원곡선 디지털 서명 알고리즘 (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- 256-bit 고정 크기 비밀키(MFS) 기반의 Keyed-Hashing


**`HMAC-SHA384-MFS`**
- 384-bit 고정 크기 비밀키(MFS) 기반의 Keyed-Hashing


**`HMAC-SHA512-MFS`**
- 512-bit 고정 크기 비밀키(MFS) 기반의 Keyed-Hashing



> **MFS (Maximum Fixed Secret):** 해시 알고리즘의 출력(Output) 크기와 동일한 비트 수의 고정 크기 비밀키를 사용하는 방식입니다.

---

### {{t('crypto_alg')}}

DAT 내부의 기밀 데이터(`secure` 필드)를 보호하기 위한 인증된 암호화(Authenticated Encryption) 알고리즘 목록입니다.

암호화 결과물은 복호화 및 재사용 공격 방지를 위해 IV와 암호화 데이터가 결합된 형태를 가집니다.

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- 128-bit 키를 사용하는 AES-GCM 모드


**`IV-AES256-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- 256-bit 키를 사용하는 AES-GCM 모드


> **IV (Initialization Vector) 내재화:** 재사용 공격(Replay Attack)을 방지하기 위해 매 암호화마다 생성되는 고유한 96비트 크기의 NONCE(IV)가 암호화 결과 데이터 앞에 접두사(Prefix) 형태로 결합되어 바이너리에 포함됩니다. 복호화 시에는 앞선 96비트를 IV로 분리하여 복호화를 수행합니다.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>