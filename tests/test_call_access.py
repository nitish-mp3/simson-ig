import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("call_access", Path(__file__).parents[1] / "custom_components/simson/call_access.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_unowned_and_other_user_calls_cannot_be_controlled():
    for owner in ("", "automation:door", "other"):
        assert not module.can_control_call({"direction": "outgoing", "caller_user_id": owner, "state": "active"}, "me", "hangup")


def test_target_can_answer_but_observer_cannot_signal():
    call = {"direction": "incoming", "state": "incoming", "target_user_id": "me"}
    assert module.can_control_call(call, "me", "answer")
    assert not module.can_control_call(call, "other", "answer")
    assert not module.can_control_call(call, "me", "signal")
    call.update(state="active", answered_by_user_id="me")
    assert module.can_control_call(call, "me", "signal")


def test_manual_notification_mapping_authorizes_only_the_exact_recipient_device_and_node():
    coordinator = SimpleNamespace(data={"node_id": "office"})
    hass = SimpleNamespace(data={"simson": {"entry": {
        "coordinator": coordinator,
        "user_notification_targets": {"recipient": {"service": "notify.mobile_app_shared_phone"}},
    }}})
    call = {"direction": "incoming", "state": "ringing", "metadata": {"target_user_id": "recipient"}}

    assert module.mapped_notification_user(hass, "office", call, "recipient", "notify.mobile_app_shared_phone") == "recipient"
    assert module.mapped_notification_user(hass, "other", call, "recipient", "notify.mobile_app_shared_phone") == ""
    assert module.mapped_notification_user(hass, "office", {**call, "target_user_id": "observer"},
        "recipient", "notify.mobile_app_shared_phone") == ""
    assert module.mapped_notification_user(hass, "office", call, "recipient", "notify.mobile_app_other") == ""
