use crate::codes;
use anyhow::anyhow;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use dat::error::DatError;
use sea_orm::DbErr;
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
        codes::status_of(&self.code)
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

    /// 경로·쿼리 파라미터·인자를 해석할 수 없음 (400).
    pub fn bad_request() -> Self {
        Self::code(codes::REQ_MALFORMED)
    }

    /// 토큰 없음 또는 불일치 (401).
    pub fn unauthorized() -> Self {
        Self::code(codes::AUTH_UNAUTHORIZED)
    }

    /// 토큰은 유효하나 이 등급으로는 접근 불가 (403).
    ///
    /// 예전에는 이 개념 자체가 없어 권한 등급 부족도 401 이었다. 클라이언트가
    /// "토큰을 고쳐라"와 "이 엔드포인트는 권한 밖이다"를 구분할 수 없었다.
    pub fn forbidden() -> Self {
        Self::code(codes::AUTH_FORBIDDEN)
    }

    /// 라우트 없음 또는 메서드 불일치 (404·405).
    pub fn not_found() -> Self {
        Self::code(codes::REQ_NOT_FOUND)
    }

    /// 재시도가 무의미한 저장소 실패 (500).
    pub fn internal() -> Self {
        Self::code(codes::STORE_UNKNOWN)
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
        // 1) 의도적으로 만든 봉투는 그대로 나간다.
        let err = match self.0.downcast::<Api>() {
            Ok(api) => return api.into_response(),
            Err(err) => err,
        };

        // 2) dat crate 의 공통 코드는 서버 전용 코드로 갈아치우지 않고 그대로 내보낸다.
        //    인증서·키 규격은 모든 공식 클라이언트가 공유하는 계약이므로, 클라이언트가 받는
        //    코드도 자기가 아는 그 코드여야 한다.
        if let Some(dat_err) = err.downcast_ref::<DatError>() {
            tracing::error!("ERROR[{}]: {:#}", dat_err.code(), err);
            return Api::code(dat_err.code()).into_response();
        }

        // 3) DB 오류는 일시적/영구로 가른다. 이 갈림이 없으면 클라이언트가 백오프를
        //    걸 수 없어, 테이블이 없는 상태에도 60초마다 영원히 재시도한다.
        if let Some(db_err) = err.downcast_ref::<DbErr>() {
            let code = store_code(db_err);
            tracing::error!("ERROR[{}]: {:#}{}", code, err, backtrace_head(&err));
            return Api::code(code).into_response();
        }

        tracing::error!("ERROR: {:#}{}", err, backtrace_head(&err));
        Api::internal().into_response()
    }
}

/// `DbErr` → 저장소 코드.
///
/// 일시적(연결 끊김·풀 고갈·락 경합·타임아웃)만 503 으로 내보낸다. 나머지 —
/// 테이블 없음, 스키마 불일치, 손상된 행 — 는 재시도해도 그대로이므로 500 이다.
fn store_code(err: &DbErr) -> &'static str {
    match err {
        // 연결을 얻지 못했거나 끊겼다. 풀 고갈·락 경합·acquire 타임아웃이 여기로 온다.
        DbErr::ConnectionAcquire(_) | DbErr::Conn(_) => codes::STORE_UNAVAILABLE,
        _ => codes::STORE_UNKNOWN,
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
        // code 에 숫자를 넣지 않는다. 예전에는 {"code":"404"} 였다.
        assert_eq!(json(&Api::not_found()), r#"{"code":"DAT_REQ_NOT_FOUND"}"#);
        assert_eq!(
            json(&Api::code("cert.duplicated")),
            r#"{"code":"cert.duplicated"}"#
        );
        assert_eq!(
            json(&Api::code("x").details(serde_json::json!({"id": 1}))),
            r#"{"code":"x","details":{"id":1}}"#
        );
    }

    /// 오류 코드 회귀 안전망 (error-cms.md).
    ///
    /// 단언하는 것은 "실패했다"가 아니라 **어느 코드로 실패했다** 이다.
    mod error_codes {
        use super::*;

        fn code_of(err: ApiError) -> String {
            let response_code = err
                .0
                .downcast_ref::<Api>()
                .map(|api| api.code.clone())
                .or_else(|| err.0.downcast_ref::<DatError>().map(|e| e.code().to_string()))
                .or_else(|| err.0.downcast_ref::<DbErr>().map(|e| store_code(e).to_string()));
            response_code.unwrap_or_else(|| codes::STORE_UNKNOWN.to_string())
        }

        #[test]
        fn auth_split_401_from_403() {
            // 예전에는 토큰 미제공·불일치·권한 등급 부족이 전부 401 하나였다.
            assert_eq!(Api::unauthorized().code, codes::AUTH_UNAUTHORIZED);
            assert_eq!(Api::forbidden().code, codes::AUTH_FORBIDDEN);
            assert_eq!(Api::unauthorized().status(), StatusCode::UNAUTHORIZED);
            assert_eq!(Api::forbidden().status(), StatusCode::FORBIDDEN);
        }

        #[test]
        fn db_errors_split_transient_from_permanent() {
            // 일시적: 클라이언트가 백오프를 걸어야 한다.
            assert_eq!(
                store_code(&DbErr::ConnectionAcquire(
                    sea_orm::ConnAcquireErr::Timeout
                )),
                codes::STORE_UNAVAILABLE,
            );
            assert_eq!(
                codes::status_of(codes::STORE_UNAVAILABLE),
                StatusCode::SERVICE_UNAVAILABLE,
            );

            // 영구: 테이블 없음·스키마 불일치·손상된 행. 재시도가 무의미하다.
            assert_eq!(
                store_code(&DbErr::Custom("no such table".into())),
                codes::STORE_UNKNOWN,
            );
            assert_eq!(
                codes::status_of(codes::STORE_UNKNOWN),
                StatusCode::INTERNAL_SERVER_ERROR,
            );
        }

        #[test]
        fn dat_common_codes_pass_through_untouched() {
            // 인증서·키 규격은 모든 공식 클라이언트가 공유하는 계약이다. 서버 전용 코드로
            // 갈아치우면 클라이언트가 모르는 코드를 받는다.
            let err: ApiError = DatError::CertMalformed("bad field").into();
            assert_eq!(code_of(err), "DAT_CERT_MALFORMED");

            let err: ApiError = DatError::ConfigAlgUnsupported("BOGUS".into()).into();
            assert_eq!(code_of(err), "DAT_CONFIG_ALG_UNSUPPORTED");
        }

        #[test]
        fn unknown_code_no_longer_falls_back_to_400() {
            // api.rs 의 `_ => BAD_REQUEST` 폴백은 서버 버그를 클라이언트 입력 오류로
            // 보고했다.
            assert_eq!(
                Api::code("never.defined").status(),
                StatusCode::INTERNAL_SERVER_ERROR,
            );
        }

        #[test]
        fn alg_unsupported_is_a_client_error() {
            // 실측: POST /v1/cert/BOGUS-ALG/... -> 500 이었다. 이제 400 이다.
            assert_eq!(
                Api::code(codes::REQ_ALG_UNSUPPORTED).status(),
                StatusCode::BAD_REQUEST,
            );
        }
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

        let res: Api<i32> = serde_json::from_str(r#"{"code":"DAT_REQ_NOT_FOUND"}"#).unwrap();
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
