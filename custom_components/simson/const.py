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
SERVICE_WEBRTC_SIGNAL = "send_webrtc_signal"
SERVICE_GET_TARGETS = "get_targets"
SERVICE_USER_HEARTBEAT = "user_heartbeat"
SERVICE_GET_REMOTE_USERS = "get_remote_users"
SERVICE_GET_CALL_HISTORY = "get_call_history"

# WebRTC event
EVENT_WEBRTC_SIGNAL = "simson_webrtc_signal"
