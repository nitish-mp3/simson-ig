from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit, unquote
from posixpath import normpath


def dashboard_path(value):
    value = str(value or "")
    if not value.startswith("/") or value.startswith("//"):
        return "/simson-call"
    location = urlsplit(value)
    decoded = unquote(location.path)
    path = normpath(decoded)
    if (not value.startswith("/") or location.netloc or decoded.startswith("//") or path == "/api" or path.startswith("/api/")
            or "\\" in unquote(value) or any(ord(char) < 32 for char in unquote(value)) or path == "/lovelace/default_view"):
        return "/simson-call"
    return value


def handoff_url(action, call_id, node_id, path="/simson-call"):
    location = urlsplit(dashboard_path(path))
    query = dict(parse_qsl(location.query))
    query.update(simson_action=action, simson_call=call_id, simson_node=node_id)
    return urlunsplit(("", "", location.path, urlencode(query), location.fragment))
