use crate::api::Api;
use crate::codes;
use axum::extract::rejection::{PathRejection, QueryRejection};
use axum::extract::{FromRequestParts, Path, Query};
use axum::http::request::Parts;
use axum::response::{IntoResponse, Response};
use serde::de::DeserializeOwned;

fn malformed(reason: String) -> Response {
    Api::code(codes::REQ_MALFORMED)
        .details(serde_json::Value::from(reason))
        .into_response()
}

pub struct ApiPath<T>(pub T);

impl<T, S> FromRequestParts<S> for ApiPath<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match Path::<T>::from_request_parts(parts, state).await {
            Ok(Path(value)) => Ok(ApiPath(value)),
            Err(rejection) => Err(malformed(path_reason(&rejection))),
        }
    }
}

pub struct ApiQuery<T>(pub T);

impl<T, S> FromRequestParts<S> for ApiQuery<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match Query::<T>::from_request_parts(parts, state).await {
            Ok(Query(value)) => Ok(ApiQuery(value)),
            Err(rejection) => Err(malformed(query_reason(&rejection))),
        }
    }
}

fn path_reason(rejection: &PathRejection) -> String {
    match rejection {
        PathRejection::FailedToDeserializePathParams(e) => e.body_text(),
        PathRejection::MissingPathParams(_) => "missing path parameters".to_string(),
        _ => "cannot parse path parameters".to_string(),
    }
}

fn query_reason(rejection: &QueryRejection) -> String {
    match rejection {
        QueryRejection::FailedToDeserializeQueryString(e) => e.body_text(),
        _ => "cannot parse query string".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::{Request, StatusCode};
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct Q {
        #[allow(dead_code)]
        version: Option<i64>,
    }

    async fn reject_query(uri: &str) -> (StatusCode, String) {
        let req = Request::builder().uri(uri).body(()).unwrap();
        let (mut parts, ()) = req.into_parts();
        let response = ApiQuery::<Q>::from_request_parts(&mut parts, &())
            .await
            .err()
            .expect("expected a rejection");
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        (status, String::from_utf8(body.to_vec()).unwrap())
    }

    #[tokio::test]
    async fn query_rejection_stays_inside_the_json_envelope() {
        let (status, body) = reject_query("/v1/certs?version=not-a-number").await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        let json: serde_json::Value = serde_json::from_str(&body)
            .unwrap_or_else(|e| panic!("거부 응답이 JSON 이 아니다: {body} ({e})"));
        assert_eq!(json["code"], crate::codes::REQ_MALFORMED);
        assert!(json.get("details").is_some(), "사유를 details 로 실어야 한다");
    }

    #[tokio::test]
    async fn valid_query_passes_through() {
        let req = Request::builder().uri("/v1/certs?version=7").body(()).unwrap();
        let (mut parts, ()) = req.into_parts();
        assert!(ApiQuery::<Q>::from_request_parts(&mut parts, &()).await.is_ok());
    }
}
