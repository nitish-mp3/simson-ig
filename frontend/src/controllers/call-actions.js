export const withCallActions = Base => class extends Base {
_beginOutgoingCall(remoteNode) {
    this._currentRemoteNode = remoteNode || this._currentRemoteNode;
    this._callStart = null;
    this._isCaller = true;
    this._polite = false;
    this._answeredByMe = false;
    this._answerPendingCallId = null;
    this._outgoingIntentAt = Date.now();
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
    this._render();
  }

async _runAction(key, fn, minMs = 650) {
    const actionKey = String(key || "action");
    const now = Date.now();
    if (this._actionLocks.has(actionKey)) return;
    if (now - (this._lastActionAt[actionKey] || 0) < minMs) return;
    this._lastActionAt[actionKey] = now;
    this._actionLocks.add(actionKey);
    this._actionError = '';
    try {
      await Promise.resolve(fn());
    } catch (err) {
      console.error("[Simson] action failed:", actionKey, err);
      this._actionError = err?.message || 'The action could not complete. Please retry.';
      this._render();
    } finally {
      setTimeout(() => this._actionLocks.delete(actionKey), minMs);
    }
  }

_bindAction(el, key, fn, minMs = 650) {
    if (!el) return;
    const handler = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._runAction(key, fn, minMs);
    };
    el.addEventListener("pointerup", handler);
    el.addEventListener("click", handler);
  }

_dial(nodeId, targetUserId, targetUserName) {
    if (!nodeId) return;
    this._beginOutgoingCall(nodeId);
    const data = { target_node_id: nodeId, call_type: this._videoEnabled ? "video" : "voice", caller_user_id: this._hass?.user?.id || "" };
    if (targetUserId) {
      data.target_user_id = targetUserId;
      data.target_user_name = targetUserName || "";
    }
    return this._callService("make_call", data);
  }

_dialTarget(targetId, targetType, nodeId) {
    this._beginOutgoingCall(nodeId || targetId);
    const sipTypes = ["asterisk", "sip", "gateway"];
    return this._callService("make_call", {
      target_id: targetId,
      call_type: sipTypes.includes(targetType) ? "sip" : this._videoEnabled ? "video" : "voice",
      caller_user_id: this._hass?.user?.id || "",
    });
  }

_dialSIPExtension(extension) {
    if (!extension) return;
    if (this._looksLikePhoneNumber(extension)) {
      const trunk = this._effectivePstnTrunk();
      return this._dialPSTNNumber(extension, trunk);
    }
    this._beginOutgoingCall(extension);
    return this._callService("make_call", {
      target_id: `asterisk_${extension}`,
      call_type: "sip",
      caller_user_id: this._hass?.user?.id || "",
    });
  }

_dialPSTNNumber(number, trunk = "") {
    const cleaned = String(number || "").replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/^\+/, "");
    if (!digits) return;
    const effectiveTrunk = String(trunk || this._effectivePstnTrunk()).trim();
    this._beginOutgoingCall(`phone:${cleaned}`);
    return this._callService("make_call", {
      phone_number: cleaned,
      trunk: effectiveTrunk,
      call_type: "sip",
      caller_user_id: this._hass?.user?.id || "",
    });
  }

_looksLikePhoneNumber(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    return (raw.startsWith("+") && digits.length >= 7) || digits.length >= 7;
  }

_clearLocalCallState() {
    this._callStart = null;
    this._currentCallId = null;
    this._currentRemoteNode = null;
    this._sipBridgeId = null;
    this._isCaller = false;
    this._answeredByMe = false;
    this._answerPendingCallId = null;
    this._outgoingIntentAt = 0;
    this._prevCallState = "idle";
    this._render();
  }

_answer() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    if (!callId) return;
    // Clear incoming timeout since call is being answered.
    if (this._incomingCallTimeout) {
      clearTimeout(this._incomingCallTimeout);
      this._incomingCallTimeout = null;
    }
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
    this._callStart = Date.now();
    this._answeredByMe = true;
    this._answerPendingCallId = callId;
    this._currentCallId = callId;
    // Cancel any incoming suppression so the call can proceed normally
    this._incomingSuppressUntil = 0;
    this._callService("answer_call", {
      call_id: callId,
      answered_by_user_id: this._hass?.user?.id || "",
    });
    // If Asterisk ConfBridge bridge ID is known, join via SIP UA
    if (this._sipBridgeId) {
      this._startSIPCall(this._sipBridgeId).catch(e => console.error("[Simson] SIP answer start:", e));
    }
  }

_reject() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    // Clear incoming timeout since call is being rejected.
    if (this._incomingCallTimeout) {
      clearTimeout(this._incomingCallTimeout);
      this._incomingCallTimeout = null;
    }
    // Fire-and-forget — don't wait for server. If the call already timed out,
    // this will fail silently, but the UI clears immediately regardless.
    this._callService("reject_call", { call_id: callId, reason: "declined" }).catch(() => {});
    // Clear all local call state right now, before the server responds.
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
    this._ignoredCallId = callId;
    this._currentCallId = null;
    this._currentRemoteNode = null;
    this._sipBridgeId = null;
    this._isCaller = false;
    this._callStart = null;
    this._answeredByMe = false;
    this._answerPendingCallId = null;
    this._outgoingIntentAt = 0;
    this._prevCallState = "idle"; // reset transition tracking
    // Suppress any new incoming call popup for 8 s so the phone spam
    // doesn't immediately re-open the popup after the user dismisses it.
    this._incomingSuppressUntil = Date.now() + 8000;
    this._render();
  }

_hangup() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    try { this._sipUA?.hangup(); } catch (e) { /* ignore */ }
    this._cleanupWebRTC();
    this._clearLocalCallState();
    if (callId) this._callService("hangup_call", { call_id: callId });
  }

_transferCall(targetNodeId, targetUserId = "", targetUserName = "") {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    const nodeId = String(targetNodeId || "").trim();
    if (!callId || !nodeId) return;
    this._callService("transfer_call", {
      call_id: callId,
      target_node_id: nodeId,
      target_user_id: targetUserId || "",
      target_user_name: targetUserName || "",
    });
  }

_loadTransferUsers(nodeId) {
    const target = String(nodeId || "").trim();
    if (!target) return;
    const cached = this._usersCache[target];
    this._transferNodeDraft = target;
    this._transferUsersNode = target;
    if (cached && Date.now() - cached.timestamp < 30000) {
      this._transferUsers = cached.users || [];
      this._transferLoading = false;
      this._render();
      return;
    }
    this._transferUsers = [];
    this._transferLoading = true;
    this._render();
    this._callService("get_remote_users", { node_id: target }).catch(() => {
      this._transferLoading = false;
      this._render();
    });
  }

_toggleMute() {
    this._muted = !this._muted;
    if (this._localStream) {
      this._localStream.getAudioTracks().forEach(t => { t.enabled = !this._muted; });
    }
    this._sipUA?._localStream?.getAudioTracks().forEach(track => { track.enabled = !this._muted; });
    this._render();
  }

_toggleCamera() {
    this._cameraMuted = !this._cameraMuted;
    this._localStream?.getVideoTracks().forEach(track => { track.enabled = !this._cameraMuted; });
    this._render();
  }

_smartDialRoute(value, forcedMode = this._smartRouteMode || "auto") {
    const raw = String(value || "").trim();
    const mode = String(forcedMode || "auto").toLowerCase();
    if (!raw) return { kind: "ready", label: "Ready", icon: "\u{1F50E}", hint: "Type extension, phone number, or node" };
    if (mode === "sip") return { kind: "sip", label: "SIP", icon: "\u{260E}", hint: "Forced SIP extension route" };
    if (mode === "pstn") return { kind: "pstn", label: "Gateway", icon: "\u{1F4F2}", hint: `Forced outside call via trunk ${this._effectivePstnTrunk()}` };
    if (mode === "node") return { kind: "node", label: "HAOS", icon: "\u{1F3E0}", hint: "Forced Home Assistant node/user route" };

    const lowered = raw.toLowerCase();
    const normalized = raw.replace(/[^\d+]/g, "");
    const digitsOnly = normalized.replace(/\D/g, "");
    if (/^sip:/i.test(raw) || /^ext:/i.test(raw)) {
      return { kind: "sip", label: "SIP", icon: "\u{260E}", hint: "Calls an internal SIP extension" };
    }
    if (/^node:/i.test(raw) || /^haos:/i.test(raw)) {
      return { kind: "node", label: "HAOS", icon: "\u{1F3E0}", hint: "Calls a Home Assistant node/user" };
    }
    if (/^\d{1,6}$/.test(raw)) {
      return { kind: "sip", label: "SIP", icon: "\u{260E}", hint: "Numeric values up to 6 digits are SIP extensions" };
    }
    if (normalized.startsWith("+") || digitsOnly.length >= 7) {
      return { kind: "pstn", label: "Gateway", icon: "\u{1F4F2}", hint: `Uses trunk ${this._effectivePstnTrunk()}` };
    }
    const knownNode = this._getNodeTargets().find(t =>
      String(t.node_id || t.id || "").toLowerCase() === lowered ||
      String(t.label || "").toLowerCase() === lowered
    );
    if (knownNode || /^[a-z][a-z0-9_-]{1,}$/i.test(raw)) {
      return { kind: "node", label: "HAOS", icon: "\u{1F3E0}", hint: "Calls a Home Assistant node/user" };
    }
    return { kind: "sip", label: "SIP", icon: "\u{260E}", hint: "Defaulting to SIP; switch route if needed" };
  }

_dialSmartValue(value, trunk = "") {
    const raw = String(value || "").trim();
    if (!raw) return;
    const route = this._smartDialRoute(raw);
    this._nodeInputDraft = raw;
    if (route.kind === "pstn") {
      const activeTrunk = String(trunk || this._pstnTrunkDraft || this._effectivePstnTrunk(false) || "").trim();
      this._pstnDialDraft = raw;
      this._pstnTrunkDraft = activeTrunk;
      return this._dialPSTNNumber(raw, activeTrunk);
    }
    if (route.kind === "sip") {
      const ext = raw.replace(/^sip:/i, "").replace(/^ext:/i, "").trim();
      this._sipDialDraft = ext;
      return this._dialSIPExtension(ext);
    }
    const nodeTarget = raw.replace(/^node:/i, "").replace(/^haos:/i, "").trim();
    this._selectedNode = nodeTarget;
    this._userPickerNodeId = nodeTarget;
    this._userPickerTargetId = "";
    return this._callService("get_remote_users", { node_id: nodeTarget });
  }
};
