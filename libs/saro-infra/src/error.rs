use anyhow::anyhow;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use std::any::Any;
use std::net::IpAddr;
use thiserror::Error;

pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("InvalidEmail")]
    InvalidEmail(),

    // error - lv 1
    #[error("Internal")]
    Internal(#[from] anyhow::Error),
    #[error("Database")]
    Database(#[from] sea_orm::error::DbErr),
    #[error("Http")]
    Http(#[from] reqwest::Error),

    // error - lv 2
    #[allow(unused)]
    #[error("BadRequest")]
    BadRequest(String),
    #[error("NotFound")]
    NotFound(String, String, String),
    #[error("Unauthorized")]
    Unauthorized(),
    #[error("Code")]
    Code(String),
    #[error("CodeMessage")]
    CodeMessage(String, String),
    #[error("serdeUrlSer")]
    ErrSerdeUrlSer(#[from] serde_urlencoded::ser::Error),
    #[error("serdeUrlDe")]
    ErrSerdeUrlDe(#[from] serde_urlencoded::de::Error),
    #[error("Null")]
    Null(),
    #[error("Dat")]
    Dat(#[from] dat::error::DatError),

    // etc
    #[error("Etc")]
    Etc(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, body) = match &self {
            ApiError::Internal(err) => {
                tracing::error!("ERROR: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, code("error"))
            }
            ApiError::Database(err) => {
                tracing::error!("DB: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, code("error"))
            }

            ApiError::InvalidEmail() => {
                tracing::error!("Invalid Email");
                (StatusCode::UNAUTHORIZED, code("invalid_email"))
            },

            // basic
            ApiError::Unauthorized() => {
                (StatusCode::UNAUTHORIZED, code("401"))
            },
            ApiError::NotFound(method, path, ip) => {
                tracing::error!("404: {} {} {}", method, path, ip);
                (StatusCode::NOT_FOUND, code("404"))
            },

            // custom
            ApiError::Code(_code) => {
                (StatusCode::BAD_REQUEST, code(&_code))
            },
            ApiError::CodeMessage(code, message) => {
                (StatusCode::BAD_REQUEST, code_message(&code, &message))
            },

            // etc
            _ => {
                (StatusCode::INTERNAL_SERVER_ERROR, code("error"))
            }
        };

        Response::builder()
            .status(status)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .body(body)
            .unwrap()
            .into_response()
    }
}

#[allow(unused)]
fn code(code: &str) -> String {
    let mut rv = String::with_capacity(code.len() + 16);
    rv.push_str(r#"{"code":""#);
    rv.push_str(code);
    rv.push_str(r#""}"#);
    rv
}

#[allow(unused)]
fn code_message(code: &str, message: &str) -> String {
    let mut rv = String::with_capacity(code.len() + message.len() + 32);
    rv.push_str(r#"{"code":""#);
    escape_json_into(code, &mut rv);
    rv.push_str(r#"","message":""#);
    escape_json_into(message, &mut rv);
    rv.push_str(r#""}"#);
    rv
}

// serde_json과 동일한 전략: 이스케이프가 필요 없는 구간은 push_str로 통째로 복사하고,
// 특수 바이트만 개별 치환한다.
fn escape_json_into(s: &str, out: &mut String) {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let bytes = s.as_bytes();
    let mut start = 0;

    for (i, &b) in bytes.iter().enumerate() {
        if b >= 0x20 && b != b'"' && b != b'\\' {
            continue;
        }
        if start < i {
            out.push_str(&s[start..i]);
        }
        match b {
            b'"' => out.push_str("\\\""),
            b'\\' => out.push_str("\\\\"),
            0x08 => out.push_str("\\b"),
            0x0C => out.push_str("\\f"),
            b'\n' => out.push_str("\\n"),
            b'\r' => out.push_str("\\r"),
            b'\t' => out.push_str("\\t"),
            _ => {
                out.push_str("\\u00");
                out.push(HEX[(b >> 4) as usize] as char);
                out.push(HEX[(b & 0xF) as usize] as char);
            }
        }
        start = i + 1;
    }
    out.push_str(&s[start..]);
}

pub async fn handle_error_404(method: axum::http::Method, uri: axum::http::Uri, Extension(ip): Extension<IpAddr>) -> Response {
    ApiError::NotFound(method.to_string(), uri.path().to_string(), ip.to_string()).into_response()
}

pub fn handle_panic(err: Box<dyn Any + Send>) -> Response {
    let message = if let Some(s) = err.downcast_ref::<&str>() { s.to_string() }
    else if let Some(s) = err.downcast_ref::<String>() { s.clone() }
    else { "Unknown panic".to_string() };
    ApiError::Internal(anyhow!(message)).into_response()
}
