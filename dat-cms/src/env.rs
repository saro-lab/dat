use crate::dto::cert::RegisterCertificateCommand;
use crate::logging::LogConfig;
use dat::crypto::DatCryptoAlgorithm;
use dat::signature::DatSignatureAlgorithm;
use std::env;
use std::str::FromStr;
use std::sync::LazyLock;
use tokio_cron_scheduler::Job;

pub static ENV: LazyLock<Env> = LazyLock::new(bind);

pub struct Env {
    pub server: EnvServer,
    pub log: LogConfig,
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

pub struct EnvCron {
    pub expression: String,
    pub cmd: RegisterCertificateCommand,
}

pub struct EnvToken {
    pub master: Vec<String>,
    pub cert_full: Vec<String>,
    pub cert_verify: Vec<String>,
}

fn bind() -> Env {
    let server = EnvServer::new();
    let log = log_config(&server);
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


fn log_config(server: &EnvServer) -> LogConfig {
    let log_console = env_str("LOG_CONSOLE", "1") == "1";
    let log_file_type = env_str("LOG_FILE", "").to_uppercase();
    let log_json = log_file_type == "JSON";
    let log_file = log_json || log_file_type == "TEXT";
    println!("log console: {}", if log_console { "on" } else { "off" });
    println!("log file: {}", if log_file { if log_json { "json" } else { "text" } } else { "off" });
    LogConfig {
        console: log_console,
        json: log_json,
        file: log_file,
        file_dir: "./logs".to_string(),
        file_prefix: format!("dat-{}", server.hostname),
        debug: server.debug,
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
            DatSignatureAlgorithm::from_str(parts[0]).unwrap_or_else(|_| panic!("invalid signature algorithm\n{arg_example}"));
            DatCryptoAlgorithm::from_str(parts[1]).unwrap_or_else(|_| panic!("invalid crypto algorithm\n{arg_example}"));

            let cmd = RegisterCertificateCommand {
                signature_algorithm: parts[0].to_string(),
                crypto_algorithm: parts[1].to_string(),
                certificate_propagation_delay_seconds: parts[3].parse::<i64>().unwrap_or_else(|_| panic!("invalid certificate propagation delay seconds\n{arg_example}")),
                dat_issuance_duration_seconds: parts[4].parse::<i64>().unwrap_or_else(|_| panic!("invalid dat issuance duration seconds\n{arg_example}")),
                dat_ttl_seconds: parts[5].parse::<i64>().unwrap_or_else(|_| panic!("invalid dat ttl seconds\n{arg_example}")),
            };
            // Same bounds as the admin route: the cron command reaches the very same
            // `register()`, where `now + delay` and `start + duration + ttl` are computed.
            cmd.validate().unwrap_or_else(|reason| panic!("invalid SINGLE_NODE argument: {reason}\n{arg_example}"));

            Some(EnvCron {
                expression: Job::schedule_to_cron(parts[2]).unwrap_or_else(|_| panic!("invalid cron expression\n{arg_example}")),
                cmd,
            })
        }
    }
}

impl EnvToken {
    fn new() -> Self {
        let token = Self {
            master: env_token("TOKEN_MASTER"),
            cert_full: env_token("TOKEN_CERT_FULL"),
            cert_verify: env_token("TOKEN_CERT_VERIFY"),
        };
        token.warn_if_disabled();
        token
    }

    /// 어느 등급에든 등록된 토큰인가.
    ///
    /// 등록은 됐는데 이 자원의 등급이 아니면 401(인증 실패)이 아니라 403(권한 부족)이다.
    pub fn is_known(&self, token: &str) -> bool {
        if token.is_empty() {
            return false;
        }
        let token = token.to_string();
        self.master.contains(&token)
            || self.cert_full.contains(&token)
            || self.cert_verify.contains(&token)
    }

    /// 토큰 미설정 = 그 등급 전면 개방.
    ///
    /// `RequestContext::is_allow` 의 `allows.is_empty() → 통과` 때문에, TOKEN_MASTER 를
    /// 비워 두면 `POST /v1/cert/...`(인증서 발급)까지 무인증으로 열린다. 지금까지 이
    /// 상태는 어떤 신호로도 표현되지 않았다. 동작을 바꾸는 것은 별도 결정이므로
    /// 여기서는 기동 경고만 남긴다.
    fn warn_if_disabled(&self) {
        for (name, allows, risk) in [
            ("TOKEN_MASTER", &self.master, "certificate issuance is fully open"),
            ("TOKEN_CERT_FULL", &self.cert_full, "full certificate export is fully open"),
            ("TOKEN_CERT_VERIFY", &self.cert_verify, "verify-only export is fully open"),
        ] {
            if allows.is_empty() {
                // ENV 는 tracing 초기화보다 먼저 평가될 수 있어 println 으로 남긴다.
                println!("[WARN] {}: {name} is not set, {risk}", crate::codes::AUTH_DISABLED);
            }
        }
    }
}

fn env_token(key: &str) -> Vec<String> {
    let mut vec = Vec::new();
    let regex_token = regex::Regex::new("^[a-zA-Z0-9]+$").expect("regex error");
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
        v.parse::<F>().unwrap_or_else(|_| panic!("invalid argument {}: {}", key, v))
    } else {
        default_value
    }
}
