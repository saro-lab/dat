use crate::crypto::{DatCrypto, DatCryptoAlgorithm};
use crate::error::DatError;
use crate::signature::{DatSignature, DatSignatureAlgorithm};
use crate::util::{decode_base64_url, encode_base64_url_out, now_unix_timestamp, to_hex_u64_out};
use std::str::FromStr;

pub struct DatCertificate {
    pub cid: u64,
    pub(crate) signature: DatSignature,
    pub(crate) crypto: DatCrypto,
    pub(crate) dat_issuance_start_seconds: u64,
    pub(crate) dat_issuance_end_seconds: u64,
    pub(crate) dat_ttl_seconds: u64,
    pub(crate) expire_seconds: u64,
}

impl DatCertificate {
    pub fn generate(
        cid: u64, dat_issuance_start_seconds: u64, dat_issuance_duration_seconds: u64, dat_ttl_seconds: u64,
        signature_algorithm: DatSignatureAlgorithm,
        crypto_algorithm: DatCryptoAlgorithm
    ) -> Result<Self, DatError> {
        Self::from(
            cid,
            dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
            DatSignature::generate(signature_algorithm)?, DatCrypto::generate(crypto_algorithm)
        )
    }

    pub fn from(
        cid: u64, dat_issuance_start_seconds: u64, dat_issuance_duration_seconds: u64, dat_ttl_seconds: u64,
        signature_key: DatSignature, crypto_key: DatCrypto
    ) -> Result<Self, DatError> {

        let dat_issuance_end_seconds = dat_issuance_start_seconds.checked_add(dat_issuance_duration_seconds)
            .ok_or(DatError::CertificateError("create/from certificate error: issuance_start_seconds + issuance_duration_seconds overflowed u64"))?;

        let expire_seconds = dat_issuance_end_seconds.checked_add(dat_ttl_seconds)
            .ok_or(DatError::CertificateError("create/from certificate error: issuance_start_seconds + issuance_duration_seconds + dat_ttl_seconds overflowed u64"))?;

        Ok(DatCertificate {
            cid,
            signature: signature_key,
            crypto: crypto_key,
            dat_issuance_start_seconds,
            dat_issuance_end_seconds,
            dat_ttl_seconds,
            expire_seconds,
        })
    }

    #[inline]
    pub fn expired(&self) -> bool {
        self.expire_seconds < now_unix_timestamp()
    }

    #[inline]
    pub fn issuable(&self) -> bool {
        self.signable() && (self.dat_issuance_start_seconds..=self.dat_issuance_end_seconds).contains(&now_unix_timestamp())
    }

    #[inline]
    pub fn signable(&self) -> bool {
        self.signature.signable()
    }

    #[inline]
    pub fn support_verify_only(&self) -> bool {
        self.signature.support_verify_only()
    }

    #[inline]
    pub fn signature_algorithm(&self) -> DatSignatureAlgorithm {
        self.signature.algorithm()
    }

    #[inline]
    pub fn crypto_algorithm(&self) -> DatCryptoAlgorithm {
        self.crypto.algorithm()
    }

    pub fn export(&self, verify_only: bool) -> Result<String, DatError> {
        let mut ib = itoa::Buffer::new();
        // cid[16].dat_issuance_start_seconds[20].dat_issuance_duration_seconds[20].dat_ttl_seconds[20].signature.crypto
        // spare size = 4 + 16 + 20  + 20 + 20 = 80
        let mut v: String = String::with_capacity(
            80 +
                self.signature.key_base64_len() + self.crypto.key_base64_len()
        );

        to_hex_u64_out(self.cid, &mut v);
        v.push('.');
        v.push_str(ib.format(self.dat_issuance_start_seconds));
        v.push('.');
        v.push_str(ib.format(self.dat_issuance_end_seconds - self.dat_issuance_start_seconds));
        v.push('.');
        v.push_str(ib.format(self.dat_ttl_seconds));
        v.push('.');
        v.push_str(self.signature.algorithm().as_str());
        v.push('.');
        v.push_str(self.crypto.algorithm().as_str());
        v.push('.');
        encode_base64_url_out(self.signature.export_key_option(verify_only)?, &mut v);
        v.push('.');
        encode_base64_url_out(self.crypto.export_key(), &mut v);

        Ok(v)
    }

    pub fn try_clone(&self) -> Result<Self, DatError> {
        Ok(DatCertificate {
            cid: self.cid,
            signature: self.signature.try_clone()?,
            crypto: self.crypto.clone(),
            dat_issuance_start_seconds: self.dat_issuance_start_seconds,
            dat_issuance_end_seconds: self.dat_issuance_end_seconds,
            dat_ttl_seconds: self.dat_ttl_seconds,
            expire_seconds: self.expire_seconds,
        })
    }
}

impl FromStr for DatCertificate {
    type Err = DatError;
    fn from_str(format: &str) -> Result<Self, Self::Err> {
        let parts = format.split('.').collect::<Vec<&str>>();
        let count = parts.len();
        if count == 8 {
            let cid = u64::from_str_radix(parts[0], 16).map_err(|_| DatError::CertificateError("invalid dat certificate format: cid must hex in u64"))?;
            let dat_issuance_start_seconds = parts[1].parse::<u64>().map_err(|_| DatError::CertificateError("invalid dat certificate format: issuance_start_seconds must u64"))?;
            let dat_issuance_duration_seconds = parts[2].parse::<u64>().map_err(|_| DatError::CertificateError("invalid dat certificate format: issuance_duration_seconds must u64"))?;
            let dat_ttl_seconds = parts[3].parse::<u64>().map_err(|_| DatError::CertificateError("invalid dat certificate format: dat_ttl_seconds must u64"))?;
            let signature_algorithm = DatSignatureAlgorithm::from_str(parts[4])?;
            let crypto_algorithm = DatCryptoAlgorithm::from_str(parts[5])?;
            let signature = DatSignature::from_key(signature_algorithm, &*decode_base64_url(parts[6])?)?;
            let crypto = DatCrypto::from_key(crypto_algorithm, &*decode_base64_url(parts[7])?)?;
            DatCertificate::from(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature, crypto)
        } else {
            Err(DatError::CertificateError("invalid dat certificate format"))
        }
    }
}

impl PartialEq<DatCertificate> for DatCertificate {
    fn eq(&self, other: &DatCertificate) -> bool {
        self.cid.eq(&other.cid)
    }
}

impl PartialEq<u64> for DatCertificate {
    fn eq(&self, other: &u64) -> bool {
        self.cid.eq(other)
    }
}
