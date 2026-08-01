# DAT 인증서

## 1. 개요

**DAT 인증서**는 DAT의 발급 권한을 제어하고, 토큰의 서명 및 암호화 알고리즘과 키(Key) 정보를 관리하기 위한 규격입니다.

각 인증서는 고유한 ID(`CID`)를 가지며, DAT의 발급 가능 기간 및 생성되는 토큰의 유효기간(TTL)을 강제함으로써 토큰 생명주기를 안전하게 관리합니다.

DAT에서 **키 롤링은 선택이 아닙니다.** 인증서에 발급 가능 기간이 규격 차원에서 박혀 있기 때문에, 기간이 지나면 그 인증서로는 새 토큰을 만들 수 없습니다.

---

## 2. 인증서 구조

<WireFormat
    title="인증서 와이어 포맷"
    hint="각 필드에 마우스를 올리면 설명이 표시됩니다."
    :segments="[
        {name: 'cid', type: 'uint64 (16진수)', kind: 'meta', note: '인증서 고유 ID. DAT의 cid 필드와 대조됩니다.'},
        {name: 'start', type: 'uint64 (10진수)', kind: 'meta', note: '발급 시작 시각(Unixtime 초).'},
        {name: 'duration', type: 'uint64 (10진수)', kind: 'meta', note: '발급 가능 기간(초). 절대 시각이 아니라 기간입니다.'},
        {name: 'ttl', type: 'uint64 (10진수)', kind: 'meta', note: '이 인증서로 발급되는 DAT의 유효기간(초).'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: '서명 알고리즘 이름.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: '암호화 알고리즘 이름.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '서명 키. verify-only로 내보내면 ECDSA는 공개키만 나갑니다.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '암호화 키. 대칭키이므로 verify-only 여부와 무관하게 항상 전체가 나갑니다.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. 필드별 세부 명세

`CID` : Hex (uint64)

* 인증서를 식별하는 고유한 인증서 ID입니다. DAT의 `CID` 필드와 매핑되어 검증 시 어떤 인증서를 사용할지 결정합니다.
* **CID는 불변 식별자입니다.** 키를 교체할 때는 같은 CID를 재사용하지 않고 새 CID로 인증서를 발행합니다.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* 해당 인증서를 사용하여 DAT를 발급할 수 있는 **시작 시각**을 초(Seconds) 단위로 나타냅니다.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* 인증서의 **발급 유효 기간**입니다. `{{t('dat_issue_start')}}`으로부터 본 기간(초)이 지난 후에는 이 인증서로 새로운 DAT를 발급할 수 없습니다.
* **절대 시각이 아니라 기간(duration)입니다.** 종료 시각은 `start + duration`으로 계산됩니다.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* 이 인증서로 발급되는 DAT의 유효기간(Time To Live)입니다. DAT 생성 시 `expire` 값은 발급 시각에 이 값을 더해 설정됩니다.

`{{t('sig_alg')}}` : String / Enum

* DAT의 `signature` 필드를 생성하고 검증할 때 사용할 **서명 알고리즘**입니다.

`{{t('crypto_alg')}}` : String / Enum

* DAT의 `secure` 필드를 암호화하고 복호화할 때 사용할 **암호화 알고리즘**입니다.

`{{t('sig_key')}}` : Base64Url (Binary)

* 서명 및 검증에 사용되는 키 데이터입니다. (알고리즘에 따라 비대칭키의 Public/Private Key 또는 대칭키가 될 수 있습니다.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* `secure` 필드 암·복호화에 사용되는 암호화 키 데이터입니다.

### 2.2. 시간 계산

```
end    = start + duration        발급 종료 시각
expire = end + ttl               인증서 최종 만료 시각
```

* 모든 계산은 uint64에서 수행하며 **오버플로만 오류**로 거부합니다.
* `duration = 0`, `ttl = 0` 은 **합법적인 값**입니다. 발급 창이 즉시 닫히는 인증서, 또는 만료 즉시 무효가 되는 토큰을 만드는 인증서를 표현할 수 있습니다.
* 필드가 모두 부호 없는 정수이므로 **음수는 타입상 존재하지 않습니다.**

### 2.3. 생성자 시그니처

모든 언어 구현체가 아래 인자 순서를 사용합니다.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning 세 번째 인자는 종료 시각이 아니라 기간입니다
세 번째 인자에 절대 종료 시각(end)을 넘기면 오류 없이 **엉뚱한 유효 창을 가진 인증서**가 만들어집니다. 값이 그대로 `start + duration`에 들어가기 때문입니다.
:::

---

## 3. 인증서 수명주기

<CertTimeline
    title="인증서의 네 구간"
    caption="인증서는 발급 지연 → 발급 가능 → DAT TTL 잔여 구간을 모두 지난 뒤에야 최종 만료됩니다."
    :marks="['생성', '발급 시작', '발급 종료', '최종 만료']"
    :phases="[
        {label: '발급 지연 (delay)', weight: 1.2, kind: 'delay', note: '모든 노드가 인증서를 받아 갈 시간'},
        {label: '발급 가능 (duration)', weight: 3, kind: 'issue', note: 'DAT 발급 + 검증 모두 가능'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: '발급 불가, 검증만 가능'},
    ]"
/>

| 구간 | 발급 | 검증 | 판정 |
| --- | --- | --- | --- |
| 발급 지연 | ✕ | ○ | `issuable() == false` |
| 발급 가능 | ○ | ○ | `issuable() == true` |
| DAT TTL 잔여 | ✕ | ○ | 발급 창은 닫혔지만 만료 전 |
| 최종 만료 이후 | ✕ | ✕ | `expired() == true` |

* **발급 가능 여부**는 `signable() && start <= now <= end`로 판정하며, **양 끝을 포함**합니다.
* 발급 창이 닫힌 뒤에도 인증서는 `ttl`만큼 더 살아 있습니다. 창이 닫히기 직전에 발급된 토큰이 자기 수명을 다 채울 수 있어야 하기 때문입니다.
* **발급 지연(delay)** 구간은 클러스터의 모든 노드가 새 인증서를 받아 갈 시간을 벌기 위한 것입니다. 자세한 내용은 [{{t('menu_spec_cms')}}](./cms) 문서를 참고하십시오.

---

## 4. 알고리즘

### 4.1. 서명 알고리즘

DAT의 위·변조 방지를 위한 서명 알고리즘 목록입니다. 대칭키와 비대칭키 방식을 지원합니다.

| 이름 | 방식 | 비고 |
| --- | --- | --- |
| `ECDSA-P256` | 비대칭 | 타원곡선 디지털 서명 (NIST secp256r1) |
| `ECDSA-P384` | 비대칭 | 타원곡선 디지털 서명 (NIST secp384r1) |
| `ECDSA-P521` | 비대칭 | 타원곡선 디지털 서명 (NIST secp521r1) |
| `HMAC-SHA256-MFS` | 대칭 | 256-bit 고정 크기 비밀키 기반 Keyed-Hashing |
| `HMAC-SHA384-MFS` | 대칭 | 384-bit 고정 크기 비밀키 기반 Keyed-Hashing |
| `HMAC-SHA512-MFS` | 대칭 | 512-bit 고정 크기 비밀키 기반 Keyed-Hashing |

> **MFS (Maximum Fixed Secret):** 해시 알고리즘의 출력(Output) 크기와 동일한 비트 수의 고정 크기 비밀키를 사용하는 방식입니다.

### 4.2. 암호화 알고리즘

DAT 내부의 기밀 데이터(`secure` 필드)를 보호하기 위한 인증된 암호화(Authenticated Encryption) 알고리즘 목록입니다.

| 이름 | 키 길이 | 구조 |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV(96bit) + 암호화 결과 |
| `IV-AES256-GCM` | 256-bit | IV(96bit) + 암호화 결과 |

> **IV (Initialization Vector) 내재화:** 매 암호화마다 생성되는 고유한 96비트 NONCE(IV)가 암호화 결과 앞에 접두사(Prefix) 형태로 결합됩니다. 복호화 시에는 앞선 96비트를 IV로 분리하여 복호화를 수행합니다.

### 4.3. 키 길이 검증

인증서를 읽어들일 때 **선언한 알고리즘의 비트 수와 실제 키 길이가 일치하는지 확인**합니다.

예를 들어 `IV-AES256-GCM`이라고 선언한 인증서에 16바이트 키가 들어 있으면 가져오기 자체가 거부됩니다. 이 검사가 없으면 AES-256을 쓴다고 믿으면서 실제로는 AES-128로 동작하게 됩니다.

---

## 5. verify-only 내보내기

검증만 수행하는 서버에는 서명용 개인키를 줄 필요가 없습니다. DAT 인증서는 이를 위해 **verify-only 내보내기**를 제공합니다.

<FlowDiagram
    title="전체 인증서와 verify-only 인증서의 배포 경로"
    :legend="{req: '요청', res: '응답', sync: '인증서 배포'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: '발급 서버', kind: 'issuer'},
        {id: 'verifier', label: '검증 전용 서버', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: '전체 인증서 (서명 개인키 포함)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'verify-only 인증서', kind: 'sync'},
    ]"
/>

| 서명 알고리즘 | `support_verify_only()` | verify-only 내보내기 결과 |
| --- | --- | --- |
| **ECDSA** 계열 | `true` | 서명키는 **공개키만** 나갑니다 (Base64 130자 → 87자) |
| **HMAC** 계열 | `false` | **명시적 오류**가 발생합니다 |

HMAC은 대칭키라서 "검증만 가능한 키"라는 것이 존재하지 않습니다. 따라서 verify-only 내보내기를 시도하면 조용히 건너뛰지 않고 **오류로 즉시 알립니다.** HMAC 인증서를 섞어 둔 채 verify-only 내보내기를 호출하면 실패하므로, 검증 전용 노드를 운영한다면 ECDSA 계열을 사용해야 합니다.

::: danger 암호화 키는 verify-only에서도 전체가 나갑니다
`secure` 필드용 AES 키는 **대칭키**이므로 verify-only 여부와 무관하게 **항상 전체가 내보내집니다.** 복호화하려면 암호화한 것과 같은 키가 필요하기 때문입니다.

즉 verify-only 인증서를 받은 서버는:

* **서명을 위조할 수 없습니다** — 개인키가 없으므로 새 DAT를 만들지 못합니다.
* **`secure` 페이로드는 복호화할 수 있습니다** — 그들에 대한 기밀성은 제공되지 않습니다.

verify-only는 *발급 권한*을 나누는 장치이지 *기밀성*을 나누는 장치가 아닙니다. 검증 노드에 숨겨야 하는 값이라면 `secure`에 넣어서는 안 됩니다.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
