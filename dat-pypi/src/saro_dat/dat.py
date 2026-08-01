from __future__ import annotations
import time
from typing import Optional, Union

from .util import encode_base64_url_str

from . import error as E
from .error import DatError
from .util import decode_base64_url, parse_u64, parse_u64_hex


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

        #: 파싱이 실패한 이유. 성공이면 None.
        #: 예전에는 `except (ValueError, RuntimeError): self._format = False` 가 모든
        #: 실패를 삼키고 플래그 하나만 남겼다. 어느 필드가 왜 틀렸는지가 전부 사라져
        #: 호출부는 "Invalid DAT: Format" 밖에 볼 수 없었다.
        self.error: Optional[DatError] = None

        if not self.dat:
            self.error = DatError(E.TOKEN_MALFORMED, "token is empty")
            return

        # 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
        #    애초에 토큰이 아니다.
        parts = self.dat.split('.')
        if len(parts) != 5:
            self.error = DatError(E.TOKEN_MALFORMED, "expected exactly 5 dot-separated fields")
            return

        self._body = self.dat.rsplit('.', 1)[0]

        # 2) 구조가 맞은 뒤에야 값을 본다. 필드마다 어디서 틀렸는지 코드를 붙인다.
        # parts: [expire, cid(hex), plain(b64), secure(b64), signature(b64)]
        try:
            self._expire = parse_u64(parts[0])
        except DatError as e:
            self.error = DatError(E.TOKEN_MALFORMED, "expire field is not a plain decimal u64", e)
            return
        try:
            self._cid = parse_u64_hex(parts[1])
        except DatError as e:
            self.error = DatError(E.TOKEN_MALFORMED, "cid field is not a plain hex u64", e)
            return
        try:
            self._plain = decode_base64_url(parts[2])
        except Exception as e:
            self.error = DatError(E.TOKEN_MALFORMED, "plain field is not base64url", e)
            return
        try:
            self._secure = decode_base64_url(parts[3])
        except Exception as e:
            self.error = DatError(E.TOKEN_MALFORMED, "secure field is not base64url", e)
            return
        try:
            self._signature = decode_base64_url(parts[4])
        except Exception as e:
            self.error = DatError(E.SIG_MALFORMED, "signature field is not base64url", e)
            return
        if len(self._signature) == 0:
            self.error = DatError(E.SIG_MALFORMED, "signature field is empty")
            return

        self._format = True

    def raise_if_invalid(self) -> None:
        """파싱에 실패했으면 그 코드로 던진다."""
        if self.error is not None:
            raise self.error

    @classmethod
    def from_value(cls, value: Union[Dat, str, None]) -> Dat:
        if isinstance(value, Dat):
            return value
        return cls(value)

    def expired(self) -> bool:
        if not self._format:
            return True
        return int(time.time()) >= self._expire

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

