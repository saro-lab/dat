use crate::api;
use crate::middleware::database::db_pool;
use crate::middleware::error::ApiResult;
use crate::service::cms;
use axum::extract::Path;
use axum::routing::{get, post};
use axum::Router;
use dat::manager::DatManager;
use dat::signature::DatSignatureKeyExportOption;

pub async fn debug_router() -> Router {
    api::router().await
        .route("/dat", post(issue))
        .route("/dat/{dat}", get(parse))
}

async fn issue(body: String) -> ApiResult<String> {
    tracing::info!("POST /dat issue (Debug)");

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
    tracing::info!("GET /dat parse (Debug)");
    let payload = manager().await?.parse(dat.try_into()?)?.to_string_payload()?;

    Ok(format!("{}", payload))
}

async fn manager() -> ApiResult<DatManager> {
    let manager: DatManager = DatManager::new();
    let (body, _) = cms::get_certificates(DatSignatureKeyExportOption::PAIR, db_pool()).await?;
    manager.import(&body, true)?;
    Ok(manager)
}
