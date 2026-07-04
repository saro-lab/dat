use std::sync::LazyLock;

pub static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .pool_idle_timeout(std::time::Duration::from_secs(30))
        .pool_max_idle_per_host(10)
        .connect_timeout(std::time::Duration::from_secs(3))
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .expect("Failed to build reqwest client")
});
