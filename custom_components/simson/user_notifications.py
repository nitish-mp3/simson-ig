from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl, quote
import asyncio
from collections import OrderedDict
from .companion_targets import user_companion_devices
from .notification_links import dashboard_path as safe_dashboard_path

RING_REMINDER_SECONDS = 10


def incoming_notification(call_id, node_id, label, dashboard_path, user_id="", notify_service=""):
    dashboard_path = safe_dashboard_path(dashboard_path)
    location = urlsplit(dashboard_path)
    def action_url(action):
        query = dict(parse_qsl(location.query))
        query.update(simson_action=action, simson_call=call_id, simson_node=node_id)
        return urlunsplit(("", "", location.path, urlencode(query), location.fragment))
    def action_id(action):
        return "::".join((f"SIMSON_{action.upper()}", quote(str(node_id), safe=""),
            quote(str(call_id), safe=""), quote(str(user_id), safe=""),
            quote(str(notify_service), safe="")))
    return {"title": "Incoming Simson call", "message": f"{label or 'A user'} is calling you",
        "data": {"tag": f"simson_user_{call_id}", "persistent": True, "sticky": True,
            "channel": "Simson User Calls v1", "importance": "high", "alert_once": False,
            "push": {"sound": "default", "interruption-level": "time-sensitive"},
            "ttl": 0, "priority": "high",
            "url": action_url("open"), "clickAction": action_url("open"), "actions": [
                {"action": "URI", "title": "Answer", "uri": action_url("answer")},
                {"action": action_id("decline"), "title": "Decline"},
                {"action": "URI", "title": "Open call", "uri": action_url("open")} ]}}


async def async_setup_user_notifications(hass, entry, coordinator):
    from homeassistant.helpers.storage import Store
    from homeassistant.exceptions import HomeAssistantError
    import voluptuous as vol
    import logging

    logger = logging.getLogger(__name__)
    storage = Store(hass, 1, f"simson_user_notifications_{entry.entry_id}")
    saved = await storage.async_load()
    targets = {user_id: target for user_id, target in saved.items() if isinstance(target, dict)} if isinstance(saved, dict) else {}
    data = hass.data["simson"][entry.entry_id]
    data["user_notification_targets"] = targets
    data["user_notification_store"] = storage
    diagnostics = data["user_notification_status"] = {}
    deliveries = OrderedDict()
    delivery_locks = {}
    reminders = {}

    def stop_reminder(call_id):
        task = reminders.pop(call_id, None)
        if task and task is not asyncio.current_task():
            task.cancel()

    def unload():
        for task in reminders.values():
            task.cancel()
        reminders.clear()

    entry.async_on_unload(unload)

    async def remind(event):
        call_id = event.data["call_id"]
        try:
            while True:
                await asyncio.sleep(RING_REMINDER_SECONDS)
                async with asyncio.timeout(5):
                    calls = await data["client"].calls()
                live = next((call for call in calls.get("calls", []) if call.get("call_id") == call_id), None)
                if not live or live.get("state") not in ("incoming", "ringing"):
                    from types import SimpleNamespace
                    await notify(SimpleNamespace(event_type="simson_call_status", data={
                        **event.data, "status": "ended"}))
                    return
                await notify(event, reminder=True)
        except asyncio.CancelledError:
            raise
        except Exception:
            # Never re-alert when current call state cannot be confirmed.
            logger.debug("Cannot confirm ringing state for user-call reminder")
        finally:
            if reminders.get(call_id) is asyncio.current_task():
                reminders.pop(call_id, None)

    async def test_notification(call):
        entity = hass.states.get(call.data["entity_id"])
        if not entity or not entity.attributes.get("simson_contact"):
            raise HomeAssistantError("Choose a Simson user contact")
        user_id = entity.attributes["user_id"]
        actor = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        if call.context.user_id and (not actor or actor.id != user_id and not actor.is_admin):
            raise HomeAssistantError("You can test only your own call notifications")
        owner = hass.data["simson"].get(entity.attributes.get("entry_id"), {})
        mapping = owner.get("user_notification_targets", {})
        target = mapping.get(user_id, {})
        devices = user_companion_devices(hass, user_id) if user_id not in mapping else []
        service = target.get("service") or ("notify.mobile_app" if devices else "")
        if not service:
            raise HomeAssistantError("No notification phone is enabled for this user. Register the Companion app as this HA user or configure their notification target.")
        path = target.get("dashboard_path") or "/simson-call"
        body = {"title": "Simson notification test", "message": "If you can read this test, Simson notifications can reach this phone.",
            "data": {"url": path, "priority": "high", "ttl": 0}}
        if devices:
            body["target"] = [device["target"] for device in devices]
        await hass.services.async_call("notify", service.removeprefix("notify."), body, blocking=True)
        hass.bus.async_fire("simson_user_notification_status", {"node_id": entity.attributes.get("node_id"),
            "user_id": user_id, "status": "test_requested", "device_count": len(devices) or 1})

    if not hass.services.has_service("simson", "test_user_notification"):
        hass.services.async_register("simson", "test_user_notification", test_notification,
            schema=vol.Schema({vol.Required("entity_id"): str}))

    async def set_target(call):
        user = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        if call.context.user_id and (not user or not user.is_admin):
            raise HomeAssistantError("Only an administrator can configure user notification targets")
        entity = hass.states.get(call.data["entity_id"])
        if not entity or not entity.attributes.get("simson_contact"):
            raise HomeAssistantError("Choose a Simson user contact")
        owner = hass.data["simson"].get(entity.attributes.get("entry_id"), {})
        mapping = owner.get("user_notification_targets")
        if mapping is None:
            raise HomeAssistantError("This contact is unavailable")
        service = call.data.get("notify_service", "")
        if service and (not service.startswith("notify.mobile_app_") or not hass.services.has_service("notify", service.removeprefix("notify."))):
            raise HomeAssistantError("Choose an existing Companion app notify service")
        updated = dict(mapping)
        if call.data.get("automatic", False):
            updated.pop(entity.attributes["user_id"], None)
        else:
            updated[entity.attributes["user_id"]] = {"service": service, "dashboard_path": safe_dashboard_path(call.data.get("dashboard_path", "/simson-call"))}
        await owner["user_notification_store"].async_save(updated)
        mapping.clear()
        mapping.update(updated)
        owner.get("coordinator") and owner["coordinator"].async_update_listeners()

    if not hass.services.has_service("simson", "set_user_notification_target"):
        hass.services.async_register("simson", "set_user_notification_target", set_target,
            schema=vol.Schema({vol.Required("entity_id"): str, vol.Optional("notify_service", default=""): str,
                vol.Optional("dashboard_path", default="/simson-call"): str, vol.Optional("automatic", default=False): bool}))

    async def notify(event, *, reminder=False):
        payload = event.data or {}
        metadata = payload.get("metadata") or {}
        node_id = (coordinator.data or {}).get("node_id", "")
        call_id = payload.get("call_id")
        if not call_id or not node_id or payload.get("node_id") != node_id:
            return
        terminal = payload.get("status") in ("active", "ended", "failed", "missed", "declined", "timeout")
        if event.event_type != "simson_incoming_call" and not terminal:
            return
        if terminal and event.event_type != "simson_incoming_call":
            stop_reminder(call_id)
        async with delivery_locks.setdefault(call_id, asyncio.Lock()):
            if terminal and event.event_type != "simson_incoming_call":
                stop_reminder(call_id)
            previous = deliveries.get(call_id, {})
            incoming = event.event_type == "simson_incoming_call"
            user_id = payload.get("target_user_id") or metadata.get("target_user_id") or previous.get("user_id")
            target = targets.get(user_id) or {}
            service = (previous.get("service") if not incoming or reminder else "") or target.get("service", "")
            push_targets = previous.get("push_targets", []) if not incoming or reminder else []
            devices = []
            if not service and user_id not in targets:
                devices = user_companion_devices(hass, user_id)
                if devices:
                    service = "notify.mobile_app"
                    push_targets = [device["target"] for device in devices]
            if incoming and (previous.get("status") in ("cleared", "clear_failed") or
                    previous.get("status") == "sent" and not reminder):
                return
            if terminal and previous.get("status") == "cleared":
                return
            status = "sent" if incoming else "cleared"
            error_message = ""
            if not service:
                status = "not_configured" if incoming else "cleared"
                if incoming:
                    error_message = "Notifications disabled for this contact" if user_id in targets else "No push-capable Companion registration belongs to this HA user; register the phone as the recipient or ask an administrator to map its notify service."
            else:
                label = metadata.get("caller_user_name") or payload.get("from_label")
                caller_id = metadata.get("caller_user_id")
                if caller_id and payload.get("from_node_id") == node_id and getattr(hass, "auth", None):
                    caller = await hass.auth.async_get_user(caller_id)
                    if caller:
                        label = caller.name or label
                body = incoming_notification(call_id, node_id, payload.get("from_label"),
                    target.get("dashboard_path") or "/simson-call", user_id, service) if incoming else {
                    "message": "clear_notification", "data": {"tag": f"simson_user_{call_id}"}}
                if incoming:
                    body["message"] = f"{label or 'A user'} is calling you"
                if push_targets:
                    body["target"] = push_targets
                try:
                    async with asyncio.timeout(15):
                        await hass.services.async_call("notify", service.removeprefix("notify."), body, blocking=True)
                except Exception as error:
                    status = "failed" if incoming else "clear_failed"
                    error_message = str(error)
                    logger.warning("User call notification failed: %s", error)
            record = {"call_id": call_id, "user_id": user_id, "service": service,
                "status": status, "error": error_message, "device_count": len(push_targets) if push_targets else int(bool(service))}
            deliveries[call_id] = {**record, "push_targets": push_targets}
            if incoming and service and data.get("client") and call_id not in reminders:
                reminders[call_id] = asyncio.create_task(remind(event))
            deliveries.move_to_end(call_id)
            if len(deliveries) > 256:
                expired_id, _ = deliveries.popitem(last=False)
                stop_reminder(expired_id)
                lock = delivery_locks.get(expired_id)
                if lock and not lock.locked():
                    delivery_locks.pop(expired_id, None)
            if user_id:
                diagnostics[user_id] = record
            hass.bus.async_fire("simson_user_notification_status", {**record, "node_id": node_id})
            coordinator.async_update_listeners()

    entry.async_on_unload(hass.bus.async_listen("simson_incoming_call", notify))
    entry.async_on_unload(hass.bus.async_listen("simson_call_status", notify))
