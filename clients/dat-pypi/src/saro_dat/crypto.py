from __future__ import annotations
import os
from enum import Enum
from typing import Union, Dict, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .util import decode_base64_url


class DatCryptoAlgorithm(str, Enum):
    IV_AES128_GCM = "IV-AES128-GCM"
    IV_AES256_GCM = "IV-AES256-GCM"

CRYPTO_CONFIG: Dict[str, dict] = {
    "IV-AES128-GCM": {"name": "AES-GCM", "length": 16},
    "IV-AES256-GCM": {"name": "AES-GCM", "length": 32},
}

def get_crypto_config(algorithm: str) -> dict:
    config = CRYPTO_CONFIG.get(algorithm)
    if config:
        return config
    raise ValueError(f"Unsupported DAT Crypto Algorithm: {algorithm}")

class DatCrypto:
    def __init__(self, algorithm: DatCryptoAlgorithm, key_bytes: bytes, config: Optional[Dict[str, dict]] = None):
        if config is None:
            config = get_crypto_config(algorithm)
        self.algorithm = algorithm
        self._config = config
        self._key_bytes = key_bytes
        self._cipher = AESGCM(key_bytes)

    @classmethod
    def generate(cls, algorithm: DatCryptoAlgorithm) -> DatCrypto:
        config = get_crypto_config(algorithm)
        key_bytes = AESGCM.generate_key(bit_length=config['length'] * 8)
        return cls(algorithm, key_bytes, config)

    @classmethod
    def imports(cls, algorithm: str, base64_str: str) -> DatCrypto:
        return cls(DatCryptoAlgorithm(algorithm), decode_base64_url(base64_str))

    def exports(self) -> str:
        from .util import encode_base64_url_str
        return encode_base64_url_str(self._key_bytes)

    def encrypt(self, data: Union[bytes, str, None]) -> bytes:
        if isinstance(data, str):
            data = data.encode('utf-8')

        if not data:
            return b""

        #if self._config["name"] == "AES-GCM":

        nonce = os.urandom(12)
        ciphertext = self._cipher.encrypt(nonce, data, None)
        return nonce + ciphertext

        #raise ValueError(f"Unsupported DAT Crypto Algorithm: {self.algorithm}")

    def decrypt(self, data: Union[bytes, str, None]) -> bytes:
        if isinstance(data, str):
            data = decode_base64_url(data)

        if not data:
            return b""

        #if self._config["name"] == "AES-GCM":

        if len(data) <= 12:
            raise ValueError("Invalid data length")

        nonce = data[:12]
        ciphertext_with_tag = data[12:]

        return self._cipher.decrypt(nonce, ciphertext_with_tag, None)

        #raise ValueError(f"Unsupported DAT Crypto Algorithm: {self.algorithm}")