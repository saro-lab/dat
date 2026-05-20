use crate::entity::dat_certificates;
use crate::env::ENV;
use crate::middleware::error::ApiResult;
use dat::signature::DatSignatureKeyExportOption;
use dat::util::now_unix_timestamp;
use sea_orm::{ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};

pub(crate) type CertificateCount = usize;
pub(crate) type NewCid = i64;
pub(crate) type DeleteCount = u64;

pub async fn get_certificates<C: ConnectionTrait>(signature_key_out_option: DatSignatureKeyExportOption, db: &C) -> ApiResult<(String, CertificateCount)> {
    let certificates = dat_certificates::Entity::find().all(db).await?
        .iter().map(|e| e.to_certificate().unwrap().export(signature_key_out_option).unwrap())
        .collect::<Vec<String>>();
    let count = certificates.len();
    Ok((certificates.join("\n"), count))
}

pub async fn generate<C: ConnectionTrait>(db: &C) -> ApiResult<(NewCid, DeleteCount)> {
    let delete_count = cleanup_expired(db).await?;
    let cid = dat_certificates::ActiveModel::generate(ENV.signature, ENV.crypto, ENV.issue_begin(), ENV.issue_end(), ENV.dat_ttl)?
        .save(db).await?.cid.unwrap();
    Ok((cid, delete_count))
}

async fn cleanup_expired<C: ConnectionTrait>(db: &C) -> ApiResult<u64> {
    let now = now_unix_timestamp();
    Ok(dat_certificates::Entity::delete_many().filter(dat_certificates::Column::ExpireTime.lt(now)).exec(db).await?.rows_affected)
}
