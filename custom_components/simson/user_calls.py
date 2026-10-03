import asyncio


async def start_user_call(hass, call):
    from homeassistant.exceptions import HomeAssistantError

    entity = hass.states.get(call.data["entity_id"])
    if not entity or not entity.attributes.get("simson_contact"):
        raise HomeAssistantError("Choose a Simson user contact")
    owner = hass.data.get("simson", {}).get(entity.attributes.get("entry_id"), {})
    client = owner.get("client")
    node_id = entity.attributes.get("node_id")
    if not client or not node_id:
        raise HomeAssistantError("This contact's node is unavailable")
    caller_id = call.context.user_id or call.data.get("caller_user_id", "")
    target_id = entity.attributes.get("user_id")
    if not caller_id:
        raise HomeAssistantError("An unattended script must provide caller_user_id")
    caller = await hass.auth.async_get_user(caller_id)
    target = await hass.auth.async_get_user(target_id)
    if not caller or not caller.is_active or caller.system_generated:
        raise HomeAssistantError("The caller is unavailable")
    if not target or not target.is_active or target.system_generated:
        raise HomeAssistantError("The selected user is no longer available")
    if caller_id == target_id:
        raise HomeAssistantError("Choose another user; you cannot call yourself")
    lock = owner.setdefault("user_call_lock", asyncio.Lock())
    async with lock:
        current = await client.calls()
        for active in current.get("calls", []):
            if active.get("state") not in ("requesting", "incoming", "ringing", "active"):
                continue
            metadata = active.get("metadata") or {}
            participants = {active.get(key) or metadata.get(key)
                for key in ("caller_user_id", "target_user_id", "answered_by_user_id")}
            if caller_id in participants:
                raise HomeAssistantError("You already have a call in progress")
            if target_id in participants:
                raise HomeAssistantError(f"{target.name or 'This user'} is already in a call")
        result = await client.make_call(target_node_id=node_id,
            target_user_id=target_id, target_user_name=target.name or "User",
            caller_user_id=caller_id, call_type=call.data.get("call_type", "voice"))
        if result.get("call_id"):
            hass.bus.async_fire("simson_user_call_started", {
                "node_id": node_id, "call_id": result["call_id"],
                "caller_user_id": caller_id, "target_user_id": target_id,
                "target_user_name": target.name or "User",
                "call_type": call.data.get("call_type", "voice"),
                "interactive": bool(call.context.user_id)})
        return result
