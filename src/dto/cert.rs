use dat::util::now_unix_timestamp;
use serde::{Deserialize, Serialize};

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

#[derive(Clone)]
pub struct RegisterCertificateCommand {
    pub signature_algorithm: String,
    pub crypto_algorithm: String,
    pub certificate_propagation_delay_seconds: i64,
    pub dat_issuance_duration_seconds: i64,
    pub dat_ttl_seconds: i64,
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
