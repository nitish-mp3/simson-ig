"""Authorized video-only go2rtc signaling for a configured SIP videophone."""

import asyncio
import re
from urllib.parse import urlsplit

import aiohttp

from .call_access import can_control_call


def validated_profile(data):
    extension = str(data.get("extension", "")).strip()
    stream = str(data.get("stream_name", "")).strip()
    bridge = str(data.get("bridge_url") or "http://127.0.0.1:1984").rstrip("/")
    location = urlsplit(bridge)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", extension) or not re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", stream):
        raise ValueError("Choose a SIP extension and a named go2rtc stream, not an RTSP URL")
    if (location.scheme not in ("http", "https") or not location.hostname or location.username or location.password
            or location.query or location.fragment or location.path):
        raise ValueError("Bridge URL must be an HTTP(S) origin without credentials or a path")
    return extension, {"stream_name": stream, "bridge_url": bridge, "label": str(data.get("label") or extension)[:100],
        "username": str(data.get("bridge_username") or ""), "password": str(data.get("bridge_password") or "")}


def may_view_call(call, user_id, extension):
    if not call or call.get("state") != "active" or not can_control_call(call, user_id, "signal"):
        return False
    metadata = call.get("metadata") or {}
    return any(str(source.get(key) or "").removeprefix("sip:") == extension
        for source in (call, metadata) for key in ("remote_node_id", "target_extension", "source_extension", "sip_extension", "extension"))


async def exchange_offer(session, profile, offer):
    auth = aiohttp.BasicAuth(profile["username"], profile["password"]) if profile.get("username") else None
    async with session.post(profile["bridge_url"] + "/api/webrtc", params={"src": profile["stream_name"]},
            json={"type": "offer", "sdp": offer}, auth=auth, allow_redirects=False,
            timeout=aiohttp.ClientTimeout(total=12)) as response:
        if response.status not in (200, 201):
            raise ValueError("The video bridge rejected the stream offer. Check the named stream and bridge authentication.")
        raw = await response.content.read(131073)
        if len(raw) > 131072:
            raise ValueError("Video answer exceeds the supported size")
        if response.content_type == "application/json":
            import json
            answer = json.loads(raw).get("sdp", "")
        else:
            answer = raw.decode("utf-8")
        if not isinstance(answer, str) or not answer.startswith("v=0") or "m=video" not in answer:
            raise ValueError("The video bridge did not return a video SDP answer")
        return answer


async def setup_videophones(hass, entry):
    from aiohttp import web
    from homeassistant.components.http import HomeAssistantView
    from homeassistant.exceptions import HomeAssistantError
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    from homeassistant.helpers.storage import Store
    import voluptuous as vol

    owner = hass.data["simson"][entry.entry_id]
    store = Store(hass, 1, "simson_videophones_" + entry.entry_id)
    saved = await store.async_load()
    owner["video_profiles"] = saved if isinstance(saved, dict) else {}
    owner["video_store"] = store
    owner["video_slots"] = asyncio.Semaphore(4)

    async def configure(call):
        actor = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        if not actor or not actor.is_admin:
            raise HomeAssistantError("Only a signed-in administrator can configure videophones")
        selected = next((data for data in hass.data["simson"].values() if isinstance(data, dict) and data.get("coordinator")
            and (data["coordinator"].data or {}).get("node_id") == call.data["node_id"]), None)
        if not selected:
            raise HomeAssistantError("Choose an available Simson node")
        profiles = dict(selected.get("video_profiles", {}))
        if call.data.get("remove"):
            profiles.pop(call.data["extension"], None)
        else:
            try:
                extension, profile = validated_profile(call.data)
            except ValueError as error:
                raise HomeAssistantError(str(error)) from error
            profiles[extension] = profile
        await selected["video_store"].async_save(profiles)
        selected["video_profiles"] = profiles

    if not hass.services.has_service("simson", "configure_videophone"):
        hass.services.async_register("simson", "configure_videophone", configure, schema=vol.Schema({
            vol.Required("node_id"): str, vol.Required("extension"): str,
            vol.Optional("stream_name", default=""): str, vol.Optional("bridge_url", default="http://127.0.0.1:1984"): str,
            vol.Optional("label", default=""): str, vol.Optional("bridge_username", default=""): str,
            vol.Optional("bridge_password", default=""): str, vol.Optional("remove", default=False): bool}))

    class VideoOfferView(HomeAssistantView):
        url = "/api/simson/video/offer"
        name = "api:simson:video-offer"
        requires_auth = True

        async def post(self, request):
            if request.content_length is not None and request.content_length > 131072:
                raise web.HTTPRequestEntityTooLarge(max_size=131072, actual_size=request.content_length)
            body = await request.json()
            if not isinstance(body, dict):
                raise web.HTTPBadRequest(text="A video offer is required")
            offer = body.get("sdp", "")
            if (not isinstance(offer, str) or len(offer) > 100000 or not offer.startswith("v=0")
                    or not re.search(r"^m=video ", offer, re.M) or re.search(r"^m=(?!video )", offer, re.M)):
                raise web.HTTPBadRequest(text="Provide a video-only SDP offer")
            selected = next((data for data in hass.data["simson"].values() if isinstance(data, dict) and data.get("coordinator")
                and (data["coordinator"].data or {}).get("node_id") == body.get("node_id")), None)
            extension = str(body.get("extension", ""))
            if not selected or extension not in selected.get("video_profiles", {}):
                raise web.HTTPNotFound(text="No linked video source is configured for this extension")
            user = request.get("hass_user")
            calls = await selected["client"].calls()
            call = next((item for item in calls.get("calls", []) if item.get("call_id") == body.get("call_id")), None)
            if not user or not may_view_call(call, user.id, extension):
                raise web.HTTPForbidden(text="Video is available only to a participant of this active call")
            try:
                async with asyncio.timeout(14):
                    async with selected["video_slots"]:
                        answer = await exchange_offer(async_get_clientsession(hass), selected["video_profiles"][extension], offer)
                latest = await selected["client"].calls()
                current = next((item for item in latest.get("calls", []) if item.get("call_id") == body.get("call_id")), None)
                if not may_view_call(current, user.id, extension):
                    raise web.HTTPForbidden(text="This call ended while video was connecting")
                return web.json_response({"type": "answer", "sdp": answer})
            except (aiohttp.ClientError, TimeoutError, ValueError):
                return web.json_response({"error": "Video bridge unavailable. Check its named RTSP stream, H.264 codec and network connectivity."}, status=502)

    if not hass.data.get("simson_video_registered"):
        hass.http.register_view(VideoOfferView())
        hass.data["simson_video_registered"] = True
