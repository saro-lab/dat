#include "../include/dat/dat_error.h"

/* 문자 코드가 정본이다. enum 값은 ABI 호환용일 뿐이므로, 여기서 값 → 문자열
 * 변환이 유일하게 계약을 확정하는 지점이다.
 *
 * 세 표(문자열·재시도·보안 플래그)가 전부 dat_error.h 의 DAT_ERROR_CODE_LIST 한
 * 줄에서 나오므로 서로 어긋날 수 없다. 코드를 추가하려면 그 표에 한 줄만 넣으면
 * 되고, 여기를 고치는 것을 잊어 문자열이 비는 사고가 구조적으로 불가능하다. */

const char* dat_error_code(dat_error_t e) {
    switch (e) {
        case DAT_SUCCESS: return "DAT_SUCCESS";

        /* 정본 코드: 이름이 곧 문자열이다. */
#define DAT_ERROR_STR_X(name, retry, security) case name: return #name;
        DAT_ERROR_CODE_LIST(DAT_ERROR_STR_X)
#undef DAT_ERROR_STR_X

        /* 레거시 값은 라이브러리가 더 이상 반환하지 않지만, 호출부가 예전에 저장해
         * 둔 값을 넘길 수 있다. 대체 코드 중 가장 흔한 것을 돌려준다. 정확한 분류는
         * 애초에 이 값들이 뭉개 놓은 것이라 복원할 수 없다 — 그게 이 체계의 이유다. */
        case DAT_ERROR_INVALID_DAT:                 return "DAT_TOKEN_MALFORMED";
        case DAT_ERROR_SIGNING_KEY_NOT_EXISTS:      return "DAT_SIG_KEY_MISSING";
        case DAT_ERROR_CID_NOT_FOUND:               return "DAT_CERT_NOT_FOUND";
        case DAT_ERROR_DUPLICATED_CID:              return "DAT_CERT_DUPLICATE_CID";
        case DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM: return "DAT_CONFIG_ALG_UNSUPPORTED";
        case DAT_ERROR_UNKNOWN_CRYPTO_ALGORITHM:    return "DAT_CONFIG_ALG_UNSUPPORTED";
        case DAT_ERROR_INVALID_CRYPTO_KEY:          return "DAT_KEY_INVALID";
        case DAT_ERROR_ENCRYPT_ERROR:               return "DAT_CRYPTO_BACKEND";
        case DAT_ERROR_DECRYPT_ERROR:               return "DAT_CRYPTO_TAG_MISMATCH";
        case DAT_ERROR_INVALID_BASE64_FORMAT:       return "DAT_TOKEN_MALFORMED";
        case DAT_ERROR_MALLOC_FAILED:               return "DAT_INTERNAL_UNKNOWN";
        case DAT_ERROR_CERTIFICATE_ERROR:           return "DAT_CERT_MALFORMED";
        case DAT_ERROR_MANAGER_ERROR:               return "DAT_MANAGER_UNKNOWN";
        case DAT_ERROR_SIGNATURE_ERROR:             return "DAT_SIG_UNKNOWN";
        case DAT_ERROR_OVERFLOW:                    return "DAT_INTERNAL_UNKNOWN";
        case DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL: return "DAT_CMS_NOT_SYNCED";
    }
    /* enum 밖의 값. NULL 대신 폴백 코드를 돌려주어 로깅이 분기 없이 동작하게 한다. */
    return "DAT_INTERNAL_UNKNOWN";
}

dat_retry_t dat_error_retry(dat_error_t e) {
    switch (e) {
#define DAT_ERROR_RETRY_X(name, retry, security) case name: return retry;
        DAT_ERROR_CODE_LIST(DAT_ERROR_RETRY_X)
#undef DAT_ERROR_RETRY_X

        /* 레거시 값 중 재시도가 의미 있던 유일한 항목. */
        case DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL: return DAT_RETRY_TRANSIENT;
        default: break;
    }
    /* DAT_SUCCESS 와 알 수 없는 값 포함. 애매하면 재시도하지 않는다. */
    return DAT_RETRY_PERMANENT;
}

bool dat_error_is_security_event(dat_error_t e) {
    switch (e) {
#define DAT_ERROR_SEC_X(name, retry, security) case name: return security;
        DAT_ERROR_CODE_LIST(DAT_ERROR_SEC_X)
#undef DAT_ERROR_SEC_X
        default: return false;
    }
}
