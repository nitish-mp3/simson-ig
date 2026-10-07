import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("client_selection", Path(__file__).parents[1] / "custom_components/simson/client_selection.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_media_configuration_selects_exact_node_not_last_loaded_instance():
    first, second = object(), object()
    hass = SimpleNamespace(data={"simson": {
        "first": {"client": first, "coordinator": SimpleNamespace(data={"node_id": "office"})},
        "second": {"client": second, "coordinator": SimpleNamespace(data={"node_id": "studio"})}}})
    assert module.client_for_node(hass, second, "office") is first
    assert module.client_for_node(hass, second, "studio") is second
    assert module.client_for_node(hass, second, "unknown") is None
    assert module.client_for_node(hass, second, "") is second
