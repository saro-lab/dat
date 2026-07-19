import logging
import threading
import time
import urllib.request
import urllib.error
from typing import Optional, Union

from .dat_manager import DatManager
from .dat import Dat, DatPayload

logger = logging.getLogger(__name__)

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
        self._lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._stopped = False

        self.sync()

        if self._interval_seconds > 0:
            self._schedule_sync()

    def _schedule_sync(self):
        with self._lock:
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
        with self._lock:
            self._stopped = True
            if self._timer:
                self._timer.cancel()

    def sync(self):
        if not self._lock.acquire(blocking=False):
            logger.warning("Last request ignored (Duplicate request)")
            return

        try:
            url = f"{self._uri}?version={self._version}"

            request = urllib.request.Request(url)
            request.add_header("Authorization", self._token)
            
            with urllib.request.urlopen(request, timeout=10) as response:
                if response.status != 200:
                    logger.error(f"Response status error, status:{response.status} in {url}")
                    return

                body = response.read().decode('utf-8')
                
                if not body:
                    logger.debug(f"No new certificate: {url}")
                    return

                lines = body.split('\n', 1)
                if len(lines) < 2:
                    if body.startswith('\n'):
                         logger.error(f"Invalid response: {url}")
                         return
                    logger.debug(f"No new certificate: {url}")
                    return

                new_version_str = lines[0].strip()
                new_certificates = lines[1].strip()

                if not new_version_str:
                    logger.error(f"Invalid version in response: {url}")
                    return

                try:
                    new_version = int(new_version_str)
                    renew_count = self._manager.imports(new_certificates, False)
                    self._version = new_version
                    logger.debug(f"Renewed {renew_count} certificates for version {new_version}: {url}")
                except ValueError as e:
                    logger.error(f"Failed to parse version or certificates: {e}")

        except urllib.error.URLError as e:
            logger.error(f"[Exception] DAT CMS Sync {self._uri}: {e}")
        except Exception as e:
            logger.exception(f"[Exception] DAT CMS Sync {self._uri}")
        finally:
            self._lock.release()

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
        
        if parsed.path and parsed.path != '/':
            raise ValueError(f"uri must be path-less: {self._uri}")
        if parsed.query:
            raise ValueError(f"uri must be query-less: {self._uri}")

        path = "/v1/certs/verify-only" if self._verify_only else "/v1/certs"

        final_uri = f"{parsed.scheme}://{parsed.netloc}{path}"
        
        return DatCmsManager(
            uri=final_uri,
            token=self._token,
            interval_seconds=self._interval_seconds,
            verify_only=self._verify_only
        )
