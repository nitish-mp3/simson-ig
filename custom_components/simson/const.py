"""Constants for the Simson integration."""

DOMAIN = "simson"

# Config keys
CONF_ADDON_URL = "addon_url"

# Default addon ingress URL
DEFAULT_ADDON_URL = "http://localhost:8799"

# Platforms
PLATFORMS = ["sensor"]

# Events
EVENT_INCOMING_CALL = "simson_incoming_call"
EVENT_CALL_STATUS = "simson_call_status"
EVENT_ERROR = "simson_error"

# Service names
SERVICE_MAKE_CALL = "make_call"
SERVICE_ANSWER_CALL = "answer_call"
SERVICE_REJECT_CALL = "reject_call"
SERVICE_HANGUP_CALL = "hangup_call"
