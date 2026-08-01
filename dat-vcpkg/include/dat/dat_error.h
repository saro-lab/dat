#ifndef DAT_ERROR_H
#define DAT_ERROR_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* DAT 통합 오류 코드 (error.pre2.md).
 *
 * **문자 코드가 정본이고 정수는 ABI 호환용이다.** 모든 공식 클라이언트가 공유하는 공개 계약은
 * `dat_error_code()` 가 돌려주는 문자열이지 enum 값이 아니다.
 *
 *   - 분류는 원인이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
 *   - *_UNKNOWN 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
 *
 * 정수를 정본으로 쓰면 안 되는 이유가 이 파일에 그대로 남아 있다. 기존 enum 은
 * 값을 명시하지 않은 암묵적 순차 정수였고, 그래서 중간에 값 하나를 추가하는 것이
 * 곧 ABI 변경이었다. 아래 레거시 값들은 그 사고를 막으려고 **명시적 정수로 못 박고**
 * 새 코드는 17부터 뒤에 붙인다. 값 재배치는 하지 않는다. */

/* 재시도 분류. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다. */
typedef enum {
    /* 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다.
     * 0 이라서 값이 확실치 않은 경로는 자동으로 보수적인 쪽을 고른다. */
    DAT_RETRY_PERMANENT = 0,
    /* 같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도한다. */
    DAT_RETRY_TRANSIENT = 1,
    /* 오류가 아닌 상태 신호. 흐름 제어에만 쓴다. */
    DAT_RETRY_STATE     = 2
} dat_retry_t;

/* 코드 목록. enum·문자열·재시도 분류·보안 플래그가 전부 이 한 줄에서 나오므로
 * 넷이 서로 어긋날 수 없다. X(이름, 재시도, 보안이벤트) */
#define DAT_ERROR_CODE_LIST(X)                                                 \
    /* ── TOKEN : DAT 토큰 문자열 ─────────────────────────────────────── */   \
    X(DAT_TOKEN_MALFORMED,               DAT_RETRY_PERMANENT, false)           \
    X(DAT_TOKEN_EXPIRED,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_TOKEN_UNKNOWN,                 DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── CERT : 인증서 ──────────────────────────────────────────────── */    \
    X(DAT_CERT_MALFORMED,                DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_EXPIRED,                  DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_NOT_YET_ISSUABLE,         DAT_RETRY_TRANSIENT, false)           \
    X(DAT_CERT_ISSUANCE_ENDED,           DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_VERIFY_ONLY,              DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_NOT_FOUND,                DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_NOT_SYNCED,               DAT_RETRY_TRANSIENT, false)           \
    X(DAT_CERT_DUPLICATE_CID,            DAT_RETRY_PERMANENT, false)           \
    X(DAT_CERT_UNKNOWN,                  DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── SIG : 서명 ─────────────────────────────────────────────────── */    \
    X(DAT_SIG_MISMATCH,                  DAT_RETRY_PERMANENT, true)            \
    X(DAT_SIG_MALFORMED,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_KEY_MISSING,               DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_BACKEND,                   DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_UNKNOWN,                   DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── CRYPTO : secure 페이로드 ───────────────────────────────────── */    \
    X(DAT_CRYPTO_TAG_MISMATCH,           DAT_RETRY_PERMANENT, true)            \
    X(DAT_CRYPTO_DATA_INVALID,           DAT_RETRY_PERMANENT, false)           \
    X(DAT_CRYPTO_BACKEND,                DAT_RETRY_PERMANENT, false)           \
    X(DAT_CRYPTO_UNKNOWN,                DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── KEY : 키 재료 ──────────────────────────────────────────────── */    \
    X(DAT_KEY_INVALID,                   DAT_RETRY_PERMANENT, false)           \
    X(DAT_KEY_VERIFY_ONLY_UNSUPPORTED,   DAT_RETRY_PERMANENT, false)           \
    X(DAT_KEY_UNKNOWN,                   DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── MANAGER : 매니저 보유 상태 ─────────────────────────────────── */    \
    X(DAT_MANAGER_NO_CERTIFICATE,        DAT_RETRY_TRANSIENT, false)           \
    /* 사유별 재시도 판정은 dat_manager_issuable_cause() 로 따로 묻는다.
     * C 에는 예외 체이닝이 없어서 코드 하나에 cause 를 실을 수 없기 때문이다.
     * 여기서는 보수적으로 PERMANENT 로 둔다. */                               \
    X(DAT_MANAGER_NO_ISSUABLE_CERTIFICATE, DAT_RETRY_PERMANENT, false)         \
    X(DAT_MANAGER_DISPOSED,              DAT_RETRY_PERMANENT, false)           \
    X(DAT_MANAGER_UNKNOWN,               DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── CMS : 서버 응답·전송 ──────────────────────────────────────── */     \
    X(DAT_CMS_UNREACHABLE,               DAT_RETRY_TRANSIENT, false)           \
    X(DAT_CMS_UNAUTHORIZED,              DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_FORBIDDEN,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_ENDPOINT_NOT_FOUND,        DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_SERVER_ERROR,              DAT_RETRY_TRANSIENT, false)           \
    X(DAT_CMS_HTTP_STATUS,               DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_MALFORMED,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_IMPORT_FAILED,             DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_VERSION_RESET,             DAT_RETRY_STATE,     false)           \
    X(DAT_CMS_NOT_SYNCED,                DAT_RETRY_TRANSIENT, false)           \
    X(DAT_CMS_SYNC_IN_PROGRESS,          DAT_RETRY_STATE,     false)           \
    X(DAT_CMS_NOT_SUPPORTED,             DAT_RETRY_PERMANENT, false)           \
    X(DAT_CMS_UNKNOWN,                   DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── CONFIG : 호출자가 넘긴 값 ─────────────────────────────────── */     \
    X(DAT_CONFIG_ALG_UNSUPPORTED,        DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_URI_INVALID,            DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_ARGUMENT_INVALID,       DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_UNKNOWN,                DAT_RETRY_PERMANENT, false)           \
                                                                               \
    /* ── INTERNAL : 실행 환경 ─────────────────────────────────────── */      \
    X(DAT_INTERNAL_UNAVAILABLE,          DAT_RETRY_PERMANENT, false)           \
    X(DAT_INTERNAL_UNKNOWN,              DAT_RETRY_PERMANENT, false)

typedef enum {
    DAT_SUCCESS = 0,

    /* ── 레거시 값 (deprecated) ───────────────────────────────────────────
     * 라이브러리는 더 이상 이 값들을 반환하지 않는다. 삭제하지 않는 이유는
     * error.md §1 "코드는 삭제하지 않는다" 때문이고, 정수를 못 박아 두는 이유는
     * 새 코드를 뒤에 붙일 때 이 값들이 밀리지 않게 하기 위해서다.
     * 각 항목 옆에 대체 코드를 적어 둔다. */
    DAT_ERROR_INVALID_DAT                    = 1,  /* → TOKEN_MALFORMED / TOKEN_EXPIRED / SIG_MISMATCH / SIG_MALFORMED */
    DAT_ERROR_SIGNING_KEY_NOT_EXISTS         = 2,  /* → SIG_KEY_MISSING / MANAGER_NO_ISSUABLE_CERTIFICATE */
    DAT_ERROR_CID_NOT_FOUND                  = 3,  /* → CERT_NOT_FOUND */
    DAT_ERROR_DUPLICATED_CID                 = 4,  /* → CERT_DUPLICATE_CID */
    DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM    = 5,  /* → CONFIG_ALG_UNSUPPORTED */
    DAT_ERROR_UNKNOWN_CRYPTO_ALGORITHM       = 6,  /* → CONFIG_ALG_UNSUPPORTED */
    DAT_ERROR_INVALID_CRYPTO_KEY             = 7,  /* → KEY_INVALID */
    DAT_ERROR_ENCRYPT_ERROR                  = 8,  /* → CRYPTO_BACKEND / INTERNAL_UNKNOWN */
    DAT_ERROR_DECRYPT_ERROR                  = 9,  /* → CRYPTO_TAG_MISMATCH / CRYPTO_DATA_INVALID */
    DAT_ERROR_INVALID_BASE64_FORMAT          = 10, /* → TOKEN_MALFORMED / CERT_MALFORMED / SIG_MALFORMED */
    DAT_ERROR_MALLOC_FAILED                  = 11, /* → INTERNAL_UNKNOWN */
    DAT_ERROR_CERTIFICATE_ERROR              = 12, /* → CERT_MALFORMED */
    DAT_ERROR_MANAGER_ERROR                  = 13, /* → CONFIG_ARGUMENT_INVALID / MANAGER_* / CMS_* */
    DAT_ERROR_SIGNATURE_ERROR                = 14, /* → KEY_INVALID / SIG_* / INTERNAL_UNKNOWN */
    DAT_ERROR_OVERFLOW                       = 15, /* → INTERNAL_UNKNOWN */
    /* 비-0 성공이라 `if (e)` 관용구와 충돌했다. 이제 생성은 DAT_SUCCESS 를 돌려주고
     * 최초 sync 실패는 dat_cms_manager_last_error() 로 조회한다. */
    DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL = 16,

    /* ── 정본 코드 : 17부터 ─────────────────────────────────────────── */
#define DAT_ERROR_ENUM_X(name, retry, security) name,
    DAT_ERROR_CODE_LIST(DAT_ERROR_ENUM_X)
#undef DAT_ERROR_ENUM_X
} dat_error_t;

/* 공개 계약인 오류 코드 문자열. 모든 공식 클라이언트에서 동일하다.
 * 레거시 값에 대해서는 위 표의 대체 코드 문자열을 돌려준다. 알 수 없는 값은
 * "DAT_INTERNAL_UNKNOWN" 이다 — NULL 을 돌려주지 않으므로 로깅에 바로 쓸 수 있다. */
const char* dat_error_code(dat_error_t e);

/* 재시도 분류. DAT_SUCCESS 를 포함해 판정할 수 없는 값은 PERMANENT 다 —
 * 영구 오류에 대한 무한 재시도가 이 체계 이전의 실제 결함이었다. */
dat_retry_t dat_error_retry(dat_error_t e);

/* 위조·변조 시도의 직접 증거인지. 다른 실패와 같은 경로로 로깅하지 않는다. */
bool dat_error_is_security_event(dat_error_t e);

#ifdef __cplusplus
}
#endif

#endif /* DAT_ERROR_H */
