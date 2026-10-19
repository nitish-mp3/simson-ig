import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("directory_test", Path(__file__).parents[1] / "custom_components/simson/directory.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_directory_includes_active_users_without_contact_entities_or_dashboard_presence():
    users = [SimpleNamespace(id="caller", name="Caller", is_active=True, system_generated=False),
        SimpleNamespace(id="no-entity", name="Recipient", is_active=True, system_generated=False),
        SimpleNamespace(id="disabled", name="Disabled", is_active=False, system_generated=False),
        SimpleNamespace(id="system", name="System", is_active=True, system_generated=True)]
    result = module.directory_snapshot(users, [], [{"state": "active", "metadata": {"target_user_id": "caller"}}], "office")
    assert result == [{"user_id": "caller", "user_name": "Caller", "entity_id": "", "state": "busy"},
        {"user_id": "no-entity", "user_name": "Recipient", "entity_id": "", "state": "ready"}]
