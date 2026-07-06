use crate::database::db_pool;
use crate::dto::cert::ListCertificatesQuery;
use crate::error::CmsResult;
use crate::request_context::RequestContext;
use crate::service::cert_service;
use axum::extract::Path;
use axum::routing::{get, post};
use axum::{Extension, Router};
use dat::error::DatError;
use dat::manager::DatManager;
use saro_infra::error::ApiError::{BadRequest, Unauthorized};
use saro_infra::error::ApiError;
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

async fn issue(body: String) -> CmsResult<String> {
    tracing::info!("POST /debug/dat issue (Debug)");

    let lines = body.split('\n')
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

async fn parse(Path(dat): Path<String>) -> CmsResult<String> {
    tracing::info!("GET /debug/dat parse (Debug)");
    let payload = manager().await?.parse(dat)?;

    Ok(format!("{}\n{}", payload.plain_text()?, payload.secure_text()?))
}

async fn manager() -> CmsResult<DatManager> {
    let manager: DatManager = DatManager::new();
    manager.import(&cert_service::list(ListCertificatesQuery { version: 0, verify_only: false }, db_pool()).await?.export(false), true)?;
    Ok(manager)
}

async fn error1() -> CmsResult<()> {
    panic!("panic error")
}

async fn error2() -> CmsResult<()> {
    let _ = 1 / 0;
    Ok(())
}

async fn error3() -> CmsResult<()> {
    Err(ApiError::Etc("any error".to_string()))?
}

async fn error4() -> CmsResult<()> {
    Err(DbErr::Custom("custom db error".to_string()))?
}

async fn error5() -> CmsResult<()> {
    Err(DatError::EtcError("dat error"))?
}

async fn error6() -> CmsResult<()> {
    Err(BadRequest("bad request error".to_string()))?
}

async fn error7(Extension(_): Extension<RequestContext>) -> CmsResult<()> {
    Err(Unauthorized())?
}
