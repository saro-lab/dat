use dat::crypto::DatCrypto;
use dat::crypto::DatCryptoAlgorithm::{IvAes128Gcm, IvAes256Gcm};
use dat::util::encode_base64_url;
use rand::RngExt;
use std::time::Instant;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn crypto_copy_test() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;
    let mut len = 0;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    let mut encode = Vec::with_capacity(1000);
    let mut decode = Vec::with_capacity(1000);
    println!("text: {}", text);

    let alg_arr = [IvAes128Gcm, IvAes256Gcm];
    alg_arr.iter().for_each(|alg| {
        let tag = format!("{}", alg);
        let key = DatCrypto::generate(*alg);

        let start = Instant::now();
        for _ in 0..loop_size {
            encode = key.encrypt(text.as_bytes()).unwrap();
            len = len + encode.len();
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy encode * {loop_size} : {}ms", duration.as_millis());
        println!("encode: {}", encode_base64_url(&encode));

        let start = Instant::now();
        for _ in 0..loop_size {
            decode = key.decrypt(encode.clone()).unwrap();
            len = len + encode.len();
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("${tag} copy encode * {loop_size} : {}ms", duration.as_millis());
        let decode_text = String::from_utf8_lossy(&*decode).to_string();
        println!("decode: {}", decode_text);
        println!("len: {}", len);

        assert_eq!(text, decode_text);

    });
}
