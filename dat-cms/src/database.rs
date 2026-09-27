use crate::api::ApiResult;
use anyhow::{Context, anyhow};
use sea_orm::sqlx::{ConnectOptions as _, sqlite::SqliteConnectOptions};
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::time::Duration;
use tokio::sync::OnceCell;

static DB: OnceCell<DatabaseConnection> = OnceCell::const_new();

pub fn db() -> &'static DatabaseConnection {
    DB.get()
        .expect("database::connect() must be called before db()")
}

pub async fn connect(db_uri: &str, sqlx_logging: bool) -> ApiResult<()> {
    let opt = connect_options(db_uri, sqlx_logging).await?;
    DB.set(Database::connect(opt).await?)
        .map_err(|x| anyhow!(x))?;
    Ok(())
}

async fn connect_options(db_uri: &str, _sqlx_logging: bool) -> anyhow::Result<ConnectOptions> {
    let mut opt = ConnectOptions::new(db_uri);

    opt.max_connections(2)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .sqlx_logging(false);

    if db_uri.starts_with("sqlite:") {
        let sqlite_options = db_uri.parse::<SqliteConnectOptions>()?;
        let in_memory = sqlite_options
            .clone()
            .filename("data.db")
            .to_url_lossy()
            .query_pairs()
            .any(|(key, value)| key == "mode" && value == "memory");
        if !in_memory
            && let Some(parent) = sqlite_options
                .get_filename()
                .parent()
                .filter(|parent| !parent.as_os_str().is_empty())
        {
            tokio::fs::create_dir_all(parent)
                .await
                .context("Failed to create SQLite database directory")?;
        }
        opt.map_sqlx_sqlite_opts(|options| options.create_if_missing(true));
    }

    Ok(opt)
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
    use sea_orm::ConnectionTrait;
    use std::path::PathBuf;

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let path = std::env::temp_dir()
                .join(format!("dat-cms-sqlite-{:032x}", rand::random::<u128>()));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    async fn open(db_uri: &str) -> DatabaseConnection {
        Database::connect(connect_options(db_uri, false).await.unwrap())
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn sqlite_memory_uri_uses_driver_options() {
        let root = TestDirectory::new();
        for uri in [
            "sqlite::memory:".to_owned(),
            format!("sqlite:{}/missing/data.db?mode=memory", root.0.display()),
            format!(
                "sqlite:{}/missing/data.db?m%6fde=mem%6fry",
                root.0.display()
            ),
        ] {
            let db = open(&uri).await;
            crate::schema::sync(&db).await.unwrap();
            db.close().await.unwrap();
        }
        assert_eq!(std::fs::read_dir(&root.0).unwrap().count(), 0);
    }

    #[tokio::test]
    async fn sqlite_creates_parent_directories_and_preserves_existing_database() {
        let root = TestDirectory::new();
        let path = root.0.join("nested/data/data.db");
        let uri = format!("sqlite:{}", path.display());
        assert!(!path.parent().unwrap().exists());

        let db = open(&uri).await;
        db.execute_unprepared("CREATE TABLE startup_probe (value INTEGER NOT NULL)")
            .await
            .unwrap();
        db.close().await.unwrap();
        assert!(path.is_file());

        let db = open(&uri).await;
        db.execute_unprepared("INSERT INTO startup_probe (value) VALUES (1)")
            .await
            .unwrap();
        db.close().await.unwrap();
    }

    #[tokio::test]
    async fn sqlite_directory_creation_respects_encoded_paths_and_query_parameters() {
        let root = TestDirectory::new();
        let path = root.0.join("nested storage/data.db");
        let encoded_path = path.to_string_lossy().replace(' ', "%20");
        let db = open(&format!("sqlite://{encoded_path}?mode=rwc&cache=shared")).await;
        crate::schema::sync(&db).await.unwrap();
        db.close().await.unwrap();
        assert!(path.is_file());
        assert_eq!(std::fs::read_dir(&root.0).unwrap().count(), 1);
        assert_eq!(
            std::fs::read_dir(path.parent().unwrap()).unwrap().count(),
            1
        );
    }

    #[tokio::test]
    async fn sqlite_directory_creation_failure_is_returned() {
        let root = TestDirectory::new();
        let file = root.0.join("not-a-directory");
        std::fs::write(&file, "existing file").unwrap();
        let uri = format!("sqlite:{}/data.db", file.display());
        assert!(connect_options(&uri, false).await.is_err());
        assert_eq!(std::fs::read_to_string(file).unwrap(), "existing file");
    }
}
