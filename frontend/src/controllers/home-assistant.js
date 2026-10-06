import { ownsCall } from '../state/call-ownership.js';

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
      ['simson_user_call_started', '_onHAUserCallStarted'],
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

_onHAUserCallStarted(event) {
    if (!event.interactive || event.node_id !== this._nodeId() || !event.call_id ||
        event.caller_user_id !== this._hass?.user?.id || this._endedCallIds?.has(event.call_id)) return;
    if (this._currentCallId && this._currentCallId !== event.call_id) return;
    const initiatedLocally = Boolean(this._initiatedHere);
    if (!this._currentCallId) this._beginOutgoingCall(event.node_id, event.call_type, event.target_user_name);
    this._initiatedHere = initiatedLocally;
    this._currentCallId = event.call_id;
    this._currentRemoteNode = event.node_id;
    this._currentRemoteLabel = event.target_user_name;
    this._currentCallType = event.call_type || 'voice';
    this._isCaller = true;
    clearTimeout(this._outgoingUiTimer);
    this._eventCallSnapshot = {...event, ...this._eventCallSnapshot, call_id:event.call_id,
      direction:'outgoing', state:this._eventCallSnapshot?.state || 'requesting'};
    if (!initiatedLocally) this._showCallDialog = true;
    this._render();
  }

_onHAWebRTCSignal(event) {
    this._handleWebRTCSignal(event).catch(error => {
      this._actionError = error?.message || 'The media connection could not be established.';
      this._render();
    });
  }

_onHACallStatus(event) {
    if (event.node_id && event.node_id !== this._nodeId()) return;
    if (event.local_user_call && event.caller_user_id === this._hass?.user?.id) event = {...event, direction: 'outgoing'};
    const { call_id, status, direction, remote_node_id, call_type, sip_bridge_id, target_user_id, caller_user_id, answered_by_user_id } = event;
    // Only react to events that belong to this session's user.
    const myUserId = this._hass?.user?.id || "";
    const isMyEvent = ownsCall(event, myUserId, this._currentCallId);
    if (!isMyEvent) return;
    if (this._currentCallId && call_id !== this._currentCallId) return;
    if (['requesting','ringing','active'].includes(status)) {
      this._eventCallSnapshot = {...this._eventCallSnapshot, ...event, state: status};
    }
    if (call_type) this._currentCallType = call_type;
    clearTimeout(this._outgoingUiTimer);
    this._outgoingUiTimer = null;
    if ((status === "requesting" || status === "ringing") && direction === "outgoing") {
      this._actionError = '';
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
      this._actionError = '';
      console.log("[Simson] call_status active", { call_id, call_type, sip_bridge_id, direction, remote_node_id });
      const answeredLocally = this._answeredByMe || this._answerPendingCallId === call_id;
      if (direction === "incoming" && !answeredLocally) {
        console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card", { call_id });
        this._stopRingtone();
        this._removePopup();
        this._dismissBrowserNotification();
        this._currentCallId = null;
        this._currentCallType = "";
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
        this._currentCallType = "";
        this._currentRemoteNode = null;
        this._render();
        return;
      }
      this._currentCallId = call_id;
      if (answeredLocally) this._answeredByMe = true;
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
      const canJoin = this._initiatedHere || answeredLocally;
      if (isSipCall && canJoin) {
        if (this._sipBridgeId) {
          this._startSIPCall(this._sipBridgeId).catch(e => console.error("[Simson] SIP active start:", e));
        } else {
          console.warn("[Simson] Active SIP call missing sip_bridge_id", { call_id, remote_node_id });
        }
      } else if (!isSipCall && canJoin) {
        this._startWebRTC();
      }
      this._render();
    } else if (["ended","failed","missed","declined","timeout"].includes(status)) {
      (this._endedCallIds ||= new Set()).add(call_id);
      if (this._endedCallIds.size > 100) this._endedCallIds.delete(this._endedCallIds.values().next().value);
      this._eventCallSnapshot = null;
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
      this._currentCallType = "";
      this._currentRemoteNode = null;
      this._isCaller = false;
      this._answeredByMe = false;
      this._answerPendingCallId = null;
      this._outgoingIntentAt = 0;
      this._initiatedHere = false;
      this._showCallDialog = false;
      this._actionError = status === 'failed' ? 'The call could not be started. Check the selected gateway or SIP phone.' : '';
      // Refresh history after call ends.
      setTimeout(() => this._loadHistory(), 2000);
      this._render();
    }
  }

_onHAIncomingCall(event) {
    if (event.node_id && event.node_id !== this._nodeId()) return;
    const { call_id, from_node_id, from_label, call_type, target_user_id, metadata } = event;
    if (!this._hass?.user?.id) return;
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
    if (!call_id || this._endedCallIds?.has(call_id)) return;
    const callKey = call_id;
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
    this._currentCallType = call_type || "voice";
    this._eventCallSnapshot = {...metadata,call_id,state:'incoming',direction:'incoming',
      remote_node_id:from_node_id,remote_label:from_label,call_type,target_user_id};
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
      if (this._currentCallId === call_id && !this._answeredByMe && !this._answerPendingCallId && this._callState() !== 'active') {
        console.log("[Simson] Incoming call timeout - clearing phantom call", call_id);
        this._stopRingtone();
        this._removePopup();
        this._dismissBrowserNotification();
        this._clearLocalCallState();
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
    const state = this._visibleCall()?.state || 'idle';
    if ((state === "incoming" || state === "ringing" || state === "requesting") && this._isStaleRingingCall()) {
      return "idle";
    }
    return state;
  }

_activeCallAttr(key, fallback = "") {
    return this._visibleCall()?.[key] ?? fallback;
  }

_visibleCall() {
    const userId = this._hass?.user?.id || '';
    const calls = this._attr('calls_count', 'active_calls', []) || [];
    const sensor = this._entity('call_state');
    const candidates = [this._eventCallSnapshot, ...calls, {...sensor?.attributes, state: sensor?.state}]
      .filter(call=>call && !this._endedCallIds?.has(call.call_id));
    const selected = candidates.find(call => call.call_id === this._currentCallId &&
      ownsCall(call, userId, this._currentCallId)) ||
      candidates.find(call => ownsCall(call, userId, this._currentCallId));
    return selected?.local_user_call && selected.caller_user_id === userId
      ? {...selected, direction: 'outgoing', remote_label: selected.target_user_name || selected.remote_label} : selected;
  }

_isStaleRingingCall() {
    const startedAt = Number(this._visibleCall()?.started_at || 0);
    if (!startedAt) return false;
    return (Date.now() - startedAt * 1000) > 90000;
  }

async _callService(service, data = {}) {
    if (!this._hass) return;
    try {
      await this._hass.callService("simson", service, data);
      setTimeout(() => this._render(), 250);
    } catch (err) {
      if (service === "make_call" || service === "call_user" || service === "call_sip_phone" || service === "call_phone_number") {
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
