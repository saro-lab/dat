use crate::services::cert_service::CertificateService;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub certificates: Arc<CertificateService>,
}

impl AppState {
    pub fn new(db: DatabaseConnection, certificates: CertificateService) -> Self {
        Self {
            db,
            certificates: Arc::new(certificates),
        }
    }
}
