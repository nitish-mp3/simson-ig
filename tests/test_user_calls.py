import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

spec = importlib.util.spec_from_file_location("user_calls", Path(__file__).parents[1] / "custom_components/simson/user_calls.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


@pytest.fixture
def fixture(monkeypatch):
    exceptions = ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = RuntimeError
    monkeypatch.setitem(sys.modules, "homeassistant.exceptions", exceptions)
    client = SimpleNamespace(calls=AsyncMock(return_value={"calls": []}),
        make_call=AsyncMock(return_value={"call_id": "one"}))
    users = {user_id: SimpleNamespace(name=name, is_active=True, system_generated=False)
        for user_id, name in (("caller", "Caller"), ("recipient", "Recipient"))}
    hass = SimpleNamespace(data={"simson": {"wrong_entry": {"client": Mock()}, "owner": {"client": client}}},
        states=SimpleNamespace(get=lambda entity_id: SimpleNamespace(attributes={"simson_contact": True,
            "entry_id": "owner", "node_id": "office", "user_id": "recipient"})),
        auth=SimpleNamespace(async_get_user=AsyncMock(side_effect=lambda user_id: users.get(user_id))),
        bus=SimpleNamespace(async_fire=Mock()))
    call = SimpleNamespace(data={"entity_id": "sensor.recipient"}, context=SimpleNamespace(user_id="caller"))
    return hass, call, client, users


@pytest.mark.asyncio
async def test_contact_routes_to_its_own_entry_and_caller_context_cannot_be_spoofed(fixture):
    hass, call, client, users = fixture
    call.data.update(caller_user_id="impersonated", call_type="video")
    await module.start_user_call(hass, call)
    client.make_call.assert_awaited_once_with(target_node_id="office", target_user_id="recipient",
        target_user_name="Recipient", caller_user_id="caller", caller_user_name="Caller", call_type="video")
    assert hass.bus.async_fire.call_args.args[1]["interactive"] is True


@pytest.mark.asyncio
@pytest.mark.parametrize("participant,message", [("caller", "You already"), ("recipient", "Recipient is already")])
async def test_busy_users_are_rejected_before_dialing(fixture, participant, message):
    hass, call, client, users = fixture
    client.calls.return_value = {"calls": [{"state": "active", "metadata": {"caller_user_id": participant}}]}
    with pytest.raises(RuntimeError, match=message):
        await module.start_user_call(hass, call)
    client.make_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_unattended_scripts_require_an_explicit_caller_and_do_not_join_browsers(fixture):
    hass, call, client, users = fixture
    call.context.user_id = None
    with pytest.raises(RuntimeError, match="caller_user_id"):
        await module.start_user_call(hass, call)
    call.data["caller_user_id"] = "caller"
    await module.start_user_call(hass, call)
    assert hass.bus.async_fire.call_args.args[1]["interactive"] is False


@pytest.mark.asyncio
async def test_self_calls_and_disabled_users_are_rejected(fixture):
    hass, call, client, users = fixture
    call.context.user_id = "recipient"
    with pytest.raises(RuntimeError, match="yourself"):
        await module.start_user_call(hass, call)
    call.context.user_id = "caller"
    users["recipient"].is_active = False
    with pytest.raises(RuntimeError, match="no longer available"):
        await module.start_user_call(hass, call)
    client.make_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_concurrent_duplicate_requests_are_serialized(fixture):
    hass, call, client, users = fixture
    active = []
    async def calls():
        return {"calls": list(active)}
    async def make_call(**kwargs):
        await asyncio.sleep(0)
        active.append({"state": "requesting", "caller_user_id": "caller"})
        return {"call_id": "one"}
    client.calls.side_effect = calls
    client.make_call.side_effect = make_call
    results = await asyncio.gather(module.start_user_call(hass, call), module.start_user_call(hass, call), return_exceptions=True)
    assert sum(isinstance(result, RuntimeError) for result in results) == 1
    client.make_call.assert_awaited_once()
