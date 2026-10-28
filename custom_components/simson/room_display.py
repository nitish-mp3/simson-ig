from copy import deepcopy
import re
import time


class SourceLease:
    def __init__(self, now=time.monotonic):
        self.now = now
        self.client_id = ""
        self.expires = 0

    def exchange(self, operation, client_id):
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", client_id):
            raise ValueError("A valid room station ID is required")
        if operation == "release":
            if self.client_id == client_id:
                self.client_id, self.expires = "", 0
            return {"owned": False}
        if self.client_id and self.client_id != client_id and self.expires > self.now():
            raise ValueError("Another browser is already armed for this room")
        self.client_id, self.expires = client_id, self.now() + 30
        return {"owned": True, "expires_in": 30}


def video_sdp(value):
    if (not isinstance(value, str) or len(value) > 100000 or not value.startswith("v=0")
            or not re.search(r"^m=video ", value, re.M) or re.search(r"^m=(?!video )", value, re.M)):
        raise ValueError("A video-only SDP is required; room displays cannot join call audio")
    return value


class DisplayChannel:
    def __init__(self, now=time.monotonic):
        self.now = now
        self.publisher = ""
        self.publisher_seen = 0
        self.viewers = {}

    def exchange(self, operation, client_id, viewer_id="", sdp="", generation=""):
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", client_id):
            raise ValueError("A valid display client ID is required")
        now = self.now()
        self.viewers = {key: value for key, value in self.viewers.items() if now - value["seen"] < 25}
        if operation == "viewer_poll":
            if client_id not in self.viewers and len(self.viewers) >= 4:
                raise ValueError("This room already has four active display viewers")
            viewer = self.viewers.setdefault(client_id, {"seen": now, "offer": "", "answer": "", "generation": ""})
            viewer["seen"] = now
            return {"offer": viewer["offer"], "generation": viewer["generation"]}
        if operation in ("publisher_poll", "offer"):
            if self.publisher and self.publisher != client_id and now - self.publisher_seen < 20:
                raise ValueError("Another source browser owns this room's screen relay")
            if self.publisher != client_id:
                self.publisher = client_id
                for viewer in self.viewers.values():
                    viewer.update(offer="", answer="", generation="")
            self.publisher_seen = now
            if operation == "publisher_poll":
                return {"viewers": [{"viewer_id": key, "answer": value["answer"], "generation": value["generation"]}
                    for key, value in self.viewers.items()]}
            viewer = self.viewers.get(viewer_id)
            if not viewer:
                raise ValueError("The selected room display has disconnected")
            viewer.update(offer=video_sdp(sdp), answer="", generation=client_id + ":" + str(now))
            return {"generation": viewer["generation"]}
        if operation == "answer":
            viewer = self.viewers.get(client_id)
            if not viewer or not viewer["offer"]:
                raise ValueError("No current display offer is available")
            if generation != viewer["generation"]:
                raise ValueError("Discard the answer for the previous room screen offer")
            viewer.update(answer=video_sdp(sdp), seen=now)
            return {}
        if operation == "viewer_leave":
            self.viewers.pop(client_id, None)
            return {}
        if operation == "viewer_ready":
            viewer = self.viewers.get(client_id)
            if not viewer or not viewer["answer"] or viewer["generation"] != generation:
                raise ValueError("Only the current answered display can report decoded video")
            viewer["seen"] = now
            return {"ready": True}
        if operation == "publisher_leave" and self.publisher == client_id:
            self.publisher = ""
            self.publisher_seen = 0
            for viewer in self.viewers.values():
                viewer.update(offer="", answer="", generation="")
            return {}
        raise ValueError("Unsupported room display operation")


async def setup_room_display(hass, owner):
    import voluptuous as vol
    from homeassistant.core import SupportsResponse
    from homeassistant.exceptions import HomeAssistantError
    from .rooms import native_sip_room, owns_native_room_call

    owner["room_display_channels"] = {}
    owner["room_source_leases"] = {}

    def selection(data):
        return next((value for value in hass.data["simson"].values() if isinstance(value, dict) and value.get("rooms")
            and (value["coordinator"].data or {}).get("node_id") == data["node_id"]), None)

    async def context(call):
        selected = selection(call.data)
        if not selected:
            raise HomeAssistantError("The room node is unavailable")
        user_id = call.context.user_id
        if not user_id:
            raise HomeAssistantError("Room media requires an authenticated browser")
        entries = getattr(hass, "config_entries", None)
        cast_user = bool(call.data.get("room_id") and entries and any(
            entry.data.get("user_id") == user_id for entry in entries.async_entries("cast")))
        rooms = selected["rooms"]
        chosen = next(((room_id, profile, rooms.current(room_id)) for room_id, profile in rooms.profiles.items()
            if (profile["room_user_id"] == user_id and not native_sip_room(profile) or
                native_sip_room(profile) and rooms.current(room_id) and rooms.current(room_id).get("target_user_id") == user_id or cast_user and profile.get("display_mode") == "cast"
                and profile.get("display_entity")) and rooms.current(room_id)
            and (not call.data.get("room_id") or room_id == call.data["room_id"])
            and (not call.data.get("call_id") or rooms.current(room_id).get("call_id") == call.data["call_id"] or
                native_sip_room(profile) and rooms.current(room_id).get("unconfirmed_call"))), None)
        if not chosen:
            return selected, None
        room_id, profile, session = chosen
        if session["state"] not in ("starting", "ringing", "connecting", "active", "degraded"):
            return selected, None
        if call.data.get("session_id") and session["session_id"] != call.data["session_id"]:
            raise HomeAssistantError("The previous room session has ended")
        calls = await selected["client"].calls()
        actual = next((item for item in calls.get("calls", []) if item.get("call_id") == session.get("call_id") or
            session.get("unconfirmed_call") and native_sip_room(profile) and owns_native_room_call(profile, session, item)), None)
        metadata = (actual or {}).get("metadata") or {}
        if not actual or actual.get("state") not in ("requesting", "ringing", "active") or (
                actual.get("caller_user_id") or metadata.get("caller_user_id")) != profile["room_user_id"] or (
                actual.get("target_user_id") or metadata.get("target_user_id")) != session["target_user_id"]:
            return selected, None
        if native_sip_room(profile):
            if call.data.get("call_id") and actual["call_id"] != call.data["call_id"]:
                return selected, None
            if not owns_native_room_call(profile, session, actual) or metadata.get("room_id") != room_id:
                return selected, None
            if not cast_user and (actual.get("state") != "active" or (actual.get("answered_by_user_id") or metadata.get("answered_by_user_id")) != user_id):
                return selected, None
        return selected, (room_id, profile, session, actual, cast_user)

    async def media(call):
        selected, chosen = await context(call)
        if not chosen:
            return {}
        room_id, profile, session, actual, cast_user = chosen
        result = {"room_id": room_id, "session_id": session["session_id"], "call_id": actual["call_id"],
            "media_role": "cast_viewer" if cast_user else "sip_caregiver" if native_sip_room(profile) else "source",
            "audio_mode": profile["audio_mode"], "video_mode": profile["video_mode"],
            "camera_entity": profile["camera_entity"] if profile["video_mode"] == "ha_camera" and not cast_user else "",
            "display_entity": profile["display_entity"], "display_mode": profile.get("display_mode", "adapter")}
        result["camera_fallback_entity"] = selected.get("room_cameras", {}).get(room_id, "") if not cast_user else ""
        if call.data.get("include_ice"):
            config = await selected["client"].webrtc_config()
            result["ice_servers"] = deepcopy(config.get("ice_servers", []))
        return result

    async def source_lease(call):
        selected = selection(call.data)
        profile = selected["rooms"].profiles.get(call.data["room_id"]) if selected else None
        if not profile or profile["room_user_id"] != call.context.user_id:
            raise HomeAssistantError("Only this room's signed-in user can arm its microphone station")
        if profile["audio_mode"] != "browser":
            raise HomeAssistantError("This room uses SIP audio; its browser microphone must stay off")
        lease = selected["room_source_leases"].setdefault(call.data["room_id"], SourceLease())
        try:
            result = lease.exchange(call.data["operation"], call.data["client_id"])
            result["current_session_id"] = (selected["rooms"].current(call.data["room_id"]) or {}).get("session_id", "")
            return result
        except ValueError as error:
            raise HomeAssistantError(str(error)) from error

    async def signal(call):
        selected, chosen = await context(call)
        if not chosen or chosen[3].get("state") != "active" or not chosen[1].get("display_entity"):
            raise HomeAssistantError("The room display is available only to its own active call")
        room_id, profile, session, actual, cast_user = chosen
        if cast_user and call.data["operation"] not in ("viewer_poll", "answer", "viewer_leave", "viewer_ready"):
            raise HomeAssistantError("Cast screens can only receive this room's video; publishing is not allowed")
        channels = selected["room_display_channels"]
        valid_sessions = {value["session_id"] for value in selected["rooms"].sessions.values()
            if value["state"] in ("starting", "ringing", "connecting", "active", "degraded")}
        for key in list(channels):
            if key not in valid_sessions:
                channels.pop(key)
        channel = channels.setdefault(session["session_id"], DisplayChannel())
        try:
            result = channel.exchange(call.data["operation"], call.data["client_id"], call.data.get("viewer_id", ""), call.data.get("sdp", ""), call.data.get("generation", ""))
            if call.data["operation"] == "viewer_ready":
                await selected["rooms"].report(room_id, session["session_id"], "display", "ready")
            return result
        except ValueError as error:
            raise HomeAssistantError(str(error)) from error

    common = {vol.Required("node_id"): str, vol.Optional("room_id"): str,
        vol.Optional("call_id"): str, vol.Optional("session_id"): str}
    if not hass.services.has_service("simson", "room_source_lease"):
        hass.services.async_register("simson", "room_source_lease", source_lease, schema=vol.Schema({
            vol.Required("node_id"): str, vol.Required("room_id"): str,
            vol.Required("operation"): vol.In(("claim", "release")), vol.Required("client_id"): str}),
            supports_response=SupportsResponse.OPTIONAL)
    if not hass.services.has_service("simson", "get_room_media"):
        hass.services.async_register("simson", "get_room_media", media, schema=vol.Schema({**common,
            vol.Optional("include_ice", default=False): bool}), supports_response=SupportsResponse.OPTIONAL)
        hass.services.async_register("simson", "room_display_signal", signal, schema=vol.Schema({**common,
            vol.Required("operation"): vol.In(("viewer_poll", "publisher_poll", "offer", "answer", "viewer_leave", "publisher_leave", "viewer_ready")),
            vol.Required("client_id"): str, vol.Optional("viewer_id"): str, vol.Optional("generation"): str,
            vol.Optional("sdp"): vol.All(str, vol.Length(max=100000))}), supports_response=SupportsResponse.OPTIONAL)
