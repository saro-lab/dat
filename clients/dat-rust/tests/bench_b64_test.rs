use dat::util::{decode_base64_url, decode_base64_url_out_str, encode_base64_url, encode_base64_url_out};
use rand::RngExt;
use std::time::Instant;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn base64_zero_copy_test() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    let mut encode = String::with_capacity(1000);
    let mut decode = String::with_capacity(1000);
    println!("text: {}", text);


    let start = Instant::now();
    for _ in 0..loop_size {
        unsafe { encode.as_mut_vec().set_len(0) };
        encode_base64_url_out(&text, &mut encode)
    }
    let duration = start.elapsed(); // 경과 시간 계산
    println!("Base64 zero copy encode * {loop_size} : {}ms", duration.as_millis());
    println!("encode: {}", encode);

    let start = Instant::now();
    for _ in 0..loop_size {
        unsafe { decode.as_mut_vec().set_len(0) };
        decode_base64_url_out_str(&encode, &mut decode).unwrap();
    }
    let duration = start.elapsed(); // 경과 시간 계산
    println!("Base64 zero copy encode * {loop_size} : {}ms", duration.as_millis());
    println!("decode: {}", decode);

    assert_eq!(text, decode);
}


#[tokio::test(flavor = "multi_thread")]
async fn base64_copy_test() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;
    let mut len = 0;

    let mut text = "가나다".to_string();
    text.push_str(&rand_string());
    let mut encode = String::with_capacity(1000);
    let mut decode = String::with_capacity(1000);
    println!("text: {}", text);


    let start = Instant::now();
    for _ in 0..loop_size {
        encode = encode_base64_url(&text);
        len = len + encode.len();
    }
    let duration = start.elapsed(); // 경과 시간 계산
    println!("Base64 copy encode * {loop_size} : {}ms", duration.as_millis());
    println!("encode: {}", encode);

    let start = Instant::now();
    for _ in 0..loop_size {
        decode = String::from_utf8(decode_base64_url(&encode).unwrap()).unwrap();
        len = len + encode.len();
    }
    let duration = start.elapsed(); // 경과 시간 계산
    println!("Base64 copy encode * {loop_size} : {}ms", duration.as_millis());
    println!("decode: {}", decode);
    println!("len: {}", len);

    assert_eq!(text, decode);
}