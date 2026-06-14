use crate::env::ENV;
use crate::middleware::database::db_pool;
use crate::middleware::error::ApiResult;
use crate::service::cms;
use axum::extract::{Path, Query};
use axum::routing::{get, post};
use axum::{Extension, Router};
use serde::Deserialize;
use std::net::IpAddr;

pub static API_VERSION: &str = "v1";

#[derive(Deserialize)]
pub struct GetCertsQuery {
    ver: Option<i64>,
}


pub async fn router() -> Router {
    Router::new()
        .route(format!("/{API_VERSION}/cert/{{signature_algorithm}}/{{crypto_algorithm}}/{{certificate_propagation_delay_seconds}}/{{dat_issuance_duration_seconds}}/{{dat_ttl_seconds}}").as_str(), post(generate_key))
        .route(format!("/{API_VERSION}/certs").as_str(), get(certificate_list))
        .route(format!("/{API_VERSION}/certs/verifying").as_str(), get(verifying_only_certificate_list))
        .route("/health", get(health))
        .route("/version", get(version))
        .route("/version/api", get(version_api))
}

async fn health() -> &'static str { "OK" }
async fn version() -> &'static str { &ENV.version }
async fn version_api() -> &'static str { API_VERSION }

pub async fn generate_key(
    Path((
        signature_algorithm,
        crypto_algorithm,
        certificate_propagation_delay_seconds,
        dat_issuance_duration_seconds,
        dat_ttl_seconds,
    )): Path<(String, String, i64, i64, i64)>,
    Extension(ip_addr): Extension<IpAddr>
) -> ApiResult<String> {
    let (new_cid, delete_count) = cms::generate(
        signature_algorithm,
        crypto_algorithm,
        certificate_propagation_delay_seconds,
        dat_issuance_duration_seconds,
        dat_ttl_seconds,
        db_pool()
    ).await?;
    tracing::info!("{ip_addr} GENERATE CERTIFICATE [{new_cid:x}] / DELETE {delete_count} CERTIFICATES");
    Ok("OK".to_string())
}

pub async fn certificate_list(Query(query): Query<GetCertsQuery>, Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let ver = query.ver.unwrap_or(0);
    let (body, certificate_count) = cms::get_certificates(ver, false, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} CERTIFICATES");
    Ok(body)
}

pub async fn verifying_only_certificate_list(Query(query): Query<GetCertsQuery>, Extension(ip_addr): Extension<IpAddr>) -> ApiResult<String> {
    let ver = query.ver.unwrap_or(0);
    let (body, certificate_count) = cms::get_certificates(ver, true, db_pool()).await?;
    tracing::info!("{ip_addr} GET {certificate_count} VERIFYING CERTIFICATES");
    Ok(body)
}
