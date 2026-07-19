import secrets
import string
import unittest

from saro_dat import DatSignatureAlgorithm, DatSignature


def generate_base62(length: int) -> str:
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def algorithm_test(algorithm: DatSignatureAlgorithm):
    tag = algorithm.value
    gen_key = DatSignature.generate(algorithm)

    export_key_pair = gen_key.exports(False)
    export_key_verifying = gen_key.exports(gen_key.support_verify_only())

    copy_export_key_pair = DatSignature.imports(algorithm, export_key_pair)
    copy_export_key_verifying = DatSignature.imports(algorithm, export_key_verifying)

    print(f"{tag} Generated-Imported key: {export_key_pair}")

    original_text = ">!#2 유니코드" + generate_base62(80)
    sign1 = gen_key.sign(original_text)
    sign2 = copy_export_key_pair.sign(original_text)

    assert gen_key.verify(original_text, sign1)
    assert copy_export_key_pair.verify(original_text, sign2)
    assert copy_export_key_verifying.verify(original_text, sign1)
    assert not copy_export_key_verifying.verify(b"", sign1)

    if gen_key.pair():
        assert export_key_pair != export_key_verifying
    else:
        assert export_key_pair == export_key_verifying

    print(f"{tag} Signing-Verify key")


class TestSignature(unittest.TestCase):

    def test(self):
        for algorithm in DatSignatureAlgorithm:
            for i in range(30):
                algorithm_test(algorithm)

if __name__ == "__main__":
    unittest.main()
