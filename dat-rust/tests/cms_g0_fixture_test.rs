#![cfg(feature = "dat_cms")]

mod support {
    pub mod g0;
}

use dat::cms_manager::DatCmsManager;
use dat::dat::Dat;
use dat::error::{DatError, DatRetry};
use std::collections::VecDeque;
use std::io::Write;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

#[derive(Clone)]
struct Capture(Arc<StdMutex<Vec<u8>>>);

struct CaptureWriter(Arc<StdMutex<Vec<u8>>>);

impl<'a> tracing_subscriber::fmt::MakeWriter<'a> for Capture {
    type Writer = CaptureWriter;

    fn make_writer(&'a self) -> Self::Writer {
        CaptureWriter(Arc::clone(&self.0))
    }
}

impl Write for CaptureWriter {
    fn write(&mut self, buffer: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buffer);
        Ok(buffer.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

enum Response {
    Http { status: u16, body: Vec<u8> },
    Disconnect,
    TruncatedBody,
}

struct Server {
    address: std::net::SocketAddr,
    task: tokio::task::JoinHandle<()>,
}

impl Server {
    async fn start(responses: Vec<Response>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let responses = Arc::new(Mutex::new(VecDeque::from(responses)));
        let task = tokio::spawn(async move {
            while let Ok((mut stream, _)) = listener.accept().await {
                let mut request = Vec::new();
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
                match responses.lock().await.pop_front().unwrap() {
                    Response::Http { status, body } => {
                        let head = format!(
                            "HTTP/1.1 {status} Fixture\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                            body.len()
                        );
                        stream.write_all(head.as_bytes()).await.unwrap();
                        stream.write_all(&body).await.unwrap();
                    }
                    Response::Disconnect => {}
                    Response::TruncatedBody => {
                        stream
                            .write_all(
                                b"HTTP/1.1 200 OK\r\nContent-Length: 100\r\nConnection: close\r\n\r\n0\n",
                            )
                            .await
                            .unwrap();
                    }
                }
            }
        });
        Self { address, task }
    }

    fn url(&self) -> String {
        format!("http://{}", self.address)
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn initial_body(fixture: &support::g0::Json, state: &str) -> Vec<u8> {
    let state = fixture.get("states").get(state);
    let mut body = state.get("version").as_str().as_bytes().to_vec();
    for certificate in state.get("certificates").as_array() {
        body.push(b'\n');
        body.extend_from_slice(
            support::g0::certificate_wire(fixture, certificate.as_str()).as_bytes(),
        );
    }
    body
}

fn response(fixture: &support::g0::Json, input: &support::g0::Json) -> Response {
    match input.get("kind").as_str() {
        "http" => Response::Http {
            status: input.get("status").as_u16(),
            body: support::g0::body(fixture, input.get("body")),
        },
        "transport" => match input.get("phase").as_str() {
            "connect" => Response::Disconnect,
            "body_receive" => Response::TruncatedBody,
            phase => panic!("unknown transport phase {phase}"),
        },
        kind => panic!("unknown input kind {kind}"),
    }
}

fn error_name(error: &DatError) -> String {
    match error {
        DatError::CmsHttpStatus(status) => format!("DAT_CMS_HTTP_STATUS({status})"),
        DatError::CmsServerError(status) => format!("DAT_CMS_SERVER_ERROR({status})"),
        _ => error.code().to_string(),
    }
}

fn retry_name(retry: DatRetry) -> &'static str {
    match retry {
        DatRetry::Transient => "transient",
        DatRetry::Permanent => "permanent",
        DatRetry::State => "state",
    }
}

async fn assert_state(
    fixture: &support::g0::Json,
    manager: &DatCmsManager,
    expected_name: &str,
    case_id: &str,
) {
    let expected = fixture.get("states").get(expected_name);
    assert_eq!(
        manager.get_version().await.to_string(),
        expected.get("version").as_str(),
        "{case_id}: version"
    );

    let actual = manager.get_manager().export(false).unwrap();
    let expected_wires = expected
        .get("certificates")
        .as_array()
        .iter()
        .map(|name| support::g0::certificate_wire(fixture, name.as_str()))
        .collect::<Vec<_>>()
        .join("\n");
    assert_eq!(actual, expected_wires, "{case_id}: certificates");

    match expected.get("issuer").optional_str() {
        Some(name) => {
            let token = manager.issue("", "").unwrap();
            let dat: Dat = token.try_into().unwrap();
            let cid = u64::from_str_radix(
                fixture.get("certificates").get(name).get("cid").as_str(),
                16,
            )
            .unwrap();
            assert_eq!(dat.cid(), cid, "{case_id}: issuer");
        }
        None => assert!(manager.issue("", "").is_err(), "{case_id}: issuer"),
    }
}

#[tokio::test]
async fn all_42_g0_cases_match_the_unsigned_u64_manager_profile() {
    let fixture = support::g0::parse(include_str!("fixtures/cms_v1_state_transitions.json"));
    assert_eq!(
        fixture
            .get("project_numeric_profiles")
            .get("dat-rust")
            .as_str(),
        "unsigned_u64"
    );
    let cases = fixture.get("cases").as_array();
    assert_eq!(cases.len(), 42);

    for case in cases {
        let case_id = case.get("id").as_str();
        let initial = case.get("initial").as_str();
        let server = Server::start(vec![
            Response::Http {
                status: 200,
                body: initial_body(&fixture, initial),
            },
            response(&fixture, case.get("input")),
        ])
        .await;
        let manager = DatCmsManager::builder()
            .url(&server.url())
            .unwrap()
            .interval_off()
            .build()
            .await;
        assert_eq!(manager.last_error().await, None, "{case_id}: seed");

        let captured = Arc::new(StdMutex::new(Vec::new()));
        let subscriber = tracing_subscriber::fmt()
            .with_ansi(false)
            .without_time()
            .with_writer(Capture(Arc::clone(&captured)))
            .finish();
        let guard = tracing::subscriber::set_default(subscriber);
        let result = manager.sync().await;
        drop(guard);
        let expected = support::g0::expectation(case, "unsigned_u64");
        match expected.get("error").optional_str() {
            None => {
                assert!(result.is_ok(), "{case_id}: {result:?}");
                assert_eq!(manager.last_error().await, None, "{case_id}: last_error");
                assert_eq!(expected.get("retry").as_str(), "none");
            }
            Some(expected_error) => {
                let error = result.expect_err(case_id);
                assert_eq!(error_name(&error), expected_error, "{case_id}: error");
                assert_eq!(
                    retry_name(error.retry()),
                    expected.get("retry").as_str(),
                    "{case_id}: retry"
                );
                assert_eq!(
                    manager.last_error().await,
                    Some(error),
                    "{case_id}: last_error"
                );
            }
        }
        if let Some(observation) = expected.get("observation").optional_str() {
            let captured = captured.lock().unwrap();
            let captured = std::str::from_utf8(&captured).unwrap();
            assert!(
                captured.contains(observation),
                "{case_id}: missing observation {observation} in {captured:?}"
            );
        }
        assert_state(&fixture, &manager, expected.get("state").as_str(), case_id).await;
    }
}
