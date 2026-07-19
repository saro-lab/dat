import secrets
import string
import time
import unittest

from saro_dat import DatSignatureAlgorithm, DatCryptoAlgorithm, DatCertificate, DatSignature, DatCrypto, \
    DatManager


def generate_base62(length: int) -> str:
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def generate_certificate(cid: int, sa: DatSignatureAlgorithm, ca: DatCryptoAlgorithm) -> DatCertificate:
    now = int(time.time())
    return DatCertificate(cid, DatSignature.generate(sa), DatCrypto.generate(ca), now - 10, now + 100, 1800)

def cert_test(test: 'TestCertificate', fail_cert: DatCertificate, cid: int, sa: DatSignatureAlgorithm, ca: DatCryptoAlgorithm):
    tag = f"CERT {sa.value} {ca.value}"
    original_plain = generate_base62(100)
    original_secure = generate_base62(100)

    new_cert = generate_certificate(cid, sa, ca)
    export_full_cert: str = new_cert.exports(False)
    export_verifying_cert = new_cert.exports(new_cert.support_verify_only())

    reimport_full_cert = DatCertificate.imports(export_full_cert)
    reimport_verifying_cert = DatCertificate.imports(export_verifying_cert)

    print(f"{tag} Generated-Imported cert: {export_full_cert}")

    dat_1 = DatManager._issue(new_cert, original_plain, original_secure)
    dat_2 = DatManager._issue(reimport_full_cert, original_plain, original_secure)
    dat_empty = DatManager._issue(new_cert, "", "")

    print(f"{tag} Issue DAT: {dat_1}")
    print(f"{tag} Issue DAT: {dat_2}")

    payload_1 = DatManager._parse(reimport_verifying_cert, dat_1)
    payload_2 = DatManager._parse(reimport_full_cert, dat_2)
    payload_empty = DatManager._parse(reimport_verifying_cert, dat_empty)

    assert payload_1.plain == original_plain
    assert payload_2.plain == original_plain
    assert payload_empty.plain == ""
    assert payload_1.secure == original_secure
    assert payload_2.secure == original_secure
    assert payload_empty.secure == ""
    print(f"{tag} Verify DAT")

    with test.assertRaises(RuntimeError):
        DatManager._parse(fail_cert, dat_1)


class TestCertificate(unittest.TestCase):


    def test(self):
        fail_cert = generate_certificate(3424342, DatSignatureAlgorithm.ECDSA_P256, DatCryptoAlgorithm.IV_AES128_GCM)
        for sa in DatSignatureAlgorithm:
            for ca in DatCryptoAlgorithm:
                for i in range(30):
                    cert_test(self, fail_cert, i, sa, ca)


if __name__ == "__main__":
    unittest.main()
