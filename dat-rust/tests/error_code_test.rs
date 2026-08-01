//! 오류 코드 회귀 안전망 (error.pre2.md).
//!
//! 코드 문자열은 모든 공식 클라이언트가 공유하는 공개 계약이다. 여기서 단언하는 것은
//! "실패했다"가 아니라 **"어느 코드로 실패했다"** 이다 — 재매핑 사고는 전자로는
//! 절대 안 잡힌다. 특히 이 체계를 만든 세 가지 이유를 고정한다:
//!
//! 1. 만료 / 형식 오류 / 서명 위조가 갈리는가
//! 2. 서명 불일치 / 백엔드 실패가 갈리는가
//! 3. "발급할 인증서 없음"의 다섯 가지 사유가 갈리는가

use dat::certificate::DatCertificate;
use dat::crypto::{DatCrypto, DatCryptoAlgorithm};
use dat::error::{DatError, DatRetry};
use dat::manager::DatManager;
use dat::signature::{DatSignature, DatSignatureAlgorithm};
use dat::util::now_unix_timestamp;
use std::str::FromStr;

const SIG: DatSignatureAlgorithm = DatSignatureAlgorithm::EcdsaP256;
const CRY: DatCryptoAlgorithm = DatCryptoAlgorithm::IvAes256Gcm;

/// 발급창이 열려 있는 정상 매니저.
fn issuable_manager(cid: u64) -> DatManager {
    let now = now_unix_timestamp();
    let manager = DatManager::new();
    manager
        .import_certificates(vec![DatCertificate::generate(cid, now - 10, 200, 100, SIG, CRY).unwrap()], true)
        .unwrap();
    manager
}

/// 성공 타입에 `Debug` 를 요구하지 않는다 — `DatSignature`/`DatCrypto` 는 키 재료를
/// 들고 있어서 의도적으로 `Debug` 를 구현하지 않는다.
fn err_of<T>(r: Result<T, DatError>) -> DatError {
    match r {
        Ok(_) => panic!("expected an error, got Ok"),
        Err(e) => e,
    }
}

fn code_of<T>(r: Result<T, DatError>) -> &'static str {
    err_of(r).code()
}

// ---- 1. 만료 / 형식 오류 / 서명 위조 ----

#[test]
fn expired_token_is_not_malformed() {
    let manager = issuable_manager(1);
    let dat = manager.issue("p", "s").unwrap();

    // expire 필드만 과거로 바꾼다. 나머지 구조는 그대로다.
    let rest = dat.splitn(2, '.').nth(1).unwrap();
    let expired = format!("{}.{}", now_unix_timestamp() - 1, rest);

    assert_eq!(code_of(manager.parse(expired)), "DAT_TOKEN_EXPIRED");
}

#[test]
fn expire_exactly_now_is_expired() {
    // 정각도 만료다 (interop: expire > now 여야 유효).
    let manager = issuable_manager(1);
    let dat = manager.issue("p", "s").unwrap();
    let rest = dat.splitn(2, '.').nth(1).unwrap();
    let at_now = format!("{}.{}", now_unix_timestamp(), rest);

    assert_eq!(code_of(manager.parse(at_now)), "DAT_TOKEN_EXPIRED");
}

#[test]
fn malformed_token_shapes() {
    let manager = issuable_manager(1);
    let dat = manager.issue("p", "s").unwrap();
    let parts: Vec<&str> = dat.split('.').collect();

    // 파트 수 부족
    assert_eq!(code_of(manager.parse("1.2.3".to_string())), "DAT_TOKEN_MALFORMED");
    // 파트 수 초과
    assert_eq!(code_of(manager.parse(format!("{dat}.extra"))), "DAT_TOKEN_MALFORMED");
    // expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
    assert_eq!(
        code_of(manager.parse(format!("+{}.{}", parts[0], parts[1..].join(".")))),
        "DAT_TOKEN_MALFORMED"
    );
    // cid 가 16진수가 아님
    assert_eq!(
        code_of(manager.parse(format!("{}.zz.{}", parts[0], parts[2..].join(".")))),
        "DAT_TOKEN_MALFORMED"
    );
}

#[test]
fn empty_signature_is_sig_malformed_not_mismatch() {
    let manager = issuable_manager(1);
    let dat = manager.issue("p", "s").unwrap();
    let parts: Vec<&str> = dat.split('.').collect();
    let no_sig = format!("{}.", parts[..4].join("."));

    assert_eq!(code_of(manager.parse(no_sig)), "DAT_SIG_MALFORMED");
}

#[test]
fn forged_signature_is_sig_mismatch() {
    // 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
    let now = now_unix_timestamp();
    let victim = issuable_manager(7);
    let attacker = DatManager::new();
    attacker
        .import_certificates(vec![DatCertificate::generate(7, now - 10, 200, 100, SIG, CRY).unwrap()], true)
        .unwrap();

    let forged = attacker.issue("p", "s").unwrap();
    let err = err_of(victim.parse(forged));

    assert_eq!(err.code(), "DAT_SIG_MISMATCH");
    assert!(err.security_event(), "위조는 보안 이벤트로 표시되어야 한다");
}

#[test]
fn tampered_secure_is_crypto_tag_mismatch() {
    // 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
    let manager = issuable_manager(1);
    let dat = manager.issue("plain", "secure-payload").unwrap();
    let mut parts: Vec<String> = dat.split('.').map(str::to_string).collect();

    // secure 의 마지막 base64 문자를 뒤집는다.
    let secure = parts[3].clone();
    let last = secure.chars().last().unwrap();
    let flipped = if last == 'A' { 'B' } else { 'A' };
    parts[3] = format!("{}{}", &secure[..secure.len() - 1], flipped);

    let err = err_of(manager.parse_without_verify(parts.join(".")));
    assert_eq!(err.code(), "DAT_CRYPTO_TAG_MISMATCH");
    assert!(err.security_event());
}

// ---- 2. 인증서 조회 ----

#[test]
fn unknown_cid_is_cert_not_found() {
    let manager = issuable_manager(1);
    let other = issuable_manager(999);
    let dat = other.issue("p", "s").unwrap();

    assert_eq!(code_of(manager.parse(dat)), "DAT_CERT_NOT_FOUND");
}

#[test]
fn duplicate_cid_on_import() {
    let now = now_unix_timestamp();
    let manager = DatManager::new();
    let certs = vec![
        DatCertificate::generate(5, now - 10, 200, 100, SIG, CRY).unwrap(),
        DatCertificate::generate(5, now - 10, 200, 100, SIG, CRY).unwrap(),
    ];
    assert_eq!(code_of(manager.import_certificates(certs, true)), "DAT_CERT_DUPLICATE_CID");
}

#[test]
fn malformed_certificate_shapes() {
    assert_eq!(code_of(DatCertificate::from_str("a.b.c")), "DAT_CERT_MALFORMED");
    // 8 파트지만 cid 가 16진수가 아님
    assert_eq!(
        code_of(DatCertificate::from_str("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")),
        "DAT_CERT_MALFORMED"
    );
    // 시간 산술 오버플로
    assert_eq!(
        code_of(DatCertificate::from(1, u64::MAX, 1, 0, DatSignature::generate(SIG).unwrap(), DatCrypto::generate(CRY))),
        "DAT_CERT_MALFORMED"
    );
}

// ---- 3. "발급할 인증서 없음" 다섯 갈래 ----

#[test]
fn no_certificate_at_all() {
    let manager = DatManager::new();
    let err = manager.issue("p", "s").unwrap_err();

    assert_eq!(err.code(), "DAT_MANAGER_NO_CERTIFICATE");
    // CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
    assert_eq!(err.retry(), DatRetry::Transient);
}

#[test]
fn issuance_window_not_yet_open_is_transient() {
    let now = now_unix_timestamp();
    let manager = DatManager::new();
    manager
        .import_certificates(vec![DatCertificate::generate(1, now + 3600, 200, 100, SIG, CRY).unwrap()], true)
        .unwrap();

    let err = manager.issue("p", "s").unwrap_err();
    assert_eq!(err.code(), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    assert_eq!(err.cause().unwrap().code(), "DAT_CERT_NOT_YET_ISSUABLE");
    // 기다리면 풀리는 유일한 사유다.
    assert_eq!(err.retry(), DatRetry::Transient);
}

#[test]
fn issuance_window_closed_is_permanent() {
    let now = now_unix_timestamp();
    let manager = DatManager::new();
    // 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
    manager
        .import_certificates(vec![DatCertificate::generate(1, now - 500, 100, 3600, SIG, CRY).unwrap()], true)
        .unwrap();

    let err = manager.issue("p", "s").unwrap_err();
    assert_eq!(err.code(), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    assert_eq!(err.cause().unwrap().code(), "DAT_CERT_ISSUANCE_ENDED");
    assert_eq!(err.retry(), DatRetry::Permanent);
}

#[test]
fn verify_only_certificate_cannot_issue() {
    let now = now_unix_timestamp();
    let source = DatCertificate::generate(1, now - 10, 200, 100, SIG, CRY).unwrap();
    let verify_only = DatCertificate::from_str(&source.export(true).unwrap()).unwrap();

    let manager = DatManager::new();
    manager.import_certificates(vec![verify_only], true).unwrap();

    let err = manager.issue("p", "s").unwrap_err();
    assert_eq!(err.code(), "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE");
    // 배포 설정 실수다 — 기다려도 안 풀린다.
    assert_eq!(err.cause().unwrap().code(), "DAT_CERT_VERIFY_ONLY");
    assert_eq!(err.retry(), DatRetry::Permanent);
}

// ---- 키 · 알고리즘 · 인자 ----

#[test]
fn unknown_algorithm_names() {
    assert_eq!(code_of(DatSignatureAlgorithm::from_str("NOPE")), "DAT_CONFIG_ALG_UNSUPPORTED");
    assert_eq!(code_of(DatCryptoAlgorithm::from_str("NOPE")), "DAT_CONFIG_ALG_UNSUPPORTED");
}

#[test]
fn wrong_key_size_is_key_invalid() {
    assert_eq!(code_of(DatCrypto::from_key(CRY, &[0u8; 7])), "DAT_KEY_INVALID");
    assert_eq!(
        code_of(DatSignature::from_key(DatSignatureAlgorithm::HmacSha256Mfs, &[0u8; 7])),
        "DAT_KEY_INVALID"
    );
    assert_eq!(code_of(DatSignature::from_key(SIG, &[0u8; 7])), "DAT_KEY_INVALID");
}

#[test]
fn hmac_verify_only_export_is_structurally_unsupported() {
    // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
    let hmac = DatSignature::generate(DatSignatureAlgorithm::HmacSha256Mfs).unwrap();
    assert_eq!(code_of(hmac.export_verify_only_key()), "DAT_KEY_VERIFY_ONLY_UNSUPPORTED");
}

#[test]
fn signing_with_verify_only_key_is_key_missing() {
    let source = DatSignature::generate(SIG).unwrap();
    let public_only = DatSignature::from_key(SIG, &source.export_verify_only_key().unwrap()).unwrap();

    assert_eq!(code_of(public_only.sign(b"body")), "DAT_SIG_KEY_MISSING");
}

#[test]
fn ciphertext_shorter_than_iv() {
    let crypto = DatCrypto::generate(CRY);
    assert_eq!(code_of(crypto.decrypt(vec![0u8; 5])), "DAT_CRYPTO_DATA_INVALID");
}

#[test]
fn empty_secure_payload_is_not_an_error() {
    // 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
    let crypto = DatCrypto::generate(CRY);
    assert!(crypto.encrypt(&[]).unwrap().is_empty());
    assert!(crypto.decrypt(vec![]).unwrap().is_empty());
}

// ---- 코드 체계 자체의 불변식 ----

#[test]
fn every_code_is_well_formed() {
    let samples = [
        DatError::TokenMalformed("x"),
        DatError::TokenExpired,
        DatError::CertExpired,
        DatError::CertNotSynced,
        DatError::SigMismatch,
        DatError::CryptoTagMismatch,
        DatError::KeyInvalid("x"),
        DatError::ManagerNoCertificate,
        DatError::CmsUnauthorized,
        DatError::CmsSyncInProgress,
        DatError::ConfigAlgUnsupported("x".into()),
        DatError::InternalUnavailable("x"),
    ];

    for e in samples {
        let code = e.code();
        assert!(code.starts_with("DAT_"), "{code} must start with DAT_");
        assert!(
            code.chars().all(|c| c.is_ascii_uppercase() || c == '_'),
            "{code} must be SCREAMING_SNAKE_CASE"
        );
        // 메시지가 아니라 코드가 Display 의 머리에 온다.
        assert!(e.to_string().starts_with(code));
    }
}

#[test]
fn state_signals_are_not_failures() {
    assert_eq!(DatError::CmsSyncInProgress.retry(), DatRetry::State);
    assert_eq!(DatError::CmsVersionReset.retry(), DatRetry::State);
}

#[test]
fn permanent_cms_errors_must_not_be_retried() {
    // 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
    for e in [DatError::CmsUnauthorized, DatError::CmsForbidden, DatError::CmsEndpointNotFound] {
        assert_eq!(e.retry(), DatRetry::Permanent, "{}", e.code());
    }
    for e in [DatError::CmsUnreachable("x".into()), DatError::CmsServerError(503)] {
        assert_eq!(e.retry(), DatRetry::Transient, "{}", e.code());
    }
}
