use std::str::FromStr;
use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use crate::entity::dat_cert;
use crate::env::ENV;
use crate::middleware::error::{ApiError, ApiResult};
use dat::util::now_unix_timestamp;
use rand::random;
use sea_orm::{ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, SelectExt};

pub(crate) type CertificateCount = usize;
pub(crate) type NewCid = i64;
pub(crate) type DeleteCount = u64;

pub async fn get_certificates<C: ConnectionTrait>(verify_only: bool, db: &C) -> ApiResult<(String, CertificateCount)> {
    let now = now_unix_timestamp();
    let certificates = dat_cert::Entity::find()
        .filter(dat_cert::Column::ExpireTime.gte(now)).all(db).await?
        .iter()
        .map(|x|
            x.to_certificate()
                .map(|y| {
                    if y.signature_algorithm() != ENV.signature || y.crypto_algorithm() != ENV.crypto {
                        tracing::warn!("{} {} {} The stored certificate does not match the server settings", x.cid, x.signature_algorithm, x.crypto_algorithm);
                    }
                    y
                })
                .unwrap()
                .export(verify_only)
                .unwrap_or_else(|_| {
                    let export_option = if verify_only { "Export Verify Only" } else { "Export" };
                    tracing::warn!("{} {} {} {} Failed to convert the certificate", export_option, x.cid, x.signature_algorithm, x.crypto_algorithm);
                    "".to_string()
                })
        )
        .filter(|x| !x.is_empty())
        .collect::<Vec<String>>();
    let count = certificates.len();
    Ok((certificates.join("\n"), count))
}

pub async fn generate<C: ConnectionTrait>(
    signature: String,
    crypto: String,
    cron_certificate_propagation_delay_seconds: u64,
    cron_dat_issuance_duration_seconds: u64,
    cron_dat_ttl_seconds: u64,
    db: &C
) -> ApiResult<(NewCid, DeleteCount)> {
    let now = now_unix_timestamp() as i64;
    let delete_count = cleanup_expired(db).await?;
    let cid = generate_cid(db).await?;
    let cid = dat_cert::ActiveModel::generate(
        cid,
        now.checked_add(cron_certificate_propagation_delay_seconds),
        cron_dat_issuance_duration_seconds,
        cron_dat_ttl_seconds,
        DatSignatureAlgorithm::from_str(&signature)?,
        DatCryptoAlgorithm::from_str(&crypto)?,
    )?
        .save(db).await?.cid.unwrap();
    Ok((cid, delete_count))
}

async fn cleanup_expired<C: ConnectionTrait>(db: &C) -> ApiResult<u64> {
    let clean_date = now_unix_timestamp() - (86400 * 30);
    Ok(dat_cert::Entity::delete_many().filter(dat_cert::Column::ExpireTime.lt(clean_date)).exec(db).await?.rows_affected)
}

async fn generate_cid<C: ConnectionTrait>(db: &C) -> ApiResult<i64> {
    for i in 0 .. 1000 {
        let cid = random::<u32>() as i64;
        let exists = dat_cert::Entity::find()
            .filter(dat_cert::Column::Cid.eq(cid))
            .exists(db).await?;
        if !exists {
            return Ok(cid);
        }
    }
    Err(ApiError::new500("".to_string()))
}
