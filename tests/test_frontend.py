import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch


class FrontendRegistrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        modules = {}
        for name in (
            "homeassistant", "homeassistant.components", "homeassistant.components.frontend",
            "homeassistant.components.http", "homeassistant.components.lovelace",
            "homeassistant.components.lovelace.const", "homeassistant.core",
        ):
            modules[name] = types.ModuleType(name)
        modules["homeassistant.components.frontend"].add_extra_js_url = Mock()
        modules["homeassistant.components.http"].StaticPathConfig = Mock()
        modules["homeassistant.components.lovelace.const"].LOVELACE_DATA = "lovelace"
        modules["homeassistant.components.lovelace.const"].MODE_STORAGE = "storage"
        modules["homeassistant.core"].HomeAssistant = object
        source = Path(__file__).resolve().parents[1] / "custom_components/simson/frontend.py"
        spec = importlib.util.spec_from_file_location("simson_frontend_test", source)
        self.frontend = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(self.frontend)
        self.resources = types.SimpleNamespace(
            async_get_info=AsyncMock(), async_items=Mock(return_value=[]),
            async_update_item=AsyncMock(), async_delete_item=AsyncMock(), async_create_item=AsyncMock(),
        )
        self.hass = types.SimpleNamespace(
            data={"lovelace": types.SimpleNamespace(resource_mode="storage", resources=self.resources)},
            http=types.SimpleNamespace(async_register_static_paths=AsyncMock()),
        )

    async def test_migrates_module_type_and_removes_only_duplicate_simson_resources(self):
        self.resources.async_items.return_value = [
            {"id": "main", "url": "/simson/www/simson-card.js?v=4", "type": "js"},
            {"id": "old", "url": "/local/simson-call-card.js", "type": "module"},
            {"id": "other", "url": "/local/another-card.js", "type": "module"},
        ]
        await self.frontend.async_register_card(self.hass)
        self.resources.async_update_item.assert_awaited_once_with(
            "main", {"url": self.frontend.CARD_URL, "res_type": "module"}
        )
        self.resources.async_delete_item.assert_awaited_once_with("old")

    async def test_failed_static_registration_is_retryable(self):
        self.hass.http.async_register_static_paths.side_effect = [RuntimeError("not ready"), None]
        with self.assertRaises(RuntimeError):
            await self.frontend.async_register_card(self.hass)
        await self.frontend.async_register_card(self.hass)
        self.assertEqual(self.hass.http.async_register_static_paths.await_count, 2)
        self.resources.async_create_item.assert_awaited_once()

    async def test_resource_failure_does_not_repeat_static_registration(self):
        self.resources.async_get_info.side_effect = [RuntimeError("not ready"), None]
        await self.frontend.async_register_card(self.hass)
        await self.frontend.async_register_card(self.hass)
        self.hass.http.async_register_static_paths.assert_awaited_once()
        self.resources.async_create_item.assert_awaited_once()

    async def test_concurrent_setup_registers_once(self):
        import asyncio
        await asyncio.gather(*(self.frontend.async_register_card(self.hass) for _ in range(3)))
        self.hass.http.async_register_static_paths.assert_awaited_once()
        self.resources.async_create_item.assert_awaited_once()
