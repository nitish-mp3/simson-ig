from hashlib import sha256

from homeassistant.components.button import ButtonEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    known_users = set()

    def add_buttons():
        entities = []
        for user in (coordinator.data or {}).get("local_users", []):
            if user["user_id"] not in known_users:
                known_users.add(user["user_id"])
                entities.append(SimsonUserCallButton(coordinator, entry, user))
        if entities:
            async_add_entities(entities, True)

    add_buttons()
    entry.async_on_unload(coordinator.async_add_listener(add_buttons))


class SimsonUserCallButton(CoordinatorEntity, ButtonEntity):
    _attr_has_entity_name = True
    _attr_icon = "mdi:phone-outgoing"

    def __init__(self, coordinator, entry, user):
        super().__init__(coordinator)
        self._entry = entry
        self._user_id = user["user_id"]
        self._attr_name = f"Call {user['user_name']}"
        self._contact_id = sha256(f"{entry.entry_id}:{self._user_id}".encode()).hexdigest()[:20]
        self._attr_unique_id = f"{entry.entry_id}_call_user_{self._contact_id}"

    @property
    def available(self):
        data = self.coordinator.data or {}
        return bool(super().available and data.get("vps_connected") and
            any(user["user_id"] == self._user_id for user in data.get("local_users", [])))

    @property
    def device_info(self):
        return {"identifiers": {(DOMAIN, self._entry.entry_id)}}

    @property
    def extra_state_attributes(self):
        return {"simson_contact": True, "simson_call_button": True,
            "contact_id": self._contact_id, "user_id": self._user_id,
            "entry_id": self._entry.entry_id,
            "node_id": (self.coordinator.data or {}).get("node_id", "")}

    async def async_press(self):
        await self.hass.services.async_call(DOMAIN, "call_user",
            {"entity_id": self.entity_id}, blocking=True, context=self._context)
