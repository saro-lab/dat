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
    /// 마지막 동기화 실패. 최초 sync 실패를 삼키고 "인증서 0개 매니저"를 성공 반환하던
    /// 동작은 그대로 두되(list.md F-3), 실패가 어디에도 안 남던 것을 여기서 관측 가능하게 한다.
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
        // Prevents dependency conflicts by not exposing reqwest::IntoUrl. (impl IntoUrl)
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

        // 최초 sync 실패는 여전히 build 를 막지 않는다. 다만 이제 조용히 사라지지 않고
        // last_error() 로 조회할 수 있다.
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

    /// 마지막 동기화 실패. 한 번도 성공하지 못했으면 [`DatError::CmsNotSynced`],
    /// 정상이면 `None`. 재시도 여부는 `err.retry()` 로 판정한다.
    pub async fn last_error(&self) -> Option<DatError> {
        self.last_error.read().await.clone()
    }

    pub async fn sync(&self) -> Result<(), DatError> {
        let result = self.sync_inner().await;

        match &result {
            Ok(()) => *self.last_error.write().await = None,
            // 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
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

        // 연결 거부·DNS 실패·TLS 실패·타임아웃이 전부 여기로 온다. 전부 일시적이다.
        let response = self.client.get(self.url.clone())
            .query(&[("version", version)])
            .header("Authorization", &self.token)
            .send().await
            .map_err(|e| DatError::CmsUnreachable(e.to_string()))
            .inspect_err(|e| {
                #[cfg(feature = "tracing")]
                tracing::error!("[CRITICAL] DAT CMS SYNC {}: {e}", self.url)
            })?;

        // HTTP 상태를 갈라 낸다. 예전에는 전부 하나의 문자열이라 401(영구)에도
        // 60초마다 영원히 재시도했다.
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

        // 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다. 오류가 아니라
        // 상태 신호이며, 아래 import 가 clear=true 라 그 자체로 처리된다.
        if ver < version {
            #[cfg(feature = "tracing")]
            tracing::warn!("{}: server rolled version back {version} -> {ver}, full resync", DatError::CmsVersionReset.code());
        }

        // 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
        let count = self.manager.import(&certs, true)
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
