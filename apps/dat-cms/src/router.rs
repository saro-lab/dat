use crate::env::ENV;
use crate::request_context::{request_context_layer, RequestContext};
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Response};
use axum::{Extension, Router};
use saro_infra::error::{handle_panic, ApiError};
use tower_http::catch_panic::CatchPanicLayer;

mod cert_router;
mod debug_router;


pub fn bind() -> Router {
    let mut router = Router::new()
        .merge(cert_router::router());

    if ENV.server.debug {
        router = router.merge(debug_router::router());
    };

    router
        .fallback(handle_error_404)
        .layer(from_fn(request_context_layer))
        .layer(CatchPanicLayer::custom(handle_panic))
}

async fn handle_error_404(method: axum::http::Method, uri: axum::http::Uri, Extension(ctx): Extension<RequestContext>) -> Response {
    ApiError::NotFound(method.to_string(), uri.path().to_string(), ctx.ip().to_string()).into_response()
}
