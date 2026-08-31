#![cfg(feature = "dat_cms")]

use dat::certificate::DatCertificate;
use dat::cms_manager::DatCmsManager;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::{DatError, DatRetry};
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

struct Response {
    status: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
    delay: Duration,
}

impl Response {
    fn ok(body: impl Into<Vec<u8>>) -> Self {
        Self {
            status: 200,
            headers: vec![],
            body: body.into(),
            delay: Duration::ZERO,
        }
    }

    fn status(status: u16) -> Self {
        Self {
            status,
            headers: vec![],
            body: vec![],
            delay: Duration::ZERO,
        }
    }

    fn redirect(location: String) -> Self {
        Self {
            status: 302,
            headers: vec![("Location".to_string(), location)],
            body: vec![],
            delay: Duration::ZERO,
        }
    }

    fn delayed(mut self, delay: Duration) -> Self {
        self.delay = delay;
        self
    }
}

struct MockServer {
    address: std::net::SocketAddr,
    requests: Arc<AtomicUsize>,
    authorization: Arc<StdMutex<Vec<String>>>,
    task: tokio::task::JoinHandle<()>,
}

impl MockServer {
    async fn start(responses: Vec<Response>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let requests = Arc::new(AtomicUsize::new(0));
        let request_count = Arc::clone(&requests);
        let authorization = Arc::new(StdMutex::new(Vec::new()));
        let captured_authorization = Arc::clone(&authorization);
        let responses = Arc::new(Mutex::new(VecDeque::from(responses)));
        let task = tokio::spawn(async move {
            loop {
                let Ok((mut stream, _)) = listener.accept().await else {
                    break;
                };
                request_count.fetch_add(1, Ordering::SeqCst);
                let mut request = Vec::with_capacity(512);
                loop {
                    let mut buffer = [0_u8; 512];
                    let Ok(read) = stream.read(&mut buffer).await else {
                        break;
                    };
                    if read == 0 {
                        break;
                    }
                    request.extend_from_slice(&buffer[..read]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }

                if let Ok(request) = std::str::from_utf8(&request)
                    && let Some(value) = request.lines().find_map(|line| {
                        line.strip_prefix("Authorization: ")
                            .or_else(|| line.strip_prefix("authorization: "))
                    })
                {
                    captured_authorization
                        .lock()
                        .unwrap_or_else(std::sync::PoisonError::into_inner)
                        .push(value.trim_end_matches('\r').to_string());
                }

                let response = responses
                    .lock()
                    .await
                    .pop_front()
                    .unwrap_or_else(|| Response::status(500));
                tokio::time::sleep(response.delay).await;
                let reason = match response.status {
                    200 => "OK",
                    302 => "Found",
                    401 => "Unauthorized",
                    403 => "Forbidden",
                    404 => "Not Found",
                    429 => "Too Many Requests",
                    500 => "Internal Server Error",
                    _ => "Status",
                };
                let mut head = format!(
                    "HTTP/1.1 {} {}\r\nContent-Length: {}\r\nConnection: close\r\n",
                    response.status,
                    reason,
                    response.body.len()
                );
                for (name, value) in response.headers {
                    head.push_str(&name);
                    head.push_str(": ");
                    head.push_str(&value);
                    head.push_str("\r\n");
                }
                head.push_str("\r\n");
                if stream.write_all(head.as_bytes()).await.is_ok() {
                    let _ = stream.write_all(&response.body).await;
                }
            }
        });
        Self {
            address,
            requests,
            authorization,
            task,
        }
    }

    fn url(&self) -> String {
        format!("http://{}", self.address)
    }

    fn request_count(&self) -> usize {
        self.requests.load(Ordering::SeqCst)
    }

    fn authorization(&self) -> Vec<String> {
        self.authorization
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone()
    }
}

impl Drop for MockServer {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn certificate(cid: u64, issuance_duration: u64) -> String {
    DatCertificate::generate(
        cid,
        now_unix_timestamp() - 1,
        issuance_duration,
        300,
        DatSignatureAlgorithm::HmacSha256Mfs,
        DatCryptoAlgorithm::IvAes128Gcm,
    )
    .unwrap()
    .export(false)
    .unwrap()
}

async fn build(server: &MockServer) -> Arc<DatCmsManager> {
    DatCmsManager::builder()
        .url(&server.url())
        .unwrap()
        .interval_off()
        .build()
        .await
}

#[tokio::test]
async fn strict_response_validation_preserves_state_until_import_commits() {
    let first = certificate(1, 600);
    let second = certificate(2, 300);
    let server = MockServer::start(vec![
        Response::ok(format!("1\n{first}")),
        Response::ok("not-a-version\n"),
        Response::ok(vec![b'2', b'\n', 0xff]),
        Response::ok("2\n"),
        Response::ok("3\nnot-a-certificate"),
        Response::ok(format!("0\n{second}")),
    ])
    .await;
    let manager = build(&server).await;

    assert_eq!(manager.get_version().await, 1);
    assert_eq!(manager.get_manager().export_cids(), vec![1]);
    assert!(manager.issue("plain", "secure").is_ok());

    assert!(matches!(
        manager.sync().await,
        Err(DatError::CmsMalformed(_))
    ));
    assert_eq!(manager.get_version().await, 1);
    assert!(matches!(
        manager.sync().await,
        Err(DatError::CmsMalformed(_))
    ));
    assert_eq!(manager.get_version().await, 1);

    manager.sync().await.unwrap();
    assert_eq!(manager.get_version().await, 1);
    assert_eq!(manager.get_manager().export_cids(), vec![1]);
    assert!(manager.issue("plain", "secure").is_ok());

    assert!(matches!(
        manager.sync().await,
        Err(DatError::CmsImportFailed(_))
    ));
    assert_eq!(manager.get_version().await, 1);
    assert_eq!(manager.get_manager().export_cids(), vec![1]);
    assert!(manager.issue("plain", "secure").is_ok());

    manager.sync().await.unwrap();
    assert_eq!(manager.get_version().await, 0);
    assert_eq!(manager.get_manager().export_cids(), vec![2, 1]);
}

#[tokio::test]
async fn network_wait_does_not_hold_version_lock_and_sync_is_single_flight() {
    let server = MockServer::start(vec![
        Response::ok("0\n"),
        Response::ok("0\n").delayed(Duration::from_millis(250)),
    ])
    .await;
    let manager = build(&server).await;
    let syncing = {
        let manager = Arc::clone(&manager);
        tokio::spawn(async move { manager.sync().await })
    };

    tokio::time::timeout(Duration::from_secs(1), async {
        while server.request_count() < 2 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    assert_eq!(
        tokio::time::timeout(Duration::from_millis(50), manager.get_version())
            .await
            .unwrap(),
        0
    );
    assert_eq!(manager.sync().await, Err(DatError::CmsSyncInProgress));
    assert_eq!(manager.last_error().await, None);
    syncing.await.unwrap().unwrap();
}

#[tokio::test]
async fn background_stops_without_retaining_manager_or_sending_token() {
    let server = MockServer::start(vec![Response::ok("0\n"), Response::ok("0\n")]).await;
    let manager = DatCmsManager::builder()
        .url(&server.url())
        .unwrap()
        .token("background-secret-token")
        .interval(Duration::from_millis(100))
        .build()
        .await;
    assert_eq!(server.request_count(), 1);
    tokio::time::sleep(Duration::from_millis(30)).await;
    assert_eq!(server.request_count(), 1);
    tokio::time::timeout(Duration::from_secs(1), async {
        while server.request_count() < 2 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    tokio::time::timeout(Duration::from_secs(1), async {
        while Arc::strong_count(&manager) != 1 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();

    let weak = Arc::downgrade(&manager);
    drop(manager);
    tokio::time::timeout(Duration::from_secs(1), async {
        while weak.upgrade().is_some() {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    let stopped_at = server.request_count();
    assert!(server.authorization().len() >= 2);
    assert!(
        server
            .authorization()
            .iter()
            .all(|value| value == "background-secret-token")
    );
    tokio::time::sleep(Duration::from_millis(250)).await;
    assert_eq!(server.request_count(), stopped_at);
}

#[tokio::test]
async fn timeout_and_http_status_keep_existing_error_contract() {
    let timeout_server = MockServer::start(vec![
        Response::ok("0\n").delayed(Duration::from_millis(200)),
    ])
    .await;
    let manager = DatCmsManager::builder()
        .url(&timeout_server.url())
        .unwrap()
        .interval_off()
        .connect_timeout(Duration::ZERO)
        .total_timeout(Duration::from_millis(30))
        .build()
        .await;
    let error = manager.last_error().await.unwrap();
    assert!(matches!(error, DatError::CmsUnreachable(_)));
    assert_eq!(error.retry(), DatRetry::Transient);

    let disabled_timeout_server =
        MockServer::start(vec![Response::ok("0\n").delayed(Duration::from_millis(50))]).await;
    let manager = DatCmsManager::builder()
        .url(&disabled_timeout_server.url())
        .unwrap()
        .interval_off()
        .timeout(Duration::ZERO)
        .build()
        .await;
    assert_eq!(manager.last_error().await, None);

    for (status, expected) in [
        (401, DatError::CmsUnauthorized),
        (403, DatError::CmsForbidden),
        (404, DatError::CmsEndpointNotFound),
        (408, DatError::CmsHttpStatus(408)),
        (425, DatError::CmsHttpStatus(425)),
        (429, DatError::CmsHttpStatus(429)),
        (500, DatError::CmsServerError(500)),
    ] {
        let server = MockServer::start(vec![Response::status(status)]).await;
        let manager = build(&server).await;
        assert_eq!(manager.last_error().await, Some(expected));
    }
}

#[tokio::test]
async fn redirects_follow_only_the_original_origin() {
    let same_origin = MockServer::start(vec![
        Response::redirect("/same-origin".to_string()),
        Response::ok("0\n"),
    ])
    .await;
    let manager = build(&same_origin).await;
    assert_eq!(manager.last_error().await, None);
    assert_eq!(same_origin.request_count(), 2);

    let other_origin = MockServer::start(vec![Response::ok("0\n")]).await;
    let source = MockServer::start(vec![Response::redirect(format!(
        "{}/cross-origin",
        other_origin.url()
    ))])
    .await;
    let manager = build(&source).await;
    assert!(matches!(
        manager.last_error().await,
        Some(DatError::CmsUnreachable(_))
    ));
    assert_eq!(source.request_count(), 1);
    assert_eq!(other_origin.request_count(), 0);
}
