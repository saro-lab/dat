#ifndef DAT_CMS_H
#define DAT_CMS_H

#include "dat.h"

#ifdef __cplusplus
extern "C" {
#endif

#define DAT_CMS_API_VERSION "v1"

typedef enum {
    DAT_LOG_DEBUG    = 0,
    DAT_LOG_INFO     = 1,
    DAT_LOG_WARN     = 2,
    DAT_LOG_ERROR    = 3,
} dat_log_level_t;

typedef void (*dat_log_fn_t)(dat_log_level_t level, const char* message, void* userdata);

typedef struct dat_cms_manager dat_cms_manager_t;

dat_error_t dat_cms_manager_create(
    const char* url,
    const char* token,
    bool verify_only,
    uint64_t interval_seconds,
    dat_log_fn_t log_fn,
    void* log_userdata,
    dat_cms_manager_t** out
);

void dat_cms_manager_free(dat_cms_manager_t* cms);

/* 동기화한다.
 *
 * 반환값이 DAT_CMS_SYNC_IN_PROGRESS 면 오류가 아니라 상태 신호다 — 이전 동기화가
 * 아직 도는 중이라 건너뛴 것이다. dat_error_retry() 로 판정할 수 있다. */
dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms);

/* 마지막 동기화 실패. 한 번도 성공하지 못했으면 DAT_CMS_NOT_SYNCED,
 * 정상이면 DAT_SUCCESS.
 *
 * dat_cms_manager_create() 는 최초 sync 가 실패해도 매니저를 그대로 돌려주고
 * DAT_SUCCESS 를 반환한다(네트워크가 복구되면 쓸 수 있는 객체이므로). 그 실패를
 * 여기서 조회한다. 재시도해도 소용없는지는 dat_error_retry() 로 본다 — 예컨대
 * DAT_CMS_UNAUTHORIZED 는 토큰 설정을 고치기 전에는 영원히 실패한다. */
dat_error_t dat_cms_manager_last_error(dat_cms_manager_t* cms);
dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms, const char* plain, const char* secure, char** out);
dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
uint64_t dat_cms_manager_get_version(dat_cms_manager_t* cms);
dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms);

#ifdef __cplusplus
}
#endif

#endif /* DAT_CMS_H */
