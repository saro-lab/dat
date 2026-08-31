use crate::api::ApiResult;
use anyhow::anyhow;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::time::Duration;
use tokio::sync::OnceCell;

static DB: OnceCell<DatabaseConnection> = OnceCell::const_new();

pub fn db() -> &'static DatabaseConnection {
    DB.get()
        .expect("database::connect() must be called before db()")
}

pub async fn connect(db_uri: &str, sqlx_logging: bool) -> ApiResult<()> {
    let opt = connect_options(db_uri, sqlx_logging);
    DB.set(Database::connect(opt).await?)
        .map_err(|x| anyhow!(x))?;
    Ok(())
}

fn connect_options(db_uri: &str, _sqlx_logging: bool) -> ConnectOptions {
    let mut opt = ConnectOptions::new(db_uri);

    opt.max_connections(2)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .sqlx_logging(false);

    if db_uri.starts_with("sqlite:") {
        opt.map_sqlx_sqlite_opts(|options| options.create_if_missing(true));
    }

    opt
}

pub async fn close() {
    if let Some(conn) = DB.get() {
        match conn.clone().close().await {
            Ok(()) => tracing::info!("DATABASE CLOSED"),
            Err(_) => tracing::error!("database close failed"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn sqlite_memory_uri_uses_driver_options() {
        let db = Database::connect(connect_options("sqlite::memory:", false))
            .await
            .unwrap();
        db.close().await.unwrap();
    }
}
