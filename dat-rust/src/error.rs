use std::error::Error;
use std::fmt;

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum DatRetry {
    Transient,
    Permanent,
    State,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum DatError {
    TokenMalformed(&'static str),
    TokenExpired,
    TokenUnknown(&'static str),

    CertMalformed(&'static str),
    CertExpired,
    CertNotYetIssuable,
    CertIssuanceEnded,
    CertVerifyOnly,
    CertNotFound,
    CertNotSynced,
    CertDuplicateCid,
    CertUnknown(&'static str),

    SigMismatch,
    SigMalformed(&'static str),
    SigKeyMissing,
    SigBackend(&'static str),
    SigUnknown(&'static str),

    CryptoTagMismatch,
    CryptoDataInvalid(&'static str),
    CryptoBackend(&'static str),
    CryptoUnknown(&'static str),

    KeyInvalid(&'static str),
    KeyVerifyOnlyUnsupported(String),
    KeyUnknown(&'static str),

    ManagerNoCertificate,
    ManagerNoIssuableCertificate(Box<DatError>),
    ManagerDisposed,
    ManagerUnknown(&'static str),

    CmsUnreachable(String),
    CmsUnauthorized,
    CmsForbidden,
    CmsEndpointNotFound,
    CmsServerError(u16),
    CmsHttpStatus(u16),
    CmsMalformed(&'static str),
    CmsImportFailed(Box<DatError>),
    CmsVersionReset,
    CmsNotSynced,
    CmsSyncInProgress,
    CmsNotSupported,
    CmsUnknown(String),

    ConfigAlgUnsupported(String),
    ConfigUriInvalid(&'static str),
    ConfigArgumentInvalid(&'static str),
    ConfigUnknown(&'static str),

    InternalUnavailable(&'static str),
    InternalUnknown(&'static str),
}

impl DatError {
    pub fn code(&self) -> &'static str {
        use DatError::*;
        match self {
            TokenMalformed(_) => "DAT_TOKEN_MALFORMED",
            TokenExpired => "DAT_TOKEN_EXPIRED",
            TokenUnknown(_) => "DAT_TOKEN_UNKNOWN",

            CertMalformed(_) => "DAT_CERT_MALFORMED",
            CertExpired => "DAT_CERT_EXPIRED",
            CertNotYetIssuable => "DAT_CERT_NOT_YET_ISSUABLE",
            CertIssuanceEnded => "DAT_CERT_ISSUANCE_ENDED",
            CertVerifyOnly => "DAT_CERT_VERIFY_ONLY",
            CertNotFound => "DAT_CERT_NOT_FOUND",
            CertNotSynced => "DAT_CERT_NOT_SYNCED",
            CertDuplicateCid => "DAT_CERT_DUPLICATE_CID",
            CertUnknown(_) => "DAT_CERT_UNKNOWN",

            SigMismatch => "DAT_SIG_MISMATCH",
            SigMalformed(_) => "DAT_SIG_MALFORMED",
            SigKeyMissing => "DAT_SIG_KEY_MISSING",
            SigBackend(_) => "DAT_SIG_BACKEND",
            SigUnknown(_) => "DAT_SIG_UNKNOWN",

            CryptoTagMismatch => "DAT_CRYPTO_TAG_MISMATCH",
            CryptoDataInvalid(_) => "DAT_CRYPTO_DATA_INVALID",
            CryptoBackend(_) => "DAT_CRYPTO_BACKEND",
            CryptoUnknown(_) => "DAT_CRYPTO_UNKNOWN",

            KeyInvalid(_) => "DAT_KEY_INVALID",
            KeyVerifyOnlyUnsupported(_) => "DAT_KEY_VERIFY_ONLY_UNSUPPORTED",
            KeyUnknown(_) => "DAT_KEY_UNKNOWN",

            ManagerNoCertificate => "DAT_MANAGER_NO_CERTIFICATE",
            ManagerNoIssuableCertificate(_) => "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE",
            ManagerDisposed => "DAT_MANAGER_DISPOSED",
            ManagerUnknown(_) => "DAT_MANAGER_UNKNOWN",

            CmsUnreachable(_) => "DAT_CMS_UNREACHABLE",
            CmsUnauthorized => "DAT_CMS_UNAUTHORIZED",
            CmsForbidden => "DAT_CMS_FORBIDDEN",
            CmsEndpointNotFound => "DAT_CMS_ENDPOINT_NOT_FOUND",
            CmsServerError(_) => "DAT_CMS_SERVER_ERROR",
            CmsHttpStatus(_) => "DAT_CMS_HTTP_STATUS",
            CmsMalformed(_) => "DAT_CMS_MALFORMED",
            CmsImportFailed(_) => "DAT_CMS_IMPORT_FAILED",
            CmsVersionReset => "DAT_CMS_VERSION_RESET",
            CmsNotSynced => "DAT_CMS_NOT_SYNCED",
            CmsSyncInProgress => "DAT_CMS_SYNC_IN_PROGRESS",
            CmsNotSupported => "DAT_CMS_NOT_SUPPORTED",
            CmsUnknown(_) => "DAT_CMS_UNKNOWN",

            ConfigAlgUnsupported(_) => "DAT_CONFIG_ALG_UNSUPPORTED",
            ConfigUriInvalid(_) => "DAT_CONFIG_URI_INVALID",
            ConfigArgumentInvalid(_) => "DAT_CONFIG_ARGUMENT_INVALID",
            ConfigUnknown(_) => "DAT_CONFIG_UNKNOWN",

            InternalUnavailable(_) => "DAT_INTERNAL_UNAVAILABLE",
            InternalUnknown(_) => "DAT_INTERNAL_UNKNOWN",
        }
    }

    pub fn retry(&self) -> DatRetry {
        use DatError::*;
        match self {
            CertNotYetIssuable | CertNotSynced | ManagerNoCertificate | CmsUnreachable(_)
            | CmsServerError(_) | CmsNotSynced => DatRetry::Transient,

            CmsVersionReset | CmsSyncInProgress => DatRetry::State,

            ManagerNoIssuableCertificate(cause) => match **cause {
                CertNotYetIssuable => DatRetry::Transient,
                _ => DatRetry::Permanent,
            },

            _ => DatRetry::Permanent,
        }
    }

    #[inline]
    pub fn security_event(&self) -> bool {
        matches!(self, DatError::SigMismatch | DatError::CryptoTagMismatch)
    }

    pub fn cause(&self) -> Option<&DatError> {
        match self {
            DatError::ManagerNoIssuableCertificate(c) | DatError::CmsImportFailed(c) => Some(c),
            _ => None,
        }
    }
}

impl fmt::Display for DatError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use DatError::*;
        f.write_str(self.code())?;
        match self {
            TokenMalformed(d) | TokenUnknown(d) | CertMalformed(d) | CertUnknown(d)
            | SigMalformed(d) | SigBackend(d) | SigUnknown(d) | CryptoDataInvalid(d)
            | CryptoBackend(d) | CryptoUnknown(d) | KeyInvalid(d) | KeyUnknown(d)
            | ManagerUnknown(d) | CmsMalformed(d) | ConfigUriInvalid(d)
            | ConfigArgumentInvalid(d) | ConfigUnknown(d) | InternalUnavailable(d)
            | InternalUnknown(d) => write!(f, ": {d}"),

            KeyVerifyOnlyUnsupported(s) | CmsUnreachable(s) | CmsUnknown(s)
            | ConfigAlgUnsupported(s) => write!(f, ": {s}"),

            CmsServerError(s) | CmsHttpStatus(s) => write!(f, ": http {s}"),

            ManagerNoIssuableCertificate(c) | CmsImportFailed(c) => write!(f, ": {c}"),

            _ => Ok(()),
        }
    }
}

impl Error for DatError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.cause().map(|c| c as &(dyn Error + 'static))
    }
}

impl From<std::convert::Infallible> for DatError {
    fn from(_: std::convert::Infallible) -> Self {
        DatError::InternalUnknown("unreachable: infallible conversion failed")
    }
}
