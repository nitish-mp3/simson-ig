import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock

import pytest


@pytest.mark.asyncio
async def test_button_identity_availability_and_authenticated_context(monkeypatch):
    button_module = ModuleType("homeassistant.components.button")
    button_module.ButtonEntity = type("ButtonEntity", (), {})
    coordinator_module = ModuleType("homeassistant.helpers.update_coordinator")
    class FakeCoordinatorEntity:
        def __init__(self, coordinator):
            self.coordinator = coordinator
        @property
        def available(self):
            return True
    coordinator_module.CoordinatorEntity = FakeCoordinatorEntity
    package = ModuleType("simson_test_button")
    package.__path__ = []
    constants = ModuleType("simson_test_button.const")
    constants.DOMAIN = "simson"
    for name, value in {"homeassistant.components.button": button_module,
        "homeassistant.helpers.update_coordinator": coordinator_module,
        "simson_test_button": package, "simson_test_button.const": constants}.items():
        monkeypatch.setitem(sys.modules, name, value)
    spec = importlib.util.spec_from_file_location("simson_test_button.button", Path(__file__).parents[1] / "custom_components/simson/button.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    coordinator = SimpleNamespace(data={"node_id": "office", "vps_connected": True,
        "local_users": [{"user_id": "recipient", "user_name": "Recipient"}]})
    entry = SimpleNamespace(entry_id="entry")
    button = module.SimsonUserCallButton(coordinator, entry, coordinator.data["local_users"][0])
    renamed = module.SimsonUserCallButton(coordinator, entry, {"user_id": "recipient", "user_name": "Renamed"})
    assert button._attr_unique_id == renamed._attr_unique_id
    assert button.available
    assert button.extra_state_attributes["simson_call_button"]
    button.entity_id = "button.call_recipient"
    button._context = SimpleNamespace(user_id="caller")
    button.hass = SimpleNamespace(services=SimpleNamespace(async_call=AsyncMock()))
    await button.async_press()
    button.hass.services.async_call.assert_awaited_once_with("simson", "call_user",
        {"entity_id": "button.call_recipient"}, blocking=True, context=button._context)
    coordinator.data["local_users"] = []
    assert not button.available
