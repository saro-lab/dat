#include "dat_dat.h"
#include "dat_util.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <inttypes.h>

dat_error_t dat_dat_parse(const char* dat_str, dat_dat_t** out) {
    if (!dat_str || !out) return DAT_CONFIG_ARGUMENT_INVALID;

    size_t total_len = strlen(dat_str);
    const char* p = dat_str;
    const char* end = dat_str + total_len;

    /* 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
     *    애초에 토큰이 아니다. 예전에는 구조·필드·만료·위조가 전부 INVALID_DAT
     *    하나였고, 그래서 호출부가 "토큰을 갱신하라"와 "세션을 끊어라"를 구분할
     *    수 없었다. */
    const char* dot1 = memchr(p, '.', (size_t)(end - p));
    if (!dot1) return DAT_TOKEN_MALFORMED;
    size_t expire_len = (size_t)(dot1 - p);
    const char* expire_str = p;

    p = dot1 + 1;
    const char* dot2 = memchr(p, '.', (size_t)(end - p));
    if (!dot2) return DAT_TOKEN_MALFORMED;
    size_t cid_len = (size_t)(dot2 - p);
    const char* cid_str = p;

    p = dot2 + 1;
    const char* dot3 = memchr(p, '.', (size_t)(end - p));
    if (!dot3) return DAT_TOKEN_MALFORMED;
    size_t plain_pos = (size_t)(p - dat_str);
    size_t plain_len = (size_t)(dot3 - p);

    p = dot3 + 1;
    const char* dot4 = memchr(p, '.', (size_t)(end - p));
    if (!dot4) return DAT_TOKEN_MALFORMED;
    size_t secure_pos = (size_t)(p - dat_str);
    size_t secure_len = (size_t)(dot4 - p);
    size_t secure_end = secure_pos + secure_len;

    p = dot4 + 1;
    size_t sig_b64_len = (size_t)(end - p);
    /* 파트가 6개 이상 */
    if (memchr(p, '.', sig_b64_len) != NULL) return DAT_TOKEN_MALFORMED;

    /* 2) 구조가 맞은 뒤에야 값을 본다. */
    uint64_t expire;
    if (!parse_u64_strict(expire_str, expire_len, 10, &expire)) return DAT_TOKEN_MALFORMED;
    /* 정각도 만료다 (interop: expire > now 여야 유효). */
    if (expire <= now_unix_timestamp()) return DAT_TOKEN_EXPIRED;

    uint64_t cid;
    if (!parse_u64_strict(cid_str, cid_len, 16, &cid)) return DAT_TOKEN_MALFORMED;

    /* 빈 서명·깨진 서명은 토큰 구조가 아니라 서명 자체의 형식 오류다. */
    if (sig_b64_len == 0) return DAT_SIG_MALFORMED;

    uint8_t* sig_bytes = NULL;
    size_t   sig_len   = 0;
    dat_error_t err = decode_base64_url(p, sig_b64_len, &sig_bytes, &sig_len);
    if (err != DAT_SUCCESS) return DAT_SIG_MALFORMED;

    /* Build body = dat_str[0..secure_end] */
    char* body = malloc(secure_end + 1);
    if (!body) { free(sig_bytes); return DAT_INTERNAL_UNKNOWN; }
    memcpy(body, dat_str, secure_end);
    body[secure_end] = '\0';

    dat_dat_t* d = malloc(sizeof(dat_dat_t));
    if (!d) { free(body); free(sig_bytes); return DAT_INTERNAL_UNKNOWN; }

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

/* util 의 base64 디코더는 중립적인 CONFIG_ARGUMENT_INVALID 를 돌려준다.
 * 여기서는 토큰 필드를 읽고 있으므로 토큰 형식 오류로 바꿔 단다. */
dat_error_t dat_dat_plain(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len) {
    dat_error_t e = decode_base64_url(dat->body + dat->plain_pos, dat->plain_len, out_data, out_len);
    return (e == DAT_CONFIG_ARGUMENT_INVALID) ? DAT_TOKEN_MALFORMED : e;
}

dat_error_t dat_dat_secure(const dat_dat_t* dat, uint8_t** out_data, size_t* out_len) {
    dat_error_t e = decode_base64_url(dat->body + dat->secure_pos, dat->secure_len, out_data, out_len);
    return (e == DAT_CONFIG_ARGUMENT_INVALID) ? DAT_TOKEN_MALFORMED : e;
}

void dat_dat_free(dat_dat_t* dat) {
    if (!dat) return;
    free(dat->body);
    free(dat->signature);
    free(dat);
}
