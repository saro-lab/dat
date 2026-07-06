use crate::database::db_pool;
use crate::env::ENV;
use crate::error::CmsResult;
use crate::service::cert_service;
use tokio_cron_scheduler::{Job, JobScheduler};

pub async fn bind() -> CmsResult<()> {
    let Some(cron) = ENV.cron.as_ref() else {
        return Ok(());
    };

    cert_service::register(cron.cmd.clone(), db_pool()).await?;

    let sched = JobScheduler::new().await.expect("Failed to create job scheduler");

    sched.add(
        Job::new_async(cron.expression.clone(), |_, _| {
            Box::pin(async {
                tracing::info!("DatCertificate Generate Cron");
                if let Some(cron) = ENV.cron.as_ref()
                    && let Err(err) = cert_service::register(cron.cmd.clone(), db_pool()).await {
                    tracing::error!("DatCertificate Generate Cron failed: {:?}", err);
                }
            })
        }).expect("Failed to create cron job"),
    ).await.expect("Failed to add cron job");

    sched.start().await.expect("Failed to start job scheduler");

    Ok(())
}
