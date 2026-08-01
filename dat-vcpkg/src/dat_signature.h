#ifndef DAT_SIGNATURE_H
#define DAT_SIGNATURE_H

#include "../include/dat/dat.h"
#include "dat_util.h"

#define DAT_SIG_ECDSA_PRIV_MAX 66
#define DAT_SIG_ECDSA_PUB_MAX  133

typedef enum {
    DAT_SIG_FAMILY_ECDSA,
    DAT_SIG_FAMILY_HMAC
} dat_sig_family_t;

/* EVP_PKEY, forward declared so this internal header stays OpenSSL-free. */
struct evp_pkey_st;

struct dat_signature {
    dat_signature_alg_t alg;
    dat_sig_family_t    family;
    union {
        struct {
            uint8_t priv_bytes[DAT_SIG_ECDSA_PRIV_MAX];
            size_t  priv_len;
            uint8_t pub_bytes[DAT_SIG_ECDSA_PUB_MAX];
            size_t  pub_len;
            int     has_private;
            /* Built once at construction and then only read, so sign/verify do
             * not rebuild the key on every call. Immutable + provider-native,
             * which is what makes concurrent use from several threads safe. */
            struct evp_pkey_st* pkey;
        } ecdsa;
        struct {
            uint8_t key[64];
            size_t  key_len;
        } hmac;
    };
};

#endif /* DAT_SIGNATURE_H */
