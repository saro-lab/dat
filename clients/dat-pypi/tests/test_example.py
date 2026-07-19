import time
import unittest

from saro_dat import DatManager, DatCertificate, DatSignature, DatSignatureAlgorithm, DatCrypto, DatCryptoAlgorithm


class TestExample(unittest.TestCase):


    def test_issue_and_parse(self):
        dat_manager = DatManager()

        # create certificate
        now = int(time.time())
        cert = DatCertificate(0, DatSignature.generate(DatSignatureAlgorithm.ECDSA_P256), DatCrypto.generate(DatCryptoAlgorithm.IV_AES128_GCM), now - 10, now + 10, 1800)

        # import certificate
        dat_manager.import_certificates([cert])

        plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
        secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

        dat = dat_manager.issue(plain, secure)
        payload = dat_manager.parse(dat)

        assert payload.plain == plain
        assert payload.secure == secure
        print(f"PARSE DAT: {dat}")
        print(f"plain: {payload.plain}")
        print(f"secure: {payload.secure}")

        


if __name__ == "__main__":
    unittest.main()


