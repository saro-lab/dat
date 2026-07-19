import unittest
import time
import logging
from saro_dat import DatCmsManager, DatCertificate, DatSignature, DatSignatureAlgorithm, DatCrypto, DatCryptoAlgorithm

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


class TestExampleCms(unittest.TestCase):

    def test_use_dat_cms(self):

        manager = (
            DatCmsManager.builder()
            .uri("http://localhost:8088")
            .verify_only(False)
            #.interval_off() # sync off
            .interval_seconds(1)
            .token("12345678901b")
            .build()
        )

        # manual sync
        # manager.sync()

        try:
            plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
            secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

            print("plain : " + plain)
            print("secure : " + secure)

            # issue dat
            dat = manager.issue(plain, secure)
            print("dat : " + dat)

            # parse dat
            payload = manager.parse(dat)

            payload_plain = payload.plain
            payload_secure = payload.secure

            print("payload plain : " + payload_plain)
            print("payload secure : " + payload_secure)

            self.assertEqual(plain, payload_plain)
            self.assertEqual(secure, payload_secure)

        except Exception as e:
            print("ignore exception : " + str(e))

        time.sleep(5)
        manager.stop()

if __name__ == "__main__":
    unittest.main()
