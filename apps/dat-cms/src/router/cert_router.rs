use crate::database::db_pool;
use crate::dto::cert::{CertificateList, ListCertificatesQuery, RegisterCertificateCommand};
use crate::env::ENV;
use crate::error::CmsResult;
use crate::request_context::RequestContext;
use crate::service::cert_service;
use axum::extract::{Path, Query};
use axum::routing::{get, post};
use axum::{Extension, Router};
use saro_infra::api_response::ApiResponse;
use serde::Deserialize;

pub static API_VERSION: &str = "v1";

#[derive(Deserialize)]
pub struct GetCertificateQuery {
    pub version: Option<i64>
}

pub fn router() -> Router {
    Router::new()
        .route(format!("/{API_VERSION}/cert/{{signature_algorithm}}/{{crypto_algorithm}}/{{certificate_propagation_delay_seconds}}/{{dat_issuance_duration_seconds}}/{{dat_ttl_seconds}}").as_str(), post(generate_certificate))
        .route(format!("/{API_VERSION}/certs").as_str(), get(get_certificate_list))
        .route(format!("/{API_VERSION}/certs.json").as_str(), get(get_certificate_list_json))
        .route(format!("/{API_VERSION}/certs/verify-only").as_str(), get(get_certificate_verify_only_list))
        .route(format!("/{API_VERSION}/certs/verify-only.json").as_str(), get(get_certificate_verify_only_list_json))
        .route("/health", get(health))
        .route("/ip", get(ip))
        .route("/version", get(version))
        .route("/version/api", get(version_api))
}

// ===============================================================
// - public api
// ===============================================================
async fn health() -> &'static str { "OK" }
async fn ip(Extension(ctx): Extension<RequestContext>) -> String { ctx.ip().to_string() }
async fn version_api() -> &'static str { API_VERSION }

// ===============================================================
// - master api
// ===============================================================
async fn version(Extension(ctx): Extension<RequestContext>) -> CmsResult<&'static str> {
    ctx.is_master()?;
    Ok(&ENV.server.version)
}
pub async fn generate_certificate(
    Path((signature_algorithm, crypto_algorithm, certificate_propagation_delay_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, )): Path<(String, String, i64, i64, i64)>,
    Extension(ctx): Extension<RequestContext>
) -> CmsResult<String> {
    ctx.is_master()?;
    let (new_cid, delete_count) = cert_service::register(
        RegisterCertificateCommand {signature_algorithm, crypto_algorithm, certificate_propagation_delay_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,},
        db_pool()
    ).await?;
    tracing::info!("{} GENERATE CERTIFICATE [{new_cid}] / DELETE {delete_count} CERTIFICATES", ctx.ip());
    Ok("OK".to_string())
}

// ===============================================================
// - cert_full api
// ===============================================================
pub async fn get_certificate_list(Query(params): Query<GetCertificateQuery>, Extension(ctx): Extension<RequestContext>) -> CmsResult<String> {
    ctx.is_cert_full()?;
    let certs = cert_service::list(ListCertificatesQuery { version: params.version.unwrap_or(0), verify_only: false }, db_pool()).await?;
    tracing::info!("{} GET {} CERTIFICATES", ctx.ip(), certs.size());
    Ok(certs.export(params.version.is_some()))
}
pub async fn get_certificate_list_json(Query(params): Query<GetCertificateQuery>, Extension(ctx): Extension<RequestContext>) -> CmsResult<ApiResponse<CertificateList>> {
    ctx.is_cert_full()?;
    let certs = cert_service::list(ListCertificatesQuery { version: params.version.unwrap_or(0), verify_only: false }, db_pool()).await?;
    tracing::info!("{} GET {} CERTIFICATES", ctx.ip(), certs.size());
    Ok(ApiResponse::ok(Some(certs)))
}

// ===============================================================
// - cert_verify api
// ===============================================================
pub async fn get_certificate_verify_only_list(Query(params): Query<GetCertificateQuery>, Extension(ctx): Extension<RequestContext>) -> CmsResult<String> {
    ctx.is_cert_verify()?;
    let certs = cert_service::list(ListCertificatesQuery { version: params.version.unwrap_or(0), verify_only: true }, db_pool()).await?;
    tracing::info!("{} GET {} VERIFY CERTIFICATES", ctx.ip(), certs.size());
    Ok(certs.export(params.version.is_some()))
}
pub async fn get_certificate_verify_only_list_json(Query(params): Query<GetCertificateQuery>, Extension(ctx): Extension<RequestContext>) -> CmsResult<ApiResponse<CertificateList>> {
    ctx.is_cert_verify()?;
    let certs = cert_service::list(ListCertificatesQuery { version: params.version.unwrap_or(0), verify_only: true }, db_pool()).await?;
    tracing::info!("{} GET {} VERIFY CERTIFICATES", ctx.ip(), certs.size());
    Ok(ApiResponse::ok(Some(certs)))
}
