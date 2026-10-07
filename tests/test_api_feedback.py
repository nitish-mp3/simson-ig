import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest

spec = importlib.util.spec_from_file_location("feedback_api", Path(__file__).parents[1] / "custom_components/simson/api.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


@pytest.mark.asyncio
async def test_media_config_timeout_covers_upstream_fetch_without_slowing_status_polling():
    client = module.SimsonApiClient("http://localhost:8799")
    from unittest.mock import AsyncMock
    client._get = AsyncMock(return_value={})
    await client.webrtc_config()
    timeout = client._get.call_args.kwargs["timeout"]
    assert timeout.total == 12
    assert timeout.connect == 1.5


class Response:
    def __init__(self, status, payload):
        self.status = status
        self.payload = payload
        self.request_info = SimpleNamespace(real_url="http://addon/api/call")
        self.history = ()
        self.headers = {}
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        return None
    async def json(self, **kwargs):
        return self.payload
    def raise_for_status(self):
        return None


@pytest.mark.asyncio
@pytest.mark.parametrize("status,message", [(409, "source SIP handset already has an active call"), (404, "SIP endpoint not found")])
async def test_business_errors_keep_details_and_do_not_retry_other_hosts_or_routes(status, message):
    client = module.SimsonApiClient("http://localhost:8799")
    posted = []
    def post(url, **kwargs):
        posted.append(url)
        assert kwargs['timeout'].total == 30
        return Response(status, {"error": message, "extension": "3101"})
    client._get_session = lambda: SimpleNamespace(post=post)
    with pytest.raises(module.SimsonApiError) as caught:
        await client._post_first(("/api/call", "/api/legacy-call"), {})
    assert message in str(caught.value)
    assert caught.value.payload["extension"] == "3101"
    assert len(posted) == 1


@pytest.mark.asyncio
async def test_uncertain_post_timeout_does_not_repeat_a_call():
    client = module.SimsonApiClient("http://localhost:8799")
    posted = []
    def post(url, **kwargs):
        posted.append(url)
        raise TimeoutError("connection response lost")
    client._get_session = lambda: SimpleNamespace(post=post)
    with pytest.raises(TimeoutError, match="may have started"):
        await client.make_call(source_extension="3101", phone_number="9123208334", trunk="1701")
    assert len(posted) == 1
