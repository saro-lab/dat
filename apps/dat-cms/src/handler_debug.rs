use axum::extract::Path;
use axum::routing::{get, post};
use axum::{Extension, Router};
use dat::error::DatError;
use dat::manager::DatManager;
use sea_orm::DbErr;
use saro_infra::database::db_pool;
use saro_infra::error::ApiError::{BadRequest, Unauthorized};
use saro_infra::error::{ApiError, ApiResult};
use crate::dto::certificates::GetListCmd;
use crate::handler;
use crate::infrastructure::session::Session;
use crate::service::cms_service;

pub async fn debug_router() -> Router {
    handler::router().await
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

    let mut plain = String::new();
    let mut secret = String::new();

    let lines = body.split('\n')
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>();

    match lines.len() {
        2 => {
            plain = lines[0].to_string();
            secret = lines[1].to_string();
        },
        1 => {
            plain = lines[0].to_string();
        },
        0 => {},
        _ => {
            return Ok("ERROR: usage:\nplain\nsecure".to_string())
        }
    }

    Ok(manager().await?.issue(&plain, &secret)?)
}

async fn parse(Path(dat): Path<String>) -> ApiResult<String> {
    tracing::info!("GET /debug/dat parse (Debug)");
    let payload = manager().await?.parse(dat)?;

    Ok(format!("{}\n{}", payload.plain_text()?, payload.secure_text()?))
}

async fn manager() -> ApiResult<DatManager> {
    let manager: DatManager = DatManager::new();
    manager.import(&cms_service::list(GetListCmd { version: 0, verify_only: false }, db_pool()).await?.export(false), true)?;
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
    Err(ApiError::Etc("any error".to_string()))?
}

async fn error4() -> ApiResult<()> {
    Err(DbErr::Custom("custom db error".to_string()))?
}

async fn error5() -> ApiResult<()> {
    Err(DatError::EtcError("dat error"))?
}

async fn error6() -> ApiResult<()> {
    Err(BadRequest("bad request error".to_string()))?
}

async fn error7(Extension(_): Extension<Session>) -> ApiResult<()> {
    Err(Unauthorized())?
}
