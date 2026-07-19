use crate::error::DatError;
use crate::signature::DatSignature::{Ecdsa, HmacShaMfs};
use crate::signature::DatSignatureAlgorithm::{EcdsaP256, EcdsaP384, EcdsaP521, HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs};
use crate::signature_ecdsa::{export_key_ecdsa, from_or_new_ecdsa, sign_ecdsa, verify_ecdsa};
use crate::signature_hmac::{from_or_new_hmac, sign_hmac, verify_hmac};
use aws_lc_rs::hmac::Key;
use aws_lc_rs::signature::{EcdsaKeyPair, UnparsedPublicKey};
use std::fmt::Display;
use std::str::FromStr;

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum DatSignatureAlgorithm {
    // MMAC SHA + MFS = Maximum(Same Bit) Fixed Secret
    HmacSha256Mfs,
    HmacSha384Mfs,
    HmacSha512Mfs,
    // ECDSA = Elliptic Curve Digital Signature Algorithm
    EcdsaP256,
    EcdsaP384,
    EcdsaP521,
}

impl DatSignatureAlgorithm {
    #[inline]
    pub fn list() -> &'static [DatSignatureAlgorithm] {
        &[HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs, EcdsaP256, EcdsaP384, EcdsaP521]
    }

    #[inline]
    pub fn as_str(&self) -> &'static str {
        match self {
            HmacSha256Mfs => "HMAC-SHA256-MFS",
            HmacSha384Mfs => "HMAC-SHA384-MFS",
            HmacSha512Mfs => "HMAC-SHA512-MFS",
            EcdsaP256 => "ECDSA-P256",
            EcdsaP384 => "ECDSA-P384",
            EcdsaP521 => "ECDSA-P521",
        }
    }
}

impl FromStr for DatSignatureAlgorithm {
    type Err = DatError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "HMAC-SHA256-MFS" => Ok(HmacSha256Mfs),
            "HMAC-SHA384-MFS" => Ok(HmacSha384Mfs),
            "HMAC-SHA512-MFS" => Ok(HmacSha512Mfs),
            "ECDSA-P256" => Ok(EcdsaP256),
            "ECDSA-P384" => Ok(EcdsaP384),
            "ECDSA-P521" => Ok(EcdsaP521),
            _ => Err(DatError::AlgorithmError("unknown signature algorithm", s.to_string())),
        }
    }
}

impl Display for DatSignatureAlgorithm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

pub enum DatSignature {
    Ecdsa(DatSignatureAlgorithm, Option<EcdsaKeyPair>, UnparsedPublicKey<Vec<u8>>),
    HmacShaMfs(DatSignatureAlgorithm, Key, Vec<u8>),
}

impl DatSignature {
    pub fn generate(algorithm: DatSignatureAlgorithm) -> Result<Self, DatError> {
        Self::from_or_new(true, algorithm, &[])
    }

    pub fn from_key(algorithm: DatSignatureAlgorithm, key: &[u8]) -> Result<DatSignature, DatError> {
        Self::from_or_new(false, algorithm, key)
    }
    fn from_or_new(new: bool, algorithm: DatSignatureAlgorithm, key: &[u8]) -> Result<DatSignature, DatError> {
        match algorithm {
            EcdsaP256 | EcdsaP384 | EcdsaP521 => from_or_new_ecdsa(new, algorithm, key),
            HmacSha256Mfs | HmacSha384Mfs | HmacSha512Mfs => from_or_new_hmac(new, algorithm, key),
        }
    }

    #[inline]
    pub fn algorithm(&self) -> DatSignatureAlgorithm {
        match self {
            Ecdsa(alg, _, _) => *alg,
            HmacShaMfs(alg, _, _) => *alg,
        }
    }

    pub fn key_base64_len(&self) -> usize {
        match self.algorithm() {
            HmacSha256Mfs => 43,
            HmacSha384Mfs => 64,
            HmacSha512Mfs => 86,
            EcdsaP256 => 130,
            EcdsaP384 => 194,
            EcdsaP521 => 266,
        }
    }

    #[inline]
    pub fn export_key(&self) -> Result<Vec<u8>, DatError> {
        self.export_key_option(false)
    }

    #[inline]
    pub fn export_verify_only_key(&self) -> Result<Vec<u8>, DatError> {
        self.export_key_option(true)
    }

    #[inline]
    pub fn export_key_option(&self, verify_only: bool) -> Result<Vec<u8>, DatError> {
        if verify_only && !self.support_verify_only() {
            return Err(DatError::AlgorithmError("this algorithm does not support verify only", self.algorithm().to_string()));
        }
        match self {
            Ecdsa(alg, kp, pk) => export_key_ecdsa(*alg, kp, pk, verify_only),
            HmacShaMfs(_, _, key_b) => Ok(key_b.clone()),
        }
    }

    pub fn sign(&self, data: &[u8]) -> Result<Box<[u8]>, DatError> {
        match self {
            Ecdsa(_, key_pair, _) => sign_ecdsa(key_pair, data),
            HmacShaMfs(_, key, _) => sign_hmac(key, data),
        }
    }

    pub fn verify(&self, body: &[u8], sign: &[u8]) -> Result<(), DatError> {
        if sign.is_empty() {
            return Err(DatError::InvalidDat);
        }
        match self {
            Ecdsa(_, _, public_key) => verify_ecdsa(public_key, body, sign),
            HmacShaMfs(_, key, _) => verify_hmac(key, body, sign),
        }
    }

    #[inline]
    pub fn signable(&self) -> bool {
        match self {
            Ecdsa(_, key_pair, _) => key_pair.is_some(),
            HmacShaMfs(_, _, _) => true,
        }
    }

    #[inline]
    pub fn support_verify_only(&self) -> bool {
        match self {
            Ecdsa(_, _, _) => true,
            HmacShaMfs(_, _, _) => false,
        }
    }

    pub fn try_clone(&self) -> Result<Self, DatError> {
        Self::from_or_new(false, self.algorithm(), &self.export_key_option(!self.signable())?)
    }
}
