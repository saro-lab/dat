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
        self.issuable_at(now_unix_timestamp())
    }

    fn issuable_at(&self, now: u64) -> bool {
        self.issuance_start <= now && now <= self.issuance_end
    }
}

#[cfg(test)]
mod export_tests {
    use super::*;

    fn certificate(start: u64, end: u64) -> CachedCertificate {
        CachedCertificate {
            version: 1,
            full: String::new(),
            verify_only: String::new(),
            issuance_start: start,
            issuance_end: end,
        }
    }

    #[test]
    fn issuance_window_includes_both_boundaries() {
        let cert = certificate(100, 200);
        assert!(!cert.issuable_at(99));
        assert!(cert.issuable_at(100));
        assert!(cert.issuable_at(200));
        assert!(!cert.issuable_at(201));
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
        let certificate_bytes = self.list.iter().map(String::len).sum::<usize>();
        let separators = self.list.len().saturating_sub(1);
        let version_bytes = if prefix_version {
            self.version.to_string().len()
        } else {
            0
        };
        let newline_after_version = prefix_version && !self.list.is_empty();
        let mut result = String::with_capacity(
            version_bytes + certificate_bytes + separators + usize::from(newline_after_version),
        );

        if prefix_version {
            result.push_str(&self.version.to_string());
            if newline_after_version {
                result.push('\n');
            }
        }

        for (index, certificate) in self.list.iter().enumerate() {
            if index != 0 {
                result.push('\n');
            }
            result.push_str(certificate);
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::CertificateList;

    #[test]
    fn plaintext_export_preserves_response_bytes() {
        let list = CertificateList {
            version: 42,
            list: vec!["a.cert".to_string(), "b.cert".to_string()],
        };

        assert_eq!(list.export(true), "42\na.cert\nb.cert");
        assert_eq!(list.export(false), "a.cert\nb.cert");
        assert_eq!(
            CertificateList {
                version: 42,
                list: Vec::new(),
            }
            .export(true),
            "42"
        );
    }
}
