use std::fs;
use std::fs::File;
use std::path::Path;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use std::sync::LazyLock;
use std::time::Duration;
use anyhow::anyhow;
use tokio::sync::OnceCell;
use crate::error::ApiResult;

static DB_POOL: LazyLock<OnceCell<DatabaseConnection>> = LazyLock::new(|| OnceCell::new());

pub fn db_pool() -> &'static DatabaseConnection {
    DB_POOL.get().unwrap()
}

pub async fn bind(db_uri: &str, debug: bool) -> ApiResult<()> {
    if let Some(file_path) = db_uri.strip_prefix("sqlite:") {
        handle_sqlite_specifics(file_path).await?;
    }

    let mut opt = ConnectOptions::new(db_uri);

    opt
        .max_connections(2)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .sqlx_logging(debug);

    DB_POOL.set(Database::connect(opt).await?)
        .map_err(|x| anyhow!(x))?;
    Ok(())
}

async fn handle_sqlite_specifics(file_path: &str) -> Result<(), DbErr> {
    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent).map_err(|x| {
            DbErr::Custom(format!("Failed to create directory: {}", x))
        })?;
    }
    let path = Path::new(file_path);
    if !path.exists() {
        File::create(file_path).expect("Unable to create file");
    }
    Ok(())
}
