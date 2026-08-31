# 오류코드

DAT 구현은 사람이 읽는 메시지와 별도로 안정적인 오류 코드를 제공합니다. 프로그램은 메시지 문자열을 비교하지 않고 코드와 재시도 분류로 동작을 결정합니다.

## 읽는 방법

```text
DAT_<영역>_<원인>
```

| 접두사 | 영역 |
| --- | --- |
| `DAT_TOKEN_` | DAT 문자열과 만료 |
| `DAT_CERT_` | 인증서 문자열과 상태 |
| `DAT_SIG_` | 서명과 검증 |
| `DAT_CRYPTO_` | 암호화와 복호화 |
| `DAT_KEY_` | 키 형식과 권한 |
| `DAT_MANAGER_` | 인증서 매니저 |
| `DAT_CONFIG_` | 호출 인자와 설정 |
| `DAT_INTERNAL_` | 런타임 내부 기능 |
| `DAT_CMS_` | CMS 클라이언트 동기화 |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS 서버 |

`_UNKNOWN`은 각 영역에서 다른 코드로 분류할 수 없는 오류에만 사용합니다. 같은 원인은 영역이 달라도 같은 이름을 사용합니다.

## 재시도 분류

| 분류 | 의미 | 처리 |
| --- | --- | --- |
| 일시적 | 외부 상태가 회복되면 성공할 수 있음 | 백오프 후 제한적으로 재시도 |
| 상태 | 인증서 동기화나 시간이 바뀌면 성공할 수 있음 | 필요한 상태를 갱신한 뒤 재시도 |
| 영구 | 같은 입력으로 다시 해도 실패함 | 입력·설정·코드 수정 |

## 토큰과 인증서

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT의 필드 수, 숫자 또는 Base64Url 표현이 규격과 다릅니다. 입력을 버립니다.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT의 만료 시각이 현재 시각과 같거나 과거입니다. 새 DAT를 받아야 합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
인증서 문자열의 구조나 필드 표현이 잘못되었습니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT의 `cid`에 해당하는 인증서가 없습니다. 인증서 동기화 상태를 확인합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
사용할 인증서가 아직 서비스에 도착하지 않았을 가능성이 있습니다. 즉시 동기화 후 다시 판단합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
인증서의 시작 시각이 아직 오지 않았습니다. 시스템 시각과 인증서 배포 시점을 확인합니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
인증서의 검증 가능 기간이 끝났습니다.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
한 번의 가져오기 목록에 같은 `cid`가 반복되었습니다. 전체 가져오기를 거부합니다.
</ErrorCode>

## 서명, 암호화와 키

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
서명이 본문과 맞지 않습니다. 변조된 DAT이거나 다른 키로 서명된 DAT입니다.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM 인증 태그가 맞지 않습니다. 암호문 변조 또는 인증서 불일치를 확인합니다.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
키의 길이, 형식 또는 알고리즘 조합이 올바르지 않습니다.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
검증 전용 인증서로 DAT를 발급하려 했습니다. 발급 서비스에는 전체 인증서가 필요합니다.
</ErrorCode>

`DAT_SIG_MISMATCH`와 `DAT_CRYPTO_TAG_MISMATCH`는 공개 보안 이벤트 API가 참으로 분류하는 오류입니다. 한 건의 잘못된 입력은 서비스 장애가 아니지만 반복되면 보안 관찰 대상으로 다룹니다.

## 매니저와 설정

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
매니저에 인증서가 없습니다. 인증서를 가져오거나 CMS 동기화를 완료합니다.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
인증서는 있지만 현재 발급할 수 있는 전체 인증서가 없습니다. 원인 체인에서 만료, 시작 시각 또는 verify-only 여부를 확인합니다.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
호출 인자나 설정값이 허용 범위를 벗어났습니다.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
현재 플랫폼에 필요한 암호 또는 네트워크 기능이 없습니다.
</ErrorCode>

## CMS 클라이언트

| 코드 | 의미 | 일반적인 처리 |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI 형식 오류 | 설정 수정 |
| `DAT_CMS_UNAUTHORIZED` | 인증 실패 | 토큰 수정 |
| `DAT_CMS_FORBIDDEN` | 역할에 권한 없음 | 토큰 역할 확인 |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | 경로가 없거나 다름 | CMS 주소와 경로 확인 |
| `DAT_CMS_NETWORK` | 연결 또는 전송 실패 | 네트워크 확인 후 백오프 |
| `DAT_CMS_TIMEOUT` | 제한 시간 초과 | 네트워크와 타임아웃 조정 |
| `DAT_CMS_SERVER_ERROR` | CMS 서버 오류 | 서버 상태 확인 후 백오프 |
| `DAT_CMS_RESPONSE_INVALID` | 성공 응답 형식 오류 | 서버와 클라이언트 계약 확인 |
| `DAT_CMS_VERSION_RESET` | 서버 버전이 뒤로 감 | CMS 데이터와 배포 상태 확인 |
| `DAT_CMS_IMPORT_FAILED` | 받은 인증서 반영 실패 | 원인 체인 확인 |
| `DAT_CMS_STOPPED` | 종료된 매니저 사용 | 새 매니저를 생성하거나 호출 순서 수정 |

초기 동기화가 best-effort인 라이브러리는 오류를 마지막 오류 필드에 보관합니다. 시작 실패가 필요하면 오류를 직접 반환하거나 던지는 즉시 동기화 API를 사용합니다.

## CMS 서버

| 코드 | HTTP | 의미 |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | 토큰이 없거나 올바르지 않음 |
| `DAT_AUTH_FORBIDDEN` | 403 | 토큰 역할이 요청 권한과 다름 |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | 지원하지 않는 알고리즘 이름 |
| `DAT_REQ_NOT_FOUND` | 404·405 | 경로 또는 메서드 불일치 |
| `DAT_REQ_TOO_LARGE` | 413 | 요청 본문 제한 초과를 위한 예약 코드 |
| `DAT_STORE_UNAVAILABLE` | 503 | 저장소를 일시적으로 사용할 수 없음 |
| `DAT_STORE_UNKNOWN` | 500 | 저장소 처리 중 분류되지 않은 오류 |

현재 클라이언트는 비-2xx JSON의 서버 코드를 그대로 노출하지 않고 HTTP 상태를 `DAT_CMS_*` 코드로 변환합니다. 서버 로그와 클라이언트 오류 코드가 다를 수 있습니다.

## 언어별 확인 방법

| 환경 | 오류 코드 | 재시도 분류 |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

하위 원인이 있는 오류는 각 언어의 예외 체인이나 원인 조회 API로 확인합니다.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
