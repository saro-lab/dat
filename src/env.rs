use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use std::env;
use std::str::FromStr;
use std::sync::LazyLock;
use sea_orm::sea_query::prelude::rust_decimal::prelude::ToPrimitive;
use tokio_cron_scheduler::Job;

pub static ENV: LazyLock<Env> = LazyLock::new(|| bind());

pub struct Env {
    pub version: String,

    // server
    pub hostname: String,
    pub port: u16,

    // db
    pub db_uri: String,

    // debug
    pub debug: bool,

    // log
    pub log_console: bool,
    pub log_file: bool,
    pub log_json: bool,

    pub cron_expression: String,
    pub cron_signature_algorithm: String,
    pub cron_crypto_algorithm: String,
    pub cron_certificate_propagation_delay_seconds: i64,
    pub cron_dat_issuance_duration_seconds: i64,
    pub cron_dat_ttl_seconds: i64,
}

fn bind() -> Env {
    let version = env!("CARGO_PKG_VERSION").to_string();

    println!("DAT Certificate Management Service v{}", version);

    let hostname = env_str("HOSTNAME", "localhost");
    let port = env_parse("PORT", 8088);
    println!("hostname: {}", hostname);
    println!("port: {}", port);

    let db_uri = env_str("DB_URI", "sqlite:./data/data.db");
    println!("db_uri: {}", db_uri);

    let debug = env_str("DEBUG", if cfg!(debug_assertions) { "1" } else { "0" }) == "1";
    println!("mode: {}", if debug { "debug" } else { "release" });

    let log_console = env_str("LOG_CONSOLE", "1") == "1";
    let log_json = env_str("LOG_FILE", "").to_uppercase() == "JSON";
    let log_file = log_json || env_str("LOG_FILE", "").to_uppercase() == "TEXT";
    println!("log console: {}", if log_console { "on" } else { "off" });
    println!("log file: {}", if log_file { if log_json { "json" } else { "text" } } else { "off" });

    let mut cron_expression = "".to_string();
    let mut cron_signature_algorithm = "".to_string();
    let mut cron_crypto_algorithm = "".to_string();
    let mut cron_certificate_propagation_delay_seconds: i64 = 0;
    let mut cron_dat_issuance_duration_seconds: i64 = 0;
    let mut cron_dat_ttl_seconds: i64 = 0;
    let cron = env_str("SINGLE_SERVER", if debug { "HMAC-SHA512-MFS,IV-AES256-GCM" } else { "" });
    if !cron.is_empty() {
        let arg_example = "
# Example: SINGLE_SERVER=Options

Just Algorithm:
signature_algorithm, crypto_algorithm
ex) HMAC-SHA512-MFS, IV-AES256-GCM

Detailed:
signature_algorithm, crypto_algorithm, cron, certificate_propagation_delay_seconds, dat_issuance_duration_seconds, dat_ttl_seconds
ex) HMAC-SHA512-MFS, IV-AES256-GCM, 0 0/30 * * * *, 1200, 10800, 600
".trim();
        let mut parts = cron.split(',').map(|x| x.trim()).collect::<Vec<&str>>();
        if parts.len() == 2 {
            parts.push("0 0/30 * * * *");
            parts.push("1200");
            parts.push("10800");
            parts.push("600");
        }
        if parts.len() != 6 {
            panic!("invalid SINGLE_SERVER argument: {cron}\n{}", arg_example);
        }
        DatSignatureAlgorithm::from_str(parts[0]).expect(format!("invalid signature algorithm\n{arg_example}").as_str());
        DatCryptoAlgorithm::from_str(parts[1]).expect(format!("invalid crypto algorithm\n{arg_example}").as_str());
        cron_expression = Job::schedule_to_cron(parts[2]).expect(format!("invalid cron expression\n{arg_example}").as_str());
        cron_signature_algorithm = parts[0].to_string();
        cron_crypto_algorithm = parts[1].to_string();
        cron_certificate_propagation_delay_seconds = parts[3].parse::<i64>().expect(format!("invalid certificate propagation delay seconds\n{arg_example}").as_str());
        cron_dat_issuance_duration_seconds = parts[4].parse::<i64>().expect(format!("invalid dat issuance duration seconds\n{arg_example}").as_str());
        cron_dat_ttl_seconds = parts[5].parse::<i64>().expect(format!("invalid dat ttl seconds\n{arg_example}").as_str());
    }

    Env {
        version,
        hostname,
        port,
        db_uri,
        debug,
        log_console,
        log_file,
        log_json,
        cron_expression,
        cron_signature_algorithm,
        cron_crypto_algorithm,
        cron_certificate_propagation_delay_seconds,
        cron_dat_issuance_duration_seconds,
        cron_dat_ttl_seconds,
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
