use crate::api::{handle_panic, Api};
use crate::codes;
use crate::env::ENV;
use crate::request_context::{request_context_layer, RequestContext};
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Response};
use axum::{Extension, Router};
use tower_http::catch_panic::CatchPanicLayer;

mod cert;
mod debug;

pub fn router() -> Router {
    let mut router = Router::new().merge(cert::router());

    if ENV.server.debug {
        router = router.merge(debug::router());
    };

    router
        .fallback(handle_error_404)
        .method_not_allowed_fallback(handle_error_405)
        .layer(from_fn(request_context_layer))
        .layer(CatchPanicLayer::custom(handle_panic))
}

async fn handle_error_404(
    method: axum::http::Method,
    uri: axum::http::Uri,
    Extension(ctx): Extension<RequestContext>,
) -> Response {
    tracing::error!("{}: 404 {} {} {}", codes::REQ_NOT_FOUND, method, uri.path(), ctx.ip());
    Api::not_found().into_response()
}

async fn handle_error_405(
    method: axum::http::Method,
    uri: axum::http::Uri,
    Extension(ctx): Extension<RequestContext>,
) -> Response {
    tracing::error!("{}: 405 {} {} {}", codes::REQ_NOT_FOUND, method, uri.path(), ctx.ip());
    (StatusCode::METHOD_NOT_ALLOWED, Api::not_found()).into_response()
}
