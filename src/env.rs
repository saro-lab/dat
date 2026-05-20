use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use std::env;
use std::str::FromStr;
use std::sync::LazyLock;

pub static ENV: LazyLock<Env> = LazyLock::new(|| bind());

pub struct Env {
    pub version: String,

    // server
    pub hostname: String,
    pub port: u16,

    // algorithm
    pub signature: DatSignatureAlgorithm,
    pub crypto: DatCryptoAlgorithm,

    // db
    pub db_uri: String,

    // debug
    pub debug: bool,

    // log
    pub log_console: bool,
    pub log_file: bool,
    pub log_json: bool,

    pub cron: bool,

    pub issue_delay: u64,
    pub issue_ttl: u64,
    pub dat_ttl: u64,
}

fn bind() -> Env {
    let version = env!("CARGO_PKG_VERSION").to_string();

    println!("DAT Certificate Management Service v{}", version);

    let hostname = env_str("HOSTNAME", "localhost");
    let port = env_parse("PORT", 8088);
    println!("hostname: {}", hostname);
    println!("port: {}", port);

    let signature = env_parse("SIGNATURE", DatSignatureAlgorithm::P256);
    let crypto = env_parse("CRYPTO", DatCryptoAlgorithm::AES128GCMN);
    println!("signature: {}", signature);
    println!("crypto: {}", crypto);

    let db_uri = env_str("DB_URI", "sqlite:./data/data.db");
    println!("db_uri: {}", db_uri);

    let debug = env_str("DEBUG", if cfg!(debug_assertions) { "1" } else { "0" }) == "1";
    println!("mode: {}", if debug { "debug" } else { "release" });

    let log_console = env_str("LOG_CONSOLE", "1") == "1";
    let log_json = env_str("LOG_FILE", "").to_uppercase() == "JSON";
    let log_file = log_json || env_str("LOG_FILE", "").to_uppercase() == "TEXT";
    println!("log console: {}", if log_console { "on" } else { "off" });
    println!("log file: {}", if log_file { if log_json { "json" } else { "text" } } else { "off" });

    let cron = env_str("SINGLE_SERVER", if debug { "CRON" } else { "" }).to_uppercase() == "CRON";
    if cron {
        if env_has("ISSUE_DELAY") || env_has("ISSUE_TTL") || env_has("DAT_TTL") {
            panic!("In SINGLE_SERVER mode, you cannot configure ISSUE_DELAY, ISSUE_TTL, or DAT_TTL.");
        }
        println!("single server mode: CRON (0 0/10 * * * *)");
    }

    let issue_delay = env_parse("ISSUE_DELAY", if debug { 1 } else { 3600 });
    let issue_ttl = env_parse("ISSUE_TTL", 3600);
    let dat_ttl = env_parse("DAT_TTL", 1800);

    if issue_delay <= 0 {
        panic!("issue_delay (secs) should be > 0");
    }
    if issue_ttl <= 300 {
        panic!("issue_ttl (secs) should be > 300 (5min)");
    }
    if dat_ttl <= 300 {
        panic!("dat_ttl (secs) should be > 300 (5min)");
    }

    println!("issue_delay: {} secs", issue_delay);
    println!("issue_ttl: {} secs", issue_ttl);
    println!("dat_ttl: {} secs", dat_ttl);

    Env {
        version,
        hostname,
        port,
        signature,
        crypto,
        db_uri,
        debug,
        log_console,
        log_file,
        log_json,
        cron,
        issue_delay,
        issue_ttl,
        dat_ttl,
    }
}

impl Env {
    pub fn issue_begin(&self) -> u64 {
        now_unix_timestamp() + self.issue_delay
    }
    pub fn issue_end(&self) -> u64 {
        now_unix_timestamp() + self.issue_delay + self.issue_ttl
    }
}

fn env_str(key: &str, default_value: &str) -> String {
    if let Ok(v) = env::var(key) && !v.is_empty() {
        v
    } else {
        default_value.to_string()
    }
}

fn env_has(key: &str) -> bool {
    env::var(key).is_ok()
}

fn env_parse<F: FromStr>(key: &str, default_value: F) -> F
where
    <F as FromStr>::Err: std::fmt::Debug
{
    if let Ok(v) = env::var(key) && !v.is_empty() {
        v.parse::<F>().expect(&format!("invalid argument {}: {}", key, v))
    } else {
        default_value
    }
}
