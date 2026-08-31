import gc
import http.client
import socket
import threading
import time
import weakref
from unittest.mock import patch

import pytest

from saro_dat import DatCmsManager, DatError, DatManager
from saro_dat import error as E
from saro_dat.dat_cms_manager import _CleanupTimer


class Response:
    def __init__(self, body=b"0", status=200, read_error=None):
        self.status = status
        self.body = body
        self.read_error = read_error

    def read(self):
        if self.read_error is not None:
            raise self.read_error
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class Opener:
    def __init__(self, response):
        self.response = response
        self.timeout = object()

    def open(self, *_args, **kwargs):
        self.timeout = kwargs.get("timeout")
        return self.response


def make_manager(connect_timeout=5, sync_timeout=15, interval=0, token="token"):
    manager = DatCmsManager.__new__(DatCmsManager)
    manager._uri = "http://fixture.invalid/v1/certs"
    manager._token = token
    manager._interval_seconds = interval
    manager._verify_only = False
    manager._manager = DatManager()
    manager._connect_timeout_seconds = connect_timeout
    manager._sync_timeout_seconds = sync_timeout
    manager._version = 0
    manager._state_lock = threading.Lock()
    manager._sync_lock = threading.Lock()
    manager._timer = None
    manager._stopped = False
    manager._last_error = DatError(E.CMS_NOT_SYNCED)
    return manager


@pytest.mark.parametrize(
    "read_error",
    [socket.timeout("read timed out"), http.client.IncompleteRead(b"42\n", 10)],
)
def test_read_timeout_and_truncated_body_map_to_unreachable(read_error):
    manager = make_manager()
    opener = Opener(Response(read_error=read_error))

    with patch("urllib.request.build_opener", return_value=opener):
        with pytest.raises(DatError) as raised:
            manager.sync_or_raise()

    assert raised.value.code == E.CMS_UNREACHABLE
    assert raised.value.__cause__ is read_error


def test_non_ascii_body_is_malformed():
    manager = make_manager()

    with patch("urllib.request.build_opener", return_value=Opener(Response(b"42\n\xff"))):
        with pytest.raises(DatError) as raised:
            manager.sync_or_raise()

    assert raised.value.code == E.CMS_MALFORMED


def test_delayed_body_timeout_is_reported_after_read_returns():
    entered = threading.Event()
    release = threading.Event()
    result = []

    class DelayedResponse(Response):
        def read(self):
            entered.set()
            release.wait(1)
            raise socket.timeout("read timed out")

    manager = make_manager()

    def sync():
        try:
            manager.sync_or_raise()
        except DatError as error:
            result.append(error)

    with patch("urllib.request.build_opener", return_value=Opener(DelayedResponse())):
        worker = threading.Thread(target=sync)
        worker.start()
        assert entered.wait(1)
        assert worker.is_alive()
        release.set()
        worker.join(1)

    assert not worker.is_alive()
    assert [error.code for error in result] == [E.CMS_UNREACHABLE]


@pytest.mark.parametrize(
    ("connect_timeout", "sync_timeout", "expected"),
    [(5, 15, 15), (5, 0, 5), (0, 0, None)],
)
def test_urllib_receives_one_operation_timeout(connect_timeout, sync_timeout, expected):
    manager = make_manager(connect_timeout, sync_timeout)
    opener = Opener(Response())

    with patch("urllib.request.build_opener", return_value=opener):
        manager.sync_or_raise()

    assert opener.timeout == expected


def test_stop_cancels_a_sleeping_timer():
    manager = make_manager(interval=30)
    manager._schedule_sync()
    timer = manager._timer

    manager.stop()
    timer.join(1)

    assert manager._stopped
    assert manager._timer is None
    assert not timer.is_alive()


def test_stop_does_not_claim_to_interrupt_active_urllib_but_prevents_reschedule():
    entered = threading.Event()
    release = threading.Event()

    class BlockingOpener:
        def open(self, *_args, **_kwargs):
            entered.set()
            release.wait(2)
            return Response()

    manager = make_manager(interval=30)
    timer = _CleanupTimer(0, manager._run_sync_task)
    manager._timer = timer

    with patch("urllib.request.build_opener", return_value=BlockingOpener()):
        timer.start()
        try:
            assert entered.wait(1)
            started = time.monotonic()
            manager.stop()
            assert time.monotonic() - started < 0.5
            assert timer.is_alive()
        finally:
            release.set()
            timer.join(1)

    assert not timer.is_alive()
    assert manager._timer is None
    assert manager._stopped


def test_stopped_manager_leaves_no_timer_or_token_reference():
    class Token(str):
        __slots__ = ("__weakref__",)

    token = Token("secret-token")
    manager = make_manager(interval=30, token=token)
    manager_ref = weakref.ref(manager)
    token_ref = weakref.ref(token)
    manager._schedule_sync()
    timer = manager._timer

    manager.stop()
    timer.join(1)
    del manager
    del token
    gc.collect()

    assert not timer.is_alive()
    assert manager_ref() is None
    assert token_ref() is None
