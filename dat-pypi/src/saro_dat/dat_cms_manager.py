import logging
import threading
import time
import urllib.request
import urllib.error
from typing import Optional, Union

from .dat_manager import DatManager
from .dat import Dat, DatPayload
from . import error as E
from .error import DatError, DatRetry
from .util import parse_u64

logger = logging.getLogger(__name__)


def _http_status_error(status: int) -> DatError:
    if status == 401:
        return DatError(E.CMS_UNAUTHORIZED, "http 401")
    if status == 403:
        return DatError(E.CMS_FORBIDDEN, "http 403")
    if status == 404:
        return DatError(E.CMS_ENDPOINT_NOT_FOUND, "http 404")
    if 500 <= status <= 599:
        return DatError(E.CMS_SERVER_ERROR, f"http {status}")
    return DatError(E.CMS_HTTP_STATUS, f"http {status}")

class DatCmsManager:
    DAT_CMS_API_VERSION = "v1"

    def __init__(
        self,
        uri: str,
        token: str,
        interval_seconds: int = 60,
        verify_only: bool = False,
        dat_manager: Optional[DatManager] = None
    ):
        self._uri = uri
        self._token = token
        self._interval_seconds = interval_seconds
        self._verify_only = verify_only
        self._manager = dat_manager or DatManager()
        self._version = 0
        # Two locks on purpose: _state_lock guards the timer/stopped lifecycle and
        # is only ever held for a few instructions, while _sync_lock is held for
        # the whole HTTP round trip. Sharing one lock made stop() block for the
        # full network timeout behind an in-flight sync.
        self._state_lock = threading.Lock()
        self._sync_lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._stopped = False
        #: 마지막 동기화 실패. 한 번도 성공하지 못했으면 DAT_CMS_NOT_SYNCED, 정상이면 None.
        #: 최초 sync 실패를 삼키고 "인증서 0개 매니저"를 성공 반환하던 동작은 그대로
        #: 두되(list.md F-3), 실패가 로그로만 남던 것을 조회 가능하게 한다.
        self._last_error: Optional[DatError] = DatError(E.CMS_NOT_SYNCED)

        self.sync()

        if self._interval_seconds > 0:
            self._schedule_sync()

    def _schedule_sync(self):
        with self._state_lock:
            if not self._stopped:
                self._timer = threading.Timer(self._interval_seconds, self._run_sync_task)
                self._timer.daemon = True
                self._timer.start()

    def _run_sync_task(self):
        try:
            self.sync()
        finally:
            self._schedule_sync()

    def stop(self):
        with self._state_lock:
            self._stopped = True
            if self._timer:
                self._timer.cancel()
                self._timer = None

    def last_error(self) -> Optional[DatError]:
        """마지막 동기화 실패. 재시도 여부는 ``err.retry`` 로 판정한다."""
        return self._last_error

    def sync(self):
        """실패를 삼키되 코드로 분류해 ``last_error()`` 에 남긴다.

        기존 호출부가 갑자기 예외를 받지 않도록 예외를 밖으로 던지지는 않는다.
        """
        try:
            self._sync_or_raise()
            self._last_error = None
        except DatError as e:
            # 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
            if e.retry is not DatRetry.STATE:
                self._last_error = e
                logger.error("[CRITICAL] DAT CMS SYNC %s: %s", self._uri, e)
        except Exception as e:
            self._last_error = DatError(E.CMS_UNKNOWN, "unclassified cms failure", e)
            logger.exception("[CRITICAL] DAT CMS SYNC %s", self._uri)

    def _sync_or_raise(self):
        if not self._sync_lock.acquire(blocking=False):
            logger.debug("cms sync skipped, previous sync still running: %s", self._uri)
            raise DatError(E.CMS_SYNC_IN_PROGRESS)

        try:
            url = f"{self._uri}?version={self._version}"

            request = urllib.request.Request(url)
            request.add_header("Authorization", self._token)

            try:
                response_cm = urllib.request.urlopen(request, timeout=10)
            except urllib.error.HTTPError as e:
                # HTTP 상태를 갈라 낸다. 예전에는 전부 로그 한 줄이라 401(영구)에도
                # 60초마다 영원히 재시도했다.
                raise _http_status_error(e.code) from e
            except urllib.error.URLError as e:
                # DNS 실패·연결 거부·TLS 실패·타임아웃이 전부 여기로 온다. 전부 일시적이다.
                raise DatError(E.CMS_UNREACHABLE, f"cannot reach {self._uri}", e) from e

            with response_cm as response:
                if not (200 <= response.status <= 299):
                    raise _http_status_error(response.status)

                body = response.read().decode('utf-8')

                if not body:
                    logger.debug("No new certificate: %s", url)
                    return

                lines = body.split('\n', 1)
                if len(lines) < 2:
                    if body.startswith('\n'):
                        raise DatError(E.CMS_MALFORMED, "response has no version line")
                    logger.debug("No new certificate: %s", url)
                    return

                new_version_str = lines[0].strip()
                new_certificates = lines[1].strip()

                if not new_version_str:
                    raise DatError(E.CMS_MALFORMED, "version line is empty")

                # Strict decimal parse, same as rust's `ver.parse::<u64>()`.
                # int() would accept " 12 ", "+12" and "1_2".
                try:
                    new_version = parse_u64(new_version_str)
                except DatError as e:
                    raise DatError(E.CMS_MALFORMED, "version line is not a plain decimal u64", e) from e

                # 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다. 오류가
                # 아니라 상태 신호이며, 아래 imports 가 clear=True 라 그 자체로 처리된다.
                if new_version < self._version:
                    logger.warning("%s: %d -> %d", E.CMS_VERSION_RESET, self._version, new_version)

                # clear=True: the CMS response is the authoritative set, so it
                # replaces the local one instead of being merged into it.
                # Merging kept old CIDs around, and re-importing the same
                # payload then failed on "Duplicate CID" forever, pinning the
                # version and re-fetching the same body every cycle.
                # (rust: DatCmsManager::sync -> manager.import(&certs, true))
                try:
                    renew_count = self._manager.imports(new_certificates, True)
                except DatError as e:
                    # 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
                    raise DatError(E.CMS_IMPORT_FAILED, "cannot apply received certificates", e) from e

                self._version = new_version
                logger.debug("Renewed %d certificates for version %d: %s", renew_count, new_version, url)
        finally:
            self._sync_lock.release()

    def get_manager(self) -> DatManager:
        return self._manager

    def issue(self, plain: Union[bytes, str, None], secure: Union[bytes, str, None]) -> str:
        return self._manager.issue(plain, secure)

    def parse(self, dat: Union[Dat, str, None]) -> DatPayload:
        return self._manager.parse(dat)

    @classmethod
    def builder(cls):
        return DatCmsManagerBuilder()

class DatCmsManagerBuilder:
    def __init__(self):
        self._uri = "http://localhost:8088"
        self._token = ""
        self._verify_only = False
        self._interval_seconds = 60

    def uri(self, uri: str):
        self._uri = uri.rstrip('/')
        return self

    def token(self, token: str):
        self._token = token
        return self

    def verify_only(self, verify_only: bool):
        self._verify_only = verify_only
        return self

    def interval_seconds(self, interval_seconds: int):
        self._interval_seconds = interval_seconds
        return self

    def interval_off(self):
        return self.interval_seconds(0)

    def build(self) -> DatCmsManager:
        from urllib.parse import urlparse
        parsed = urlparse(self._uri)
        
        if parsed.scheme not in ('http', 'https'):
            raise DatError(E.CONFIG_URI_INVALID, "scheme must be http or https")
        if parsed.path and parsed.path != '/':
            raise DatError(E.CONFIG_URI_INVALID, f"must be path-less: {self._uri}")
        if parsed.query:
            raise DatError(E.CONFIG_URI_INVALID, f"must be query-less: {self._uri}")

        path = "/v1/certs/verify-only" if self._verify_only else "/v1/certs"

        final_uri = f"{parsed.scheme}://{parsed.netloc}{path}"
        
        return DatCmsManager(
            uri=final_uri,
            token=self._token,
            interval_seconds=self._interval_seconds,
            verify_only=self._verify_only
        )
