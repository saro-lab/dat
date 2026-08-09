use crate::api::{Api, ApiResult};
use crate::codes;
use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct CachedCertificate {
    pub version: i64,
    pub full: String,
    pub verify_only: String,
    pub issuance_start: u64,
    pub issuance_end: u64,
}

impl CachedCertificate {
    pub fn issuable(&self) -> bool {
        let now = now_unix_timestamp();
        self.issuance_start <= now && self.issuance_end > now
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CertificateList {
    pub version: i64,
    pub list: Vec<String>,
}

pub struct ListCertificatesQuery {
    pub version: i64,
    pub verify_only: bool,
}

pub const MAX_SECONDS: i64 = 315_360_000;

#[derive(Clone)]
pub struct RegisterCertificateCommand {
    pub signature_algorithm: String,
    pub crypto_algorithm: String,
    pub certificate_propagation_delay_seconds: i64,
    pub dat_issuance_duration_seconds: i64,
    pub dat_ttl_seconds: i64,
}

impl RegisterCertificateCommand {
    pub fn validate_algorithms(&self) -> ApiResult<()> {
        for (kind, name) in [
            ("signature", &self.signature_algorithm),
            ("crypto", &self.crypto_algorithm),
        ] {
            let known = match kind {
                "signature" => DatSignatureAlgorithm::from_str(name).is_ok(),
                _ => DatCryptoAlgorithm::from_str(name).is_ok(),
            };
            if !known {
                return Err(Api::code(codes::REQ_ALG_UNSUPPORTED)
                    .details(serde_json::json!({ "kind": kind, "algorithm": name }))
                    .into());
            }
        }
        Ok(())
    }

    pub fn validate(&self) -> Result<(), &'static str> {
        if self.certificate_propagation_delay_seconds < 0 {
            return Err("certificate_propagation_delay_seconds must not be negative");
        }
        if self.dat_issuance_duration_seconds <= 0 {
            return Err("dat_issuance_duration_seconds must be positive");
        }
        if self.dat_ttl_seconds <= 0 {
            return Err("dat_ttl_seconds must be positive");
        }
        if self.certificate_propagation_delay_seconds > MAX_SECONDS
            || self.dat_issuance_duration_seconds > MAX_SECONDS
            || self.dat_ttl_seconds > MAX_SECONDS
        {
            return Err("certificate seconds arguments must not exceed 315360000 (10 years)");
        }
        Ok(())
    }
}

impl CertificateList {
    pub fn size(&self) -> usize {
        self.list.len()
    }

    pub fn export(&self, prefix_version: bool) -> String {
        let mut result = String::new();

        if prefix_version {
            result.push_str(self.version.to_string().as_str());
            if !&self.list.is_empty() {
                result.push('\n');
            }
        }

        result.push_str(&self.list.join("\n"));

        result
    }
}
