#ifndef DAT_CRYPTO_H
#define DAT_CRYPTO_H

#include "../include/dat/dat.h"
#include "dat_util.h"

#define DAT_CRYPTO_IV_LEN  12
#define DAT_CRYPTO_TAG_LEN 16

struct dat_crypto {
    dat_crypto_alg_t alg;
    uint8_t key[32];
    size_t  key_len;
};

/* Internal: encrypt data into an existing bbuf (no extra alloc). */
dat_error_t dat_crypto_encrypt_to_bbuf(const dat_crypto_t* crypto,
                                       const uint8_t* data, size_t data_len,
                                       dat_bbuf_t* out);

#endif /* DAT_CRYPTO_H */
