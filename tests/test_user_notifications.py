import importlib.util
import asyncio
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlsplit, parse_qs

import pytest

package = ModuleType("simson_notification_tests")
package.__path__ = [str(Path(__file__).parents[1] / "custom_components/simson")]
sys.modules.setdefault(package.__name__, package)
spec = importlib.util.spec_from_file_location("simson_notification_tests.user_notifications", Path(__file__).parents[1] / "custom_components/simson/user_notifications.py")
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
    assert urlsplit(unsafe["data"]["url"]).path == "/lovelace/default_view"


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


async def notification_fixture(monkeypatch, saved=None):
    storage = ModuleType("homeassistant.helpers.storage")
    class FakeStore:
        def __init__(self, *args):
            pass
        async def async_load(self):
            return saved or {}
    storage.Store = FakeStore
    exceptions = ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = RuntimeError
    validation = ModuleType("voluptuous")
    validation.Schema = lambda value: value
    validation.Required = lambda key: key
    validation.Optional = lambda key, **kwargs: key
    for name, value in {"homeassistant.helpers.storage": storage,
        "homeassistant.exceptions": exceptions, "voluptuous": validation}.items():
        monkeypatch.setitem(sys.modules, name, value)
    listeners, handlers = {}, {}
    services = SimpleNamespace(has_service=lambda *args: False, async_call=AsyncMock(),
        async_register=lambda domain, name, handler, **kwargs: handlers.update({name: handler}))
    auth = SimpleNamespace(async_get_user=AsyncMock(return_value=SimpleNamespace(id="caller", name="ds", is_admin=False)))
    hass = SimpleNamespace(data={"simson": {"entry": {}}}, auth=auth, services=services,
        bus=SimpleNamespace(async_listen=lambda name, callback: listeners.update({name: callback}), async_fire=Mock()))
    coordinator = SimpleNamespace(data={"node_id": "office"}, async_update_listeners=Mock())
    await module.async_setup_user_notifications(hass, SimpleNamespace(entry_id="entry", async_on_unload=lambda callback: None), coordinator)
    return hass, listeners, handlers


@pytest.mark.asyncio
async def test_automatic_notification_is_private_named_and_cleared(monkeypatch):
    hass, listeners, _ = await notification_fixture(monkeypatch)
    discover = Mock(return_value=[{"target": "private-webhook", "name": "CPH2619"}])
    monkeypatch.setattr(module, "user_companion_devices", discover)
    payload = {"node_id": "office", "call_id": "automatic", "target_user_id": "nitish",
        "from_node_id": "office", "from_label": "pawan", "metadata": {"caller_user_id": "caller"}}
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call", data=payload))
    discover.assert_called_once_with(hass, "nitish")
    sent = hass.services.async_call.await_args.args
    assert sent[:2] == ("notify", "mobile_app")
    assert sent[2]["target"] == ["private-webhook"]
    assert sent[2]["message"] == "ds is calling you"
    assert urlsplit(sent[2]["data"]["actions"][0]["uri"]).path == "/simson-call"
    assert "private-webhook" not in str(hass.bus.async_fire.call_args)
    assert "push_targets" not in hass.data["simson"]["entry"]["user_notification_status"]["nitish"]
    discover.return_value = []
    await listeners["simson_call_status"](SimpleNamespace(event_type="simson_call_status",
        data={"node_id": "office", "call_id": "automatic", "status": "ended"}))
    cleared = hass.services.async_call.await_args.args[2]
    assert cleared["message"] == "clear_notification"
    assert cleared["target"] == ["private-webhook"]
    assert hass.services.async_call.await_count == 2


@pytest.mark.asyncio
async def test_explicit_disabled_mapping_never_falls_back_or_broadcasts(monkeypatch):
    hass, listeners, _ = await notification_fixture(monkeypatch, {"nitish": {"service": ""}})
    discover = Mock(return_value=[{"target": "private-webhook", "name": "Phone"}])
    monkeypatch.setattr(module, "user_companion_devices", discover)
    await listeners["simson_incoming_call"](SimpleNamespace(event_type="simson_incoming_call",
        data={"node_id": "office", "call_id": "disabled", "target_user_id": "nitish"}))
    discover.assert_not_called()
    hass.services.async_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_notification_test_service_enforces_user_ownership_and_missing_phone(monkeypatch):
    hass, _, handlers = await notification_fixture(monkeypatch)
    hass.states = SimpleNamespace(get=lambda key: SimpleNamespace(attributes={"simson_contact": True,
        "user_id": "nitish", "entry_id": "entry", "node_id": "office"}))
    request = SimpleNamespace(data={"entity_id": "sensor.contact"}, context=SimpleNamespace(user_id="caller"))
    with pytest.raises(RuntimeError, match="only your own"):
        await handlers["test_user_notification"](request)
    hass.auth.async_get_user.return_value = SimpleNamespace(id="nitish", is_admin=False)
    monkeypatch.setattr(module, "user_companion_devices", lambda *args: [])
    with pytest.raises(RuntimeError, match="No notification phone"):
        await handlers["test_user_notification"](request)
    monkeypatch.setattr(module, "user_companion_devices", lambda *args: [{"target": "private-webhook"}])
    await handlers["test_user_notification"](request)
    body = hass.services.async_call.await_args.args[2]
    assert body["target"] == ["private-webhook"]
    assert "actions" not in body["data"]
