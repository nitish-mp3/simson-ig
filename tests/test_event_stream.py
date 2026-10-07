import importlib.util
import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from unittest.mock import patch

import pytest

spec = importlib.util.spec_from_file_location("event_stream", Path(__file__).parents[1] / "custom_components/simson/event_stream.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


async def content(lines):
    for line in lines:
        yield line


@pytest.mark.asyncio
async def test_sse_decoder_accepts_keepalive_and_skips_malformed_frames():
    source = content([b": keepalive\n", b"\n", b"data: invalid\n", b"\n",
        b'data: {"type":"call_status",\n', b'data: "call_id":"one"}\n', b"\n"])
    assert [event async for event in module.decode_events(source)] == [{"type": "call_status", "call_id": "one"}]


@pytest.mark.asyncio
async def test_sse_decoder_bounds_message_size():
    with pytest.raises(ValueError, match="size limit"):
        _ = [event async for event in module.decode_events(content([b"data: " + b"x" * 262144]))]


def relay():
    hass = SimpleNamespace(bus=SimpleNamespace(async_fire=Mock()))
    coordinator = SimpleNamespace(data={"node_id": "office"})
    return module.EventRelay(hass, coordinator)


def test_native_and_stream_status_events_are_delivered_once():
    events = relay()
    data = {"call_id": "one", "status": "active", "node_id": "office", "caller_user_id": "caller"}
    events.observe(SimpleNamespace(event_type="simson_call_status", data=data))
    events.deliver({"type": "call_status", **data})
    events.hass.bus.async_fire.assert_not_called()
    events.deliver({"type": "call_status", **data, "status": "ended"})
    events.deliver({"type": "call_status", **data, "status": "ended"})
    events.hass.bus.async_fire.assert_called_once()


def test_stream_preserves_targeted_call_privacy_and_does_not_accept_foreign_nodes():
    events = relay()
    events.deliver({"type": "incoming_call", "call_id": "one", "metadata": {"target_user_id": "recipient"}})
    event_type, data = events.hass.bus.async_fire.call_args.args
    assert event_type == "simson_incoming_call"
    assert data["node_id"] == "office"
    assert data["target_user_id"] == "recipient"
    events.hass.bus.async_fire.reset_mock()
    events.deliver({"type": "incoming_call", "call_id": "foreign", "node_id": "other"})
    events.deliver({"type": "unknown", "call_id": "other"})
    events.hass.bus.async_fire.assert_not_called()


def test_distinct_ice_candidates_are_not_dropped_as_duplicate_signals():
    events = relay()
    base = {"type": "webrtc_signal", "call_id": "one", "signal_type": "ice_candidate"}
    events.deliver({**base, "data": {"candidate": "first"}})
    events.deliver({**base, "data": {"candidate": "second"}})
    assert events.hass.bus.async_fire.call_count == 2


@pytest.mark.asyncio
async def test_stream_validates_initial_node_and_cleans_up_listeners_on_unload():
    delivered = asyncio.Event()
    unsubs = []

    class Response:
        content_type = "text/event-stream"

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        def raise_for_status(self):
            pass

        @property
        def content(self):
            return content([b'data: {"type":"init","node_id":"office"}\n', b"\n",
                b'data: {"type":"call_status","call_id":"one","status":"active"}\n', b"\n"])

    def listen(*args):
        unsub = Mock()
        unsubs.append(unsub)
        return unsub

    async def refreshed():
        pass

    hass = SimpleNamespace(bus=SimpleNamespace(async_listen=listen, async_fire=lambda *args: delivered.set()),
        async_create_background_task=lambda coroutine, name: asyncio.create_task(coroutine),
        async_create_task=asyncio.create_task)
    client = SimpleNamespace(_base="http://fixture", _get_session=lambda: SimpleNamespace(get=lambda *args, **kwargs: Response()))
    coordinator = SimpleNamespace(data={"node_id": "office"}, async_request_refresh=refreshed)
    entry = SimpleNamespace(async_on_unload=Mock())
    with patch.dict(sys.modules, {"homeassistant.core": SimpleNamespace(callback=lambda function: function)}):
        task = module.setup_event_stream(hass, entry, client, coordinator)
        await asyncio.wait_for(delivered.wait(), 1)
        entry.async_on_unload.call_args.args[0]()
        with pytest.raises(asyncio.CancelledError):
            await task
    assert len(unsubs) == 4
    assert all(unsub.call_count == 1 for unsub in unsubs)
