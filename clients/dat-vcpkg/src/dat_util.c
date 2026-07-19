#include "dat_util.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdint.h>

/* ── sbuf ──────────────────────────────────────────────────────────── */

dat_error_t sbuf_init(dat_sbuf_t* buf, size_t cap) {
    if (cap == 0) cap = 16;
    buf->data = (char*)malloc(cap + 1);
    if (!buf->data) return DAT_ERROR_MALLOC_FAILED;
    buf->len = 0;
    buf->cap = cap;
    buf->data[0] = '\0';
    return DAT_SUCCESS;
}

static dat_error_t sbuf_ensure(dat_sbuf_t* buf, size_t extra) {
    if (buf->len + extra <= buf->cap) return DAT_SUCCESS;
    size_t new_cap = buf->cap * 2;
    if (new_cap < buf->len + extra) new_cap = buf->len + extra;
    char* nd = (char*)realloc(buf->data, new_cap + 1);
    if (!nd) return DAT_ERROR_MALLOC_FAILED;
    buf->data = nd;
    buf->cap  = new_cap;
    return DAT_SUCCESS;
}

dat_error_t sbuf_push_bytes(dat_sbuf_t* buf, const char* bytes, size_t len) {
    dat_error_t e = sbuf_ensure(buf, len);
    if (e) return e;
    memcpy(buf->data + buf->len, bytes, len);
    buf->len += len;
    buf->data[buf->len] = '\0';
    return DAT_SUCCESS;
}

dat_error_t sbuf_push_char(dat_sbuf_t* buf, char c) {
    return sbuf_push_bytes(buf, &c, 1);
}

dat_error_t sbuf_push_str(dat_sbuf_t* buf, const char* str) {
    return sbuf_push_bytes(buf, str, strlen(str));
}

void sbuf_clear(dat_sbuf_t* buf) {
    buf->len = 0;
    if (buf->data) buf->data[0] = '\0';
}

void sbuf_free(dat_sbuf_t* buf) {
    free(buf->data);
    buf->data = NULL;
    buf->len  = 0;
    buf->cap  = 0;
}

char* sbuf_take(dat_sbuf_t* buf) {
    char* d = buf->data;
    buf->data = NULL;
    buf->len  = 0;
    buf->cap  = 0;
    return d;
}

/* ── bbuf ──────────────────────────────────────────────────────────── */

dat_error_t bbuf_init(dat_bbuf_t* buf, size_t cap) {
    if (cap == 0) cap = 16;
    buf->data = (uint8_t*)malloc(cap);
    if (!buf->data) return DAT_ERROR_MALLOC_FAILED;
    buf->len = 0;
    buf->cap = cap;
    return DAT_SUCCESS;
}

dat_error_t bbuf_ensure(dat_bbuf_t* buf, size_t extra) {
    if (buf->len + extra <= buf->cap) return DAT_SUCCESS;
    size_t new_cap = buf->cap * 2;
    if (new_cap < buf->len + extra) new_cap = buf->len + extra;
    uint8_t* nd = (uint8_t*)realloc(buf->data, new_cap);
    if (!nd) return DAT_ERROR_MALLOC_FAILED;
    buf->data = nd;
    buf->cap  = new_cap;
    return DAT_SUCCESS;
}

dat_error_t bbuf_push(dat_bbuf_t* buf, const uint8_t* data, size_t len) {
    dat_error_t e = bbuf_ensure(buf, len);
    if (e) return e;
    memcpy(buf->data + buf->len, data, len);
    buf->len += len;
    return DAT_SUCCESS;
}

void bbuf_free(dat_bbuf_t* buf) {
    free(buf->data);
    buf->data = NULL;
    buf->len  = 0;
    buf->cap  = 0;
}

uint8_t* bbuf_take(dat_bbuf_t* buf, size_t* len_out) {
    uint8_t* d = buf->data;
    if (len_out) *len_out = buf->len;
    buf->data = NULL;
    buf->len  = 0;
    buf->cap  = 0;
    return d;
}

/* ── Base64 URL-safe no-pad ────────────────────────────────────────── */

static const char B64_ENC[64] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/* Decode table: 255 = invalid */
static const uint8_t B64_DEC[256] = {
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255, 62,255,255,
     52, 53, 54, 55, 56, 57, 58, 59, 60, 61,255,255,255,255,255,255,
    255,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
     15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,255,255,255,255, 63,
    255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
     41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
    255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255
};

size_t base64url_encoded_len(size_t input_len) {
    return (input_len * 4 + 2) / 3;
}

size_t base64url_decoded_len(const char* b64, size_t b64_len) {
    if (b64_len == 0) return 0;
    size_t pad = 0;
    if (b64_len >= 1 && b64[b64_len-1] == '=') pad++;
    if (b64_len >= 2 && b64[b64_len-2] == '=') pad++;
    return (b64_len * 3) / 4 - pad;
}

dat_error_t encode_base64_url_out(const uint8_t* data, size_t len, dat_sbuf_t* out) {
    size_t enc_len = base64url_encoded_len(len);
    dat_error_t e = sbuf_ensure(out, enc_len);
    if (e) return e;

    char* p = out->data + out->len;
    size_t i = 0;
    for (; i + 2 < len; i += 3) {
        uint32_t v = ((uint32_t)data[i] << 16) | ((uint32_t)data[i+1] << 8) | data[i+2];
        *p++ = B64_ENC[(v >> 18) & 0x3F];
        *p++ = B64_ENC[(v >> 12) & 0x3F];
        *p++ = B64_ENC[(v >>  6) & 0x3F];
        *p++ = B64_ENC[(v      ) & 0x3F];
    }
    if (i + 1 == len) {
        uint32_t v = (uint32_t)data[i] << 16;
        *p++ = B64_ENC[(v >> 18) & 0x3F];
        *p++ = B64_ENC[(v >> 12) & 0x3F];
    } else if (i + 2 == len) {
        uint32_t v = ((uint32_t)data[i] << 16) | ((uint32_t)data[i+1] << 8);
        *p++ = B64_ENC[(v >> 18) & 0x3F];
        *p++ = B64_ENC[(v >> 12) & 0x3F];
        *p++ = B64_ENC[(v >>  6) & 0x3F];
    }
    out->len += enc_len;
    out->data[out->len] = '\0';
    return DAT_SUCCESS;
}

dat_error_t encode_base64_url(const uint8_t* data, size_t len, char** out_str, size_t* out_len) {
    dat_sbuf_t buf;
    size_t enc_len = base64url_encoded_len(len);
    dat_error_t e = sbuf_init(&buf, enc_len);
    if (e) return e;
    e = encode_base64_url_out(data, len, &buf);
    if (e) { sbuf_free(&buf); return e; }
    if (out_len) *out_len = buf.len;
    *out_str = sbuf_take(&buf);
    return DAT_SUCCESS;
}

dat_error_t decode_base64_url_out(const char* b64, size_t b64_len, dat_bbuf_t* out) {
    size_t dec_len = (b64_len * 3 + 3) / 4;
    dat_error_t e = bbuf_ensure(out, dec_len);
    if (e) return e;

    uint8_t* p = out->data + out->len;
    size_t written = 0;
    size_t i = 0;
    while (i < b64_len) {
        uint8_t c0, c1, c2, c3;
        /* skip padding */
        while (i < b64_len && b64[i] == '=') i++;
        if (i >= b64_len) break;
        c0 = B64_DEC[(unsigned char)b64[i++]];
        if (c0 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;

        while (i < b64_len && b64[i] == '=') i++;
        if (i >= b64_len) {
            /* only one char left - should not happen in valid base64 */
            return DAT_ERROR_INVALID_BASE64_FORMAT;
        }
        c1 = B64_DEC[(unsigned char)b64[i++]];
        if (c1 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;

        p[written++] = (uint8_t)((c0 << 2) | (c1 >> 4));

        while (i < b64_len && b64[i] == '=') i++;
        if (i >= b64_len) break;
        c2 = B64_DEC[(unsigned char)b64[i++]];
        if (c2 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;
        p[written++] = (uint8_t)((c1 << 4) | (c2 >> 2));

        while (i < b64_len && b64[i] == '=') i++;
        if (i >= b64_len) break;
        c3 = B64_DEC[(unsigned char)b64[i++]];
        if (c3 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;
        p[written++] = (uint8_t)((c2 << 6) | c3);
    }
    out->len += written;
    return DAT_SUCCESS;
}

dat_error_t decode_base64_url_out_str(const char* b64, size_t b64_len, dat_sbuf_t* out) {
    size_t dec_len = (b64_len * 3 + 3) / 4;
    dat_error_t e = sbuf_ensure(out, dec_len);
    if (e) return e;

    /* Reuse bbuf logic by treating sbuf's char* as uint8_t* */
    dat_bbuf_t tmp;
    tmp.data = (uint8_t*)(out->data + out->len);
    tmp.len  = 0;
    tmp.cap  = dec_len;

    /* inline decode without realloc since we pre-ensured space */
    const char* src = b64;
    size_t src_len = b64_len;
    uint8_t* p = tmp.data;
    size_t written = 0;
    size_t i = 0;
    while (i < src_len) {
        uint8_t c0, c1, c2, c3;
        while (i < src_len && src[i] == '=') i++;
        if (i >= src_len) break;
        c0 = B64_DEC[(unsigned char)src[i++]];
        if (c0 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;

        while (i < src_len && src[i] == '=') i++;
        if (i >= src_len) return DAT_ERROR_INVALID_BASE64_FORMAT;
        c1 = B64_DEC[(unsigned char)src[i++]];
        if (c1 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;

        p[written++] = (uint8_t)((c0 << 2) | (c1 >> 4));

        while (i < src_len && src[i] == '=') i++;
        if (i >= src_len) break;
        c2 = B64_DEC[(unsigned char)src[i++]];
        if (c2 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;
        p[written++] = (uint8_t)((c1 << 4) | (c2 >> 2));

        while (i < src_len && src[i] == '=') i++;
        if (i >= src_len) break;
        c3 = B64_DEC[(unsigned char)src[i++]];
        if (c3 == 255) return DAT_ERROR_INVALID_BASE64_FORMAT;
        p[written++] = (uint8_t)((c2 << 6) | c3);
    }
    out->len += written;
    out->data[out->len] = '\0';
    return DAT_SUCCESS;
}

dat_error_t decode_base64_url(const char* b64, size_t b64_len, uint8_t** out_data, size_t* out_len) {
    dat_bbuf_t buf;
    size_t est = (b64_len * 3 + 3) / 4 + 1;
    dat_error_t e = bbuf_init(&buf, est);
    if (e) return e;
    e = decode_base64_url_out(b64, b64_len, &buf);
    if (e) { bbuf_free(&buf); return e; }
    *out_len  = buf.len;
    *out_data = bbuf_take(&buf, NULL);
    return DAT_SUCCESS;
}

/* ── to_hex_u64_out ───────────────────────────────────────────────── */

/* Port of Rust's to_hex_u64_out: write digits back-to-front, then shift forward */
void to_hex_u64_out(uint64_t no, dat_sbuf_t* out) {
    static const char HEX_LC[16] = "0123456789abcdef";
    if (no == 0) {
        sbuf_push_char(out, '0');
        return;
    }
    char tmp[16];
    int cursor = 16;
    while (no > 0) {
        tmp[--cursor] = HEX_LC[no & 0xF];
        no >>= 4;
    }
    sbuf_push_bytes(out, tmp + cursor, (size_t)(16 - cursor));
}

/* ── now_unix_timestamp ───────────────────────────────────────────── */

uint64_t now_unix_timestamp(void) {
    return (uint64_t)time(NULL);
}
