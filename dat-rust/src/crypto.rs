use crate::crypto::DatCryptoAlgorithm::{IvAes128Gcm, IvAes256Gcm};
use crate::error::DatError;
use aes_gcm::aead::array::Array;
use aes_gcm::aead::common::Generate;
use aes_gcm::aead::consts::{U12, U16, U32};
use aes_gcm::aead::inout::InOutBuf;
use aes_gcm::{AeadInOut, AesGcm, Key, KeyInit, Nonce};
use std::fmt::Display;
use std::str::FromStr;
use zeroize::Zeroize;

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum DatCryptoAlgorithm {
    IvAes128Gcm,
    IvAes256Gcm,
}

impl DatCryptoAlgorithm {
    #[inline]
    pub fn list() -> &'static [DatCryptoAlgorithm] {
        &[IvAes128Gcm, IvAes256Gcm]
    }
    #[inline]
    pub fn as_str(&self) -> &'static str {
        match self {
            IvAes128Gcm => "IV-AES128-GCM",
            IvAes256Gcm => "IV-AES256-GCM",
        }
    }
}

const IV_LEN: usize = 12;
const TAG_LEN: usize = 16;

impl FromStr for DatCryptoAlgorithm {
    type Err = DatError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "IV-AES128-GCM" => Ok(IvAes128Gcm),
            "IV-AES256-GCM" => Ok(IvAes256Gcm),
            _ => Err(DatError::ConfigAlgUnsupported(format!("unknown crypto algorithm: {s}"))),
        }
    }
}

impl Display for DatCryptoAlgorithm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Clone)]
pub enum DatCrypto {
    IvAes128Gcm(AesGcm<aes_gcm::aes::Aes128, U12>, Array<u8, U16>),
    IvAes256Gcm(AesGcm<aes_gcm::aes::Aes256, U12>, Array<u8, U32>),
}

impl DatCrypto {
    pub fn generate(algorithm: DatCryptoAlgorithm) -> Self {
        match algorithm {
            IvAes128Gcm => {
                let key = Key::<aes_gcm::aes::Aes128>::generate();
                let cipher = AesGcm::<aes_gcm::aes::Aes128, U12>::new(&key);
                Self::IvAes128Gcm(cipher, key)
            }
            IvAes256Gcm => {
                let key = Key::<aes_gcm::aes::Aes256>::generate();
                let cipher = AesGcm::<aes_gcm::aes::Aes256, U12>::new(&key);
                Self::IvAes256Gcm(cipher, key)
            }
        }
    }

    pub fn from_key(algorithm: DatCryptoAlgorithm, key: &[u8]) -> Result<Self, DatError> {
        match algorithm {
            IvAes128Gcm => {
                let key = Key::<aes_gcm::aes::Aes128>::try_from(key)
                    .map_err(|_| DatError::KeyInvalid("IV-AES128-GCM key must be 16 bytes"))?;
                let cipher = AesGcm::<aes_gcm::aes::Aes128, U12>::new(&key);

                Ok(Self::IvAes128Gcm(cipher, key))
            }
            IvAes256Gcm => {
                let key = Key::<aes_gcm::aes::Aes256>::try_from(key)
                    .map_err(|_| DatError::KeyInvalid("IV-AES256-GCM key must be 32 bytes"))?;
                let cipher = AesGcm::<aes_gcm::aes::Aes256, U12>::new(&key);

                Ok(Self::IvAes256Gcm(cipher, key))
            }
        }
    }

    #[inline]
    pub fn algorithm(&self) -> DatCryptoAlgorithm {
        match self {
            Self::IvAes128Gcm(_, _) => IvAes128Gcm,
            Self::IvAes256Gcm(_, _) => IvAes256Gcm,
        }
    }

    pub fn export_key(&self) -> Box<[u8]> {
        match self {
            Self::IvAes128Gcm(_, key) => Box::from(key.as_slice()),
            Self::IvAes256Gcm(_, key) => Box::from(key.as_slice()),
        }
    }

    #[inline]
    pub fn key_base64_len(&self) -> usize {
        match self {
            Self::IvAes128Gcm(_, _) => 22,
            Self::IvAes256Gcm(_, _) => 43,
        }
    }

    pub fn encrypt(&self, body: &[u8]) -> Result<Vec<u8>, DatError> {
        if body.is_empty() {
            return Ok(vec![]);
        }
        let iv: Array<u8, U12> = Nonce::generate();
        let mut enc_data = Vec::with_capacity(IV_LEN + body.len() + TAG_LEN);
        enc_data.extend_from_slice(&iv);
        enc_data.extend_from_slice(body);

        let inout = InOutBuf::from(&mut enc_data[IV_LEN..]);

        let tag = match self {
            Self::IvAes128Gcm(cipher, _) => cipher.encrypt_inout_detached(&iv, &[], inout),
            Self::IvAes256Gcm(cipher, _) => cipher.encrypt_inout_detached(&iv, &[], inout),
        }.map_err(|_| DatError::CryptoBackend("aes-gcm encrypt failed"))?;

        enc_data.extend_from_slice(&tag.as_slice());

        Ok(enc_data)
    }

    pub fn decrypt(&self, mut data: Vec<u8>) -> Result<Vec<u8>, DatError> {
        if data.is_empty() {
            return Ok(Vec::with_capacity(0));
        }
        if data.len() <= IV_LEN {
            return Err(DatError::CryptoDataInvalid("ciphertext is shorter than the 12-byte iv"));
        }
        let mut secure = data.split_off(IV_LEN);

        // 여기서 나는 실패는 GCM 인증 태그 불일치다 — 변조된 secure 이거나 잘못된
        // 인증서 키다. parse_without_verify 경로에서는 이것이 유일한 무결성 검사이므로
        // 백엔드 오류(CryptoBackend)와 반드시 구분한다.
        match self {
            Self::IvAes128Gcm(cipher, _) => {
                AeadInOut::decrypt_in_place(cipher, data.as_slice().try_into()
                    .map_err(|_| DatError::CryptoDataInvalid("iv must be exactly 12 bytes"))?, &[], &mut secure)
            },
            Self::IvAes256Gcm(cipher, _) => {
                AeadInOut::decrypt_in_place(cipher, data.as_slice().try_into()
                    .map_err(|_| DatError::CryptoDataInvalid("iv must be exactly 12 bytes"))?, &[], &mut secure)
            },
        }.map_err(|_| DatError::CryptoTagMismatch)?;

        Ok(secure)
    }
}

/// 키 재료를 소거한 뒤 해제한다.
/// drop 시점에만 동작하므로 encrypt/decrypt 핫패스에는 어떤 비용도 추가되지 않는다.
/// AES 확장 라운드 키(cipher 내부)는 aes/aes-gcm 의 `zeroize` feature 가 담당한다.
impl Drop for DatCrypto {
    fn drop(&mut self) {
        match self {
            Self::IvAes128Gcm(_, key) => key.as_mut_slice().zeroize(),
            Self::IvAes256Gcm(_, key) => key.as_mut_slice().zeroize(),
        }
    }
}

