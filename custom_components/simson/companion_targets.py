def select_user_devices(registrations, user_id, supports_push):
    selected = []
    known_devices = set()
    if not user_id:
        return selected
    for webhook_id, entry in registrations.items():
        data = entry.data
        if data.get("user_id") != user_id or getattr(entry, "disabled_by", None):
            continue
        if str(data.get("os_name", "")).lower() not in ("android", "ios"):
            continue
        try:
            if not supports_push(webhook_id):
                continue
        except (KeyError, AttributeError, TypeError):
            continue
        identity = data.get("device_id") or webhook_id
        if identity in known_devices:
            continue
        known_devices.add(identity)
        selected.append({"target": webhook_id, "name": data.get("device_name") or entry.title})
    return selected


def user_companion_devices(hass, user_id):
    if not hass.services.has_service("notify", "mobile_app"):
        return []
    registrations = hass.data.get("mobile_app", {}).get("config_entries", {})
    try:
        from homeassistant.components.mobile_app.util import supports_push
    except ImportError:
        return []
    return select_user_devices(registrations, user_id, lambda webhook_id: supports_push(hass, webhook_id))
