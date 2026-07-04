use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use crate::error::{ApiError, ApiResult};

#[derive(Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: String,
    data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: Option<T>) -> Self {
        Self { code: "ok".to_string(), data }
    }

    pub fn code(code: impl Into<String>, data: Option<T>) -> Self {
        Self { code: code.into(), data }
    }
    pub fn pass(&self) -> bool {
        self.code == "ok"
    }
    pub fn data(self) -> ApiResult<T> {
        if self.pass() && let Some(data) = self.data {
            return Ok(data)
        }
        Err(ApiError::Null())
    }

    pub fn map<U>(self, f: impl FnOnce(T) -> Option<U>) -> ApiResponse<U> {
        if let Some(from_data) = self.data && let Some(to_data) = f(from_data) {
            ApiResponse { code: self.code, data: Some(to_data) }
        } else {
            ApiResponse { code: self.code, data: None }
        }
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
