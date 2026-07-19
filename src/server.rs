use axum::Router;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::signal;
use tokio::sync::oneshot;

pub async fn serve(router: Router, addr: &str, shutdown_timeout: Duration) {
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("START SERVER {}", addr);

    let service = router
        .into_make_service_with_connect_info::<SocketAddr>();

    let (shutdown_started_tx, shutdown_started_rx) = oneshot::channel::<()>();

    let server = axum::serve(listener, service)
        .with_graceful_shutdown(async move {
            shutdown_signal().await;
            let _ = shutdown_started_tx.send(());
        });

    tokio::select! {
        result = server => {
            if let Err(e) = result {
                tracing::error!("server error: {:?}", e);
            }
        }
        _ = wait_then_sleep(shutdown_started_rx, shutdown_timeout) => {
            tracing::warn!("graceful shutdown exceeded {:?}, forcing exit", shutdown_timeout);
        }
    }

    tracing::info!("SERVER STOPPED");
}

async fn wait_then_sleep(started: oneshot::Receiver<()>, timeout: Duration) {
    if started.await.is_ok() {
        tokio::time::sleep(timeout).await;
    } else {
        std::future::pending::<()>().await;
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("shutdown signal: Ctrl+C"),
        _ = terminate => tracing::info!("shutdown signal: SIGTERM"),
    }
}
