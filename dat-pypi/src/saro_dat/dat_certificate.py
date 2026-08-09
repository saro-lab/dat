from __future__ import annotations
import time

from .crypto import DatCrypto
from .signature import DatSignature
from . import error as E
from .error import DatError
from .util import encode_base64_url_str, decode_base64_url, parse_u64, parse_u64_hex

_U64_MAX = 0xFFFFFFFFFFFFFFFF


def _u64(name: str, value: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise DatError(E.CERT_MALFORMED, f"{name} must be an integer")
    if value < 0 or value > _U64_MAX:
        raise DatError(E.CERT_MALFORMED, f"{name} must fit in u64: {value}")
    return value


class DatCertificate:
    def __init__(
            self,
            cid: int,
            dat_issuance_start_seconds: int,
            dat_issuance_duration_seconds: int,
            dat_ttl_seconds: int,
            signature_key: DatSignature,
            crypto_key: DatCrypto
    ):
        self.cid = _u64("cid", cid)
        self._signature_key = signature_key
        self._crypto_key = crypto_key
        self.dat_issuance_start_seconds = _u64("dat_issuance_start_seconds", dat_issuance_start_seconds)
        self.dat_ttl_seconds = _u64("dat_ttl_seconds", dat_ttl_seconds)

        duration = _u64("dat_issuance_duration_seconds", dat_issuance_duration_seconds)
        self.dat_issuance_end_seconds = _u64(
            "dat_issuance_start_seconds + dat_issuance_duration_seconds",
            self.dat_issuance_start_seconds + duration
        )
        self.expire_seconds = _u64(
            "dat_issuance_start_seconds + dat_issuance_duration_seconds + dat_ttl_seconds",
            self.dat_issuance_end_seconds + self.dat_ttl_seconds
        )

    @property
    def dat_issuance_duration_seconds(self) -> int:
        return self.dat_issuance_end_seconds - self.dat_issuance_start_seconds

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
            raise DatError(E.CERT_MALFORMED, "expected exactly 8 dot-separated fields")

        def _field(fn, raw, name):
            try:
                return fn(raw)
            except DatError as e:
                raise DatError(E.CERT_MALFORMED, f"{name} field is not a plain number", e) from e

        cid = _field(parse_u64_hex, parts[0], "cid")
        dat_issuance_start_seconds = _field(parse_u64, parts[1], "issuance_start_seconds")
        dat_issuance_duration_seconds = _field(parse_u64, parts[2], "issuance_duration_seconds")
        dat_ttl_seconds = _field(parse_u64, parts[3], "dat_ttl_seconds")
        signature_algorithm = parts[4]
        crypto_algorithm = parts[5]
        signature_key = DatSignature.imports(signature_algorithm, parts[6])
        crypto_key = DatCrypto.imports(crypto_algorithm, parts[7])

        return cls(
            cid,
            dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
            signature_key, crypto_key
        )

    def issuable(self) -> bool:
        now = int(time.time())
        return self.signable() and self.dat_issuance_start_seconds <= now <= self.dat_issuance_end_seconds

    def expired(self) -> bool:
        return self.expire_seconds < int(time.time())

    def signable(self) -> bool:
        return self._signature_key.signable()

    def pair(self) -> bool:
        return self._signature_key.pair()

    def support_verify_only(self) -> bool:
        return self._signature_key.support_verify_only()
