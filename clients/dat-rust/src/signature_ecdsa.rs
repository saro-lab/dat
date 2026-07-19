use crate::error::DatError;
use crate::signature::{DatSignature, DatSignatureAlgorithm};
use aws_lc_rs::signature::{EcdsaKeyPair, KeyPair, UnparsedPublicKey, ECDSA_P256_SHA256_FIXED, ECDSA_P256_SHA256_FIXED_SIGNING, ECDSA_P384_SHA384_FIXED, ECDSA_P384_SHA384_FIXED_SIGNING, ECDSA_P521_SHA512_FIXED, ECDSA_P521_SHA512_FIXED_SIGNING};

use crate::signature::DatSignature::Ecdsa;
use DatSignatureAlgorithm::*;

type OffsetPkcs8v1 = usize;
type PrivateLen = usize;
type PublicLen = usize;

fn ecdsa_info(algorithm: DatSignatureAlgorithm) -> Result<(OffsetPkcs8v1, PrivateLen, PublicLen), DatError> {
    Ok(match algorithm {
        EcdsaP256 => (36, 32, 65),
        EcdsaP384 => (35, 48, 97),
        EcdsaP521 => (35, 66, 133),
        _ => return Err(DatError::AlgorithmError("unsupported ecdsa signature algorithm.", algorithm.to_string())),
    })
}

pub(crate) fn from_or_new_ecdsa(new: bool, algorithm: DatSignatureAlgorithm, key: &[u8]) -> Result<DatSignature, DatError> {
    let (sa, va) = match algorithm {
        EcdsaP256 => &(ECDSA_P256_SHA256_FIXED_SIGNING, ECDSA_P256_SHA256_FIXED),
        EcdsaP384 => &(ECDSA_P384_SHA384_FIXED_SIGNING, ECDSA_P384_SHA384_FIXED),
        EcdsaP521 => &(ECDSA_P521_SHA512_FIXED_SIGNING, ECDSA_P521_SHA512_FIXED),
        _ => return Err(DatError::AlgorithmError("unsupported ecdsa signature algorithm.", algorithm.to_string())),
    };
    let (_, private_len, public_len) = ecdsa_info(algorithm)?;

    let (key_pair, public_key) = if new {
        let key_pair = EcdsaKeyPair::generate(sa)?;
        let public_key = UnparsedPublicKey::new(va, Vec::from(key_pair.public_key().as_ref()));
        (Some(key_pair), public_key)
    } else if key.len() == private_len + public_len {
        let key_pair = EcdsaKeyPair::from_private_key_and_public_key(sa, &key[..private_len], &key[private_len..])?;
        let public_key = UnparsedPublicKey::new(va, Vec::from(key_pair.public_key().as_ref()));
        (Some(key_pair), public_key)
    } else if key.len() == public_len {
        (None, UnparsedPublicKey::new(va, Vec::from(key)))
    } else {
        return Err(DatError::SignatureError("invalid ecdsa signature key length"))
    };

    Ok(Ecdsa(algorithm, key_pair, public_key))
}

pub(crate) fn export_key_ecdsa(algorithm: DatSignatureAlgorithm, key_pair: &Option<EcdsaKeyPair>, public_key: &UnparsedPublicKey<Vec<u8>>, verifying_only: bool) -> Result<Vec<u8>, DatError> {
    if !verifying_only && let Some(key_pair) = key_pair {
        let (offset_pkcs8v1, private_len, public_len) = ecdsa_info(algorithm)?;
        let mut key = Vec::with_capacity(public_len + private_len);
        let pkcs8v1 = key_pair.to_pkcs8v1()?;
        let pkcs8v1 = pkcs8v1.as_ref();
        key.extend_from_slice(&pkcs8v1[offset_pkcs8v1..offset_pkcs8v1 + private_len]);
        key.extend_from_slice(&pkcs8v1[pkcs8v1.len() - public_len..]);
        Ok(key)
    } else {
        Ok(public_key.as_ref().to_vec())
    }
}

pub(crate) fn sign_ecdsa(key_pair: &Option<EcdsaKeyPair>, data: &[u8]) -> Result<Box<[u8]>, DatError> {
    let signature = key_pair
        .as_ref()
        .ok_or_else(|| DatError::SignatureError("not exists signing key: this ecdsa signature key is verifying only"))?
        .sign(&aws_lc_rs::rand::SystemRandom::new(), data)?;
    Ok(Box::from(signature.as_ref()))
}


pub(crate) fn verify_ecdsa(public_key: &UnparsedPublicKey<Vec<u8>>, body: &[u8], sign: &[u8]) -> Result<(), DatError> {
    public_key.verify(body, sign).map_err(|_| DatError::InvalidDat)
}
