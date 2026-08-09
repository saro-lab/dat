#ifndef DAT_ERROR_H
#define DAT_ERROR_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    DAT_RETRY_PERMANENT = 0,
    DAT_RETRY_TRANSIENT = 1,
    DAT_RETRY_STATE     = 2
} dat_retry_t;

#define DAT_ERROR_CODE_LIST(X)                                                 \
    \
    X(DAT_TOKEN_MALFORMED,               DAT_RETRY_PERMANENT, false)           \
    X(DAT_TOKEN_EXPIRED,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_TOKEN_UNKNOWN,                 DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
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
    \
    X(DAT_SIG_MISMATCH,                  DAT_RETRY_PERMANENT, true)            \
    X(DAT_SIG_MALFORMED,                 DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_KEY_MISSING,               DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_BACKEND,                   DAT_RETRY_PERMANENT, false)           \
    X(DAT_SIG_UNKNOWN,                   DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
    X(DAT_CRYPTO_TAG_MISMATCH,           DAT_RETRY_PERMANENT, true)            \
    X(DAT_CRYPTO_DATA_INVALID,           DAT_RETRY_PERMANENT, false)           \
    X(DAT_CRYPTO_BACKEND,                DAT_RETRY_PERMANENT, false)           \
    X(DAT_CRYPTO_UNKNOWN,                DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
    X(DAT_KEY_INVALID,                   DAT_RETRY_PERMANENT, false)           \
    X(DAT_KEY_VERIFY_ONLY_UNSUPPORTED,   DAT_RETRY_PERMANENT, false)           \
    X(DAT_KEY_UNKNOWN,                   DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
    X(DAT_MANAGER_NO_CERTIFICATE,        DAT_RETRY_TRANSIENT, false)           \
                               \
    X(DAT_MANAGER_NO_ISSUABLE_CERTIFICATE, DAT_RETRY_PERMANENT, false)         \
    X(DAT_MANAGER_DISPOSED,              DAT_RETRY_PERMANENT, false)           \
    X(DAT_MANAGER_UNKNOWN,               DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
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
    \
    X(DAT_CONFIG_ALG_UNSUPPORTED,        DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_URI_INVALID,            DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_ARGUMENT_INVALID,       DAT_RETRY_PERMANENT, false)           \
    X(DAT_CONFIG_UNKNOWN,                DAT_RETRY_PERMANENT, false)           \
                                                                               \
    \
    X(DAT_INTERNAL_UNAVAILABLE,          DAT_RETRY_PERMANENT, false)           \
    X(DAT_INTERNAL_UNKNOWN,              DAT_RETRY_PERMANENT, false)

typedef enum {
    DAT_SUCCESS = 0,

    DAT_ERROR_INVALID_DAT                    = 1,
    DAT_ERROR_SIGNING_KEY_NOT_EXISTS         = 2,
    DAT_ERROR_CID_NOT_FOUND                  = 3,
    DAT_ERROR_DUPLICATED_CID                 = 4,
    DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM    = 5,
    DAT_ERROR_UNKNOWN_CRYPTO_ALGORITHM       = 6,
    DAT_ERROR_INVALID_CRYPTO_KEY             = 7,
    DAT_ERROR_ENCRYPT_ERROR                  = 8,
    DAT_ERROR_DECRYPT_ERROR                  = 9,
    DAT_ERROR_INVALID_BASE64_FORMAT          = 10,
    DAT_ERROR_MALLOC_FAILED                  = 11,
    DAT_ERROR_CERTIFICATE_ERROR              = 12,
    DAT_ERROR_MANAGER_ERROR                  = 13,
    DAT_ERROR_SIGNATURE_ERROR                = 14,
    DAT_ERROR_OVERFLOW                       = 15,
    DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL = 16,

#define DAT_ERROR_ENUM_X(name, retry, security) name,
    DAT_ERROR_CODE_LIST(DAT_ERROR_ENUM_X)
#undef DAT_ERROR_ENUM_X
} dat_error_t;

const char* dat_error_code(dat_error_t e);

dat_retry_t dat_error_retry(dat_error_t e);

bool dat_error_is_security_event(dat_error_t e);

#ifdef __cplusplus
}
#endif

#endif
