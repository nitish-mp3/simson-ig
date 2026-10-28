import time
from datetime import datetime


class RoomTriggers:
    def __init__(self, profiles, start, emit, now=time.monotonic):
        self.profiles = profiles
        self.start = start
        self.emit = emit
        self.now = now
        self.last = {}
        self.bindings = {}
        self.pending = {}
        self.refresh()

    def refresh(self):
        self.bindings = {}
        for room_id, profile in self.profiles.items():
            if profile.get("trigger_entity") and profile.get("trigger_enabled", False):
                self.bindings.setdefault(profile["trigger_entity"], []).append(room_id)

    async def handle(self, event):
        entity_id = event.data.get("entity_id")
        rooms = tuple(self.bindings.get(entity_id, []))
        before, after = event.data.get("old_state"), event.data.get("new_state")
        if not rooms or not before or not after or after.state in ("unknown", "unavailable"):
            return
        if getattr(after, "attributes", {}).get("restored"):
            return
        if before.state == after.state:
            return
        for room_id in rooms:
            profile = self.profiles.get(room_id, {})
            if not profile.get("trigger_enabled") or profile.get("trigger_entity") != entity_id:
                continue
            if before.state in ("unknown", "unavailable"):
                if before.state == "unavailable" or profile.get("trigger_mode", "state") != "press":
                    continue
                try:
                    pressed = datetime.fromisoformat(after.state.replace("Z", "+00:00")).timestamp()
                    if abs(time.time() - pressed) > 10:
                        continue
                except (ValueError, OverflowError):
                    continue
            if profile.get("trigger_mode", "state") == "state" and after.state != profile.get("trigger_state", "on"):
                continue
            now = self.now()
            if now - self.last.get(room_id, float("-inf")) < profile.get("trigger_cooldown_sec", 30):
                continue
            self.last[room_id] = now
            request_id = f"{event.context.id}:{after.last_changed.isoformat()}"[:128]
            payload = {"room_id": room_id, "entity_id": entity_id, "request_id": request_id}
            self.pending[(room_id, request_id)] = (dict(payload), dict(profile), now)
            while len(self.pending) > 256:
                self.pending.pop(next(iter(self.pending)))
            self.emit("simson_room_triggered", payload)

    async def consume(self, event):
        payload = event.data
        key = (payload.get("room_id"), payload.get("request_id"))
        receipt = self.pending.get(key)
        if not receipt or any(payload.get(field) != receipt[0][field] for field in receipt[0]):
            return
        self.pending.pop(key)
        room_id, request_id = key
        profile = self.profiles.get(room_id, {})
        if profile != receipt[1] or not profile.get("trigger_enabled") or self.now() - receipt[2] > 30:
            return
        try:
            await self.start(room_id, request_id)
        except Exception:
            self.emit("simson_room_trigger_failed", {**receipt[0], "reason": "Room call could not start; check room status. The independent caregiver alert should still run."})


def setup_room_triggers(hass, entry, owner):
    async def start(room_id, request_id):
        await hass.services.async_call("simson", "start_room_call", {
            "node_id": (owner["coordinator"].data or {}).get("node_id", ""),
            "room_id": room_id, "request_id": request_id}, blocking=True)

    def emit(name, payload):
        hass.bus.async_fire(name, {**payload, "node_id": (owner["coordinator"].data or {}).get("node_id", "")})

    triggers = RoomTriggers(owner["rooms"].profiles, start, emit)

    async def handle(event):
        entity_id = event.data.get("entity_id", "")
        manual_press = entity_id.split(".", 1)[0] in ("input_button", "button") and bool(getattr(event.context, "user_id", None))
        if hass.is_running or manual_press:
            await triggers.handle(event)

    async def consume(event):
        if event.data.get("node_id") == (owner["coordinator"].data or {}).get("node_id"):
            await triggers.consume(event)

    owner["room_listeners"].append(triggers.refresh)
    entry.async_on_unload(lambda: owner["room_listeners"].remove(triggers.refresh))
    entry.async_on_unload(hass.bus.async_listen("state_changed", handle))
    entry.async_on_unload(hass.bus.async_listen("simson_room_triggered", consume))
