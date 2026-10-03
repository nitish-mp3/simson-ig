import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock
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
        bus=SimpleNamespace(async_listen=listen))
    entry = SimpleNamespace(entry_id="entry", async_on_unload=lambda callback: None)
    coordinator = SimpleNamespace(data={"node_id": "office"})
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
