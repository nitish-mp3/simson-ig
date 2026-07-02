"""The Simson Call Relay integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
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
    SERVICE_TRANSFER_CALL,
    SERVICE_WEBRTC_SIGNAL,
    SERVICE_GET_TARGETS,
    SERVICE_USER_HEARTBEAT,
    SERVICE_GET_REMOTE_USERS,
    SERVICE_GET_CALL_HISTORY,
    SERVICE_RUN_TRIGGER,
    SERVICE_CONNECT_SIP_PHONES,
)

logger = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=5)
_CARD_JS_PATH = "/simson/www/simson-card.js"
_CARD_VERSION = "4.8.12"
_CARD_URL = f"{_CARD_JS_PATH}?v={_CARD_VERSION}"


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

        # Register services and live event sync.
        _register_services(hass, client)
        _register_live_event_sync(hass, entry, coordinator)

        # Expose /api/webrtc-config so the Lovelace card can fetch SIP credentials.
        hass.http.register_view(WebRTCConfigView(client))
        _register_mobile_notification_actions(hass, entry, client)

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
        if data and data.get("notification_unsub"):
            data["notification_unsub"]()
        if data:
            for unsub in data.get("event_unsubs", []) or []:
                unsub()
        # Unregister services when last entry is removed.
        if not hass.data[DOMAIN]:
            for svc in (SERVICE_MAKE_CALL, SERVICE_ANSWER_CALL, SERVICE_REJECT_CALL,
                        SERVICE_HANGUP_CALL, SERVICE_WEBRTC_SIGNAL, SERVICE_GET_TARGETS,
                        SERVICE_USER_HEARTBEAT, SERVICE_GET_REMOTE_USERS,
                        SERVICE_GET_CALL_HISTORY, SERVICE_RUN_TRIGGER,
                        SERVICE_TRANSFER_CALL, SERVICE_CONNECT_SIP_PHONES):
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

    def normalize_auto_mode(value: str, default: str = "speaker") -> str:
        """Map friendly service values to the exact VPS/Asterisk auto-answer modes."""
        mode = str(value or default).strip().lower()
        aliases = {
            "none": "normal",
            "off": "normal",
            "disabled": "normal",
            "answer": "normal",
            "auto": "normal",
            "auto_answer": "normal",
            "auto-answer": "normal",
            "speakerphone": "speaker",
            "intercom": "speaker",
        }
        mode = aliases.get(mode, mode)
        return mode if mode in ("", "normal", "speaker") else default

    def refresh_all_entries() -> None:
        """Refresh all Simson coordinators after a service changes call state."""
        for data in hass.data.get(DOMAIN, {}).values():
            coordinator = data.get("coordinator") if isinstance(data, dict) else None
            if coordinator:
                hass.async_create_task(coordinator.async_request_refresh())

    async def handle_make_call(call: ServiceCall) -> None:
        target = call.data.get("target_node_id", "")
        target_id = call.data.get("target_id", "")
        phone_number = call.data.get("phone_number", "")
        trunk = call.data.get("trunk", "")
        caller_id = call.data.get("caller_id", "")
        call_type = call.data.get("call_type", "voice")
        target_user_id = call.data.get("target_user_id", "")
        target_user_name = call.data.get("target_user_name", "")
        caller_user_id = call.data.get("caller_user_id", "")
        try:
            result = await client.make_call(
                target_node_id=target,
                call_type=call_type,
                target_id=target_id,
                phone_number=phone_number,
                trunk=trunk,
                caller_id=caller_id,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
                caller_user_id=caller_user_id,
            )
            logger.info("Call initiated: %s", result)
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to make call: %s", err)

    async def handle_answer_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        answered_by_user_id = call.data.get("answered_by_user_id", "")
        try:
            await client.answer_call(call_id, answered_by_user_id=answered_by_user_id)
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to answer call: %s", err)

    async def handle_reject_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        reason = call.data.get("reason", "rejected")
        try:
            await client.reject_call(call_id, reason)
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to reject call: %s", err)

    async def handle_hangup_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        try:
            await client.hangup_call(call_id)
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to hangup call: %s", err)

    async def handle_transfer_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        target_node_id = call.data["target_node_id"]
        target_user_id = call.data.get("target_user_id", "")
        target_user_name = call.data.get("target_user_name", "")
        try:
            await client.transfer_call(
                call_id,
                target_node_id,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
            )
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to transfer call: %s", err)

    if not hass.services.has_service(DOMAIN, SERVICE_MAKE_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_MAKE_CALL,
            handle_make_call,
            schema=vol.Schema({
                vol.Optional("target_node_id", default=""): str,
                vol.Optional("target_id", default=""): str,
                vol.Optional("phone_number", default=""): str,
                vol.Optional("trunk", default=""): str,
                vol.Optional("caller_id", default=""): str,
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
        hass.services.async_register(
            DOMAIN,
            SERVICE_TRANSFER_CALL,
            handle_transfer_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
                vol.Required("target_node_id"): str,
                vol.Optional("target_user_id", default=""): str,
                vol.Optional("target_user_name", default=""): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_TRANSFER_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_TRANSFER_CALL,
            handle_transfer_call,
            schema=vol.Schema({
                vol.Required("call_id"): str,
                vol.Required("target_node_id"): str,
                vol.Optional("target_user_id", default=""): str,
                vol.Optional("target_user_name", default=""): str,
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

    async def handle_run_trigger(call: ServiceCall) -> None:
        trigger_id = call.data["trigger_id"]
        try:
            result = await client.run_trigger(trigger_id)
            logger.info("Automation trigger initiated: %s", result)
            refresh_all_entries()
        except Exception as err:
            logger.error("Failed to run automation trigger %s: %s", trigger_id, err)

    if not hass.services.has_service(DOMAIN, SERVICE_RUN_TRIGGER):
        hass.services.async_register(
            DOMAIN,
            SERVICE_RUN_TRIGGER,
            handle_run_trigger,
            schema=vol.Schema({
                vol.Required("trigger_id"): str,
            }),
        )

    async def handle_connect_sip_phones(call: ServiceCall) -> None:
        source_extension = str(call.data["source_extension"]).strip()
        target_extension = str(call.data["target_extension"]).strip()
        source_auto_mode = normalize_auto_mode(call.data.get("source_auto_mode", "speaker"))
        target_auto_mode = normalize_auto_mode(call.data.get("target_auto_mode", "speaker"))
        caller_id = str(call.data.get("caller_id", "") or "").strip()
        timeout_sec = int(call.data.get("timeout_sec", 30) or 30)
        try:
            result = await client.connect_sip_phones(
                source_extension=source_extension,
                target_extension=target_extension,
                source_auto_mode=source_auto_mode,
                target_auto_mode=target_auto_mode,
                caller_id=caller_id,
                timeout_sec=timeout_sec,
            )
            logger.info("SIP intercom initiated: %s", result)
            refresh_all_entries()
        except Exception as err:
            logger.error(
                "Failed to connect SIP phones %s -> %s: %s",
                source_extension,
                target_extension,
                err,
            )

    if not hass.services.has_service(DOMAIN, SERVICE_CONNECT_SIP_PHONES):
        hass.services.async_register(
            DOMAIN,
            SERVICE_CONNECT_SIP_PHONES,
            handle_connect_sip_phones,
            schema=vol.Schema({
                vol.Required("source_extension"): str,
                vol.Required("target_extension"): str,
                vol.Optional("source_auto_mode", default="speaker"): vol.In(["", "none", "normal", "answer", "speaker", "intercom"]),
                vol.Optional("target_auto_mode", default="speaker"): vol.In(["", "none", "normal", "answer", "speaker", "intercom"]),
                vol.Optional("caller_id", default=""): str,
                vol.Optional("timeout_sec", default=30): vol.All(int, vol.Range(min=5, max=120)),
            }),
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


def _register_live_event_sync(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: SimsonCoordinator,
) -> None:
    """Update managed entities immediately when the addon fires HA events."""

    def event_matches_this_entry(payload: dict) -> bool:
        data = coordinator.data or {}
        node_id = str(data.get("node_id") or "")
        account_id = str(data.get("account_id") or "")
        payload_node = str(payload.get("node_id") or payload.get("target_node_id") or "")
        payload_account = str(payload.get("account_id") or "")
        if payload_account and account_id and payload_account != account_id:
            return False
        if payload_node and node_id and payload_node != node_id:
            target_nodes = payload.get("target_node_ids")
            if isinstance(target_nodes, list) and node_id in [str(x) for x in target_nodes]:
                return True
            return False
        return True

    def state_for_event(payload: dict) -> str:
        event = str(payload.get("event") or payload.get("status") or "").strip()
        if event in ("incoming", "ringing"):
            return "incoming"
        if event in ("outgoing", "requesting", "forwarded"):
            return "ringing"
        if event in ("active", "answered"):
            return "active"
        if event in ("ended", "failed", "missed", "declined", "timeout"):
            return event
        return event or "unknown"

    @callback
    def update_call_event(event: Event) -> None:
        payload = dict(event.data or {})
        if not event_matches_this_entry(payload):
            return

        current = dict(coordinator.data or {})
        current["last_call_event"] = payload
        calls_data = dict(current.get("calls_data") or {})
        event_state = state_for_event(payload)
        call_id = str(payload.get("call_id") or "")
        terminal = event_state in {"ended", "failed", "missed", "declined", "timeout"}

        active_call = calls_data.get("active_call") or current.get("active_call")
        if terminal:
            if not active_call or not call_id or active_call.get("call_id") == call_id:
                calls_data["active_call"] = None
                current["active_call"] = None
        else:
            merged = dict(active_call or {})
            merged.update({
                "call_id": call_id or merged.get("call_id", ""),
                "state": event_state,
                "direction": payload.get("direction", merged.get("direction", "")),
                "remote_node_id": payload.get("remote_node_id", merged.get("remote_node_id", "")),
                "remote_label": payload.get("remote_label") or payload.get("remote_number") or merged.get("remote_label", ""),
                "call_type": payload.get("call_type", merged.get("call_type", "")),
                "sip_bridge_id": payload.get("sip_bridge_id", merged.get("sip_bridge_id", "")),
                "target_id": payload.get("target_id", merged.get("target_id", "")),
                "target_type": payload.get("target_type", merged.get("target_type", "")),
                "target_label": payload.get("target_label", merged.get("target_label", "")),
                "source_extension": payload.get("source_extension", merged.get("source_extension", "")),
                "target_extension": payload.get("target_extension", merged.get("target_extension", "")),
                "source_auto_mode": payload.get("source_auto_mode", merged.get("source_auto_mode", "")),
                "target_auto_mode": payload.get("target_auto_mode", merged.get("target_auto_mode", "")),
                "started_at": payload.get("started_at", merged.get("started_at", "")),
                "answered_at": payload.get("answered_at", merged.get("answered_at", "")),
            })
            calls_data["active_call"] = merged
            current["active_call"] = merged

        current["calls_data"] = calls_data
        coordinator.async_set_updated_data(current)

    @callback
    def update_automation_event(event: Event) -> None:
        payload = dict(event.data or {})
        if not event_matches_this_entry(payload):
            return
        current = dict(coordinator.data or {})
        current["last_automation_event"] = {"event_type": event.event_type, **payload}
        coordinator.async_set_updated_data(current)

    unsubs = [
        hass.bus.async_listen("simson_call_event", update_call_event),
        hass.bus.async_listen("simson_call_status", update_call_event),
        hass.bus.async_listen("simson_automation_triggered", update_automation_event),
        hass.bus.async_listen("simson_door_station_call", update_automation_event),
        hass.bus.async_listen("simson_sip_intercom", update_automation_event),
    ]
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["event_unsubs"] = unsubs


def _register_mobile_notification_actions(
    hass: HomeAssistant,
    entry: ConfigEntry,
    client: SimsonApiClient,
) -> None:
    """Handle HA Companion actionable notification buttons for Simson calls."""

    @callback
    def _handle_action_event(event: Event) -> None:
        action = str(event.data.get("action") or "").strip()
        if action.startswith("SIMSON_ANSWER_"):
            call_id = action.removeprefix("SIMSON_ANSWER_")
            hass.async_create_task(client.answer_call(call_id))
        elif action.startswith("SIMSON_DECLINE_"):
            call_id = action.removeprefix("SIMSON_DECLINE_")
            hass.async_create_task(client.reject_call(call_id, "declined_from_notification"))

    unsub = hass.bus.async_listen("mobile_app_notification_action", _handle_action_event)
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["notification_unsub"] = unsub
