use crate::api::ApiResult;
use crate::database::db;
use crate::env::ENV;
use crate::services::cert_service;
use tokio_cron_scheduler::{Job, JobScheduler};

pub async fn start() -> ApiResult<()> {
    let Some(cron) = ENV.cron.as_ref() else {
        return Ok(());
    };

    cert_service::register(cron.cmd.clone(), db()).await?;

    let sched = JobScheduler::new()
        .await
        .expect("Failed to create job scheduler");

    sched
        .add(
            Job::new_async(cron.expression.clone(), |_, _| {
                Box::pin(async {
                    tracing::info!("DatCertificate Generate Cron");
                    if let Some(cron) = ENV.cron.as_ref()
                        && let Err(err) = cert_service::register(cron.cmd.clone(), db()).await
                    {
                        tracing::error!("DatCertificate Generate Cron failed: {:?}", err);
                    }
                })
            })
            .expect("Failed to create cron job"),
        )
        .await
        .expect("Failed to add cron job");

    sched.start().await.expect("Failed to start job scheduler");

    Ok(())
}
