use aws_lc_rs::signature::KeyPair;
use dat::signature::DatSignature;
use dat::signature::DatSignatureAlgorithm::{EcdsaP256, EcdsaP384, EcdsaP521};
use rand::RngExt;
use ring::signature;
use std::time::Instant;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn ecdsa() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    let mut sign = Box::from(vec![0u8; 0]);
    //println!("text: {}", text);

    println!("ECDSA");

    let alg_arr = [EcdsaP256, EcdsaP384, EcdsaP521];
    alg_arr.iter().for_each(|alg| {
        let mut len = 0;
        let tag = format!("{}", alg);
        let key = DatSignature::generate(*alg).unwrap();

        let start = Instant::now();
        for _ in 0..loop_size {
            sign = key.sign(text.as_bytes()).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy sign * {loop_size} : {}ms", duration.as_millis());
        //println!("sign: {}", encode_base64_url(&sign));

        let start = Instant::now();
        for _ in 0..loop_size {
            key.verify(text.as_bytes(), &*sign).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy verify * {loop_size} : {}ms", duration.as_millis());
        //println!("len: {}", len);

        assert_eq!(loop_size * 2, len);

    });
}


#[tokio::test(flavor = "multi_thread")]
async fn ring() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    //println!("text: {}", text);

    println!("RING");

    let alg_arr = [256, 384];
    alg_arr.iter().for_each(|alg| {
        let tag = format!("{}", alg);

        let rng = ring::rand::SystemRandom::new();
        let (sa, va) = match alg {
            256 => (&signature::ECDSA_P256_SHA256_FIXED_SIGNING, &signature::ECDSA_P256_SHA256_FIXED),
            384 => (&signature::ECDSA_P384_SHA384_FIXED_SIGNING, &signature::ECDSA_P384_SHA384_FIXED),
            _ => panic!("unknown algorithm"),
        };

        let pkcs8 = signature::EcdsaKeyPair::generate_pkcs8(sa, &rng).unwrap();

        let key_pair = signature::EcdsaKeyPair::from_pkcs8(sa, pkcs8.as_ref(), &rng).unwrap();

        //let pri_key = pkcs8.as_ref().to_vec();
        let pub_key: Vec<u8> = ring::signature::KeyPair::public_key(&key_pair).as_ref().to_vec();

        //println!("{tag} pri_key size: {}", pri_key.len());
        //println!("{tag} pub_key size: {}", pub_key.len());

        let pub_key: signature::UnparsedPublicKey<&Vec<u8>> = signature::UnparsedPublicKey::new(va, &pub_key);


        let mut len = 0;
        //let tag = format!("{}", alg);
        //let key = DatSignatureKey::generate(*alg);
        let mut sign: signature::Signature = key_pair.sign(&rng, text.as_bytes()).unwrap();

        let start = Instant::now();
        for _ in 0..loop_size {
            sign = key_pair.sign(&rng, text.as_bytes()).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy sign * {loop_size} : {}ms", duration.as_millis());
        //println!("sign: {}", encode_base64_url(&sign));

        let start = Instant::now();
        for _ in 0..loop_size {
            pub_key.verify(text.as_bytes(), sign.as_ref()).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy verify * {loop_size} : {}ms", duration.as_millis());
        //println!("len: {}", len);

        assert_eq!(loop_size * 2, len);
    });
}


#[tokio::test(flavor = "multi_thread")]
async fn aws() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    //println!("text: {}", text);

    println!("AWS");

    let alg_arr = [256, 384, 521];
    alg_arr.iter().for_each(|alg| {
        let tag = format!("{}", alg);

        let rng = aws_lc_rs::rand::SystemRandom::new();
        let (sa, va) = match alg {
            256 => (&aws_lc_rs::signature::ECDSA_P256_SHA256_FIXED_SIGNING, &aws_lc_rs::signature::ECDSA_P256_SHA256_FIXED),
            384 => (&aws_lc_rs::signature::ECDSA_P384_SHA384_FIXED_SIGNING, &aws_lc_rs::signature::ECDSA_P384_SHA384_FIXED),
            521 => (&aws_lc_rs::signature::ECDSA_P521_SHA512_FIXED_SIGNING, &aws_lc_rs::signature::ECDSA_P521_SHA512_FIXED),
            _ => panic!("unknown algorithm"),
        };

        let pkcs8 = aws_lc_rs::signature::EcdsaKeyPair::generate_pkcs8(sa, &rng).unwrap();

        let key_pair = aws_lc_rs::signature::EcdsaKeyPair::from_pkcs8(sa, pkcs8.as_ref()).unwrap();

        //let pri_key = pkcs8.as_ref().to_vec();
        let pub_key: Vec<u8> = key_pair.public_key().as_ref().to_vec();

        //println!("{tag} pri_key size: {}", pri_key.len());
        //println!("{tag} pub_key size: {}", pub_key.len());

        let pub_key: aws_lc_rs::signature::UnparsedPublicKey<&Vec<u8>> = aws_lc_rs::signature::UnparsedPublicKey::new(va, &pub_key);


        let mut len = 0;
        //let tag = format!("{}", alg);
        //let key = DatSignatureKey::generate(*alg);
        let mut sign: aws_lc_rs::signature::Signature = key_pair.sign(&rng, text.as_bytes()).unwrap();

        let start = Instant::now();
        for _ in 0..loop_size {
            sign = key_pair.sign(&rng, text.as_bytes()).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy sign * {loop_size} : {}ms", duration.as_millis());
        //println!("sign: {}", encode_base64_url(&sign));

        let start = Instant::now();
        for _ in 0..loop_size {
            pub_key.verify(text.as_bytes(), sign.as_ref()).unwrap();
            len = len + 1;
        }
        let duration = start.elapsed(); // 경과 시간 계산
        println!("{tag} copy verify * {loop_size} : {}ms", duration.as_millis());
        //println!("len: {}", len);

        assert_eq!(loop_size * 2, len);
    });
}
