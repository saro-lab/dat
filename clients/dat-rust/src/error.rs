use std::str::Utf8Error;
use aes_gcm::aead;
use base64::DecodeError;
use std::string::FromUtf8Error;
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum DatError {
    #[error("{0}")]
    CertificateError(&'static str),

    #[error("{0}: {1}")]
    AlgorithmError(&'static str, String),

    #[error("{0}")]
    CryptoError(&'static str),

    #[error("{0}")]
    ManagerError(&'static str),

    #[error("{0}")]
    CryptoAeadError(#[from] aead::Error),

    #[error("{0}")]
    SignatureError(&'static str),

    #[error("{0}")]
    EtcError(&'static str),

    // util
    #[error("base64 decode error: {0}")]
    Base64DecodeError(#[from] DecodeError),

    #[error("encode utf8 error: {0}")]
    FromUtf8Error(#[from] FromUtf8Error),
    
    #[error("utf8 error: {0}")]
    Utf8Error(#[from] Utf8Error),

    #[error("aws_lc_rs error: {0}")]
    AwsUnspecifiedError(#[from] aws_lc_rs::error::Unspecified),

    #[error("aws_lc_rs error: {0}")]
    AwsKeyRejected(#[from] aws_lc_rs::error::KeyRejected),

    // Dat
    #[error("invalid dat")]
    InvalidDat,
}
