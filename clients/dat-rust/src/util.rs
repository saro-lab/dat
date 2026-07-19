use crate::error::DatError;
use base64::engine::general_purpose;
use base64::Engine;
use std::time::SystemTime;

const BASE64_URL: &general_purpose::GeneralPurpose = &general_purpose::URL_SAFE_NO_PAD;
const HEX_LC: &[u8; 16] = b"0123456789abcdef";

#[inline]
pub fn encode_base64_url<T: AsRef<[u8]>>(b: T) -> String {
    BASE64_URL.encode(b)
}

#[inline]
pub fn encode_base64_url_out<T: AsRef<[u8]>>(b: T, out: &mut String) {
    BASE64_URL.encode_string(b, out)
}

#[inline]
pub fn decode_base64_url<T: AsRef<[u8]>>(b64: T) -> Result<Vec<u8>, DatError> {
    Ok(BASE64_URL.decode(&b64)?)
}

#[inline]
pub fn decode_base64_url_out<T: AsRef<[u8]>>(b64: T, out: &mut Vec<u8>) -> Result<(), DatError> {
    Ok(BASE64_URL.decode_vec(&b64, out)?)
}

#[inline]
pub fn decode_base64_url_out_str<T: AsRef<[u8]>>(b64: T, out: &mut String) -> Result<(), DatError> {
    unsafe {
        Ok(BASE64_URL.decode_vec(&b64, out.as_mut_vec())?)
    }
}

#[inline]
pub fn now_unix_timestamp() -> u64 {
    // unwrap() 으로 무시 : 시스템이 1970년 이전으로 발생해 음수 발생시 나는 오류로 무시
    SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs()
}

#[inline]
pub fn to_utf8(vec: Vec<u8>) -> Result<String, DatError> {
    Ok(String::from_utf8(vec)?)
}

#[inline]
pub fn to_hex_u64_out(mut no: u64, out: &mut String) {
    if no == 0 {
        out.push('0');
        return;
    }

    let offset = out.len();
    let limit = offset + 16;

    let vec = unsafe { out.as_mut_vec() };
    vec.resize(limit, 0);

    // 뒤에서부터 4비트씩 채워나감
    // 숫자가 작은경우 앞에서 계산하는 방식보다 반의 숫자를 줄일 수 있음.
    let mut cursor = limit - 1;
    vec[cursor] = HEX_LC[(no & 0xF) as usize];
    no >>= 4;
    while no > 0 {
        cursor -= 1;
        vec[cursor] = HEX_LC[(no & 0xF) as usize];
        no >>= 4;
    }

    // 당겨오기: 16바이트가 꽉찬경우는 의미 없는 연산이 들어가지만 그런경우가 적기 때문에 if 문 없이진행.
    vec.copy_within(cursor..limit, offset);

    vec.truncate(limit - cursor + offset);
}
