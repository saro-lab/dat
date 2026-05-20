use crate::middleware::error::ApiResult;
use dat::certificate::DatCertificate;
use dat::crypto::{DatCryptoAlgorithm, DatCryptoKey};
use dat::error::DatError;
use dat::signature::{DatSignatureAlgorithm, DatSignatureKey};
use sea_orm::entity::prelude::*;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::sea_query::prelude::rust_decimal::prelude::ToPrimitive;
use sea_orm::sea_query::StringLen;
use sea_orm::{ActiveModelBehavior, Set};
use serde::{Deserialize, Serialize};

// https://www.sea-ql.org/SeaORM/docs/generate-entity/column-types/
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "z_saro_dat_certificate_v3")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[sea_orm(column_type = "BigInteger")]
    pub cid: i64,

    #[sea_orm(column_type = "String(StringLen::N(100))")]
    pub signature_algorithm: String,

    pub signing_key: Vec<u8>,

    pub verifying_key: Vec<u8>,

    #[sea_orm(column_type = "String(StringLen::N(100))")]
    pub crypto_algorithm: String,

    pub crypto_key: Vec<u8>,

    #[sea_orm(column_type = "BigInteger")]
    pub dat_issue_begin_time: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub dat_issue_end_time: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub dat_ttl: i64,

    #[sea_orm(column_type = "BigInteger")]
    pub expire_time: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl Model {
    pub fn to_certificate(&self) -> ApiResult<DatCertificate> {
        let signature_algorithm = self.signature_algorithm.parse::<DatSignatureAlgorithm>()?;
        let signature_key = DatSignatureKey::from_bytes(signature_algorithm, &self.signing_key, &self.verifying_key)?;
        let crypto_algorithm = self.crypto_algorithm.parse::<DatCryptoAlgorithm>()?;
        let crypto_key = DatCryptoKey::from_bytes(crypto_algorithm, &self.crypto_key)?;
        Ok(DatCertificate::from(
            self.cid.to_u64().unwrap(),
            signature_key,
            crypto_key,
            self.dat_issue_begin_time as u64,
            self.dat_issue_end_time as u64,
            self.dat_ttl as u64,
        )?)
    }
}

impl ActiveModel {
    pub fn generate(signature_algorithm: DatSignatureAlgorithm, crypto_algorithm: DatCryptoAlgorithm, dat_issue_begin: u64, dat_issue_end: u64, dat_ttl: u64) -> Result<Self, DatError> {
        let (signing_key, verifying_key) = DatSignatureKey::generate(signature_algorithm)?.to_bytes();
        let crypto_key = DatCryptoKey::generate(crypto_algorithm).to_bytes().to_vec();

        Ok(ActiveModel {
            signature_algorithm: Set(signature_algorithm.to_string()),
            signing_key: Set(signing_key.to_vec()),
            verifying_key: Set(verifying_key.to_vec()),
            crypto_algorithm: Set(crypto_algorithm.to_string()),
            crypto_key: Set(crypto_key),
            dat_issue_begin_time: Set(dat_issue_begin as i64),
            dat_issue_end_time: Set(dat_issue_end as i64),
            dat_ttl: Set(dat_ttl as i64),
            expire_time: Set((dat_issue_end + dat_ttl) as i64),
            ..Default::default()
        })
    }
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
}
