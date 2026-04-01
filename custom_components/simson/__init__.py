"""The Simson Call Relay integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import SimsonApiClient
from .const import (
    DOMAIN,
    CONF_ADDON_URL,
    PLATFORMS,
    SERVICE_MAKE_CALL,
    SERVICE_ANSWER_CALL,
    SERVICE_REJECT_CALL,
    SERVICE_HANGUP_CALL,
)

logger = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=5)
_CARD_URL = "/simson/www/simson-card.js"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Simson from a config entry."""
    client = SimsonApiClient(entry.data[CONF_ADDON_URL])

    # Verify connectivity.
    try:
        await client.health()
    except Exception as err:
        await client.close()
        raise ConfigEntryNotReady(f"Cannot connect to Simson addon: {err}") from err

    # Serve the Lovelace card JS as a static resource.
    # The path /simson/www/simson-card.js is stable and predictable.
    # Users must add it once in HA: Settings → Dashboards → ⋮ → Resources
    #   URL: /simson/www/simson-card.js   Type: JavaScript module
    hass.http.register_static_path(
        "/simson/www",
        str(Path(__file__).parent / "www"),
        cache_headers=False,
    )

    coordinator = SimsonCoordinator(hass, client)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }

    await hass.config_entries.async_forward_entry_setups(
        entry, [Platform.SENSOR]
    )

    # Register services.
    _register_services(hass, client)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Simson config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(
        entry, [Platform.SENSOR]
    )
    if unload_ok:
        data = hass.data[DOMAIN].pop(entry.entry_id, None)
        if data and "client" in data:
            await data["client"].close()
        # Unregister services when last entry is removed.
        if not hass.data[DOMAIN]:
            for svc in (SERVICE_MAKE_CALL, SERVICE_ANSWER_CALL, SERVICE_REJECT_CALL, SERVICE_HANGUP_CALL):
                hass.services.async_remove(DOMAIN, svc)
    return unload_ok


class SimsonCoordinator(DataUpdateCoordinator):
    """Polls the Simson addon for status updates."""

    def __init__(self, hass: HomeAssistant, client: SimsonApiClient) -> None:
        super().__init__(
            hass,
            logger,
            name=DOMAIN,
            update_interval=SCAN_INTERVAL,
        )
        self.client = client

    async def _async_update_data(self) -> dict:
        try:
            status = await self.client.status()
            calls = await self.client.calls()
            return {**status, "calls_data": calls}
        except Exception as err:
            raise UpdateFailed(f"Error fetching Simson status: {err}") from err


def _register_services(hass: HomeAssistant, client: SimsonApiClient) -> None:
    """Register Simson services."""

    async def handle_make_call(call: ServiceCall) -> None:
        target = call.data["target_node_id"]
        call_type = call.data.get("call_type", "voice")
        try:
            result = await client.make_call(target, call_type)
            logger.info("Call initiated: %s", result)
        except Exception as err:
            logger.error("Failed to make call: %s", err)

    async def handle_answer_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        try:
            await client.answer_call(call_id)
        except Exception as err:
            logger.error("Failed to answer call: %s", err)

    async def handle_reject_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        reason = call.data.get("reason", "rejected")
        try:
            await client.reject_call(call_id, reason)
        except Exception as err:
            logger.error("Failed to reject call: %s", err)

    async def handle_hangup_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        try:
            await client.hangup_call(call_id)
        except Exception as err:
            logger.error("Failed to hangup call: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_MAKE_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_MAKE_CALL,
            handle_make_call,
            schema=vol.Schema({
                vol.Required("target_node_id"): str,
                vol.Optional("call_type", default="voice"): str,
            }),
        )
        hass.services.async_register(
            DOMAIN,
            SERVICE_ANSWER_CALL,
            handle_answer_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
            }),
        )
        hass.services.async_register(
            DOMAIN,
            SERVICE_REJECT_CALL,
            handle_reject_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
                vol.Optional("reason", default="rejected"): str,
            }),
        )
        hass.services.async_register(
            DOMAIN,
            SERVICE_HANGUP_CALL,
            handle_hangup_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
            }),
        )
