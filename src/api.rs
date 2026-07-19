use crate::codes;
use anyhow::anyhow;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::any::Any;
use std::backtrace::BacktraceStatus;
use std::fmt;

pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Serialize, Deserialize, Debug)]
pub struct Api<T = Value, D = Value> {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<D>,
}

impl<T> Api<T> {
    pub fn ok(data: T) -> Self {
        Self {
            code: codes::OK.into(),
            data: Some(data),
            details: None,
        }
    }
}

impl<T, D> Api<T, D> {
    pub fn details<D2>(self, details: D2) -> Api<T, D2> {
        Api {
            code: self.code,
            data: self.data,
            details: Some(details),
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
        Err(anyhow!("api data is empty (code: {})", self.code).into())
    }

    fn status(&self) -> StatusCode {
        match self.code.as_str() {
            codes::OK => StatusCode::OK,
            codes::UNAUTHORIZED => StatusCode::UNAUTHORIZED,
            codes::NOT_FOUND => StatusCode::NOT_FOUND,
            codes::INTERNAL => StatusCode::INTERNAL_SERVER_ERROR,
            _ => StatusCode::BAD_REQUEST,
        }
    }
}

impl Api {
    pub fn ok_empty() -> Self {
        Self::code(codes::OK)
    }

    pub fn code(code: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            data: None,
            details: None,
        }
    }

    pub fn bad_request() -> Self {
        Self::code(codes::BAD_REQUEST)
    }

    pub fn unauthorized() -> Self {
        Self::code(codes::UNAUTHORIZED)
    }

    pub fn not_found() -> Self {
        Self::code(codes::NOT_FOUND)
    }

    pub fn internal() -> Self {
        Self::code(codes::INTERNAL)
    }
}

impl fmt::Display for Api {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Api({})", self.code)
    }
}

impl std::error::Error for Api {}

impl<T: Serialize, D: Serialize> IntoResponse for Api<T, D> {
    fn into_response(self) -> Response {
        (self.status(), Json(self)).into_response()
    }
}

pub struct ApiError(pub anyhow::Error);

impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

impl fmt::Debug for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self.0.downcast::<Api>() {
            Ok(api) => api.into_response(),
            Err(err) => {
                tracing::error!("ERROR: {:#}{}", err, backtrace_head(&err));
                Api::internal().into_response()
            }
        }
    }
}

fn backtrace_head(err: &anyhow::Error) -> String {
    const LINES: usize = 5;

    let bt = err.backtrace();
    if bt.status() != BacktraceStatus::Captured {
        return String::new();
    }

    let text = bt.to_string();
    let head = text
        .lines()
        .skip_while(|l| {
            l.contains("backtrace") || l.contains("anyhow") || l.trim_start().starts_with("at ")
        })
        .take(LINES)
        .collect::<Vec<_>>()
        .join("\n");
    format!("\nStack backtrace:\n{}", head)
}

pub fn handle_panic(err: Box<dyn Any + Send>) -> Response {
    let message = if let Some(s) = err.downcast_ref::<&str>() {
        s.to_string()
    } else if let Some(s) = err.downcast_ref::<String>() {
        s.clone()
    } else {
        "Unknown panic".to_string()
    };
    tracing::error!("PANIC: {}", message);
    Api::internal().into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn json<T: Serialize, D: Serialize>(res: &Api<T, D>) -> String {
        serde_json::to_string(res).unwrap()
    }

    #[test]
    fn envelope_shapes() {
        assert_eq!(json(&Api::ok(1)), r#"{"code":"ok","data":1}"#);
        assert_eq!(json(&Api::ok_empty()), r#"{"code":"ok"}"#);
        assert_eq!(json(&Api::not_found()), r#"{"code":"404"}"#);
        assert_eq!(
            json(&Api::code("cert.duplicated")),
            r#"{"code":"cert.duplicated"}"#
        );
        assert_eq!(
            json(&Api::code("x").details(serde_json::json!({"id": 1}))),
            r#"{"code":"x","details":{"id":1}}"#
        );
    }

    #[test]
    fn deserialize_without_optional_fields() {
        let res: Api = serde_json::from_str(r#"{"code":"ok"}"#).unwrap();
        assert!(res.pass());
        assert!(res.data.is_none());
    }

    #[test]
    fn data_extracts_typed_value() {
        let res: Api<i32> = serde_json::from_str(r#"{"code":"ok","data":42}"#).unwrap();
        assert_eq!(res.data().unwrap(), 42);

        let res: Api<i32> = serde_json::from_str(r#"{"code":"404"}"#).unwrap();
        assert!(res.data().is_err());
    }

    #[test]
    fn downcast_intentional_api_error() {
        let err: ApiError = Api::code("cert.not_found").into();
        let api = err.0.downcast::<Api>().unwrap();
        assert_eq!(api.code, "cert.not_found");

        let err: ApiError = anyhow!("boom").into();
        assert!(err.0.downcast::<Api>().is_err());
    }
}
