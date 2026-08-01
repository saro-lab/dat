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

/// base64url 디코드 실패는 호출부가 무엇을 읽고 있었는지에 따라 코드가 갈린다
/// (토큰이면 `TokenMalformed`, 인증서면 `CertMalformed`). 여기서는 중립적인
/// 인자 오류로 두고, 각 호출부에서 `map_err` 로 정확한 코드를 붙인다.
const B64_INVALID: DatError = DatError::ConfigArgumentInvalid("not a valid base64url string");

#[inline]
pub fn decode_base64_url<T: AsRef<[u8]>>(b64: T) -> Result<Vec<u8>, DatError> {
    BASE64_URL.decode(&b64).map_err(|_| B64_INVALID)
}

#[inline]
pub fn decode_base64_url_out<T: AsRef<[u8]>>(b64: T, out: &mut Vec<u8>) -> Result<(), DatError> {
    BASE64_URL.decode_vec(&b64, out).map_err(|_| B64_INVALID)
}

#[inline]
pub fn decode_base64_url_out_str<T: AsRef<[u8]>>(b64: T, out: &mut String) -> Result<(), DatError> {
    unsafe {
        BASE64_URL.decode_vec(&b64, out.as_mut_vec()).map_err(|_| B64_INVALID)
    }
}

/// 와이어 포맷의 10진 필드를 읽는다. 순수 ASCII 숫자만 허용한다.
///
/// `str::parse::<u64>()` 는 선행 `+` 를 받아들이지만 나머지 7개 포트는 전부
/// 거부한다. 기준 구현이 더 넓으면 같은 토큰을 rust만 받아들이는 불일치가
/// 남으므로, 좁은 쪽(순수 숫자)으로 통일한다.
#[inline]
pub fn parse_u64_dec(s: &str) -> Option<u64> {
    if s.is_empty() || !s.as_bytes().iter().all(u8::is_ascii_digit) {
        return None;
    }
    s.parse::<u64>().ok()
}

/// 와이어 포맷의 16진 필드(cid)를 읽는다. 순수 ASCII 16진수만 허용한다.
/// `from_str_radix` 의 선행 `+` 수용을 같은 이유로 막는다.
#[inline]
pub fn parse_u64_hex(s: &str) -> Option<u64> {
    if s.is_empty() || !s.as_bytes().iter().all(u8::is_ascii_hexdigit) {
        return None;
    }
    u64::from_str_radix(s, 16).ok()
}

#[inline]
pub fn now_unix_timestamp() -> u64 {
    // unwrap() 으로 무시 : 시스템이 1970년 이전으로 발생해 음수 발생시 나는 오류로 무시
    SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs()
}

#[inline]
pub fn to_utf8(vec: Vec<u8>) -> Result<String, DatError> {
    String::from_utf8(vec).map_err(|_| DatError::TokenMalformed("payload is not valid utf-8"))
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
