from hashlib import sha256

from homeassistant.components.camera import Camera, CameraEntityFeature, async_get_image, async_get_stream_source

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    owner = hass.data[DOMAIN][entry.entry_id]
    owner["room_cameras"] = {}
    known = set()

    def discover():
        entities = []
        for room_id, profile in owner["rooms"].profiles.items():
            if room_id not in known and profile["video_mode"] == "ha_camera":
                known.add(room_id)
                entities.append(RoomCamera(owner, entry.entry_id, room_id))
        if entities:
            async_add_entities(entities)

    owner["room_listeners"].append(discover)
    entry.async_on_unload(lambda: owner["room_listeners"].remove(discover))
    discover()


class RoomCamera(Camera):
    _attr_should_poll = False
    _attr_supported_features = CameraEntityFeature.STREAM
    _attr_extra_state_attributes = {"simson_room_camera": True}

    def __init__(self, owner, entry_id, room_id):
        super().__init__()
        self.owner = owner
        self.room_id = room_id
        identifier = sha256((entry_id + ":" + room_id).encode()).hexdigest()[:20]
        self._attr_unique_id = "simson_room_camera_" + identifier
        self._attr_name = "Simson room video " + room_id

    @property
    def source_entity(self):
        profile = self.owner["rooms"].profiles.get(self.room_id, {})
        return profile.get("camera_entity", "") if profile.get("video_mode") == "ha_camera" else ""

    @property
    def available(self):
        state = self.hass.states.get(self.source_entity)
        return bool(state and state.state not in ("unknown", "unavailable"))

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.owner["room_cameras"][self.room_id] = self.entity_id
        self.owner["room_listeners"].append(self.async_write_ha_state)
        self.async_on_remove(lambda: self.owner["room_listeners"].remove(self.async_write_ha_state))
        self.async_on_remove(lambda: self.owner["room_cameras"].pop(self.room_id, None))

    async def stream_source(self):
        if not self.source_entity or self.source_entity == self.entity_id:
            return None
        return await async_get_stream_source(self.hass, self.source_entity)

    async def async_camera_image(self, width=None, height=None):
        if not self.source_entity or self.source_entity == self.entity_id:
            return None
        image = await async_get_image(self.hass, self.source_entity, width=width, height=height)
        return image.content
