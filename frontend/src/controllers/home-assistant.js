export const withHomeAssistant = Base => class extends Base {
_autoDetectNodeId() {
    if (!this._hass?.states) return;
    for (const entityId of Object.keys(this._hass.states)) {
      const m = entityId.match(/^sensor\.simson_(.+)_connection$/);
      if (m) {
        this._detectedNodeId = m[1];
        console.info("Simson: auto-detected node_id:", this._detectedNodeId);
        return;
      }
    }
  }

_nodeId() {
    return this._config.node_id || this._detectedNodeId;
  }

_subscribeHAEvents() {
    if (!this._hass?.connection) return;
    this._haEventSubscribed = true;
    const generation = this._subscriptionGeneration = (this._subscriptionGeneration || 0) + 1;
    const events = [
      ['simson_webrtc_signal', '_onHAWebRTCSignal'], ['simson_call_status', '_onHACallStatus'],
      ['simson_incoming_call', '_onHAIncomingCall'], ['simson_targets_result', '_onHATargetsResult'],
      ['simson_remote_users', '_onHARemoteUsers'], ['simson_call_history', '_onHACallHistory'],
    ];
    this._subscriptions = [];
    for (const [event, method] of events) {
      this._hass.connection.subscribeEvents(message => {
        if (generation === this._subscriptionGeneration && this.isConnected) this[method](message.data);
      }, event).then(unsubscribe => {
        if (generation !== this._subscriptionGeneration || !this.isConnected) unsubscribe();
        else this._subscriptions.push(unsubscribe);
      }).catch(() => {
        if (generation === this._subscriptionGeneration) this._unsubscribeHAEvents();
      });
    }
  }

_unsubscribeHAEvents() {
    this._subscriptionGeneration = (this._subscriptionGeneration || 0) + 1;
    for (const unsubscribe of this._subscriptions || []) unsubscribe();
    this._subscriptions = [];
    this._haEventSubscribed = false;
  }

_onHAWebRTCSignal(event) {
    this._handleWebRTCSignal(event).catch(error => {
      this._actionError = error?.message || 'The media connection could not be established.';
      this._render();
    });
  }

_onHACallStatus(event) {
    const { call_id, status, direction, remote_node_id, call_type, sip_bridge_id, target_user_id, caller_user_id, answered_by_user_id } = event;
    // Only react to events that belong to this session's user.
    const myUserId = this._hass?.user?.id || "";
    const isMyEvent = call_id === this._currentCallId ||
      (direction === "incoming" && (!target_user_id || target_user_id === myUserId)) ||
      (direction === "outgoing" && (!caller_user_id || caller_user_id === myUserId));
    if (!isMyEvent) return;
    if ((status === "requesting" || status === "ringing") && direction === "outgoing") {
      this._currentCallId = call_id || this._currentCallId;
      this._currentRemoteNode = remote_node_id || this._currentRemoteNode;
      this._isCaller = true;
      this._polite = false;
      this._outgoingIntentAt = Date.now();
      this._stopRingtone();
      this._removePopup();
      this._dismissBrowserNotification();
      this._render();
    } else if (status === "active") {
      console.log("[Simson] call_status active", { call_id, call_type, sip_bridge_id, direction, remote_node_id });
      const answeredLocally = this._answeredByMe || this._answerPendingCallId === call_id;
      if (direction === "incoming" && !answeredLocally) {
        console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card", { call_id });
        this._stopRingtone();
        this._removePopup();
        this._dismissBrowserNotification();
        this._currentCallId = null;
        this._currentRemoteNode = null;
        this._sipBridgeId = null;
        this._callStart = null;
        this._render();
        return;
      }
      // Clear incoming timeout since call is now active.
      if (this._incomingCallTimeout) {
        clearTimeout(this._incomingCallTimeout);
        this._incomingCallTimeout = null;
      }
      // If another user on this node answered (call-all), dismiss for me.
      if (direction === "incoming" && answered_by_user_id && answered_by_user_id !== myUserId) {
        this._stopRingtone();
        this._removePopup();
        this._dismissBrowserNotification();
        this._currentCallId = null;
        this._currentRemoteNode = null;
        this._render();
        return;
      }
      this._currentCallId = call_id;
      this._answerPendingCallId = null;
      this._currentRemoteNode = remote_node_id;
      if (sip_bridge_id) this._sipBridgeId = sip_bridge_id;
      const isSipCall = call_type === "sip" ||
        String(remote_node_id || "").startsWith("sip:") ||
        String(remote_node_id || "").startsWith("asterisk:");
      // Caller creates the offer (impolite), callee waits for offer (polite).
      this._isCaller = direction === "outgoing" || this._isCaller;
      this._outgoingIntentAt = 0;
      this._polite = !this._isCaller;
      if (!this._callStart) this._callStart = Date.now();
      this._stopRingtone();
      this._removePopup();
      this._dismissBrowserNotification();
      if (isSipCall) {
        if (this._sipBridgeId) {
          this._startSIPCall(this._sipBridgeId).catch(e => console.error("[Simson] SIP active start:", e));
        } else {
          console.warn("[Simson] Active SIP call missing sip_bridge_id", { call_id, remote_node_id });
        }
      } else {
        this._startWebRTC();
      }
      this._render();
    } else if (["ended","failed","missed","declined","timeout"].includes(status)) {
      // Clear incoming timeout since call has ended.
      if (this._incomingCallTimeout) {
        clearTimeout(this._incomingCallTimeout);
        this._incomingCallTimeout = null;
      }
      this._stopRingtone();
      this._removePopup();
      this._dismissBrowserNotification();
      this._cleanupWebRTC();
      this._callStart = null;
      this._currentCallId = null;
      this._currentRemoteNode = null;
      this._isCaller = false;
      this._answeredByMe = false;
      this._answerPendingCallId = null;
      this._outgoingIntentAt = 0;
      // Refresh history after call ends.
      setTimeout(() => this._loadHistory(), 2000);
      this._render();
    }
  }

_onHAIncomingCall(event) {
    const { call_id, from_node_id, from_label, call_type, target_user_id, metadata } = event;
    if (target_user_id && this._hass?.user?.id && target_user_id !== this._hass.user.id) {
      this._ignoredCallId = call_id;
      return;
    }
    // Central SIP may emit a media-leg invite immediately after this card
    // places a call. It belongs to the outgoing call and must not expose
    // Answer/Decline controls as though a second call arrived.
    if (this._isCaller && this._outgoingIntentAt && Date.now() - this._outgoingIntentAt < 15000) {
      console.log("[Simson] Ignoring outgoing bridge invite in incoming UI", { call_id, from_node_id });
      return;
    }
    // Suppress rapid-fire re-invites after the user hit Decline.
    if (this._incomingSuppressUntil && Date.now() < this._incomingSuppressUntil) {
      console.log("[Simson] Ignoring incoming call — suppression active until", this._incomingSuppressUntil);
      this._ignoredCallId = call_id;
      return;
    }
    // DEDUPLICATE: Ignore calls from same extension within 2s (prevents spam from phone retrying)
    const callKey = from_node_id + "|" + call_type;
    if (this._lastIncomingCall === callKey && Date.now() - this._lastIncomingCallTime < 2000) {
      console.log("[Simson] Ignoring duplicate incoming call from", from_node_id, "within 2s");
      return;
    }
    this._lastIncomingCall = callKey;
    this._lastIncomingCallTime = Date.now();
    // Clear any existing incoming timeout to prevent race conditions.
    if (this._incomingCallTimeout) {
      clearTimeout(this._incomingCallTimeout);
      this._incomingCallTimeout = null;
    }
    this._currentCallId = call_id;
    this._currentRemoteNode = from_node_id;
    this._incomingFrom = from_label || from_node_id;
    this._incomingCallType = call_type || "voice";
    // Track SIP bridge ID so we can join the Asterisk ConfBridge on answer.
    this._sipBridgeId = (call_type === "sip" && metadata?.sip_bridge_id) ? metadata.sip_bridge_id : null;
    this._playRingtone();
    this._showIncomingPopup();
    this._showBrowserNotification(this._incomingFrom, this._incomingCallType);
    // Auto-clear phantom incoming calls after 30 seconds if no answer/reject.
    this._incomingCallTimeout = setTimeout(() => {
      if (this._currentCallId === call_id) {
        console.log("[Simson] Incoming call timeout - clearing phantom call", call_id);
        this._stopRingtone();
        this._removePopup();
        this._dismissBrowserNotification();
        this._currentCallId = null;
        this._currentRemoteNode = null;
        this._sipBridgeId = null;
        this._incomingCallTimeout = null;
        this._render();
      }
    }, 30000);
    this._render();
  }

_onHARemoteUsers(data) {
    if (data && Array.isArray(data.users)) {
      this._remoteUsers = data.users;
      this._usersLoading = false;
      const nodeId = data.node_id || this._selectedNode;
      if (nodeId) {
        this._usersCache[nodeId] = { users: data.users, timestamp: Date.now() };
      }
      if (this._transferLoading && nodeId === this._transferUsersNode) {
        this._transferUsers = data.users;
        this._transferLoading = false;
        this._render();
        return;
      }
      // If we have a pending user picker, show it.
      if (this._userPickerNodeId) {
        this._showUserPickerPopup();
      } else {
        this._render();
      }
    }
  }

_onHATargetsResult(data) {
    if (data && Array.isArray(data.targets)) {
      this._targets = data.targets;
      this._targetsLoaded = true;
      this._targetsLoading = false;
      this._render();
    }
  }

_onHACallHistory(data) {
    if (data && Array.isArray(data.history)) {
      this._history = data.history;
      this._historyLoaded = true;
      this._render();
    }
  }

_entity(suffix) {
    return this._hass?.states[`sensor.simson_${this._nodeId()}_${suffix}`];
  }

_val(suffix, fallback = "unknown") {
    return this._entity(suffix)?.state ?? fallback;
  }

_attr(suffix, key, fallback = null) {
    return this._entity(suffix)?.attributes?.[key] ?? fallback;
  }

_effectivePstnTrunk(includeDraft = true) {
    const draft = includeDraft ? String(this._pstnTrunkDraft || "").trim() : "";
    if (draft) return draft;
    const configured = String(this._config?.pstn_trunk || "").trim();
    if (configured) return configured;
    const routing = this._attr("connection", "routing", {}) || {};
    const siteDefault = String(routing.default_gateway_trunk || "").trim();
    if (siteDefault) return siteDefault;
    const gatewayTarget = (this._targets || []).find(t => (t.type === "gateway" || t.trunk) && t.trunk);
    if (gatewayTarget?.trunk) return String(gatewayTarget.trunk).trim();
    return "7009";
  }

_isConnected() { return this._val("connection") === "connected"; }

_callState() {
    const state = this._val("call_state", "idle");
    if ((state === "incoming" || state === "ringing" || state === "requesting") && this._isStaleRingingCall()) {
      return "idle";
    }
    return state;
  }

_activeCallAttr(key, fallback = "") {
    return this._attr("call_state", key, fallback);
  }

_isStaleRingingCall() {
    const startedAt = Number(this._attr("call_state", "started_at", 0));
    if (!startedAt) return false;
    return (Date.now() - startedAt * 1000) > 90000;
  }

async _callService(service, data = {}) {
    if (!this._hass) return;
    try {
      await this._hass.callService("simson", service, data);
      setTimeout(() => this._render(), 250);
    } catch (err) {
      if (service === "make_call" || service === "call_sip_phone" || service === "call_phone_number") {
        this._clearLocalCallState();
      }
      this._actionError = err?.message || 'Could not reach Simson. Please retry.';
      this._render();
      return false;
    }
  }

async _loadTargets() {
    if (!this._hass || this._targetsLoading) return;
    this._targetsLoading = true;
    try {
      await this._hass.callService("simson", "get_targets", {});
    } catch (e) {
      this._targetsLoading = false;
    }
  }

async _loadHistory() {
      if (!this._hass) return;
      try {
        await this._hass.callService("simson", "get_call_history", { limit: 50 });
      } catch (error) {
        this._actionError = `Could not load recent calls: ${error.message || 'connection failed'}`;
        this._render();
      }
  }

_fetchRemoteUsers(nodeId) {
    if (!nodeId || !this._hass) return;
    // Use cache if fresh (< 3s).
    const cached = this._usersCache[nodeId];
    if (cached && (Date.now() - cached.timestamp) < 3000) {
      this._remoteUsers = cached.users;
      this._usersLoading = false;
      this._render();
      return;
    }
    this._usersLoading = true;
    this._remoteUsers = [];
    this._render();
    this._callService("get_remote_users", { node_id: nodeId });
  }

_getNodeTargets() {
    return this._targets.filter(t => t.type === "node");
  }

_getNonNodeTargets() {
    return this._targets.filter(t => t.type !== "node");
  }

_sendUserHeartbeat() {
    if (!this._hass?.user) return;
    this._callService("user_heartbeat", {
      user_id: this._hass.user.id,
      user_name: this._hass.user.name,
    });
  }
};
