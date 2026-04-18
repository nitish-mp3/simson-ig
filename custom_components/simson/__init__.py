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
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url

from aiohttp import web

from .api import SimsonApiClient
from .const import (
    DOMAIN,
    CONF_ADDON_URL,
    PLATFORMS,
    SERVICE_MAKE_CALL,
    SERVICE_ANSWER_CALL,
    SERVICE_REJECT_CALL,
    SERVICE_HANGUP_CALL,
    SERVICE_WEBRTC_SIGNAL,
    SERVICE_GET_TARGETS,
    SERVICE_USER_HEARTBEAT,
    SERVICE_GET_REMOTE_USERS,
    SERVICE_GET_CALL_HISTORY,
)

logger = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=5)
_CARD_JS_PATH = "/simson/www/simson-card.js"
_CARD_URL = f"{_CARD_JS_PATH}?v=4.5.9"  # bump this whenever the card JS changes


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Simson from a config entry."""
    client = SimsonApiClient(entry.data[CONF_ADDON_URL])

    try:
        # Verify connectivity.
        try:
            await client.health()
        except Exception as err:
            raise ConfigEntryNotReady(f"Cannot connect to Simson addon: {err}") from err

        # Serve the Lovelace card JS via a static path.
        try:
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    "/simson/www",
                    str(Path(__file__).parent / "www"),
                    cache_headers=False,
                )
            ])
        except Exception:
            pass  # Path already registered on reload — safe to ignore

        # Auto-load card JS on every HA frontend page — no manual resource setup.
        add_extra_js_url(hass, _CARD_URL)

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

        # Expose /api/webrtc-config so the Lovelace card can fetch SIP credentials.
        hass.http.register_view(WebRTCConfigView(client))

    except Exception:
        await client.close()
        raise

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
            for svc in (SERVICE_MAKE_CALL, SERVICE_ANSWER_CALL, SERVICE_REJECT_CALL,
                        SERVICE_HANGUP_CALL, SERVICE_WEBRTC_SIGNAL, SERVICE_GET_TARGETS,
                        SERVICE_USER_HEARTBEAT, SERVICE_GET_REMOTE_USERS,
                        SERVICE_GET_CALL_HISTORY):
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


class WebRTCConfigView(HomeAssistantView):
    """Proxy /api/webrtc-config to the Simson addon so the Lovelace card can fetch SIP creds."""

    url = "/api/webrtc-config"
    name = "api:webrtc-config"
    requires_auth = True

    def __init__(self, client: SimsonApiClient) -> None:
        self._client = client

    async def get(self, request: web.Request) -> web.Response:
        try:
            data = await self._client.webrtc_config()
            return web.json_response(data)
        except Exception as err:
            logger.error("Failed to proxy webrtc-config: %s", err)
            return web.json_response(
                {"ice_servers": [], "sip": {"enabled": False}}, status=502
            )


def _register_services(hass: HomeAssistant, client: SimsonApiClient) -> None:
    """Register Simson services."""

    async def handle_make_call(call: ServiceCall) -> None:
        target = call.data.get("target_node_id", "")
        target_id = call.data.get("target_id", "")
        call_type = call.data.get("call_type", "voice")
        target_user_id = call.data.get("target_user_id", "")
        target_user_name = call.data.get("target_user_name", "")
        caller_user_id = call.data.get("caller_user_id", "")
        try:
            result = await client.make_call(
                target_node_id=target,
                call_type=call_type,
                target_id=target_id,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
                caller_user_id=caller_user_id,
            )
            logger.info("Call initiated: %s", result)
        except Exception as err:
            logger.error("Failed to make call: %s", err)

    async def handle_answer_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        answered_by_user_id = call.data.get("answered_by_user_id", "")
        try:
            await client.answer_call(call_id, answered_by_user_id=answered_by_user_id)
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
                vol.Optional("target_node_id", default=""): str,
                vol.Optional("target_id", default=""): str,
                vol.Optional("call_type", default="voice"): str,
                vol.Optional("target_user_id", default=""): str,
                vol.Optional("target_user_name", default=""): str,
                vol.Optional("caller_user_id", default=""): str,
            }),
        )
        hass.services.async_register(
            DOMAIN,
            SERVICE_ANSWER_CALL,
            handle_answer_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
                vol.Optional("answered_by_user_id", default=""): str,
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

    async def handle_webrtc_signal(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        to_node_id = call.data["to_node_id"]
        signal_type = call.data["signal_type"]
        data = call.data["data"]
        try:
            await client.webrtc_signal(call_id, to_node_id, signal_type, data)
        except Exception as err:
            logger.error("Failed to relay WebRTC signal: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_WEBRTC_SIGNAL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_WEBRTC_SIGNAL,
            handle_webrtc_signal,
            schema=vol.Schema({
                vol.Required("call_id"): str,
                vol.Required("to_node_id"): str,
                vol.Required("signal_type"): str,
                vol.Required("data"): dict,
            }),
        )

    async def handle_get_targets(call: ServiceCall) -> None:
        try:
            result = await client.targets()
            # Fire an event with the result so the card can receive it.
            hass.bus.async_fire("simson_targets_result", result)
        except Exception as err:
            logger.error("Failed to get targets: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_GET_TARGETS):
        hass.services.async_register(
            DOMAIN,
            SERVICE_GET_TARGETS,
            handle_get_targets,
        )

    async def handle_user_heartbeat(call: ServiceCall) -> None:
        user_id = call.data["user_id"]
        user_name = call.data["user_name"]
        try:
            await client.user_heartbeat(user_id, user_name)
        except Exception as err:
            logger.error("Failed to send user heartbeat: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_USER_HEARTBEAT):
        hass.services.async_register(
            DOMAIN,
            SERVICE_USER_HEARTBEAT,
            handle_user_heartbeat,
            schema=vol.Schema({
                vol.Required("user_id"): str,
                vol.Required("user_name"): str,
            }),
        )

    async def handle_get_remote_users(call: ServiceCall) -> None:
        node_id = call.data["node_id"]
        try:
            result = await client.get_remote_users(node_id)
            hass.bus.async_fire("simson_remote_users", result)
        except Exception as err:
            logger.error("Failed to get remote users: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_GET_REMOTE_USERS):
        hass.services.async_register(
            DOMAIN,
            SERVICE_GET_REMOTE_USERS,
            handle_get_remote_users,
            schema=vol.Schema({
                vol.Required("node_id"): str,
            }),
        )

    async def handle_get_call_history(call: ServiceCall) -> None:
        limit = call.data.get("limit", 50)
        try:
            result = await client.get_call_history(limit)
            hass.bus.async_fire("simson_call_history", result)
        except Exception as err:
            logger.error("Failed to get call history: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_GET_CALL_HISTORY):
        hass.services.async_register(
            DOMAIN,
            SERVICE_GET_CALL_HISTORY,
            handle_get_call_history,
            schema=vol.Schema({
                vol.Optional("limit", default=50): int,
            }),
        )
