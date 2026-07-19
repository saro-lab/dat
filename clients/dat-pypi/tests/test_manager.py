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

class TestManager(unittest.TestCase):

    def test(self):
        original_plain = generate_base62(100)
        original_secure = generate_base62(100)
        dat_list: list[str] = []
        manager = DatManager()

        i = 0
        for sa in DatSignatureAlgorithm:
            for ca in DatCryptoAlgorithm:
                for _ in range(30):
                    i += 1
                    cert = generate_certificate(i, sa, ca)
                    manager.import_certificates([cert], False)
                    dat = DatManager._issue(cert, original_plain, original_secure)
                    dat_list.append(dat)

        print(f"DAT Manager Import : {len(dat_list)} Certificates")

        manager_full_export = manager.exports(False)


        reimport_full_manager = DatManager()
        reimport_full_manager.imports(manager_full_export)

        dat_list.append(reimport_full_manager.issue(original_plain, original_secure))

        print(f"DAT Manager Re-Import")
        print(f"ISSUE {len(dat_list)} DAT")

        for dat in dat_list:
            dat1 = manager.parse(dat)
            dat4 = reimport_full_manager.parse(dat)
            assert dat1.plain == original_plain
            assert dat1.secure == original_secure
            assert dat4.plain == original_plain
            assert dat4.secure == original_secure
            print(f"PARSE DAT: {dat}")

if __name__ == "__main__":
    unittest.main()
