# 오류 코드

DAT 에서 공식 지원하는 서비스 라이브러리의 공통 오류코드입니다.

각 코드에는 **영향**·**재시도** 두 값이 붙고, 일부에는 **의심** 딱지가 추가로 붙습니다.

## 영향 — 서비스가 받는 타격

알람을 걸 기준입니다. "지금 서비스가 멈췄나"만 봅니다.

| 영향 | 뜻 | 예 |
| --- | --- | --- |
| <span class="lg lg-critical">치명</span> | 서비스나 특정 기능이 **멈춥니다.** 발급 불가, 동기화 영구 실패, 초기화 실패 | 발급 서버에 쓸 수 있는 인증서가 하나도 없음 |
| <span class="lg lg-partial">부분</span> | 일부 요청·주기가 실패하지만 서비스는 계속 돕니다. 대개 자가 회복합니다 | CMS 한 주기 실패. 기존 인증서로 계속 동작 |
| <span class="lg lg-none">영향 없음</span> | 요청 하나를 거부하고 끝입니다 | 조작된 토큰이 들어옴. 걸러내면 그만 |

**영향 없음** 은 알람 대상이 아닙니다. 잘못된 입력이 한 번 들어온 것을 담당자 전원이 확인해야 한다면 알람이 무의미해집니다.

## 의심 — 지속되면 조사

<span class="lg lg-suspect">의심</span> 딱지가 붙은 코드는 **한 건일 때는 정상 운영의 일부**입니다. 클라이언트는 언제든 잘못된 값을 보낼 수 있고, 라이브러리가 걸러내는 것이 제 역할입니다.

다만 이런 오류가 **지속적으로, 또는 특정 출처에서 몰려서** 발생한다면 두 가지 중 하나입니다.

- **설정 이상** — 배포가 잘못됐거나, 구버전 클라이언트가 남아 있거나, 인증서가 어긋나 있습니다.
- **해킹 시도** — 토큰·키를 조작해 검증을 통과시키려는 시도이거나, 유효한 값을 찾는 탐색입니다.

그래서 이 코드들은 **건수를 지표로 잡아 두는 것**이 맞습니다. 임계치를 넘을 때만 알리면 됩니다.

## 재시도

| 재시도 | 뜻 |
| --- | --- |
| <span class="lg lg-transient">일시적</span> | 백오프 후 재시도하면 풀립니다 |
| <span class="lg">영구</span> | 재시도 금지. 설정·입력을 고쳐야 합니다 |
| <span class="lg">상태</span> | 오류가 아닌 신호입니다 |

---

## 토큰

받은 토큰 문자열 자체의 문제입니다.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="요청 거부">
점으로 구분된 파트가 5개가 아니거나, <code>expire</code>가 순수 10진수가 아니거나, <code>cid</code>가 순수 16진수가 아니거나, <code>plain</code>·<code>secure</code>가 base64url이 아니거나, 숫자 필드가 정수 표현 범위를 넘었습니다.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="토큰 재발급 유도">
<code>expire &lt;= now</code>. <strong>정각도 만료</strong>입니다 — <code>expire == now</code>이면 이미 만료된 것으로 봅니다.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 토큰 오류입니다.
</ErrorCode>

::: tip 만료와 형식 오류는 반드시 다릅니다
대응이 정반대입니다 — 만료는 정상적인 수명 종료이므로 토큰을 갱신시키면 되고, 형식 오류는 애초에 우리가 발급한 토큰이 아니므로 거부해야 합니다.

파싱은 **구조를 먼저 확정한 뒤** 값을 봅니다. `"1.2.3"`처럼 파트가 부족한 문자열은 만료된 토큰이 아니라 애초에 토큰이 아니므로 `DAT_TOKEN_MALFORMED`입니다.

`expire` 필드에 `+100`처럼 부호가 붙은 경우도 만료가 아니라 형식 오류입니다. 순수 ASCII 숫자만 허용합니다.
:::

---

## 인증서

인증서 문자열의 형식, 그리고 그 인증서를 지금 쓸 수 있는지의 문제입니다.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="인증서 재배포">
점으로 구분된 파트가 8개가 아니거나, <code>cid</code>·<code>start</code>·<code>duration</code>·<code>ttl</code> 파싱에 실패했거나, 키 필드가 base64url이 아니거나, <code>start + duration + ttl</code>이 u64를 넘었습니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="인증서 갱신">
<code>start + duration + ttl &lt; now</code>. 발급도 검증도 불가능한 완전 만료 상태입니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="대기">
<code>now &lt; start</code>. 발급창이 아직 열리지 않았습니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="새 인증서 배포">
<code>now &gt; start + duration</code>이지만 ttl 은 남았습니다. 발급은 못 하고 검증만 가능합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="배포 설정 확인">
서명 개인키 없이 공개키만 담긴 인증서입니다. 검증은 되지만 발급은 불가능합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="요청 거부">
토큰의 <code>cid</code>에 해당하는 인증서를 보유하지 않습니다. 위조 토큰이거나 오배포입니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="동기화 후 재시도">
그 <code>cid</code>를 아직 CMS 에서 받지 못했습니다. 새 인증서 배포 직후 잠깐 발생합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="서버 응답 확인">
import 하는 목록 안에 같은 <code>cid</code>가 두 번 이상 들어 있습니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 인증서 오류입니다.
</ErrorCode>

`DAT_CERT_NOT_FOUND`와 `DAT_CERT_NOT_SYNCED`는 겉보기 증상이 같지만 대응이 다릅니다. 전자는 우리가 발급한 적 없는 `cid`라 기다려도 안 생기고, 후자는 동기화만 되면 풀립니다.

`DAT_CERT_NOT_FOUND`는 한 건이면 그냥 걸러 내면 되지만, 갑자기 늘어나면 배포가 어긋났거나 위조 토큰이 돌고 있다는 뜻입니다.

---

## 서명

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="세션 차단, 보안 로그">
서명 검증이 <strong>불일치</strong>로 끝났습니다. HMAC 값이 다르거나 ECDSA verify 가 false 입니다.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="요청 거부">
서명 파트가 비어 있거나, base64url이 아니거나, ECDSA <code>r‖s</code> 길이가 곡선과 맞지 않거나, DER 변환에 실패했습니다.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="발급 서버 설정 확인">
verify-only 키로 서명을 시도했습니다. 런타임에 개인키가 없는 상태입니다.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="키 타입·라이브러리 확인">
서명·검증 <strong>연산 자체가 실행되지 못했습니다.</strong> 잘못된 키 타입, 해제된 핸들, 암호 라이브러리 내부 오류입니다.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 서명 오류입니다.
</ErrorCode>

::: warning 불일치와 백엔드 실패를 섞지 마십시오
두 코드는 축이 정반대입니다.

- `DAT_SIG_MISMATCH` — 들어온 서명이 안 맞을 뿐이라 **서비스 영향은 없고**, 대신 지속되면 **의심** 대상입니다.
- `DAT_SIG_BACKEND` — 검증 연산 자체가 못 돌아간 것이라 **우리 쪽 문제**이고, 의심 대상은 아닙니다.

잘못된 키 타입이나 라이브러리 버그를 "서명 불일치"로 보고하면, 실제로는 우리 코드가 고장 난 상황이 공격 지표에 섞여 들어갑니다. 반대로 진짜 위조가 백엔드 오류로 분류되면 의심 지표에서 통째로 빠집니다.
:::

---

## 암호화

secure 페이로드의 암·복호 문제입니다.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="세션 차단, 보안 로그">
AES-GCM 인증 태그가 맞지 않습니다. secure 가 변조됐거나 인증서 키가 다릅니다.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="요청 거부">
암호문이 비어 있지 않은데 IV(12바이트) 이하이거나, 입력이 구현 한계(<code>INT_MAX</code> 등)를 넘었습니다.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="플랫폼 지원 확인">
암·복호 연산이 실행되지 못했습니다. GCM 미지원 플랫폼이거나 컨텍스트 초기화 실패입니다.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 암복호 오류입니다.
</ErrorCode>

**빈 secure 페이로드는 오류가 아닙니다.** 빈 입력은 빈 출력이 되며 어떤 코드도 내지 않습니다.

서명 검증을 건너뛰는 경로에서는 GCM 태그가 **유일한 무결성 검사**입니다. 그래서 `DAT_CRYPTO_TAG_MISMATCH`를 다른 복호화 실패와 같은 코드로 묶지 않습니다.

---

## 키

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="키 교체">
선언한 알고리즘과 키 길이가 불일치(HMAC 32/48/64, AES 16/32)하거나, 곡선 위에 없는 점이거나, <code>d ∉ [1,n-1]</code>이거나, 비압축(0x04) 형식이 아니거나, 개인키와 공개키가 서로 쌍이 아닙니다.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="알고리즘 변경">
HMAC 계열에 verify-only 내보내기를 요청했습니다.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 키 오류입니다.
</ErrorCode>

**비슷해 보이지만 다른 셋:**

| 코드 | 뜻 |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **알고리즘의 구조적 한계.** HMAC은 대칭키라 공개키 개념이 없습니다 |
| `DAT_SIG_KEY_MISSING` | **런타임 상태.** 지금 이 키에 개인키가 안 들어 있습니다 |
| `DAT_CERT_VERIFY_ONLY` | **배포 형태.** 이 인증서가 검증 전용으로 배포됐습니다 |

---

## 매니저

인증서를 보유하고 발급·검증에 쓰는 객체의 상태입니다.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS 연결 확인">
인증서를 하나도 보유하지 않았습니다. import 전이거나 CMS 최초 동기화에 실패한 상태입니다.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="사유(cause)를 보고 판단 — 아래 표">
인증서는 있지만 지금 발급에 쓸 수 있는 것이 없습니다. <strong>사유가 함께 전달됩니다.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="호출 코드 수정">
이미 해제된 매니저나 인증서를 사용했습니다.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 매니저 오류입니다.
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`의 사유(`cause`)는 넷 중 하나입니다. **원인마다 해야 할 일이 전혀 다릅니다.**

| 사유 | 뜻 | 재시도 | 대응 |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | 발급창 시작 전 | **일시적** | 기다리면 풀립니다 |
| `DAT_CERT_ISSUANCE_ENDED` | 발급창 종료, 검증만 가능 | 영구 | 새 인증서를 배포해야 합니다 |
| `DAT_CERT_EXPIRED` | 보유분이 전부 만료 | 영구 | 인증서 갱신이 필요합니다 |
| `DAT_CERT_VERIFY_ONLY` | 보유분이 전부 검증 전용 | 영구 | **배포 설정 실수입니다** |

발급 서버가 검증 전용 인증서만 받도록 설정되면 `DAT_CERT_VERIFY_ONLY`가 나옵니다. 기다려도 절대 안 풀리므로 재시도 대상이 아닙니다.

---

## 설정

호출자가 넘긴 값의 문제입니다. `CONFIG` 계열은 전부 **코드를 고쳐야 하는 오류**이며, 운영 중에 나면 배포가 잘못된 것입니다.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="알고리즘 이름 확인">
모르는 알고리즘 이름입니다. 와이어 표기(<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>)와 정확히 일치해야 합니다.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="호출 코드 수정">
필수 인자가 null 이거나, 허용 범위 밖(음수 시간값, <code>interval &lt;= 0</code>)이거나, 지원하지 않는 타입(동적 타입 언어에서 payload 에 숫자·불린 전달)이거나, 서명 대상 body 가 비어 있습니다.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI 수정">
CMS 서버 URI 가 규격 밖입니다. 파싱 불가, 스킴이 http/https 가 아님, 경로나 쿼리가 붙어 있는 경우입니다.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 설정 오류입니다.
</ErrorCode>

---

## 내부

실행 환경과 런타임의 문제입니다.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="배포·플랫폼 확인">
암호 백엔드나 런타임 API 가 아예 없습니다. <code>crypto.subtle</code> 부재, AES-GCM 미지원 플랫폼, 런타임 버전 미달입니다.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="로그 확인">
메모리 할당 실패, 난수 생성 실패, 락 획득 실패, 도달 불가로 설계된 분기에 도달했습니다.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE`은 배포 환경을 고치면 해결되고, `DAT_INTERNAL_UNKNOWN`은 대개 런타임 장애이거나 라이브러리 버그입니다.

---

## CMS 동기화

CMS 동기화를 쓰지 않으면 이 코드는 나오지 않습니다.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="백오프 후 재시도">
DNS 실패, 연결 거부, TLS 실패, <strong>타임아웃</strong>입니다. 타임아웃은 별도 코드가 아니라 여기에 포함됩니다 — 대응이 같기 때문입니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="토큰 설정 확인">
서버가 401 로 응답했습니다. 토큰이 없거나 틀렸습니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="토큰 등급 확인">
서버가 403 으로 응답했습니다. 토큰은 유효하나 이 엔드포인트 권한이 없습니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL 설정 확인">
서버가 404 로 응답했습니다. URL 이 틀렸습니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="백오프 후 재시도">
서버가 5xx 로 응답했습니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="상태 코드 확인">
위에 해당하지 않는 비-2xx 응답입니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="서버 버전 확인">
응답에 버전 줄이 없거나, 버전 줄이 순수 10진수가 아니거나, 범위를 넘었습니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="cause 의 CERT_* / KEY_* 확인">
응답은 받았으나 인증서를 적용하지 못했습니다. <strong>원인이 <code>cause</code>에 담깁니다.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="자동 처리됨">
서버가 우리보다 과거 버전을 돌려줬습니다. 전체 재동기화 지시입니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="첫 동기화 대기">
아직 한 번도 동기화에 성공하지 못한 상태입니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
이전 동기화가 아직 도는 중이라 이번 주기를 건너뛰었습니다. 오류가 아닙니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="빌드 옵션 확인">
CMS 기능이 빌드에 포함되지 않았습니다. feature 미활성이거나 CURL 미탑재입니다.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="로그 확인">
위 어디에도 분류되지 않은 CMS 오류입니다.
</ErrorCode>

동기화가 **영구 실패**로 판정되는 코드(`UNAUTHORIZED`·`FORBIDDEN`·`ENDPOINT_NOT_FOUND`·`MALFORMED`·`IMPORT_FAILED`)는 전부 치명입니다. 재시도해도 안 풀리는데 인증서는 계속 만료되므로, 방치하면 서비스가 반드시 멈춥니다.

반대로 `UNREACHABLE`·`SERVER_ERROR` 는 부분입니다. 기존 인증서로 계속 동작하고 다음 주기에 자가 회복합니다 — **다만 계속 실패하면 결국 치명으로 넘어갑니다.** 연속 실패 횟수를 기준으로 알람을 거십시오.

::: tip 동기화 실패는 예외로 던지지 않습니다
최초 동기화가 실패해도 매니저는 정상 반환됩니다 — 뒤늦게라도 동기화되는 편이 낫기 때문입니다. 대신 실패는 **조회 가능한 상태**로 남습니다.

| 클라이언트 | 조회 방법 |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

한 번도 성공하지 못했으면 `DAT_CMS_NOT_SYNCED`, 정상이면 비어 있습니다.
:::

---

## 서버

CMS 서버가 내는 코드입니다. 클라이언트는 이 코드를 **만들지 않고 수신만** 합니다.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
<code>Authorization</code> 헤더가 없거나, 토큰이 어느 등급에도 등록돼 있지 않습니다.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
토큰은 등록돼 있으나 이 엔드포인트가 요구하는 등급이 아닙니다.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="즉시 토큰 설정">
토큰이 하나도 설정되지 않아 인증이 통째로 비활성입니다. <strong>인증서 발급 API 까지 무인증으로 열립니다.</strong> 응답으로 나가지 않고 기동 로그에만 찍힙니다.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
경로·쿼리 파라미터를 해석할 수 없거나, 인자가 허용 범위 밖(음수 delay, 10년 초과 등)입니다.
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
요청 경로의 알고리즘 이름을 모릅니다.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
그런 라우트가 없거나 메서드가 다릅니다.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
요청 본문 크기를 초과했습니다.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
위 어디에도 분류되지 않은 요청 오류입니다.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="백오프 후 재시도">
DB 연결 끊김, 커넥션 풀 고갈, 락 경합, 타임아웃입니다. <strong>503 을 쓰는 유일한 코드</strong>로, 클라이언트가 "이건 기다리면 낫는다"를 알 수 있는 신호입니다.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB 상태 확인">
조회·쓰기 실패, 테이블 없음, 스키마 불일치, 저장된 인증서 행 손상입니다.
</ErrorCode>

응답 봉투:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

인증서를 만들고 다루다 나는 오류는 서버도 위의 공통 코드(`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`)를 그대로 씁니다.

### 서버 코드를 받으면

클라이언트는 서버 코드를 자기 쪽 `CMS` 코드로 감싸고, 원본은 `cause`에 보존합니다.

| 수신한 것 | HTTP | 클라이언트가 내는 코드 |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (그 외) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (버전 강등) | 200 | `DAT_CMS_VERSION_RESET` |

---

## 증상으로 찾기

| 증상 | 코드 |
| --- | --- |
| 로그인 직후엔 되다가 잠시 후 거부됨 | `DAT_TOKEN_EXPIRED` — 토큰 수명이 다 됐습니다. 재발급하면 됩니다 |
| 특정 서버에서만 검증 실패 | `DAT_CERT_NOT_SYNCED` — 그 서버가 아직 새 CID 를 못 받았습니다 |
| 모든 서버에서 같은 토큰이 거부됨 | `DAT_CERT_NOT_FOUND` — 우리가 발급한 적 없는 CID 입니다 |
| 발급 서버가 토큰을 못 만듦 | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **verify-only 로 배포됐습니다** |
| 기동 직후에만 발급 실패 | `DAT_MANAGER_NO_CERTIFICATE` — 첫 동기화 전입니다. 잠시 후 풀립니다 |
| CMS 동기화가 계속 실패 | `DAT_CMS_UNAUTHORIZED` — 토큰이 틀렸습니다. 재시도해도 안 풀립니다 |
| 인증서가 하나도 안 옴 | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL 오타입니다 |
| 특정 플랫폼에서만 실패 | `DAT_INTERNAL_UNAVAILABLE` — 암호 백엔드가 없습니다 |
| 검증 실패가 갑자기 늘어남 | `DAT_SIG_MISMATCH` — 한 건은 무해하지만 **몰려서 나면 위조 시도**입니다 |
| secure 복호화가 갑자기 실패 | `DAT_CRYPTO_TAG_MISMATCH` — 인증서가 어긋났거나 **변조 시도**입니다 |
| CMS 기동 로그에 경고 | `DAT_AUTH_DISABLED` — **인증이 꺼져 있습니다.** 발급 API 가 열려 있습니다 |

---

## 부록

### 코드 문법

```
DAT_<영역>_<원인>
```

- 같은 원인이 서로 다른 영역에서 나면 **원인 이름이 같습니다.** `DAT_TOKEN_MALFORMED`와 `DAT_CERT_MALFORMED`는 대상만 다르고 뜻이 같습니다.
- `_UNKNOWN`은 각 영역의 **폴백 전용**입니다. "알 수 없는 알고리즘"처럼 다른 뜻으로 쓰지 않습니다(그건 `_UNSUPPORTED`입니다).
- 코드 문자열은 공개 계약입니다. 메시지는 자유롭게 바꿔도 되지만 코드는 바꾸지 않습니다.

| 분류 | 코드 접두사 |
| --- | --- |
| 토큰 | `DAT_TOKEN_` |
| 인증서 | `DAT_CERT_` |
| 서명 | `DAT_SIG_` |
| 암호화 | `DAT_CRYPTO_` |
| 키 | `DAT_KEY_` |
| 매니저 | `DAT_MANAGER_` |
| 설정 | `DAT_CONFIG_` |
| 내부 | `DAT_INTERNAL_` |
| CMS 동기화 | `DAT_CMS_` |
| 서버 | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### 클라이언트별 접근 방법

| 클라이언트 | 오류 타입 | 코드 | 재시도 분류 | 보안 이벤트 |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS 서버 | JSON 봉투 | `code` 필드 | — | — |

`보안 이벤트` 는 위조·변조가 확정적인 두 건(`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`)만 `true` 를 돌려줍니다. 이 문서의 **의심** 딱지는 그보다 넓은 범위(조작된 토큰·키·요청까지)이며, 지금은 문서 분류일 뿐 클라이언트 API 로는 노출하지 않습니다.

**영향** 등급도 마찬가지로 문서 분류입니다. 같은 코드라도 어디서 났는지에 따라 타격이 달라지기 때문입니다 — 예를 들어 `DAT_KEY_INVALID` 는 들어온 토큰을 거를 때는 영향이 없지만, CMS 동기화 중 인증서를 읽다 나면 동기화가 통째로 실패합니다.

**하위 원인은 버려지지 않습니다.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`와 `DAT_CMS_IMPORT_FAILED`는 각 언어의 예외 체이닝(`cause` / `__cause__` / `InnerException` / `Unwrap()`)으로 사유를 전달합니다.

::: warning C/C++는 정수값도 유지합니다
`dat_error_t`의 기존 정수값은 ABI 호환을 위해 그대로 두지만 **문자 코드가 정본**입니다. 라이브러리는 더 이상 예전 값을 반환하지 않으므로 `err == DAT_ERROR_INVALID_DAT` 같은 비교는 맞지 않습니다. `dat_error_code(e)`로 대조하십시오.

C 에는 예외 체이닝이 없어 사유는 `dat_manager_issuable_cause()`로 따로 조회합니다.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
