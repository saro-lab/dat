from __future__ import annotations
import os
from enum import Enum
from typing import Union, Dict, Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from . import error as E
from .error import DatError
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
    raise DatError(E.CONFIG_ALG_UNSUPPORTED, f"unknown crypto algorithm: {algorithm}")

class DatCrypto:
    def __init__(self, algorithm: DatCryptoAlgorithm, key_bytes: bytes, config: Optional[Dict[str, dict]] = None):
        if config is None:
            config = get_crypto_config(algorithm)
        # AESGCM accepts any valid AES length, so the declared algorithm has to be
        # cross-checked or a 16-byte key silently runs AES-128 under an
        # IV-AES256-GCM label. rust's DatCrypto::from_key rejects this.
        if len(key_bytes) != config["length"]:
            raise DatError(
                E.KEY_INVALID,
                f"{algorithm} key must be {config['length']} bytes, got {len(key_bytes)}",
            )
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
            raise DatError(E.CRYPTO_DATA_INVALID, "ciphertext is shorter than the 12-byte iv")

        nonce = data[:12]
        ciphertext_with_tag = data[12:]

        try:
            return self._cipher.decrypt(nonce, ciphertext_with_tag, None)
        except InvalidTag as e:
            # cryptography 의 InvalidTag 는 메시지가 비어 있어 그대로 새어 나가면
            # 아무 정보도 주지 못했다. parse_without_verify 경로에서는 이것이
            # 유일한 무결성 검사다.
            raise DatError(E.CRYPTO_TAG_MISMATCH, "gcm authentication tag mismatch", e) from e

        #raise ValueError(f"Unsupported DAT Crypto Algorithm: {self.algorithm}")