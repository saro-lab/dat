#include "dat_dat.h"
#include "dat_util.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <inttypes.h>

dat_error_t dat_dat_parse(const char* dat_str, dat_dat_t** out) {
    if (!dat_str || !out) return DAT_ERROR_INVALID_DAT;

    size_t total_len = strlen(dat_str);
    const char* p = dat_str;
    const char* end = dat_str + total_len;

    /* Part 1: expire (decimal u64) */
    const char* dot1 = memchr(p, '.', (size_t)(end - p));
    if (!dot1) return DAT_ERROR_INVALID_DAT;

    char expire_buf[21];
    size_t expire_len = (size_t)(dot1 - p);
    if (expire_len == 0 || expire_len >= sizeof(expire_buf)) return DAT_ERROR_INVALID_DAT;
    memcpy(expire_buf, p, expire_len);
    expire_buf[expire_len] = '\0';
    char* endptr;
    uint64_t expire = (uint64_t)strtoull(expire_buf, &endptr, 10);
    if (*endptr != '\0') return DAT_ERROR_INVALID_DAT;
    if (expire <= now_unix_timestamp()) return DAT_ERROR_INVALID_DAT;

    /* Part 2: cid (hex u64) */
    p = dot1 + 1;
    const char* dot2 = memchr(p, '.', (size_t)(end - p));
    if (!dot2) return DAT_ERROR_INVALID_DAT;

    char cid_buf[17];
    size_t cid_len = (size_t)(dot2 - p);
    if (cid_len == 0 || cid_len >= sizeof(cid_buf)) return DAT_ERROR_INVALID_DAT;
    memcpy(cid_buf, p, cid_len);
    cid_buf[cid_len] = '\0';
    uint64_t cid = (uint64_t)strtoull(cid_buf, &endptr, 16);
    if (*endptr != '\0') return DAT_ERROR_INVALID_DAT;

    /* Part 3: plain (base64url) */
    p = dot2 + 1;
    const char* dot3 = memchr(p, '.', (size_t)(end - p));
    if (!dot3) return DAT_ERROR_INVALID_DAT;
    size_t plain_pos = (size_t)(p - dat_str);
    size_t plain_len = (size_t)(dot3 - p);

    /* Part 4: secure (base64url) */
    p = dot3 + 1;
    const char* dot4 = memchr(p, '.', (size_t)(end - p));
    if (!dot4) return DAT_ERROR_INVALID_DAT;
    size_t secure_pos = (size_t)(p - dat_str);
    size_t secure_len = (size_t)(dot4 - p);
    size_t secure_end = secure_pos + secure_len;

    /* Part 5: signature (base64url, must be non-empty) */
    p = dot4 + 1;
    size_t sig_b64_len = (size_t)(end - p);
    if (sig_b64_len == 0) return DAT_ERROR_INVALID_DAT;

    /* Must be exactly 5 parts (no more dots after signature) */
    if (memchr(p, '.', sig_b64_len) != NULL) return DAT_ERROR_INVALID_DAT;

    /* Decode signature */
    uint8_t* sig_bytes = NULL;
    size_t   sig_len   = 0;
    dat_error_t err = decode_base64_url(p, sig_b64_len, &sig_bytes, &sig_len);
    if (err != DAT_SUCCESS) return DAT_ERROR_INVALID_DAT;

    /* Build body = dat_str[0..secure_end] */
    char* body = malloc(secure_end + 1);
    if (!body) { free(sig_bytes); return DAT_ERROR_MALLOC_FAILED; }
    memcpy(body, dat_str, secure_end);
    body[secure_end] = '\0';

    dat_dat_t* d = malloc(sizeof(dat_dat_t));
    if (!d) { free(body); free(sig_bytes); return DAT_ERROR_MALLOC_FAILED; }

    d->body          = body;
    d->body_len      = secure_end;
    d->expire        = expire;
    d->cid           = cid;
    d->plain_pos     = plain_pos;
    d->plain_len     = plain_len;
    d->secure_pos    = secure_pos;
    d->secure_len    = secure_len;
    d->signature     = sig_bytes;
    d->signature_len = sig_len;

    *out = d;
    return DAT_SUCCESS;
}

dat_error_t dat_dat_plain(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len) {
    return decode_base64_url(dat->body + dat->plain_pos, dat->plain_len, out_data, out_len);
}

dat_error_t dat_dat_secure(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len) {
    return decode_base64_url(dat->body + dat->secure_pos, dat->secure_len, out_data, out_len);
}

void dat_dat_free(dat_dat_t* dat) {
    if (!dat) return;
    free(dat->body);
    free(dat->signature);
    free(dat);
}
