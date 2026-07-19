#ifndef DAT_UTIL_H
#define DAT_UTIL_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include "../include/dat/dat.h"

typedef struct {
    char*  data;
    size_t len;
    size_t cap;
} dat_sbuf_t;

typedef struct {
    uint8_t* data;
    size_t   len;
    size_t   cap;
} dat_bbuf_t;

dat_error_t sbuf_init(dat_sbuf_t* buf, size_t cap);
dat_error_t sbuf_push_bytes(dat_sbuf_t* buf, const char* bytes, size_t len);
dat_error_t sbuf_push_char(dat_sbuf_t* buf, char c);
dat_error_t sbuf_push_str(dat_sbuf_t* buf, const char* str);
void        sbuf_clear(dat_sbuf_t* buf);
void        sbuf_free(dat_sbuf_t* buf);
char*       sbuf_take(dat_sbuf_t* buf);

dat_error_t bbuf_init(dat_bbuf_t* buf, size_t cap);
dat_error_t bbuf_ensure(dat_bbuf_t* buf, size_t extra);
dat_error_t bbuf_push(dat_bbuf_t* buf, const uint8_t* data, size_t len);
void        bbuf_free(dat_bbuf_t* buf);
uint8_t*    bbuf_take(dat_bbuf_t* buf, size_t* len_out);

size_t      base64url_encoded_len(size_t input_len);
size_t      base64url_decoded_len(const char* b64, size_t b64_len);

dat_error_t encode_base64_url_out(const uint8_t* data, size_t len, dat_sbuf_t* out);
dat_error_t encode_base64_url(const uint8_t* data, size_t len, char** out_str, size_t* out_len);

dat_error_t decode_base64_url_out(const char* b64, size_t b64_len, dat_bbuf_t* out);
dat_error_t decode_base64_url_out_str(const char* b64, size_t b64_len, dat_sbuf_t* out);
dat_error_t decode_base64_url(const char* b64, size_t b64_len, uint8_t** out_data, size_t* out_len);

void     to_hex_u64_out(uint64_t no, dat_sbuf_t* out);
uint64_t now_unix_timestamp(void);

#endif /* DAT_UTIL_H */
