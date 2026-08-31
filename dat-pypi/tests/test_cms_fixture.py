import json
from pathlib import Path
from unittest.mock import patch

import pytest

from saro_dat import DatCmsManager, DatManager
from saro_dat import error as E
from saro_dat.error import DatError
from saro_dat.dat_cms_manager import _SameOriginRedirect


FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "cms_v1_state_transitions.json").read_text())


class Response:
    def __init__(self, status, body):
        self.status = status
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class Opener:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.timeout = None

    def open(self, *_args, **kwargs):
        self.timeout = kwargs.get("timeout")
        if self.error:
            raise self.error
        return self.response


def body(case):
    result = b""
    for kind, value in case["input"].get("body", []):
        if kind == "ascii":
            result += value.encode("ascii")
        elif kind == "hex":
            result += bytes.fromhex(value)
        else:
            result += FIXTURE["certificates"][value]["wire_ascii"].encode("ascii")
    return result


def make_manager(state):
    manager = DatCmsManager.__new__(DatCmsManager)
    manager._uri = "http://fixture.invalid/v1/certs"
    manager._token = ""
    manager._manager = DatManager()
    manager._version = int(FIXTURE["states"][state]["version"])
    manager._sync_lock = __import__("threading").Lock()
    manager._connect_timeout_seconds = 0
    manager._sync_timeout_seconds = 0
    for key in FIXTURE["states"][state]["certificates"]:
        manager._manager.imports(FIXTURE["certificates"][key]["wire_ascii"], False)
    return manager


def expected(case):
    return case.get("expect") or case["expect_by_profile"]["unsigned_u64"]


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=lambda case: case["id"])
def test_g0_cms_state_transitions(case):
    cms = make_manager(case["initial"])
    want = expected(case)
    if case["input"]["kind"] == "transport":
        opener = Opener(error=__import__("urllib.error").error.URLError("transport"))
    else:
        opener = Opener(Response(case["input"]["status"], body(case)))
    with patch("urllib.request.build_opener", return_value=opener):
        if want["error"]:
            with pytest.raises(DatError) as raised:
                cms.sync_or_raise()
            assert raised.value.code == want["error"].split("(")[0]
            assert raised.value.retry.value == want["retry"]
        else:
            cms.sync_or_raise()
    state = FIXTURE["states"][want["state"]]
    assert cms._version == int(state["version"])
    assert [cert.cid for cert in cms._manager._certificates] == [
        int(FIXTURE["certificates"][key]["cid"], 16) for key in state["certificates"]
    ]


def test_same_origin_redirect_rejects_other_origin():
    handler = _SameOriginRedirect(("https", "cms.example"))
    with pytest.raises(__import__("urllib.error").error.URLError):
        handler.redirect_request(None, None, 302, "found", {}, "https://other.example/v1/certs")


def test_same_origin_redirect_is_allowed():
    handler = _SameOriginRedirect(("https", "cms.example"))
    request = __import__("urllib.request").request.Request("https://cms.example/v1/certs")
    assert handler.redirect_request(request, None, 302, "found", {}, "https://cms.example/next")
