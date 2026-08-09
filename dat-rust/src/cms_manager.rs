use crate::dat::Dat;
use crate::error::DatError;
use crate::manager::DatManager;
use crate::payload::DatPayload;
use reqwest::{Client, Url};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

pub static DAT_CMS_API_VERSION: &str = "v1";

pub struct DatCmsManager {
    url: String,
    token: String,
    version: RwLock<u64>,
    manager: DatManager,
    client: Client,
    last_error: RwLock<Option<DatError>>,
}

pub struct DatCmsManagerBuilder {
    url: String,
    token: String,
    verify_only: bool,
    interval: Duration,
}
impl DatCmsManagerBuilder {
    #[inline]
    pub fn url(mut self, url: &str) -> Result<Self, DatError> {
        let url = Url::parse(url)
            .map_err(|_| DatError::ConfigUriInvalid("cannot be parsed as a uri"))?;
        if url.scheme() != "http" && url.scheme() != "https" {
            return Err(DatError::ConfigUriInvalid("scheme must be http or https"))
        }
        if url.path().len() > 1 {
            return Err(DatError::ConfigUriInvalid("must be path-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/abc (X)"))
        }
        if url.query().is_some() {
            return Err(DatError::ConfigUriInvalid("must be query-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/?query=1 (X)"))
        }
        self.url = url.to_string().trim_end_matches('/').to_string();
        Ok(self)
    }

    #[inline]
    pub fn token(mut self, token: impl Into<String>) -> Self {
        self.token = token.into();
        self
    }

    #[inline]
    pub fn verify_only(mut self, verify_only: bool) -> Self {
        self.verify_only = verify_only;
        self
    }

    #[inline]
    pub fn interval(mut self, interval: Duration) -> Self {
        self.interval = interval;
        self
    }

    #[inline]
    pub fn interval_off(self) -> Self {
        self.interval(Duration::from_secs(0))
    }

    pub async fn build(self) -> Arc<DatCmsManager> {

        let url = if self.verify_only {
            format!("{}/{DAT_CMS_API_VERSION}/certs/verify-only", self.url)
        } else {
            format!("{}/{DAT_CMS_API_VERSION}/certs", self.url)
        };

        let manager = Arc::new(DatCmsManager {
            url,
            token: self.token,
            version: RwLock::new(0),
            manager: DatManager::new(),
            client: Client::new(),
            last_error: RwLock::new(Some(DatError::CmsNotSynced)),
        });

        let _ = manager.sync().await;

        if self.interval.as_secs() > 0 {
            proxy_tokio_spawn(&manager, self.interval);
        } else {
            #[cfg(feature = "tracing")]
            tracing::debug!("cms auto sync disabled");
        }

        manager
    }
}

fn proxy_tokio_spawn(manager: &Arc<DatCmsManager>, interval: Duration) {
    let manager_clone: Arc<DatCmsManager> = Arc::clone(manager);
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);
        loop {
            ticker.tick().await;
            let _ = manager_clone.sync().await.is_ok();
        }
    });
}


impl Default for DatCmsManagerBuilder {
    fn default() -> Self {
        DatCmsManagerBuilder {
            url: "http://localhost:8088".to_string(),
            token: "".to_string(),
            verify_only: false,
            interval: Duration::from_secs(60),
        }
    }
}

impl DatCmsManager {
    pub fn builder() -> DatCmsManagerBuilder {
        DatCmsManagerBuilder::default()
    }

    #[inline]
    pub fn issue(&self, plain: &str, secure: &str) -> Result<String, DatError> {
        self.manager.issue(plain, secure)
    }

    #[inline]
    pub fn parse<E: Into<DatError>>(&self, dat: impl TryInto<Dat, Error = E>) -> Result<DatPayload, DatError> {
        self.manager.parse(dat)
    }

    #[inline]
    pub fn parse_without_verify<E: Into<DatError>>(&self, dat: impl TryInto<Dat, Error = E>) -> Result<DatPayload, DatError> {
        self.manager.parse_without_verify(dat)
    }

    #[inline]
    pub fn get_manager(&self) -> &DatManager {
        &self.manager
    }

    #[inline]
    pub async fn get_version(&self) -> u64 {
        self.version.read().await.clone()
    }

    pub async fn last_error(&self) -> Option<DatError> {
        self.last_error.read().await.clone()
    }

    pub async fn sync(&self) -> Result<(), DatError> {
        let result = self.sync_inner().await;

        match &result {
            Ok(()) => *self.last_error.write().await = None,
            Err(e) if e.retry() == crate::error::DatRetry::State => {}
            Err(e) => *self.last_error.write().await = Some(e.clone()),
        }

        result
    }

    async fn sync_inner(&self) -> Result<(), DatError> {
        let Ok(mut version_lock) = self.version.try_write() else {
            #[cfg(feature = "tracing")]
            tracing::debug!("cms sync skipped, previous sync still running: {}", self.url);
            return Err(DatError::CmsSyncInProgress);
        };

        let version = *version_lock;

        let response = self.client.get(self.url.clone())
            .query(&[("version", version)])
            .header("Authorization", &self.token)
            .send().await
            .map_err(|e| DatError::CmsUnreachable(e.to_string()))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;

        let status = response.status();
        if !status.is_success() {
            let code = status.as_u16();
            let e = match code {
                401 => DatError::CmsUnauthorized,
                403 => DatError::CmsForbidden,
                404 => DatError::CmsEndpointNotFound,
                500..=599 => DatError::CmsServerError(code),
                _ => DatError::CmsHttpStatus(code),
            };
            #[cfg(feature = "tracing")]
            tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url);
            return Err(e);
        }

        let cert_str = response.text().await
            .map_err(|e| DatError::CmsUnreachable(e.to_string()))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;

        let mut split = cert_str.splitn(2, "\n");
        let ver = split.next()
            .ok_or(DatError::CmsMalformed("response has no version line"))?;

        let certs = split.next().unwrap_or("").trim();
        if certs.is_empty() {
            #[cfg(feature = "tracing")]
            tracing::debug!("no new certificates in response {}?version={}", self.url, version);
            return Ok(());
        }

        let ver = crate::util::parse_u64_dec(ver)
            .ok_or(DatError::CmsMalformed("version line is not a plain decimal u64"))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;

        if ver < version {
            #[cfg(feature = "tracing")]
            tracing::warn!("{}: server rolled version back {version} -> {ver}, full resync", DatError::CmsVersionReset.code());
        }

        let count = self.manager.import(&certs, false)
            .map_err(|e| DatError::CmsImportFailed(Box::new(e)))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;
        *version_lock = ver;

        #[cfg(feature = "tracing")]
        tracing::info!("Sync OK: Renew {} DAT certificates.", count);
        Ok(())
    }
}
