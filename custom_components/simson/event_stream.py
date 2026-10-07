"""Core-side addon events, independent of the Supervisor reverse proxy."""

import asyncio
import hashlib
import json
import logging
import time

import aiohttp

LOGGER = logging.getLogger(__name__)
EVENT_TYPES = {
    "call_event": "simson_call_event",
    "call_status": "simson_call_status",
    "incoming_call": "simson_incoming_call",
    "webrtc_signal": "simson_webrtc_signal",
}


async def decode_events(content):
    lines = []
    size = 0
    async for raw in content:
        line = raw.decode("utf-8").rstrip("\r\n")
        if not line:
            if lines:
                try:
                    payload = json.loads("\n".join(lines))
                    if isinstance(payload, dict):
                        yield payload
                except (ValueError, TypeError):
                    pass
            lines, size = [], 0
        elif line.startswith("data:"):
            size += len(raw)
            if size > 262144:
                raise ValueError("Simson event exceeds stream size limit")
            lines.append(line[5:].lstrip(" "))


class EventRelay:
    def __init__(self, hass, coordinator):
        self.hass = hass
        self.coordinator = coordinator
        self.seen = {}

    def key(self, event_type, payload):
        metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
        identity = {key: payload.get(key) for key in (
            "call_id", "event", "status", "signal_type", "from_node_id", "target_user_id", "caller_user_id", "answered_by_user_id")}
        for key in ("target_user_id", "caller_user_id", "answered_by_user_id"):
            identity[key] = identity[key] or metadata.get(key)
        if event_type == "simson_webrtc_signal":
            identity["data"] = payload.get("data")
        return event_type + hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()

    def remember(self, event_type, payload):
        now = time.monotonic()
        self.seen = {key: stamp for key, stamp in self.seen.items() if now - stamp < 30}
        if len(self.seen) >= 512:
            self.seen.pop(next(iter(self.seen)))
        self.seen[self.key(event_type, payload)] = now

    def observe(self, event):
        node = (self.coordinator.data or {}).get("node_id")
        if event.data.get("node_id") == node:
            self.remember(event.event_type, event.data)

    def deliver(self, payload):
        event_type = EVENT_TYPES.get(payload.get("type"))
        node = (self.coordinator.data or {}).get("node_id")
        if not event_type or not node or not payload.get("call_id"):
            return
        if payload.get("node_id") and payload["node_id"] != node:
            return
        data = {key: value for key, value in payload.items() if key != "type"}
        data["node_id"] = node
        metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
        for field in ("target_user_id", "caller_user_id", "answered_by_user_id"):
            if not data.get(field) and metadata.get(field):
                data[field] = metadata[field]
        key = self.key(event_type, data)
        if key in self.seen and time.monotonic() - self.seen[key] < 30:
            return
        self.remember(event_type, data)
        self.hass.bus.async_fire(event_type, data)


def setup_event_stream(hass, entry, client, coordinator):
    from homeassistant.core import callback

    relay = EventRelay(hass, coordinator)

    @callback
    def observe(event):
        relay.observe(event)

    unsubs = [hass.bus.async_listen(event_type, observe) for event_type in EVENT_TYPES.values()]

    async def run():
        delay = 1
        warned = False
        try:
            while True:
                try:
                    timeout = aiohttp.ClientTimeout(total=None, connect=5, sock_read=45)
                    async with client._get_session().get(client._base + "/api/events", timeout=timeout) as response:
                        response.raise_for_status()
                        if response.content_type != "text/event-stream":
                            raise ValueError("Simson endpoint did not return an event stream")
                        validated = False
                        async for payload in decode_events(response.content):
                            if payload.get("type") == "init":
                                node = (coordinator.data or {}).get("node_id")
                                if not node or payload.get("node_id") != node:
                                    raise ValueError("Simson event stream node does not match this integration")
                                validated = True
                                delay = 1
                                warned = False
                            elif validated:
                                relay.deliver(payload)
                    hass.async_create_task(coordinator.async_request_refresh())
                except (aiohttp.ClientError, TimeoutError, ValueError, UnicodeError):
                    if not warned:
                        LOGGER.warning("Simson event stream unavailable; polling remains active")
                        warned = True
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        finally:
            for unsub in unsubs:
                unsub()

    task = hass.async_create_background_task(run(), "Simson addon event stream")
    entry.async_on_unload(task.cancel)
    return task
