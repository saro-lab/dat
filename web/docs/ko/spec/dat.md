# DAT (Data Authentication Token)

## 1. 개요 (Introduction)

동시 접속 사용자 수가 증가함에 따라 세션(Session)의 수도 함께 늘어나며 세션 서버에 과도한 부하가 발생하게 됩니다.

**DAT**는 이러한 세션 서버의 부하 문제를 해결하고, 서버 간 상태를 공유하지 않는(Stateless) 효율적인 인증을 구현하기 위해 고안된 토큰 스펙입니다.

---

## 2. 토큰 구조 (Structure)

<Struct type="dat" />

### 2.1. 필드별 세부 명세

`{{t('dat_expire')}}` : uint64 (Unix Time)
- 토큰의 만료 시간을 초(Seconds) 단위의 64비트 부호 없는 정수로 나타냅니다.

`CID` : Hex (uint64)
- 토큰 검증에 사용할 인증서 ID (Certificate ID) 입니다.

`{{t('dat_plain')}}` : Base64Url (Binary)
- 클라이언트에 공개할 데이터를 담습니다. 문자열뿐만 아니라 바이너리 데이터도 지원하며, 클라이언트에서 디코딩하여 확인할 수 있습니다.

`{{t('dat_secure')}}` : Base64Url (Binary)
- 클라이언트에 비공개할 데이터를 담습니다. 인증서 기반의 암호화 알고리즘으로 암호화되어 있어 클라이언트가 내용을 복호화할 수 없습니다.

`{{t('sig')}}` : Base64Url (Binary)
- 토큰의 위·변조를 검증하기 위한 서명 데이터입니다. 앞선 필드들을 인증서의 서명 알고리즘으로 서명하여 생성합니다.

---

## 3. JWT와의 비교

DAT와 JWT(JSON Web Token)는 점(`.`)으로 구분된 토큰 구조와 서명(`signature`)을 통한 검증 방식을 공유하지만, 내부 설계에서 다음과 같은 핵심적인 차이점이 있습니다.

### 3.1. 구조적 차이 비교

* **JWT 구조**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 구조**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. 핵심 차이점

* **Binary 기반의 경량화:** JWT는 Header와 Body를 JSON 문자열 형태로 다루지만, DAT는 **바이너리(Binary) 데이터를 직접 다룸**으로써 데이터 크기를 최적화하고 파싱 효율을 높였습니다.
* **보안성 내재화 (`{{t('dat_secure')}} (secure)` 필드):** JWT는 기본적으로 페이로드(Payload)가 평문으로 노출되어 암호화가 필요할 경우 JWE 같은 별도 스펙을 적용해야 합니다. 반면, DAT는 **`{{t('dat_secure')}}` 필드를 통해 토큰 자체적으로 암호화 기능을 지원**합니다.
* **만료 시간 제약 강제:** JWT에서는 `exp` (Claims) 필드가 선택 사항이지만, DAT는 **`{{t('dat_expire')}} (expire)` 필드가 토큰 구조상에 강제**되어 있어 유효기간 검증이 필수적으로 수행됩니다.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>