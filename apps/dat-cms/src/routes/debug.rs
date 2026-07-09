use crate::dto::cert::ListCertificatesQuery;
use crate::request_context::RequestContext;
use crate::services::cert_service;
use anyhow::anyhow;
use axum::extract::Path;
use axum::routing::{get, post};
use axum::{Extension, Router};
use dat::error::DatError;
use dat::manager::DatManager;
use saro_core::error::{ApiError, ApiResult, ErrMap};
use saro_infra::database::db;
use sea_orm::DbErr;

pub fn router() -> Router {
    Router::new()
        .route("/debug/dat", post(issue))
        .route("/debug/dat/{dat}", get(parse))
        .route("/debug/error1", get(error1))
        .route("/debug/error2", get(error2))
        .route("/debug/error3", get(error3))
        .route("/debug/error4", get(error4))
        .route("/debug/error5", get(error5))
        .route("/debug/error6", get(error6))
        .route("/debug/error7", get(error7))
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

    manager().await?.issue(plain, secret).err_map()
}

async fn parse(Path(dat): Path<String>) -> ApiResult<String> {
    tracing::info!("GET /debug/dat parse (Debug)");
    let payload = manager().await?.parse(dat).err_map()?;

    Ok(format!("{}\n{}", payload.plain_text().err_map()?, payload.secure_text().err_map()?))
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
    manager.import(&certs.export(false), true).err_map()?;
    Ok(manager)
}

async fn error1() -> ApiResult<()> {
    panic!("panic error")
}

async fn error2() -> ApiResult<()> {
    let _ = 1 / 0;
    Ok(())
}

async fn error3() -> ApiResult<()> {
    Err(ApiError::Internal(anyhow!("any error")))
}

async fn error4() -> ApiResult<()> {
    Err(DbErr::Custom("custom db error".to_string()))?
}

async fn error5() -> ApiResult<()> {
    Err(DatError::EtcError("dat error")).err_map()
}

async fn error6() -> ApiResult<()> {
    Err(ApiError::BadRequest)
}

async fn error7(Extension(_): Extension<RequestContext>) -> ApiResult<()> {
    Err(ApiError::Unauthorized)
}
