from __future__ import annotations
import base64
import binascii
from typing import Union

from . import error as E
from .error import DatError

_U64_MAX = 0xFFFFFFFFFFFFFFFF
_HEX_DIGITS = frozenset('0123456789abcdefABCDEF')
_BASE64_URL_BYTES = frozenset(b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')


def parse_u64(s: str) -> int:
    if not s or not all(c in '0123456789' for c in s):
        raise DatError(E.CONFIG_ARGUMENT_INVALID, f"not an unsigned decimal integer: {s!r}")
    v = int(s)
    if v > _U64_MAX:
        raise DatError(E.CONFIG_ARGUMENT_INVALID, f"exceeds u64: {s!r}")
    return v


def parse_u64_hex(s: str) -> int:
    if not s or not all(c in _HEX_DIGITS for c in s):
        raise DatError(E.CONFIG_ARGUMENT_INVALID, f"not an unsigned hex integer: {s!r}")
    v = int(s, 16)
    if v > _U64_MAX:
        raise DatError(E.CONFIG_ARGUMENT_INVALID, f"exceeds u64: {s!r}")
    return v


def encode_base64_url(s: Union[bytes, str, None]) -> bytes:
    if isinstance(s, str):
        if s == "":
            return b""
        s = s.encode('utf-8')
    if s is None:
        return b""
    return base64.urlsafe_b64encode(s).rstrip(b'=')

def encode_base64_url_str(s: Union[bytes, str, None]) -> str:
    return encode_base64_url(s).decode('ascii')

def decode_base64_url(s: Union[bytes, str, None]) -> bytes:
    if isinstance(s, str):
        if s == "":
            return b""
        try:
            s = s.encode('ascii')
        except UnicodeEncodeError as e:
            raise DatError(E.CONFIG_ARGUMENT_INVALID, "not canonical unpadded base64url", e) from e
    if s is None:
        return b""
    raw = bytes(s)
    if any(byte not in _BASE64_URL_BYTES for byte in raw) or len(raw) % 4 == 1:
        raise DatError(E.CONFIG_ARGUMENT_INVALID, "not canonical unpadded base64url")
    padded = raw + b'=' * ((4 - len(raw) % 4) % 4)
    try:
        decoded = base64.b64decode(padded, altchars=b'-_', validate=True)
    except (ValueError, binascii.Error) as e:
        raise DatError(E.CONFIG_ARGUMENT_INVALID, "not canonical unpadded base64url", e) from e
    if encode_base64_url(decoded) != raw:
        raise DatError(E.CONFIG_ARGUMENT_INVALID, "not canonical unpadded base64url")
    return decoded

def decode_base64_url_str(s: Union[bytes, str, None]) -> str:
    return decode_base64_url(s).decode('utf-8')
