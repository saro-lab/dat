#ifndef DAT_CMS_INTERNAL_H
#define DAT_CMS_INTERNAL_H

#include "../include/dat/dat.h"

dat_error_t dat_cms_http_status_error(long http_code);

dat_error_t dat_cms_apply_response(
    dat_manager_t* manager,
    uint64_t current_version,
    const unsigned char* body,
    size_t body_len,
    uint64_t* version_out,
    bool* version_changed,
    bool* version_reset
);

#endif
