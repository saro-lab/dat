#ifndef DAT_H
#define DAT_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    DAT_SUCCESS = 0,
    DAT_ERROR_INVALID_DAT,
    DAT_ERROR_SIGNING_KEY_NOT_EXISTS,
    DAT_ERROR_CID_NOT_FOUND,
    DAT_ERROR_DUPLICATED_CID,
    DAT_ERROR_UNKNOWN_SIGNATURE_ALGORITHM,
    DAT_ERROR_UNKNOWN_CRYPTO_ALGORITHM,
    DAT_ERROR_INVALID_CRYPTO_KEY,
    DAT_ERROR_ENCRYPT_ERROR,
    DAT_ERROR_DECRYPT_ERROR,
    DAT_ERROR_INVALID_BASE64_FORMAT,
    DAT_ERROR_MALLOC_FAILED,
    DAT_ERROR_CERTIFICATE_ERROR,
    DAT_ERROR_MANAGER_ERROR,
    DAT_ERROR_SIGNATURE_ERROR,
    DAT_ERROR_OVERFLOW,
    DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL,
} dat_error_t;

typedef enum {
    DAT_SIG_HMAC_SHA256_MFS,
    DAT_SIG_HMAC_SHA384_MFS,
    DAT_SIG_HMAC_SHA512_MFS,
    DAT_SIG_ECDSA_P256,
    DAT_SIG_ECDSA_P384,
    DAT_SIG_ECDSA_P521
} dat_signature_alg_t;

typedef enum {
    DAT_CRYPTO_IV_AES128_GCM,
    DAT_CRYPTO_IV_AES256_GCM
} dat_crypto_alg_t;

extern const dat_signature_alg_t DAT_SIGNATURE_ALG_LIST[6];
extern const size_t DAT_SIGNATURE_ALG_COUNT;
extern const dat_crypto_alg_t DAT_CRYPTO_ALG_LIST[2];
extern const size_t DAT_CRYPTO_ALG_COUNT;

const char* dat_signature_alg_to_str(dat_signature_alg_t alg);
dat_error_t dat_signature_alg_from_str(const char* s, dat_signature_alg_t* out);
const char* dat_crypto_alg_to_str(dat_crypto_alg_t alg);
dat_error_t dat_crypto_alg_from_str(const char* s, dat_crypto_alg_t* out);

typedef struct dat_payload {
    uint8_t* plain_bytes;
    size_t plain_len;
    uint8_t* secure_bytes;
    size_t secure_len;
} dat_payload_t;

void dat_payload_free(dat_payload_t* payload);

typedef struct dat_crypto dat_crypto_t;
typedef struct dat_signature dat_signature_t;
typedef struct dat_certificate dat_certificate_t;
typedef struct dat_manager dat_manager_t;

/* Crypto */
dat_error_t dat_crypto_new(dat_crypto_alg_t alg, dat_crypto_t** out);
dat_error_t dat_crypto_from_key(dat_crypto_alg_t alg, const uint8_t* key, size_t key_len, dat_crypto_t** out);
void dat_crypto_free(dat_crypto_t* crypto);
dat_crypto_alg_t dat_crypto_algorithm(const dat_crypto_t* crypto);
size_t dat_crypto_key_base64_len(const dat_crypto_t* crypto);
dat_error_t dat_crypto_export_key(const dat_crypto_t* crypto, uint8_t** key, size_t* key_len);
dat_error_t dat_crypto_encrypt(const dat_crypto_t* crypto, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);
dat_error_t dat_crypto_decrypt(const dat_crypto_t* crypto, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);

/* Signature */
dat_error_t dat_signature_new(dat_signature_alg_t alg, dat_signature_t** out);
dat_error_t dat_signature_from_key(dat_signature_alg_t alg, const uint8_t* key, size_t key_len, dat_signature_t** out);
void dat_signature_free(dat_signature_t* sig);
dat_signature_alg_t dat_signature_algorithm(const dat_signature_t* sig);
size_t dat_signature_key_base64_len(const dat_signature_t* sig);
dat_error_t dat_signature_export_key(const dat_signature_t* sig, uint8_t** key, size_t* key_len);
dat_error_t dat_signature_export_verify_only_key(const dat_signature_t* sig, uint8_t** key, size_t* key_len);
dat_error_t dat_signature_sign(const dat_signature_t* sig, const uint8_t* data, size_t data_len, uint8_t** out, size_t* out_len);
dat_error_t dat_signature_verify(const dat_signature_t* sig, const uint8_t* data, size_t data_len, const uint8_t* sign, size_t sign_len);
bool dat_signature_signable(const dat_signature_t* sig);
bool dat_signature_support_verify_only(const dat_signature_t* sig);
dat_error_t dat_signature_clone(const dat_signature_t* sig, dat_signature_t** out);

/* Certificate */
dat_error_t dat_certificate_create(uint64_t cid,
                                   uint64_t dat_issuance_start_seconds,
                                   uint64_t dat_issuance_duration_seconds,
                                   uint64_t dat_ttl_seconds,
                                   dat_signature_alg_t sig_alg,
                                   dat_crypto_alg_t crypto_alg,
                                   dat_certificate_t** out);
dat_error_t dat_certificate_parse(const char* str, dat_certificate_t** out);
dat_error_t dat_certificate_export(const dat_certificate_t* cert, bool verify_only, char** out);
void dat_certificate_free(dat_certificate_t* cert);
dat_error_t dat_certificate_clone(const dat_certificate_t* cert, dat_certificate_t** out);
bool dat_certificate_expired(const dat_certificate_t* cert);
bool dat_certificate_issuable(const dat_certificate_t* cert);
bool dat_certificate_signable(const dat_certificate_t* cert);
bool dat_certificate_support_verify_only(const dat_certificate_t* cert);
dat_signature_alg_t dat_certificate_signature_algorithm(const dat_certificate_t* cert);
dat_crypto_alg_t dat_certificate_crypto_algorithm(const dat_certificate_t* cert);
uint64_t dat_certificate_cid(const dat_certificate_t* cert);

/* Manager */
dat_manager_t* dat_manager_new(void);
void dat_manager_free(dat_manager_t* manager);
dat_error_t dat_manager_issue(dat_manager_t* manager, const char* plain, const char* secure, char** out);
dat_error_t dat_manager_parse(dat_manager_t* manager, const char* dat_str, dat_payload_t** out);
dat_error_t dat_manager_parse_without_verify(dat_manager_t* manager, const char* dat_str, dat_payload_t** out);
dat_error_t dat_manager_export_cids(dat_manager_t* manager, uint64_t** cids, size_t* count);
dat_error_t dat_manager_export(dat_manager_t* manager, bool verify_only, char** out);
dat_error_t dat_manager_export_certificates(dat_manager_t* manager, dat_certificate_t*** certs, size_t* count);
dat_error_t dat_manager_import(dat_manager_t* manager, const char* format, bool clear, size_t* count_out);
dat_error_t dat_manager_import_certificates(dat_manager_t* manager, dat_certificate_t** certs, size_t count, bool clear, size_t* count_out);
dat_error_t dat_manager_issue_with_cert(const dat_certificate_t* cert, const char* plain, const char* secure, char** out);
dat_error_t dat_manager_parse_with_cert(const dat_certificate_t* cert, const char* dat_str, dat_payload_t** out);
dat_error_t dat_manager_parse_without_verify_with_cert(const dat_certificate_t* cert, const char* dat_str, dat_payload_t** out);

#ifdef __cplusplus
}
#endif

#endif /* DAT_H */
