use crate::api::{Api, ApiError, ApiResult};
use crate::codes;
use crate::dto::cert::{
    CachedCertificate, CertificateList, ListCertificatesQuery, RegisterCertificateCommand,
};
use crate::entity::dat_cms_cert;
use crate::env::ENV;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::DatError;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use sea_orm::prelude::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait, ExprTrait, QueryFilter,
    RuntimeErr, SelectExt, SqlErr, SqlxError, TransactionSession, TransactionTrait,
};
use std::future::Future;
use std::ops::Deref;
use std::str::FromStr;
use std::sync::Arc;
use std::sync::LazyLock;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, RwLock};

pub type NewCid = String;
pub type DeleteCount = u64;

const DB_DAT_CMS_CERT_RETENTION_SECONDS: u64 = 86400 * 30;
const REGISTER_RETRY_ATTEMPTS: u8 = 3;

struct CacheSnapshot {
    version: i64,
    certificates: Arc<[CachedCertificate]>,
    refreshed_at: Instant,
    ttl: Duration,
}

impl CacheSnapshot {
    fn is_fresh_at(&self, now: Instant) -> bool {
        now.saturating_duration_since(self.refreshed_at) < self.ttl
    }

    fn invalidated(&self) -> Self {
        Self {
            version: self.version,
            certificates: self.certificates.clone(),
            refreshed_at: Instant::now(),
            ttl: Duration::ZERO,
        }
    }

    fn retained_after_refresh_error(&self, ttl: Duration) -> Self {
        Self {
            version: self.version,
            certificates: self.certificates.clone(),
            refreshed_at: Instant::now(),
            ttl,
        }
    }
}

pub struct CertificateService {
    cache: RwLock<Option<Arc<CacheSnapshot>>>,
    cache_refresh: Mutex<()>,
    cache_ttl: Duration,
    query_timeout: Option<Duration>,
}

impl CertificateService {
    pub fn new(cache_ttl: Duration) -> Self {
        Self {
            cache: RwLock::new(None),
            cache_refresh: Mutex::new(()),
            cache_ttl,
            query_timeout: Some(Duration::from_secs(30)),
        }
    }

    pub fn with_query_timeout(mut self, timeout: Duration) -> Self {
        self.query_timeout = (!timeout.is_zero()).then_some(timeout);
        self
    }

    pub async fn list<C: ConnectionTrait>(
        &self,
        cmd: ListCertificatesQuery,
        db: &C,
    ) -> ApiResult<CertificateList> {
        let snapshot = self.current_or_refresh(db).await?;
        let cache_version = snapshot.version;

        let version = if cache_version >= cmd.version {
            cmd.version
        } else {
            0
        };
        let start = snapshot
            .certificates
            .partition_point(|x| x.version <= version);
        let list = snapshot.certificates[start..]
            .iter()
            .map(|x| {
                if cmd.verify_only {
                    &x.verify_only
                } else {
                    &x.full
                }
            })
            .filter(|s| !s.is_empty())
            .cloned()
            .collect();

        Ok(CertificateList {
            version: cache_version,
            list,
        })
    }

    async fn current_or_refresh<C: ConnectionTrait>(
        &self,
        db: &C,
    ) -> ApiResult<Arc<CacheSnapshot>> {
        if let Some(snapshot) = self.fresh_snapshot().await {
            return Ok(snapshot);
        }
        let _refresh = self.cache_refresh.lock().await;
        if let Some(snapshot) = self.fresh_snapshot().await {
            return Ok(snapshot);
        }
        match load_snapshot(db, self.cache_ttl, self.query_timeout).await {
            Ok(snapshot) => {
                let snapshot = Arc::new(snapshot);
                *self.cache.write().await = Some(snapshot.clone());
                Ok(snapshot)
            }
            Err(err) => {
                let last_known_good = { self.cache.read().await.clone() };
                if let Some(snapshot) = last_known_good {
                    tracing::error!("certificate cache refresh failed; serving last good snapshot");
                    let snapshot = Arc::new(snapshot.retained_after_refresh_error(self.cache_ttl));
                    *self.cache.write().await = Some(snapshot.clone());
                    Ok(snapshot)
                } else {
                    Err(err)
                }
            }
        }
    }

    async fn fresh_snapshot(&self) -> Option<Arc<CacheSnapshot>> {
        self.cache
            .read()
            .await
            .as_ref()
            .filter(|snapshot| snapshot.is_fresh_at(Instant::now()))
            .cloned()
    }

    async fn invalidate_cache(&self) {
        let _refresh = self.cache_refresh.lock().await;
        let mut cache = self.cache.write().await;
        if let Some(snapshot) = cache.as_ref() {
            *cache = Some(Arc::new(snapshot.invalidated()));
        }
    }

    pub async fn register<C>(
        &self,
        cmd: RegisterCertificateCommand,
        db: &C,
    ) -> ApiResult<(NewCid, DeleteCount)>
    where
        C: ConnectionTrait + TransactionTrait,
    {
        for attempt in 0..REGISTER_RETRY_ATTEMPTS {
            match register_internal(cmd.clone(), db).await {
                Ok(result) => {
                    self.invalidate_cache().await;
                    return Ok(result);
                }
                Err(err)
                    if attempt + 1 < REGISTER_RETRY_ATTEMPTS
                        && is_retryable_transaction_error(&err) =>
                {
                    tokio::time::sleep(Duration::from_millis(5 * (1_u64 << attempt))).await;
                }
                Err(err) => return Err(err),
            }
        }
        unreachable!("bounded registration retry always returns")
    }
}

fn is_retryable_transaction_error(err: &ApiError) -> bool {
    let Some(
        DbErr::Exec(RuntimeErr::SqlxError(error)) | DbErr::Query(RuntimeErr::SqlxError(error)),
    ) = err.0.downcast_ref::<DbErr>()
    else {
        return false;
    };
    let SqlxError::Database(database) = error.deref() else {
        return false;
    };
    matches!(database.code().as_deref(), Some("1213") | Some("40001"))
}

static DEFAULT_SERVICE: LazyLock<CertificateService> =
    LazyLock::new(|| CertificateService::new(Duration::from_secs(ENV.server.db_cache_secs)));

#[allow(dead_code)]
pub async fn list<C: ConnectionTrait>(
    cmd: ListCertificatesQuery,
    db: &C,
) -> ApiResult<CertificateList> {
    DEFAULT_SERVICE.list(cmd, db).await
}

async fn load_snapshot<C: ConnectionTrait>(
    db: &C,
    cache_ttl: Duration,
    query_timeout: Option<Duration>,
) -> ApiResult<CacheSnapshot> {
    let now = now_unix_timestamp() as i64;
    let load = dat_cms_cert::Entity::find()
        .filter(dat_cms_cert::Column::Expire.gte(now))
        .order_by_id_asc()
        .all(db);
    let certificates = wait_for_query(query_timeout, load)
        .await?
        .iter()
        .map(|x| {
            x.serialize_certificate()
                .map_err(|e| corrupt_row(x.ver, x.cid, e))
        })
        .collect::<ApiResult<Vec<CachedCertificate>>>()?;
    let version = certificates.last().map(|x| x.version).unwrap_or(0);
    let issuable = certificates.iter().filter(|cert| cert.issuable()).count();
    tracing::debug!(
        certificates = certificates.len(),
        issuable,
        "CERTIFICATE CACHE REFRESHED",
    );

    Ok(CacheSnapshot {
        version,
        certificates: certificates.into(),
        refreshed_at: Instant::now(),
        ttl: cache_ttl,
    })
}

async fn wait_for_query<T, F>(timeout: Option<Duration>, query: F) -> ApiResult<T>
where
    F: Future<Output = Result<T, sea_orm::DbErr>>,
{
    match timeout {
        Some(timeout) => Ok(tokio::time::timeout(timeout, query)
            .await
            .map_err(|_| Api::code(codes::STORE_UNAVAILABLE))??),
        None => Ok(query.await?),
    }
}

#[allow(dead_code)]
pub async fn register<C>(
    cmd: RegisterCertificateCommand,
    db: &C,
) -> ApiResult<(NewCid, DeleteCount)>
where
    C: ConnectionTrait + TransactionTrait,
{
    DEFAULT_SERVICE.register(cmd, db).await
}

async fn register_internal<C>(
    cmd: RegisterCertificateCommand,
    db: &C,
) -> ApiResult<(NewCid, DeleteCount)>
where
    C: ConnectionTrait + TransactionTrait,
{
    let transaction = db.begin().await?;
    let result = register_in_transaction(cmd, &transaction).await;

    match result {
        Ok(result) => {
            transaction.commit().await?;
            Ok(result)
        }
        Err(err) => {
            if transaction.rollback().await.is_err() {
                tracing::error!(
                    "{}: certificate registration rollback failed",
                    codes::STORE_UNKNOWN
                );
            }
            Err(err)
        }
    }
}

async fn register_in_transaction<C: ConnectionTrait>(
    cmd: RegisterCertificateCommand,
    db: &C,
) -> ApiResult<(NewCid, DeleteCount)> {
    let now = now_unix_timestamp() as i64;
    let delete_count = cleanup(db).await?;
    let (start, dur) = if has_issuance_certificates(db).await? {
        (
            now + cmd.certificate_propagation_delay_seconds,
            cmd.dat_issuance_duration_seconds,
        )
    } else {
        tracing::warn!(
            "Due to the unavailability of currently issuable certificates, a certificate with no delay has been issued."
        );
        (
            now,
            cmd.certificate_propagation_delay_seconds + cmd.dat_issuance_duration_seconds,
        )
    };
    let mut certificate = dat_cms_cert::ActiveModel::generate(
        0,
        start,
        dur,
        cmd.dat_ttl_seconds,
        DatSignatureAlgorithm::from_str(&cmd.signature_algorithm)?,
        DatCryptoAlgorithm::from_str(&cmd.crypto_algorithm)?,
    )?;

    for _ in 0..1000 {
        let cid = rand::random::<u32>() as i64;
        certificate.cid = sea_orm::Set(cid);
        match certificate.clone().insert(db).await {
            Ok(_) => return Ok((format!("{cid:x}"), delete_count)),
            Err(err) if matches!(err.sql_err(), Some(SqlErr::UniqueConstraintViolation(_))) => {}
            Err(err) => return Err(err.into()),
        }
    }

    Err(Api::code(codes::STORE_UNKNOWN)
        .details(serde_json::Value::from(
            "cannot find an unused cid after 1000 attempts",
        ))
        .into())
}

async fn cleanup<C: ConnectionTrait>(db: &C) -> ApiResult<u64> {
    let clean_date = (now_unix_timestamp() - DB_DAT_CMS_CERT_RETENTION_SECONDS) as i64;
    Ok(dat_cms_cert::Entity::delete_many()
        .filter(dat_cms_cert::Column::Expire.lt(clean_date))
        .exec(db)
        .await?
        .rows_affected)
}

async fn has_issuance_certificates<C: ConnectionTrait>(db: &C) -> ApiResult<bool> {
    let now = now_unix_timestamp() as i64;
    let has = dat_cms_cert::Entity::find()
        .filter(dat_cms_cert::Column::IssuanceStart.lte(now))
        .filter(
            Expr::col(dat_cms_cert::Column::IssuanceStart)
                .add(Expr::col(dat_cms_cert::Column::IssuanceDuration))
                .gte(now),
        )
        .exists(db)
        .await?;
    Ok(has)
}

fn corrupt_row(ver: i64, cid: i64, err: ApiError) -> ApiError {
    let cause = err
        .0
        .downcast_ref::<DatError>()
        .map(|e| e.code())
        .unwrap_or("unknown");
    tracing::error!(
        "{}: corrupt certificate row ver={ver} cid={cid:x} cause={cause}",
        codes::STORE_UNKNOWN,
    );
    Api::code(codes::STORE_UNKNOWN)
        .details(serde_json::json!({ "ver": ver, "cause": cause }))
        .into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, PaginatorTrait};

    #[test]
    fn cache_freshness_uses_monotonic_elapsed_time() {
        let refreshed_at = Instant::now();
        let snapshot = CacheSnapshot {
            version: 0,
            certificates: Vec::new().into(),
            refreshed_at,
            ttl: Duration::from_secs(30),
        };

        assert!(snapshot.is_fresh_at(refreshed_at + Duration::from_secs(29)));
        assert!(!snapshot.is_fresh_at(refreshed_at + Duration::from_secs(30)));
        assert!(!snapshot.invalidated().is_fresh_at(Instant::now()));
        assert!(
            snapshot
                .retained_after_refresh_error(Duration::from_secs(30))
                .is_fresh_at(Instant::now())
        );
    }

    #[tokio::test]
    async fn registration_commits_as_one_sqlite_transaction() {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        crate::schema::sync(&db).await.unwrap();
        let cmd = RegisterCertificateCommand {
            signature_algorithm: "HMAC-SHA512-MFS".to_string(),
            crypto_algorithm: "IV-AES256-GCM".to_string(),
            certificate_propagation_delay_seconds: 0,
            dat_issuance_duration_seconds: 60,
            dat_ttl_seconds: 60,
        };

        let (cid, deleted) = register(cmd, &db).await.unwrap();
        assert!(!cid.is_empty());
        assert_eq!(deleted, 0);
        assert_eq!(dat_cms_cert::Entity::find().count(&db).await.unwrap(), 1);

        db.clone().close().await.unwrap();
    }

    #[tokio::test]
    async fn independent_services_do_not_share_cache_or_ttl() {
        let short = CertificateService::new(Duration::ZERO);
        let long = CertificateService::new(Duration::from_secs(30));
        let snapshot = Arc::new(CacheSnapshot {
            version: 7,
            certificates: Vec::new().into(),
            refreshed_at: Instant::now(),
            ttl: Duration::from_secs(30),
        });
        *short.cache.write().await = Some(snapshot.clone());
        *long.cache.write().await = Some(snapshot);

        assert!(short.fresh_snapshot().await.is_some());
        assert!(long.fresh_snapshot().await.is_some());
        short.invalidate_cache().await;
        assert!(short.fresh_snapshot().await.is_none());
        assert!(long.fresh_snapshot().await.is_some());
        assert_eq!(short.cache_ttl, Duration::ZERO);
        assert_eq!(long.cache_ttl, Duration::from_secs(30));
    }

    #[test]
    fn refresh_failure_retains_last_known_good_snapshot() {
        let snapshot = CacheSnapshot {
            version: 9,
            certificates: Vec::new().into(),
            refreshed_at: Instant::now() - Duration::from_secs(31),
            ttl: Duration::from_secs(30),
        };
        let retained = snapshot.retained_after_refresh_error(Duration::from_secs(30));
        assert_eq!(retained.version, 9);
        assert!(retained.is_fresh_at(Instant::now()));
    }

    #[tokio::test]
    async fn query_timeout_is_store_unavailable_and_zero_disables_it() {
        let timed_out = wait_for_query(
            Some(Duration::from_millis(1)),
            std::future::pending::<Result<(), sea_orm::DbErr>>(),
        )
        .await
        .unwrap_err();
        let api = timed_out.0.downcast_ref::<Api>().unwrap();
        assert_eq!(api.code, codes::STORE_UNAVAILABLE);

        assert!(
            CertificateService::new(Duration::ZERO)
                .with_query_timeout(Duration::ZERO)
                .query_timeout
                .is_none()
        );
    }

    #[tokio::test]
    async fn timeout_fallback_completes_without_cache_lock_deadlock() {
        let service = CertificateService::new(Duration::from_secs(30))
            .with_query_timeout(Duration::from_millis(1));
        *service.cache.write().await = Some(Arc::new(CacheSnapshot {
            version: 9,
            certificates: Vec::new().into(),
            refreshed_at: Instant::now() - Duration::from_secs(31),
            ttl: Duration::from_secs(30),
        }));
        let db = Database::connect("sqlite::memory:").await.unwrap();
        db.clone().close().await.unwrap();

        let completed =
            tokio::time::timeout(Duration::from_millis(100), service.current_or_refresh(&db))
                .await
                .expect("timeout fallback must not deadlock")
                .unwrap();
        assert_eq!(completed.version, 9);
    }
}
