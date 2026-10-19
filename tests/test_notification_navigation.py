import ast
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest
from aiohttp import web

root = Path(__file__).parents[1] / "custom_components/simson"
package = ModuleType("navigation_tests")
package.__path__ = [str(root)]
sys.modules[package.__name__] = package
from navigation_tests.notification_links import dashboard_path, handoff_url


@pytest.mark.parametrize("path", ["//external.test", "//[", "https://external.test", "/api/simson/call-action/answer/one", "/api", "/%61pi/private", "/x/../api/private", "/%2fexternal.test", "/x%0d%0aHeader:value", "/x%5cexternal"])
def test_notification_navigation_rejects_api_paths_and_external_or_malformed_destinations(path):
    assert dashboard_path(path) == "/simson-call"


@pytest.mark.asyncio
async def test_legacy_api_notification_links_only_redirect_and_never_control_calls():
    tree = ast.parse((root / "__init__.py").read_text(encoding="utf-8"))
    declaration = next(item for item in tree.body if isinstance(item, ast.ClassDef) and item.name == "SimsonCallActionView")
    namespace = {"__package__": "navigation_tests", "HomeAssistantView": object, "HomeAssistant": object, "web": web}
    exec(compile(ast.Module(body=[declaration], type_ignores=[]), "notification-view", "exec"), namespace)
    view = namespace["SimsonCallActionView"](SimpleNamespace())
    assert view.requires_auth is False
    with pytest.raises(web.HTTPFound) as redirected:
        await view.get(SimpleNamespace(query={"node_id": "office", "redirect": "/api/private"}), "answer", "exact-call")
    location = urlsplit(redirected.value.location)
    assert location.path == "/simson-call"
    assert parse_qs(location.query) == {"simson_action": ["answer"], "simson_call": ["exact-call"], "simson_node": ["office"]}
