import time

import pytest

from saro_dat import DatCertificate, DatCrypto, DatError, DatManager, DatRetry, DatSignature
from saro_dat import error as E
from saro_dat.crypto import DatCryptoAlgorithm
from saro_dat.signature import DatSignatureAlgorithm

SIG = DatSignatureAlgorithm.ECDSA_P256
CRY = DatCryptoAlgorithm.IV_AES256_GCM


def certificate(cid=1, start_offset=-10, duration=200, ttl=100):
    now = int(time.time())
    return DatCertificate(
        cid, now + start_offset, duration, ttl,
        DatSignature.generate(SIG), DatCrypto.generate(CRY),
    )


def issuable_manager(cid=1):
    manager = DatManager()
    manager.import_certificates([certificate(cid)], True)
    return manager


def code_of(fn):
    with pytest.raises(DatError) as excinfo:
        fn()
    return excinfo.value.code


def test_expired_token_is_not_malformed():
    manager = issuable_manager()
    token = manager.issue("p", "s")
    rest = token.split(".", 1)[1]
    now = int(time.time())

    assert code_of(lambda: manager.parse(f"{now - 1}.{rest}")) == E.TOKEN_EXPIRED
    assert code_of(lambda: manager.parse(f"{now}.{rest}")) == E.TOKEN_EXPIRED


def test_malformed_token_shapes():
    manager = issuable_manager()
    token = manager.issue("p", "s")
    parts = token.split(".")

    assert code_of(lambda: manager.parse("1.2.3")) == E.TOKEN_MALFORMED
    assert code_of(lambda: manager.parse(token + ".extra")) == E.TOKEN_MALFORMED
    assert code_of(lambda: manager.parse("+" + token)) == E.TOKEN_MALFORMED
    assert code_of(lambda: manager.parse(".".join([parts[0], "zz", *parts[2:]]))) == E.TOKEN_MALFORMED


def test_empty_signature_is_sig_malformed():
    manager = issuable_manager()
    token = manager.issue("p", "s")
    parts = token.split(".")

    assert code_of(lambda: manager.parse(".".join(parts[:4]) + ".")) == E.SIG_MALFORMED


def test_forged_signature_is_sig_mismatch():
    victim = issuable_manager(7)
    attacker = issuable_manager(7)
    forged = attacker.issue("p", "s")

    with pytest.raises(DatError) as excinfo:
        victim.parse(forged)
    assert excinfo.value.code == E.SIG_MISMATCH
    assert excinfo.value.security_event is True
    assert excinfo.value.retry is DatRetry.PERMANENT


def test_tampered_secure_is_crypto_tag_mismatch():
    manager = issuable_manager()
    cert = manager._certificates_by_cid[1]
    token = DatManager._issue(cert, "plain", "secure-payload")
    parts = token.split(".")

    secure = parts[3]
    parts[3] = secure[:-1] + ("B" if secure[-1] == "A" else "A")

    from saro_dat import Dat
    dat = Dat(".".join(parts))
    with pytest.raises(DatError) as excinfo:
        cert._crypto_key.decrypt(dat._secure)
    assert excinfo.value.code == E.CRYPTO_TAG_MISMATCH
    assert excinfo.value.security_event is True


def test_unknown_cid_is_cert_not_found():
    manager = issuable_manager(1)
    other = issuable_manager(999)
    token = other.issue("p", "s")

    assert code_of(lambda: manager.parse(token)) == E.CERT_NOT_FOUND


def test_duplicate_cid_on_import():
    manager = DatManager()
    certs = [certificate(5), certificate(5)]
    assert code_of(lambda: manager.import_certificates(certs, True)) == E.CERT_DUPLICATE_CID


def test_malformed_certificate_shapes():
    assert code_of(lambda: DatCertificate.imports("a.b.c")) == E.CERT_MALFORMED
    assert code_of(
        lambda: DatCertificate.imports("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")
    ) == E.CERT_MALFORMED


def test_no_certificate_at_all():
    with pytest.raises(DatError) as excinfo:
        DatManager().issue("p", "s")
    assert excinfo.value.code == E.MANAGER_NO_CERTIFICATE
    assert excinfo.value.retry is DatRetry.TRANSIENT


def test_issuance_window_not_yet_open_is_transient():
    manager = DatManager()
    manager.import_certificates([certificate(1, start_offset=3600)], True)

    with pytest.raises(DatError) as excinfo:
        manager.issue("p", "s")
    assert excinfo.value.code == E.MANAGER_NO_ISSUABLE_CERTIFICATE
    assert excinfo.value.__cause__.code == E.CERT_NOT_YET_ISSUABLE
    assert excinfo.value.retry is DatRetry.TRANSIENT


def test_issuance_window_closed_is_permanent():
    manager = DatManager()
    manager.import_certificates([certificate(1, start_offset=-500, duration=100, ttl=3600)], True)

    with pytest.raises(DatError) as excinfo:
        manager.issue("p", "s")
    assert excinfo.value.code == E.MANAGER_NO_ISSUABLE_CERTIFICATE
    assert excinfo.value.__cause__.code == E.CERT_ISSUANCE_ENDED
    assert excinfo.value.retry is DatRetry.PERMANENT


def test_verify_only_certificate_cannot_issue():
    source = certificate(1)
    verify_only = DatCertificate.imports(source.exports(True))
    manager = DatManager()
    manager.import_certificates([verify_only], True)

    with pytest.raises(DatError) as excinfo:
        manager.issue("p", "s")
    assert excinfo.value.code == E.MANAGER_NO_ISSUABLE_CERTIFICATE
    assert excinfo.value.__cause__.code == E.CERT_VERIFY_ONLY
    assert excinfo.value.retry is DatRetry.PERMANENT


def test_unknown_algorithm_names():
    assert code_of(lambda: DatSignature.generate("NOPE")) == E.CONFIG_ALG_UNSUPPORTED
    assert code_of(lambda: DatCrypto.generate("NOPE")) == E.CONFIG_ALG_UNSUPPORTED


def test_wrong_key_size_is_key_invalid():
    assert code_of(lambda: DatCrypto.imports(CRY.value, "AAAA")) == E.KEY_INVALID
    assert code_of(lambda: DatSignature.imports("HMAC-SHA256-MFS", "AAAA")) == E.KEY_INVALID
    assert code_of(lambda: DatSignature.imports(SIG, "AAAA")) == E.KEY_INVALID


def test_hmac_verify_only_export_is_structurally_unsupported():
    hmac = DatSignature.generate(DatSignatureAlgorithm.HMAC_SHA256_MFS)
    assert code_of(lambda: hmac.exports(True)) == E.KEY_VERIFY_ONLY_UNSUPPORTED


def test_signing_with_verify_only_key_is_key_missing():
    source = DatSignature.generate(SIG)
    public_only = DatSignature.imports(SIG, source.exports(True))
    assert code_of(lambda: public_only.sign("body")) == E.SIG_KEY_MISSING


def test_ciphertext_shorter_than_iv():
    crypto = DatCrypto.generate(CRY)
    assert code_of(lambda: crypto.decrypt(b"12345")) == E.CRYPTO_DATA_INVALID


def test_empty_secure_payload_is_not_an_error():
    crypto = DatCrypto.generate(CRY)
    assert crypto.encrypt(b"") == b""
    assert crypto.decrypt(b"") == b""


def test_codes_are_well_formed():
    samples = [
        E.TOKEN_MALFORMED, E.TOKEN_EXPIRED, E.CERT_EXPIRED, E.CERT_NOT_SYNCED,
        E.SIG_MISMATCH, E.CRYPTO_TAG_MISMATCH, E.KEY_INVALID,
        E.MANAGER_NO_CERTIFICATE, E.CMS_UNAUTHORIZED, E.CMS_SYNC_IN_PROGRESS,
        E.CONFIG_ALG_UNSUPPORTED, E.INTERNAL_UNAVAILABLE,
    ]
    for code in samples:
        assert code.startswith("DAT_"), code
        assert all(c.isupper() or c == "_" for c in code), code
        assert str(DatError(code)).startswith(code)
        assert str(DatError(code, "detail")) == f"{code}: detail"


def test_dat_error_is_catchable_as_both_legacy_types():
    e = DatError(E.TOKEN_MALFORMED)
    assert isinstance(e, ValueError)
    assert isinstance(e, RuntimeError)


def test_retry_classification():
    for code in (E.CMS_UNAUTHORIZED, E.CMS_FORBIDDEN, E.CMS_ENDPOINT_NOT_FOUND):
        assert DatError(code).retry is DatRetry.PERMANENT, code
    for code in (E.CMS_UNREACHABLE, E.CMS_SERVER_ERROR, E.CMS_NOT_SYNCED):
        assert DatError(code).retry is DatRetry.TRANSIENT, code
    for code in (E.CMS_SYNC_IN_PROGRESS, E.CMS_VERSION_RESET):
        assert DatError(code).retry is DatRetry.STATE, code
