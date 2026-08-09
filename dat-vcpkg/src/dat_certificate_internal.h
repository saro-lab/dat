#ifndef DAT_CERTIFICATE_INTERNAL_H
#define DAT_CERTIFICATE_INTERNAL_H

#include "../include/dat/dat.h"
#include "dat_signature.h"
#include "dat_crypto.h"

dat_signature_t* dat_certificate_get_signature(const dat_certificate_t* cert);
dat_crypto_t*    dat_certificate_get_crypto(const dat_certificate_t* cert);
uint64_t         dat_certificate_get_ttl(const dat_certificate_t* cert);
uint64_t         dat_certificate_get_end(const dat_certificate_t* cert);

#endif
