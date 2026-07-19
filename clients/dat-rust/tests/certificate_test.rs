use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::crypto::DatCryptoAlgorithm::IvAes128Gcm;
use dat::error::DatError;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::signature::DatSignatureAlgorithm::EcdsaP256;
use dat::util::now_unix_timestamp;
use rand::RngExt;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}


fn unit(fail_certificate: &DatCertificate, cid: u64, signature_algorithm: DatSignatureAlgorithm, crypto_algorithm: DatCryptoAlgorithm, plain: String, secure: String) -> Result<(), DatError> {
    let tag = format!("dat.{}.{}.{:x}", signature_algorithm, crypto_algorithm, cid);

    let new_certificate = DatCertificate::generate(cid, now_unix_timestamp() - 10, 200, 100, signature_algorithm, crypto_algorithm)?;
    let new_certificate_str = new_certificate.export(false)?;

    let read_certificate: DatCertificate = new_certificate_str.parse()?;

    let dat = DatManager::_issue(&new_certificate, &plain, &secure)?;
    println!("{tag}: {}", dat);

    let payload = DatManager::_parse(&read_certificate, dat.clone().try_into()?)?;
    assert_eq!(plain, payload.plain_text()?);
    assert_eq!(secure, payload.secure_text()?);
    assert!(DatManager::_parse(&fail_certificate, dat.try_into()?).is_err());
    Ok(())
}


#[test]
fn test() {
    let signature_alg_arr = DatSignatureAlgorithm::list();
    let crypto_alg_arr = DatCryptoAlgorithm::list();

    let fail_certificate = &DatCertificate::generate(192874, now_unix_timestamp() - 10, 200, 100, EcdsaP256, IvAes128Gcm).unwrap();

    signature_alg_arr.iter().for_each(|sign_alg| {
        crypto_alg_arr.iter().for_each(|crypto_alg| {
            // random
            (1..20).for_each(|i| {
                let plain = rand_string();
                let secure = rand_string();
                assert!(unit(fail_certificate, i, *sign_alg, *crypto_alg, plain, secure)
                    .map_err(|e| {
                        println!("@{:?}", e);
                        e
                    }).is_ok())
            });
            // empty
            assert!(unit(fail_certificate, 0, *sign_alg, *crypto_alg, "".to_string(), "".to_string()).is_ok())
        });
    });
}
