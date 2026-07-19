use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::DatError;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use rand::RngExt;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}

fn gen_certificate(dat_manager: &DatManager) -> Result<(), DatError> {
    let signature_alg_arr = DatSignatureAlgorithm::list();
    let crypto_alg_arr = DatCryptoAlgorithm::list();
    let mut certificates: Vec<DatCertificate> = vec![];
    let now = now_unix_timestamp();
    let mut i = 0;
    signature_alg_arr.iter().for_each(|sign_alg| {
        crypto_alg_arr.iter().for_each(|crypto_alg| {
            (1..5).for_each(|_| {
                let cid = i;
                i += 1;
                certificates.push(DatCertificate::generate(cid, now - 10, 200, 100, *sign_alg, *crypto_alg).unwrap());
            });
        });
    });
    println!("Generated \n{}", certificates.iter().map(|x| x.export(false).unwrap()).collect::<Vec<String>>().join("\n"));
    dat_manager.import_certificates(certificates, false)?;
    Ok(())
}

#[test]
fn test() {
    let manager = DatManager::new();
    let plain = rand_string();
    let secure = rand_string();

    // generate certificate
    gen_certificate(&manager).unwrap();

    // generate dats
    let certificates: Vec<DatCertificate> = manager.export_certificates().unwrap();
    let dats: Vec<String> = certificates.iter().map(|key| {
        let dat: String = DatManager::_issue(&key, &plain, &secure).unwrap();
        dat
    }).collect::<Vec<String>>();

    // copy certificates
    let certificates = manager.export(false);
    let manager2: DatManager = DatManager::new();
    manager2.import(&certificates.unwrap(), true).unwrap();

    // verify
    let tag = "dat.manager";
    for dat in dats {
        println!("{tag}.{}", dat);
        let payload = manager2.parse(dat).unwrap();
        println!("{tag}.{}", payload);
        assert_eq!(plain, payload.plain_text().unwrap());
        assert_eq!(secure, payload.secure_text().unwrap());
    }
}
