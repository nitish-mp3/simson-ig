def directory_snapshot(users, states, calls, node_id):
    contacts = {state.attributes.get("user_id"): state.entity_id for state in states
        if state.attributes.get("simson_contact") and state.attributes.get("node_id") == node_id
        and not state.attributes.get("simson_call_button")}
    busy = set()
    for call in calls:
        if call.get("state") in ("requesting", "incoming", "ringing", "active"):
            metadata = call.get("metadata") or {}
            busy.update(call.get(key) or metadata.get(key) for key in ("caller_user_id", "target_user_id", "answered_by_user_id"))
    return [{"user_id": user.id, "user_name": user.name or "User", "entity_id": contacts.get(user.id, ""),
        "state": "busy" if user.id in busy else "ready"}
        for user in users if user.is_active and not user.system_generated]


def register_directory(hass):
    from aiohttp import web
    from homeassistant.components.http import HomeAssistantView
    from .client_selection import client_for_node

    class DirectoryView(HomeAssistantView):
        url = "/api/simson/users"
        name = "api:simson:users"
        requires_auth = True

        async def get(self, request):
            node = request.query.get("node_id", "")
            client = client_for_node(hass, None, node) if node else None
            if not client:
                return web.json_response({"error": "Choose an available Simson node"}, status=404)
            users = await hass.auth.async_get_users()
            calls = await client.calls()
            profiles = next((entry.get("video_profiles", {}) for entry in hass.data.get("simson", {}).values()
                if isinstance(entry, dict) and entry.get("client") is client), {})
            return web.json_response({"node_id": node, "users": directory_snapshot(users, hass.states.async_all("sensor"), calls.get("calls", []), node),
                "videophones": [{"extension": key, "label": profile.get("label", key)} for key, profile in profiles.items()]})

    if not hass.data.setdefault("simson_directory_registered", False):
        hass.http.register_view(DirectoryView())
        hass.data["simson_directory_registered"] = True
