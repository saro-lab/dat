/* 오류 코드 회귀 안전망 (error.pre2.md).
 *
 * 이 포트의 테스트에는 오류 코드 단언이 하나도 없었다. 단언하는 것은 "실패했다"가
 * 아니라 **어느 코드로 실패했다** 여야 한다 — 재매핑 사고는 전자로는 절대 안 잡힌다.
 * 특히 이 체계를 만든 세 가지 이유를 고정한다:
 *
 *   1. 만료 / 형식 오류 / 서명 위조가 갈리는가
 *   2. 서명 불일치 / 백엔드 실패가 갈리는가
 *   3. "발급할 인증서 없음"의 다섯 가지 사유가 갈리는가
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include "dat_util.h"
#include "../include/dat/dat.h"
#include "../include/dat/dat_cms.h"

static int g_checks = 0;

/* 코드 문자열로 단언한다. enum 값이 아니라 문자열이 공개 계약이기 때문이다. */
#define ASSERT_CODE(expr, expected)                                            \
    do {                                                                       \
        dat_error_t _got = (expr);                                             \
        const char* _gs = dat_error_code(_got);                                \
        if (strcmp(_gs, (expected)) != 0) {                                    \
            fprintf(stderr, "%s:%d: expected %s, got %s (enum %d)\n",          \
                    __FILE__, __LINE__, (expected), _gs, (int)_got);           \
            abort();                                                           \
        }                                                                      \
        g_checks++;                                                            \
    } while (0)

#define ASSERT_TRUE(cond)                                                      \
    do {                                                                       \
        if (!(cond)) {                                                         \
            fprintf(stderr, "%s:%d: assertion failed: %s\n",                   \
                    __FILE__, __LINE__, #cond);                                \
            abort();                                                           \
        }                                                                      \
        g_checks++;                                                            \
    } while (0)

static const dat_signature_alg_t SIG = DAT_SIG_ECDSA_P256;
static const dat_crypto_alg_t    CRY = DAT_CRYPTO_IV_AES256_GCM;

/* 발급창이 열려 있는 정상 매니저. */
static dat_manager_t* issuable_manager(uint64_t cid) {
    uint64_t now = now_unix_timestamp();
    dat_certificate_t* cert = NULL;
    assert(dat_certificate_create(cid, now - 10, 200, 100, SIG, CRY, &cert) == DAT_SUCCESS);
    dat_manager_t* m = dat_manager_new();
    assert(m);
    assert(dat_manager_import_certificates(m, &cert, 1, true, NULL) == DAT_SUCCESS);
    dat_certificate_free(cert);
    return m;
}

/* 토큰의 expire 필드만 갈아 끼운다. 나머지 구조는 그대로다. */
static char* with_expire(const char* token, uint64_t expire) {
    const char* rest = strchr(token, '.');
    assert(rest);
    char* out = malloc(strlen(token) + 32);
    assert(out);
    sprintf(out, "%llu%s", (unsigned long long)expire, rest);
    return out;
}

/* ── 1. 만료 / 형식 오류 / 서명 위조 ─────────────────────────────────── */

static void test_expired_is_not_malformed(void) {
    dat_manager_t* m = issuable_manager(1);
    char* token = NULL;
    assert(dat_manager_issue(m, "p", "s", &token) == DAT_SUCCESS);
    dat_payload_t* out = NULL;

    char* expired = with_expire(token, now_unix_timestamp() - 1);
    ASSERT_CODE(dat_manager_parse(m, expired, &out), "DAT_TOKEN_EXPIRED");
    free(expired);

    /* 정각도 만료다 (interop: expire > now 여야 유효). */
    char* at_now = with_expire(token, now_unix_timestamp());
    ASSERT_CODE(dat_manager_parse(m, at_now, &out), "DAT_TOKEN_EXPIRED");
    free(at_now);

    free(token);
    dat_manager_free(m);
}

static void test_malformed_token_shapes(void) {
    dat_manager_t* m = issuable_manager(1);
    char* token = NULL;
    assert(dat_manager_issue(m, "p", "s", &token) == DAT_SUCCESS);
    dat_payload_t* out = NULL;

    /* 파트 수 부족 */
    ASSERT_CODE(dat_manager_parse(m, "1.2.3", &out), "DAT_TOKEN_MALFORMED");

    /* 파트 수 초과 */
    char* extra = malloc(strlen(token) + 8);
    sprintf(extra, "%s.extra", token);
    ASSERT_CODE(dat_manager_parse(m, extra, &out), "DAT_TOKEN_MALFORMED");
    free(extra);

    /* expire 가 순수 10진수가 아님 — 만료가 아니라 형식 오류다 */
    char* signed_expire = malloc(strlen(token) + 2);
    sprintf(signed_expire, "+%s", token);
    ASSERT_CODE(dat_manager_parse(m, signed_expire, &out), "DAT_TOKEN_MALFORMED");
    free(signed_expire);

    /* cid 가 16진수가 아님 */
    const char* d1 = strchr(token, '.');
    const char* d2 = strchr(d1 + 1, '.');
    char* bad_cid = malloc(strlen(token) + 8);
    sprintf(bad_cid, "%.*s.zz%s", (int)(d1 - token), token, d2);
    ASSERT_CODE(dat_manager_parse(m, bad_cid, &out), "DAT_TOKEN_MALFORMED");
    free(bad_cid);

    free(token);
    dat_manager_free(m);
}

static void test_empty_signature_is_sig_malformed(void) {
    dat_manager_t* m = issuable_manager(1);
    char* token = NULL;
    assert(dat_manager_issue(m, "p", "s", &token) == DAT_SUCCESS);
    dat_payload_t* out = NULL;

    /* 마지막 '.' 뒤를 비운다 */
    char* no_sig = strdup(token);
    char* last_dot = strrchr(no_sig, '.');
    last_dot[1] = '\0';
    ASSERT_CODE(dat_manager_parse(m, no_sig, &out), "DAT_SIG_MALFORMED");
    free(no_sig);

    free(token);
    dat_manager_free(m);
}

static void test_forged_signature_is_sig_mismatch(void) {
    /* 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다. */
    dat_manager_t* victim   = issuable_manager(7);
    dat_manager_t* attacker = issuable_manager(7);

    char* forged = NULL;
    assert(dat_manager_issue(attacker, "p", "s", &forged) == DAT_SUCCESS);

    dat_payload_t* out = NULL;
    ASSERT_CODE(dat_manager_parse(victim, forged, &out), "DAT_SIG_MISMATCH");
    /* 위조는 보안 이벤트로 표시되어야 한다. */
    ASSERT_TRUE(dat_error_is_security_event(DAT_SIG_MISMATCH));
    /* 백엔드 실패는 아니다 — 이 둘이 갈리는 것이 두 번째 존재 이유다. */
    ASSERT_TRUE(!dat_error_is_security_event(DAT_SIG_BACKEND));

    free(forged);
    dat_manager_free(victim);
    dat_manager_free(attacker);
}

static void test_tampered_secure_is_tag_mismatch(void) {
    /* 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다. */
    dat_manager_t* m = issuable_manager(1);
    char* token = NULL;
    assert(dat_manager_issue(m, "plain", "secure-payload", &token) == DAT_SUCCESS);

    /* secure 필드(4번째)의 마지막 base64 문자를 뒤집는다 */
    char* copy = strdup(token);
    char* d1 = strchr(copy, '.');
    char* d2 = strchr(d1 + 1, '.');
    char* d3 = strchr(d2 + 1, '.');
    char* d4 = strchr(d3 + 1, '.');
    d4[-1] = (d4[-1] == 'A') ? 'B' : 'A';

    dat_payload_t* out = NULL;
    ASSERT_CODE(dat_manager_parse_without_verify(m, copy, &out), "DAT_CRYPTO_TAG_MISMATCH");
    ASSERT_TRUE(dat_error_is_security_event(DAT_CRYPTO_TAG_MISMATCH));

    free(copy);
    free(token);
    dat_manager_free(m);
}

/* ── 2. 인증서 ───────────────────────────────────────────────────────── */

static void test_unknown_cid_is_cert_not_found(void) {
    dat_manager_t* m     = issuable_manager(1);
    dat_manager_t* other = issuable_manager(999);

    char* token = NULL;
    assert(dat_manager_issue(other, "p", "s", &token) == DAT_SUCCESS);

    dat_payload_t* out = NULL;
    ASSERT_CODE(dat_manager_parse(m, token, &out), "DAT_CERT_NOT_FOUND");

    free(token);
    dat_manager_free(m);
    dat_manager_free(other);
}

static void test_duplicate_cid(void) {
    uint64_t now = now_unix_timestamp();
    dat_certificate_t* certs[2] = { NULL, NULL };
    assert(dat_certificate_create(5, now - 10, 200, 100, SIG, CRY, &certs[0]) == DAT_SUCCESS);
    assert(dat_certificate_create(5, now - 10, 200, 100, SIG, CRY, &certs[1]) == DAT_SUCCESS);

    dat_manager_t* m = dat_manager_new();
    ASSERT_CODE(dat_manager_import_certificates(m, certs, 2, true, NULL), "DAT_CERT_DUPLICATE_CID");

    dat_certificate_free(certs[0]);
    dat_certificate_free(certs[1]);
    dat_manager_free(m);
}

static void test_malformed_certificate(void) {
    dat_certificate_t* c = NULL;
    /* 파트 수 부족 */
    ASSERT_CODE(dat_certificate_parse("a.b.c", &c), "DAT_CERT_MALFORMED");
    /* 8 파트지만 cid 가 16진수가 아님 */
    ASSERT_CODE(dat_certificate_parse("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA", &c),
                "DAT_CERT_MALFORMED");
    /* 시간 산술 오버플로 */
    dat_certificate_t* o = NULL;
    ASSERT_CODE(dat_certificate_create(1, UINT64_MAX, 1, 0, SIG, CRY, &o), "DAT_CERT_MALFORMED");
}

/* ── 3. "발급할 인증서 없음" 다섯 갈래 ──────────────────────────────── */

static void test_no_certificate_at_all(void) {
    dat_manager_t* m = dat_manager_new();
    char* out = NULL;
    ASSERT_CODE(dat_manager_issue(m, "p", "s", &out), "DAT_MANAGER_NO_CERTIFICATE");
    ASSERT_CODE(dat_manager_issuable_cause(m), "DAT_MANAGER_NO_CERTIFICATE");
    /* CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다. */
    ASSERT_TRUE(dat_error_retry(DAT_MANAGER_NO_CERTIFICATE) == DAT_RETRY_TRANSIENT);
    dat_manager_free(m);
}

static void test_issuance_window_not_yet_open(void) {
    uint64_t now = now_unix_timestamp();
    dat_certificate_t* cert = NULL;
    assert(dat_certificate_create(1, now + 3600, 200, 100, SIG, CRY, &cert) == DAT_SUCCESS);
    dat_manager_t* m = dat_manager_new();
    assert(dat_manager_import_certificates(m, &cert, 1, true, NULL) == DAT_SUCCESS);

    char* out = NULL;
    ASSERT_CODE(dat_manager_issue(m, "p", "s", &out), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    ASSERT_CODE(dat_manager_issuable_cause(m), "DAT_CERT_NOT_YET_ISSUABLE");
    /* 기다리면 풀리는 유일한 사유다. */
    ASSERT_TRUE(dat_error_retry(DAT_CERT_NOT_YET_ISSUABLE) == DAT_RETRY_TRANSIENT);

    dat_certificate_free(cert);
    dat_manager_free(m);
}

static void test_issuance_window_closed(void) {
    uint64_t now = now_unix_timestamp();
    /* 발급창은 닫혔지만 ttl 이 남아 검증은 된다. */
    dat_certificate_t* cert = NULL;
    assert(dat_certificate_create(1, now - 500, 100, 3600, SIG, CRY, &cert) == DAT_SUCCESS);
    dat_manager_t* m = dat_manager_new();
    assert(dat_manager_import_certificates(m, &cert, 1, true, NULL) == DAT_SUCCESS);

    char* out = NULL;
    ASSERT_CODE(dat_manager_issue(m, "p", "s", &out), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    ASSERT_CODE(dat_manager_issuable_cause(m), "DAT_CERT_ISSUANCE_ENDED");
    ASSERT_TRUE(dat_error_retry(DAT_CERT_ISSUANCE_ENDED) == DAT_RETRY_PERMANENT);

    dat_certificate_free(cert);
    dat_manager_free(m);
}

static void test_verify_only_cannot_issue(void) {
    uint64_t now = now_unix_timestamp();
    dat_certificate_t* source = NULL;
    assert(dat_certificate_create(1, now - 10, 200, 100, SIG, CRY, &source) == DAT_SUCCESS);

    char* exported = NULL;
    assert(dat_certificate_export(source, true, &exported) == DAT_SUCCESS);
    dat_certificate_t* verify_only = NULL;
    assert(dat_certificate_parse(exported, &verify_only) == DAT_SUCCESS);

    dat_manager_t* m = dat_manager_new();
    assert(dat_manager_import_certificates(m, &verify_only, 1, true, NULL) == DAT_SUCCESS);

    char* out = NULL;
    ASSERT_CODE(dat_manager_issue(m, "p", "s", &out), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    /* 배포 설정 실수다 — 기다려도 안 풀린다. */
    ASSERT_CODE(dat_manager_issuable_cause(m), "DAT_CERT_VERIFY_ONLY");

    free(exported);
    dat_certificate_free(source);
    dat_certificate_free(verify_only);
    dat_manager_free(m);
}

/* ── 키 · 알고리즘 · 인자 ────────────────────────────────────────────── */

static void test_algorithm_and_key(void) {
    dat_signature_alg_t sa;
    dat_crypto_alg_t ca;
    ASSERT_CODE(dat_signature_alg_from_str("NOPE", &sa), "DAT_CONFIG_ALG_UNSUPPORTED");
    ASSERT_CODE(dat_crypto_alg_from_str("NOPE", &ca), "DAT_CONFIG_ALG_UNSUPPORTED");

    /* NULL 인자는 "알 수 없는 알고리즘"이 아니라 호출자의 실수다.
     * 예전에는 NULL 인자에 8가지 값이 나왔다. */
    ASSERT_CODE(dat_signature_alg_from_str(NULL, &sa), "DAT_CONFIG_ARGUMENT_INVALID");
    ASSERT_CODE(dat_crypto_alg_from_str(NULL, &ca), "DAT_CONFIG_ARGUMENT_INVALID");
    ASSERT_CODE(dat_manager_issue(NULL, "p", "s", NULL), "DAT_CONFIG_ARGUMENT_INVALID");
    ASSERT_CODE(dat_certificate_parse(NULL, NULL), "DAT_CONFIG_ARGUMENT_INVALID");

    /* 키 길이 불일치는 키 재료 문제다. */
    uint8_t short_key[7] = {0};
    dat_crypto_t* c = NULL;
    ASSERT_CODE(dat_crypto_from_key(CRY, short_key, sizeof(short_key), &c), "DAT_KEY_INVALID");
    dat_signature_t* s = NULL;
    ASSERT_CODE(dat_signature_from_key(SIG, short_key, sizeof(short_key), &s), "DAT_KEY_INVALID");
    ASSERT_CODE(dat_signature_from_key(DAT_SIG_HMAC_SHA256_MFS, short_key, sizeof(short_key), &s),
                "DAT_KEY_INVALID");
}

static void test_verify_only_unsupported_vs_key_missing(void) {
    /* 알고리즘의 구조적 한계 (HMAC 은 verify-only 를 낼 수 없다) */
    dat_signature_t* hmac = NULL;
    assert(dat_signature_new(DAT_SIG_HMAC_SHA256_MFS, &hmac) == DAT_SUCCESS);
    uint8_t* k = NULL; size_t klen = 0;
    ASSERT_CODE(dat_signature_export_verify_only_key(hmac, &k, &klen),
                "DAT_KEY_VERIFY_ONLY_UNSUPPORTED");
    dat_signature_free(hmac);

    /* 런타임에 개인키가 없음 — 위와 다른 오류다 */
    dat_signature_t* src = NULL;
    assert(dat_signature_new(SIG, &src) == DAT_SUCCESS);
    assert(dat_signature_export_verify_only_key(src, &k, &klen) == DAT_SUCCESS);
    dat_signature_t* pub_only = NULL;
    assert(dat_signature_from_key(SIG, k, klen, &pub_only) == DAT_SUCCESS);
    free(k);

    uint8_t* sig = NULL; size_t sig_len = 0;
    ASSERT_CODE(dat_signature_sign(pub_only, (const uint8_t*)"body", 4, &sig, &sig_len),
                "DAT_SIG_KEY_MISSING");

    dat_signature_free(src);
    dat_signature_free(pub_only);
}

static void test_crypto_data_bounds(void) {
    dat_crypto_t* c = NULL;
    assert(dat_crypto_new(CRY, &c) == DAT_SUCCESS);

    uint8_t tiny[5] = {0};
    uint8_t* out = NULL; size_t out_len = 0;
    ASSERT_CODE(dat_crypto_decrypt(c, tiny, sizeof(tiny), &out, &out_len),
                "DAT_CRYPTO_DATA_INVALID");

    /* 빈 secure 페이로드는 오류가 아니다 — 빈 입력 → 빈 출력 (모든 공식 클라이언트 공통) */
    ASSERT_TRUE(dat_crypto_encrypt(c, NULL, 0, &out, &out_len) == DAT_SUCCESS && out_len == 0);
    free(out);
    ASSERT_TRUE(dat_crypto_decrypt(c, NULL, 0, &out, &out_len) == DAT_SUCCESS && out_len == 0);
    free(out);

    dat_crypto_free(c);
}

/* ── 코드 체계 자체의 불변식 ─────────────────────────────────────────── */

static void test_code_system_invariants(void) {
    /* 모든 코드가 DAT_ 로 시작하는 SCREAMING_SNAKE_CASE 여야 한다. */
#define CHECK_X(name, retry, security)                                         \
    do {                                                                       \
        const char* c = dat_error_code(name);                                  \
        ASSERT_TRUE(strncmp(c, "DAT_", 4) == 0);                               \
        for (const char* q = c; *q; q++)                                       \
            ASSERT_TRUE((*q >= 'A' && *q <= 'Z') || *q == '_');                \
        /* enum 이름과 문자열이 정확히 같아야 한다 */                          \
        ASSERT_TRUE(strcmp(c, #name) == 0);                                    \
    } while (0);
    DAT_ERROR_CODE_LIST(CHECK_X)
#undef CHECK_X

    /* 알 수 없는 값도 NULL 이 아니라 폴백 코드를 돌려준다. */
    ASSERT_TRUE(strcmp(dat_error_code((dat_error_t)9999), "DAT_INTERNAL_UNKNOWN") == 0);
    ASSERT_TRUE(strcmp(dat_error_code(DAT_SUCCESS), "DAT_SUCCESS") == 0);

    /* 레거시 값도 유효한 계약 문자열로 번역된다. */
    ASSERT_TRUE(strcmp(dat_error_code(DAT_ERROR_INVALID_DAT), "DAT_TOKEN_MALFORMED") == 0);
    ASSERT_TRUE(strcmp(dat_error_code(DAT_ERROR_CID_NOT_FOUND), "DAT_CERT_NOT_FOUND") == 0);

    /* 401 에 영원히 재시도하던 것이 이 분류의 존재 이유다. */
    ASSERT_TRUE(dat_error_retry(DAT_CMS_UNAUTHORIZED)      == DAT_RETRY_PERMANENT);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_FORBIDDEN)         == DAT_RETRY_PERMANENT);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_ENDPOINT_NOT_FOUND) == DAT_RETRY_PERMANENT);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_UNREACHABLE)       == DAT_RETRY_TRANSIENT);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_SERVER_ERROR)      == DAT_RETRY_TRANSIENT);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_NOT_SYNCED)        == DAT_RETRY_TRANSIENT);

    /* 상태 신호는 실패가 아니다. */
    ASSERT_TRUE(dat_error_retry(DAT_CMS_SYNC_IN_PROGRESS) == DAT_RETRY_STATE);
    ASSERT_TRUE(dat_error_retry(DAT_CMS_VERSION_RESET)    == DAT_RETRY_STATE);

    /* 보안 이벤트는 정확히 두 개다. */
    ASSERT_TRUE(dat_error_is_security_event(DAT_SIG_MISMATCH));
    ASSERT_TRUE(dat_error_is_security_event(DAT_CRYPTO_TAG_MISMATCH));
    ASSERT_TRUE(!dat_error_is_security_event(DAT_TOKEN_EXPIRED));
    ASSERT_TRUE(!dat_error_is_security_event(DAT_SIG_MALFORMED));

    /* 레거시 정수값이 재배치되지 않았는지 못 박는다. ABI 호환의 근거다. */
    ASSERT_TRUE((int)DAT_SUCCESS == 0);
    ASSERT_TRUE((int)DAT_ERROR_INVALID_DAT == 1);
    ASSERT_TRUE((int)DAT_ERROR_OVERFLOW == 15);
    ASSERT_TRUE((int)DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL == 16);
    /* 새 코드는 전부 그 뒤에 붙는다. */
    ASSERT_TRUE((int)DAT_TOKEN_MALFORMED == 17);
}

static void test_cms_not_supported_is_distinguishable(void) {
    /* CURL 없이 빌드되면 create 가 DAT_CMS_NOT_SUPPORTED 를 돌려준다.
     * 예전에는 MANAGER_ERROR 라서 진짜 매니저 오류와 구분되지 않았다.
     * CURL 이 있는 빌드에서는 잘못된 URL 이 URI 오류로 갈린다. */
    dat_cms_manager_t* cms = NULL;
    dat_error_t e = dat_cms_manager_create("ftp://localhost", "", false, 0, NULL, NULL, &cms);
    const char* code = dat_error_code(e);
    ASSERT_TRUE(strcmp(code, "DAT_CONFIG_URI_INVALID") == 0 ||
                strcmp(code, "DAT_CMS_NOT_SUPPORTED") == 0);
    if (cms) dat_cms_manager_free(cms);
}

int main(void) {
    test_expired_is_not_malformed();
    test_malformed_token_shapes();
    test_empty_signature_is_sig_malformed();
    test_forged_signature_is_sig_mismatch();
    test_tampered_secure_is_tag_mismatch();

    test_unknown_cid_is_cert_not_found();
    test_duplicate_cid();
    test_malformed_certificate();

    test_no_certificate_at_all();
    test_issuance_window_not_yet_open();
    test_issuance_window_closed();
    test_verify_only_cannot_issue();

    test_algorithm_and_key();
    test_verify_only_unsupported_vs_key_missing();
    test_crypto_data_bounds();

    test_code_system_invariants();
    test_cms_not_supported_is_distinguishable();

    printf("error_code_test: %d checks passed\n", g_checks);
    return 0;
}
