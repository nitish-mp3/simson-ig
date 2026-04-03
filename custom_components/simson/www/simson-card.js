/**
 * Simson Call Relay — Lovelace Card v2.4.0
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

const VERSION = "2.4.0";

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
    padding: 10px 14px; font-size: 13px; color: #ef9a9a; margin-bottom: 14px; line-height: 1.5;
  }
  .insecure-warning {
    background: #e6510033; border: 1px solid #ff980033; border-radius: 8px;
    padding: 10px 14px; font-size: 13px; color: #ffcc80; margin-bottom: 14px; line-height: 1.5;
  }

  /* Quick-dial buttons */
  .quick-dial { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .btn-quick-dial {
    flex: 1 1 auto; min-width: 100px; background: #1a2940; border: 1px solid #1565c044;
    color: #90caf9; border-radius: 8px; padding: 10px 14px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: background .15s, transform .1s;
    display: flex; align-items: center; gap: 6px; justify-content: center; white-space: nowrap;
  }
  .btn-quick-dial:hover { background: #1e3a5f; }
  .btn-quick-dial:active { transform: scale(.96); }
  .btn-quick-dial:disabled { opacity: .4; cursor: not-allowed; transform: none; }
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
    this._muted = false;
    this._micAllowed = null; // null=unknown, true=allowed, false=denied
    this._audioQuality = 3; // 0-3 bars
    this._statsInterval = null;
    this._startingWebRTC = false; // guard against concurrent _startWebRTC calls
    this._pendingOffer = null;    // buffer SDP offer that arrives while getUserMedia is pending

    // Persistent audio element — lives in shadow root, NOT in innerHTML.
    // Keeping it out of the re-rendered HTML means it survives _render() calls
    // and avoids browser autoplay-policy blocks on detached Audio() objects.
    this._remoteAudio = document.createElement("audio");
    this._remoteAudio.autoplay = true;
    this._remoteAudio.setAttribute("playsinline", "");
    this.shadowRoot.appendChild(this._remoteAudio);

    // HA WebSocket event subscription (for WebRTC signals + call status).
    this._haEventUnsub = null;
    this._haStatusUnsub = null;
    this._haIncomingUnsub = null;
    this._haEventSubscribed = false;

    // Call timer
    this._callStart = null;
    this._timerInterval = null;

    // Call state transition tracking (for triggering WebRTC from entity changes).
    this._prevCallState = "idle";

    // Current call context for WebRTC
    this._currentCallId = null;
    this._currentRemoteNode = null;
    // Perfect negotiation: polite peer rolls back on offer collision.
    // Determined by node_id string comparison — no reliance on call direction.
    this._polite = false;
    this._makingOffer = false;   // true while createOffer → setLocalDescription in flight
    this._pendingCandidates = [];

    // Ringtone
    this._ringCtx = null;
    this._ringLoop = null;
  }

  setConfig(config) {
    // Backwards compat: old simson-call-card used connection_entity instead of node_id.
    let nodeId = config.node_id;
    if (!nodeId && config.connection_entity) {
      const m = config.connection_entity.match(/^sensor\.simson_(.+)_connection$/);
      if (m) nodeId = m[1];
    }
    if (!nodeId) throw new Error("simson-card requires node_id (or connection_entity)");

    // target_nodes can be strings or {id, label} objects.
    const targets = (config.target_nodes || []).map(n =>
      typeof n === "string" ? { id: n, label: n } : { id: n.id, label: n.label || n.id }
    );

    this._config = {
      title: config.title || "Simson",
      node_id: nodeId,
      target_node_id: config.target_node_id || "",
      target_nodes: targets,
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

    // 1. WebRTC signal relay (SDP offers/answers, ICE candidates).
    this._hass.connection.subscribeEvents(
      (haEvent) => this._onHAWebRTCSignal(haEvent.data),
      "simson_webrtc_signal",
    ).then(unsub => {
      this._haEventUnsub = unsub;
      console.info("Simson: subscribed to simson_webrtc_signal events");
    }).catch(e => {
      console.warn("Simson: failed to subscribe to webrtc events:", e);
      this._haEventSubscribed = false;
    });

    // 2. Call status events — enables INSTANT WebRTC kick-off without
    //    waiting for the 5-second entity poll cycle.
    this._hass.connection.subscribeEvents(
      (haEvent) => this._onHACallStatus(haEvent.data),
      "simson_call_status",
    ).then(unsub => {
      this._haStatusUnsub = unsub;
      console.info("Simson: subscribed to simson_call_status events");
    }).catch(e => {
      console.warn("Simson: failed to subscribe to call_status events:", e);
    });

    // 3. Incoming call events — faster ringtone start.
    this._hass.connection.subscribeEvents(
      (haEvent) => this._onHAIncomingCall(haEvent.data),
      "simson_incoming_call",
    ).then(unsub => {
      this._haIncomingUnsub = unsub;
      console.info("Simson: subscribed to simson_incoming_call events");
    }).catch(e => {
      console.warn("Simson: failed to subscribe to incoming_call events:", e);
    });
  }

  _unsubscribeHAEvents() {
    if (this._haEventUnsub) { this._haEventUnsub(); this._haEventUnsub = null; }
    if (this._haStatusUnsub) { this._haStatusUnsub(); this._haStatusUnsub = null; }
    if (this._haIncomingUnsub) { this._haIncomingUnsub(); this._haIncomingUnsub = null; }
    this._haEventSubscribed = false;
  }

  // ── HA event handlers (real-time, no polling delay) ─────────────────

  _onHAWebRTCSignal(event) {
    console.info("Simson: ← received webrtc signal: %s (call=%s, from=%s)",
      event.signal_type, event.call_id, event.from_node_id);
    this._handleWebRTCSignal(event);
  }

  _onHACallStatus(event) {
    const { call_id, status, direction, remote_node_id } = event;
    console.info("Simson: ← call_status event: status=%s call=%s dir=%s remote=%s",
      status, call_id, direction, remote_node_id);

    if (status === "active") {
      // Call just became active — start WebRTC IMMEDIATELY.
      this._currentCallId = call_id;
      this._currentRemoteNode = remote_node_id;
      // Perfect negotiation: polite = lexicographically smaller node_id backs off on collision.
      // This is deterministic and requires no coordination — works even if direction is wrong.
      this._polite = (this._config.node_id || "") < (remote_node_id || "");
      console.info("Simson: WebRTC role: %s (node=%s remote=%s dir=%s)",
        this._polite ? "polite" : "impolite", this._config.node_id, remote_node_id, direction);
      if (!this._callStart) this._callStart = Date.now();
      this._stopRingtone();
      this._startWebRTC();
      this._render();
    } else if (status === "ended" || status === "failed") {
      this._stopRingtone();
      this._cleanupWebRTC();
      this._callStart = null;
      this._currentCallId = null;
      this._currentRemoteNode = null;
      this._render();
    }
  }

  _onHAIncomingCall(event) {
    const { call_id, from_node_id, from_label } = event;
    console.info("Simson: ← incoming_call event: call=%s from=%s (%s)",
      call_id, from_node_id, from_label);
    this._currentCallId = call_id;
    this._currentRemoteNode = from_node_id;
    this._playRingtone();
    this._render();
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
    if (this._startingWebRTC) return; // guard against concurrent calls
    this._startingWebRTC = true;
    console.info("Simson: starting WebRTC (polite=%s, callId=%s, remoteNode=%s)",
      this._polite, this._currentCallId, this._currentRemoteNode);

    // Check secure context — getUserMedia requires HTTPS (or localhost).
    if (!window.isSecureContext) {
      console.error("Simson: not a secure context — getUserMedia requires HTTPS. URL:", location.href);
      this._micAllowed = false;
      this._startingWebRTC = false;
      this._render();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("Simson: getUserMedia not available on this browser/context");
      this._micAllowed = false;
      this._startingWebRTC = false;
      this._render();
      return;
    }

    // Get microphone.
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._micAllowed = true;
      console.info("Simson: microphone access granted");
    } catch (e) {
      console.error("Simson: microphone access denied:", e);
      this._micAllowed = false;
      this._startingWebRTC = false;
      this._render();
      return;
    }

    // Create peer connection.
    this._pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this._pendingCandidates = [];
    this._makingOffer = false;

    // Add local audio tracks.
    this._localStream.getTracks().forEach(track => {
      this._pc.addTrack(track, this._localStream);
    });

    // Remote audio element — already created in constructor and attached.
    this._pc.ontrack = (ev) => {
      console.info("Simson: remote audio track received, %d stream(s)", ev.streams.length);
      if (ev.streams && ev.streams[0]) {
        this._remoteAudio.srcObject = ev.streams[0];
      } else {
        // Fallback: create a MediaStream from the track directly.
        const ms = new MediaStream();
        ms.addTrack(ev.track);
        this._remoteAudio.srcObject = ms;
      }
      this._remoteAudio.play().catch(e =>
        console.warn("Simson: remote audio play() blocked (will retry on user gesture):", e)
      );
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

    // Perfect negotiation — onnegotiationneeded fires when tracks are added.
    // Both peers attempt to create an offer; collisions are resolved by politeness.
    this._pc.onnegotiationneeded = async () => {
      try {
        this._makingOffer = true;
        console.info("Simson: negotiation needed — creating offer (polite=%s)", this._polite);
        await this._pc.setLocalDescription();
        this._sendWebRTCSignal("offer", { sdp: this._pc.localDescription.sdp, type: this._pc.localDescription.type });
      } catch (e) {
        console.error("Simson: onnegotiationneeded error:", e);
      } finally {
        this._makingOffer = false;
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
    this._startingWebRTC = false;

    // If an offer arrived while getUserMedia was pending, process it now.
    if (this._pendingOffer) {
      console.info("Simson: processing buffered SDP offer");
      const offer = this._pendingOffer;
      this._pendingOffer = null;
      await this._handleWebRTCSignal(offer);
    }
    // onnegotiationneeded fires automatically after addTrack() — no manual createOffer needed.
  }

  async _handleWebRTCSignal(event) {
    const { call_id, from_node_id, signal_type, data } = event;

    // Validate signal belongs to current call.
    if (call_id && this._currentCallId && call_id !== this._currentCallId) {
      console.warn("Simson: ignoring signal for different call: %s (current: %s)", call_id, this._currentCallId);
      return;
    }

    if (signal_type === "offer") {
      console.info("Simson: received SDP offer from %s", from_node_id);
      if (this._startingWebRTC) {
        // getUserMedia is still pending — buffer this offer and process after startup.
        console.info("Simson: WebRTC starting, buffering SDP offer");
        this._pendingOffer = event;
        return;
      }
      if (!this._pc) await this._startWebRTC();
      if (!this._pc) { console.error("Simson: cannot process offer — no PeerConnection"); return; }

      // Perfect negotiation collision detection:
      // If we are also making an offer at the same moment, the polite peer backs off.
      const offerCollision = (this._makingOffer || this._pc.signalingState !== "stable");
      if (offerCollision) {
        if (!this._polite) {
          // Impolite: ignore the incoming offer — our offer takes precedence.
          console.info("Simson: offer collision — impolite peer ignoring remote offer");
          return;
        }
        // Polite: roll back our own offer so we can process the remote one.
        console.info("Simson: offer collision — polite peer rolling back to accept remote offer");
        await this._pc.setLocalDescription({ type: "rollback" });
      }

      await this._pc.setRemoteDescription(new RTCSessionDescription(data));
      await this._pc.setLocalDescription();
      console.info("Simson: sending SDP answer to %s", this._currentRemoteNode);
      this._sendWebRTCSignal("answer", { sdp: this._pc.localDescription.sdp, type: this._pc.localDescription.type });
      for (const c of this._pendingCandidates) {
        await this._pc.addIceCandidate(new RTCIceCandidate(c));
      }
      this._pendingCandidates = [];

    } else if (signal_type === "answer") {
      console.info("Simson: received SDP answer from %s", from_node_id);
      if (this._pc && this._pc.signalingState === "have-local-offer") {
        await this._pc.setRemoteDescription(new RTCSessionDescription(data));
        for (const c of this._pendingCandidates) {
          await this._pc.addIceCandidate(new RTCIceCandidate(c));
        }
        this._pendingCandidates = [];
      } else if (this._pc) {
        console.warn("Simson: received answer but signalingState=%s — ignoring", this._pc.signalingState);
      } else {
        console.warn("Simson: received answer but no PeerConnection exists");
      }

    } else if (signal_type === "ice-candidate") {
      if (this._pc && this._pc.remoteDescription) {
        await this._pc.addIceCandidate(new RTCIceCandidate(data));
      } else {
        this._pendingCandidates.push(data);
        console.debug("Simson: buffered ICE candidate (pending: %d)", this._pendingCandidates.length);
      }
    }
  }

  // Send a WebRTC signal via HA service (server-side relay — no mixed content).
  _sendWebRTCSignal(signalType, data) {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    const toNode = this._currentRemoteNode;
    if (!callId || !toNode || !this._hass) {
      console.warn("Simson: cannot send signal %s — missing callId=%s toNode=%s hass=%s",
        signalType, callId, toNode, !!this._hass);
      return;
    }

    console.info("Simson: → sending %s signal to %s (call=%s)", signalType, toNode, callId);
    this._hass.callService("simson", "send_webrtc_signal", {
      call_id: callId,
      to_node_id: toNode,
      signal_type: signalType,
      data: data,
    }).catch(e => console.error("Simson: WebRTC signal send FAILED:", e));
  }

  _cleanupWebRTC() {
    if (this._statsInterval) { clearInterval(this._statsInterval); this._statsInterval = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    // Stop remote audio but keep the element alive in shadow root for reuse.
    this._remoteAudio.pause();
    this._remoteAudio.srcObject = null;
    this._pendingOffer = null;
    this._makingOffer = false;
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
      console.info("Simson: state transition %s → %s (direction=%s, callId=%s)", prev, callState, direction, callId);

      if (callState === "incoming" && prev === "idle") {
        // Incoming call — start ringtone.
        this._currentCallId = callId;
        this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
        this._polite = (this._config.node_id || "") < (this._currentRemoteNode || "");
        this._playRingtone();

      } else if (callState === "active" && prev !== "active") {
        // Call became active — kick off WebRTC if event-driven path didn't already.
        this._stopRingtone();
        this._currentCallId = callId;
        this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
        this._polite = (this._config.node_id || "") < (this._currentRemoteNode || "");
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

    // Mic / secure context warnings.
    let micWarning = "";
    if (this._micAllowed === false) {
      if (!window.isSecureContext) {
        micWarning = `<div class="insecure-warning">\u{1F512} <b>Audio requires HTTPS.</b> You are accessing this page over an insecure connection (HTTP). Microphone access is blocked by your browser.<br><br>\u2192 Use your <b>HTTPS URL</b> (e.g. https://your-ha:8123) or the <b>Home Assistant Companion app</b> to enable voice calls.</div>`;
      } else {
        micWarning = `<div class="mic-denied">\u{1F3A4} <b>Microphone access denied.</b> Click the lock/site-settings icon in your browser\u2019s address bar, allow microphone access, then reload the page.</div>`;
      }
    }

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
          ${this._config.target_nodes.length ? `
          <div class="quick-dial">
            ${this._config.target_nodes.map(n => `
              <button class="btn-quick-dial" data-target="${this._escapeHtml(n.id)}"
                ${!connected ? "disabled" : ""}>
                \u{1F4DE} ${this._escapeHtml(n.label)}
              </button>`).join("")}
          </div>` : ""}
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
          <span style="margin-left:auto;font-size:10px;opacity:.4;">v${VERSION}</span>
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

    // Quick-dial buttons.
    root.querySelectorAll(".btn-quick-dial").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (target) {
          this._currentRemoteNode = target;
          this._callStart = null;
          this._callService("make_call", { target_node_id: target, call_type: "voice" });
        }
      });
    });

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
    return { node_id: "living_room", target_node_id: "", title: "Simson", target_nodes: [] };
  }
  getCardSize() { return 3; }
}

customElements.define("simson-card", SimsonCard);

// Backwards compat: also register as simson-call-card so existing dashboards
// using the old card name get the WebRTC-capable card automatically.
try {
  customElements.define("simson-call-card", class extends SimsonCard {});
} catch (e) { /* already defined, no problem */ }

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simson-card",
  name: "Simson Call Relay",
  description: "Voice calling between Home Assistant instances with WebRTC audio",
  preview: false,
  documentationURL: "https://github.com/nitish-mp3/simson-ig",
});
window.customCards.push({
  type: "simson-call-card",
  name: "Simson Call Relay (compat)",
  description: "Alias for simson-card — voice calling with WebRTC audio",
  preview: false,
});

console.info(
  `%c SIMSON-CARD %c v${VERSION} `,
  "background:#03a9f4;color:#000;font-weight:700;padding:2px 4px;border-radius:4px 0 0 4px",
  "background:#333;color:#fff;padding:2px 4px;border-radius:0 4px 4px 0",
);
