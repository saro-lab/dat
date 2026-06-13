use crate::env::ENV;
use crate::middleware::database::db_pool;
use crate::middleware::error::ApiResult;
use crate::service::cms;
use tokio_cron_scheduler::{Job, JobScheduler};

pub async fn bind() -> ApiResult<()> {
    if ENV.cron_expression.is_empty() {
        return Ok(())
    }

    let sched = JobScheduler::new().await.unwrap();

    // DatCertificate Generate Cron
    cms::generate(db_pool()).await?; // initial generate
    sched.add(
        Job::new_async(ENV.cron_expression.clone(), |_,_| {
            Box::pin(async move {
                tracing::info!("DatCertificate Generate Cron");
                cms::generate(db_pool()).await.unwrap();
            })
        }).unwrap(),
    ).await.unwrap();

    sched.start().await.unwrap();

    Ok(())
}
