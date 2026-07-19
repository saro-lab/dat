use dat::error::DatError;
use dat::signature::{DatSignature, DatSignatureAlgorithm};
use dat::util::{decode_base64_url, encode_base64_url};
use rand::RngExt;
use DatSignatureAlgorithm::*;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}
fn test_key(alg: DatSignatureAlgorithm) -> Result<(), DatError> {
    let tag = format!("Signature {}", alg);
    let key = DatSignature::generate(alg)?;
    let key_b = key.export_key()?;
    let b64_key = encode_base64_url(&key_b);
    println!("{tag} Export {} {}", b64_key.len(), b64_key);
    assert_eq!(b64_key.len(), key.key_base64_len());
    let parse_key = DatSignature::from_key(alg, &*decode_base64_url(b64_key.clone())?)?;
    println!("{tag} Import {}", b64_key);
    let rand_string = rand_string();
    let sign = encode_base64_url(key.sign(rand_string.as_bytes())?);
    println!("{tag} Sign {}", rand_string);
    let verify = parse_key.verify(rand_string.as_bytes(), &*decode_base64_url(sign.clone())?).is_ok();
    println!("{tag} Verify {}", rand_string);
    assert!(verify);
    // verifying only key test
    match alg {
        EcdsaP256 | EcdsaP384 | EcdsaP521 => {
            let key_b = key.export_verify_only_key()?;
            let b64_key = encode_base64_url(&key_b);
            let parse_key = DatSignature::from_key(alg, &*decode_base64_url(b64_key)?)?;
            let verify = parse_key.verify(rand_string.as_bytes(), &*decode_base64_url(sign)?).is_ok();
            assert!(verify);
            println!("{tag} verify (verify only) {}", verify);
        },
        _ => (),
    }
    let un_verify = parse_key.verify(rand_string.as_bytes(), &*DatSignature::generate(alg)?.sign(rand_string.as_bytes())?).is_ok();
    println!("{tag} verify {} / unverify {}", verify, un_verify);
    assert!(!un_verify);
    Ok(())
}

#[test]
fn test() {
    let alg_arr = DatSignatureAlgorithm::list();
    alg_arr.iter().for_each(|alg| {
        (1..20).for_each(|_| {
            assert!(test_key(*alg).is_ok())
        });
    })
}
