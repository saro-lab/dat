use crate::api::ApiResult;
use crate::env::{ENV, EnvCron};
use crate::state::AppState;
use tokio_cron_scheduler::{Job, JobScheduler};

pub async fn start(state: AppState) -> ApiResult<Option<JobScheduler>> {
    start_with_config(state, ENV.cron.as_ref()).await
}

async fn start_with_config(
    state: AppState,
    config: Option<&EnvCron>,
) -> ApiResult<Option<JobScheduler>> {
    let Some(cron) = config else {
        return Ok(None);
    };

    state
        .certificates
        .register(cron.cmd.clone(), &state.db)
        .await?;

    let sched = JobScheduler::new()
        .await
        .expect("Failed to create job scheduler");

    let state_for_jobs = state.clone();
    sched
        .add(
            Job::new_async(cron.expression.clone(), move |_, _| {
                let state = state_for_jobs.clone();
                Box::pin(async move {
                    tracing::info!("DatCertificate Generate Cron");
                    if let Some(cron) = ENV.cron.as_ref()
                        && state
                            .certificates
                            .register(cron.cmd.clone(), &state.db)
                            .await
                            .is_err()
                    {
                        tracing::error!("DatCertificate Generate Cron failed");
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema;
    use crate::services::cert_service::CertificateService;
    use sea_orm::Database;
    use std::time::Duration;

    fn config() -> EnvCron {
        EnvCron {
            expression: "0/30 * * * * *".to_string(),
            cmd: crate::dto::cert::RegisterCertificateCommand {
                signature_algorithm: "HMAC-SHA512-MFS".to_string(),
                crypto_algorithm: "IV-AES256-GCM".to_string(),
                certificate_propagation_delay_seconds: 0,
                dat_issuance_duration_seconds: 60,
                dat_ttl_seconds: 60,
            },
        }
    }

    async fn state(schema_ready: bool) -> AppState {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        if schema_ready {
            schema::sync(&db).await.unwrap();
        }
        AppState::new(db, CertificateService::new(Duration::from_secs(1)))
    }

    #[tokio::test]
    async fn no_cron_configuration_is_a_noop() {
        assert!(
            start_with_config(state(false).await, None)
                .await
                .unwrap()
                .is_none()
        );
    }

    #[tokio::test]
    async fn initial_registration_failure_does_not_start_scheduler() {
        assert!(
            start_with_config(state(false).await, Some(&config()))
                .await
                .is_err()
        );
    }

    #[tokio::test]
    async fn started_scheduler_stops_within_bound() {
        let scheduler = start_with_config(state(true).await, Some(&config()))
            .await
            .unwrap();
        tokio::time::timeout(Duration::from_secs(2), stop(scheduler))
            .await
            .unwrap();
    }
}
