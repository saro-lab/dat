use crate::env::ENV;
use std::process::ExitCode;
use std::time::Duration;

mod cron;
mod dto;
mod entity;
mod env;
mod extract;
mod request_context;
mod routes;
mod schema;
mod services;
mod state;

pub mod api;
pub mod codes;

pub mod client_ip;
pub mod database;
pub mod logging;
pub mod server;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(30);

#[tokio::main]
async fn main() -> ExitCode {
    logging::init(&ENV.log);
    if database::connect(&ENV.server.db_uri, ENV.server.debug)
        .await
        .is_err()
    {
        tracing::error!("DATABASE START FAILED");
        return ExitCode::FAILURE;
    }
    if schema::sync(database::db()).await.is_err() {
        tracing::error!("DATABASE SCHEMA SYNC FAILED");
        database::close().await;
        return ExitCode::FAILURE;
    }
    let state = state::AppState::new(
        database::db().clone(),
        services::cert_service::CertificateService::new(Duration::from_secs(
            ENV.server.db_cache_secs,
        ))
        .with_query_timeout(Duration::from_secs(ENV.server.db_query_timeout_secs)),
    );
    let scheduler = match cron::start(state.clone()).await {
        Ok(scheduler) => scheduler,
        Err(_) => {
            tracing::error!("SCHEDULER START FAILED");
            database::close().await;
            return ExitCode::FAILURE;
        }
    };

    let server_host = format!("0.0.0.0:{}", ENV.server.port);
    server::serve(
        routes::router().with_state(state),
        &server_host,
        SHUTDOWN_TIMEOUT,
    )
    .await;

    cron::stop(scheduler).await;
    database::close().await;
    tracing::info!("SHUTDOWN COMPLETE");
    ExitCode::SUCCESS
}
