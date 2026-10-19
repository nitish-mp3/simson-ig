import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock

import pytest

root = Path(__file__).parents[1] / "custom_components/simson"
package = ModuleType("video_tests")
package.__path__ = [str(root)]
sys.modules[package.__name__] = package
spec = importlib.util.spec_from_file_location("video_tests.videophones", root / "videophones.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_video_profiles_use_named_streams_and_never_browser_supplied_source_urls():
    extension, profile = module.validated_profile({"extension": "1604", "stream_name": "entrance", "bridge_url": "http://127.0.0.1:1984"})
    assert extension == "1604"
    assert profile["stream_name"] == "entrance"
    for stream in ("rtsp://camera/stream", "../api/config", "http://internal"):
        with pytest.raises(ValueError):
            module.validated_profile({"extension": "1604", "stream_name": stream})
    for bridge in ("file:///etc/passwd", "http://user:secret@localhost:1984", "http://localhost:1984/api/config"):
        with pytest.raises(ValueError):
            module.validated_profile({"extension": "1604", "stream_name": "entrance", "bridge_url": bridge})


def test_only_active_call_participants_can_request_the_associated_video_source():
    call = {"call_id": "one", "state": "active", "direction": "outgoing", "caller_user_id": "owner", "remote_node_id": "sip:1604"}
    assert module.may_view_call(call, "owner", "1604")
    assert not module.may_view_call(call, "observer", "1604")
    assert not module.may_view_call(call, "owner", "1605")
    assert not module.may_view_call({**call, "state": "ended"}, "owner", "1604")
    assert not module.may_view_call({**call, "state": "ringing"}, "owner", "1604")


@pytest.mark.asyncio
async def test_bridge_exchange_uses_fixed_named_source_and_video_offer_without_redirects():
    class Response:
        status = 200
        content_type = "application/json"
        content = SimpleNamespace(read=AsyncMock(return_value=b'{"type":"answer","sdp":"v=0\\r\\nm=video 9 RTP/AVP 96\\r\\n"}'))
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False

    requests = []
    def post(url, **kwargs):
        requests.append((url, kwargs))
        return Response()

    answer = await module.exchange_offer(SimpleNamespace(post=post), {"bridge_url": "http://bridge:1984", "stream_name": "entrance"}, "v=0\r\nm=video 9 RTP/AVP 96\r\n")
    assert answer.startswith("v=0")
    url, kwargs = requests[0]
    assert url == "http://bridge:1984/api/webrtc"
    assert kwargs["params"] == {"src": "entrance"}
    assert kwargs["json"]["type"] == "offer"
    assert kwargs["allow_redirects"] is False
