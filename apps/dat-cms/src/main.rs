use crate::env::ENV;
use saro_infra::database;
use std::time::Duration;

mod cron;
mod dto;
mod entity;
mod env;
mod request_context;
mod routes;
mod schema;
mod services;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(30);

#[tokio::main]
async fn main() {
    saro_infra::logging::init(&ENV.log);
    database::connect(&ENV.server.db_uri, ENV.server.debug)
        .await
        .unwrap();
    schema::sync(database::db()).await.unwrap();
    cron::start().await.unwrap();

    let server_host = format!("0.0.0.0:{}", ENV.server.port);
    saro_infra::server::serve(routes::router(), &server_host, SHUTDOWN_TIMEOUT).await;
}
