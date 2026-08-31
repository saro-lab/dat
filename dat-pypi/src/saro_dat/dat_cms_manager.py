import http.client
import logging
import socket
import threading
import time
import urllib.error
import urllib.request
from typing import Optional, Union
from urllib.parse import urlparse

from .dat_manager import DatManager
from .dat import Dat, DatPayload
from . import error as E
from .error import DatError, DatRetry
from .util import parse_u64

logger = logging.getLogger(__name__)


class _CleanupTimer(threading.Timer):
    def run(self):
        try:
            super().run()
        finally:
            self.function = None
            self.args = None
            self.kwargs = None


class _SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, origin: str):
        super().__init__()
        self._origin = origin

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if (parsed.scheme, parsed.netloc) != self._origin:
            raise urllib.error.URLError("cross-origin redirect is not allowed")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


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
        dat_manager: Optional[DatManager] = None,
        connect_timeout_seconds: float = 5,
        sync_timeout_seconds: float = 15,
    ):
        self._uri = uri
        self._token = token
        self._interval_seconds = interval_seconds
        self._verify_only = verify_only
        self._manager = dat_manager or DatManager()
        self._connect_timeout_seconds = connect_timeout_seconds
        self._sync_timeout_seconds = sync_timeout_seconds
        self._version = 0
        self._state_lock = threading.Lock()
        self._sync_lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._stopped = False
        self._last_error: Optional[DatError] = DatError(E.CMS_NOT_SYNCED)

        self.sync()

        if self._interval_seconds > 0:
            self._schedule_sync()

    def _schedule_sync(self):
        with self._state_lock:
            if not self._stopped:
                self._timer = _CleanupTimer(self._interval_seconds, self._run_sync_task)
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
        return self._last_error

    def sync(self):
        try:
            self.sync_or_raise()
            self._last_error = None
        except DatError as e:
            if e.retry is not DatRetry.STATE:
                self._last_error = e
                logger.error("[CRITICAL] DAT CMS SYNC %s: %s", self._uri, e)
        except Exception as e:
            self._last_error = DatError(E.CMS_UNKNOWN, "unclassified cms failure", e)
            logger.exception("[CRITICAL] DAT CMS SYNC %s", self._uri)

    def sync_or_raise(self):
        if not self._sync_lock.acquire(blocking=False):
            logger.debug("cms sync skipped, previous sync still running: %s", self._uri)
            raise DatError(E.CMS_SYNC_IN_PROGRESS)

        try:
            url = f"{self._uri}?version={self._version}"

            request = urllib.request.Request(url)
            request.add_header("Authorization", self._token)

            try:
                parsed = urlparse(self._uri)
                opener = urllib.request.build_opener(_SameOriginRedirect((parsed.scheme, parsed.netloc)))
                timeout = self._sync_timeout_seconds or self._connect_timeout_seconds or None
                response_cm = opener.open(request, timeout=timeout)
            except urllib.error.HTTPError as e:
                raise _http_status_error(e.code) from e
            except urllib.error.URLError as e:
                raise DatError(E.CMS_UNREACHABLE, f"cannot reach {self._uri}", e) from e

            with response_cm as response:
                if not (200 <= response.status <= 299):
                    raise _http_status_error(response.status)

                try:
                    body_bytes = response.read()
                except (OSError, socket.timeout, http.client.HTTPException) as e:
                    raise DatError(E.CMS_UNREACHABLE, f"cannot read {self._uri}", e) from e
                if not body_bytes:
                    raise DatError(E.CMS_MALFORMED, "response is empty")
                if any(byte > 0x7f for byte in body_bytes):
                    raise DatError(E.CMS_MALFORMED, "response is not strict ASCII")
                body = body_bytes.decode('ascii')
                lines = body.split('\n', 1)
                new_version_str = lines[0]
                new_certificates = lines[1].strip() if len(lines) == 2 else ""

                if not new_version_str:
                    raise DatError(E.CMS_MALFORMED, "version line is empty")

                try:
                    if not new_version_str.isascii() or not new_version_str.isdecimal() or not new_version_str:
                        raise DatError(E.CMS_MALFORMED, "version line is not a plain decimal u64")
                    new_version = parse_u64(new_version_str)
                except DatError as e:
                    raise DatError(E.CMS_MALFORMED, "version line is not a plain decimal u64", e) from e

                if not new_certificates:
                    logger.debug("No new certificate: %s", url)
                    return

                if new_version < self._version:
                    logger.warning("%s: %d -> %d", E.CMS_VERSION_RESET, self._version, new_version)

                try:
                    renew_count = self._manager.imports(new_certificates, False)
                except DatError as e:
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
        self._connect_timeout_seconds = 5
        self._sync_timeout_seconds = 15

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

    def connect_timeout_seconds(self, seconds: float):
        self._connect_timeout_seconds = seconds
        return self

    def sync_timeout_seconds(self, seconds: float):
        self._sync_timeout_seconds = seconds
        return self

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
            verify_only=self._verify_only,
            connect_timeout_seconds=self._connect_timeout_seconds,
            sync_timeout_seconds=self._sync_timeout_seconds,
        )
