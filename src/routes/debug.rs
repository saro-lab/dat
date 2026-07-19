use crate::api::{Api, ApiResult};
use crate::database::db;
use crate::dto::cert::ListCertificatesQuery;
use crate::services::cert_service;
use anyhow::anyhow;
use axum::extract::Path;
use axum::routing::{get, post};
use axum::Router;
use dat::error::DatError;
use dat::manager::DatManager;
use sea_orm::DbErr;
use serde_json::json;

pub fn router() -> Router {
    Router::new()
        .route("/debug/dat", post(issue))
        .route("/debug/dat/{dat}", get(parse))
        .route("/debug/error0", get(error_0))
        .route("/debug/error1", get(error_1))
        .route("/debug/error2", get(error_2))
        .route("/debug/error3", get(error_3))
        .route("/debug/error4", get(error_4))
        .route("/debug/error5", get(error_5))
        .route("/debug/error6", get(error_6))
        .route("/debug/error7", get(error_7))
}

async fn issue(body: String) -> ApiResult<String> {
    tracing::info!("POST /debug/dat issue (Debug)");

    let lines = body
        .split('\n')
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>();

    let (plain, secret) = match lines.as_slice() {
        [] => ("", ""),
        [plain] => (*plain, ""),
        [plain, secret] => (*plain, *secret),
        _ => return Ok("ERROR: usage:\nplain\nsecure".to_string()),
    };

    Ok(manager().await?.issue(plain, secret)?)
}

async fn parse(Path(dat): Path<String>) -> ApiResult<String> {
    tracing::info!("GET /debug/dat parse (Debug)");
    let payload = manager().await?.parse(dat)?;

    Ok(format!("{}\n{}", payload.plain_text()?, payload.secure_text()?))
}

async fn manager() -> ApiResult<DatManager> {
    let manager: DatManager = DatManager::new();
    let certs = cert_service::list(
        ListCertificatesQuery {
            version: 0,
            verify_only: false,
        },
        db(),
    )
    .await?;
    manager.import(&certs.export(false), true)?;
    Ok(manager)
}

async fn error_0() -> ApiResult<Api> {
    Err(Api::code("debug.custom_code"))?
}

async fn error_1() -> ApiResult<Api> {
    Err(Api::code("debug.with_details").details(json!({"field": "name", "reason": "required"})))?
}

async fn error_2() -> ApiResult<Api<i64>> {
    let id = None::<i64>.ok_or(Api::not_found())?;
    Ok(Api::ok(id))
}

async fn error_3() -> ApiResult<Api> {
    Err(Api::unauthorized())?
}

async fn error_4() -> ApiResult<Api> {
    Err(anyhow!("unexpected error"))?
}

async fn error_5() -> ApiResult<Api> {
    Err(DbErr::Custom("custom db error".to_string()))?
}

async fn error_6() -> ApiResult<Api> {
    Err(DatError::EtcError("dat error"))?
}

async fn error_7() -> Api {
    panic!("debug panic");
}
