use crate::router;
use std::time::Duration;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(30);

pub async fn run(server_host: &str) {
    saro_infra::server::serve(router::bind(), server_host, SHUTDOWN_TIMEOUT).await;
}
