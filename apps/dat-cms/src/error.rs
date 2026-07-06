use axum::response::{IntoResponse, Response};
use dat::error::DatError;
use saro_infra::error::ApiError;
use sea_orm::DbErr;
use thiserror::Error;

pub type CmsResult<T> = Result<T, CmsError>;

#[derive(Error, Debug)]
pub enum CmsError {
    #[error(transparent)]
    Api(#[from] ApiError),
    #[error("Dat")]
    Dat(#[from] DatError),
}

impl From<DbErr> for CmsError {
    fn from(err: DbErr) -> Self {
        CmsError::Api(ApiError::Database(err))
    }
}

impl IntoResponse for CmsError {
    fn into_response(self) -> Response {
        match self {
            CmsError::Api(err) => err.into_response(),
            CmsError::Dat(err) => {
                tracing::error!("DAT: {:?}", err);
                ApiError::Etc(err.to_string()).into_response()
            }
        }
    }
}
