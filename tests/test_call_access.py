import importlib.util
from pathlib import Path

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
