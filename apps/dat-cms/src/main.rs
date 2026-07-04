#[tokio::main]
async fn main() {
    #[cfg(target_os = "windows")]
    {
        let _ = ::rustls::crypto::ring::default_provider().install_default();
    }

    dat_cms::run().await;
}
