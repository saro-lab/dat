use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub code: String,
    data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: Option<T>) -> Self {
        Self { code: "ok".to_string(), data }
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
