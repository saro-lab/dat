use dat::util::{parse_u64_dec, parse_u64_hex};

#[test]
fn decimal_accepts_only_pure_digits() {
    assert_eq!(parse_u64_dec("100"), Some(100));
    assert_eq!(parse_u64_dec("007"), Some(7));
    assert_eq!(parse_u64_dec("0"), Some(0));
    assert_eq!(parse_u64_dec("18446744073709551615"), Some(u64::MAX));

    for bad in [
        "+100",
        "-1",
        " 100",
        "100 ",
        "1_0",
        "0x10",
        "zzzz",
        "1e3",
        "",
        "１００",
    ] {
        assert_eq!(parse_u64_dec(bad), None, "must reject {bad:?}");
    }
    assert_eq!(parse_u64_dec("18446744073709551616"), None);
}

#[test]
fn hex_accepts_only_pure_hex_digits() {
    assert_eq!(parse_u64_hex("1a"), Some(0x1a));
    assert_eq!(parse_u64_hex("FFFFFFFFFFFFFFFF"), Some(u64::MAX));
    assert_eq!(parse_u64_hex("0"), Some(0));

    for bad in ["+1a", "-1", " 1a", "1a ", "0x1a", "1_a", "gg", ""] {
        assert_eq!(parse_u64_hex(bad), None, "must reject {bad:?}");
    }
    assert_eq!(parse_u64_hex("10000000000000000"), None);
}

#[test]
fn dat_rejects_loose_numeric_fields() {
    use dat::dat::Dat;

    for bad in [
        "+9999999999.1a.QQ.QQ.QQ",
        " 9999999999.1a.QQ.QQ.QQ",
        "9999999999.+1a.QQ.QQ.QQ",
        "9999999999.0x1a.QQ.QQ.QQ",
    ] {
        assert!(
            Dat::try_from(bad.to_string()).is_err(),
            "must reject {bad:?}"
        );
    }
}

#[test]
fn certificate_rejects_loose_numeric_fields() {
    use dat::certificate::DatCertificate;
    use std::str::FromStr;

    let bads = [
        "+1a.100.3600.1800.HMAC-SHA256-MFS.IV-AES256-GCM.QQ.QQ",
        "1a.+100.3600.1800.HMAC-SHA256-MFS.IV-AES256-GCM.QQ.QQ",
        "1a.100.+3600.1800.HMAC-SHA256-MFS.IV-AES256-GCM.QQ.QQ",
        "1a.100.3600.+1800.HMAC-SHA256-MFS.IV-AES256-GCM.QQ.QQ",
        "1a.100. 3600.1800.HMAC-SHA256-MFS.IV-AES256-GCM.QQ.QQ",
    ];
    for bad in bads {
        assert!(
            DatCertificate::from_str(bad).is_err(),
            "must reject {bad:?}"
        );
    }
}
