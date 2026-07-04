use dat::crypto::DatCryptoAlgorithm;
use dat::error::DatError;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use sea_orm::{ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, ExprTrait, QueryFilter, SelectExt};
use std::str::FromStr;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::OnceLock;
use sea_orm::prelude::Expr;
use tokio::sync::RwLock;
use saro_infra::error::ApiResult;
use crate::dto::certificates::{Certificates, GetListCmd, RegisterCmd, SerializedCertificate};
use crate::env::ENV;
use crate::infrastructure::persistence::dat_cms_cert;

pub type NewCid = String;
pub type DeleteCount = u64;

const DB_DAT_CMS_CERT_RETENTION_SECONDS: u64 = 86400 * 30; // 30 days

static CACHE_EXPIRE: OnceLock<AtomicU64> = OnceLock::new();
static CACHE_VERSION: OnceLock<AtomicI64> = OnceLock::new();
static CACHE_CERTIFICATES: OnceLock<RwLock<Vec<SerializedCertificate>>> = OnceLock::new();


pub fn bind() {
    CACHE_EXPIRE.set(AtomicU64::new(0)).expect("service::cms::bind() OnceLock Error");
    CACHE_VERSION.set(AtomicI64::new(0)).expect("service::cms::bind() OnceLock Error");
    CACHE_CERTIFICATES.set(RwLock::new(Vec::new())).expect("service::cms::bind() OnceLock Error");
}
pub async fn list<C: ConnectionTrait>(cmd: GetListCmd, db: &C) -> ApiResult<Certificates> {
    let now = now_unix_timestamp();
    let certificates = CACHE_CERTIFICATES.get().unwrap();
    let cache_expire = CACHE_EXPIRE.get().unwrap();
    let cache_version = CACHE_VERSION.get().unwrap();

    if cache_expire.load(Ordering::Acquire) < now {
        let mut certs_write = certificates.write().await;
        if cache_expire.load(Ordering::Acquire) < now {
            let new_certs = dat_cms_cert::Entity::find()
                .filter(dat_cms_cert::Column::Expire.gte(now))
                .order_by_id_asc()
                .all(db).await?
                .iter()
                .map(|x| x.serialize_certificate())
                .collect::<ApiResult<Vec<SerializedCertificate>>>()?;

            let new_cache_version = new_certs.last().map(|x| x.version).unwrap_or(0);
            let issuable = new_certs.iter().find(|x| x.issuable()).is_some();
            *certs_write = new_certs;
            cache_version.store(new_cache_version, Ordering::Release);

            if issuable {
                cache_expire.store(now + ENV.server.db_cache_secs, Ordering::Release);
            }
        }
    }

    // clear invalid version
    let version = if cache_version.load(Ordering::Relaxed) >= cmd.version {
        cmd.version
    } else {
        0
    };

    let list = certificates.read().await.iter()
        .filter(|x| x.version > version)
        .map(|x| if cmd.verify_only { x.verify_only.clone() } else { x.full.clone() })
        .filter(|x| !x.is_empty())
        .collect::<Vec<String>>();

    Ok(Certificates {
        version: CACHE_VERSION.get().unwrap().load(Ordering::Relaxed),
        list
    })
}

pub async fn register<C: ConnectionTrait>(
    cmd: RegisterCmd,
    db: &C
) -> ApiResult<(NewCid, DeleteCount)> {
    let now = now_unix_timestamp() as i64;
    let delete_count = cleanup(db).await?;
    let cid = generate_cid(db).await?;
    let (start, dur) = if has_issuance_certificates(db).await? {
        (now + cmd.certificate_propagation_delay_seconds, cmd.dat_issuance_duration_seconds)
    } else {
        tracing::warn!("Due to the unavailability of currently issuable certificates, a certificate with no delay has been issued.");
        (now, cmd.certificate_propagation_delay_seconds + cmd.dat_issuance_duration_seconds)
    };
    let cid = dat_cms_cert::ActiveModel::generate(
        cid,
        start,
        dur,
        cmd.dat_ttl_seconds,
        DatSignatureAlgorithm::from_str(&cmd.signature_algorithm)?,
        DatCryptoAlgorithm::from_str(&cmd.crypto_algorithm)?,
    )?
        .save(db).await?.cid.unwrap();
    Ok((format!("{cid:x}"), delete_count))
}

async fn cleanup<C: ConnectionTrait>(db: &C) -> ApiResult<u64> {
    let clean_date = now_unix_timestamp() - DB_DAT_CMS_CERT_RETENTION_SECONDS;
    Ok(dat_cms_cert::Entity::delete_many().filter(dat_cms_cert::Column::Expire.lt(clean_date)).exec(db).await?.rows_affected)
}

async fn has_issuance_certificates<C: ConnectionTrait>(db: &C) -> ApiResult<bool> {
    let now = now_unix_timestamp();
    let has = dat_cms_cert::Entity::find()
        .filter(dat_cms_cert::Column::IssuanceStart.lte(now))
        .filter(
            Expr::col(dat_cms_cert::Column::IssuanceStart)
                .add(Expr::col(dat_cms_cert::Column::IssuanceDuration))
                .gt(now)
        )
        .exists(db).await?;
    Ok(has)
}

async fn generate_cid<C: ConnectionTrait>(db: &C) -> ApiResult<i64> {
    for _ in 0 .. 1000 {
        let cid = rand::random::<u32>() as i64;
        let exists = dat_cms_cert::Entity::find()
            .filter(dat_cms_cert::Column::Cid.eq(cid))
            .exists(db).await?;
        if !exists {
            return Ok(cid);
        }
    }
    Err(DatError::EtcError("Fail Generate Cid"))?
}
