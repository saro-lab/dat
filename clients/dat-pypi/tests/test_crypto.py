import secrets
import string
import unittest

from saro_dat import util
from saro_dat.crypto import DatCrypto, DatCryptoAlgorithm


def generate_base62(length: int) -> str:
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def algorithm_test(algorithm: DatCryptoAlgorithm):
    tag = algorithm.value
    gen_key = DatCrypto.generate(algorithm)
    export_key_base64 = gen_key.exports()
    copy_key = DatCrypto.imports(algorithm, export_key_base64)
    print(f"{tag} Generated-Imported key: {export_key_base64}")

    original_text = ">!#2 유니코드" + generate_base62(80)
    encrypted = util.encode_base64_url_str(gen_key.encrypt(original_text))
    print(f"{tag} Encrypted: {encrypted}")

    decrypted = copy_key.decrypt(encrypted).decode('utf-8')
    print(f"{tag} Decrypted: {decrypted}")

    # empty
    original_text = ""
    encrypted = util.encode_base64_url_str(gen_key.encrypt(original_text))
    print(f"{tag} Encrypted: {encrypted}")

    decrypted = copy_key.decrypt(encrypted).decode('utf-8')
    print(f"{tag} Decrypted: {decrypted}")

    assert(original_text == decrypted)


class TestDatCrypto(unittest.TestCase):

    def test(self):
        for algorithm in DatCryptoAlgorithm:
            for i in range(30):
                algorithm_test(algorithm)


if __name__ == "__main__":
    unittest.main()
