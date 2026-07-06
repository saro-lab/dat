use crate::database::db_pool;
use crate::env::ENV;

mod cron;
mod database;
mod dto;
mod entity;
mod env;
mod error;
mod request_context;
mod router;
mod server;
mod service;

pub async fn run() {
    saro_infra::logging::bind(&ENV.log);
    database::bind(&ENV.server.db_uri, ENV.server.debug).await.unwrap();
    database::migrate(db_pool()).await.unwrap();
    cron::bind().await.unwrap();

    let server_host = format!("0.0.0.0:{}", ENV.server.port);
    server::run(&server_host).await;
}
