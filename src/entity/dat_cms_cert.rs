use crate::api::ApiResult;
use crate::dto::cert::CachedCertificate;
use dat::certificate::DatCertificate;
use dat::crypto::{DatCrypto, DatCryptoAlgorithm};
use dat::error::DatError;
use dat::signature::{DatSignature, DatSignatureAlgorithm};
use sea_orm::entity::prelude::*;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::sea_query::StringLen;
use sea_orm::{ActiveModelBehavior, Set};
use serde::{Deserialize, Serialize};

// https://www.sea-ql.org/SeaORM/docs/generate-entity/column-types/
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "z_saro_dat_cms_cert_v4")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[sea_orm(column_type = "BigInteger")]
    pub ver: i64,

    #[sea_orm(unique)]
    #[sea_orm(column_type = "BigInteger")]
    pub cid: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub issuance_start: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub issuance_duration: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub dat_ttl: i64,

    #[sea_orm(indexed)]
    #[sea_orm(column_type = "BigInteger")]
    pub expire: i64,

    #[sea_orm(column_type = "String(StringLen::N(100))")]
    pub signature_algorithm: String,

    #[sea_orm(column_type = "String(StringLen::N(100))")]
    pub crypto_algorithm: String,

    pub signature_key: Vec<u8>,

    pub crypto_key: Vec<u8>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl Model {
    pub fn serialize_certificate(&self) -> ApiResult<CachedCertificate> {
        let signature_algorithm = self.signature_algorithm.parse::<DatSignatureAlgorithm>()?;
        let signature_key = DatSignature::from_key(signature_algorithm, &self.signature_key)?;
        let crypto_algorithm = self.crypto_algorithm.parse::<DatCryptoAlgorithm>()?;
        let crypto_key = DatCrypto::from_key(crypto_algorithm, &self.crypto_key)?;
        let certificate = DatCertificate::from(
            self.cid as u64,
            self.issuance_start as u64,
            self.issuance_duration as u64,
            self.dat_ttl as u64,
            signature_key,
            crypto_key,
        )?;
        Ok(CachedCertificate {
            version: self.ver,
            full: certificate.export(false)?,
            verify_only: if certificate.support_verify_only() { certificate.export(true)? } else { "".to_string() },
            issuance_start: self.issuance_start as u64,
            issuance_end: self.issuance_start as u64 + self.issuance_duration as u64,
        })
    }
}

impl ActiveModel {
    pub fn generate(cid: i64, issuance_start: i64, issuance_duration: i64, dat_ttl: i64, signature_algorithm: DatSignatureAlgorithm, crypto_algorithm: DatCryptoAlgorithm) -> Result<Self, DatError> {
        let signature_key = DatSignature::generate(signature_algorithm)?.export_key()?;
        let crypto_key = DatCrypto::generate(crypto_algorithm).export_key().to_vec();

        Ok(ActiveModel {
            cid: Set(cid),
            signature_algorithm: Set(signature_algorithm.to_string()),
            signature_key: Set(signature_key),
            crypto_algorithm: Set(crypto_algorithm.to_string()),
            crypto_key: Set(crypto_key),
            issuance_start: Set(issuance_start),
            issuance_duration: Set(issuance_duration),
            dat_ttl: Set(dat_ttl),
            expire: Set(issuance_start + issuance_duration),
            ..Default::default()
        })
    }
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
}
