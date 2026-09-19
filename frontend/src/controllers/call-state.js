export function reconcileCall() {
 const nodeId = this._nodeId();
    const connected = this._isConnected();
    const callState = this._callState();
    const callId = this._activeCallAttr("call_id", "") || this._currentCallId || "";
    const entityDirection = this._activeCallAttr("direction", "");
    const outgoingIntentActive = this._isCaller && this._outgoingIntentAt &&
      (Date.now() - this._outgoingIntentAt < 15000);
    const direction = outgoingIntentActive ? "outgoing" : entityDirection;

    // Per-user call ownership: only show call UI to the intended caller or target.
    // Use `direction` (from entity attr — stable across all call states) not `callState`.
    const myUserId = this._hass?.user?.id || "";
    const targetUserId = this._activeCallAttr("target_user_id", "");
    const callerUserId = this._activeCallAttr("caller_user_id", "");
    const answeredByUserId = this._activeCallAttr("answered_by_user_id", "");
    const isMyCall = !callId ||
      callId === this._currentCallId ||
      !direction ||
      (direction === "incoming" &&
        (!targetUserId || targetUserId === myUserId) &&
        (!answeredByUserId || answeredByUserId === myUserId)) ||
      (direction === "outgoing" && (!callerUserId || callerUserId === myUserId));
    const liveStates = ['incoming', 'requesting', 'ringing', 'active'];
    const effectiveCallState = isMyCall && liveStates.includes(callState) && callId ? callState : 'idle';

    const isIdle = effectiveCallState === "idle" || effectiveCallState === "unknown";
    const isIncoming = effectiveCallState === "incoming" && direction !== "outgoing" && !this._isCaller;
    const isRinging = effectiveCallState === "requesting" || effectiveCallState === "ringing";
    const isActive = effectiveCallState === "active";
    const isMissed = effectiveCallState === "missed";
    const isDeclined = effectiveCallState === "declined";
    const isTimeout = effectiveCallState === "timeout";
    const hasCall = isIncoming || isRinging || isActive;
    const hasWebRTC = !!this._pc;
    const activeCallType = this._activeCallAttr("call_type", "");
    const activeSipBridgeId = this._activeCallAttr("sip_bridge_id", "");

    const remoteLabel = this._activeCallAttr("remote_name") ||
                        this._activeCallAttr("display_name") ||
                        this._activeCallAttr("remote_label") ||
                        this._activeCallAttr("remote_number") ||
                        this._activeCallAttr("remote_node_id") ||
                        this._currentRemoteNode || (direction === "incoming" ? "Caller" : "Destination");

    if (callId && !this._currentCallId && isMyCall) this._currentCallId = callId;
    if (hasCall && !this._currentRemoteNode) {
      this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
    }

    // State transitions (only fire side-effects for our own calls)
    const prev = this._prevCallState;
    if (prev !== effectiveCallState) {
      this._prevCallState = effectiveCallState;
      if (effectiveCallState === "incoming" && prev === "idle") {
        // Respect the post-decline suppression window (e.g. after user hits Decline
        // on a spam call, we ignore new incoming events for 8 s).
        const suppressed = this._incomingSuppressUntil && Date.now() < this._incomingSuppressUntil;
        if (suppressed) {
          this._ignoredCallId = callId;
          // Revert prev so a real call after the window still triggers
          this._prevCallState = "idle";
        } else if (!(this._ignoredCallId && this._ignoredCallId === callId)) {
          this._currentCallId = callId;
          this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
          this._isCaller = false;
          this._polite = true;
          this._incomingFrom = this._activeCallAttr("remote_label") || this._currentRemoteNode || "Unknown";
          this._incomingCallType = this._activeCallAttr("call_type") || "voice";
          this._playRingtone();
          this._showIncomingPopup();
          this._showBrowserNotification(this._incomingFrom, this._incomingCallType);
        }
      } else if (effectiveCallState === "active" && prev !== "active") {
        this._stopRingtone(); this._removePopup(); this._dismissBrowserNotification();
        this._currentCallId = callId;
        this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
        if (activeSipBridgeId) this._sipBridgeId = activeSipBridgeId;
        this._isCaller = direction === "outgoing" || this._isCaller;
        this._outgoingIntentAt = 0;
        this._polite = !this._isCaller;
        if (!this._callStart) {
          const startedAt = Number(this._activeCallAttr("started_at", 0));
          this._callStart = startedAt > 0 ? startedAt * 1000 : Date.now();
        }
        const isSipCall = activeCallType === "sip" ||
          String(this._currentRemoteNode || "").startsWith("sip:") ||
          String(this._currentRemoteNode || "").startsWith("asterisk:");
        if (isSipCall) {
          if (this._sipBridgeId) {
            this._startSIPCall(this._sipBridgeId).catch(e => console.error("[Simson] SIP state active start:", e));
          } else {
            console.warn("[Simson] Active SIP state missing sip_bridge_id", { callId, remote: this._currentRemoteNode });
          }
        } else {
          this._startWebRTC();
        }
      } else if (effectiveCallState === "idle" && prev !== "idle") {
        this._stopRingtone(); this._removePopup(); this._dismissBrowserNotification();
        this._cleanupWebRTC();
        this._callStart = null; this._currentCallId = null;
        this._currentRemoteNode = null; this._ignoredCallId = null;
        this._isCaller = false; this._outgoingIntentAt = 0;
        setTimeout(() => this._loadHistory(), 2000);
      }
    }

    if (isRinging && isMyCall && !this._currentCallId && callId) {
      this._currentCallId = callId;
      this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
    }


return {nodeId, connected, direction, isIdle, isIncoming, isRinging, isActive, hasCall, activeCallType, remoteLabel, callId};
}
