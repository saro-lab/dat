use crate::error::DatError;
use base64::Engine;
use base64::engine::general_purpose;
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
    let decoded = BASE64_URL.decode(b64).map_err(|_| B64_INVALID)?;
    let decoded = std::str::from_utf8(&decoded).map_err(|_| B64_INVALID)?;
    out.push_str(decoded);
    Ok(())
}

#[inline]
pub fn parse_u64_dec(s: &str) -> Option<u64> {
    if s.is_empty() || !s.as_bytes().iter().all(u8::is_ascii_digit) {
        return None;
    }
    s.parse::<u64>().ok()
}

#[inline]
pub fn parse_u64_hex(s: &str) -> Option<u64> {
    if s.is_empty() || !s.as_bytes().iter().all(u8::is_ascii_hexdigit) {
        return None;
    }
    u64::from_str_radix(s, 16).ok()
}

#[inline]
pub fn now_unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs()
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

    let mut cursor = limit - 1;
    vec[cursor] = HEX_LC[(no & 0xF) as usize];
    no >>= 4;
    while no > 0 {
        cursor -= 1;
        vec[cursor] = HEX_LC[(no & 0xF) as usize];
        no >>= 4;
    }

    vec.copy_within(cursor..limit, offset);

    vec.truncate(limit - cursor + offset);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_base64_url_out_str_preserves_output_on_error() {
        for input in ["_w", "!"] {
            let mut output = String::from("prefix");
            assert!(decode_base64_url_out_str(input, &mut output).is_err());
            assert_eq!(output, "prefix");
        }
    }

    #[test]
    fn decode_base64_url_out_str_appends_utf8() {
        let mut output = String::from("prefix:");
        decode_base64_url_out_str("7ZWc6riA", &mut output).unwrap();
        assert_eq!(output, "prefix:한글");
    }
}
