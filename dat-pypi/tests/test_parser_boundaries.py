import time

import pytest

from saro_dat import (
    Dat,
    DatCertificate,
    DatCrypto,
    DatCryptoAlgorithm,
    DatError,
    DatManager,
    DatSignature,
    DatSignatureAlgorithm,
)
from saro_dat import error as E
from saro_dat.util import decode_base64_url, parse_u64, parse_u64_hex


U64_MAX = 2**64 - 1


def certificate(cid=1):
    now = int(time.time())
    return DatCertificate(
        cid,
        now - 10,
        120,
        300,
        DatSignature.generate(DatSignatureAlgorithm.HMAC_SHA256_MFS),
        DatCrypto.generate(DatCryptoAlgorithm.IV_AES128_GCM),
    )


def test_arbitrary_bytes_round_trip_without_implicit_utf8():
    manager = DatManager()
    manager.import_certificates([certificate()])
    raw = bytes(range(256)) * 4

    payload = manager.parse(manager.issue(raw, raw[::-1]))

    assert payload.plain_bytes == raw
    assert payload.secure_bytes == raw[::-1]
    with pytest.raises(UnicodeDecodeError):
        _ = payload.plain
    with pytest.raises(UnicodeDecodeError):
        _ = payload.secure


def test_long_plain_and_secure_fields_round_trip():
    manager = DatManager()
    manager.import_certificates([certificate()])
    plain = b"p" * (256 * 1024)
    secure = b"s" * (256 * 1024)

    payload = manager.parse(manager.issue(plain, secure))

    assert payload.plain_bytes == plain
    assert payload.secure_bytes == secure


@pytest.mark.parametrize(
    "wire",
    [
        "1",
        "1.2",
        "1.2.3",
        "1.2.3.4",
        "1.2.3.4.5.6",
        "1.2.3.4.5.6.7",
    ],
)
def test_token_requires_exactly_five_fields(wire):
    dat = Dat(wire)

    assert dat.error is not None
    assert dat.error.code == E.TOKEN_MALFORMED


@pytest.mark.parametrize("value", ["=", "AA==", "A+", "A/", "AA\n", "한", "A", "AB"])
def test_base64url_rejects_padding_alphabet_whitespace_and_noncanonical_bits(value):
    with pytest.raises(DatError) as raised:
        decode_base64_url(value)

    assert raised.value.code == E.CONFIG_ARGUMENT_INVALID


@pytest.mark.parametrize(
    ("value", "decoded"),
    [("", b""), ("AA", b"\x00"), ("AAA", b"\x00\x00"), ("_w", b"\xff")],
)
def test_base64url_accepts_canonical_unpadded_values(value, decoded):
    assert decode_base64_url(value) == decoded


def test_invalid_payload_and_signature_base64_have_stable_codes():
    invalid_plain = Dat("1.1.A+..AA")
    invalid_signature = Dat("1.1...A+")

    assert invalid_plain.error is not None
    assert invalid_plain.error.code == E.TOKEN_MALFORMED
    assert invalid_signature.error is not None
    assert invalid_signature.error.code == E.SIG_MALFORMED


@pytest.mark.parametrize(
    "value",
    [str(U64_MAX + 1), "+1", "-1", " 1", "1 ", "1_0", "１"],
)
def test_decimal_u64_rejects_overflow_and_non_ascii_forms(value):
    with pytest.raises(DatError) as raised:
        parse_u64(value)

    assert raised.value.code == E.CONFIG_ARGUMENT_INVALID


@pytest.mark.parametrize(
    "value",
    [hex(U64_MAX + 1)[2:], "0x1", "+1", "-1", " 1", "1 ", "１"],
)
def test_hex_u64_rejects_overflow_and_non_ascii_forms(value):
    with pytest.raises(DatError) as raised:
        parse_u64_hex(value)

    assert raised.value.code == E.CONFIG_ARGUMENT_INVALID


def test_u64_maximum_is_accepted_in_token_fields():
    assert parse_u64(str(U64_MAX)) == U64_MAX
    assert parse_u64_hex("ffffffffffffffff") == U64_MAX

    dat = Dat(f"{U64_MAX}.ffffffffffffffff...AA")

    assert dat.error is None
    assert dat._expire == U64_MAX
    assert dat._cid == U64_MAX


def test_certificate_rejects_checked_u64_time_overflow():
    cert = certificate()
    fields = cert.exports().split(".")
    fields[1] = str(U64_MAX)
    fields[2] = "1"

    with pytest.raises(DatError) as raised:
        DatCertificate.imports(".".join(fields))

    assert raised.value.code == E.CERT_MALFORMED
