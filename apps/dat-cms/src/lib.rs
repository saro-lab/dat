use crate::database::db_pool;
use crate::env::ENV;
use crate::service::cms_service;

mod cron;
mod database;
mod dto;
mod handler;
mod handler_debug;
mod infrastructure;
mod server;
mod service;
mod env;

mod logging;

pub async fn run() {
    logging::bind();
    database::bind(&ENV.server.db_uri, ENV.server.debug).await.unwrap();
    database::migrate(db_pool()).await.unwrap();
    cms_service::bind();
    cron::bind().await.unwrap();

    let server_host = format!("0.0.0.0:{}", ENV.server.port);
    server::run(&server_host).await;
}
