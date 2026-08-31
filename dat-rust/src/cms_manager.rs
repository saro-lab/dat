use crate::dat::Dat;
use crate::error::DatError;
use crate::manager::DatManager;
use crate::payload::DatPayload;
use reqwest::{Client, Url, redirect};
use std::sync::{Arc, Mutex as StdMutex, Weak};
use std::time::Duration;
use tokio::sync::{Mutex, RwLock};
use zeroize::Zeroizing;

pub static DAT_CMS_API_VERSION: &str = "v1";

pub struct DatCmsManager {
    url: String,
    token: Zeroizing<String>,
    version: RwLock<u64>,
    manager: DatManager,
    client: Client,
    last_error: RwLock<Option<DatError>>,
    sync_lock: Mutex<()>,
    background_task: StdMutex<Option<tokio::task::AbortHandle>>,
}

pub struct DatCmsManagerBuilder {
    url: String,
    token: String,
    verify_only: bool,
    interval: Duration,
    connect_timeout: Option<Duration>,
    total_timeout: Option<Duration>,
}
impl DatCmsManagerBuilder {
    #[inline]
    pub fn url(mut self, url: &str) -> Result<Self, DatError> {
        let url =
            Url::parse(url).map_err(|_| DatError::ConfigUriInvalid("cannot be parsed as a uri"))?;
        if url.scheme() != "http" && url.scheme() != "https" {
            return Err(DatError::ConfigUriInvalid("scheme must be http or https"));
        }
        if url.path().len() > 1 {
            return Err(DatError::ConfigUriInvalid(
                "must be path-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/abc (X)",
            ));
        }
        if url.query().is_some() {
            return Err(DatError::ConfigUriInvalid(
                "must be query-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/?query=1 (X)",
            ));
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

    #[inline]
    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = (!timeout.is_zero()).then_some(timeout);
        self
    }

    #[inline]
    pub fn total_timeout(mut self, timeout: Duration) -> Self {
        self.total_timeout = (!timeout.is_zero()).then_some(timeout);
        self
    }

    #[inline]
    pub fn timeout(self, timeout: Duration) -> Self {
        self.total_timeout(timeout)
    }

    pub async fn build(self) -> Arc<DatCmsManager> {
        let url = if self.verify_only {
            format!("{}/{DAT_CMS_API_VERSION}/certs/verify-only", self.url)
        } else {
            format!("{}/{DAT_CMS_API_VERSION}/certs", self.url)
        };

        let mut client = Client::builder().redirect(same_origin_redirect_policy());
        if let Some(timeout) = self.connect_timeout {
            client = client.connect_timeout(timeout);
        }
        if let Some(timeout) = self.total_timeout {
            client = client.timeout(timeout);
        }

        let manager = Arc::new(DatCmsManager {
            url,
            token: Zeroizing::new(self.token),
            version: RwLock::new(0),
            manager: DatManager::new(),
            client: client
                .build()
                .expect("DAT CMS HTTP client initialization failed"),
            last_error: RwLock::new(Some(DatError::CmsNotSynced)),
            sync_lock: Mutex::new(()),
            background_task: StdMutex::new(None),
        });

        let _ = manager.sync().await;

        if !self.interval.is_zero() {
            proxy_tokio_spawn(&manager, self.interval);
        } else {
            #[cfg(feature = "tracing")]
            tracing::debug!("cms auto sync disabled");
        }

        manager
    }
}

fn same_origin(left: &Url, right: &Url) -> bool {
    left.scheme() == right.scheme()
        && left.host_str() == right.host_str()
        && left.port_or_known_default() == right.port_or_known_default()
}

fn same_origin_redirect_policy() -> redirect::Policy {
    redirect::Policy::custom(|attempt| {
        if attempt.previous().len() > 10 {
            return attempt.error("too many redirects");
        }
        match attempt.previous().first() {
            Some(origin) if same_origin(origin, attempt.url()) => attempt.follow(),
            Some(_) => attempt.error("cross-origin redirect is not allowed"),
            None => attempt.follow(),
        }
    })
}

fn proxy_tokio_spawn(manager: &Arc<DatCmsManager>, interval: Duration) {
    let manager_weak: Weak<DatCmsManager> = Arc::downgrade(manager);
    let task = tokio::spawn(async move {
        let mut ticker = tokio::time::interval_at(tokio::time::Instant::now() + interval, interval);
        loop {
            ticker.tick().await;
            let Some(manager) = manager_weak.upgrade() else {
                break;
            };
            let _ = manager.sync().await.is_ok();
        }
    });
    *manager
        .background_task
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner) = Some(task.abort_handle());
}

impl Default for DatCmsManagerBuilder {
    fn default() -> Self {
        DatCmsManagerBuilder {
            url: "http://localhost:8088".to_string(),
            token: "".to_string(),
            verify_only: false,
            interval: Duration::from_secs(60),
            connect_timeout: Some(Duration::from_secs(5)),
            total_timeout: Some(Duration::from_secs(15)),
        }
    }
}

impl Drop for DatCmsManager {
    fn drop(&mut self) {
        if let Some(task) = self
            .background_task
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .take()
        {
            task.abort();
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
    pub fn parse<E: Into<DatError>>(
        &self,
        dat: impl TryInto<Dat, Error = E>,
    ) -> Result<DatPayload, DatError> {
        self.manager.parse(dat)
    }

    #[inline]
    pub fn parse_without_verify<E: Into<DatError>>(
        &self,
        dat: impl TryInto<Dat, Error = E>,
    ) -> Result<DatPayload, DatError> {
        self.manager.parse_without_verify(dat)
    }

    #[inline]
    pub fn get_manager(&self) -> &DatManager {
        &self.manager
    }

    #[inline]
    pub async fn get_version(&self) -> u64 {
        *self.version.read().await
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
        let Ok(_sync_guard) = self.sync_lock.try_lock() else {
            #[cfg(feature = "tracing")]
            tracing::debug!(
                "cms sync skipped, previous sync still running: {}",
                self.url
            );
            return Err(DatError::CmsSyncInProgress);
        };

        let version = *self.version.read().await;

        let response = self
            .client
            .get(self.url.clone())
            .query(&[("version", version)])
            .header("Authorization", self.token.as_str())
            .send()
            .await
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

        let body = response
            .bytes()
            .await
            .map_err(|e| DatError::CmsUnreachable(e.to_string()))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;
        if !body.is_ascii() {
            return Err(DatError::CmsMalformed("response body is not ASCII"));
        }
        let cert_str = std::str::from_utf8(&body)
            .map_err(|_| DatError::CmsMalformed("response body is not ASCII"))?;

        let mut split = cert_str.splitn(2, "\n");
        let ver = split
            .next()
            .ok_or(DatError::CmsMalformed("response has no version line"))?;

        let ver = crate::util::parse_u64_dec(ver)
            .ok_or(DatError::CmsMalformed(
                "version line is not a plain decimal u64",
            ))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;

        let certs = split.next().unwrap_or("").trim();
        if certs.is_empty() {
            #[cfg(feature = "tracing")]
            tracing::debug!(
                "no new certificates in response {}?version={}",
                self.url,
                version
            );
            return Ok(());
        }

        if ver < version {
            #[cfg(feature = "tracing")]
            tracing::warn!(
                "{}: server rolled version back {version} -> {ver}, full resync",
                DatError::CmsVersionReset.code()
            );
        }

        let count = self
            .manager
            .import(certs, false)
            .map_err(|e| DatError::CmsImportFailed(Box::new(e)))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;
        *self.version.write().await = ver;

        #[cfg(feature = "tracing")]
        tracing::info!("Sync OK: Renew {} DAT certificates.", count);
        Ok(())
    }
}
