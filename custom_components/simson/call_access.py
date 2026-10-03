def can_control_call(call: dict, user_id: str, action: str) -> bool:
    if not user_id or not call:
        return False
    if call.get("state") not in ("requesting", "incoming", "ringing", "active"):
        return False
    metadata = call.get("metadata") or {}
    caller = call.get("caller_user_id") or metadata.get("caller_user_id")
    target = call.get("target_user_id") or metadata.get("target_user_id")
    answered = call.get("answered_by_user_id") or metadata.get("answered_by_user_id")
    if call.get("local_user_call") and caller == user_id:
        return action not in ("answer", "reject")
    if call.get("direction") == "outgoing":
        return caller == user_id
    if call.get("direction") != "incoming":
        return False
    if target and target != user_id:
        return False
    if answered and answered != user_id:
        return False
    if action in ("answer", "reject"):
        return call.get("state") in ("incoming", "ringing")
    return answered == user_id
