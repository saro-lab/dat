use crate::service::cms::RegisterCmd;
use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use std::env;
use std::str::FromStr;
use std::sync::LazyLock;
use tokio_cron_scheduler::Job;

pub static ENV: LazyLock<Env> = LazyLock::new(|| bind());

pub struct Env {
    pub server: EnvServer,
    pub log: EnvLog,
    pub token: EnvToken,
    pub cron: Option<EnvCron>,
}

pub struct EnvServer {
    pub version: String,
    pub hostname: String,
    pub port: u16,
    pub db_uri: String,
    pub db_cache_secs: u64,
    pub debug: bool,
}

pub struct EnvLog {
    pub console: bool,
    pub file: bool,
    pub json: bool,
}

pub struct EnvCron {
    pub expression: String,
    pub cmd: RegisterCmd,
}

pub struct EnvToken {
    pub master: Vec<String>,
    pub cert_full: Vec<String>,
    pub cert_verify: Vec<String>,
}

fn bind() -> Env {
    let server = EnvServer::new();
    let log = EnvLog::new();
    let cron = EnvCron::new(&server);
    let token = EnvToken::new();
    Env { server, log, cron, token }
}

impl EnvServer {
    pub fn new() -> Self {
        let version = env!("CARGO_PKG_VERSION").to_string();
        println!("DAT Certificate Management Service v{}", version);

        let hostname = env_str("HOSTNAME", "localhost");
        println!("hostname: {}", hostname);

        let port = env_parse("PORT", 8088);
        println!("port: {}", port);

        let db_uri = env_str("DB_URI", "sqlite:./data/data.db");
        println!("db_uri: {}", db_uri);

        let db_cache_secs = env_parse("DB_CACHE_SECS", 30);
        println!("db_cache_secs: {}", db_cache_secs);

        let debug = env_str("DEBUG", if cfg!(debug_assertions) { "1" } else { "0" }) == "1";
        println!("mode: {}", if debug { "debug" } else { "release" });

        EnvServer {
            version,
            hostname,
            port,
            db_uri,
            db_cache_secs,
            debug
        }
    }
}


impl EnvLog {
    fn new() -> Self {
        let log_console = env_str("LOG_CONSOLE", "1") == "1";
        let log_json = env_str("LOG_FILE", "").to_uppercase() == "JSON";
        let log_file = log_json || env_str("LOG_FILE", "").to_uppercase() == "TEXT";
        println!("log console: {}", if log_console { "on" } else { "off" });
        println!("log file: {}", if log_file { if log_json { "json" } else { "text" } } else { "off" });
        EnvLog {
            console: log_console,
            json: log_json,
            file: log_file,
        }
    }
}

impl EnvCron {
    fn new(env_server: &EnvServer) -> Option<Self> {
        let cron = env_str("SINGLE_NODE", if env_server.debug { "HMAC-SHA512-MFS,IV-AES256-GCM" } else { "" });
        if cron.is_empty() {
            None
        } else {
            let arg_example = "
# Example: SINGLE_NODE=Options

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
                panic!("invalid SINGLE_NODE argument: {cron}\n{}", arg_example);
            }
            DatSignatureAlgorithm::from_str(parts[0]).expect(format!("invalid signature algorithm\n{arg_example}").as_str());
            DatCryptoAlgorithm::from_str(parts[1]).expect(format!("invalid crypto algorithm\n{arg_example}").as_str());

            Some(EnvCron {
                expression: Job::schedule_to_cron(parts[2]).expect(format!("invalid cron expression\n{arg_example}").as_str()),
                cmd: RegisterCmd {
                    signature_algorithm: parts[0].to_string(),
                    crypto_algorithm: parts[1].to_string(),
                    certificate_propagation_delay_seconds: parts[3].parse::<i64>().expect(format!("invalid certificate propagation delay seconds\n{arg_example}").as_str()),
                    dat_issuance_duration_seconds: parts[4].parse::<i64>().expect(format!("invalid dat issuance duration seconds\n{arg_example}").as_str()),
                    dat_ttl_seconds: parts[5].parse::<i64>().expect(format!("invalid dat ttl seconds\n{arg_example}").as_str()),
                }
            })
        }
    }
}

impl EnvToken {
    fn new() -> Self {
        Self {
            master: env_token("TOKEN_MASTER"),
            cert_full: env_token("TOKEN_CERT_FULL"),
            cert_verify: env_token("TOKEN_CERT_VERIFY"),
        }
    }
}

fn env_token(key: &str) -> Vec<String> {
    let mut vec = Vec::new();
    let regex_token = regex::Regex::new("[a-zA-Z0-9]+").expect("regex error");
    let tokens = env_str(key, "");
    if !tokens.is_empty() {
        for token in tokens.split(',') {
            if !regex_token.is_match(token) {
                panic!("Tokens must be alphanumeric (a-z, A-Z, 0-9):\n{key}={token}");
            }
            vec.push(String::from(token));
        }
    }
    vec
}


fn env_str(key: &str, default_value: &str) -> String {
    if let Ok(v) = env::var(key) && !v.is_empty() {
        v
    } else {
        default_value.to_string()
    }
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
