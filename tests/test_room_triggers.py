from datetime import datetime, timezone
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest


spec = importlib.util.spec_from_file_location("room_triggers", Path(__file__).parents[1] / "custom_components/simson/room_triggers.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def event(before="off", after="on", entity="binary_sensor.panic", context="press-one"):
    return SimpleNamespace(context=SimpleNamespace(id=context), data={"entity_id": entity,
        "old_state": SimpleNamespace(state=before) if before is not None else None,
        "new_state": SimpleNamespace(state=after, last_changed=datetime.now(timezone.utc)) if after is not None else None})


@pytest.fixture
def router():
    return module.RoomTriggers({"101": {"trigger_enabled": True, "trigger_entity": "binary_sensor.panic",
        "trigger_mode": "state", "trigger_state": "on", "trigger_cooldown_sec": 30}}, AsyncMock(), Mock(), now=lambda: 100)


@pytest.mark.asyncio
async def test_trigger_calls_configured_room_and_emits_alarm_before_attempt(router):
    async def start(*args):
        assert router.emit.call_args.args[0] == "simson_room_triggered"
    router.start.side_effect = start
    await router.handle(event())
    assert router.start.call_args.args[0] == "101"
    assert router.start.call_args.args[1].startswith("press-one:")


@pytest.mark.asyncio
@pytest.mark.parametrize("before,after", [(None,"on"),("unknown","on"),("unavailable","on"),
    ("off","unavailable"),("on","on"),("on","off"),("on",None)])
async def test_restores_attribute_changes_and_wrong_edges_never_place_calls(router, before, after):
    await router.handle(event(before,after))
    router.start.assert_not_awaited()


@pytest.mark.asyncio
async def test_cooldown_survives_bounce_and_refresh_can_disable_trigger(router):
    await router.handle(event())
    await router.handle(event())
    router.start.assert_awaited_once()
    router.now=lambda:140
    await router.handle(event(context="press-two"))
    assert router.start.await_count == 2
    router.profiles["101"]["trigger_enabled"] = False
    router.refresh()
    router.now=lambda:180
    await router.handle(event())
    assert router.start.await_count == 2


@pytest.mark.asyncio
async def test_press_entity_accepts_new_timestamp_but_not_unrelated_entities(router):
    router.profiles["101"].update(trigger_entity="input_button.panic",trigger_mode="press")
    router.refresh()
    await router.handle(event(entity="binary_sensor.panic"))
    router.start.assert_not_awaited()
    await router.handle(event("yesterday","today",entity="input_button.panic"))
    router.start.assert_awaited_once()


@pytest.mark.asyncio
async def test_call_failure_keeps_independent_alert_and_reports_failure(router):
    router.start.side_effect = TimeoutError
    await router.handle(event())
    assert [call.args[0] for call in router.emit.call_args_list] == ["simson_room_triggered", "simson_room_trigger_failed"]


@pytest.mark.asyncio
async def test_first_real_button_press_from_unknown_is_not_lost_but_stale_restore_is_ignored(router):
    router.profiles["101"].update(trigger_entity="input_button.panic", trigger_mode="press")
    router.refresh()
    await router.handle(event("unknown", "2020-01-01T00:00:00+00:00", entity="input_button.panic"))
    router.start.assert_not_awaited()
    await router.handle(event("unknown", datetime.now(timezone.utc).isoformat(), entity="input_button.panic"))
    router.start.assert_awaited_once()


@pytest.mark.asyncio
async def test_restored_entities_are_not_real_panic_events(router):
    restored = event()
    restored.data["new_state"].attributes = {"restored": True}
    await router.handle(restored)
    router.start.assert_not_awaited()
