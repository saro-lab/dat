use crate::codes;
use crate::error::{ApiError, ApiResult};
use axum::Json;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: Option<T>) -> Self {
        Self::code(codes::OK, data)
    }

    pub fn code(code: impl Into<String>, data: Option<T>) -> Self {
        Self {
            code: code.into(),
            data,
            message: None,
        }
    }

    pub fn message(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            data: None,
            message: Some(message.into()),
        }
    }

    pub fn pass(&self) -> bool {
        self.code == codes::OK
    }

    pub fn data(self) -> ApiResult<T> {
        if self.pass()
            && let Some(data) = self.data
        {
            return Ok(data);
        }
        Err(ApiError::Null)
    }

    pub fn map<U>(self, f: impl FnOnce(T) -> Option<U>) -> ApiResponse<U> {
        let data = self.data.and_then(f);
        ApiResponse {
            code: self.code,
            data,
            message: self.message,
        }
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn json<T: Serialize>(res: &ApiResponse<T>) -> String {
        serde_json::to_string(res).unwrap()
    }

    #[test]
    fn envelope_shapes() {
        assert_eq!(json(&ApiResponse::ok(Some(1))), r#"{"code":"ok","data":1}"#);
        assert_eq!(json(&ApiResponse::<()>::ok(None)), r#"{"code":"ok"}"#);
        assert_eq!(
            json(&ApiResponse::<()>::code(codes::NOT_FOUND, None)),
            r#"{"code":"404"}"#
        );
        assert_eq!(
            json(&ApiResponse::<()>::message("cert.duplicated", "dup")),
            r#"{"code":"cert.duplicated","message":"dup"}"#
        );
    }

    #[test]
    fn deserialize_without_optional_fields() {
        let res: ApiResponse<i32> = serde_json::from_str(r#"{"code":"ok"}"#).unwrap();
        assert!(res.pass());
        assert!(res.data.is_none());
    }
}
