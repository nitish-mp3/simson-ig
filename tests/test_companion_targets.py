import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("companion_targets", Path(__file__).parents[1] / "custom_components/simson/companion_targets.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def device(user_id, name, device_id, os_name="Android", disabled_by=None):
    return SimpleNamespace(data={"user_id": user_id, "device_name": name, "device_id": device_id,
        "os_name": os_name}, title=name, disabled_by=disabled_by)


def test_companion_discovery_uses_registration_owner_not_phone_name():
    registrations = {"one": device("recipient", "Phone", "device-one"),
        "other": device("someone-else", "Phone", "device-other"),
        "two": device("recipient", "Tablet", "device-two", "iOS"),
        "disabled": device("recipient", "Disabled", "device-three", disabled_by="user"),
        "no_push": device("recipient", "No push", "device-four"),
        "duplicate": device("recipient", "Duplicate", "device-one"),
        "desktop": device("recipient", "Desktop", "device-five", "macOS")}
    selected = module.select_user_devices(registrations, "recipient", lambda target: target != "no_push")
    assert selected == [{"target": "one", "name": "Phone"}, {"target": "two", "name": "Tablet"}]
    assert module.select_user_devices(registrations, "", lambda target: True) == []
