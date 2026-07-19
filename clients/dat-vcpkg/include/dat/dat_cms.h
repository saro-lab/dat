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
dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms);
dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms, const char* plain, const char* secure, char** out);
dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms, const char* dat_str, dat_payload_t** out);
uint64_t dat_cms_manager_get_version(dat_cms_manager_t* cms);
dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms);

#ifdef __cplusplus
}
#endif

#endif /* DAT_CMS_H */
