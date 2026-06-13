use crate::env::ENV;
use crate::middleware::database::db_pool;
use crate::middleware::error::ApiResult;
use crate::service::cms;
use axum::routing::{get, post};
use axum::{Extension, Router};
use std::net::IpAddr;

pub static API_VERSION: &str = "v1";

pub async fn router() -> Router {
    Router::new()
        .route(format!("/{API_VERSION}/cert/{{aaa}}/").as_str(), post(generate_key))
        .route(format!("/{API_VERSION}/certs").as_str(), post(generate_key))
        .route(format!("/{API_VERSION}/certs/verifying").as_str(), post(generate_key))
        .route("/health", get(health))
        .route("/version", get(version))
        .route("/version/api", get(version_api))
}

async fn health() -> &'static str { "OK" }
async fn version() -> &'static str { &ENV.version }
async fn version_api() -> &'static str { &ENV.version }

pub async fn generate_key(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (new_cid, delete_count) = cms::generate(db_pool()).await?;
    tracing::info!("{ip_addr} GENERATE CERTIFICATE [{new_cid:x}] / DELETE {delete_count} CERTIFICATES");
    Ok("OK".to_string())
}

pub async fn certificate_list(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (body, certificate_count) = cms::get_certificates(false, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} CERTIFICATES");
    Ok(body)
}

pub async fn verifying_only_certificate_list(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (body, certificate_count) = cms::get_certificates(true, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} VERIFYING CERTIFICATES");
    Ok(body)
}
