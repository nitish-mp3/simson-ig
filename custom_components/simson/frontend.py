"""Static frontend registration and dashboard resource migration."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)
CARD_VERSION = "5.0.0"
CARD_PATH = "/simson/www/simson-card.js"
CARD_URL = f"{CARD_PATH}?v={CARD_VERSION}"
_RESOURCE_PATHS = {CARD_PATH, "/local/simson-call-card.js", "/local/simson-card.js", "/simson/www/simson-call-card.js"}


async def async_register_card(hass: HomeAssistant) -> None:
    state = hass.data.setdefault("simson_frontend", {})
    lock = state.setdefault("lock", asyncio.Lock())
    async with lock:
        if not state.get("static_registered"):
            await hass.http.async_register_static_paths([
                StaticPathConfig("/simson/www", str(Path(__file__).parent / "www"), cache_headers=False)
            ])
            state["static_registered"] = True
        if not state.get("script_registered"):
            add_extra_js_url(hass, CARD_URL)
            state["script_registered"] = True
        if not state.get("resource_registered"):
            state["resource_registered"] = await async_register_resource(hass)


async def async_register_resource(hass: HomeAssistant) -> bool:
    try:
        lovelace = hass.data.get(LOVELACE_DATA)
        if not lovelace or lovelace.resource_mode != MODE_STORAGE:
            return False
        resources = lovelace.resources
        await resources.async_get_info()
        matching = [item for item in resources.async_items() or []
                    if str(item.get("url") or "").split("?", 1)[0] in _RESOURCE_PATHS]
        current = next((item for item in matching if str(item.get("url", "")).split("?", 1)[0] == CARD_PATH), None)
        existing = current or (matching[0] if matching else None)
        if existing:
            if existing.get("url") != CARD_URL or existing.get("type") != "module":
                await resources.async_update_item(existing["id"], {"url": CARD_URL, "res_type": "module"})
            for duplicate in matching:
                if duplicate["id"] != existing["id"]:
                    await resources.async_delete_item(duplicate["id"])
        else:
            await resources.async_create_item({"url": CARD_URL, "res_type": "module"})
        return True
    except Exception as error:
        _LOGGER.warning("Could not register Simson dashboard resource: %s", error)
        return False
