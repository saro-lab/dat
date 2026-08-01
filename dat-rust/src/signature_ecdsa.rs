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
        _ => return Err(DatError::ConfigAlgUnsupported(format!("not an ecdsa signature algorithm: {algorithm}"))),
    })
}

pub(crate) fn from_or_new_ecdsa(new: bool, algorithm: DatSignatureAlgorithm, key: &[u8]) -> Result<DatSignature, DatError> {
    let (sa, va) = match algorithm {
        EcdsaP256 => &(ECDSA_P256_SHA256_FIXED_SIGNING, ECDSA_P256_SHA256_FIXED),
        EcdsaP384 => &(ECDSA_P384_SHA384_FIXED_SIGNING, ECDSA_P384_SHA384_FIXED),
        EcdsaP521 => &(ECDSA_P521_SHA512_FIXED_SIGNING, ECDSA_P521_SHA512_FIXED),
        _ => return Err(DatError::ConfigAlgUnsupported(format!("not an ecdsa signature algorithm: {algorithm}"))),
    };
    let (_, private_len, public_len) = ecdsa_info(algorithm)?;

    let (key_pair, public_key) = if new {
        let key_pair = EcdsaKeyPair::generate(sa)
            .map_err(|_| DatError::InternalUnknown("ecdsa key generation failed"))?;
        let public_key = UnparsedPublicKey::new(va, Vec::from(key_pair.public_key().as_ref()));
        (Some(key_pair), public_key)
    } else if key.len() == private_len + public_len {
        // 여기서 거부되는 것은 길이가 아니라 재료다 — 곡선 위에 없는 점,
        // d 가 [1,n-1] 밖, 개인키·공개키 쌍 불일치.
        let key_pair = EcdsaKeyPair::from_private_key_and_public_key(sa, &key[..private_len], &key[private_len..])
            .map_err(|_| DatError::KeyInvalid("ecdsa private/public key material rejected"))?;
        let public_key = UnparsedPublicKey::new(va, Vec::from(key_pair.public_key().as_ref()));
        (Some(key_pair), public_key)
    } else if key.len() == public_len {
        (None, UnparsedPublicKey::new(va, Vec::from(key)))
    } else {
        return Err(DatError::KeyInvalid("ecdsa key length matches neither private+public nor public"))
    };

    Ok(Ecdsa(algorithm, key_pair, public_key))
}

pub(crate) fn export_key_ecdsa(algorithm: DatSignatureAlgorithm, key_pair: &Option<EcdsaKeyPair>, public_key: &UnparsedPublicKey<Vec<u8>>, verifying_only: bool) -> Result<Vec<u8>, DatError> {
    if !verifying_only && let Some(key_pair) = key_pair {
        let (offset_pkcs8v1, private_len, public_len) = ecdsa_info(algorithm)?;
        let mut key = Vec::with_capacity(public_len + private_len);
        let pkcs8v1 = key_pair.to_pkcs8v1()
            .map_err(|_| DatError::SigBackend("ecdsa pkcs8v1 export failed"))?;
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
        .ok_or(DatError::SigKeyMissing)?
        .sign(&aws_lc_rs::rand::SystemRandom::new(), data)
        .map_err(|_| DatError::SigBackend("ecdsa sign failed"))?;
    Ok(Box::from(signature.as_ref()))
}


pub(crate) fn verify_ecdsa(public_key: &UnparsedPublicKey<Vec<u8>>, body: &[u8], sign: &[u8]) -> Result<(), DatError> {
    // aws-lc-rs 는 위조와 내부 오류를 같은 Unspecified 로 돌려주므로 더 나눌 수 없다.
    // 보수적으로 불일치(보안 이벤트)로 본다 — 반대로 두면 위조가 묻힌다.
    public_key.verify(body, sign).map_err(|_| DatError::SigMismatch)
}
