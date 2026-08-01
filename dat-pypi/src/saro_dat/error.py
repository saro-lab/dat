"""DAT 통합 오류 코드 (error.pre2.md).

코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. 메시지는 자유롭게 바꿔도 되지만
``code`` 는 바꾸지 않는다.

- 분류는 **원인**이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
- ``*_UNKNOWN`` 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
- 하위 원인은 버리지 않고 ``__cause__`` 로 보존한다.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

# --- TOKEN : DAT 토큰 문자열 ---
TOKEN_MALFORMED = "DAT_TOKEN_MALFORMED"
TOKEN_EXPIRED = "DAT_TOKEN_EXPIRED"
TOKEN_UNKNOWN = "DAT_TOKEN_UNKNOWN"

# --- CERT : 인증서 ---
CERT_MALFORMED = "DAT_CERT_MALFORMED"
CERT_EXPIRED = "DAT_CERT_EXPIRED"
CERT_NOT_YET_ISSUABLE = "DAT_CERT_NOT_YET_ISSUABLE"
CERT_ISSUANCE_ENDED = "DAT_CERT_ISSUANCE_ENDED"
CERT_VERIFY_ONLY = "DAT_CERT_VERIFY_ONLY"
CERT_NOT_FOUND = "DAT_CERT_NOT_FOUND"
CERT_NOT_SYNCED = "DAT_CERT_NOT_SYNCED"
CERT_DUPLICATE_CID = "DAT_CERT_DUPLICATE_CID"
CERT_UNKNOWN = "DAT_CERT_UNKNOWN"

# --- SIG : 서명 ---
SIG_MISMATCH = "DAT_SIG_MISMATCH"
SIG_MALFORMED = "DAT_SIG_MALFORMED"
SIG_KEY_MISSING = "DAT_SIG_KEY_MISSING"
SIG_BACKEND = "DAT_SIG_BACKEND"
SIG_UNKNOWN = "DAT_SIG_UNKNOWN"

# --- CRYPTO : secure 페이로드 ---
CRYPTO_TAG_MISMATCH = "DAT_CRYPTO_TAG_MISMATCH"
CRYPTO_DATA_INVALID = "DAT_CRYPTO_DATA_INVALID"
CRYPTO_BACKEND = "DAT_CRYPTO_BACKEND"
CRYPTO_UNKNOWN = "DAT_CRYPTO_UNKNOWN"

# --- KEY : 키 재료 ---
KEY_INVALID = "DAT_KEY_INVALID"
KEY_VERIFY_ONLY_UNSUPPORTED = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED"
KEY_UNKNOWN = "DAT_KEY_UNKNOWN"

# --- MANAGER : 매니저 보유 상태 ---
MANAGER_NO_CERTIFICATE = "DAT_MANAGER_NO_CERTIFICATE"
MANAGER_NO_ISSUABLE_CERTIFICATE = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE"
MANAGER_DISPOSED = "DAT_MANAGER_DISPOSED"
MANAGER_UNKNOWN = "DAT_MANAGER_UNKNOWN"

# --- CMS : 서버 응답·전송 ---
CMS_UNREACHABLE = "DAT_CMS_UNREACHABLE"
CMS_UNAUTHORIZED = "DAT_CMS_UNAUTHORIZED"
CMS_FORBIDDEN = "DAT_CMS_FORBIDDEN"
CMS_ENDPOINT_NOT_FOUND = "DAT_CMS_ENDPOINT_NOT_FOUND"
CMS_SERVER_ERROR = "DAT_CMS_SERVER_ERROR"
CMS_HTTP_STATUS = "DAT_CMS_HTTP_STATUS"
CMS_MALFORMED = "DAT_CMS_MALFORMED"
CMS_IMPORT_FAILED = "DAT_CMS_IMPORT_FAILED"
CMS_VERSION_RESET = "DAT_CMS_VERSION_RESET"
CMS_NOT_SYNCED = "DAT_CMS_NOT_SYNCED"
CMS_SYNC_IN_PROGRESS = "DAT_CMS_SYNC_IN_PROGRESS"
CMS_NOT_SUPPORTED = "DAT_CMS_NOT_SUPPORTED"
CMS_UNKNOWN = "DAT_CMS_UNKNOWN"

# --- CONFIG : 호출자가 넘긴 값 ---
CONFIG_ALG_UNSUPPORTED = "DAT_CONFIG_ALG_UNSUPPORTED"
CONFIG_URI_INVALID = "DAT_CONFIG_URI_INVALID"
CONFIG_ARGUMENT_INVALID = "DAT_CONFIG_ARGUMENT_INVALID"
CONFIG_UNKNOWN = "DAT_CONFIG_UNKNOWN"

# --- INTERNAL : 실행 환경 ---
INTERNAL_UNAVAILABLE = "DAT_INTERNAL_UNAVAILABLE"
INTERNAL_UNKNOWN = "DAT_INTERNAL_UNKNOWN"


class DatRetry(str, Enum):
    """재시도 분류. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다."""

    #: 같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도한다.
    TRANSIENT = "transient"
    #: 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다.
    PERMANENT = "permanent"
    #: 오류가 아닌 상태 신호. 흐름 제어에만 쓴다.
    STATE = "state"


_TRANSIENT = frozenset({
    CERT_NOT_YET_ISSUABLE, CERT_NOT_SYNCED, MANAGER_NO_CERTIFICATE,
    CMS_UNREACHABLE, CMS_SERVER_ERROR, CMS_NOT_SYNCED,
})

_STATE = frozenset({CMS_VERSION_RESET, CMS_SYNC_IN_PROGRESS})

_SECURITY = frozenset({SIG_MISMATCH, CRYPTO_TAG_MISMATCH})


class DatError(ValueError, RuntimeError):
    """DAT 의 단일 오류 타입.

    ``ValueError`` 와 ``RuntimeError`` 를 **둘 다** 상속한다. 예전에는 같은 조건·같은
    메시지가 호출 경로에 따라 두 타입으로 갈렸고(``dat_manager.parse`` 는 ValueError,
    ``dat_manager._parse`` 는 RuntimeError), 그래서 어느 쪽을 잡아야 하는지 알 수
    없었다. 둘 다 상속해 기존 ``except`` 절을 깨지 않으면서 타입 분기를 없앤다.
    """

    def __init__(self, code: str, detail: Optional[str] = None, cause: Optional[BaseException] = None):
        super().__init__(f"{code}: {detail}" if detail else code)
        #: 공개 계약인 오류 코드. 모든 공식 클라이언트에서 동일하다.
        self.code = code
        self.detail = detail
        if cause is not None:
            # 하위 원인을 버리지 않는다.
            self.__cause__ = cause

    @property
    def retry(self) -> DatRetry:
        """재시도 분류. 애매하면 PERMANENT 다 — 영구 오류에 대한 무한 재시도가
        이 체계 이전의 실제 결함이었다."""
        if self.code == MANAGER_NO_ISSUABLE_CERTIFICATE:
            # 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
            cause = self.__cause__
            if isinstance(cause, DatError) and cause.code == CERT_NOT_YET_ISSUABLE:
                return DatRetry.TRANSIENT
            return DatRetry.PERMANENT
        if self.code in _TRANSIENT:
            return DatRetry.TRANSIENT
        if self.code in _STATE:
            return DatRetry.STATE
        return DatRetry.PERMANENT

    @property
    def security_event(self) -> bool:
        """위조·변조 시도의 직접 증거. 다른 실패와 같은 경로로 로깅하지 않는다."""
        return self.code in _SECURITY

    def __repr__(self) -> str:
        return f"DatError({self.code!r}, {self.detail!r})"


def code_of(e: BaseException) -> Optional[str]:
    """어떤 예외에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 None 이다."""
    return e.code if isinstance(e, DatError) else None
