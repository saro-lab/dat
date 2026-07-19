#ifndef DAT_DAT_H
#define DAT_DAT_H

#include <stdint.h>
#include <stddef.h>
#include "../include/dat/dat.h"
#include "dat_util.h"

typedef struct {
    char*    body;
    size_t   body_len;
    uint64_t expire;
    uint64_t cid;
    size_t   plain_pos;
    size_t   plain_len;
    size_t   secure_pos;
    size_t   secure_len;
    uint8_t* signature;
    size_t   signature_len;
} dat_dat_t;

dat_error_t dat_dat_parse(const char* dat_str, dat_dat_t** out);
dat_error_t dat_dat_plain(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len);
dat_error_t dat_dat_secure(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len);
void        dat_dat_free(dat_dat_t* dat);

#endif /* DAT_DAT_H */
