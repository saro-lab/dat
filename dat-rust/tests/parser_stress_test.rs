use dat::certificate::DatCertificate;
use dat::dat::Dat;
use dat::util::{
    decode_base64_url, decode_base64_url_out, decode_base64_url_out_str, encode_base64_url,
    parse_u64_dec, parse_u64_hex,
};
use std::panic::{AssertUnwindSafe, catch_unwind};

const HMAC_CERTIFICATE: &str = "0.0.32506362000.32506358400.HMAC-SHA256-MFS.IV-AES128-GCM.qJAPhAeRnxOPeR6acBQTt0ukGqmUNtlQX5co7HXJ6Yg.ofZMFCvJ8Y5gBY6vNHWF_Q";

struct XorShift64(u64);

impl XorShift64 {
    fn next(&mut self) -> u64 {
        let mut value = self.0;
        value ^= value << 13;
        value ^= value >> 7;
        value ^= value << 17;
        self.0 = value;
        value
    }

    fn ascii(&mut self, len: usize) -> String {
        (0..len)
            .map(|_| (b'!' + (self.next() % 94) as u8) as char)
            .collect()
    }
}

#[test]
fn deterministic_malformed_corpus_never_panics_or_mutates_utf8_output() {
    let mut rng = XorShift64(0xd1b5_4a32_d192_ed03);
    for len in 0..=4096 {
        let bytes = (0..len).map(|_| rng.next() as u8).collect::<Vec<u8>>();
        let ascii = rng.ascii(len.min(256));
        let malformed_dat = format!("18446744073709551615.0.{ascii}.!.AA.extra");
        let malformed_cert = format!("{ascii}.0.1.1.HMAC-SHA256-MFS.IV-AES128-GCM.!.!");
        let mut text = String::from("sentinel");

        let result = catch_unwind(AssertUnwindSafe(|| {
            let _ = decode_base64_url(&bytes);
            let _ = Dat::try_from(malformed_dat);
            let _ = malformed_cert.parse::<DatCertificate>();
            let before = text.clone();
            if decode_base64_url_out_str(&bytes, &mut text).is_err() {
                assert_eq!(text, before);
            }
        }));
        assert!(result.is_ok(), "corpus entry {len} panicked");
    }
}

#[test]
fn long_fields_and_delimiter_counts_fail_safely() {
    let long = "A".repeat(1 << 20);
    let cases = [
        format!("{long}.0.AA.AA.AA"),
        format!("18446744073709551615.{long}.AA.AA.AA"),
        format!("18446744073709551615.0.{long}.AA.AA"),
        format!("18446744073709551615.0.AA.{long}.AA"),
        format!("18446744073709551615.0.AA.AA.{long}"),
    ];
    for value in cases {
        assert!(catch_unwind(|| Dat::try_from(value)).is_ok());
    }

    let certificate = format!("0.0.1.1.HMAC-SHA256-MFS.IV-AES128-GCM.{long}.AA");
    assert!(catch_unwind(|| certificate.parse::<DatCertificate>()).is_ok());

    for delimiters in 0..=128 {
        let value = ".".repeat(delimiters);
        assert!(
            Dat::try_from(value.clone()).is_err(),
            "DAT delimiters={delimiters}"
        );
        assert!(
            value.parse::<DatCertificate>().is_err(),
            "certificate delimiters={delimiters}"
        );
    }
}

#[test]
fn base64_and_unsigned_integer_boundaries_are_explicit() {
    for len in 0..=4096 {
        let input = (0..len).map(|n| n as u8).collect::<Vec<_>>();
        let encoded = encode_base64_url(&input);
        assert_eq!(decode_base64_url(&encoded).unwrap(), input);
        let mut output = vec![1, 2, 3];
        decode_base64_url_out(&encoded, &mut output).unwrap();
        assert_eq!(&output[3..], input.as_slice());
    }
    for invalid in ["=", "A=", "AA=", "AA==", "+", "/", "_w=", "\0", "é"] {
        assert!(decode_base64_url(invalid).is_err(), "{invalid:?}");
    }

    for accepted in [
        "0",
        "1",
        "9007199254740992",
        "9223372036854775808",
        "18446744073709551615",
    ] {
        assert!(parse_u64_dec(accepted).is_some(), "{accepted}");
    }
    for rejected in ["", "+1", "-1", " 1", "1 ", "01x", "18446744073709551616"] {
        assert_eq!(parse_u64_dec(rejected), None, "{rejected:?}");
    }
    assert_eq!(parse_u64_hex("ffffffffffffffff"), Some(u64::MAX));
    for rejected in ["", "+1", "-1", " 1", "g", "10000000000000000"] {
        assert_eq!(parse_u64_hex(rejected), None, "{rejected:?}");
    }

    let valid: Dat = "18446744073709551615.ffffffffffffffff...AA"
        .try_into()
        .unwrap();
    assert_eq!(valid.expire(), u64::MAX);
    assert_eq!(valid.cid(), u64::MAX);
    assert!(Dat::try_from("18446744073709551616.0...AA").is_err());
    assert!(Dat::try_from("18446744073709551615.10000000000000000...AA").is_err());

    assert!(HMAC_CERTIFICATE.parse::<DatCertificate>().is_ok());
    let mut fields = HMAC_CERTIFICATE.split('.').collect::<Vec<_>>();
    for (index, overflow) in [
        (0, "10000000000000000"),
        (1, "18446744073709551616"),
        (2, "18446744073709551616"),
        (3, "18446744073709551616"),
    ] {
        let original = fields[index];
        fields[index] = overflow;
        assert!(
            fields.join(".").parse::<DatCertificate>().is_err(),
            "field {index}"
        );
        fields[index] = original;
    }
    for index in [6, 7] {
        let original = fields[index];
        fields[index] = "!";
        assert!(
            fields.join(".").parse::<DatCertificate>().is_err(),
            "field {index}"
        );
        fields[index] = original;
    }
}
