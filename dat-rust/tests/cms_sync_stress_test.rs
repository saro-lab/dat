#![cfg(feature = "dat_cms")]

use dat::cms_manager::DatCmsManager;
use dat::error::DatError;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Notify;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn one_hundred_concurrent_sync_attempts_remain_single_flight() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let requests = Arc::new(AtomicUsize::new(0));
    let second_started = Arc::new(Notify::new());
    let release_second = Arc::new(Notify::new());
    let server = {
        let requests = Arc::clone(&requests);
        let second_started = Arc::clone(&second_started);
        let release_second = Arc::clone(&release_second);
        tokio::spawn(async move {
            loop {
                let (mut stream, _) = listener.accept().await.unwrap();
                let request_number = requests.fetch_add(1, Ordering::SeqCst) + 1;
                let mut request = Vec::new();
                loop {
                    let mut buffer = [0_u8; 256];
                    let read = stream.read(&mut buffer).await.unwrap();
                    if read == 0 {
                        break;
                    }
                    request.extend_from_slice(&buffer[..read]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                if request_number == 2 {
                    second_started.notify_one();
                    release_second.notified().await;
                }
                stream
                    .write_all(
                        b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n0\n",
                    )
                    .await
                    .unwrap();
            }
        })
    };

    let manager = DatCmsManager::builder()
        .url(&format!("http://{address}"))
        .unwrap()
        .interval_off()
        .build()
        .await;
    assert_eq!(requests.load(Ordering::SeqCst), 1);

    let winner = {
        let manager = Arc::clone(&manager);
        tokio::spawn(async move { manager.sync().await })
    };
    second_started.notified().await;

    let mut contenders = Vec::new();
    for _ in 0..100 {
        let manager = Arc::clone(&manager);
        contenders.push(tokio::spawn(async move { manager.sync().await }));
    }
    for contender in contenders {
        assert_eq!(contender.await.unwrap(), Err(DatError::CmsSyncInProgress));
    }
    assert_eq!(manager.last_error().await, None);
    assert_eq!(requests.load(Ordering::SeqCst), 2);

    release_second.notify_one();
    assert_eq!(winner.await.unwrap(), Ok(()));
    assert_eq!(manager.last_error().await, None);
    assert_eq!(manager.get_version().await, 0);
    server.abort();
}
