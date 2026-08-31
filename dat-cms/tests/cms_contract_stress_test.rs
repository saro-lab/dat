#![allow(dead_code)]

mod codes {
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/codes.rs"));
}

mod api {
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/api.rs"));
}

mod dto {
    pub mod cert {
        include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/dto/cert.rs"));
    }
}

mod entity {
    pub mod dat_cms_cert {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/src/entity/dat_cms_cert.rs"
        ));
    }
}

mod env {
    use std::sync::LazyLock;

    pub struct Env {
        pub server: Server,
    }

    pub struct Server {
        pub db_cache_secs: u64,
        pub db_query_timeout_secs: u64,
    }

    pub static ENV: LazyLock<Env> = LazyLock::new(|| Env {
        server: Server {
            db_cache_secs: 30,
            db_query_timeout_secs: 30,
        },
    });
}

mod schema {
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/schema.rs"));
}

mod services {
    pub mod cert_service {
        include!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/src/services/cert_service.rs"
        ));
    }
}

use api::Api;
use axum::body::to_bytes;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use dto::cert::{CertificateList, ListCertificatesQuery, RegisterCertificateCommand};
use sea_orm::Database;
use serde_json::Value;
use services::cert_service;
use std::sync::Arc;

fn expectation<'a>(case: &'a Value, profile: &str) -> &'a Value {
    case.get("expect")
        .unwrap_or_else(|| &case["expect_by_profile"][profile])
}

fn certificate_wire<'a>(fixture: &'a Value, name: &str) -> &'a str {
    fixture["certificates"][name]["wire_ascii"]
        .as_str()
        .unwrap()
}

fn body(fixture: &Value, segments: &Value) -> Vec<u8> {
    let mut body = Vec::new();
    for segment in segments.as_array().unwrap() {
        let segment = segment.as_array().unwrap();
        match segment[0].as_str().unwrap() {
            "ascii" => body.extend_from_slice(segment[1].as_str().unwrap().as_bytes()),
            "certificate" => body.extend_from_slice(
                certificate_wire(fixture, segment[1].as_str().unwrap()).as_bytes(),
            ),
            "hex" => {
                let hex = segment[1].as_str().unwrap().as_bytes();
                for pair in hex.chunks_exact(2) {
                    body.push((digit(pair[0]) << 4) | digit(pair[1]));
                }
            }
            kind => panic!("unknown fixture segment {kind}"),
        }
    }
    body
}

fn digit(byte: u8) -> u8 {
    match byte {
        b'0'..=b'9' => byte - b'0',
        b'a'..=b'f' => byte - b'a' + 10,
        _ => panic!("invalid hex fixture"),
    }
}

#[test]
fn g0_server_i64_profile_matches_plaintext_export_contract() {
    let fixture: Value =
        serde_json::from_str(include_str!("fixtures/cms_v1_state_transitions.json")).unwrap();
    assert_eq!(fixture["project_numeric_profiles"]["dat-cms"], "server_i64");
    let cases = fixture["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 42);

    let mut checked = 0;
    for case in cases {
        let expected = expectation(case, "server_i64");
        assert!(expected.get("state").is_some(), "{}", case["id"]);
        assert!(expected.get("retry").is_some(), "{}", case["id"]);
        if case["input"]["kind"] == "http" {
            let assembled = body(&fixture, &case["input"]["body"]);
            assert_eq!(
                assembled.is_ascii(),
                !matches!(
                    case["id"].as_str().unwrap(),
                    "version_fullwidth_digits" | "non_ascii_certificate_area" | "invalid_utf8_body"
                )
            );
        }
        checked += 1;
    }
    assert_eq!(checked, 42);

    for name in ["hmac0", "hmacA", "hmac0Alt", "ecdsaFull", "ecdsaVo"] {
        certificate_wire(&fixture, name)
            .parse::<dat::certificate::DatCertificate>()
            .unwrap_or_else(|error| panic!("{name}: {error}"));
    }

    let version_only = CertificateList {
        version: 42,
        list: Vec::new(),
    };
    assert_eq!(version_only.export(true), "42");
    assert_eq!(version_only.export(false), "");

    let incremental = CertificateList {
        version: 42,
        list: vec![
            certificate_wire(&fixture, "hmac0").to_string(),
            certificate_wire(&fixture, "hmacA").to_string(),
        ],
    };
    assert_eq!(
        incremental.export(true).into_bytes(),
        body(
            &fixture,
            &serde_json::json!([
                ["ascii", "42\n"],
                ["certificate", "hmac0"],
                ["ascii", "\n"],
                ["certificate", "hmacA"]
            ])
        )
    );

    for state in fixture["states"].as_object().unwrap().values() {
        let version = state["version"].as_str().unwrap();
        if version.parse::<i64>().is_err() {
            assert!(
                matches!(
                    version,
                    "9223372036854775808" | "18446744073709551615" | "18446744073709551616"
                ),
                "unexpected server_i64 overflow fixture {version}"
            );
        }
    }
}

async fn response_parts(response: axum::response::Response) -> (StatusCode, String) {
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, String::from_utf8(body.to_vec()).unwrap())
}

#[tokio::test]
async fn json_error_envelopes_keep_status_and_shape() {
    for (response, status, body) in [
        (
            Api::bad_request().into_response(),
            StatusCode::BAD_REQUEST,
            r#"{"code":"DAT_REQ_MALFORMED"}"#,
        ),
        (
            Api::unauthorized().into_response(),
            StatusCode::UNAUTHORIZED,
            r#"{"code":"DAT_AUTH_UNAUTHORIZED"}"#,
        ),
        (
            Api::forbidden().into_response(),
            StatusCode::FORBIDDEN,
            r#"{"code":"DAT_AUTH_FORBIDDEN"}"#,
        ),
        (
            Api::not_found().into_response(),
            StatusCode::NOT_FOUND,
            r#"{"code":"DAT_REQ_NOT_FOUND"}"#,
        ),
        (
            (StatusCode::METHOD_NOT_ALLOWED, Api::not_found()).into_response(),
            StatusCode::METHOD_NOT_ALLOWED,
            r#"{"code":"DAT_REQ_NOT_FOUND"}"#,
        ),
        (
            Api::code(codes::STORE_UNAVAILABLE).into_response(),
            StatusCode::SERVICE_UNAVAILABLE,
            r#"{"code":"DAT_STORE_UNAVAILABLE"}"#,
        ),
        (
            Api::internal().into_response(),
            StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"code":"DAT_STORE_UNKNOWN"}"#,
        ),
    ] {
        assert_eq!(response_parts(response).await, (status, body.to_string()));
    }
}

fn register_command() -> RegisterCertificateCommand {
    RegisterCertificateCommand {
        signature_algorithm: "HMAC-SHA256-MFS".to_string(),
        crypto_algorithm: "IV-AES128-GCM".to_string(),
        certificate_propagation_delay_seconds: 0,
        dat_issuance_duration_seconds: 3600,
        dat_ttl_seconds: 300,
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_register_refresh_and_readers_publish_coherent_snapshots() {
    let db = Arc::new(Database::connect("sqlite::memory:").await.unwrap());
    schema::sync(&db).await.unwrap();
    let initial = cert_service::list(
        ListCertificatesQuery {
            version: 0,
            verify_only: false,
        },
        &*db,
    )
    .await
    .unwrap();
    assert_eq!(initial.version, 0);
    assert!(initial.list.is_empty());

    let mut writers = Vec::new();
    for _ in 0..100 {
        let db = Arc::clone(&db);
        writers.push(tokio::spawn(async move {
            cert_service::register(register_command(), &*db).await
        }));
    }
    let mut readers = Vec::new();
    for reader in 0..100 {
        let db = Arc::clone(&db);
        readers.push(tokio::spawn(async move {
            let snapshot = cert_service::list(
                ListCertificatesQuery {
                    version: 0,
                    verify_only: reader % 2 == 0,
                },
                &*db,
            )
            .await?;
            assert!(snapshot.version >= 0);
            assert!(snapshot.list.len() <= 100);
            Ok::<_, api::ApiError>(())
        }));
    }

    for writer in writers {
        writer.await.unwrap().unwrap();
    }
    for reader in readers {
        reader.await.unwrap().unwrap();
    }

    let snapshot = cert_service::list(
        ListCertificatesQuery {
            version: 0,
            verify_only: false,
        },
        &*db,
    )
    .await
    .unwrap();
    assert_eq!(snapshot.list.len(), 100);
    assert!(snapshot.version > 0);
    Arc::try_unwrap(db).ok().unwrap().close().await.unwrap();
}
