use crate::api::ApiResult;
use anyhow::anyhow;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use std::fs;
use std::fs::File;
use std::path::Path;
use std::time::Duration;
use tokio::sync::OnceCell;

static DB: OnceCell<DatabaseConnection> = OnceCell::const_new();

pub fn db() -> &'static DatabaseConnection {
    DB.get()
        .expect("database::connect() must be called before db()")
}

pub async fn connect(db_uri: &str, sqlx_logging: bool) -> ApiResult<()> {
    if let Some(file_path) = db_uri.strip_prefix("sqlite:") {
        prepare_sqlite_file(file_path)?;
    }

    let mut opt = ConnectOptions::new(db_uri);

    opt.max_connections(2)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .sqlx_logging(sqlx_logging);

    DB.set(Database::connect(opt).await?)
        .map_err(|x| anyhow!(x))?;
    Ok(())
}

fn prepare_sqlite_file(file_path: &str) -> Result<(), DbErr> {
    let path = Path::new(file_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|x| DbErr::Custom(format!("Failed to create directory: {}", x)))?;
    }
    if !path.exists() {
        File::create(path)
            .map_err(|x| DbErr::Custom(format!("Failed to create database file: {}", x)))?;
    }
    Ok(())
}
