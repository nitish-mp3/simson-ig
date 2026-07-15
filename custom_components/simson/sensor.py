"""Sensor platform for the Simson integration."""

from __future__ import annotations

import logging
import time

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN

logger = logging.getLogger(__name__)

STALE_RINGING_SECONDS = 90


def _is_stale_ringing_call(active: dict | None) -> bool:
    if not active:
        return False
    state = active.get("state", "")
    if state not in ("incoming", "ringing", "requesting"):
        return False
    try:
        started_at = float(active.get("started_at") or 0)
    except (TypeError, ValueError):
        return False
    return bool(started_at and (time.time() - started_at) > STALE_RINGING_SECONDS)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Simson sensors from a config entry."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]

    entities = [
        SimsonConnectionSensor(coordinator, entry),
        SimsonCallStateSensor(coordinator, entry),
        SimsonActiveCallsSensor(coordinator, entry),
        SimsonLastCallEventSensor(coordinator, entry),
        SimsonLastAutomationEventSensor(coordinator, entry),
    ]
    async_add_entities(entities, True)


class SimsonBaseSensor(CoordinatorEntity, SensorEntity):
    """Base class for Simson sensors."""

    _attr_has_entity_name = True

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry

    @property
    def device_info(self):
        node_id = self.coordinator.data.get("node_id", "unknown") if self.coordinator.data else "unknown"
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": f"Simson {node_id}",
            "manufacturer": "ArchitechLabs",
            "model": "Simson Call Relay",
            "sw_version": "1.0.0",
        }


class SimsonConnectionSensor(SimsonBaseSensor):
    """Sensor showing addon connection status to VPS."""

    _attr_name = "Connection"
    _attr_icon = "mdi:lan-connect"

    @property
    def unique_id(self) -> str:
        return f"{self._entry.entry_id}_connection"

    @property
    def native_value(self):
        if self.coordinator.data:
            connected = self.coordinator.data.get("vps_connected", False)
            return "connected" if connected else "disconnected"
        return "unknown"

    @property
    def extra_state_attributes(self):
        if self.coordinator.data:
            return {
                "node_id": self.coordinator.data.get("node_id", ""),
                "account_id": self.coordinator.data.get("account_id", ""),
                "uptime": self.coordinator.data.get("uptime", 0),
                "routing": self.coordinator.data.get("routing", {}),
            }
        return {}


class SimsonCallStateSensor(SimsonBaseSensor):
    """Sensor showing current call state."""

    _attr_name = "Call State"
    _attr_icon = "mdi:phone"

    @property
    def unique_id(self) -> str:
        return f"{self._entry.entry_id}_call_state"

    @property
    def native_value(self):
        if not self.coordinator.data:
            return "idle"
        calls_data = self.coordinator.data.get("calls_data", {})
        active = calls_data.get("active_call")
        if active:
            if _is_stale_ringing_call(active):
                return "idle"
            return active.get("state", "active")
        return "idle"

    @property
    def extra_state_attributes(self):
        if not self.coordinator.data:
            return {}
        calls_data = self.coordinator.data.get("calls_data", {})
        active = calls_data.get("active_call")
        if active:
            if _is_stale_ringing_call(active):
                return {}
            return {
                "call_id": active.get("call_id", ""),
                "direction": active.get("direction", ""),
                "remote_node_id": active.get("remote_node_id", ""),
                "remote_label": active.get("remote_label", ""),
                "remote_number": active.get("remote_number", ""),
                "remote_name": active.get("remote_name", ""),
                "display_name": active.get("display_name", ""),
                "caller_number": active.get("caller_number", ""),
                "caller_name": active.get("caller_name", ""),
                "callee_number": active.get("callee_number", ""),
                "callee_name": active.get("callee_name", ""),
                "source_extension": active.get("source_extension", ""),
                "extension": active.get("extension", ""),
                "context": active.get("context", ""),
                "trunk": active.get("trunk", ""),
                "gateway_extension": active.get("gateway_extension", ""),
                "call_type": active.get("call_type", ""),
                "sip_bridge_id": active.get("sip_bridge_id", ""),
                "target_extension": active.get("target_extension", ""),
                "source_auto_mode": active.get("source_auto_mode", ""),
                "target_auto_mode": active.get("target_auto_mode", ""),
                "target_id": active.get("target_id", ""),
                "target_type": active.get("target_type", ""),
                "target_label": active.get("target_label", ""),
                "started_at": active.get("started_at", ""),
                "answered_at": active.get("answered_at", ""),
                "ended_at": active.get("ended_at", ""),
                "active_for": active.get("active_for", 0),
                "duration_seconds": active.get("duration_seconds", 0),
                "ring_duration_seconds": active.get("ring_duration_seconds", 0),
                "target_user_id": active.get("target_user_id", ""),
                "target_user_name": active.get("target_user_name", ""),
                "caller_user_id": active.get("caller_user_id", ""),
                "caller_user_name": active.get("caller_user_name", ""),
                "answered_by_user_id": active.get("answered_by_user_id", ""),
                "answered_by_user_name": active.get("answered_by_user_name", ""),
                "forwarded_to": active.get("forwarded_to", ""),
                "forwarded_extension": active.get("forwarded_extension", ""),
                "routing": active.get("routing", {}),
                "raw": active,
            }
        return {}


class SimsonActiveCallsSensor(SimsonBaseSensor):
    """Sensor showing number of active calls (including recent)."""

    _attr_name = "Calls Count"
    _attr_icon = "mdi:phone-log"
    _attr_device_class = None

    @property
    def unique_id(self) -> str:
        return f"{self._entry.entry_id}_calls_count"

    @property
    def native_value(self):
        if not self.coordinator.data:
            return 0
        calls_data = self.coordinator.data.get("calls_data", {})
        calls = calls_data.get("calls", [])
        active_count = len([
            c for c in calls
            if c.get("state") in ("requesting", "ringing", "incoming", "active")
        ])
        if active_count == 0 and calls_data.get("active_call"):
            return 1
        return active_count

    @property
    def extra_state_attributes(self):
        if not self.coordinator.data:
            return {}
        calls_data = self.coordinator.data.get("calls_data", {})
        calls = calls_data.get("calls", [])
        active_calls = [
            c for c in calls
            if c.get("state") in ("requesting", "ringing", "incoming", "active")
        ]
        return {
            "active_calls": active_calls,
            "active_call": calls_data.get("active_call"),
            "total": calls_data.get("total", 0),
        }


class SimsonLastCallEventSensor(SimsonBaseSensor):
    """Managed sensor exposing the latest rich call event for automations."""

    _attr_name = "Last Call Event"
    _attr_icon = "mdi:phone-in-talk"

    @property
    def unique_id(self) -> str:
        return f"{self._entry.entry_id}_last_call_event"

    @property
    def native_value(self):
        if not self.coordinator.data:
            return "none"
        event = self.coordinator.data.get("last_call_event") or {}
        return event.get("event") or event.get("status") or "none"

    @property
    def extra_state_attributes(self):
        if not self.coordinator.data:
            return {}
        event = self.coordinator.data.get("last_call_event") or {}
        if not isinstance(event, dict):
            return {}
        return {
            "call_id": event.get("call_id", ""),
            "status": event.get("status", ""),
            "direction": event.get("direction", ""),
            "reason": event.get("reason", ""),
            "node_id": event.get("node_id", ""),
            "account_id": event.get("account_id", ""),
            "remote": event.get("remote", ""),
            "remote_node_id": event.get("remote_node_id", ""),
            "remote_label": event.get("remote_label", ""),
            "remote_number": event.get("remote_number", ""),
            "remote_name": event.get("remote_name", ""),
            "display_name": event.get("display_name", ""),
            "caller_number": event.get("caller_number", ""),
            "caller_name": event.get("caller_name", ""),
            "callee_number": event.get("callee_number", ""),
            "callee_name": event.get("callee_name", ""),
            "call_type": event.get("call_type", ""),
            "sip_bridge_id": event.get("sip_bridge_id", ""),
            "sip_extension": event.get("sip_extension", ""),
            "source_extension": event.get("source_extension", ""),
            "target_extension": event.get("target_extension", ""),
            "source_auto_mode": event.get("source_auto_mode", ""),
            "target_auto_mode": event.get("target_auto_mode", ""),
            "target_id": event.get("target_id", ""),
            "target_type": event.get("target_type", ""),
            "target_label": event.get("target_label", ""),
            "target_user_id": event.get("target_user_id", ""),
            "target_user_name": event.get("target_user_name", ""),
            "caller_user_id": event.get("caller_user_id", ""),
            "caller_user_name": event.get("caller_user_name", ""),
            "answered_by_user_id": event.get("answered_by_user_id", ""),
            "answered_by_user_name": event.get("answered_by_user_name", ""),
            "forwarded_to": event.get("forwarded_to", ""),
            "forwarded_extension": event.get("forwarded_extension", ""),
            "started_at": event.get("started_at", ""),
            "answered_at": event.get("answered_at", ""),
            "ended_at": event.get("ended_at", ""),
            "duration_seconds": event.get("duration_seconds", 0),
            "ring_duration_seconds": event.get("ring_duration_seconds", 0),
            "extension": event.get("extension", ""),
            "context": event.get("context", ""),
            "trunk": event.get("trunk", ""),
            "gateway_extension": event.get("gateway_extension", ""),
            "raw": event,
        }


class SimsonLastAutomationEventSensor(SimsonBaseSensor):
    """Managed sensor exposing latest door/webhook automation event details."""

    _attr_name = "Last Automation Event"
    _attr_icon = "mdi:lightning-bolt"

    @property
    def unique_id(self) -> str:
        return f"{self._entry.entry_id}_last_automation_event"

    @property
    def native_value(self):
        if not self.coordinator.data:
            return "unknown"
        event = self.coordinator.data.get("last_automation_event") or {}
        return event.get("status") or event.get("event") or event.get("event_type") or "unknown"

    @property
    def extra_state_attributes(self):
        if not self.coordinator.data:
            return {}
        event = self.coordinator.data.get("last_automation_event") or {}
        if not isinstance(event, dict):
            return {}
        return {
            "event_type": event.get("event_type", ""),
            "action": event.get("action", ""),
            "trigger_id": event.get("trigger_id", ""),
            "label": event.get("label", ""),
            "status": event.get("status", ""),
            "phase": event.get("phase", ""),
            "reason": event.get("reason", ""),
            "error": event.get("error", ""),
            "node_id": event.get("node_id", ""),
            "account_id": event.get("account_id", ""),
            "source": event.get("source", ""),
            "source_extension": event.get("source_extension", ""),
            "target_extension": event.get("target_extension", ""),
            "source_auto_mode": event.get("source_auto_mode", ""),
            "target_auto_mode": event.get("target_auto_mode", ""),
            "target_id": event.get("target_id", ""),
            "target_ids": event.get("target_ids", []),
            "targets": event.get("targets", []),
            "target_node_id": event.get("target_node_id", ""),
            "target_sip_extension": event.get("target_sip_extension", ""),
            "target_sip_extensions": event.get("target_sip_extensions", []),
            "media_mode": event.get("media_mode", ""),
            "fanout_mode": event.get("fanout_mode", ""),
            "call_id": event.get("call_id", ""),
            "bridge_id": event.get("bridge_id", ""),
            "results": event.get("results", []),
            "retry_after": event.get("retry_after", ""),
            "raw": event,
        }
