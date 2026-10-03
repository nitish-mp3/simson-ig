import importlib.util
import asyncio
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlsplit, parse_qs

import pytest

spec = importlib.util.spec_from_file_location("user_notifications", Path(__file__).parents[1] / "custom_components/simson/user_notifications.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_notification_actions_use_authenticated_exact_call_urls():
    notification = module.incoming_notification("call_one", "office", "Caller", "/lovelace/calls")
    assert notification["data"]["persistent"] is True
    actions = notification["data"]["actions"]
    assert len(actions) == 2
    for action, expected in zip(actions, ("answer", "decline")):
        url = urlsplit(action["uri"])
        assert url.path == "/lovelace/calls"
        assert parse_qs(url.query) == {"simson_node": ["office"], "simson_call": ["call_one"], "simson_action": [expected]}


def test_notification_links_preserve_dashboard_query_and_reject_external_redirects():
    payload = module.incoming_notification("call/id", "office", "Caller", "/lovelace/calls?view=door#panel")
    location = urlsplit(payload["data"]["actions"][0]["uri"])
    assert parse_qs(location.query)["view"] == ["door"]
    assert parse_qs(location.query)["simson_call"] == ["call/id"]
    assert location.fragment == "panel"
    unsafe = module.incoming_notification("one", "office", "Caller", "//external.example")
    assert unsafe["data"]["url"] == "/lovelace/default_view"


@pytest.mark.asyncio
async def test_notifications_only_reach_the_mapped_user_on_the_matching_node(monkeypatch):
    storage_module = ModuleType("homeassistant.helpers.storage")
    class FakeStore:
        def __init__(self, *args):
            pass
        async def async_load(self):
            return {"recipient": {"service": "notify.mobile_app_recipient", "dashboard_path": "/lovelace/calls"},
                "observer": {"service": "notify.mobile_app_observer"}}
    storage_module.Store = FakeStore
    exceptions_module = ModuleType("homeassistant.exceptions")
    exceptions_module.HomeAssistantError = RuntimeError
    for name, value in {"homeassistant": ModuleType("homeassistant"),
        "homeassistant.helpers": ModuleType("homeassistant.helpers"),
        "homeassistant.helpers.storage": storage_module,
        "homeassistant.exceptions": exceptions_module,
        "voluptuous": ModuleType("voluptuous")}.items():
        monkeypatch.setitem(sys.modules, name, value)
    listeners = {}
    def listen(event_type, callback):
        listeners[event_type] = callback
        return lambda: None
    services = SimpleNamespace(has_service=lambda *args: True, async_call=AsyncMock())
    hass = SimpleNamespace(data={"simson": {"entry": {}}}, services=services,
        bus=SimpleNamespace(async_listen=listen, async_fire=Mock()))
    entry = SimpleNamespace(entry_id="entry", async_on_unload=lambda callback: None)
    coordinator = SimpleNamespace(data={"node_id": "office"}, async_update_listeners=Mock())
    await module.async_setup_user_notifications(hass, entry, coordinator)
    incoming = {"node_id": "office", "call_id": "one", "target_user_id": "recipient", "from_label": "Caller"}
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=incoming))
    assert services.async_call.await_args.args[1] == "mobile_app_recipient"
    assert services.async_call.await_args.args[2]["data"]["tag"] == "simson_user_one"
    for node in ("other-node", ""):
        await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data={**incoming, "node_id": node}))
    assert services.async_call.await_count == 1
    await listeners["simson_call_status"](SimpleNamespace(event_type="simson_call_status", data={**incoming, "status": "ended"}))
    assert services.async_call.await_args.args[2]["message"] == "clear_notification"
    assert services.async_call.await_count == 2
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=incoming))
    assert services.async_call.await_count == 2
    assert hass.data["simson"]["entry"]["user_notification_status"]["recipient"]["status"] == "cleared"

    release = asyncio.Event()
    async def slow_send(*args, **kwargs):
        if args[2]["message"] != "clear_notification":
            await release.wait()
    services.async_call.side_effect = slow_send
    second = {**incoming, "call_id": "two"}
    send = asyncio.create_task(listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=second)))
    await asyncio.sleep(0)
    clear = asyncio.create_task(listeners["simson_call_status"](SimpleNamespace(event_type="simson_call_status", data={"node_id": "office", "call_id": "two", "status": "active"})))
    await asyncio.sleep(0)
    assert not clear.done()
    release.set()
    await asyncio.gather(send, clear)
    assert services.async_call.await_args.args[2]["message"] == "clear_notification"
    assert hass.data["simson"]["entry"]["user_notification_status"]["recipient"]["status"] == "cleared"

    services.async_call.side_effect = RuntimeError("notify unavailable")
    third = {**incoming, "call_id": "three"}
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=third))
    diagnostics = hass.data["simson"]["entry"]["user_notification_status"]["recipient"]
    assert diagnostics["status"] == "failed"
    assert diagnostics["error"] == "notify unavailable"
    services.async_call.side_effect = None
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=third))
    assert hass.data["simson"]["entry"]["user_notification_status"]["recipient"]["status"] == "sent"
    previous_count = services.async_call.await_count
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=third))
    assert services.async_call.await_count == previous_count
    terminal_first = {**incoming, "call_id": "four", "status": "ended"}
    await listeners["simson_call_status"](SimpleNamespace(event_type="simson_call_status", data=terminal_first))
    previous_count = services.async_call.await_count
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=terminal_first))
    assert services.async_call.await_count == previous_count
    unmapped = {**incoming, "call_id": "five", "target_user_id": "not_mapped"}
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=unmapped))
    assert services.async_call.await_count == previous_count
    assert hass.data["simson"]["entry"]["user_notification_status"]["not_mapped"]["status"] == "not_configured"
