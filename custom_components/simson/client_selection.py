def client_for_node(hass, fallback, node_id):
    if not node_id:
        return fallback
    for entry in hass.data.get("simson", {}).values():
        if not isinstance(entry, dict):
            continue
        coordinator = entry.get("coordinator")
        if coordinator and (coordinator.data or {}).get("node_id") == node_id:
            return entry.get("client")
    return None
