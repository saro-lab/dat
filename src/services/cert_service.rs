use crate::api::ApiResult;
use crate::dto::cert::{CachedCertificate, CertificateList, ListCertificatesQuery, RegisterCertificateCommand};
use crate::entity::dat_cms_cert;
use crate::env::ENV;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::DatError;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use sea_orm::prelude::Expr;
use sea_orm::{ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, ExprTrait, QueryFilter, SelectExt};
use std::str::FromStr;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::LazyLock;
use tokio::sync::RwLock;

pub type NewCid = String;
pub type DeleteCount = u64;

const DB_DAT_CMS_CERT_RETENTION_SECONDS: u64 = 86400 * 30;

static CACHE_EXPIRE: AtomicU64 = AtomicU64::new(0);
static CACHE_VERSION: AtomicI64 = AtomicI64::new(0);
static CACHE_CERTIFICATES: LazyLock<RwLock<Vec<CachedCertificate>>> = LazyLock::new(|| RwLock::new(Vec::new()));

pub async fn list<C: ConnectionTrait>(cmd: ListCertificatesQuery, db: &C) -> ApiResult<CertificateList> {
    let now = now_unix_timestamp();

    if CACHE_EXPIRE.load(Ordering::Acquire) < now {
        let mut certs_write = CACHE_CERTIFICATES.write().await;
        if CACHE_EXPIRE.load(Ordering::Acquire) < now {
            let new_certs = dat_cms_cert::Entity::find()
                .filter(dat_cms_cert::Column::Expire.gte(now))
                .order_by_id_asc()
                .all(db).await?
                .iter()
                .map(|x| x.serialize_certificate())
                .collect::<ApiResult<Vec<CachedCertificate>>>()?;

            let new_cache_version = new_certs.last().map(|x| x.version).unwrap_or(0);
            let issuable = new_certs.iter().any(|x| x.issuable());
            *certs_write = new_certs;
            CACHE_VERSION.store(new_cache_version, Ordering::Release);

            if issuable {
                CACHE_EXPIRE.store(now + ENV.server.db_cache_secs, Ordering::Release);
            }
        }
    }

    let cache_version = CACHE_VERSION.load(Ordering::Relaxed);

    let version = if cache_version >= cmd.version {
        cmd.version
    } else {
        0
    };

    let certs = CACHE_CERTIFICATES.read().await;
    let start = certs.partition_point(|x| x.version <= version);
    let list = certs[start..].iter()
        .map(|x| if cmd.verify_only { &x.verify_only } else { &x.full })
        .filter(|s| !s.is_empty())
        .cloned()
        .collect::<Vec<String>>();

    Ok(CertificateList {
        version: cache_version,
        list
    })
}

pub async fn register<C: ConnectionTrait>(
    cmd: RegisterCertificateCommand,
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
