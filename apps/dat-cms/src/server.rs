use crate::env::ENV;
use crate::infrastructure::session::session_layout;
use crate::{handler, handler_debug};
use axum::middleware::from_fn;
use saro_infra::error::{handle_error_404, handle_panic};
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::catch_panic::CatchPanicLayer;

// matches terminationGracePeriodSeconds in .github/deployment/*.yaml
const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(30);

pub async fn run(server_host: &str) {
    let router = if ENV.server.debug {
        handler_debug::debug_router().await
    } else {
        handler::router().await
    };

    let router = router
        .layer(from_fn(session_layout))
        .layer(ServiceBuilder::new().layer(CatchPanicLayer::custom(handle_panic)))
        .fallback(handle_error_404);

    saro_infra::server::serve(router, server_host, SHUTDOWN_TIMEOUT).await;
}
