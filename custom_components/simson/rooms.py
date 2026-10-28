import asyncio
from copy import deepcopy
import re
import time
from uuid import uuid4


ACTIVE_CALLS = {"requesting", "incoming", "ringing", "active"}
OPEN_SESSIONS = {"starting", "ringing", "connecting", "active", "degraded", "ending", "attention"}
COMPONENTS = ("audio", "video", "display")


def native_sip_room(profile):
    return profile.get("audio_mode") == "sip" and profile.get("video_mode") in ("none", "ha_camera") and not profile.get("start_script") and not profile.get("stop_script") and (not profile.get("display_entity") or profile.get("display_mode", "cast") == "cast")


def owns_native_room_call(profile, session, actual):
    metadata = (actual or {}).get("metadata") or {}
    return bool(native_sip_room(profile) and actual and actual.get("state") in ACTIVE_CALLS and
        (actual.get("caller_user_id") or metadata.get("caller_user_id")) == profile["room_user_id"] and
        (actual.get("target_user_id") or metadata.get("target_user_id")) == session.get("target_user_id") and
        metadata.get("room_session_id") == session.get("session_id") and
        metadata.get("source_extension") == profile.get("sip_extension") and metadata.get("media_mode") == "sip_room")


def session_snapshot(session):
    return deepcopy({key: value for key, value in session.items() if key != "recent_requests"}) if session else None


def room_profile(data):
    room_id = str(data.get("room_id", ""))
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", room_id):
        raise ValueError("Use a stable lowercase room_id, up to 64 characters")
    profile = {key: str(data.get(key) or "").strip() for key in (
        "label", "room_user_id", "caregiver_user_id", "sip_extension", "camera_entity",
        "display_entity", "start_script", "stop_script", "trigger_entity", "cast_dashboard", "cast_view")}
    profile["label"] = profile["label"][:100] or room_id
    if not profile["room_user_id"] or not profile["caregiver_user_id"]:
        raise ValueError("Select separate room and caregiver Home Assistant users")
    if profile["room_user_id"] == profile["caregiver_user_id"]:
        raise ValueError("Room and caregiver must be different users")
    profile["audio_mode"] = str(data.get("audio_mode", "browser"))
    profile["video_mode"] = str(data.get("video_mode", "none"))
    if profile["video_mode"] == "adapter" and profile["camera_entity"] and not profile["start_script"] and profile["audio_mode"] == "browser":
        profile["video_mode"] = "ha_camera"
    if profile["audio_mode"] not in ("browser", "sip") or profile["video_mode"] not in ("none", "browser", "ha_camera", "adapter"):
        raise ValueError("Choose a supported audio/video mode")
    profile["display_mode"] = str(data.get("display_mode") or ("adapter" if profile["start_script"] or profile["display_entity"].startswith("remote.") else "cast"))
    if profile["display_mode"] not in ("cast", "adapter"):
        raise ValueError("Choose built-in Cast or a custom display adapter")
    if profile["video_mode"] == "ha_camera" and not profile["camera_entity"]:
        raise ValueError("Choose the Home Assistant camera to send during room calls")
    for key in ("start_script", "stop_script"):
        if profile[key] and not re.fullmatch(r"script\.[a-z0-9_]+", profile[key]):
            raise ValueError("Adapters must reference Home Assistant script entities")
    if profile["audio_mode"] == "sip":
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", profile["sip_extension"]):
            raise ValueError("A SIP audio room needs a valid extension")
        if profile["video_mode"] == "browser":
            raise ValueError("Split SIP audio needs a video-only adapter, not a second browser audio call")
        if native_sip_room(profile) and not re.fullmatch(r"[0-9]{1,12}", profile["sip_extension"]):
            raise ValueError("Native SIP audio requires a numeric registered extension")
    profile["sip_auto_mode"] = str(data.get("sip_auto_mode", "speaker"))
    if profile["sip_auto_mode"] not in ("off", "answer", "speaker"):
        raise ValueError("Choose manual, auto-answer or speaker for SIP audio")
    if (profile["audio_mode"] == "sip" and not native_sip_room(profile) or profile["video_mode"] == "adapter" or profile["start_script"] or profile["stop_script"]
            or profile["display_entity"] and profile["display_mode"] == "adapter"):
        if not profile["start_script"] or not profile["stop_script"]:
            raise ValueError("Split-device rooms require both start and cleanup adapter scripts")
    if profile["display_entity"] and profile["display_mode"] == "cast":
        if not profile["display_entity"].startswith("media_player."):
            raise ValueError("Built-in Cast requires a media_player entity")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,100}", profile["cast_dashboard"] or "simson-room-screens"):
            raise ValueError("Choose a dashboard URL path, not a full address")
        profile["cast_dashboard"] = profile["cast_dashboard"] or "simson-room-screens"
        if profile["cast_view"] and not re.fullmatch(r"[A-Za-z0-9_-]{1,120}", profile["cast_view"]):
            raise ValueError("Choose a dashboard view path")
    if profile["camera_entity"] and not re.fullmatch(r"camera\.[a-z0-9_]+", profile["camera_entity"]):
        raise ValueError("camera_entity must be a camera entity, not a stream URL or password")
    if profile["display_entity"] and not re.fullmatch(r"(?:media_player|remote)\.[a-z0-9_]+", profile["display_entity"]):
        raise ValueError("display_entity must be a media_player or remote entity")
    if profile["trigger_entity"] and not re.fullmatch(r"(?:binary_sensor|input_boolean|input_button|button|event)\.[a-z0-9_]+", profile["trigger_entity"]):
        raise ValueError("Choose a panic sensor, helper, button or event entity")
    profile["trigger_enabled"] = bool(data.get("trigger_enabled", False))
    profile["trigger_mode"] = str(data.get("trigger_mode", "state"))
    profile["trigger_state"] = str(data.get("trigger_state", "on"))[:100]
    profile["trigger_cooldown_sec"] = int(data.get("trigger_cooldown_sec", 30))
    if profile["trigger_mode"] not in ("state", "press") or not 1 <= profile["trigger_cooldown_sec"] <= 3600:
        raise ValueError("Choose a valid trigger mode and a cooldown of 1–3600 seconds")
    if profile["trigger_enabled"] and not profile["trigger_entity"]:
        raise ValueError("Choose a trigger entity before enabling its room automation")
    if profile["trigger_mode"] == "press" and profile["trigger_entity"].split(".")[0] in ("binary_sensor", "input_boolean"):
        raise ValueError("Use a specific state for a binary panic device so releasing it cannot start a second call")
    profile["setup_timeout_sec"] = int(data.get("setup_timeout_sec", 60))
    profile["max_duration_sec"] = int(data.get("max_duration_sec", 3600))
    if not 15 <= profile["setup_timeout_sec"] <= 300 or not 60 <= profile["max_duration_sec"] <= 14400:
        raise ValueError("Setup timeout must be 15–300s and maximum duration 60–14400s")
    return room_id, profile


class RoomSessions:
    def __init__(self, profiles, sessions, save, emit, start_call, hangup, run_script, now=time.time, start_display=None, start_sip_call=None):
        self.profiles = profiles
        self.sessions = sessions
        self.save = save
        self.emit = emit
        self.start_call = start_call
        self.hangup = hangup
        self.run_script = run_script
        self.start_display = start_display
        self.start_sip_call = start_sip_call
        self.now = now
        self.lock = asyncio.Lock()
        self.operations = {}

    def current(self, room_id):
        return self.sessions.get(room_id)

    async def changed(self, room_id):
        await self.save()
        self.emit(room_id, session_snapshot(self.sessions.get(room_id)))

    def variables(self, room_id, session):
        return {**self.profiles[room_id], "room_id": room_id, "session_id": session["session_id"],
            "call_id": session.get("call_id", ""), "request_id": session["request_id"],
            "target_user_id": session["target_user_id"], "audio_policy": "sip_only" if
            self.profiles[room_id]["audio_mode"] == "sip" else "browser_only"}

    async def start(self, room_id, request_id, target_user_id, context):
        async with self.operations.setdefault(room_id, asyncio.Lock()):
            return await self._start(room_id, request_id, target_user_id, context)

    async def _start(self, room_id, request_id, target_user_id, context):
        async with self.lock:
            profile = self.profiles[room_id]
            previous = self.current(room_id)
            if previous and previous["request_id"] == request_id:
                if previous["target_user_id"] != target_user_id:
                    raise ValueError("A request_id cannot be reused for a different caregiver")
                return session_snapshot(previous)
            for receipt in (previous or {}).get("recent_requests", []):
                if receipt["request_id"] == request_id:
                    if receipt["target_user_id"] != target_user_id:
                        raise ValueError("A request_id cannot be reused for a different caregiver")
                    return deepcopy(receipt)
            if previous and previous["state"] in OPEN_SESSIONS:
                raise ValueError("This room already has a session; end it before starting another")
            for other_id, other in self.sessions.items():
                if other_id == room_id or other["state"] not in OPEN_SESSIONS:
                    continue
                other_profile = self.profiles[other_id]
                if (profile["room_user_id"] == other_profile["room_user_id"] or
                        profile["sip_extension"] and profile["sip_extension"] == other_profile["sip_extension"] or
                        profile["display_entity"] and profile["display_entity"] == other_profile["display_entity"]):
                    raise ValueError("This room shares an audio identity or display with a busy room")
            session = {"session_id": "room_" + uuid4().hex, "request_id": request_id,
                "target_user_id": target_user_id, "state": "starting", "call_id": "",
                "started_at": self.now(), "updated_at": self.now(), "reason": "",
                "components": {"audio": "pending", "video": "disabled" if profile["video_mode"] == "none" else "pending",
                    "display": "pending" if profile["display_entity"] else "disabled"}}
            receipts = list((previous or {}).get("recent_requests", []))
            if previous:
                receipts.append({key: previous[key] for key in ("session_id", "request_id", "target_user_id", "state", "call_id")})
            session["recent_requests"] = receipts[-64:]
            self.sessions[room_id] = session
            await self.changed(room_id)
        try:
            if profile["audio_mode"] == "browser" or native_sip_room(profile):
                session["unconfirmed_call"] = True
                await self.changed(room_id)
                if native_sip_room(profile):
                    if not self.start_sip_call:
                        raise ValueError("The native SIP room backend is unavailable")
                    result = await self.start_sip_call(profile, {"room_id": room_id, "session_id": session["session_id"], "request_id": request_id}, target_user_id, context)
                else:
                    result = await self.start_call(profile, target_user_id, context)
                if not result.get("call_id"):
                    raise ValueError("The call service did not return a call ID")
                session["call_id"] = result["call_id"]
                session["sip_bridge_id"] = result.get("sip_bridge_id", "")
                session["unconfirmed_call"] = False
                session["state"] = "ringing"
                await self.changed(room_id)
            if profile["start_script"]:
                await self.run_script(profile["start_script"], self.variables(room_id, session), context)
            elif profile["display_entity"] and profile.get("display_mode") == "cast" and self.start_display:
                try:
                    await self.start_display(profile, context)
                except Exception:
                    session["components"]["display"] = "failed"
                    session["reason"] = "The TV could not open its room view. Browser audio/video can continue."
                    self.update_state(session)
                    await self.changed(room_id)
        except Exception as error:
            known_id = (getattr(error, "payload", {}) or {}).get("call_id")
            if known_id:
                session["call_id"] = known_id
                session["unconfirmed_call"] = False
            session["state"] = "attention"
            session["cleanup_requested"] = True
            session["reason"] = "Setup failed or its result is uncertain. End this session before retrying."
            await self.changed(room_id)
            raise
        return session_snapshot(session)

    async def report(self, room_id, session_id, component, state):
        async with self.lock:
            session = self.current(room_id)
            if not session or session["session_id"] != session_id or session["state"] not in OPEN_SESSIONS:
                raise ValueError("This session has ended or was replaced; discard the stale acknowledgement")
            if session["state"] in ("ending", "attention") and state != "stopped":
                raise ValueError("End or recover this session before accepting readiness reports")
            if component not in COMPONENTS or state not in ("pending", "ready", "failed", "stopped"):
                raise ValueError("Report audio, video or display as pending, ready, failed or stopped")
            if session["components"][component] == "disabled":
                raise ValueError("This component is disabled for the room")
            session["components"][component] = state
            session["updated_at"] = self.now()
            self.update_state(session)
            await self.changed(room_id)

    def update_state(self, session):
        if session["state"] in ("ending", "attention"):
            return
        components = session["components"]
        if components["audio"] in ("failed", "stopped"):
            session["state"] = "attention"
        elif any(value in ("failed", "stopped") for value in components.values()):
            session["state"] = "degraded"
        elif session.get("call_active") and all(value in ("ready", "disabled") for value in components.values()):
            session["state"] = "active"
        elif session.get("call_active"):
            session["state"] = "connecting"

    async def bind(self, room_id, session_id, call_id):
        async with self.lock:
            session = self.current(room_id)
            if not session or session["session_id"] != session_id or session["state"] not in ("starting", "ringing", "connecting", "attention"):
                raise ValueError("Only a current starting session can bind a call")
            if session["call_id"] and session["call_id"] != call_id:
                raise ValueError("This session already owns another call")
            session["call_id"] = call_id
            session["unconfirmed_call"] = False
            session["state"] = "ringing"
            await self.changed(room_id)

    async def end(self, room_id, session_id, context):
        async with self.operations.setdefault(room_id, asyncio.Lock()):
            return await self._end(room_id, session_id, context)

    async def _end(self, room_id, session_id, context):
        async with self.lock:
            session = self.current(room_id)
            if not session or session["session_id"] != session_id:
                raise ValueError("Select the current session ID; an old screen cannot end a new call")
            if session["state"] == "ended":
                return session_snapshot(session)
            session["state"] = "ending"
            session["cleanup_requested"] = True
            await self.changed(room_id)
        errors = []
        if session.get("unconfirmed_call"):
            errors.append("Call creation is uncertain; bind its exact live call ID or wait for reconciliation to confirm no call exists")
        if session["call_id"]:
            try:
                await self.hangup(session["call_id"])
            except Exception:
                errors.append("The exact call could not be released")
        script = self.profiles[room_id]["stop_script"]
        if script:
            try:
                await self.run_script(script, self.variables(room_id, session), context)
            except Exception:
                errors.append("The room cleanup adapter failed")
            required = {"display"} if self.profiles[room_id]["display_entity"] and self.profiles[room_id].get("display_mode", "adapter") == "adapter" else set()
            if self.profiles[room_id]["audio_mode"] == "sip":
                required.add("audio")
            if self.profiles[room_id]["video_mode"] == "adapter":
                required.add("video")
            if any(session["components"][key] != "stopped" for key in required):
                errors.append("Cleanup adapter must acknowledge stopped components")
        session["state"] = "attention" if errors else "ended"
        session["cleanup_requested"] = bool(errors)
        session["reason"] = "; ".join(errors)
        session["updated_at"] = self.now()
        session["cleanup_attempts"] = session.get("cleanup_attempts", 0) + 1 if errors else 0
        session["cleanup_retry_at"] = self.now() + min(300, 5 * 2 ** min(session["cleanup_attempts"], 6)) if errors else 0
        if not errors:
            session["components"] = {key: "stopped" if value != "disabled" else value
                for key, value in session["components"].items()}
        await self.changed(room_id)
        return session_snapshot(session)

    async def reconcile(self, calls):
        indexed = {call["call_id"]: call for call in calls if call.get("call_id")}
        for room_id, session in list(self.sessions.items()):
            if session["state"] not in OPEN_SESSIONS:
                continue
            profile = self.profiles[room_id]
            if session.get("unconfirmed_call") and native_sip_room(profile):
                matches = [item for item in calls if owns_native_room_call(profile, session, item)]
                if len(matches) == 1:
                    session["call_id"] = matches[0]["call_id"]
                    session["unconfirmed_call"] = False
                    await self.changed(room_id)
            call = indexed.get(session["call_id"])
            age = self.now() - session["started_at"]
            if session.get("unconfirmed_call") and age > 30:
                matching = any(item.get("state") in ACTIVE_CALLS and profile["room_user_id"] in (
                    item.get("caller_user_id") or (item.get("metadata") or {}).get("caller_user_id"),
                    item.get("target_user_id") or (item.get("metadata") or {}).get("target_user_id")) for item in calls)
                session["empty_observations"] = 0 if matching else session.get("empty_observations", 0) + 1
                if session["empty_observations"] >= 2:
                    session["unconfirmed_call"] = False
                    await self.changed(room_id)
            if session.get("cleanup_retry_at", 0) > self.now():
                continue
            if (age >= profile["max_duration_sec"] or (call and call.get("state") not in ACTIVE_CALLS)
                    or session.get("cleanup_requested") or session["components"]["audio"] in ("failed", "stopped")):
                await self.end(room_id, session["session_id"], None)
            elif session["state"] == "ending":
                continue
            elif session["call_id"] and not call:
                if self.now() - session.get("last_seen_at", session["started_at"]) > 20:
                    await self.end(room_id, session["session_id"], None)
            elif call:
                session["last_seen_at"] = self.now()
                session["call_active"] = call.get("state") == "active"
                before = session["state"]
                self.update_state(session)
                if before != session["state"]:
                    await self.changed(room_id)
            if age > profile["setup_timeout_sec"] and session["state"] in ("starting", "ringing", "connecting", "degraded"):
                if session.get("call_active") and session["components"]["audio"] == "ready":
                    if session["state"] == "degraded":
                        continue
                    session["components"] = {key: "failed" if value == "pending" else value
                        for key, value in session["components"].items()}
                    session["reason"] = "Video or display setup timed out; audio remains connected"
                    self.update_state(session)
                    await self.changed(room_id)
                else:
                    if native_sip_room(profile) and session.get("call_active"):
                        session["state"] = "degraded"
                        session["reason"] = "SIP call remains active, but two-way audio is not verified. Check handset microphone and caregiver sound permissions; maximum duration still applies."
                        await self.changed(room_id)
                    else:
                        session["reason"] = "Room setup timed out; cleanup requested"
                        await self.end(room_id, session["session_id"], None)


async def setup_rooms(hass, entry):
    from homeassistant.core import SupportsResponse
    from homeassistant.exceptions import HomeAssistantError
    from homeassistant.helpers.storage import Store
    from .user_calls import start_user_call_data
    from .room_triggers import setup_room_triggers
    from .room_display import setup_room_display
    import voluptuous as vol

    owner = hass.data["simson"][entry.entry_id]
    store = Store(hass, 1, "simson_rooms_" + entry.entry_id)
    saved = await store.async_load() or {}
    profiles = saved.get("profiles", {})
    sessions = saved.get("sessions", {})
    persistence_lock = asyncio.Lock()

    async def save():
        async with persistence_lock:
            await store.async_save(deepcopy({"profiles": manager.profiles, "sessions": manager.sessions}))

    def emit(room_id, session):
        hass.bus.async_fire("simson_room_changed", {"entry_id": entry.entry_id,
            "room_id": room_id, "session": session})
        for listener in tuple(owner.get("room_listeners", [])):
            listener()

    async def start(profile, target_id, context):
        node_id = (owner["coordinator"].data or {}).get("node_id", "")
        data = {"node_id": node_id, "target_user_id": target_id,
            "caller_user_id": profile["room_user_id"], "call_type": "video" if profile["video_mode"] in ("browser", "ha_camera") else "voice"}
        return await start_user_call_data(hass, data)

    async def hangup(call_id):
        calls = await owner["client"].calls()
        if any(call.get("call_id") == call_id and call.get("state") in ACTIVE_CALLS for call in calls.get("calls", [])):
            await owner["client"].hangup_call(call_id, strict_call_id=True)

    async def start_sip(profile, identity, target_id, context):
        if not (await owner["client"].room_capabilities()).get("native_sip_rooms"):
            raise ValueError("The addon/VPS native SIP room update is unavailable")
        caller = await hass.auth.async_get_user(profile["room_user_id"])
        target = await hass.auth.async_get_user(target_id)
        if not caller or not target or not caller.is_active or not target.is_active or caller.system_generated or target.system_generated:
            raise ValueError("Room users must be active Home Assistant users")
        calls = await owner["client"].calls()
        for actual in calls.get("calls", []):
            metadata = actual.get("metadata") or {}
            if actual.get("state") in ACTIVE_CALLS and {profile["room_user_id"], target_id} & {actual.get(key) or metadata.get(key) for key in ("caller_user_id", "target_user_id", "answered_by_user_id")}:
                raise ValueError("A room participant already has a call")
        return await owner["client"].start_room_sip_call(profile, identity, {"node_id": (owner["coordinator"].data or {}).get("node_id", ""), "user_id": target_id, "caller_name": caller.name or profile["label"]})

    async def script(entity_id, variables, context):
        async with asyncio.timeout(20):
            await hass.services.async_call("script", entity_id.split(".", 1)[1],
                {**variables, "node_id": (owner["coordinator"].data or {}).get("node_id", "")},
                blocking=True, context=context)

    async def cast_display(profile, context):
        async with asyncio.timeout(15):
            await hass.services.async_call("cast", "show_lovelace_view", {
                "entity_id": profile["display_entity"], "dashboard_path": profile["cast_dashboard"],
                "view_path": profile["cast_view"]}, blocking=True)

    manager = RoomSessions(profiles, sessions, save, emit, start, hangup, script, start_display=cast_display, start_sip_call=start_sip)
    owner["rooms"] = manager
    owner["room_listeners"] = []
    setup_room_triggers(hass, entry, owner)
    await setup_room_display(hass, owner)
    for session in sessions.values():
        if session["state"] in OPEN_SESSIONS:
            session["state"] = "attention"
            session["reason"] = "Home Assistant restarted. Verify and end the previous session before starting another."

    def selected(data):
        return next((value for value in hass.data["simson"].values() if isinstance(value, dict) and value.get("rooms")
            and (value["coordinator"].data or {}).get("node_id") == data["node_id"]), None)

    async def authorize(call, profile=None, admin=False, selected_owner=None):
        user = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        if not call.context.user_id and not admin:
            return
        if not user or not user.is_active or user.system_generated:
            raise HomeAssistantError("A signed-in user or trusted automation is required")
        if call.service == "report_room_component" and profile and native_sip_room(profile) and selected_owner:
            session = selected_owner["rooms"].current(call.data["room_id"]) or {}
            if user.id == session.get("target_user_id") and call.data.get("session_id") == session.get("session_id"):
                calls = await selected_owner["client"].calls()
                actual = next((item for item in calls.get("calls", []) if item.get("call_id") == session.get("call_id")), None)
                metadata = (actual or {}).get("metadata") or {}
                if owns_native_room_call(profile, session, actual) and actual.get("state") == "active" and (actual.get("answered_by_user_id") or metadata.get("answered_by_user_id")) == user.id and call.data.get("component") in ("audio", "video"):
                    return
        if user.is_admin:
            return
        if admin or not profile or user.id != profile["room_user_id"]:
            raise HomeAssistantError("Only the room user or an administrator can control this room")

    async def handle(call):
        selected_owner = selected(call.data)
        if not selected_owner:
            raise HomeAssistantError("Choose an available Simson node")
        rooms = selected_owner["rooms"]
        room_id = call.data.get("room_id", "")
        profile = rooms.profiles.get(room_id)
        try:
            if call.service == "configure_room":
                await authorize(call, admin=True)
                async with rooms.lock:
                    profile = rooms.profiles.get(room_id)
                    previous_profile = deepcopy(profile or {})
                    if call.data.get("expected_revision") is not None and call.data["expected_revision"] != (profile or {}).get("revision", 0):
                        raise ValueError("This room was changed in another window. Reload it before saving.")
                    current = rooms.current(room_id)
                    if current and current["state"] in OPEN_SESSIONS:
                        raise ValueError("End the room session before changing its device bindings")
                    if call.data.get("remove"):
                        rooms.profiles.pop(room_id, None)
                        rooms.sessions.pop(room_id, None)
                    else:
                        revision = (profile or {}).get("revision", 0) + 1
                        room_id, profile = room_profile(call.data)
                        if native_sip_room(profile) and not (await selected_owner["client"].room_capabilities()).get("native_sip_rooms"):
                            raise ValueError("The addon/VPS native SIP room update must be installed before selecting this mode")
                        profile["revision"] = revision
                        if profile["display_entity"] and profile["display_mode"] == "cast" and not profile["cast_view"]:
                            from hashlib import sha256
                            profile["cast_view"] = "room-" + sha256(f"{call.data['node_id']}:{room_id}".encode()).hexdigest()[:20]
                        for user_id in (profile["room_user_id"], profile["caregiver_user_id"]):
                            user = await hass.auth.async_get_user(user_id)
                            if not user or not user.is_active or user.system_generated:
                                raise ValueError("Select active non-system Home Assistant users")
                        for key in ("camera_entity", "display_entity", "start_script", "stop_script", "trigger_entity"):
                            if profile[key] and hass.states.get(profile[key]) is None:
                                raise ValueError(f"The configured {key} does not exist")
                        trigger = hass.states.get(profile["trigger_entity"]) if profile["trigger_entity"] else None
                        if trigger and any(trigger.attributes.get(key) for key in ("simson_room_button", "simson_call_button")):
                            raise ValueError("Choose the physical panic device, not a Simson call button that would trigger itself")
                        camera = hass.states.get(profile["camera_entity"]) if profile["camera_entity"] else None
                        if camera and camera.attributes.get("simson_room_camera"):
                            raise ValueError("Choose the original camera, not another room's video relay")
                        rooms.profiles[room_id] = profile
                    await rooms.changed(room_id)
                    current_profile = rooms.profiles.get(room_id, {})
                    hass.bus.async_fire("simson_room_configuration_changed", {
                        "node_id": call.data["node_id"], "room_id": room_id,
                        "operation": "removed" if call.data.get("remove") else "updated" if previous_profile else "created",
                        "actor_user_id": call.context.user_id, "revision": current_profile.get("revision", 0),
                        "changed_fields": sorted(key for key in previous_profile.keys() | current_profile.keys()
                            if key != "revision" and previous_profile.get(key) != current_profile.get(key))}, context=call.context)
                return {"room_id": room_id}
            if not profile:
                raise ValueError("Configure this room first")
            await authorize(call, profile, selected_owner=selected_owner)
            if call.service == "start_room_call":
                target = call.data.get("target_user_id") or profile["caregiver_user_id"]
                user = await hass.auth.async_get_user(target)
                if not user or not user.is_active or user.system_generated or target == profile["room_user_id"]:
                    raise ValueError("Choose an active caregiver other than the room user")
                return await rooms.start(room_id, call.data.get("request_id") or uuid4().hex, target, call.context)
            if call.service == "end_room_call":
                return await rooms.end(room_id, call.data["session_id"], call.context)
            if call.service == "report_room_component":
                await rooms.report(room_id, call.data["session_id"], call.data["component"], call.data["state"])
            if call.service == "bind_room_call":
                calls = await selected_owner["client"].calls()
                actual = next((item for item in calls.get("calls", []) if item.get("call_id") == call.data["call_id"]), None)
                metadata = (actual or {}).get("metadata") or {}
                session = rooms.current(room_id) or {}
                if not actual or actual.get("state") not in ACTIVE_CALLS or (
                        actual.get("caller_user_id") or metadata.get("caller_user_id")) != profile["room_user_id"] or (
                        actual.get("target_user_id") or metadata.get("target_user_id")) != session.get("target_user_id"):
                    raise ValueError("Bind only a live call owned by the room's user identity and selected caregiver")
                await rooms.bind(room_id, call.data["session_id"], call.data["call_id"])
            return session_snapshot(rooms.current(room_id))
        except (ValueError, KeyError) as error:
            raise HomeAssistantError(str(error)) from error

    base = {vol.Required("node_id"): str, vol.Required("room_id"): str}
    schemas = {
        "configure_room": {**base, **{vol.Optional(key): str for key in (
            "label", "room_user_id", "caregiver_user_id", "audio_mode", "video_mode", "sip_extension",
            "camera_entity", "display_entity", "start_script", "stop_script", "trigger_entity", "trigger_mode", "trigger_state",
            "display_mode", "cast_dashboard", "cast_view", "sip_auto_mode")},
            vol.Optional("trigger_enabled"): bool,
            vol.Optional("trigger_cooldown_sec"): vol.All(vol.Coerce(int), vol.Range(min=1, max=3600)),
            vol.Optional("expected_revision"): vol.All(vol.Coerce(int), vol.Range(min=0)),
            vol.Optional("setup_timeout_sec"): vol.All(vol.Coerce(int), vol.Range(min=15, max=300)),
            vol.Optional("max_duration_sec"): vol.All(vol.Coerce(int), vol.Range(min=60, max=14400)),
            vol.Optional("remove", default=False): bool},
        "start_room_call": {**base, vol.Optional("request_id"): vol.All(str, vol.Length(min=1, max=128)),
            vol.Optional("target_user_id"): str},
        "end_room_call": {**base, vol.Required("session_id"): str},
        "report_room_component": {**base, vol.Required("session_id"): str,
            vol.Required("component"): vol.In(COMPONENTS),
            vol.Required("state"): vol.In(("pending", "ready", "failed", "stopped"))},
        "bind_room_call": {**base, vol.Required("session_id"): str, vol.Required("call_id"): str},
    }
    for name, schema in schemas.items():
        if not hass.services.has_service("simson", name):
            hass.services.async_register("simson", name, handle, schema=vol.Schema(schema), supports_response=SupportsResponse.OPTIONAL)

    async def configuration(call):
        await authorize(call, admin=True)
        users = await hass.auth.async_get_users()
        nodes = []
        for value in hass.data["simson"].values():
            if not isinstance(value, dict) or not value.get("rooms"):
                continue
            data = value["coordinator"].data or {}
            nodes.append({"node_id": data.get("node_id", ""), "label": data.get("node_label") or data.get("node_id", ""),
                "connected": bool(data.get("vps_connected")), "rooms": [
                    {"room_id": room_id, **deepcopy(profile), "session": session_snapshot(value["rooms"].current(room_id))}
                    for room_id, profile in value["rooms"].profiles.items()]})
        for node in nodes:
            selected_owner = selected({"node_id": node["node_id"]})
            try:
                node["native_sip_rooms"] = bool((await selected_owner["client"].room_capabilities()).get("native_sip_rooms"))
            except Exception:
                node["native_sip_rooms"] = False
        return {"capabilities": {"ha_camera": True, "cast_display": True, "native_sip_room_profiles": True}, "nodes": nodes, "users": [{"user_id": user.id, "label": user.name or "User"}
            for user in users if user.is_active and not user.system_generated]}

    if not hass.services.has_service("simson", "get_room_configuration"):
        hass.services.async_register("simson", "get_room_configuration", configuration, schema=vol.Schema({}), supports_response=SupportsResponse.OPTIONAL)

    reconciling = False

    async def reconcile():
        nonlocal reconciling
        if reconciling or not owner["coordinator"].last_update_success:
            return
        reconciling = True
        try:
            await manager.reconcile((owner["coordinator"].data or {}).get("calls_data", {}).get("calls", []))
        finally:
            reconciling = False

    def refresh():
        entry.async_create_background_task(hass, reconcile(), "Simson room reconciliation")

    entry.async_on_unload(owner["coordinator"].async_add_listener(refresh))
