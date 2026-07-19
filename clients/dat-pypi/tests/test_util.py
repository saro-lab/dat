import unittest

from saro_dat.util import decode_base64_url_str, encode_base64_url_str


class TestUtil(unittest.TestCase):
    def test_base64(self):
        text = "$$><'2    ABC  유니코드"
        b64 = "JCQ-PCcyICAgIEFCQyAg7Jyg64uI7L2U65Oc"

        b64_1 = encode_base64_url_str(text)
        self.assertEqual(b64, b64_1)
        print(b64_1)

        de_b64_1 = decode_base64_url_str(b64_1)
        self.assertEqual(text, de_b64_1)
        print(de_b64_1)

        print("Test passed successfully")




if __name__ == "__main__":
    unittest.main()

