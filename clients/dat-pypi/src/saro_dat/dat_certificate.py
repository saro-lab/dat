from __future__ import annotations
import time

from .crypto import DatCrypto
from .signature import DatSignature
from .util import encode_base64_url_str, decode_base64_url


class DatCertificate:
    def __init__(
            self,
            cid: int,
            signature_key: DatSignature,
            crypto_key: DatCrypto,
            dat_issuance_start_seconds: int,
            dat_issuance_end_seconds: int,
            dat_ttl_seconds: int
    ):
        self.cid = cid
        self._signature_key = signature_key
        self._crypto_key = crypto_key
        self.dat_issuance_start_seconds = dat_issuance_start_seconds
        self.dat_issuance_end_seconds = dat_issuance_end_seconds
        self.dat_ttl_seconds = dat_ttl_seconds

    def exports(self, verify_only: bool = False) -> str:
        cid_hex = hex(self.cid)[2:]
        dat_issuance_start_seconds = str(self.dat_issuance_start_seconds)
        dat_issuance_duration_seconds = str(self.dat_issuance_end_seconds - self.dat_issuance_start_seconds)
        dat_ttl_seconds = str(self.dat_ttl_seconds)
        signature_algorithm = self._signature_key.algorithm.value
        crypto_algorithm = self._crypto_key.algorithm.value
        signature_key = self._signature_key.exports(verify_only)
        crypto_key = self._crypto_key.exports()

        return f"{cid_hex}.{dat_issuance_start_seconds}.{dat_issuance_duration_seconds}.{dat_ttl_seconds}.{signature_algorithm}.{crypto_algorithm}.{signature_key}.{crypto_key}"

    @classmethod
    def imports(cls, format_str: str) -> DatCertificate:
        parts = format_str.split(".")
        if len(parts) != 8:
            raise ValueError("Invalid Certificate format")

        cid = int(parts[0], 16)
        dat_issuance_start_seconds = int(parts[1])
        dat_issuance_duration_seconds = int(parts[2])
        dat_ttl_seconds = int(parts[3])
        signature_algorithm = parts[4]
        crypto_algorithm = parts[5]
        signature_key = DatSignature.imports(signature_algorithm, parts[6])
        crypto_key = DatCrypto.imports(crypto_algorithm, parts[7])

        return cls(
            cid, signature_key, crypto_key,
            dat_issuance_start_seconds, dat_issuance_start_seconds + dat_issuance_duration_seconds, dat_ttl_seconds
        )

    def issuable(self) -> bool:
        now = int(time.time())
        return self.signable() and self.dat_issuance_start_seconds <= now <= self.dat_issuance_end_seconds

    def expired(self) -> bool:
        return int(time.time()) > (self.dat_issuance_end_seconds + self.dat_ttl_seconds)

    def signable(self) -> bool:
        return self._signature_key.signable()

    def pair(self) -> bool:
        return self._signature_key.pair()

    def support_verify_only(self) -> bool:
        return self._signature_key.support_verify_only()