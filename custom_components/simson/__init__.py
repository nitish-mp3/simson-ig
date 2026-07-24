"""The Simson Call Relay integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote

import aiohttp
import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE

from aiohttp import web

from .api import SimsonApiClient
from .const import (
    DOMAIN,
    CONF_ADDON_URL,
    PLATFORMS,
    SERVICE_MAKE_CALL,
    SERVICE_CALL_SIP_PHONE,
    SERVICE_CALL_PHONE_NUMBER,
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
_CARD_VERSION = "4.8.17"
_CARD_URL = f"{_CARD_JS_PATH}?v={_CARD_VERSION}"
_CALL_ACTION_VIEW_HASS_IDS: set[int] = set()
_CARD_REGISTERED_HASS_IDS: set[int] = set()


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the card independently of addon/config-entry availability."""
    await _async_register_card(hass)
    return True


async def _async_register_card(hass: HomeAssistant) -> None:
    """Serve and load the card once, even while the addon is reconnecting."""
    hass_id = id(hass)
    if hass_id in _CARD_REGISTERED_HASS_IDS:
        return
    try:
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                "/simson/www",
                str(Path(__file__).parent / "www"),
                cache_headers=False,
            )
        ])
    except Exception:
        pass  # Another Simson entry/reload may already own this static path.
    add_extra_js_url(hass, _CARD_URL)
    await _async_register_lovelace_resource(hass)
    _CARD_REGISTERED_HASS_IDS.add(hass_id)


async def _async_register_lovelace_resource(hass: HomeAssistant) -> None:
    """Make fresh/mobile dashboard loads wait for the versioned card module."""
    try:
        lovelace = hass.data.get(LOVELACE_DATA)
        if not lovelace or lovelace.resource_mode != MODE_STORAGE:
            return
        resources = lovelace.resources
        await resources.async_get_info()  # Ensure the storage collection is loaded.
        current = None
        legacy = None
        for item in resources.async_items() or []:
            url = str(item.get("url") or "")
            path = url.split("?", 1)[0]
            if path == _CARD_JS_PATH:
                current = item
                break
            if path == "/local/simson-call-card.js":
                legacy = item

        existing = current or legacy
        if existing:
            if existing.get("url") != _CARD_URL:
                await resources.async_update_item(existing["id"], {"url": _CARD_URL})
            return
        await resources.async_create_item({"url": _CARD_URL, "res_type": "module"})
    except Exception as err:  # Dynamic frontend module registration remains the fallback.
        logger.warning("Could not persist the Simson Lovelace card resource: %s", err)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Simson from a config entry."""
    # Card rendering must not depend on addon health. This runs before the
    # connectivity check so mobile/hard-refresh does not show Configuration
    # error while the addon or DNS is briefly reconnecting.
    await _async_register_card(hass)
    addon_url = entry.options.get(CONF_ADDON_URL, entry.data[CONF_ADDON_URL])
    client = SimsonApiClient(addon_url)

    try:
        # Verify connectivity.
        try:
            await client.health()
        except Exception as err:
            raise ConfigEntryNotReady(f"Cannot connect to Simson addon: {err}") from err

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
        _register_call_action_view(hass)
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
            for svc in (SERVICE_MAKE_CALL, SERVICE_CALL_SIP_PHONE, SERVICE_CALL_PHONE_NUMBER, SERVICE_ANSWER_CALL, SERVICE_REJECT_CALL,
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
            fresh = {**status, "calls_data": calls}
            # Event listeners enrich these values immediately between polls.
            # Preserve them when /api/status does not include event history;
            # otherwise every five-second refresh resets automation sensors to
            # unknown and drops caller/duration metadata.
            previous = self.data if isinstance(self.data, dict) else {}
            for key in ("last_call_event", "last_automation_event"):
                if key not in fresh and previous.get(key):
                    fresh[key] = previous[key]
            return fresh
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


class SimsonCallActionView(HomeAssistantView):
    """Answer/reject/hang up one exact call, then open its HA dashboard."""

    url = "/api/simson/call-action/{action}/{call_id}"
    name = "api:simson:call-action"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def get(self, request: web.Request, action: str, call_id: str) -> web.Response:
        action = str(action or "").strip().lower()
        call_id = str(call_id or "").strip()
        node_id = str(request.query.get("node_id") or "").strip()
        redirect = str(request.query.get("redirect") or "/lovelace/default_view").strip()
        if not redirect.startswith("/") or redirect.startswith("//"):
            redirect = "/lovelace/default_view"
        if action not in {"answer", "decline", "hangup"} or not call_id or len(call_id) > 160:
            raise web.HTTPBadRequest(text="Invalid Simson call action")

        entries = []
        for data in self._hass.data.get(DOMAIN, {}).values():
            if not isinstance(data, dict) or not data.get("client"):
                continue
            coordinator = data.get("coordinator")
            status = coordinator.data if coordinator and isinstance(coordinator.data, dict) else {}
            matches_node = bool(node_id and str(status.get("node_id") or "") == node_id)
            entries.append((not matches_node, data))
        entries.sort(key=lambda item: item[0])

        result = None
        last_error: Exception | None = None
        for _, data in entries:
            client = data["client"]
            try:
                if action == "answer":
                    result = await client.answer_call(call_id, strict_call_id=True)
                elif action == "decline":
                    result = await client.reject_call(
                        call_id,
                        "declined_from_notification",
                        strict_call_id=True,
                        terminate_call=True,
                    )
                else:
                    result = await client.hangup_call(call_id, strict_call_id=True)
                coordinator = data.get("coordinator")
                if coordinator:
                    self._hass.async_create_task(coordinator.async_request_refresh())
                break
            except aiohttp.ClientResponseError as err:
                last_error = err
                if err.status == 404:
                    continue
                break
            except Exception as err:  # noqa: BLE001 - shown as HA notification below
                last_error = err
                break

        event_data = {
            "action": action,
            "call_id": call_id,
            "node_id": node_id,
            **(result or {}),
        }
        if result is None:
            event_data["error"] = str(last_error or "call is no longer available")
            await self._hass.services.async_call(
                "persistent_notification",
                "create",
                {
                    "notification_id": f"simson_action_{call_id[:32]}",
                    "title": "Simson call action failed",
                    "message": f"Could not {action} this call: {event_data['error']}",
                },
                blocking=False,
            )
        self._hass.bus.async_fire("simson_notification_action_result", event_data)
        raise web.HTTPFound(location=redirect)


def _register_call_action_view(hass: HomeAssistant) -> None:
    """Register the authenticated call-control redirect once per HA runtime."""
    hass_id = id(hass)
    if hass_id in _CALL_ACTION_VIEW_HASS_IDS:
        return
    hass.http.register_view(SimsonCallActionView(hass))
    _CALL_ACTION_VIEW_HASS_IDS.add(hass_id)


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

    def raise_service_error(action: str, err: Exception) -> None:
        """Surface addon/API failures in HA instead of silently logging them."""
        message = f"Simson {action} failed: {err}"
        logger.error(message)
        raise HomeAssistantError(message) from err

    def fire_service_result(service: str, result: dict) -> None:
        hass.bus.async_fire("simson_service_result", {"service": service, **(result or {})})

    async def handle_make_call(call: ServiceCall) -> None:
        target = call.data.get("target_node_id", "")
        target_id = call.data.get("target_id", "")
        phone_number = call.data.get("phone_number", "")
        trunk = call.data.get("trunk", "")
        caller_id = call.data.get("caller_id", "")
        source_extension = str(call.data.get("source_extension", "") or "").strip()
        target_extension = str(call.data.get("target_extension", "") or "").strip()
        source_auto_mode = normalize_auto_mode(call.data.get("source_auto_mode", "speaker"))
        target_auto_mode = normalize_auto_mode(call.data.get("target_auto_mode", "speaker"))
        timeout_sec = int(call.data.get("timeout_sec", 30) or 30)
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
                source_extension=source_extension,
                target_extension=target_extension,
                source_auto_mode=source_auto_mode,
                target_auto_mode=target_auto_mode,
                timeout_sec=timeout_sec,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
                caller_user_id=caller_user_id,
            )
            logger.info("Call initiated: %s", result)
            fire_service_result(SERVICE_MAKE_CALL, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error("make_call", err)

    async def handle_call_sip_phone(call: ServiceCall) -> None:
        extension = str(call.data["extension"]).strip().replace("sip:", "")
        caller_id = call.data.get("caller_id", "")
        target_user_id = call.data.get("target_user_id", "")
        target_user_name = call.data.get("target_user_name", "")
        caller_user_id = call.data.get("caller_user_id", "")
        try:
            result = await client.call_sip_phone(
                extension=extension,
                caller_id=caller_id,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
                caller_user_id=caller_user_id,
            )
            logger.info("SIP phone call initiated: %s", result)
            fire_service_result(SERVICE_CALL_SIP_PHONE, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error(f"call_sip_phone {extension}", err)

    async def handle_call_phone_number(call: ServiceCall) -> None:
        phone_number = str(call.data["phone_number"]).strip()
        trunk = str(call.data.get("trunk", "") or "").strip()
        caller_id = call.data.get("caller_id", "")
        caller_user_id = call.data.get("caller_user_id", "")
        try:
            result = await client.call_phone_number(
                phone_number=phone_number,
                trunk=trunk,
                caller_id=caller_id,
                caller_user_id=caller_user_id,
            )
            logger.info("Outside phone call initiated: %s", result)
            fire_service_result(SERVICE_CALL_PHONE_NUMBER, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error(f"call_phone_number {phone_number}", err)

    async def handle_answer_call(call: ServiceCall) -> None:
        call_id = call.data.get("call_id", "")
        answered_by_user_id = call.data.get("answered_by_user_id", "")
        try:
            result = await client.answer_call(call_id, answered_by_user_id=answered_by_user_id)
            fire_service_result(SERVICE_ANSWER_CALL, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error("answer_call", err)

    async def handle_reject_call(call: ServiceCall) -> None:
        call_id = call.data.get("call_id", "")
        reason = call.data.get("reason", "rejected")
        try:
            result = await client.reject_call(call_id, reason)
            fire_service_result(SERVICE_REJECT_CALL, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error("reject_call", err)

    async def handle_hangup_call(call: ServiceCall) -> None:
        call_id = call.data.get("call_id", "")
        try:
            result = await client.hangup_call(call_id)
            fire_service_result(SERVICE_HANGUP_CALL, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error("hangup_call", err)

    async def handle_transfer_call(call: ServiceCall) -> None:
        call_id = call.data["call_id"]
        target_node_id = call.data["target_node_id"]
        target_user_id = call.data.get("target_user_id", "")
        target_user_name = call.data.get("target_user_name", "")
        try:
            result = await client.transfer_call(
                call_id,
                target_node_id,
                target_user_id=target_user_id,
                target_user_name=target_user_name,
            )
            fire_service_result(SERVICE_TRANSFER_CALL, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error("transfer_call", err)

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
                vol.Optional("source_extension", default=""): str,
                vol.Optional("target_extension", default=""): str,
                vol.Optional("source_auto_mode", default="speaker"): vol.In(["", "none", "normal", "answer", "speaker", "intercom"]),
                vol.Optional("target_auto_mode", default="speaker"): vol.In(["", "none", "normal", "answer", "speaker", "intercom"]),
                vol.Optional("timeout_sec", default=30): vol.All(int, vol.Range(min=5, max=120)),
                vol.Optional("call_type", default="voice"): str,
                vol.Optional("target_user_id", default=""): str,
                vol.Optional("target_user_name", default=""): str,
                vol.Optional("caller_user_id", default=""): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_CALL_SIP_PHONE):
        hass.services.async_register(
            DOMAIN,
            SERVICE_CALL_SIP_PHONE,
            handle_call_sip_phone,
            schema=vol.Schema({
                vol.Required("extension"): str,
                vol.Optional("caller_id", default=""): str,
                vol.Optional("target_user_id", default=""): str,
                vol.Optional("target_user_name", default=""): str,
                vol.Optional("caller_user_id", default=""): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_CALL_PHONE_NUMBER):
        hass.services.async_register(
            DOMAIN,
            SERVICE_CALL_PHONE_NUMBER,
            handle_call_phone_number,
            schema=vol.Schema({
                vol.Required("phone_number"): str,
                vol.Optional("trunk", default=""): str,
                vol.Optional("caller_id", default=""): str,
                vol.Optional("caller_user_id", default=""): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_ANSWER_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_ANSWER_CALL,
            handle_answer_call,
            schema=vol.Schema({
                vol.Optional("call_id", default=""): str,
                vol.Optional("answered_by_user_id", default=""): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_REJECT_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_REJECT_CALL,
            handle_reject_call,
            schema=vol.Schema({
                vol.Optional("call_id", default=""): str,
                vol.Optional("reason", default="rejected"): str,
            }),
        )

    if not hass.services.has_service(DOMAIN, SERVICE_HANGUP_CALL):
        hass.services.async_register(
            DOMAIN,
            SERVICE_HANGUP_CALL,
            handle_hangup_call,
            schema=vol.Schema({
                vol.Optional("call_id", default=""): str,
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
            fire_service_result(SERVICE_RUN_TRIGGER, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error(f"run_trigger {trigger_id}", err)

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
            fire_service_result(SERVICE_CONNECT_SIP_PHONES, result)
            refresh_all_entries()
        except Exception as err:
            raise_service_error(f"connect_sip_phones {source_extension}->{target_extension}", err)

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
        if event in ("outgoing", "requesting"):
            return "ringing"
        if event in ("active", "answered"):
            return "active"
        if event in ("ended", "failed", "missed", "declined", "timeout"):
            return event
        return event or "unknown"

    def merge_nonempty(base: dict, update: dict) -> dict:
        """Merge sparse status events without erasing richer call metadata."""
        merged = dict(base or {})
        for key, value in (update or {}).items():
            if value is not None and value != "":
                merged[key] = value
            elif key not in merged:
                merged[key] = value
        return merged

    @callback
    def update_call_event(event: Event) -> None:
        payload = dict(event.data or {})
        if not event_matches_this_entry(payload):
            return

        current = dict(coordinator.data or {})
        calls_data = dict(current.get("calls_data") or {})
        event_state = state_for_event(payload)
        call_id = str(payload.get("call_id") or "")
        terminal = event_state in {"ended", "failed", "missed", "declined", "timeout", "forwarded"}

        previous_event = current.get("last_call_event") or {}
        if isinstance(previous_event, dict) and (
            not call_id or str(previous_event.get("call_id") or "") == call_id
        ):
            rich_event = merge_nonempty(previous_event, payload)
        else:
            rich_event = dict(payload)
        rich_event["event"] = event_state
        rich_event["status"] = event_state
        current["last_call_event"] = rich_event

        active_call = calls_data.get("active_call") or current.get("active_call")
        if terminal:
            if not active_call or not call_id or active_call.get("call_id") == call_id:
                calls_data["active_call"] = None
                current["active_call"] = None
        else:
            existing_active = dict(active_call or {})
            merged = merge_nonempty(active_call or {}, {
                "call_id": call_id or existing_active.get("call_id", ""),
                "state": event_state,
                "direction": payload.get("direction", ""),
                "remote_node_id": payload.get("remote_node_id", ""),
                "remote_label": payload.get("remote_label") or payload.get("remote_name") or payload.get("remote_number"),
                "remote_number": payload.get("remote_number", ""),
                "remote_name": payload.get("remote_name", ""),
                "display_name": payload.get("display_name", ""),
                "caller_number": payload.get("caller_number", ""),
                "caller_name": payload.get("caller_name", ""),
                "callee_number": payload.get("callee_number", ""),
                "callee_name": payload.get("callee_name", ""),
                "call_type": payload.get("call_type", ""),
                "sip_bridge_id": payload.get("sip_bridge_id", ""),
                "target_id": payload.get("target_id", ""),
                "target_type": payload.get("target_type", ""),
                "target_label": payload.get("target_label", ""),
                "source_extension": payload.get("source_extension", ""),
                "target_extension": payload.get("target_extension", ""),
                "gateway_extension": payload.get("gateway_extension", ""),
                "source_auto_mode": payload.get("source_auto_mode", ""),
                "target_auto_mode": payload.get("target_auto_mode", ""),
                "started_at": payload.get("started_at", ""),
                "answered_at": payload.get("answered_at", ""),
                "duration_seconds": payload.get("duration_seconds", 0),
                "ring_duration_seconds": payload.get("ring_duration_seconds", 0),
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
        hass.bus.async_listen("simson_notification_action_result", update_automation_event),
    ]
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["event_unsubs"] = unsubs


def _register_mobile_notification_actions(
    hass: HomeAssistant,
    entry: ConfigEntry,
    client: SimsonApiClient,
) -> None:
    """Handle HA Companion actionable notification buttons for Simson calls."""

    coordinator = hass.data.get(DOMAIN, {}).get(entry.entry_id, {}).get("coordinator")

    def _entry_node_id() -> str:
        data = coordinator.data if coordinator and isinstance(coordinator.data, dict) else {}
        return str(data.get("node_id") or "").strip()

    async def _run_action(action_name: str, call_id: str, notify_ref: str = "") -> None:
        try:
            if action_name == "answer":
                result = await client.answer_call(
                    call_id,
                    strict_call_id=True,
                    # Current notifications use the authenticated HTTP action
                    # view, which answers and redirects in one foregrounded
                    # request. Keep old custom-action notifications working,
                    # but never issue command_webview in the background: Android
                    # gates that command behind device permissions and can show
                    # an unrelated command_bluetooth permission warning.
                    open_dashboard=False,
                )
            elif action_name == "decline":
                result = await client.reject_call(
                    call_id,
                    "declined_from_notification",
                    strict_call_id=True,
                    terminate_call=True,
                )
            elif action_name == "hangup":
                result = await client.hangup_call(call_id, strict_call_id=True)
            else:
                return

            hass.bus.async_fire(
                "simson_notification_action_result",
                {"action": action_name, "call_id": call_id, **(result or {})},
            )
            for data in hass.data.get(DOMAIN, {}).values():
                if not isinstance(data, dict):
                    continue
                coordinator = data.get("coordinator")
                if coordinator:
                    hass.async_create_task(coordinator.async_request_refresh())
        except Exception as err:  # noqa: BLE001 - surface failures to HA automations/logs
            logger.error(
                "Simson notification action %s failed for call %s: %s",
                action_name,
                call_id,
                err,
            )
            hass.bus.async_fire(
                "simson_notification_action_result",
                {
                    "action": action_name,
                    "call_id": call_id,
                    "error": str(err),
                },
            )

    @callback
    def _handle_action_event(event: Event) -> None:
        action = str(event.data.get("action") or "").strip()
        scoped_prefixes = {
            "SIMSON_ANSWER": "answer",
            "SIMSON_DECLINE": "decline",
            "SIMSON_HANGUP": "hangup",
        }
        parts = action.split("::", 3)
        if len(parts) in (3, 4) and parts[0] in scoped_prefixes:
            action_node_id = unquote(parts[1]).strip()
            call_id = unquote(parts[2]).strip()
            notify_ref = unquote(parts[3]).strip() if len(parts) == 4 else ""
            # Every config entry has its own event listener. Scope the action
            # to the originating node so one button cannot answer/hang up a
            # different site's call.
            if action_node_id and action_node_id != _entry_node_id():
                return
            if call_id:
                hass.async_create_task(
                    _run_action(scoped_prefixes[parts[0]], call_id, notify_ref)
                )
            return

        # Compatibility for notifications created by older addon versions.
        prefixes = {
            "SIMSON_ANSWER_": "answer",
            "SIMSON_DECLINE_": "decline",
            "SIMSON_HANGUP_": "hangup",
        }
        for prefix, action_name in prefixes.items():
            if action.startswith(prefix):
                call_id = action.removeprefix(prefix)
                if call_id:
                    hass.async_create_task(_run_action(action_name, call_id))
                return

    unsub = hass.bus.async_listen("mobile_app_notification_action", _handle_action_event)
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["notification_unsub"] = unsub
