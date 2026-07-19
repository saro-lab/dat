from __future__ import annotations
import base64
from typing import Union


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
        s = s.encode('utf-8')
    if s is None:
        return b""
    rem = len(s) % 4
    if rem > 0:
        s += b'=' * (4 - rem)
    return base64.urlsafe_b64decode(s)

def decode_base64_url_str(s: Union[bytes, str, None]) -> str:
    return decode_base64_url(s).decode('utf-8')