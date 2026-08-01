package me.saro.dat.exception

/**
 * DAT 통합 오류 코드 (error.pre2.md).
 *
 * 코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. 메시지는 자유롭게 바꿔도 되지만
 * [code] 는 바꾸지 않는다.
 *
 * - 분류는 **원인**이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
 * - `*_UNKNOWN` 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
 * - 하위 원인은 버리지 않고 [DatException.cause] 로 보존한다.
 *
 * 문자열이 아니라 enum 인 이유: 예전 `DatException("어떤 메시지")` 호출이 그대로
 * 컴파일되면 메시지가 코드 자리에 들어가도 아무도 모른다. enum 이면 컴파일이 막는다.
 */
enum class DatErrorCode(val code: String) {
    // ---- TOKEN : DAT 토큰 문자열 ----
    /** 토큰 형식이 잘못됨 (파트 수·필드·인코딩·범위 초과 전부). */
    TOKEN_MALFORMED("DAT_TOKEN_MALFORMED"),
    /** 토큰 만료. 형식 오류·서명 위조와 반드시 구분한다. */
    TOKEN_EXPIRED("DAT_TOKEN_EXPIRED"),
    TOKEN_UNKNOWN("DAT_TOKEN_UNKNOWN"),

    // ---- CERT : 인증서 ----
    /** 인증서 형식이 잘못됨 (파트 수·필드·인코딩·시간 계산 오버플로). */
    CERT_MALFORMED("DAT_CERT_MALFORMED"),
    /** 인증서 최종 만료 (`start + duration + ttl < now`). */
    CERT_EXPIRED("DAT_CERT_EXPIRED"),
    /** 발급창이 아직 열리지 않음 (`now < start`). */
    CERT_NOT_YET_ISSUABLE("DAT_CERT_NOT_YET_ISSUABLE"),
    /** 발급창이 닫힘. 검증만 가능하다. */
    CERT_ISSUANCE_ENDED("DAT_CERT_ISSUANCE_ENDED"),
    /** 서명 개인키가 없는 인증서. */
    CERT_VERIFY_ONLY("DAT_CERT_VERIFY_ONLY"),
    /** 해당 CID의 인증서가 없음 (위조·오배포). */
    CERT_NOT_FOUND("DAT_CERT_NOT_FOUND"),
    /** CID를 아직 동기화받지 못함. [CERT_NOT_FOUND] 와 다르다 — 기다리면 풀린다. */
    CERT_NOT_SYNCED("DAT_CERT_NOT_SYNCED"),
    /** import 목록 안에 CID 중복. */
    CERT_DUPLICATE_CID("DAT_CERT_DUPLICATE_CID"),
    CERT_UNKNOWN("DAT_CERT_UNKNOWN"),

    // ---- SIG : 서명 ----
    /** 서명 검증 실패 — 위조·변조. **보안 이벤트.** */
    SIG_MISMATCH("DAT_SIG_MISMATCH"),
    /** 서명 자체의 형식 오류 (빈 서명·길이 불일치·DER 변환 실패). */
    SIG_MALFORMED("DAT_SIG_MALFORMED"),
    /** 서명할 개인키가 없음 (verify-only 키로 sign 호출). */
    SIG_KEY_MISSING("DAT_SIG_KEY_MISSING"),
    /** 서명·검증 연산이 실패함. **불일치가 아니다.** */
    SIG_BACKEND("DAT_SIG_BACKEND"),
    SIG_UNKNOWN("DAT_SIG_UNKNOWN"),

    // ---- CRYPTO : secure 페이로드 ----
    /** GCM 인증 태그 불일치 — 변조. **보안 이벤트.** */
    CRYPTO_TAG_MISMATCH("DAT_CRYPTO_TAG_MISMATCH"),
    /** 암호문 길이가 규격 밖 (IV 미만·구현 한계 초과). */
    CRYPTO_DATA_INVALID("DAT_CRYPTO_DATA_INVALID"),
    /** 암·복호 연산이 실패함. */
    CRYPTO_BACKEND("DAT_CRYPTO_BACKEND"),
    CRYPTO_UNKNOWN("DAT_CRYPTO_UNKNOWN"),

    // ---- KEY : 키 재료 ----
    /** 키 재료가 무효 (길이 불일치·곡선 밖·인코딩 오류·쌍 불일치). */
    KEY_INVALID("DAT_KEY_INVALID"),
    /** 이 알고리즘은 verify-only 를 지원하지 않음 (알고리즘의 구조적 한계). */
    KEY_VERIFY_ONLY_UNSUPPORTED("DAT_KEY_VERIFY_ONLY_UNSUPPORTED"),
    KEY_UNKNOWN("DAT_KEY_UNKNOWN"),

    // ---- MANAGER : 매니저 보유 상태 ----
    /** 인증서를 하나도 보유하지 않음. */
    MANAGER_NO_CERTIFICATE("DAT_MANAGER_NO_CERTIFICATE"),
    /** 발급 가능한 인증서가 없음. 사유는 cause 의 `CERT_*` 코드로 전달한다. */
    MANAGER_NO_ISSUABLE_CERTIFICATE("DAT_MANAGER_NO_ISSUABLE_CERTIFICATE"),
    /** 이미 해제된 객체를 사용. (명시적 수명 관리 포트용, JVM 은 생성하지 않는다) */
    MANAGER_DISPOSED("DAT_MANAGER_DISPOSED"),
    MANAGER_UNKNOWN("DAT_MANAGER_UNKNOWN"),

    // ---- CMS : 서버 응답·전송 ----
    /** 서버에 도달할 수 없음 (DNS·연결 거부·TLS·타임아웃). */
    CMS_UNREACHABLE("DAT_CMS_UNREACHABLE"),
    /** 인증 실패, 401 수신 — 토큰 설정 오류. */
    CMS_UNAUTHORIZED("DAT_CMS_UNAUTHORIZED"),
    /** 권한 부족, 403 수신. */
    CMS_FORBIDDEN("DAT_CMS_FORBIDDEN"),
    /** 엔드포인트 없음, 404 수신 — URL 설정 오류. */
    CMS_ENDPOINT_NOT_FOUND("DAT_CMS_ENDPOINT_NOT_FOUND"),
    /** 서버 내부 오류, 5xx 수신. */
    CMS_SERVER_ERROR("DAT_CMS_SERVER_ERROR"),
    /** 그 외 비-2xx. */
    CMS_HTTP_STATUS("DAT_CMS_HTTP_STATUS"),
    /** 응답 본문이 프로토콜 위반 (구조·버전 줄 파싱 실패). */
    CMS_MALFORMED("DAT_CMS_MALFORMED"),
    /** 받은 인증서를 적용하지 못함. 원인은 cause 로 보존한다. */
    CMS_IMPORT_FAILED("DAT_CMS_IMPORT_FAILED"),
    /** 서버가 전체 재동기화를 지시. */
    CMS_VERSION_RESET("DAT_CMS_VERSION_RESET"),
    /** 아직 한 번도 동기화하지 못함. */
    CMS_NOT_SYNCED("DAT_CMS_NOT_SYNCED"),
    /** 이전 동기화가 진행 중이라 건너뜀. 오류가 아니다. */
    CMS_SYNC_IN_PROGRESS("DAT_CMS_SYNC_IN_PROGRESS"),
    /** CMS 기능이 빌드에 포함되지 않음. */
    CMS_NOT_SUPPORTED("DAT_CMS_NOT_SUPPORTED"),
    CMS_UNKNOWN("DAT_CMS_UNKNOWN"),

    // ---- CONFIG : 호출자가 넘긴 값 ----
    /** 지원하지 않는 알고리즘 이름. */
    CONFIG_ALG_UNSUPPORTED("DAT_CONFIG_ALG_UNSUPPORTED"),
    /** CMS 서버 URI 가 규격 밖 (형식·스킴·경로·쿼리). */
    CONFIG_URI_INVALID("DAT_CONFIG_URI_INVALID"),
    /** 인자가 잘못됨 (null·범위 밖·타입 불일치·빈 값). */
    CONFIG_ARGUMENT_INVALID("DAT_CONFIG_ARGUMENT_INVALID"),
    CONFIG_UNKNOWN("DAT_CONFIG_UNKNOWN"),

    // ---- INTERNAL : 실행 환경 ----
    /** 암호 백엔드나 런타임 API 가 없음 (배포·플랫폼 문제). */
    INTERNAL_UNAVAILABLE("DAT_INTERNAL_UNAVAILABLE"),
    /** 그 외 내부 실패 (메모리 할당·난수 생성·락·불변식 위반). */
    INTERNAL_UNKNOWN("DAT_INTERNAL_UNKNOWN"),
    ;

    override fun toString(): String = code
}

/**
 * 재시도 분류. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다.
 */
enum class DatRetry {
    /** 같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도한다. */
    TRANSIENT,
    /** 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다. */
    PERMANENT,
    /** 오류가 아닌 상태 신호. 흐름 제어에만 쓴다. */
    STATE,
}
