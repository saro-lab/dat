from __future__ import annotations
import time
from typing import Optional, Union

from .util import encode_base64_url_str

from .util import decode_base64_url


class Dat:
    def __init__(self, dat_str: Optional[str]):
        self.dat = dat_str or ''
        self._format = False
        self._expire = 0
        self._cid = 0
        self._plain = b''
        self._secure = b''
        self._signature = b''
        self._body = ''

        if self.dat:
            parts = self.dat.split('.')
            if len(parts) == 5:
                self._body = self.dat.rsplit('.', 1)[0]
                try:
                    # parts: [expire, cid(hex), plain(b64), secure(b64), signature(b64)]
                    self._expire = int(parts[0])
                    self._cid = int(parts[1], 16)
                    self._plain = decode_base64_url(parts[2])
                    self._secure = decode_base64_url(parts[3])
                    self._signature = decode_base64_url(parts[4])
                    self._format = (len(self._signature) > 0 and self._expire >= 0)
                except (ValueError, RuntimeError):
                    self._format = False

    @classmethod
    def from_value(cls, value: Union[Dat, str, None]) -> Dat:
        if isinstance(value, Dat):
            return value
        return cls(value)

    def expired(self) -> bool:
        if not self._format:
            return True
        return int(time.time()) > self._expire

    def body_string(self) -> str:
        """서명 검증을 위한 서명 제외 나머지 본문 반환"""
        if self._body:
            return self._body
        if '.' not in self.dat:
            return ""
        return self.dat.rsplit('.', 1)[0]

class DatPayload:
    def __init__(self, plain: bytes, secure: bytes):
        self.plain_bytes = plain
        self.secure_bytes = secure

    @property
    def plain(self) -> str:
        return self.plain_bytes.decode('utf-8')

    @property
    def secure(self) -> str:
        return self.secure_bytes.decode('utf-8')

    def __str__(self):
        return f"{encode_base64_url_str(self.plain_bytes)} {encode_base64_url_str(self.secure_bytes)}"

    def to_unsafe_string(self):
        return f"{self.plain} {self.secure}"

