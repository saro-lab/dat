from __future__ import annotations
import os
from enum import Enum
from typing import Union, Optional, TypeAlias

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurve
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature
from cryptography.hazmat.primitives.hashes import HashAlgorithm
from cryptography.hazmat.primitives.hmac import HMAC

from . import error as E
from .error import DatError
from .util import decode_base64_url, encode_base64_url_str


class DatSignatureAlgorithm(str, Enum):
    HMAC_SHA256_MFS = "HMAC-SHA256-MFS"
    HMAC_SHA384_MFS = "HMAC-SHA384-MFS"
    HMAC_SHA512_MFS = "HMAC-SHA512-MFS"
    ECDSA_P256 = "ECDSA-P256"
    ECDSA_P384 = "ECDSA-P384"
    ECDSA_P521 = "ECDSA-P521"


CurveType: TypeAlias = Union[EllipticCurve]
HashType: TypeAlias = Union[HashAlgorithm]
ConfigValue: TypeAlias = dict[str, Union[str, CurveType, HashAlgorithm, int]]

SIGNATURE_CONFIG: dict[str, ConfigValue] = {
    "HMAC-SHA256-MFS": {"name": "HMAC", "hash": hashes.SHA256(), "hmacLen": 32},
    "HMAC-SHA384-MFS": {"name": "HMAC", "hash": hashes.SHA384(), "hmacLen": 48},
    "HMAC-SHA512-MFS": {"name": "HMAC", "hash": hashes.SHA512(), "hmacLen": 64},
    "ECDSA-P256": {"name": "ECDSA", "curve": ec.SECP256R1(), "hash": hashes.SHA256(), "privateLen": 32, "publicLen": 65},
    "ECDSA-P384": {"name": "ECDSA", "curve": ec.SECP384R1(), "hash": hashes.SHA384(), "privateLen": 48, "publicLen": 97},
    "ECDSA-P521": {"name": "ECDSA", "curve": ec.SECP521R1(), "hash": hashes.SHA512(), "privateLen": 66, "publicLen": 133},
}

def get_signature_config(algorithm: str) -> dict:
    config = SIGNATURE_CONFIG.get(algorithm)
    if config:
        return config
    raise DatError(E.CONFIG_ALG_UNSUPPORTED, f"unknown signature algorithm: {algorithm}")

class DatSignature:
    def __init__(
            self,
            algorithm: DatSignatureAlgorithm,
            signing_key: Optional[Union[ec.EllipticCurvePrivateKey, bytes]],
            verifying_key: Union[ec.EllipticCurvePublicKey, bytes],
            config: ConfigValue
    ):
        if config is None:
            config = get_signature_config(algorithm)
        self.algorithm = algorithm
        self.signing_key = signing_key
        self.verifying_key = verifying_key
        self._config = config

        self._is_hmac = config["name"] == "HMAC"
        if self._is_hmac:
            self._hmac_verify_proto = HMAC(verifying_key, config["hash"])
            self._hmac_sign_proto = HMAC(signing_key, config["hash"]) if signing_key is not None else None
            self._ecdsa_algorithm = None
            self._raw_len = 0
        else:
            self._hmac_verify_proto = None
            self._hmac_sign_proto = None
            self._ecdsa_algorithm = ec.ECDSA(config["hash"])
            self._raw_len = (config["curve"].key_size + 7) // 8

    @staticmethod
    def generate(algorithm: Union[DatSignatureAlgorithm, str]) -> DatSignature:
        config = get_signature_config(algorithm)
        if isinstance(algorithm, str):
            algorithm = DatSignatureAlgorithm(algorithm)

        if config["name"] == "HMAC":
            key = os.urandom(config["hmacLen"])
            return DatSignature(algorithm, key, key, config)
        else:
            private_key = ec.generate_private_key(config["curve"])
            public_key = private_key.public_key()
            return DatSignature(algorithm, private_key, public_key, config)

    @staticmethod
    def imports(algorithm: Union[DatSignatureAlgorithm, str], base64_str: str) -> DatSignature:
        config = get_signature_config(algorithm)
        if isinstance(algorithm, str):
            algorithm = DatSignatureAlgorithm(algorithm)

        bytes_data = decode_base64_url(base64_str)

        if config["name"] == "HMAC":
            if len(bytes_data) != config["hmacLen"]:
                raise DatError(E.KEY_INVALID, f"hmac key must be {config['hmacLen']} bytes, got {len(bytes_data)}")
            return DatSignature(algorithm, bytes_data, bytes_data, config)
        else:
            private_len = config["privateLen"]
            public_len = config["publicLen"]

            signing_key = None
            verifying_key = None

            if len(bytes_data) == private_len + public_len:
                private_bytes = bytes_data[:private_len]
                public_bytes = bytes_data[private_len:]

                d_value = int.from_bytes(private_bytes, 'big')
                signing_key = ec.derive_private_key(d_value, config["curve"])
                verifying_key = ec.EllipticCurvePublicKey.from_encoded_point(
                    config["curve"], public_bytes
                )
            elif len(bytes_data) == public_len:
                verifying_key = ec.EllipticCurvePublicKey.from_encoded_point(
                    config["curve"], bytes_data
                )
            else:
                raise DatError(E.KEY_INVALID, "ecdsa key length matches neither private+public nor public")

            return DatSignature(algorithm, signing_key, verifying_key, config)

    def exports(self, verify_only: bool = False) -> str:
        if verify_only and not self.support_verify_only():
            raise DatError(E.KEY_VERIFY_ONLY_UNSUPPORTED, str(self.algorithm.value))

        if self._is_hmac:
            return encode_base64_url_str(self.verifying_key)
        else:
            if verify_only or not self.signing_key:
                public_bytes = self.verifying_key.public_bytes(
                    encoding=serialization.Encoding.X962,
                    format=serialization.PublicFormat.UncompressedPoint
                )
                return encode_base64_url_str(public_bytes)
            else:
                private_numbers = self.signing_key.private_numbers()
                d_bytes = private_numbers.private_value.to_bytes(self._config["privateLen"], 'big')

                public_bytes = self.verifying_key.public_bytes(
                    encoding=serialization.Encoding.X962,
                    format=serialization.PublicFormat.UncompressedPoint
                )
                return encode_base64_url_str(d_bytes + public_bytes)

    def sign(self, body: Union[bytes, str]) -> bytes:
        if not self.signing_key:
            raise DatError(E.SIG_KEY_MISSING, "this key is verify-only")

        if isinstance(body, str):
            body = body.encode()

        if not body:
            raise DatError(E.CONFIG_ARGUMENT_INVALID, "body to sign is empty")

        if self._is_hmac:
            h = self._hmac_sign_proto.copy()
            h.update(body)
            return h.finalize()
        else:
            signature = self.signing_key.sign(body, self._ecdsa_algorithm)
            return self._der_to_raw_signature(signature)

    def verify(self, body: Union[bytes, str], signature: Union[bytes, str]) -> bool:
        if isinstance(body, str):
            body = body.encode('utf-8')
        if not body:
            return False

        sig_bytes = decode_base64_url(signature) if isinstance(signature, str) else signature

        if self._is_hmac:
            try:
                h = self._hmac_verify_proto.copy()
                h.update(body)
                h.verify(sig_bytes)
                return True
            except InvalidSignature:
                return False
            except Exception as e:
                raise DatError(E.SIG_BACKEND, "hmac verification failed to run", e) from e
        else:
            try:
                der_sig = self._raw_to_der_signature(sig_bytes)
                self.verifying_key.verify(der_sig, body, self._ecdsa_algorithm)
                return True
            except InvalidSignature:
                return False
            except Exception as e:
                raise DatError(E.SIG_BACKEND, "ecdsa verification failed to run", e) from e

    def signable(self) -> bool:
        return self.signing_key is not None

    def pair(self) -> bool:
        return not self._is_hmac

    def support_verify_only(self) -> bool:
        return self.pair()

    def _der_to_raw_signature(self, signature: bytes) -> bytes:
        r, s = decode_dss_signature(signature)
        size = self._raw_len
        return r.to_bytes(size, 'big') + s.to_bytes(size, 'big')

    def _raw_to_der_signature(self, signature: bytes) -> bytes:
        size = len(signature) // 2
        r = int.from_bytes(signature[:size], 'big')
        s = int.from_bytes(signature[size:], 'big')
        return encode_dss_signature(r, s)
