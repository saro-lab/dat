use dat::certificate::DatCertificate;
use dat::crypto::{DatCrypto, DatCryptoAlgorithm};
use dat::dat::Dat;
use dat::manager::DatManager;
use dat::signature::{DatSignature, DatSignatureAlgorithm};
use dat::util::now_unix_timestamp;
use std::hint::black_box;
use std::time::{Duration, Instant};

fn elapsed(label: &str, algorithm: &str, size: usize, count: usize, duration: Duration) {
    println!("{label},{algorithm},{size},{count},{}", duration.as_nanos());
}

fn certificate(
    cid: u64,
    signature: DatSignatureAlgorithm,
    crypto: DatCryptoAlgorithm,
) -> DatCertificate {
    DatCertificate::generate(cid, now_unix_timestamp() - 1, 3600, 300, signature, crypto).unwrap()
}

#[test]
#[ignore = "manual release-mode timing runner; observations are never correctness gates"]
fn release_issue_parse_import_export_matrix() {
    if cfg!(debug_assertions) {
        panic!(
            "run with: cargo test --release --test release_timing_test -- --ignored --nocapture --test-threads=1"
        );
    }
    println!("operation,algorithm,payload_bytes,certificate_count,elapsed_ns");
    let hot_path_iterations = std::env::var("DAT_R1_BENCH_ITERATIONS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(64);

    for signature in DatSignatureAlgorithm::list() {
        for crypto in DatCryptoAlgorithm::list() {
            let algorithm = format!("{signature}+{crypto}");
            let cert = certificate(1, *signature, *crypto);
            time_hot_paths(&algorithm, *signature, *crypto, &cert, hot_path_iterations);
            for payload_size in [0, 32, 256, 4096] {
                let plain = (0..payload_size)
                    .map(|index| (index as u8).wrapping_mul(31))
                    .collect::<Vec<_>>();
                let secure = (0..payload_size)
                    .map(|index| (index as u8).wrapping_mul(17))
                    .collect::<Vec<_>>();
                let iterations = if payload_size >= 4096 { 16 } else { 64 };

                let start = Instant::now();
                let mut token = String::new();
                for _ in 0..iterations {
                    token = black_box(
                        DatManager::_issue(&cert, black_box(&plain), black_box(&secure)).unwrap(),
                    );
                }
                elapsed(
                    "issue",
                    &algorithm,
                    payload_size,
                    iterations,
                    start.elapsed(),
                );

                let start = Instant::now();
                for _ in 0..iterations {
                    let payload =
                        DatManager::_parse(&cert, token.clone().try_into().unwrap()).unwrap();
                    assert_eq!(payload.plain(), plain);
                    assert_eq!(payload.secure(), secure);
                    black_box(payload);
                }
                elapsed(
                    "parse",
                    &algorithm,
                    payload_size,
                    iterations,
                    start.elapsed(),
                );
            }

            for count in [1, 16] {
                time_import_export(&algorithm, *signature, *crypto, count);
            }
        }
    }

    time_import_export(
        "representative-256",
        DatSignatureAlgorithm::HmacSha256Mfs,
        DatCryptoAlgorithm::IvAes128Gcm,
        256,
    );
}

fn time_import_export(
    algorithm: &str,
    signature: DatSignatureAlgorithm,
    crypto: DatCryptoAlgorithm,
    count: usize,
) {
    let wire = (0..count)
        .map(|cid| {
            certificate(cid as u64, signature, crypto)
                .export(false)
                .unwrap()
        })
        .collect::<Vec<_>>()
        .join("\n");
    let manager = DatManager::new();

    let start = Instant::now();
    assert_eq!(manager.import(black_box(&wire), true).unwrap(), count);
    elapsed("import_issuer_select", algorithm, 0, count, start.elapsed());

    let start = Instant::now();
    let exported = black_box(manager.export(false).unwrap());
    elapsed("export", algorithm, 0, count, start.elapsed());
    assert_eq!(exported.lines().count(), count);
}

fn time_hot_paths(
    algorithm: &str,
    signature_algorithm: DatSignatureAlgorithm,
    crypto_algorithm: DatCryptoAlgorithm,
    certificate: &DatCertificate,
    iterations: usize,
) {
    let message = (0..256)
        .map(|index| (index as u8).wrapping_mul(29))
        .collect::<Vec<_>>();
    let wire = certificate.export(false).unwrap();
    let token = DatManager::_issue(certificate, &message, &message).unwrap();

    let start = Instant::now();
    for _ in 0..iterations {
        black_box(certificate.try_clone().unwrap());
    }
    elapsed(
        "certificate_clone",
        algorithm,
        message.len(),
        iterations,
        start.elapsed(),
    );

    let start = Instant::now();
    for _ in 0..iterations {
        let parsed = black_box(wire.parse::<DatCertificate>().unwrap());
        assert_eq!(parsed.cid, certificate.cid);
    }
    elapsed(
        "certificate_parser",
        algorithm,
        wire.len(),
        iterations,
        start.elapsed(),
    );

    let start = Instant::now();
    for _ in 0..iterations {
        let parsed = black_box(Dat::try_from(token.clone()).unwrap());
        assert_eq!(parsed.cid(), certificate.cid);
    }
    elapsed(
        "dat_parser",
        algorithm,
        token.len(),
        iterations,
        start.elapsed(),
    );

    let signature = DatSignature::generate(signature_algorithm).unwrap();
    let signed = signature.sign(&message).unwrap();
    let start = Instant::now();
    for _ in 0..iterations {
        black_box(signature.try_clone().unwrap());
    }
    elapsed(
        "signature_clone",
        algorithm,
        message.len(),
        iterations,
        start.elapsed(),
    );

    let start = Instant::now();
    for _ in 0..iterations {
        black_box(signature.sign(black_box(&message)).unwrap());
    }
    elapsed(
        "signature_sign",
        algorithm,
        message.len(),
        iterations,
        start.elapsed(),
    );

    let start = Instant::now();
    for _ in 0..iterations {
        signature
            .verify(black_box(&message), black_box(&signed))
            .unwrap();
    }
    elapsed(
        "signature_verify",
        algorithm,
        message.len(),
        iterations,
        start.elapsed(),
    );

    let crypto = DatCrypto::generate(crypto_algorithm);
    let encrypted = crypto.encrypt(&message).unwrap();
    let decrypt_inputs = (0..iterations)
        .map(|_| encrypted.clone())
        .collect::<Vec<_>>();
    let start = Instant::now();
    for input in decrypt_inputs {
        let decrypted = black_box(crypto.decrypt(input).unwrap());
        assert_eq!(decrypted, message);
    }
    elapsed(
        "decrypt",
        algorithm,
        message.len(),
        iterations,
        start.elapsed(),
    );
}
