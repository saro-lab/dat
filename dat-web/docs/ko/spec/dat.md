# DAT (Distributed Access Token)

## 1. 개요

동시 접속 사용자 수가 증가함에 따라 세션(Session)의 수도 함께 늘어나며 세션 서버에 과도한 부하가 발생하게 됩니다.

**DAT**는 이러한 세션 서버의 부하 문제를 해결하고, 서버 간 상태를 공유하지 않는(Stateless) 효율적인 인증을 구현하기 위해 고안된 토큰 규격입니다.

DAT는 점(`.`)으로 구분된 **5개의 고정 필드**로 이루어진 문자열입니다. JSON 파싱 없이 구분자 위치만으로 각 필드를 잘라낼 수 있으며, 만료 시각과 암호화 영역이 규격 자체에 포함되어 있습니다.

---

## 2. 와이어 포맷

<WireFormat
    title="DAT 와이어 포맷"
    hint="각 필드에 마우스를 올리면 설명이 표시됩니다."
    :segments="[
        {name: 'expire', type: 'uint64 (10진수)', kind: 'meta', note: '토큰 만료 시각. Unixtime 초 단위의 10진수입니다.'},
        {name: 'cid', type: 'uint64 (16진수)', kind: 'meta', note: '검증에 사용할 인증서 ID. 소문자 16진수로 표기합니다.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: '클라이언트에 공개되는 데이터. 누구나 디코딩할 수 있습니다.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: '암호화된 데이터. IV(96bit) + AES-GCM 암호문 구조이며, 비어 있으면 빈 문자열입니다.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: '앞 네 필드 전체에 대한 서명. 이 필드가 위·변조를 차단합니다.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| 필드 | 타입 | 인코딩 | 비고 |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | 10진수 문자열 | Unixtime(초) |
| `CID` | uint64 | 16진수 문자열 | 인증서 ID |
| `{{t('dat_plain')}}` | Binary | Base64Url (패딩 없음) | 공개 데이터 |
| `{{t('dat_secure')}}` | Binary | Base64Url (패딩 없음) | 암호화 데이터 |
| `{{t('sig')}}` | Binary | Base64Url (패딩 없음) | 서명 |

<Struct type="dat" />

### 2.1. 필드별 세부 명세

`{{t('dat_expire')}}` : uint64 (Unix Time)
- 토큰의 만료 시각을 초(Seconds) 단위의 64비트 부호 없는 정수로 나타냅니다.
- **순수 10진수만 허용**합니다. 부호·공백·구분자가 포함되면 형식 오류입니다.

`CID` : Hex (uint64)
- 토큰 검증에 사용할 인증서 ID (Certificate ID) 입니다.
- **순수 16진수만 허용**하며, `0x` 접두는 사용하지 않습니다.

`{{t('dat_plain')}}` : Base64Url (Binary)
- 클라이언트에 공개할 데이터를 담습니다. 문자열뿐만 아니라 바이너리 데이터도 지원하며, 클라이언트에서 디코딩하여 확인할 수 있습니다.
- **암호화되지 않습니다.** 민감한 값을 넣어서는 안 됩니다.

`{{t('dat_secure')}}` : Base64Url (Binary)
- 클라이언트에 비공개할 데이터를 담습니다. 인증서의 암호화 알고리즘으로 암호화되어 있어 인증서를 갖지 않은 클라이언트는 내용을 복호화할 수 없습니다.
- 내부 구조는 `IV(96bit) + 암호문`이며, IV는 매 암호화마다 새로 생성됩니다.

`{{t('sig')}}` : Base64Url (Binary)
- 토큰의 위·변조를 검증하기 위한 서명 데이터입니다. 앞선 필드들을 인증서의 서명 알고리즘으로 서명하여 생성합니다.
- 서명 검증에 실패한 토큰은 어떤 필드도 신뢰해서는 안 됩니다.

---

## 3. 정규 규칙 (Canonical Rules)

여러 언어로 구현된 클라이언트가 **같은 토큰을 똑같이 해석**하려면 아래 규칙이 구현체마다 어긋나서는 안 됩니다. 기준 구현은 Rust(`dat-rust`)이며, 나머지 구현체는 모두 이 규칙에 맞춰져 있습니다.

### 3.1. 숫자 필드 파싱

`expire`와 `cid`는 **엄격하게** 해석합니다. 아래 입력은 전부 형식 오류로 거부됩니다.

| 입력 예 | 결과 | 사유 |
| --- | --- | --- |
| `100` | 통과 | 순수 10진수 |
| `007` | 통과 | 선행 0은 허용 |
| `+100` | 거부 | 부호 사용 불가 |
| `-1` | 거부 | 부호 사용 불가 |
| `" 100 "` | 거부 | 공백 불가 |
| `1_0` | 거부 | 구분자 불가 |
| `0x10` | 거부 | 접두 불가 |
| `zzzz` | 거부 | 숫자가 아님 |
| `""` | 거부 | 빈 문자열 |
| `18446744073709551616` | 거부 | uint64 범위 초과 |

::: warning 왜 엄격해야 하는가
관대한 파서는 `-1`을 uint64의 최댓값으로 되돌려 **사실상 만료되지 않는 토큰**을 만들거나, 숫자가 아닌 값을 조용히 `0`으로 바꿉니다. 구현체마다 관대함이 다르면 같은 토큰이 한쪽에서는 통과하고 다른 쪽에서는 거부되어 상호운용이 깨집니다.
:::

### 3.2. 만료 판정

**DAT 토큰과 인증서는 만료 경계가 서로 다릅니다.** 혼동하지 마십시오.

| 대상 | 유효 조건 | 만료 시각 정각(`expire == now`) |
| --- | --- | --- |
| **DAT 토큰** | `expire > now` | **만료로 거부** |
| **인증서** | `expire >= now` | **아직 유효** |

토큰은 만료 시각이 되는 순간 즉시 무효가 되고, 인증서는 그 시각까지 유효합니다. 인증서가 토큰보다 한 틱 더 오래 살아 있어야 경계에서 발급된 토큰을 검증할 수 있기 때문입니다.

### 3.3. 빈 secure 페이로드

암호화할 데이터가 없으면 `secure`는 **빈 문자열**입니다.

- `encrypt(빈 입력)` → 빈 출력 (IV도 GCM 태그도 붙지 않습니다)
- `decrypt(빈 입력)` → 빈 출력
- 비어 있지 않은데 IV 길이(12바이트) 이하이면 **복호화 오류**입니다.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ secure 자리가 비어 있는 정상 토큰
```

---

## 4. 발급과 검증

<FlowDiagram
    title="DAT 발급 → 전달 → 검증"
    :legend="{req: '요청', res: '응답', sync: '인증서 동기화'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '발급 서버', kind: 'issuer'},
        {id: 'client', label: '클라이언트', kind: 'client'},
        {id: 'verifier', label: '검증 서버', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: '인증서 배포', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: '인증서 배포', kind: 'sync'},
        {from: 'client', to: 'issuer', label: '로그인', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'DAT 발급', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'DAT 첨부 요청', kind: 'req'},
        {from: 'verifier', label: 'CID로 인증서 조회 → 서명 검증 → 복호화', kind: 'note'},
        {from: 'verifier', to: 'client', label: '응답', kind: 'res'},
    ]"
/>

### 4.1. 발급 절차

1. 매니저가 보유한 인증서 중 **발급 가능한(issuable)** 인증서를 고릅니다.
2. `expire = now + dat_ttl_seconds`를 계산합니다.
3. `plain`을 Base64Url로 인코딩하고, `secure`는 암호화한 뒤 Base64Url로 인코딩합니다.
4. `expire.cid.plain.secure` 문자열에 서명하여 마지막 필드로 덧붙입니다.

### 4.2. 검증 절차

1. 점(`.`)으로 5개 필드로 나눕니다. 필드 수가 다르면 형식 오류입니다.
2. `expire`를 확인합니다. 만료된 토큰은 서명 검증 이전에 거부됩니다.
3. `cid`로 인증서를 찾습니다. 없으면 검증 불가입니다.
4. `expire.cid.plain.secure` 구간에 대해 서명을 검증합니다.
5. 검증에 성공한 뒤에야 `secure`를 복호화합니다.

::: danger 서명 검증 전의 값을 신뢰하지 마십시오
일부 구현체는 서명을 확인하지 않고 필드를 꺼내 보는 API(`parse without verify` 계열)를 제공합니다. 이 값은 **전적으로 공격자가 조작할 수 있는 값**이며, 로깅·디버깅 용도로만 사용해야 합니다.
:::

---

## 5. JWT와의 비교

DAT와 JWT(JSON Web Token)는 점(`.`)으로 구분된 토큰 구조와 서명을 통한 검증 방식을 공유하지만, 내부 설계에서 다음과 같은 핵심적인 차이점이 있습니다.

### 5.1. 구조적 차이 비교

* **JWT 구조**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT 구조**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. 핵심 차이점

* **Binary 기반의 경량화:** JWT는 Header와 Body를 JSON 문자열 형태로 다루지만, DAT는 **바이너리(Binary) 데이터를 직접 다룸**으로써 데이터 크기를 최적화하고 파싱 효율을 높였습니다.
* **보안성 내재화 (`{{t('dat_secure')}}` 필드):** JWT는 기본적으로 페이로드(Payload)가 평문으로 노출되어 암호화가 필요할 경우 JWE 같은 별도 규격을 적용해야 합니다. 반면, DAT는 **`{{t('dat_secure')}}` 필드를 통해 토큰 자체적으로 암호화 기능을 지원**합니다.
* **만료 시간 제약 강제:** JWT에서는 `exp` (Claims) 필드가 선택 사항이지만, DAT는 **`{{t('dat_expire')}}` 필드가 토큰 구조상에 강제**되어 있어 유효기간 검증이 필수적으로 수행됩니다.
* **알고리즘 협상 없음:** JWT는 헤더의 `alg` 값을 토큰 자신이 들고 다니기 때문에 알고리즘 혼동 공격의 표면이 생깁니다. DAT는 알고리즘을 **인증서가 결정**하며 토큰에는 알고리즘 정보가 들어 있지 않습니다.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
