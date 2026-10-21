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
    owner = hass.data[DOMAIN][entry.entry_id]
    known_rooms = set()

    def add_room_buttons():
        rooms = owner.get("rooms")
        if not rooms:
            return
        entities = []
        for room_id in rooms.profiles:
            if room_id not in known_rooms:
                known_rooms.add(room_id)
                entities.extend(SimsonRoomButton(coordinator, entry, rooms, room_id, action)
                    for action in ("start_room_call", "end_room_call"))
        if entities:
            async_add_entities(entities, True)

    owner.setdefault("room_listeners", []).append(add_room_buttons)
    entry.async_on_unload(lambda: owner["room_listeners"].remove(add_room_buttons))
    add_room_buttons()


class SimsonRoomButton(CoordinatorEntity, ButtonEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator, entry, rooms, room_id, action):
        super().__init__(coordinator)
        self._entry = entry
        self._rooms = rooms
        self._room_id = room_id
        self._action = action
        self._attr_unique_id = f"{entry.entry_id}_{action}_{room_id}"
        self._attr_icon = "mdi:phone-outgoing" if action == "start_room_call" else "mdi:phone-hangup"

    @property
    def name(self):
        label = self._rooms.profiles.get(self._room_id, {}).get("label", self._room_id)
        return f"{label} {'call caregiver' if self._action == 'start_room_call' else 'end session'}"

    @property
    def device_info(self):
        return {"identifiers": {(DOMAIN, self._entry.entry_id)}}

    @property
    def extra_state_attributes(self):
        return {"simson_room_button": True, "room_id": self._room_id,
            "node_id": (self.coordinator.data or {}).get("node_id", "")}

    @property
    def available(self):
        return super().available and self._room_id in self._rooms.profiles

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        listeners = self.hass.data[DOMAIN][self._entry.entry_id]["room_listeners"]
        listeners.append(self.async_write_ha_state)
        self.async_on_remove(lambda: listeners.remove(self.async_write_ha_state))

    async def async_press(self):
        data = {"node_id": (self.coordinator.data or {}).get("node_id", ""), "room_id": self._room_id}
        if self._action == "end_room_call":
            session = self._rooms.current(self._room_id)
            if not session:
                return
            data["session_id"] = session["session_id"]
        await self.hass.services.async_call(DOMAIN, self._action, data, blocking=True, context=self._context)


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
