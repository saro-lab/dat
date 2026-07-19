use dat::crypto::{DatCrypto, DatCryptoAlgorithm};
use dat::error::DatError;
use dat::util::{decode_base64_url, encode_base64_url};
use rand::RngExt;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}
fn encrypt_and_decrypt(alg: DatCryptoAlgorithm, rand_string: String) -> Result<(), DatError> {
    let tag = format!("Crypto {}", alg);
    println!("{tag} Ready");
    let key = DatCrypto::generate(alg);
    let byte_key = key.export_key();
    let b64_key = encode_base64_url(&byte_key);
    assert_eq!(b64_key.len(), key.key_base64_len());
    println!("{tag} Key {} {}", b64_key.len(), &b64_key);
    let parse_key = DatCrypto::from_key(alg, &*decode_base64_url(b64_key)?)?;
    let rand_bytes = rand_string.as_bytes();
    println!("{tag} Rand String {}", rand_string);
    let encrypt = encode_base64_url(key.encrypt(rand_bytes)?);
    println!("{tag} Encrypt1: {encrypt}");
    let decrypt = parse_key.decrypt(decode_base64_url(encrypt.clone())?)?;
    assert_eq!(rand_bytes, decrypt);
    let fail_decrypt = DatCrypto::generate(alg).decrypt(decode_base64_url(encrypt)?).is_ok();
    assert!(!fail_decrypt || rand_string.is_empty());
    println!("{tag} Pass {:?} / Fail {}", rand_bytes, fail_decrypt);
    Ok(())
}

#[test]
fn test() {
    let alg_arr = DatCryptoAlgorithm::list();
    alg_arr.iter().for_each(|alg| {
        // random
        (1..20).for_each(|_| {
            assert!(encrypt_and_decrypt(*alg, rand_string()).is_ok())
        });
        // empty
        assert!(encrypt_and_decrypt(*alg, "".to_string()).is_ok())
    })
}
