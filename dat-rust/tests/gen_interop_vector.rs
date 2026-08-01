use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;

/// Emits interop vectors on stdout: rust is the reference implementation.
/// Run with: cargo test --test gen_interop_vector -- --nocapture
#[test]
fn gen_vectors() {
    let now = now_unix_timestamp();
    let cases = [
        (DatSignatureAlgorithm::HmacSha256Mfs, DatCryptoAlgorithm::IvAes256Gcm),
        (DatSignatureAlgorithm::EcdsaP256, DatCryptoAlgorithm::IvAes128Gcm),
    ];
    for (i, (sig, crypto)) in cases.iter().enumerate() {
        let cid = i as u64;
        let cert = DatCertificate::generate(cid, now - 10, 3600, 86400, *sig, *crypto).unwrap();
        println!("CERT\t{}", cert.export(false).unwrap());
        // empty secure payload - the case that broke nuget/maven interop
        println!("DAT_EMPTY_SECURE\t{}", DatManager::_issue(&cert, "hello", "").unwrap());
        // both empty
        println!("DAT_EMPTY_BOTH\t{}", DatManager::_issue(&cert, "", "").unwrap());
        // normal
        println!("DAT_NORMAL\t{}", DatManager::_issue(&cert, "hello", "world").unwrap());
    }
}
