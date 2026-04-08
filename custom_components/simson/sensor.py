"""Sensor platform for the Simson integration."""

from __future__ import annotations

import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN

logger = logging.getLogger(__name__)


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
            return active.get("state", "active")
        return "idle"

    @property
    def extra_state_attributes(self):
        if not self.coordinator.data:
            return {}
        calls_data = self.coordinator.data.get("calls_data", {})
        active = calls_data.get("active_call")
        if active:
            return {
                "call_id": active.get("call_id", ""),
                "direction": active.get("direction", ""),
                "remote_node_id": active.get("remote_node_id", ""),
                "remote_label": active.get("remote_label", ""),
                "call_type": active.get("call_type", ""),
                "started_at": active.get("started_at", ""),
                "target_user_id": active.get("target_user_id", ""),
                "caller_user_id": active.get("caller_user_id", ""),
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
        return calls_data.get("total", 0)
