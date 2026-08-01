use crate::api::ApiResult;
use crate::database::db;
use crate::env::ENV;
use crate::services::cert_service;
use tokio_cron_scheduler::{Job, JobScheduler};

/// Returns the running scheduler so the caller can shut it down together with
/// the HTTP server and the database pool. `None` when cron is not configured.
pub async fn start() -> ApiResult<Option<JobScheduler>> {
    let Some(cron) = ENV.cron.as_ref() else {
        return Ok(None);
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

    Ok(Some(sched))
}

pub async fn stop(sched: Option<JobScheduler>) {
    if let Some(mut sched) = sched {
        match sched.shutdown().await {
            Ok(()) => tracing::info!("CRON SCHEDULER STOPPED"),
            Err(e) => tracing::error!("cron scheduler shutdown failed: {:?}", e),
        }
    }
}
