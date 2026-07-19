use crate::error::DatError;
use crate::signature::DatSignature::HmacShaMfs;
use crate::signature::{DatSignature, DatSignatureAlgorithm};
use aws_lc_rs::hmac;
use aws_lc_rs::hmac::{Key, HMAC_SHA256, HMAC_SHA384, HMAC_SHA512};
use DatSignatureAlgorithm::*;

pub(crate) fn from_or_new_hmac(new: bool, algorithm: DatSignatureAlgorithm, key_b: &[u8]) -> Result<DatSignature, DatError> {
    let (alg, size) = match algorithm {
        HmacSha256Mfs => (&HMAC_SHA256, 32),
        HmacSha384Mfs => (&HMAC_SHA384, 48),
        HmacSha512Mfs => (&HMAC_SHA512, 64),
        _ => return Err(DatError::AlgorithmError("unsupported hmac signature algorithm.", algorithm.to_string())),
    };

    let (key, key_b) = if new {
        let mut key_b = vec![0u8; size];
        aws_lc_rs::rand::fill(&mut key_b)?;
        let key = Key::new(*alg, &key_b);
        (key, key_b)
    } else if key_b.len() == size {
        let key = Key::new(*alg, &key_b);
        (key, Vec::from(key_b))
    } else {
        return Err(DatError::SignatureError("invalid hmac signature key length"))
    };

    Ok(HmacShaMfs(algorithm, key, key_b))
}

pub(crate) fn sign_hmac(key: &Key, data: &[u8]) -> Result<Box<[u8]>, DatError> {
    Ok(Box::from(hmac::sign(key, data).as_ref()))
}

pub(crate) fn verify_hmac(key: &Key, body: &[u8], sign: &[u8]) -> Result<(), DatError> {
    hmac::verify(key, body, sign)
        .map_err(|_| DatError::InvalidDat)
}
