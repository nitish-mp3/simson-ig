/**
 * Simson Call Relay — Lovelace Card v2.2.0
 *
 * Full WebRTC voice calling between HA instances.
 * WebRTC signals travel through HA WebSocket (avoids HTTPS→HTTP mixed content).
 *
 * Config:
 *   type: custom:simson-card
 *   node_id: living_room
 *   target_node_id: office        # optional default dial target
 *   title: Simson                 # optional
 */

const VERSION = "2.2.0";

// Free STUN servers for NAT traversal.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const STYLES = `
  :host { display: block; }

  .card {
    background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 16px;
    font-family: var(--primary-font-family, system-ui, sans-serif);
    color: var(--primary-text-color, #e1e1e1);
    box-shadow: var(--ha-card-box-shadow, none);
  }

  .header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
  }
  .header-icon { width: 36px; height: 36px; background: #03a9f422; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .header-title { font-size: 16px; font-weight: 600; flex: 1; }

  .badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 10px;
    text-transform: uppercase; letter-spacing: .5px; }
  .badge-ok   { background: #1b5e2088; color: #a5d6a7; border: 1px solid #a5d6a740; }
  .badge-err  { background: #b71c1c88; color: #ef9a9a; border: 1px solid #ef9a9a40; }

  /* Dial section */
  .dial-section { margin-bottom: 14px; }
  .dial-label { font-size: 11px; color: var(--secondary-text-color, #888);
    margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
  .input-row { display: flex; gap: 8px; }
  .node-input {
    flex: 1; background: #2a2a2a; border: 1px solid #444; border-radius: 8px;
    padding: 9px 12px; color: var(--primary-text-color, #e1e1e1); font-size: 14px;
    outline: none; transition: border-color .2s;
  }
  .node-input:focus { border-color: #03a9f4; }
  .node-input[disabled] { opacity: .5; cursor: not-allowed; }

  /* Buttons */
  .btn {
    border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s;
    display: flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .btn:active { transform: scale(.96); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-call   { background: #2e7d32; color: #fff; }
  .btn-answer { background: #1565c0; color: #fff; }
  .btn-reject { background: #b71c1c; color: #fff; }
  .btn-hangup { background: #b71c1c; color: #fff; }
  .btn-mute   { background: #444; color: #fff; min-width: 44px; justify-content: center; }
  .btn-mute.muted { background: #e65100; }

  /* Call panel */
  .call-panel {
    background: #1a2940; border: 1px solid #1565c044; border-radius: 10px;
    padding: 12px 14px; margin-bottom: 14px;
  }
  .call-panel.incoming {
    background: #1a2700; border-color: #33691e55;
    animation: pulse-incoming 1.5s infinite;
  }
  @keyframes pulse-incoming {
    0%, 100% { border-color: #33691e55; }
    50% { border-color: #8bc34a99; }
  }
  .call-who { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .call-meta { font-size: 12px; color: #888; margin-bottom: 10px; }
  .call-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  .timer { font-size: 12px; color: #888; font-variant-numeric: tabular-nums; }

  /* Audio quality indicator */
  .quality-bar { display: flex; gap: 2px; align-items: flex-end; height: 14px; margin-left: auto; }
  .quality-bar .bar { width: 3px; background: #4caf50; border-radius: 1px; transition: background .3s; }
  .quality-bar .bar.weak { background: #f44336; }
  .quality-bar .bar.fair { background: #ff9800; }

  hr { border: none; border-top: 1px solid #333; margin: 14px 0; }

  .status-row {
    display: flex; align-items: center; gap: 8px; font-size: 12px;
    color: var(--secondary-text-color, #888);
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-ok  { background: #4caf50; }
  .dot-err { background: #f44336; }

  .mic-denied {
    background: #b71c1c33; border: 1px solid #f4433633; border-radius: 8px;
    padding: 10px 14px; font-size: 13px; color: #ef9a9a; margin-bottom: 14px;
  }
`;

class SimsonCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._targetInput = "";

    // WebRTC state
    this._pc = null;
    this._localStream = null;
    this._remoteAudio = null;
    this._muted = false;
    this._micAllowed = null; // null=unknown, true=allowed, false=denied
    this._audioQuality = 3; // 0-3 bars
    this._statsInterval = null;

    // HA WebSocket event subscription (for WebRTC signals).
    this._haEventUnsub = null;
    this._haEventSubscribed = false;

    // Call timer
    this._callStart = null;
    this._timerInterval = null;

    // Call state transition tracking (for triggering WebRTC from entity changes).
    this._prevCallState = "idle";

    // Current call context for WebRTC
    this._currentCallId = null;
    this._currentRemoteNode = null;
    this._isInitiator = false;
    this._pendingCandidates = [];

    // Ringtone
    this._ringCtx = null;
    this._ringLoop = null;
  }

  setConfig(config) {
    if (!config.node_id) throw new Error("simson-card requires node_id");
    this._config = {
      title: config.title || "Simson",
      node_id: config.node_id,
      target_node_id: config.target_node_id || "",
    };
    this._targetInput = this._config.target_node_id;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Subscribe to HA events once we have a hass connection.
    if (!this._haEventSubscribed) {
      this._subscribeHAEvents();
    }
    this._render();
  }

  connectedCallback() {
    this._timerInterval = setInterval(() => this._updateTimer(), 1000);
    if (this._hass && !this._haEventSubscribed) {
      this._subscribeHAEvents();
    }
  }

  disconnectedCallback() {
    clearInterval(this._timerInterval);
    this._unsubscribeHAEvents();
    this._cleanupWebRTC();
  }

  // ── HA WebSocket event subscription ─────────────────────────────────
  // WebRTC signals are delivered as HA events, not via direct HTTP.
  // This works through the existing HTTPS WebSocket connection,
  // so there are no mixed-content issues regardless of HTTP/HTTPS.

  _subscribeHAEvents() {
    if (!this._hass?.connection) return;
    this._haEventSubscribed = true;
    this._hass.connection.subscribeEvents(
      (haEvent) => this._onHAWebRTCSignal(haEvent.data),
      "simson_webrtc_signal",
    ).then(unsub => {
      this._haEventUnsub = unsub;
    }).catch(e => {
      console.warn("Simson: failed to subscribe to HA events:", e);
      this._haEventSubscribed = false;
    });
  }

  _unsubscribeHAEvents() {
    if (this._haEventUnsub) {
      this._haEventUnsub();
      this._haEventUnsub = null;
    }
    this._haEventSubscribed = false;
  }

  // Called when a simson_webrtc_signal HA event arrives.
  // event = { call_id, from_node_id, signal_type, data }
  _onHAWebRTCSignal(event) {
    this._handleWebRTCSignal(event);
  }

  // ── Data helpers (HA entity state) ───────────────────────────────────

  _entity(suffix) {
    return this._hass?.states[`sensor.simson_${this._config.node_id}_${suffix}`];
  }
  _val(suffix, fallback = "unknown") {
    return this._entity(suffix)?.state ?? fallback;
  }
  _attr(suffix, key, fallback = null) {
    return this._entity(suffix)?.attributes?.[key] ?? fallback;
  }

  _isConnected() { return this._val("connection") === "connected"; }
  _callState() { return this._val("call_state", "idle"); }
  _activeCallAttr(key, fallback = "") {
    return this._attr("call_state", key, fallback);
  }

  // ── HA service calls ─────────────────────────────────────────────────

  async _callService(service, data = {}) {
    if (!this._hass) return;
    await this._hass.callService("simson", service, data);
    setTimeout(() => this._render(), 600);
  }

  _dial() {
    const root = this._root();
    const target = root.querySelector("#target-input")?.value?.trim();
    if (!target) return;
    this._isInitiator = true;
    this._currentRemoteNode = target;
    this._callStart = null;
    this._callService("make_call", { target_node_id: target, call_type: "voice" });
  }

  _answer() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    this._stopRingtone();
    this._callStart = Date.now();
    this._callService("answer_call", { call_id: callId });
  }

  _reject() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    this._stopRingtone();
    this._callService("reject_call", { call_id: callId, reason: "declined" });
  }

  _hangup() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    this._callStart = null;
    this._cleanupWebRTC();
    this._callService("hangup_call", { call_id: callId });
  }

  _toggleMute() {
    this._muted = !this._muted;
    if (this._localStream) {
      this._localStream.getAudioTracks().forEach(t => { t.enabled = !this._muted; });
    }
    this._render();
  }

  // ── WebRTC ───────────────────────────────────────────────────────────

  async _startWebRTC() {
    if (this._pc) return;

    // Get microphone.
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._micAllowed = true;
    } catch (e) {
      console.error("Microphone access denied:", e);
      this._micAllowed = false;
      this._render();
      return;
    }

    // Create peer connection.
    this._pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this._pendingCandidates = [];

    // Add local audio tracks.
    this._localStream.getTracks().forEach(track => {
      this._pc.addTrack(track, this._localStream);
    });

    // Remote audio element — autoplay the incoming stream.
    this._remoteAudio = new Audio();
    this._remoteAudio.autoplay = true;

    this._pc.ontrack = (ev) => {
      this._remoteAudio.srcObject = ev.streams[0];
    };

    // ICE candidates → relay via HA service → addon API → VPS → remote.
    this._pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this._sendWebRTCSignal("ice-candidate", {
          candidate: ev.candidate.candidate,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex,
        });
      }
    };

    // Monitor connection state.
    this._pc.onconnectionstatechange = () => {
      const state = this._pc?.connectionState;
      if (state === "connected") this._audioQuality = 3;
      else if (state === "disconnected") this._audioQuality = 1;
      else if (state === "failed") { this._audioQuality = 0; this._cleanupWebRTC(); }
      this._render();
    };

    this._statsInterval = setInterval(() => this._updateQuality(), 3000);

    // Initiator creates offer; callee waits for offer via HA event subscription.
    if (this._isInitiator) {
      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);
      this._sendWebRTCSignal("offer", { sdp: offer.sdp, type: offer.type });
    }
  }

  async _handleWebRTCSignal(event) {
    const { signal_type, data } = event;

    if (signal_type === "offer") {
      if (!this._pc) await this._startWebRTC();
      if (!this._pc) return; // Mic denied.
      await this._pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await this._pc.createAnswer();
      await this._pc.setLocalDescription(answer);
      this._sendWebRTCSignal("answer", { sdp: answer.sdp, type: answer.type });
      for (const c of this._pendingCandidates) {
        await this._pc.addIceCandidate(new RTCIceCandidate(c));
      }
      this._pendingCandidates = [];

    } else if (signal_type === "answer") {
      if (this._pc) {
        await this._pc.setRemoteDescription(new RTCSessionDescription(data));
        for (const c of this._pendingCandidates) {
          await this._pc.addIceCandidate(new RTCIceCandidate(c));
        }
        this._pendingCandidates = [];
      }

    } else if (signal_type === "ice-candidate") {
      if (this._pc && this._pc.remoteDescription) {
        await this._pc.addIceCandidate(new RTCIceCandidate(data));
      } else {
        this._pendingCandidates.push(data);
      }
    }
  }

  // Send a WebRTC signal via HA service (server-side relay — no mixed content).
  _sendWebRTCSignal(signalType, data) {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    const toNode = this._currentRemoteNode;
    if (!callId || !toNode || !this._hass) return;

    this._hass.callService("simson", "send_webrtc_signal", {
      call_id: callId,
      to_node_id: toNode,
      signal_type: signalType,
      data: data,
    }).catch(e => console.warn("Simson: WebRTC signal send failed:", e));
  }

  _cleanupWebRTC() {
    if (this._statsInterval) { clearInterval(this._statsInterval); this._statsInterval = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    if (this._remoteAudio) {
      this._remoteAudio.srcObject = null;
      this._remoteAudio = null;
    }
    this._muted = false;
    this._audioQuality = 3;
    this._pendingCandidates = [];
    this._stopRingtone();
  }

  async _updateQuality() {
    if (!this._pc) return;
    try {
      const stats = await this._pc.getStats();
      let jitter = 0, packetsLost = 0, packetsReceived = 0;
      stats.forEach(report => {
        if (report.type === "inbound-rtp" && report.kind === "audio") {
          jitter = report.jitter || 0;
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 1;
        }
      });
      const lossRate = packetsLost / Math.max(packetsReceived, 1);
      if (lossRate > 0.1 || jitter > 0.1) this._audioQuality = 1;
      else if (lossRate > 0.03 || jitter > 0.05) this._audioQuality = 2;
      else this._audioQuality = 3;
      this._render();
    } catch (e) { /* ignore */ }
  }

  // ── Ringtone ─────────────────────────────────────────────────────────

  _playRingtone() {
    this._stopRingtone();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._ringCtx = ctx;
      this._ringLoop = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.frequency.value = 480;
          gain2.gain.setValueAtTime(0.15, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.4);
        }, 200);
      }, 3000);
    } catch (e) { /* audio context not available */ }
  }

  _stopRingtone() {
    if (this._ringLoop) { clearInterval(this._ringLoop); this._ringLoop = null; }
    if (this._ringCtx) { this._ringCtx.close().catch(() => {}); this._ringCtx = null; }
  }

  // ── Render ───────────────────────────────────────────────────────────

  _root() { return this.shadowRoot; }

  _render() {
    if (!this._config.node_id) return;

    const connected = this._isConnected();
    const callState = this._callState();
    const isIdle     = callState === "idle" || callState === "unknown";
    const isIncoming = callState === "incoming";
    const isRinging  = callState === "requesting" || callState === "ringing";
    const isActive   = callState === "active";
    const hasCall    = !isIdle;
    const hasWebRTC  = !!this._pc;

    const remoteLabel = this._activeCallAttr("remote_label") ||
                        this._activeCallAttr("remote_node_id") ||
                        this._currentRemoteNode || "Unknown";
    const callId    = this._activeCallAttr("call_id", "") || this._currentCallId || "";
    const direction = this._activeCallAttr("direction", "");

    // Sync call context from entity attributes.
    if (callId && !this._currentCallId) this._currentCallId = callId;
    if (hasCall && !this._currentRemoteNode) {
      this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
    }

    // ── State-transition detection ────────────────────────────────────
    // React to entity state changes without depending on SSE or direct HTTP.
    const prev = this._prevCallState;
    if (prev !== callState) {
      this._prevCallState = callState;

      if (callState === "incoming" && prev === "idle") {
        // Incoming call — start ringtone.
        this._isInitiator = false;
        this._currentCallId = callId;
        this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
        this._playRingtone();

      } else if (callState === "active" && prev !== "active") {
        // Call became active — kick off WebRTC.
        this._stopRingtone();
        this._isInitiator = (direction === "outgoing");
        this._currentCallId = callId;
        this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
        if (!this._callStart) this._callStart = Date.now();
        this._startWebRTC(); // async, will render again when mic granted

      } else if (callState === "idle" && prev !== "idle") {
        // Call ended — tear down WebRTC.
        this._stopRingtone();
        this._cleanupWebRTC();
        this._callStart = null;
        this._currentCallId = null;
        this._currentRemoteNode = null;
      }
    }

    // Outgoing ringing — keep call context synced.
    if (isRinging && !this._currentCallId && callId) {
      this._currentCallId = callId;
      this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
    }

    const badgeClass = connected ? "badge-ok" : "badge-err";
    const badgeText  = connected ? "Online" : "Offline";
    const connDot    = connected ? "dot-ok" : "dot-err";
    const nodeId     = this._attr("connection", "node_id", this._config.node_id);
    const accountId  = this._attr("connection", "account_id", "");

    // Quality bars.
    const q = this._audioQuality;
    const barHtml = isActive && hasWebRTC ? `
      <div class="quality-bar" title="Audio quality">
        <div class="bar ${q < 1 ? "weak" : ""}" style="height:4px"></div>
        <div class="bar ${q < 2 ? (q < 1 ? "weak" : "fair") : ""}" style="height:8px"></div>
        <div class="bar ${q < 3 ? (q < 2 ? "weak" : "fair") : ""}" style="height:12px"></div>
      </div>` : "";

    // Mic denied warning.
    const micWarning = this._micAllowed === false
      ? `<div class="mic-denied">\u{1F3A4} Microphone access denied. Click the lock icon in your browser\u2019s address bar to allow microphone access, then reload.</div>`
      : "";

    // Call panel.
    const callPanelHtml = hasCall ? `
      <div class="call-panel ${isIncoming ? "incoming" : ""}">
        <div class="call-who">${this._escapeHtml(remoteLabel)}</div>
        <div class="call-meta">
          ${direction === "incoming" ? "\u2B07 Incoming" : "\u2B06 Outgoing"}
          ${isActive ? ` \u00B7 <span class="timer" id="call-timer">00:00</span>` : ""}
          ${isIncoming ? " \u00B7 Ringing..." : ""}
          ${isRinging  ? " \u00B7 Calling..." : ""}
          ${barHtml}
        </div>
        <div class="call-actions">
          ${isIncoming
            ? `<button class="btn btn-answer" id="btn-answer">\u{1F4DE} Answer</button>
               <button class="btn btn-reject" id="btn-reject">\u274C Decline</button>`
            : `<button class="btn btn-mute ${this._muted ? "muted" : ""}" id="btn-mute"
                  ${!isActive ? "disabled" : ""}>${this._muted ? "\u{1F507}" : "\u{1F50A}"}</button>
               <button class="btn btn-hangup" id="btn-hangup">\u{1F4F4} Hang Up</button>`
          }
        </div>
      </div>` : "";

    const html = `
      <style>${STYLES}</style>
      <div class="card">
        <div class="header">
          <div class="header-icon">\u{1F4DE}</div>
          <div class="header-title">${this._escapeHtml(this._config.title)}</div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        ${micWarning}
        ${callPanelHtml}

        ${isIdle ? `
        <div class="dial-section">
          <div class="dial-label">Dial</div>
          <div class="input-row">
            <input id="target-input" class="node-input" type="text"
              placeholder="node_id (e.g. office)"
              value="${this._escapeHtml(this._targetInput)}"
              ${!connected ? "disabled" : ""} />
            <button class="btn btn-call" id="btn-call" ${!connected ? "disabled" : ""}>
              \u{1F4DE} Call
            </button>
          </div>
        </div>` : ""}

        <hr/>
        <div class="status-row">
          <div class="dot ${connDot}"></div>
          <span>${this._escapeHtml(nodeId)}${accountId ? " \u00B7 " + this._escapeHtml(accountId) : ""}</span>
        </div>
      </div>`;

    // Save focus state before DOM replacement.
    const root = this._root();
    const wasInputFocused = root.activeElement?.id === "target-input";
    const selStart = wasInputFocused ? root.querySelector("#target-input")?.selectionStart : null;
    const selEnd   = wasInputFocused ? root.querySelector("#target-input")?.selectionEnd   : null;

    root.innerHTML = html;

    // Bind events.
    root.querySelector("#btn-call")?.addEventListener("click", () => this._dial());
    root.querySelector("#btn-answer")?.addEventListener("click", () => this._answer());
    root.querySelector("#btn-reject")?.addEventListener("click", () => this._reject());
    root.querySelector("#btn-hangup")?.addEventListener("click", () => this._hangup());
    root.querySelector("#btn-mute")?.addEventListener("click", () => this._toggleMute());

    const inputEl = root.querySelector("#target-input");
    if (inputEl) {
      inputEl.addEventListener("input", e => { this._targetInput = e.target.value; });
      inputEl.addEventListener("keydown", e => { if (e.key === "Enter") this._dial(); });
      if (wasInputFocused) {
        inputEl.focus();
        inputEl.setSelectionRange(selStart, selEnd);
      }
    }

    if (isActive) this._updateTimer();
  }

  _updateTimer() {
    if (!this._callStart) return;
    const el = this._root()?.querySelector("#call-timer");
    if (!el) return;
    const secs = Math.floor((Date.now() - this._callStart) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
  }

  _escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  static getConfigElement() { return document.createElement("div"); }
  static getStubConfig() {
    return { node_id: "living_room", target_node_id: "", title: "Simson" };
  }
  getCardSize() { return 3; }
}

customElements.define("simson-card", SimsonCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simson-card",
  name: "Simson Call Relay",
  description: "Voice calling between Home Assistant instances with WebRTC audio",
  preview: false,
  documentationURL: "https://github.com/nitish-mp3/simson-ig",
});

console.info(
  `%c SIMSON-CARD %c v${VERSION} `,
  "background:#03a9f4;color:#000;font-weight:700;padding:2px 4px;border-radius:4px 0 0 4px",
  "background:#333;color:#fff;padding:2px 4px;border-radius:0 4px 4px 0",
);
