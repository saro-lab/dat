from __future__ import annotations
import threading
import time
from typing import List, Optional, Union

from . import DatCertificate, Dat, DatPayload
from .util import encode_base64_url_str


class DatManager:
    def __init__(self):
        self._issuer: Optional[DatCertificate] = None
        self._certificates: tuple = ()
        self._certificates_by_cid: dict = {}
        self._write_lock = threading.Lock()


    def import_certificates(self, input_certs: List[DatCertificate], clear: bool = False) -> int:
        with self._write_lock:
            certificates = [] if clear else list(self._certificates)
            renew_count = 0

            before_cids = set(map(lambda x: x.cid, certificates))
            seen_cids = set()

            for cert in input_certs:
                if cert.cid in seen_cids:
                    raise ValueError(f"Duplicate CID: {cert.cid}")
                seen_cids.add(cert.cid)
                if cert.expired():
                    continue
                if cert.cid in before_cids:
                    continue
                certificates.append(cert)
                renew_count += 1

            certificates.sort(key=lambda x: x.dat_issuance_end_seconds)
            issuer = next((c for c in reversed(certificates) if c.issuable()), None)

            self._issuer = issuer
            self._certificates = tuple(certificates)
            self._certificates_by_cid = {c.cid: c for c in certificates}

            return renew_count


    def imports(self, format_str: str, clear: bool = False) -> int:
        certs = []
        for line in format_str.strip().split('\n'):
            if line.strip():
                certs.append(DatCertificate.imports(line.strip()))
        return self.import_certificates(certs, clear)

    def exports(self, verify_only: bool = False) -> str:
        lines = []

        for cert in self._certificates:
            if not verify_only or cert.support_verify_only():
                lines.append(cert.exports(verify_only))

        return '\n'.join(lines)

    def _find_unsafe(self, cid: int) -> Optional[DatCertificate]:
        return self._certificates_by_cid.get(cid)

    def issue(self, plain: Union[bytes, str, None], secure: Union[bytes, str, None]) -> str:
        issuer = self._issuer
        if issuer:
            return self._issue(issuer, plain, secure)
        raise RuntimeError("Invalid DAT: Signing Key Does Not Exist")

    def parse(self, dat_input: Union[Dat, str, None]) -> DatPayload:
        dat = Dat.from_value(dat_input)
        if not dat._format:
            raise ValueError("Invalid DAT: Format")

        certificate = self._certificates_by_cid.get(dat._cid)
        if certificate is not None:
            return self._parse(certificate, dat)
        raise ValueError("Invalid DAT: CID(Certificate ID) Not Found")

    @staticmethod
    def _issue(cert: DatCertificate, plain: Union[bytes, str, None], secure: Union[bytes, str, None]) -> str:
        now = int(time.time())
        expire = now + cert.dat_ttl_seconds
        cid_hex = hex(cert.cid)[2:]

        # Plain 데이터 처리 (문자열인 경우 utf-8 바이트로)
        plain_bytes = plain.encode() if isinstance(plain, str) else (plain or b'')
        plain_b64 = encode_base64_url_str(plain_bytes)

        # Secure 데이터 암호화
        encrypted_secure = cert._crypto_key.encrypt(secure)
        secure_b64 = encode_base64_url_str(encrypted_secure)

        body = f"{expire}.{cid_hex}.{plain_b64}.{secure_b64}"
        signature = encode_base64_url_str(cert._signature_key.sign(body))

        return f"{body}.{signature}"

    @staticmethod
    def _parse(cert: DatCertificate, dat_input: Union[Dat, str, None]) -> DatPayload:
        dat = Dat.from_value(dat_input)
        if not dat._format:
            raise RuntimeError("Invalid DAT: Format")
        if dat.expired():
            raise RuntimeError("Invalid DAT: Expired")

        # 서명 검증
        if not cert._signature_key.verify(dat.body_string(), dat._signature):
            raise RuntimeError("Invalid DAT: Signature")

        # 데이터 복호화
        decrypted_secure = cert._crypto_key.decrypt(dat._secure)
        return DatPayload(dat._plain, decrypted_secure)
