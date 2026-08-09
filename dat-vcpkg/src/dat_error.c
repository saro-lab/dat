#include "../include/dat/dat_error.h"

const char* dat_error_code(dat_error_t e) {
    switch (e) {
        case DAT_SUCCESS: return "DAT_SUCCESS";

#define DAT_ERROR_STR_X(name, retry, security) case name: return #name;
        DAT_ERROR_CODE_LIST(DAT_ERROR_STR_X)
#undef DAT_ERROR_STR_X

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
    return "DAT_INTERNAL_UNKNOWN";
}

dat_retry_t dat_error_retry(dat_error_t e) {
    switch (e) {
#define DAT_ERROR_RETRY_X(name, retry, security) case name: return retry;
        DAT_ERROR_CODE_LIST(DAT_ERROR_RETRY_X)
#undef DAT_ERROR_RETRY_X

        case DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL: return DAT_RETRY_TRANSIENT;
        default: break;
    }
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
