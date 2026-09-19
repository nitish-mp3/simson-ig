import { LitElement } from 'lit';
export class CardBase extends LitElement {
constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;

    // Auto-detected node_id
    this._detectedNodeId = "";

    // Active tab: "dial" or "history"
    this._activeTab = "dial";

    // Node/user selection state
    this._selectedNode = "";
    this._nodeInputDraft = "";
    this._sipDialDraft = "";
    this._pstnDialDraft = "";
    this._pstnTrunkDraft = "";
    this._smartRouteMode = "auto";
    this._remoteUsers = [];
    this._usersLoading = false;
    this._usersCache = {};  // nodeId -> { users, timestamp }

    // Call history
    this._history = [];
    this._historyLoaded = false;

    // Targets from addon
    this._targets = [];
    this._targetsLoaded = false;
    this._targetsLoading = false;

    // WebRTC state
    this._pc = null;
    this._localStream = null;
    this._muted = false;
    this._micAllowed = null;
    this._audioQuality = 3;
    this._connectionType = "";   // "host" | "srflx" (reflexive) | "relay" from RTCStats
    this._statsInterval = null;
    this._startingWebRTC = false;
    this._pendingOffer = null;
    this._iceServers = null;     // fetched from /api/webrtc-config; fallback: ICE_SERVERS
    this._webrtcConfig = null;   // full {ice_servers, sip} object from addon API
    this._videoEnabled = false;
    this._cameraMuted = false;
    this._selectedAudioInput = "";
    this._selectedVideoInput = "";
    this._selectedAudioOutput = "";
    this._mediaDevices = { audioInputs: [], videoInputs: [], audioOutputs: [] };
    this._mediaPermission = "prompt";
    this._mediaDeviceError = "";
    this._mediaPreviewStream = null;
    this._remoteStream = null;
    this._loadMediaPreferences();

    // SIP UA (used when call_type === "sip" to join Asterisk ConfBridge)
    this._sipUA = null;
    this._sipBridgeId = null;    // bridge extension to dial (e.g. "bridge-AbC123")

    // Persistent audio element
    this._remoteAudio = document.createElement("audio");
    this._remoteAudio.autoplay = true;
    this._remoteAudio.muted = false;
    this._remoteAudio.volume = 1;
    this._remoteAudio.setAttribute("playsinline", "");
    this.shadowRoot.appendChild(this._remoteAudio);

    // HA event subscriptions
    this._haEventUnsub = null;
    this._haStatusUnsub = null;
    this._haIncomingUnsub = null;
    this._haTargetsUnsub = null;
    this._haRemoteUsersUnsub = null;
    this._haHistoryUnsub = null;
    this._haEventSubscribed = false;

    // Call timer
    this._callStart = null;
    this._timerInterval = null;

    // Call state tracking
    this._prevCallState = "idle";

    // Call context
    this._currentCallId = null;
    this._currentRemoteNode = null;
    this._isCaller = false;       // true = we placed the call (we create offer)
    this._polite = false;
    this._makingOffer = false;
    this._pendingCandidates = [];
    this._answeredByMe = false;   // track if this user answered the call
    this._answerPendingCallId = null;
    this._outgoingIntentAt = 0;
    this._incomingCallTimeout = null;  // timeout to clear phantom incoming calls
    this._lastIncomingCall = null;     // "from_node_id|call_type" for deduplication
    this._lastIncomingCallTime = 0;    // timestamp of last incoming call

    // Ringtone
    this._ringCtx = null;
    this._ringLoop = null;

    // Popups
    this._popupEl = null;
    this._showPopup = false;
    this._incomingFrom = "";
    this._incomingCallType = "";
    this._userPickerEl = null;
    this._userPickerNodeId = "";
    this._userPickerTargetId = "";
    this._ignoredCallId = null;
    this._transferNodeDraft = "";
    this._transferUsers = [];
    this._transferUsersNode = "";
    this._transferLoading = false;

    // Notifications
    this._notifPermission = typeof Notification !== "undefined" ? Notification.permission : "denied";
    this._activeNotification = null;

    // User heartbeat
    this._userHeartbeatInterval = null;

    // UI action guard. Home Assistant can re-render this card while a service
    // call is still in flight; short locks keep taps responsive without
    // double-firing answer/hangup/dial actions.
    this._actionLocks = new Set();
    this._lastActionAt = {};
    this._deviceChangeHandler = () => this._refreshMediaDevices(false);
  }
setConfig(config) {
    config = config || {};
    // node_id is optional — auto-detected from entities or extracted from old entity names.
    let nodeId = config.node_id || "";
    if (!nodeId && config.connection_entity) {
      const m = config.connection_entity.match(/^sensor\.simson_(.+)_connection$/);
      if (m) nodeId = m[1];
    }
    if (!nodeId && config.call_state_entity) {
      const m = config.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);
      if (m) nodeId = m[1];
    }
    if (!nodeId && config.calls_count_entity) {
      const m = config.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);
      if (m) nodeId = m[1];
    }

    // target_nodes supports string shorthand, {node_id: "..."} objects, and
    // legacy single-object/string configs without throwing a Lovelace error.
    const rawTargetNodes = Array.isArray(config.target_nodes)
      ? config.target_nodes
      : (config.target_nodes ? [config.target_nodes] : []);
    const targetNodes = rawTargetNodes
      .map(t => (typeof t === "string" ? t : (t?.node_id || t?.id || "")))
      .filter(Boolean);

    this._config = {
      title: config.title || "Simson",
      node_id: nodeId,
      target_nodes: targetNodes,
      pstn_trunk: String(config.pstn_trunk || "").trim(),
      video_enabled: config.video_enabled === true,
    };
    if (config.video_enabled === true) this._videoEnabled = true;

    // Pre-seed cache slots so configured nodes immediately appear in suggestions.
    targetNodes.forEach(n => {
      if (!this._usersCache[n]) this._usersCache[n] = { users: [], timestamp: 0 };
    });

    this._render();
  }
}

