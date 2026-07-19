use crate::api::ApiResult;
use crate::entity::dat_cms_cert;
use sea_orm::{ConnectionTrait, DatabaseConnection, Schema};

pub async fn sync(db: &DatabaseConnection) -> ApiResult<()> {
    let be = db.get_database_backend();

    db.execute(
        Schema::new(be)
            .create_table_from_entity(dat_cms_cert::Entity)
            .if_not_exists(),
    )
    .await?;

    Ok(())
}
