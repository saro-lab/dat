from __future__ import annotations
import threading
import time
from typing import List, Optional, Union

from . import DatCertificate, Dat, DatPayload
from . import error as E
from .error import DatError
from .util import encode_base64_url_str


def _no_issuable_cause(certificates) -> DatError:
    """발급 가능한 인증서가 없을 때 **왜** 없는지 가려낸다.

    예전에는 이 다섯 가지가 ``"Invalid DAT: Signing Key Does Not Exist"`` 문자열
    하나였다. 대응이 전부 다르다 — 발급창 전이면 기다리면 되고, verify-only 뿐이면
    배포 설정 실수이며, 0건이면 CMS 접속 문제다.
    """
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
        # 기다리면 풀리는 유일한 사유다. 하나라도 있으면 이것을 앞세운다.
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
        # Nothing new arrived: keep the current set untouched, expired entries
        # included. A CMS outage must not disarm a manager that still holds
        # usable certificates. (rust: DatManager::import_certificates)
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

            # Expired entries are dropped from the merged set, not just from the
            # incoming one, so a renewal actually evicts what it replaces.
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
        # 파싱 실패의 코드를 그대로 올린다. 예전에는 여기가 ValueError, 아래
        # _parse 가 RuntimeError 로 **같은 조건·같은 메시지가 타입만 달랐다.**
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
        dat.raise_if_invalid()
        # 만료와 형식 오류와 서명 위조를 갈라 낸다. 대응이 전부 다르다 —
        # 만료에는 토큰 갱신을, 위조에는 세션 차단을 해야 한다.
        if dat.expired():
            raise DatError(E.TOKEN_EXPIRED)

        # 서명 검증. verify 는 불일치에만 False 를 돌려주고, 백엔드 실패는
        # DAT_SIG_BACKEND 로 던진다.
        if not cert._signature_key.verify(dat.body_string(), dat._signature):
            raise DatError(E.SIG_MISMATCH)

        # 데이터 복호화
        decrypted_secure = cert._crypto_key.decrypt(dat._secure)
        return DatPayload(dat._plain, decrypted_secure)
