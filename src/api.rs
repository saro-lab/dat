use crate::env::ENV;
use crate::middleware::database::db_pool;
use crate::middleware::error::ApiResult;
use crate::service::cms;
use axum::routing::{get, post};
use axum::{Extension, Router};
use dat::signature::DatSignatureKeyExportOption;
use std::net::IpAddr;

pub async fn router() -> Router {
    Router::new()
        .route("/certificates", post(generate_key))
        .route("/certificates", get(pair_certificate_list))
        .route("/certificates/signing", get(signing_certificate_list))
        .route("/certificates/verifying", get(verifying_certificate_list))
        .route("/health", get(health))
        .route("/version", get(version))
}

async fn health() -> &'static str { "OK" }
async fn version() -> &'static str { &ENV.version }

pub async fn generate_key(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (new_cid, delete_count) = cms::generate(db_pool()).await?;
    tracing::info!("{ip_addr} GENERATE CERTIFICATE [{new_cid:x}] / DELETE {delete_count} CERTIFICATES");
    Ok("OK".to_string())
}

pub async fn pair_certificate_list(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (body, certificate_count) = cms::get_certificates(DatSignatureKeyExportOption::PAIR, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} PAIR CERTIFICATES");
    Ok(body)
}

pub async fn signing_certificate_list(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (body, certificate_count) = cms::get_certificates(DatSignatureKeyExportOption::SIGNING, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} SIGNING CERTIFICATES");
    Ok(body)
}

pub async fn verifying_certificate_list(Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let (body, certificate_count) = cms::get_certificates(DatSignatureKeyExportOption::VERIFYING, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} VERIFYING CERTIFICATES");
    Ok(body)
}
