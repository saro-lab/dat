from __future__ import annotations
import threading
import time
from typing import List, Optional, Union

from . import DatCertificate, Dat, DatPayload
from . import error as E
from .error import DatError
from .util import encode_base64_url_str


def _no_issuable_cause(certificates) -> DatError:
    now = int(time.time())
    signable_seen = not_yet = ended = False

    for cert in certificates:
        if not cert.signable():
            continue
        signable_seen = True
        if now < cert.dat_issuance_start_seconds:
            not_yet = True
        elif now > cert.dat_issuance_end_seconds:
            ended = True

    if not signable_seen:
        return DatError(E.CERT_VERIFY_ONLY)
    if not_yet:
        return DatError(E.CERT_NOT_YET_ISSUABLE)
    if ended:
        return DatError(E.CERT_ISSUANCE_ENDED)
    return DatError(E.CERT_EXPIRED)


class DatManager:
    def __init__(self):
        self._issuer: Optional[DatCertificate] = None
        self._certificates: tuple = ()
        self._certificates_by_cid: dict = {}
        self._write_lock = threading.Lock()


    def import_certificates(self, input_certs: List[DatCertificate], clear: bool = False) -> int:
        if not input_certs:
            return 0

        seen_cids = set()
        for cert in input_certs:
            if cert.cid in seen_cids:
                raise DatError(E.CERT_DUPLICATE_CID, f"duplicate cid {cert.cid:x}")
            seen_cids.add(cert.cid)

        with self._write_lock:
            certificates = [] if clear else list(self._certificates)
            renew_count = 0

            before_cids = set(map(lambda x: x.cid, certificates))

            for cert in input_certs:
                if cert.cid in before_cids:
                    continue
                before_cids.add(cert.cid)
                certificates.append(cert)
                renew_count += 1

            certificates = [c for c in certificates if not c.expired()]
            certificates.sort(key=lambda x: x.dat_issuance_end_seconds)
            issuer = next((c for c in reversed(certificates) if c.issuable()), None)

            self._issuer = issuer
            self._certificates = tuple(certificates)
            self._certificates_by_cid = {c.cid: c for c in certificates}

            return renew_count


    def imports(self, format_str: str, clear: bool = False) -> int:
        format_str = format_str.strip()
        if not format_str:
            return 0
        certs = []
        for line in format_str.split('\n'):
            if line.strip():
                certs.append(DatCertificate.imports(line.strip()))
        return self.import_certificates(certs, clear)

    def exports(self, verify_only: bool = False) -> str:
        lines = []

        for cert in self._certificates:
            lines.append(cert.exports(verify_only))

        return '\n'.join(lines)

    def _find_unsafe(self, cid: int) -> Optional[DatCertificate]:
        return self._certificates_by_cid.get(cid)

    def issue(self, plain: Union[bytes, str, None], secure: Union[bytes, str, None]) -> str:
        issuer = self._issuer
        if issuer:
            return self._issue(issuer, plain, secure)
        certificates = self._certificates
        if not certificates:
            raise DatError(E.MANAGER_NO_CERTIFICATE)
        raise DatError(
            E.MANAGER_NO_ISSUABLE_CERTIFICATE,
            None,
            _no_issuable_cause(certificates),
        )

    def parse(self, dat_input: Union[Dat, str, None]) -> DatPayload:
        dat = Dat.from_value(dat_input)
        dat.raise_if_invalid()

        certificate = self._certificates_by_cid.get(dat._cid)
        if certificate is not None:
            return self._parse(certificate, dat)
        raise DatError(E.CERT_NOT_FOUND, f"cid {dat._cid:x}")

    @staticmethod
    def _issue(cert: DatCertificate, plain: Union[bytes, str, None], secure: Union[bytes, str, None]) -> str:
        now = int(time.time())
        expire = now + cert.dat_ttl_seconds
        cid_hex = hex(cert.cid)[2:]

        plain_bytes = plain.encode() if isinstance(plain, str) else (plain or b'')
        plain_b64 = encode_base64_url_str(plain_bytes)

        encrypted_secure = cert._crypto_key.encrypt(secure)
        secure_b64 = encode_base64_url_str(encrypted_secure)

        body = f"{expire}.{cid_hex}.{plain_b64}.{secure_b64}"
        signature = encode_base64_url_str(cert._signature_key.sign(body))

        return f"{body}.{signature}"

    @staticmethod
    def _parse(cert: DatCertificate, dat_input: Union[Dat, str, None]) -> DatPayload:
        dat = Dat.from_value(dat_input)
        dat.raise_if_invalid()
        if dat.expired():
            raise DatError(E.TOKEN_EXPIRED)

        if not cert._signature_key.verify(dat.body_string(), dat._signature):
            raise DatError(E.SIG_MISMATCH)

        decrypted_secure = cert._crypto_key.decrypt(dat._secure)
        return DatPayload(dat._plain, decrypted_secure)
