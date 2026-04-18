/**
 * Simson Call Relay — Lovelace Card v4.5.7
 *
 * Full WebRTC voice calling between HA instances + Asterisk SIP phone support.
 * v4.5.7: Decline immediately clears local state (no server wait); 8s incoming suppression after
 *         Decline to stop flood re-popup from SIP phone spam dialling external numbers.
 * v4.5.6: Fix MinimalSIPUA REGISTER To: header, INVITE auth retry, /api/webrtc-config HA view.
 * v4.5.5: End active call state when SIP leg sends BYE/error so UI never stays stuck after remote hangup.
 * v4.5.4: Route SIP active calls through SIP UA bridge path and consume sip_bridge_id from status events.
 * v4.5.3: Fix input stability so node/SIP fields keep typed text across rerenders.
 * v4.5.2: Keep SIP manual dial compatible with local AMI and central VPS routing.
 * v4.5.1: Always show SIP dial section and route manual SIP extension dials to central sip:EXT.
 * v4.5.0: Fixed one-way audio (caller=impolite, callee=polite, deferred track add),
 *         Call-All dismiss (answered_by_user_id propagation), ICE restart on failure,
 *         precise call history (missed/answered/callback), SIP broadcast to all nodes.
 * v4.4.0: TURN server support (fixes audio on HTTPS/symmetric NAT), inline MinimalSIPUA
 *         for joining Asterisk ConfBridges, dynamic ICE from /api/webrtc-config,
 *         real RTCStats quality + connection-type badge (relay/reflexive/host).
 * v4.3.1: multi-user push, SIP manual dial, device rows.
 * v4.2.0: YAML compat, HTTP mic fallback, Asterisk discovery.
 *
 * Primary element: custom:simson-relay-card
 * Aliases: simson-card, simson-call-card
 *
 * Config (all optional):
 *   type: custom:simson-relay-card
 *   title: Simson
 *   node_id: living_room
 *   target_nodes:
 *     - node_id: office2
 */

const VERSION = "4.5.7";

// Default ICE servers (fallback when /api/webrtc-config is unavailable).
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// ── Styles ────────────────────────────────────────────────────────────

const STYLES = `
  :host { display: block; }

  * { box-sizing: border-box; }

  .card {
    background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px;
    font-family: var(--primary-font-family, system-ui, -apple-system, sans-serif);
    color: var(--primary-text-color, #e1e1e1);
    box-shadow: var(--ha-card-box-shadow, none);
  }

  /* Header */
  .header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }
  .header-icon {
    width: 40px; height: 40px; background: linear-gradient(135deg, #03a9f422, #03a9f411);
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .header-title { font-size: 17px; font-weight: 700; flex: 1; letter-spacing: -0.2px; }
  .badge {
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
    text-transform: uppercase; letter-spacing: .6px;
  }
  .badge-ok { background: #1b5e2066; color: #81c784; border: 1px solid #81c78430; }
  .badge-err { background: #b71c1c44; color: #ef9a9a; border: 1px solid #ef9a9a30; }

  /* Tabs */
  .tabs {
    display: flex; gap: 2px; margin-bottom: 16px;
    background: #ffffff08; border-radius: 10px; padding: 3px;
  }
  .tab {
    flex: 1; padding: 8px 0; text-align: center; font-size: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .5px; border-radius: 8px;
    cursor: pointer; transition: all .2s; color: #888;
    border: none; background: none;
  }
  .tab:hover { color: #bbb; }
  .tab.active { background: #03a9f418; color: #4fc3f7; }

  /* Dial section */
  .section-label {
    font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .6px;
    margin-bottom: 8px; font-weight: 600;
  }
  .select-wrap {
    position: relative; margin-bottom: 12px;
  }
  .select-wrap select, .select-wrap input {
    width: 100%; background: #ffffff08; border: 1px solid #ffffff15;
    border-radius: 10px; padding: 11px 14px; color: var(--primary-text-color, #e1e1e1);
    font-size: 14px; outline: none; transition: border-color .2s;
    appearance: none; -webkit-appearance: none;
  }
  .select-wrap select { cursor: pointer; padding-right: 36px; }
  .select-wrap::after {
    content: "\\25BE"; position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    color: #666; font-size: 12px; pointer-events: none;
  }
  .select-wrap.no-arrow::after { display: none; }
  .select-wrap select:focus, .select-wrap input:focus { border-color: #03a9f4; }
  .select-wrap select:disabled, .select-wrap input:disabled {
    opacity: .4; cursor: not-allowed;
  }
  .select-wrap select option { background: #1c1c1e; color: #e1e1e1; }

  .user-list { margin-bottom: 12px; }
  .user-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: #ffffff06; border: 1px solid #ffffff10; border-radius: 10px;
    margin-bottom: 6px; cursor: pointer; transition: all .15s;
  }
  .user-item:hover { background: #03a9f412; border-color: #03a9f433; }
  .user-item:active { transform: scale(.98); }
  .user-item .user-avatar {
    width: 32px; height: 32px; border-radius: 50%; background: #03a9f418;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .user-item .user-info { flex: 1; }
  .user-item .user-name { font-size: 14px; font-weight: 600; }
  .user-item .user-meta { font-size: 11px; color: #666; }
  .user-item .call-icon { font-size: 16px; opacity: .5; }
  .user-item.all-users { border-color: #2e7d3233; }
  .user-item.all-users .user-avatar { background: #2e7d3222; }
  .user-item.all-users:hover { background: #2e7d3215; border-color: #2e7d3255; }

  .users-loading {
    text-align: center; padding: 16px; color: #666; font-size: 13px;
  }
  .users-empty {
    text-align: center; padding: 20px; color: #555; font-size: 13px;
    font-style: italic;
  }

  /* Target grid */
  .target-section { margin-bottom: 16px; }
  .target-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .btn-target {
    flex: 1 1 auto; min-width: 100px; background: #ffffff06; border: 1px solid #ffffff12;
    color: #90caf9; border-radius: 10px; padding: 10px 12px; font-size: 12px;
    font-weight: 600; cursor: pointer; transition: all .15s;
    display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center;
  }
  .btn-target:hover { background: #03a9f412; border-color: #03a9f433; }
  .btn-target:active { transform: scale(.96); }
  .btn-target:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-target .target-icon { font-size: 20px; }
  .btn-target .target-label { font-size: 11px; line-height: 1.2; }
  .btn-target.type-asterisk { color: #ffcc80; border-color: #e6510020; }
  .btn-target.type-asterisk:hover { background: #e6510012; border-color: #e6510044; }
  .btn-target.type-device { color: #a5d6a7; border-color: #2e7d3220; }
  .btn-target.type-device:hover { background: #2e7d3212; }
  .btn-target.type-queue { color: #ce93d8; border-color: #6a1b9a20; }
  .btn-target.type-queue:hover { background: #6a1b9a12; }

  /* Buttons */
  .btn {
    border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .btn:active { transform: scale(.96); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-call { background: #2e7d32; color: #fff; width: 100%; justify-content: center; }
  .btn-call:hover { background: #388e3c; }
  .btn-answer { background: #1565c0; color: #fff; }
  .btn-answer:hover { background: #1976d2; }
  .btn-reject { background: #b71c1c; color: #fff; }
  .btn-reject:hover { background: #c62828; }
  .btn-hangup { background: #b71c1c; color: #fff; }
  .btn-hangup:hover { background: #c62828; }
  .btn-mute {
    background: #ffffff10; color: #fff; min-width: 44px; justify-content: center;
    border: 1px solid #ffffff15;
  }
  .btn-mute.muted { background: #e65100; border-color: #e6510044; }

  /* Call panel */
  .call-panel {
    background: linear-gradient(135deg, #0d1b2a, #1b2838);
    border: 1px solid #1565c033; border-radius: 14px;
    padding: 16px 18px; margin-bottom: 16px;
  }
  .call-panel.incoming {
    background: linear-gradient(135deg, #0d1f0d, #1a2e1a);
    border-color: #4caf5033;
    animation: pulse-border 2s ease-in-out infinite;
  }
  @keyframes pulse-border {
    0%, 100% { border-color: #4caf5033; }
    50% { border-color: #4caf5088; }
  }
  .call-who { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
  .call-meta {
    font-size: 12px; color: #888; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .call-dir { display: inline-flex; align-items: center; gap: 4px; }
  .call-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .timer {
    font-size: 13px; color: #4fc3f7; font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  /* Quality indicator */
  .quality-bar {
    display: flex; gap: 2px; align-items: flex-end; height: 14px; margin-left: auto;
  }
  .quality-bar .bar {
    width: 3px; border-radius: 1px; transition: background .3s;
  }
  .quality-bar .bar.good { background: #4caf50; }
  .quality-bar .bar.fair { background: #ff9800; }
  .quality-bar .bar.weak { background: #f44336; }
  .quality-bar .bar.off { background: #333; }
  /* Connection type badge */
  .conn-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; margin-right: 4px; display: inline-block; vertical-align: middle; }
  .conn-badge.relay  { background: rgba(255,152,0,.18); color: #ff9800; }
  .conn-badge.srflx  { background: rgba(33,150,243,.18); color: #2196f3; }
  .conn-badge.host   { background: rgba(76,175,80,.18);  color: #4caf50; }

  /* Divider */
  .divider { height: 1px; background: #ffffff0a; margin: 16px 0; }

  /* Status bar */
  .status-bar {
    display: flex; align-items: center; gap: 8px; font-size: 11px; color: #555;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot-ok { background: #4caf50; }
  .dot-err { background: #f44336; }

  /* Warnings */
  .warning-box {
    border-radius: 10px; padding: 12px 16px; font-size: 13px;
    margin-bottom: 14px; line-height: 1.5;
  }
  .warning-http {
    background: #e6510010; border: 1px solid #ff980020; color: #ffcc80;
  }
  .warning-mic {
    background: #b71c1c15; border: 1px solid #f4433620; color: #ef9a9a;
  }

  /* Notification banner */
  .notif-banner {
    background: #0d47a115; border: 1px solid #2196f320; border-radius: 10px;
    padding: 10px 14px; font-size: 12px; color: #90caf9; margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px; line-height: 1.4;
  }
  .notif-banner .notif-text { flex: 1; }
  .notif-banner button {
    background: #1565c0; color: #fff; border: none; border-radius: 8px;
    padding: 6px 14px; font-size: 11px; font-weight: 600; cursor: pointer;
    white-space: nowrap; flex-shrink: 0; transition: background .15s;
  }
  .notif-banner button:hover { background: #1976d2; }

  /* History */
  .history-list { }
  .history-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid #ffffff08;
  }
  .history-item:last-child { border-bottom: none; }
  .history-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .history-icon.incoming { background: #1565c015; color: #64b5f6; }
  .history-icon.outgoing { background: #2e7d3215; color: #81c784; }
  .history-icon.missed { background: #b71c1c15; color: #ef9a9a; }
  .history-info { flex: 1; min-width: 0; }
  .history-name {
    font-size: 14px; font-weight: 600; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .history-detail { font-size: 11px; color: #666; display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
  .history-sep { color: #444; }
  .history-state.state-missed { color: #f44336; font-weight: 600; }
  .history-state.state-answered { color: #4caf50; }
  .history-time { font-size: 11px; color: #555; text-align: right; white-space: nowrap; }
  .history-duration {
    font-size: 12px; font-weight: 600; color: #888; text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .history-callback {
    background: none; border: 1px solid #333; border-radius: 50%; width: 28px; height: 28px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;
    transition: background .2s, border-color .2s; padding: 0;
  }
  .history-callback:hover { background: #ffffff15; border-color: #4caf50; }
  .history-empty {
    text-align: center; padding: 32px 16px; color: #444;
  }
  .history-empty-icon { font-size: 36px; margin-bottom: 8px; opacity: .5; }
  .history-empty-text { font-size: 13px; }

  /* ── User section header with refresh button ── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .section-header .section-label { margin-bottom: 0; }
  .btn-refresh {
    background: none; border: none; color: #555; cursor: pointer;
    font-size: 16px; padding: 2px 6px; border-radius: 6px;
    line-height: 1; transition: color .15s, background .15s;
  }
  .btn-refresh:hover { color: #03a9f4; background: #03a9f415; }

  /* ── SIP / Asterisk enhanced UI ── */
  .sip-dial-row {
    display: flex; gap: 6px; margin-bottom: 10px;
  }
  .sip-ext-input {
    flex: 1; background: #ffffff08; border: 1px solid #e6510030;
    border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #ffcc80;
    outline: none; min-width: 0;
  }
  .sip-ext-input:focus { border-color: #e6510066; background: #e6510008; }
  .sip-ext-input::placeholder { color: #555; }
  .sip-ext-btn {
    background: #e65100; color: #fff; border: none; border-radius: 10px;
    padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer;
    white-space: nowrap; transition: background .15s;
  }
  .sip-ext-btn:hover { background: #f4511e; }
  .sip-ext-btn:disabled { opacity: .4; cursor: not-allowed; }
  .sip-device {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: #e6510008; border: 1px solid #e6510020; border-radius: 10px;
    margin-bottom: 6px; cursor: pointer; transition: background .15s, border-color .15s;
  }
  .sip-device:hover { background: #e6510018; border-color: #e6510055; }
  .sip-device:active { transform: scale(.98); }
  .sip-device.disabled { opacity: .4; pointer-events: none; }
  .sip-device .sip-icon {
    width: 34px; height: 34px; border-radius: 50%; background: #e6510018;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .sip-device .sip-info { flex: 1; }
  .sip-device .sip-label { font-size: 14px; font-weight: 600; color: #ffcc80; }
  .sip-device .sip-ext { font-size: 11px; color: #888; }
  .sip-device .sip-arrow { font-size: 14px; opacity: .35; }
`;

// ── MinimalSIPUA ─────────────────────────────────────────────────────────────
//
// A lightweight SIP-over-WebSocket client for connecting to Asterisk PJSIP.
// Handles REGISTER (with MD5 Digest auth), outgoing INVITE to a ConfBridge
// extension, and graceful BYE / hangup.  Relies on RTCPeerConnection for media.
//
// Used when call_type === "sip" so the browser can join an Asterisk ConfBridge
// alongside a SIP desk phone — without shipping the full SIP.js library.
// ─────────────────────────────────────────────────────────────────────────────

class MinimalSIPUA {
  constructor({ uri, password, wsUrl, iceServers, onAudioTrack, onRegistered, onError, onBye }) {
    this._uri = uri;            // "sip:webrtc-pool@simson-vps.niti.life"
    this._password = password;
    this._wsUrl = wsUrl;        // "wss://simson-vps.niti.life/sip/ws"
    this._iceServers = iceServers || [];
    this._onAudioTrack = onAudioTrack;
    this._onRegistered = onRegistered;
    this._onError = onError;
    this._onBye = onBye;
    this._ws = null;
    this._pc = null;
    this._localStream = null;
    this._cseq = 1;
    this._tag = this._rand(10);
    this._regCallId = this._rand(16) + "@" + this._domain();
    this._callId = null;
    this._registered = false;
    this._activeCallFrom = null;
    this._activeCallVia = null;
    this._activeCallCseq = null;
    this._activeCallToTag = null;
  }

  // ── Public API ────────────────────────────────────────────────

  connect() {
    try {
      this._ws = new WebSocket(this._wsUrl, "sip");
    } catch (e) {
      this._onError && this._onError(new Error("SIP WS connection failed: " + e.message));
      return;
    }
    this._ws.onopen  = () => this._register();
    this._ws.onmessage = (e) => this._handleRaw(e.data);
    this._ws.onerror = () => this._onError && this._onError(new Error("SIP WebSocket error"));
    this._ws.onclose = () => { this._registered = false; };
  }

  disconnect() {
    if (this._registered) this._sendUnregister();
    setTimeout(() => { this._ws && this._ws.close(); }, 400);
    this._cleanup();
  }

  // Dial a ConfBridge extension (e.g. "bridge-AbC123").
  async dial(extension) {
    if (!this._registered) {
      this._onError && this._onError(new Error("SIP not registered"));
      return;
    }
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      this._onError && this._onError(e);
      return;
    }
    this._pc = new RTCPeerConnection({ iceServers: this._iceServers });
    this._pc.ontrack = (ev) => this._onAudioTrack && this._onAudioTrack(ev.streams?.[0] || null, ev.track);
    for (const t of this._localStream.getAudioTracks()) this._pc.addTrack(t, this._localStream);

    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);
    await this._waitICE();

    this._callId = this._rand(16) + "@" + this._domain();
    const target = "sip:" + extension + "@" + this._domain();
    this._send(this._buildRequest("INVITE", target, this._callId, this._cseq++, "",
      this._pc.localDescription.sdp));
  }

  hangup() {
    if (!this._callId) return;
    // BYE to the contact we got from 200 OK (or use To fallback)
    const to = "sip:" + this._domain();
    this._send(this._buildRequest("BYE", to, this._callId, this._cseq++));
    this._cleanup();
    this._callId = null;
  }

  get registered() { return this._registered; }

  // ── SIP message construction ──────────────────────────────────

  _rand(n = 8) { return Math.random().toString(36).slice(2, 2 + n); }
  _domain()    { return this._uri.split("@")[1]; }
  _user()      { return this._uri.split(":")[1]?.split("@")[0] || ""; }

  _buildRequest(method, targetUri, callId, cseq, extraHeaders = "", body = "", toUri = null) {
    const via    = `SIP/2.0/WSS ${this._domain()};branch=z9hG4bK${this._rand()};rport`;
    const from   = `<${this._uri}>;tag=${this._tag}`;
    const to     = `<${toUri || targetUri}>`;
    const ctLen  = body ? `Content-Type: application/sdp\r\nContent-Length: ${body.length}` : "Content-Length: 0";
    return `${method} ${targetUri} SIP/2.0\r\n` +
      `Via: ${via}\r\n` +
      `Max-Forwards: 70\r\n` +
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Call-ID: ${callId}\r\n` +
      `CSeq: ${cseq} ${method}\r\n` +
      `Contact: <${this._uri};transport=ws>\r\n` +
      `User-Agent: Simson/${VERSION}\r\n` +
      (extraHeaders ? extraHeaders + "\r\n" : "") +
      `${ctLen}\r\n\r\n${body}`;
  }

  _buildResponse(code, phrase, from, to, callId, via, cseq, body = "") {
    const ctLen = body ? `Content-Type: application/sdp\r\nContent-Length: ${body.length}` : "Content-Length: 0";
    return `SIP/2.0 ${code} ${phrase}\r\n` +
      `Via: ${via}\r\n` +
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Call-ID: ${callId}\r\n` +
      `CSeq: ${cseq}\r\n` +
      `Contact: <${this._uri};transport=ws>\r\n` +
      `${ctLen}\r\n\r\n${body}`;
  }

  _send(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) this._ws.send(msg);
  }

  // ── REGISTER ──────────────────────────────────────────────────

  _register() {
    this._send(this._buildRequest("REGISTER", "sip:" + this._domain(),
      this._regCallId, this._cseq++, "Expires: 3600\r\n", "", this._uri));
  }

  _sendUnregister() {
    this._send(this._buildRequest("REGISTER", "sip:" + this._domain(),
      this._regCallId, this._cseq++, "Expires: 0\r\n", "", this._uri));
  }

  // ── Message parsing ───────────────────────────────────────────

  _hdr(raw, name) {
    const lo = name.toLowerCase();
    const line = raw.split("\r\n").find(l => l.toLowerCase().startsWith(lo + ":"));
    return line ? line.slice(name.length + 1).trim() : null;
  }

  _body(raw) {
    const idx = raw.indexOf("\r\n\r\n");
    return idx >= 0 ? raw.slice(idx + 4) : "";
  }

  _handleRaw(data) {
    try {
      const first = data.split("\r\n")[0];
      if (first.startsWith("SIP/2.0")) {
        const code = parseInt(first.split(" ")[1]);
        const cseqHdr = this._hdr(data, "CSeq") || "";
        const method = cseqHdr.split(" ")[1] || "";
        this._handleResponse(code, method, data);
      } else {
        const method = first.split(" ")[0];
        this._handleRequest(method, data);
      }
    } catch (e) { /* malformed SIP — ignore */ }
  }

  _handleResponse(code, method, raw) {
    if (method === "REGISTER") {
      if (code === 200) {
        this._registered = true;
        this._onRegistered && this._onRegistered();
      } else if (code === 401 || code === 407) {
        this._handleDigestChallenge(code, raw, "REGISTER", "sip:" + this._domain(), this._regCallId);
      }
    } else if (method === "INVITE") {
      if (code >= 100 && code < 200) return; // provisional
      if (code === 200) this._handleInvite200OK(raw);
      else if (code === 401 || code === 407) {
        this._handleDigestChallenge(code, raw, "INVITE",
          "sip:" + (this._activeBridge || this._domain()), this._callId);
      } else if (code >= 300) {
        // INVITE failed — clean up
        this._cleanup();
        this._callId = null;
        this._onError && this._onError(new Error("SIP INVITE failed: " + code));
      }
    }
  }

  _handleRequest(method, raw) {
    if (method === "INVITE") this._handleIncomingInvite(raw);
    else if (method === "BYE") this._handleBye(raw);
  }

  // ── INVITE 200 OK (answer from Asterisk) ─────────────────────

  async _handleInvite200OK(raw) {
    if (!this._pc) return;
    const sdp = this._body(raw);
    if (!sdp) return;
    try {
      await this._pc.setRemoteDescription({ type: "answer", sdp });
    } catch(e) { return; }
    // ACK
    const toHdr     = this._hdr(raw, "To") || "";
    const fromHdr   = this._hdr(raw, "From") || "";
    const callId    = this._hdr(raw, "Call-ID") || this._callId;
    const contactHdr = this._hdr(raw, "Contact") || "";
    const ackUri    = contactHdr.match(/<([^>]+)>/)?.[1] || "sip:" + this._domain();
    const via       = `SIP/2.0/WSS ${this._domain()};branch=z9hG4bK${this._rand()};rport`;
    const ack = `ACK ${ackUri} SIP/2.0\r\n` +
      `Via: ${via}\r\nMax-Forwards: 70\r\n` +
      `From: ${fromHdr}\r\nTo: ${toHdr}\r\n` +
      `Call-ID: ${callId}\r\nCSeq: ${this._cseq++} ACK\r\nContent-Length: 0\r\n\r\n`;
    this._send(ack);
  }

  // ── Incoming INVITE from Asterisk (bridge inviting us) ────────

  async _handleIncomingInvite(raw) {
    const from   = this._hdr(raw, "From") || "";
    const to     = this._hdr(raw, "To") || "";
    const callId = this._hdr(raw, "Call-ID") || this._rand(16);
    const via    = this._hdr(raw, "Via") || "";
    const cseq   = this._hdr(raw, "CSeq") || "1 INVITE";
    const sdpOffer = this._body(raw);
    // 100 Trying
    this._send(this._buildResponse(100, "Trying", from, to, callId, via, cseq));

    if (!sdpOffer) {
      this._send(this._buildResponse(400, "Bad Request", from, to, callId, via, cseq));
      return;
    }
    // Set up WebRTC
    if (!this._pc) {
      try {
        this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (e) {
        this._send(this._buildResponse(486, "Busy Here", from, to, callId, via, cseq));
        return;
      }
      this._pc = new RTCPeerConnection({ iceServers: this._iceServers });
      this._pc.ontrack = (ev) => this._onAudioTrack && this._onAudioTrack(ev.streams?.[0] || null, ev.track);
      for (const t of this._localStream.getAudioTracks()) this._pc.addTrack(t, this._localStream);
    }

    const toWithTag = to + ";tag=" + this._rand(8);
    this._activeCallFrom = from;
    this._activeCallVia  = via;
    this._activeCallCseq = cseq;
    this._activeCallToTag = toWithTag;
    this._callId = callId;

    await this._pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });
    const answer = await this._pc.createAnswer();
    await this._pc.setLocalDescription(answer);
    await this._waitICE();

    this._send(this._buildResponse(200, "OK", from, toWithTag, callId, via, cseq,
      this._pc.localDescription.sdp));
  }

  _handleBye(raw) {
    const from   = this._hdr(raw, "From") || "";
    const to     = this._hdr(raw, "To")   || "";
    const callId = this._hdr(raw, "Call-ID") || "";
    const via    = this._hdr(raw, "Via")  || "";
    const cseq   = this._hdr(raw, "CSeq") || "1 BYE";
    this._send(this._buildResponse(200, "OK", from, to, callId, via, cseq));
    this._cleanup();
    this._callId = null;
    this._onBye && this._onBye();
  }

  // ── Digest auth ───────────────────────────────────────────────

  _handleDigestChallenge(code, raw, method, uri, callId) {
    const hdrName = code === 401 ? "WWW-Authenticate" : "Proxy-Authenticate";
    const auth = this._hdr(raw, hdrName) || "";
    const realm = auth.match(/realm="([^"]+)"/)?.[1] || this._domain();
    const nonce = auth.match(/nonce="([^"]+)"/)?.[1] || "";
    const ha1 = this._md5(this._user() + ":" + realm + ":" + this._password);
    const ha2 = this._md5(method + ":" + uri);
    const resp = this._md5(ha1 + ":" + nonce + ":" + ha2);
    const aHdr = `Digest username="${this._user()}",realm="${realm}",nonce="${nonce}",` +
      `uri="${uri}",response="${resp}",algorithm=MD5`;
    const authLine = (code === 401 ? "Authorization" : "Proxy-Authorization") + ": " + aHdr;
    if (method === "REGISTER") {
      this._send(this._buildRequest("REGISTER", "sip:" + this._domain(), this._regCallId,
        this._cseq++, "Expires: 3600\r\n" + authLine + "\r\n", "", this._uri));
    } else if (method === "INVITE") {
      // Re-send INVITE with auth — reuse existing PeerConnection and SDP
      const sdp = this._pc?.localDescription?.sdp || "";
      const target = "sip:" + (this._activeBridge || "") + "@" + this._domain();
      this._send(this._buildRequest("INVITE", target, this._callId, this._cseq++,
        authLine + "\r\n", sdp));
    }
  }

  // ── ICE gathering helper ──────────────────────────────────────

  _waitICE() {
    return new Promise((resolve) => {
      if (!this._pc || this._pc.iceGatheringState === "complete") { resolve(); return; }
      const done = () => { if (this._pc?.iceGatheringState === "complete") resolve(); };
      this._pc.addEventListener("icegatheringstatechange", done);
      setTimeout(resolve, 4000); // max wait
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────

  _cleanup() {
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) { this._localStream.getTracks().forEach(t => t.stop()); this._localStream = null; }
  }

  // ── MD5 (RFC 1321) — required for SIP Digest authentication ──
  // Pure-JS implementation; no external deps.

  _md5(str) {
    const add = (a, b) => ((a + b) | 0);
    const rl  = (n, s) => (n << s) | (n >>> (32 - s));
    const S   = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
                 5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
                 4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
                 6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const K   = Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*0x100000000)>>>0);
    const bytes = new TextEncoder().encode(str);
    const n = bytes.length;
    const padLen = (55 - n % 64 + 64) % 64;
    const msg = new Uint8Array(n + 1 + padLen + 8);
    msg.set(bytes); msg[n] = 0x80;
    const dv = new DataView(msg.buffer);
    dv.setUint32(n + 1 + padLen,     (n * 8) >>> 0,          true);
    dv.setUint32(n + 1 + padLen + 4, Math.floor(n / 0x20000000), true);
    let a=0x67452301, b=0xefcdab89, c=0x98badcfe, d=0x10325476;
    for (let i = 0; i < msg.length; i += 64) {
      const M = Array.from({length:16}, (_, j) => dv.getInt32(i + j*4, true));
      let [A, B, C, D] = [a, b, c, d];
      for (let j = 0; j < 64; j++) {
        let F, g;
        if      (j < 16) { F=(B&C)|(~B&D); g=j; }
        else if (j < 32) { F=(D&B)|(~D&C); g=(5*j+1)%16; }
        else if (j < 48) { F=B^C^D;        g=(3*j+5)%16; }
        else             { F=C^(B|~D);     g=(7*j)%16; }
        const temp = D;
        D = C; C = B;
        B = add(B, rl(add(add(add(A, F), M[g]), K[j]), S[j]));
        A = temp;
      }
      a=add(a,A); b=add(b,B); c=add(c,C); d=add(d,D);
    }
    return [a,b,c,d].map(v =>
      [(v>>>0)&0xff,(v>>>8)&0xff,(v>>>16)&0xff,(v>>>24)&0xff]
        .map(byte => byte.toString(16).padStart(2,"0")).join("")
    ).join("");
  }
}

// ── Card class ────────────────────────────────────────────────────────

class SimsonCard extends HTMLElement {
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

    // SIP UA (used when call_type === "sip" to join Asterisk ConfBridge)
    this._sipUA = null;
    this._sipBridgeId = null;    // bridge extension to dial (e.g. "bridge-AbC123")

    // Persistent audio element
    this._remoteAudio = document.createElement("audio");
    this._remoteAudio.autoplay = true;
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

    // Notifications
    this._notifPermission = typeof Notification !== "undefined" ? Notification.permission : "denied";
    this._activeNotification = null;

    // User heartbeat
    this._userHeartbeatInterval = null;
  }

  // ── Config ──────────────────────────────────────────────────────────

  setConfig(config) {
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

    // target_nodes supports both string shorthand and {node_id: "..."} objects.
    const targetNodes = (config.target_nodes || [])
      .map(t => (typeof t === "string" ? t : t.node_id))
      .filter(Boolean);

    this._config = {
      title: config.title || "Simson",
      node_id: nodeId,
      target_nodes: targetNodes,
    };

    // Pre-seed cache slots so configured nodes immediately appear in suggestions.
    targetNodes.forEach(n => {
      if (!this._usersCache[n]) this._usersCache[n] = { users: [], timestamp: 0 };
    });

    this._render();
  }

  set hass(hass) {
    this._hass = hass;

    // Auto-detect node_id on first hass set.
    if (!this._config.node_id && !this._detectedNodeId) {
      this._autoDetectNodeId();
    }

    if (!this._haEventSubscribed) {
      this._subscribeHAEvents();
    }
    if (!this._userHeartbeatInterval && hass?.user) {
      this._sendUserHeartbeat();
      this._userHeartbeatInterval = setInterval(() => this._sendUserHeartbeat(), 20000);
    }
    if (!this._targetsLoaded && !this._targetsLoading) {
      this._loadTargets();
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
    if (this._userHeartbeatInterval) {
      clearInterval(this._userHeartbeatInterval);
      this._userHeartbeatInterval = null;
    }
    this._unsubscribeHAEvents();
    this._cleanupWebRTC();
    this._removePopup();
    this._removeUserPicker();
    this._dismissBrowserNotification();
  }

  // ── Auto-detect node_id ─────────────────────────────────────────────

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

  // ── HA event subscriptions ──────────────────────────────────────────

  _subscribeHAEvents() {
    if (!this._hass?.connection) return;
    this._haEventSubscribed = true;

    this._hass.connection.subscribeEvents(
      (ev) => this._onHAWebRTCSignal(ev.data), "simson_webrtc_signal"
    ).then(u => { this._haEventUnsub = u; }).catch(() => { this._haEventSubscribed = false; });

    this._hass.connection.subscribeEvents(
      (ev) => this._onHACallStatus(ev.data), "simson_call_status"
    ).then(u => { this._haStatusUnsub = u; }).catch(() => {});

    this._hass.connection.subscribeEvents(
      (ev) => this._onHAIncomingCall(ev.data), "simson_incoming_call"
    ).then(u => { this._haIncomingUnsub = u; }).catch(() => {});

    this._hass.connection.subscribeEvents(
      (ev) => this._onHATargetsResult(ev.data), "simson_targets_result"
    ).then(u => { this._haTargetsUnsub = u; }).catch(() => {});

    this._hass.connection.subscribeEvents(
      (ev) => this._onHARemoteUsers(ev.data), "simson_remote_users"
    ).then(u => { this._haRemoteUsersUnsub = u; }).catch(() => {});

    this._hass.connection.subscribeEvents(
      (ev) => this._onHACallHistory(ev.data), "simson_call_history"
    ).then(u => { this._haHistoryUnsub = u; }).catch(() => {});
  }

  _unsubscribeHAEvents() {
    [this._haEventUnsub, this._haStatusUnsub, this._haIncomingUnsub,
     this._haTargetsUnsub, this._haRemoteUsersUnsub, this._haHistoryUnsub
    ].forEach(u => { if (u) u(); });
    this._haEventUnsub = this._haStatusUnsub = this._haIncomingUnsub = null;
    this._haTargetsUnsub = this._haRemoteUsersUnsub = this._haHistoryUnsub = null;
    this._haEventSubscribed = false;
  }

  // ── HA event handlers ───────────────────────────────────────────────

  _onHAWebRTCSignal(event) {
    this._handleWebRTCSignal(event);
  }

  _onHACallStatus(event) {
    const { call_id, status, direction, remote_node_id, call_type, sip_bridge_id, target_user_id, caller_user_id, answered_by_user_id } = event;
    // Only react to events that belong to this session's user.
    const myUserId = this._hass?.user?.id || "";
    const isMyEvent = call_id === this._currentCallId ||
      (direction === "incoming" && (!target_user_id || target_user_id === myUserId)) ||
      (direction === "outgoing" && (!caller_user_id || caller_user_id === myUserId));
    if (!isMyEvent) return;
    if (status === "active") {
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
      this._currentRemoteNode = remote_node_id;
      if (sip_bridge_id) this._sipBridgeId = sip_bridge_id;
      const isSipCall = call_type === "sip" ||
        String(remote_node_id || "").startsWith("sip:") ||
        String(remote_node_id || "").startsWith("asterisk:");
      // Caller creates the offer (impolite), callee waits for offer (polite).
      this._isCaller = direction === "outgoing";
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
      this._stopRingtone();
      this._removePopup();
      this._dismissBrowserNotification();
      this._cleanupWebRTC();
      this._callStart = null;
      this._currentCallId = null;
      this._currentRemoteNode = null;
      this._isCaller = false;
      this._answeredByMe = false;
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
    // Suppress rapid-fire re-invites after the user hit Decline.
    if (this._incomingSuppressUntil && Date.now() < this._incomingSuppressUntil) {
      this._ignoredCallId = call_id;
      return;
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

  // ── Entity helpers ──────────────────────────────────────────────────

  _entity(suffix) {
    return this._hass?.states[`sensor.simson_${this._nodeId()}_${suffix}`];
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

  // ── HA service calls ────────────────────────────────────────────────

  async _callService(service, data = {}) {
    if (!this._hass) return;
    await this._hass.callService("simson", service, data);
    setTimeout(() => this._render(), 600);
  }

  _dial(nodeId, targetUserId, targetUserName) {
    if (!nodeId) return;
    this._currentRemoteNode = nodeId;
    this._callStart = null;
    const data = { target_node_id: nodeId, call_type: "voice", caller_user_id: this._hass?.user?.id || "" };
    if (targetUserId) {
      data.target_user_id = targetUserId;
      data.target_user_name = targetUserName || "";
    }
    this._callService("make_call", data);
  }

  _dialTarget(targetId, targetType, nodeId) {
    this._currentRemoteNode = nodeId || targetId;
    this._callStart = null;
    this._callService("make_call", {
      target_id: targetId,
      call_type: targetType === "asterisk" ? "sip" : "voice",
      caller_user_id: this._hass?.user?.id || "",
    });
  }

  _dialSIPExtension(extension) {
    if (!extension) return;
    this._currentRemoteNode = extension;
    this._callStart = null;
    this._callService("make_call", {
      target_id: `asterisk_${extension}`,
      call_type: "sip",
      caller_user_id: this._hass?.user?.id || "",
    });
  }

  _answer() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
    this._callStart = Date.now();
    this._answeredByMe = true;
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
    this._prevCallState = "idle"; // reset transition tracking
    // Suppress any new incoming call popup for 8 s so the phone spam
    // doesn't immediately re-open the popup after the user dismisses it.
    this._incomingSuppressUntil = Date.now() + 8000;
    this._render();
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

  // ── Data loading ────────────────────────────────────────────────────

  async _loadTargets() {
    if (!this._hass || this._targetsLoading) return;
    this._targetsLoading = true;
    try {
      await this._hass.callService("simson", "get_targets", {});
    } catch (e) {
      this._targetsLoading = false;
    }
  }

  _loadHistory() {
    if (!this._hass) return;
    try {
      this._hass.callService("simson", "get_call_history", { limit: 50 });
    } catch (e) { /* ignore */ }
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

  // ── User heartbeat ──────────────────────────────────────────────────

  _sendUserHeartbeat() {
    if (!this._hass?.user) return;
    this._callService("user_heartbeat", {
      user_id: this._hass.user.id,
      user_name: this._hass.user.name,
    });
  }

  // ── WebRTC ──────────────────────────────────────────────────────────

  // Fetch ICE/TURN servers and SIP config from the addon API.
  // Falls back to the hardcoded ICE_SERVERS constant if unavailable.
  async _fetchWebRTCConfig() {
    if (this._webrtcConfig) return this._webrtcConfig; // cache
    try {
      const token = this._hass?.auth?.data?.access_token;
      const resp = await fetch("/api/webrtc-config", {
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      if (resp.ok) {
        this._webrtcConfig = await resp.json();
        return this._webrtcConfig;
      }
    } catch (e) { /* fall through to defaults */ }
    return { ice_servers: ICE_SERVERS, sip: { enabled: false } };
  }

  async _startWebRTC() {
    if (this._pc) return;
    if (this._startingWebRTC) return;
    this._startingWebRTC = true;

    // Fetch TURN-enabled ICE servers before creating the PeerConnection.
    const wrtcCfg = await this._fetchWebRTCConfig();
    const iceServers = wrtcCfg.ice_servers || ICE_SERVERS;

    // Try mic — works on HTTP for localhost/local IPs too. Never hard-block on context.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._micAllowed = true;
      } catch (e) {
        this._micAllowed = false;
        // Continue anyway — remote audio still plays without microphone access.
      }
    } else {
      this._micAllowed = false;
    }

    this._pc = new RTCPeerConnection({ iceServers });
    this._pendingCandidates = [];
    this._makingOffer = false;

    // CALLER adds tracks immediately → triggers onnegotiationneeded → creates offer.
    // CALLEE defers — tracks are added in _handleWebRTCSignal when we receive the offer.
    if (this._isCaller && this._localStream) {
      this._localStream.getTracks().forEach(track => {
        this._pc.addTrack(track, this._localStream);
      });
    }

    this._pc.ontrack = (ev) => {
      if (ev.streams?.[0]) {
        this._remoteAudio.srcObject = ev.streams[0];
      } else {
        const ms = new MediaStream();
        ms.addTrack(ev.track);
        this._remoteAudio.srcObject = ms;
      }
      this._remoteAudio.play().catch(() => {});
    };

    this._pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this._sendWebRTCSignal("ice-candidate", {
          candidate: ev.candidate.candidate,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex,
        });
      }
    };

    this._pc.onnegotiationneeded = async () => {
      try {
        this._makingOffer = true;
        await this._pc.setLocalDescription();
        this._sendWebRTCSignal("offer", {
          sdp: this._pc.localDescription.sdp,
          type: this._pc.localDescription.type,
        });
      } catch (e) {
        console.error("Simson: negotiation error:", e);
      } finally {
        this._makingOffer = false;
      }
    };

    this._pc.onconnectionstatechange = () => {
      const state = this._pc?.connectionState;
      if (state === "connected") { this._audioQuality = 3; this._iceRestartAttempts = 0; }
      else if (state === "disconnected") this._audioQuality = 1;
      else if (state === "failed") {
        // Attempt ICE restart before giving up (fixes intermittent drops).
        if (!this._iceRestartAttempts) this._iceRestartAttempts = 0;
        if (this._iceRestartAttempts < 2 && this._isCaller && this._pc) {
          this._iceRestartAttempts++;
          console.warn("[Simson] ICE failed, attempting restart", this._iceRestartAttempts);
          this._pc.restartIce();
          return;
        }
        this._audioQuality = 0;
        this._cleanupWebRTC();
      }
      this._render();
    };

    this._statsInterval = setInterval(() => this._updateQuality(), 3000);
    this._startingWebRTC = false;

    if (this._pendingOffer) {
      const offer = this._pendingOffer;
      this._pendingOffer = null;
      await this._handleWebRTCSignal(offer);
    }
  }

  async _handleWebRTCSignal(event) {
    const { call_id, from_node_id, signal_type, data } = event;

    if (call_id && this._currentCallId && call_id !== this._currentCallId) return;

    if (signal_type === "offer") {
      if (this._startingWebRTC) { this._pendingOffer = event; return; }
      if (!this._pc) await this._startWebRTC();
      if (!this._pc) return;

      const collision = (this._makingOffer || this._pc.signalingState !== "stable");
      if (collision) {
        if (!this._polite) return;
        await this._pc.setLocalDescription({ type: "rollback" });
      }

      // Callee: add local tracks now (before creating answer) so SDP includes audio.
      if (!this._isCaller && this._localStream) {
        const existingSenders = this._pc.getSenders();
        if (!existingSenders.some(s => s.track)) {
          this._localStream.getTracks().forEach(track => {
            this._pc.addTrack(track, this._localStream);
          });
        }
      }

      await this._pc.setRemoteDescription(new RTCSessionDescription(data));
      await this._pc.setLocalDescription();
      this._sendWebRTCSignal("answer", {
        sdp: this._pc.localDescription.sdp,
        type: this._pc.localDescription.type,
      });
      for (const c of this._pendingCandidates) {
        await this._pc.addIceCandidate(new RTCIceCandidate(c));
      }
      this._pendingCandidates = [];

    } else if (signal_type === "answer") {
      if (this._pc && this._pc.signalingState === "have-local-offer") {
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

  _sendWebRTCSignal(signalType, data) {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    const toNode = this._currentRemoteNode;
    if (!callId || !toNode || !this._hass) return;
    this._hass.callService("simson", "send_webrtc_signal", {
      call_id: callId, to_node_id: toNode, signal_type: signalType, data,
    }).catch(e => console.error("Simson: signal send failed:", e));
  }

  _cleanupWebRTC() {
    if (this._statsInterval) { clearInterval(this._statsInterval); this._statsInterval = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    this._remoteAudio.pause();
    this._remoteAudio.srcObject = null;
    this._pendingOffer = null;
    this._makingOffer = false;
    this._muted = false;
    this._audioQuality = 3;
    this._connectionType = "";
    this._pendingCandidates = [];
    this._isCaller = false;
    this._answeredByMe = false;
    this._iceRestartAttempts = 0;
    // Tear down SIP UA if active (SIP phone call path)
    this._cleanupSIPUA();
    this._sipBridgeId = null;
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
  }

  _cleanupSIPUA() {
    if (this._sipUA) {
      try { this._sipUA.disconnect(); } catch (e) { /* ignore */ }
      this._sipUA = null;
    }
  }

  _endActiveCallFromSip() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    if (!callId) return;
    this._callService("hangup_call", { call_id: callId }).catch(() => {});
  }

  // Start the SIP UA and dial into an Asterisk ConfBridge.
  async _startSIPCall(bridgeId) {
    if (!bridgeId) return;
    if (this._sipUA && this._sipUA._activeBridge === bridgeId) return;
    this._cleanupSIPUA();

    const cfg = await this._fetchWebRTCConfig();
    const sip = cfg.sip || {};
    if (!sip.enabled || !sip.ws_url || !sip.username || !sip.password) {
      console.warn("Simson: SIP config missing — cannot join Asterisk bridge");
      return;
    }
    const uri = "sip:" + sip.username + "@" + sip.domain;
    this._sipUA = new MinimalSIPUA({
      uri,
      password: sip.password,
      wsUrl: sip.ws_url,
      iceServers: cfg.ice_servers || ICE_SERVERS,
      onAudioTrack: (stream, track) => {
        if (stream) {
          this._remoteAudio.srcObject = stream;
        } else {
          const ms = new MediaStream();
          ms.addTrack(track);
          this._remoteAudio.srcObject = ms;
        }
        this._remoteAudio.play().catch(() => {});
      },
      onRegistered: () => {
        this._sipUA._activeBridge = bridgeId;
        this._sipUA.dial(bridgeId).catch(e => {
          console.error("Simson SIP dial error:", e);
          this._cleanupSIPUA();
        });
      },
      onError: (e) => {
        console.error("Simson SIP UA error:", e);
        this._cleanupSIPUA();
        this._endActiveCallFromSip();
        this._render();
      },
      onBye: () => {
        this._cleanupSIPUA();
        this._endActiveCallFromSip();
        this._render();
      },
    });
    this._sipUA.connect();
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
        // Track which ICE candidate type is active: host / srflx / relay
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          const remoteReport = stats.get ? stats.get(report.remoteCandidateId) : null;
          if (remoteReport?.candidateType) {
            this._connectionType = remoteReport.candidateType; // "host"|"srflx"|"relay"
          }
        }
      });
      const loss = packetsLost / Math.max(packetsReceived, 1);
      if (loss > 0.1 || jitter > 0.1) this._audioQuality = 1;
      else if (loss > 0.03 || jitter > 0.05) this._audioQuality = 2;
      else this._audioQuality = 3;
      this._render();
    } catch (e) { /* ignore */ }
  }

  // ── Ringtone ────────────────────────────────────────────────────────

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
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 480;
          g2.gain.setValueAtTime(0.15, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
        }, 200);
      }, 3000);
    } catch (e) { /* audio context not available */ }
  }

  _stopRingtone() {
    if (this._ringLoop) { clearInterval(this._ringLoop); this._ringLoop = null; }
    if (this._ringCtx) { this._ringCtx.close().catch(() => {}); this._ringCtx = null; }
  }

  // ── Popups ──────────────────────────────────────────────────────────

  _showIncomingPopup() {
    this._removePopup();
    this._showPopup = true;
    const popup = document.createElement("div");
    popup.id = "simson-incoming-popup";
    popup.innerHTML = `
      <style>
        #simson-incoming-popup {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.88); z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          animation: simson-popup-fade .3s ease; font-family: system-ui, sans-serif;
        }
        @keyframes simson-popup-fade { from { opacity: 0; } to { opacity: 1; } }
        .simson-popup-card {
          background: #1a1a1a; border: 2px solid #4caf50; border-radius: 24px;
          padding: 36px 32px; text-align: center; min-width: 280px; max-width: 360px;
          animation: simson-popup-slide .3s ease;
          box-shadow: 0 24px 80px rgba(0,0,0,.7); color: #e1e1e1;
        }
        @keyframes simson-popup-slide {
          from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; }
        }
        .simson-popup-avatar { width: 76px; height: 76px; background: #2e7d3222; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 38px;
          margin: 0 auto 16px; animation: simson-ring-pulse 2s infinite; }
        @keyframes simson-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(76,175,80,0.4); }
          50% { box-shadow: 0 0 0 18px rgba(76,175,80,0); }
        }
        .simson-popup-caller { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .simson-popup-type { font-size: 13px; color: #888; margin-bottom: 28px; }
        .simson-popup-actions { display: flex; gap: 24px; justify-content: center; }
        .simson-popup-btn { border: none; border-radius: 50%; width: 64px; height: 64px;
          font-size: 26px; cursor: pointer; transition: transform .15s;
          display: flex; align-items: center; justify-content: center; color: #fff; }
        .simson-popup-btn:active { transform: scale(.88); }
        .simson-popup-btn-answer { background: #2e7d32; box-shadow: 0 4px 24px rgba(46,125,50,.4); }
        .simson-popup-btn-decline { background: #b71c1c; box-shadow: 0 4px 24px rgba(183,28,28,.4); }
        .simson-popup-label { font-size: 11px; color: #888; margin-top: 8px; text-align: center; }
      </style>
      <div class="simson-popup-card">
        <div class="simson-popup-avatar">\u{1F4DE}</div>
        <div class="simson-popup-caller">${this._esc(this._incomingFrom)}</div>
        <div class="simson-popup-type">Incoming ${this._esc(this._incomingCallType)} call</div>
        <div class="simson-popup-actions">
          <div>
            <button class="simson-popup-btn simson-popup-btn-decline" id="popup-decline">\u274C</button>
            <div class="simson-popup-label">Decline</div>
          </div>
          <div>
            <button class="simson-popup-btn simson-popup-btn-answer" id="popup-answer">\u{1F4DE}</button>
            <div class="simson-popup-label">Answer</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    this._popupEl = popup;
    popup.querySelector("#popup-answer")?.addEventListener("click", () => { this._answer(); this._removePopup(); });
    popup.querySelector("#popup-decline")?.addEventListener("click", () => { this._reject(); this._removePopup(); });
  }

  _removePopup() {
    this._showPopup = false;
    if (this._popupEl) { this._popupEl.remove(); this._popupEl = null; }
    document.getElementById("simson-incoming-popup")?.remove();
  }

  _showUserPickerPopup() {
    this._removeUserPicker();
    const nodeId = this._userPickerNodeId;
    const users = this._remoteUsers || [];
    const popup = document.createElement("div");
    popup.id = "simson-user-picker";
    popup.innerHTML = `
      <style>
        #simson-user-picker {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.88); z-index: 99998;
          display: flex; align-items: center; justify-content: center;
          animation: simson-picker-fade .3s ease; font-family: system-ui, sans-serif;
        }
        @keyframes simson-picker-fade { from { opacity: 0; } to { opacity: 1; } }
        .simson-picker-card {
          background: #1a1a1a; border: 2px solid #1565c0; border-radius: 20px;
          padding: 28px 24px; text-align: center; min-width: 280px; max-width: 380px;
          animation: simson-popup-slide .3s ease;
          box-shadow: 0 20px 60px rgba(0,0,0,.6); color: #e1e1e1;
        }
        @keyframes simson-popup-slide {
          from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; }
        }
        .simson-picker-icon { font-size: 32px; margin-bottom: 8px; }
        .simson-picker-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .simson-picker-sub { font-size: 12px; color: #888; margin-bottom: 20px; }
        .simson-picker-btn {
          width: 100%; border: none; border-radius: 10px; padding: 12px 16px;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s;
          display: flex; align-items: center; gap: 10px; justify-content: center;
          color: #fff; margin-bottom: 8px;
        }
        .simson-picker-btn:active { transform: scale(.96); }
        .simson-picker-btn-all { background: #2e7d32; }
        .simson-picker-btn-all:hover { background: #388e3c; }
        .simson-picker-btn-user { background: #1565c0; }
        .simson-picker-btn-user:hover { background: #1976d2; }
        .simson-picker-btn-cancel { background: #ffffff10; color: #888; margin-top: 8px; }
        .simson-picker-btn-cancel:hover { background: #ffffff18; }
        .simson-picker-empty { color: #555; font-size: 13px; padding: 12px 0; font-style: italic; }
      </style>
      <div class="simson-picker-card">
        <div class="simson-picker-icon">\u{1F465}</div>
        <div class="simson-picker-title">Call ${this._esc(nodeId)}</div>
        <div class="simson-picker-sub">${users.length ? users.length + " user(s) online" : "No users online"}</div>
        <button class="simson-picker-btn simson-picker-btn-all" data-action="all">\u{1F4DE} Call All Users</button>
        ${users.length === 0 ? '<div class="simson-picker-empty">No individual users detected</div>' : ""}
        ${users.map(u => `
          <button class="simson-picker-btn simson-picker-btn-user" data-uid="${this._esc(u.user_id)}" data-uname="${this._esc(u.user_name)}">
            \u{1F464} ${this._esc(u.user_name)}
          </button>
        `).join("")}
        <button class="simson-picker-btn simson-picker-btn-cancel" data-action="cancel">\u2715 Cancel</button>
      </div>
    `;
    document.body.appendChild(popup);
    this._userPickerEl = popup;

    popup.querySelector("[data-action='all']")?.addEventListener("click", () => {
      this._removeUserPicker();
      const data = { target_node_id: nodeId, call_type: "voice", caller_user_id: this._hass?.user?.id || "" };
      if (this._userPickerTargetId) data.target_id = this._userPickerTargetId;
      this._currentRemoteNode = nodeId;
      this._callStart = null;
      this._callService("make_call", data);
    });
    popup.querySelectorAll("[data-uid]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._removeUserPicker();
        this._currentRemoteNode = nodeId;
        this._callStart = null;
        const data = {
          target_node_id: nodeId, call_type: "voice",
          target_user_id: btn.dataset.uid, target_user_name: btn.dataset.uname,
          caller_user_id: this._hass?.user?.id || "",
        };
        if (this._userPickerTargetId) data.target_id = this._userPickerTargetId;
        this._callService("make_call", data);
      });
    });
    popup.querySelector("[data-action='cancel']")?.addEventListener("click", () => {
      this._removeUserPicker();
    });
  }

  _removeUserPicker() {
    if (this._userPickerEl) { this._userPickerEl.remove(); this._userPickerEl = null; }
    document.getElementById("simson-user-picker")?.remove();
    this._userPickerNodeId = "";
    this._userPickerTargetId = "";
  }

  // ── Browser Notifications ──────────────────────────────────────────

  async _requestNotificationPermission() {
    if (typeof Notification === "undefined") return;
    try {
      this._notifPermission = await Notification.requestPermission();
      this._render();
    } catch (e) { /* ignore */ }
  }

  _showBrowserNotification(caller, callType) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    this._dismissBrowserNotification();
    try {
      this._activeNotification = new Notification("Incoming Call", {
        body: `\u{1F4DE} ${caller} \u2014 ${callType} call`,
        tag: "simson-incoming-call",
        requireInteraction: true,
      });
      this._activeNotification.onclick = () => { window.focus(); this._activeNotification.close(); };
    } catch (e) { /* ignore */ }
  }

  _dismissBrowserNotification() {
    if (this._activeNotification) { this._activeNotification.close(); this._activeNotification = null; }
  }

  // ── Render ──────────────────────────────────────────────────────────

  _root() { return this.shadowRoot; }

  _render() {
    const nodeId = this._nodeId();
    if (!nodeId) {
      // Not yet detected — show minimal card.
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="card">
          <div class="header">
            <div class="header-icon">\u{1F4DE}</div>
            <div class="header-title">${this._esc(this._config.title || "Simson")}</div>
          </div>
          <div class="users-empty">
            <div style="font-size:24px;margin-bottom:8px;">\u{1F50D}</div>
            Detecting Simson node\u2026<br>
            <span style="font-size:11px;color:#444;margin-top:4px;display:block">
              Make sure the Simson addon is running and the integration is configured.
            </span>
          </div>
        </div>`;
      return;
    }

    const connected = this._isConnected();
    const callState = this._callState();
    const callId = this._activeCallAttr("call_id", "") || this._currentCallId || "";
    const direction = this._activeCallAttr("direction", "");

    // Per-user call ownership: only show call UI to the intended caller or target.
    // Use `direction` (from entity attr — stable across all call states) not `callState`.
    const myUserId = this._hass?.user?.id || "";
    const targetUserId = this._activeCallAttr("target_user_id", "");
    const callerUserId = this._activeCallAttr("caller_user_id", "");
    const isMyCall = !callId ||
      callId === this._currentCallId ||
      !direction ||
      (direction === "incoming" && (!targetUserId || targetUserId === myUserId)) ||
      (direction === "outgoing" && (!callerUserId || callerUserId === myUserId));
    const effectiveCallState = isMyCall ? callState : "idle";

    const isIdle = effectiveCallState === "idle" || effectiveCallState === "unknown";
    const isIncoming = effectiveCallState === "incoming";
    const isRinging = effectiveCallState === "requesting" || effectiveCallState === "ringing";
    const isActive = effectiveCallState === "active";
    const isMissed = effectiveCallState === "missed";
    const isDeclined = effectiveCallState === "declined";
    const isTimeout = effectiveCallState === "timeout";
    const hasCall = !isIdle && !isMissed && !isDeclined && !isTimeout;
    const hasWebRTC = !!this._pc;
    const activeCallType = this._activeCallAttr("call_type", "");
    const activeSipBridgeId = this._activeCallAttr("sip_bridge_id", "");

    const remoteLabel = this._activeCallAttr("remote_label") ||
                        this._activeCallAttr("remote_node_id") ||
                        this._currentRemoteNode || "Unknown";

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
        this._isCaller = direction === "outgoing";
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
        setTimeout(() => this._loadHistory(), 2000);
      }
    }

    if (isRinging && isMyCall && !this._currentCallId && callId) {
      this._currentCallId = callId;
      this._currentRemoteNode = this._activeCallAttr("remote_node_id", "");
    }

    // Build HTML
    const badgeCls = connected ? "badge-ok" : "badge-err";
    const badgeTxt = connected ? "Online" : "Offline";
    const dotCls = connected ? "dot-ok" : "dot-err";
    const accountId = this._attr("connection", "account_id", "");

    // Quality bars + connection type badge
    const q = this._audioQuality;
    const connBadge = this._connectionType === "relay"
      ? `<span class="conn-badge relay" title="Audio routed via TURN relay">relay</span>`
      : this._connectionType === "srflx"
      ? `<span class="conn-badge srflx" title="Audio via STUN reflexive">reflex</span>`
      : this._connectionType === "host"
      ? `<span class="conn-badge host" title="Direct audio path">direct</span>`
      : "";
    const qualityHtml = isActive && hasWebRTC ? `
      ${connBadge}
      <div class="quality-bar" title="Audio quality">
        <div class="bar ${q >= 1 ? "good" : "off"}" style="height:4px"></div>
        <div class="bar ${q >= 2 ? "good" : q >= 1 ? "fair" : "off"}" style="height:8px"></div>
        <div class="bar ${q >= 3 ? "good" : q >= 2 ? "fair" : "off"}" style="height:12px"></div>
      </div>` : "";

    // Warnings
    let warningHtml = "";
    if (this._micAllowed === false) {
      if (!window.isSecureContext) {
        warningHtml = `<div class="warning-box warning-http">
          ⚠️ Microphone unavailable on HTTP — you can still <b>receive audio</b>. Use HTTPS for full voice.
        </div>`;
      } else {
        warningHtml = `<div class="warning-box warning-mic">
          🎤 Microphone access denied — allow mic in browser settings and reload.
        </div>`;
      }
    }

    // Call panel
    let callPanelHtml = "";
    if (hasCall) {
      callPanelHtml = `
        <div class="call-panel ${isIncoming ? "incoming" : ""}">
          <div class="call-who">${this._esc(remoteLabel)}</div>
          <div class="call-meta">
            <span class="call-dir">${direction === "incoming" ? "\u2B07\uFE0F Incoming" : "\u2B06\uFE0F Outgoing"}</span>
            ${isActive ? `<span class="timer" id="call-timer">00:00</span>` : ""}
            ${isIncoming ? "<span>Ringing\u2026</span>" : ""}
            ${isRinging ? "<span>Calling\u2026</span>" : ""}
            ${qualityHtml}
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
        </div>`;
    }

    // Notification permission banner
    const notifBanner = (isIdle && this._notifPermission === "default" && typeof Notification !== "undefined")
      ? `<div class="notif-banner">
           <span class="notif-text">\u{1F514} Enable notifications to get alerted for incoming calls.</span>
           <button id="btn-notif-perm">Enable</button>
         </div>` : "";

    // Tabs
    const tabsHtml = `
      <div class="tabs">
        <button class="tab ${this._activeTab === "dial" ? "active" : ""}" data-tab="dial">\u{1F4DE} Dial</button>
        <button class="tab ${this._activeTab === "history" ? "active" : ""}" data-tab="history">\u{1F4CB} History</button>
      </div>`;

    // Dial tab content
    let dialHtml = "";
    if (this._activeTab === "dial" && isIdle) {
      const nodeTargets = this._getNodeTargets();
      const nonNodeTargets = this._getNonNodeTargets();

      // Build known nodes (fetched from service + YAML config)
      const knownNodes = new Set();
      nodeTargets.forEach(t => knownNodes.add(t.node_id || t.id));
      (this._config.target_nodes || []).forEach(n => knownNodes.add(n));

      // Node input
      dialHtml = `
        <div class="section-label">Select Node</div>
        <div class="select-wrap no-arrow">
          <input id="node-input" type="text" placeholder="Enter node ID (e.g. office, central2)"
            value="${this._esc(this._nodeInputDraft || this._selectedNode)}" ${!connected ? "disabled" : ""}
            list="node-suggestions" autocomplete="off" />
        </div>
        <datalist id="node-suggestions">
          ${[...knownNodes].map(n => `<option value="${this._esc(n)}">`).join("")}
        </datalist>
      `;

      // User list
      if (this._selectedNode) {
        if (this._usersLoading) {
          dialHtml += `<div class="users-loading">\u23F3 Loading users from ${this._esc(this._selectedNode)}\u2026</div>`;
        } else {
          const users = this._remoteUsers.length > 0
            ? this._remoteUsers
            : (this._usersCache[this._selectedNode]?.users || []);

          dialHtml += `
            <div class="section-header">
              <div class="section-label">Users on ${this._esc(this._selectedNode)}</div>
              <button class="btn-refresh" id="btn-refresh-users" title="Refresh user list">&#x21BB;</button>
            </div>
            <div class="user-list">
              <div class="user-item all-users" data-action="call-all">
                <div class="user-avatar">\u{1F4DE}</div>
                <div class="user-info">
                  <div class="user-name">Call All Users</div>
                  <div class="user-meta">Ring all devices on this node</div>
                </div>
                <div class="call-icon">\u2192</div>
              </div>
              ${users.map(u => `
                <div class="user-item" data-uid="${this._esc(u.user_id)}" data-uname="${this._esc(u.user_name)}">
                  <div class="user-avatar">\u{1F464}</div>
                  <div class="user-info">
                    <div class="user-name">${this._esc(u.user_name)}</div>
                    <div class="user-meta">Direct call</div>
                  </div>
                  <div class="call-icon">\u2192</div>
                </div>
              `).join("")}
            </div>
          `;
        }
      } else {
        dialHtml += `
          <button class="btn btn-call" id="btn-call-manual" ${!connected ? "disabled" : ""}>
            \u{1F4DE} Call
          </button>
        `;
      }

      // Non-node targets
      const icons = { device: "\u{1F4F1}", asterisk: "\u{1F4DE}", queue: "\u{1F465}" };
      const labels = { device: "Devices", asterisk: "Asterisk / SIP", queue: "Queues" };
      for (const type of ["asterisk", "device", "queue"]) {
        const targets = nonNodeTargets.filter(t => t.type === type);
        if (type !== "asterisk" && targets.length === 0) continue;

        if (type === "asterisk") {
          // Always show SIP section so users can dial extension even with no configured targets.
          dialHtml += `
            <div class="target-section">
              <div class="section-label">\u{1F4DE} Asterisk / SIP</div>
              <div class="sip-dial-row">
                <input id="sip-ext-input" class="sip-ext-input" type="text"
                  value="${this._esc(this._sipDialDraft)}"
                  inputmode="numeric" placeholder="Dial extension\u2026 e.g. 101"
                  ${!connected ? "disabled" : ""} />
                <button class="sip-ext-btn" id="sip-ext-call" ${!connected ? "disabled" : ""}>Call</button>
              </div>
              ${targets.map(t => `
                <div class="sip-device${!connected ? " disabled" : ""}"
                  data-tid="${this._esc(t.id)}" data-ttype="asterisk"
                  data-tnodeid="${this._esc(t.node_id || t.id)}">
                  <div class="sip-icon">${t.icon || "\u{1F4DE}"}</div>
                  <div class="sip-info">
                    <div class="sip-label">${this._esc(t.label || t.id)}</div>
                    <div class="sip-ext">Ext.\u00A0${this._esc(t.extension || t.label || t.id)}\u00A0\u00B7\u00A0IP Phone / SIP Device</div>
                  </div>
                  <div class="sip-arrow">\u2192</div>
                </div>
              `).join("")}
            </div>
          `;
        } else {
          if (targets.length === 0) continue;
          dialHtml += `
            <div class="target-section">
              <div class="section-label">${icons[type] || ""} ${labels[type] || type}</div>
              <div class="target-grid">
                ${targets.map(t => `
                  <button class="btn-target type-${this._esc(type)}"
                    data-tid="${this._esc(t.id)}" data-ttype="${this._esc(type)}"
                    data-tnodeid="${this._esc(t.node_id || t.id)}"
                    ${!connected ? "disabled" : ""}>
                    <span class="target-icon">${t.icon || icons[type]}</span>
                    <span class="target-label">${this._esc(t.label || t.id)}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          `;
        }
      }

      // Node targets as quick-dial — merge fetched nodes + YAML config target_nodes
      const configOnlyNodes = (this._config.target_nodes || [])
        .filter(n => !nodeTargets.some(t => (t.node_id || t.id) === n))
        .map(n => ({ id: n, node_id: n, label: n, type: "node", icon: "\u{1F3E0}" }));
      const allNodeTargets = [...nodeTargets, ...configOnlyNodes];
      if (allNodeTargets.length > 0) {
        dialHtml += `
          <div class="target-section">
            <div class="section-label">\u{1F3E0} Nodes</div>
            <div class="target-grid">
              ${allNodeTargets.map(t => `
                <button class="btn-target type-node"
                  data-tid="${this._esc(t.id)}" data-ttype="node"
                  data-tnodeid="${this._esc(t.node_id || t.id)}"
                  ${!connected ? "disabled" : ""}>
                  <span class="target-icon">${t.icon || "\u{1F3E0}"}</span>
                  <span class="target-label">${this._esc(t.label || t.id)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `;
      }
    }

    // History tab
    let historyHtml = "";
    if (this._activeTab === "history") {
      if (!this._historyLoaded) {
        this._loadHistory();
        historyHtml = `<div class="users-loading">\u23F3 Loading call history\u2026</div>`;
      } else if (this._history.length === 0) {
        historyHtml = `
          <div class="history-empty">
            <div class="history-empty-icon">\u{1F4CB}</div>
            <div class="history-empty-text">No call history yet</div>
          </div>`;
      } else {
        historyHtml = `<div class="history-list">
          ${this._history.map(h => this._renderHistoryItem(h)).join("")}
        </div>`;
      }
    }

    const html = `
      <style>${STYLES}</style>
      <div class="card">
        <div class="header">
          <div class="header-icon">\u{1F4DE}</div>
          <div class="header-title">${this._esc(this._config.title)}</div>
          <span class="badge ${badgeCls}">${badgeTxt}</span>
        </div>

        ${warningHtml}
        ${callPanelHtml}

        ${isIdle ? notifBanner : ""}
        ${isIdle ? tabsHtml : ""}
        ${dialHtml}
        ${historyHtml}

        <div class="divider"></div>
        <div class="status-bar">
          <div class="dot ${dotCls}"></div>
          <span>${this._esc(nodeId)}${accountId ? " \u00B7 " + this._esc(accountId) : ""}</span>
          <span style="margin-left:auto;opacity:.4;">v${VERSION}</span>
        </div>
      </div>`;

    // Preserve focus
    const root = this._root();
    const activeId = root.activeElement?.id || "";
    const nodeInputBefore = root.querySelector("#node-input");
    const sipInputBefore = root.querySelector("#sip-ext-input");
    const wasNodeInputFocused = activeId === "node-input";
    const wasSipInputFocused = activeId === "sip-ext-input";
    const nodeCursorPos = wasNodeInputFocused ? nodeInputBefore?.selectionStart : null;
    const sipCursorPos = wasSipInputFocused ? sipInputBefore?.selectionStart : null;

    if (wasNodeInputFocused && nodeInputBefore) {
      this._nodeInputDraft = nodeInputBefore.value;
      this._selectedNode = nodeInputBefore.value;
    }
    if (wasSipInputFocused && sipInputBefore) {
      this._sipDialDraft = sipInputBefore.value;
    }

    root.innerHTML = html;

    // Bind events
    root.querySelector("#btn-answer")?.addEventListener("click", () => this._answer());
    root.querySelector("#btn-reject")?.addEventListener("click", () => this._reject());
    root.querySelector("#btn-hangup")?.addEventListener("click", () => this._hangup());
    root.querySelector("#btn-mute")?.addEventListener("click", () => this._toggleMute());
    root.querySelector("#btn-notif-perm")?.addEventListener("click", () => this._requestNotificationPermission());

    // Tabs
    root.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this._activeTab = tab.dataset.tab;
        this._render();
      });
    });

    // Node input
    const nodeInput = root.querySelector("#node-input");
    if (nodeInput) {
      nodeInput.addEventListener("input", (e) => {
        this._nodeInputDraft = e.target.value;
        this._selectedNode = e.target.value;
      });
      nodeInput.addEventListener("change", (e) => {
        const val = e.target.value.trim();
        this._nodeInputDraft = val;
        this._selectedNode = val;
        if (val) {
          this._fetchRemoteUsers(val);
        } else {
          this._remoteUsers = [];
        }
        this._render();
      });
      nodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = e.target.value.trim();
          if (val) {
            this._nodeInputDraft = val;
            this._selectedNode = val;
            this._fetchRemoteUsers(val);
            this._render();
          }
        }
      });
      if (wasNodeInputFocused) {
        nodeInput.focus();
        if (nodeCursorPos !== null) nodeInput.setSelectionRange(nodeCursorPos, nodeCursorPos);
      }
    }

    // Manual call button
    root.querySelector("#btn-call-manual")?.addEventListener("click", () => {
      const val = root.querySelector("#node-input")?.value?.trim();
      if (val) {
        this._nodeInputDraft = val;
        this._selectedNode = val;
        this._userPickerNodeId = val;
        this._userPickerTargetId = "";
        this._callService("get_remote_users", { node_id: val });
      }
    });

    // User items
    root.querySelector("[data-action='call-all']")?.addEventListener("click", () => {
      this._dial(this._selectedNode);
    });
    root.querySelectorAll(".user-item[data-uid]").forEach(item => {
      item.addEventListener("click", () => {
        this._dial(this._selectedNode, item.dataset.uid, item.dataset.uname);
      });
    });

    // Refresh users button
    root.querySelector("#btn-refresh-users")?.addEventListener("click", () => {
      if (this._selectedNode) {
        this._usersCache[this._selectedNode] = null;
        this._usersLoading = true;
        this._render();
        this._fetchRemoteUsers(this._selectedNode);
      }
    });

    // SIP: manual extension input + call button
    const sipInput = root.querySelector("#sip-ext-input");
    const sipCallBtn = root.querySelector("#sip-ext-call");
    sipInput?.addEventListener("input", (e) => {
      this._sipDialDraft = e.target.value;
    });
    const doSipDial = () => {
      const ext = (sipInput?.value ?? this._sipDialDraft).trim();
      if (ext) {
        this._sipDialDraft = ext;
        this._dialSIPExtension(ext);
      }
    };
    sipCallBtn?.addEventListener("click", doSipDial);
    sipInput?.addEventListener("keydown", e => { if (e.key === "Enter") doSipDial(); });
    if (wasSipInputFocused && sipInput) {
      sipInput.focus();
      if (sipCursorPos !== null) sipInput.setSelectionRange(sipCursorPos, sipCursorPos);
    }

    // SIP: device row clicks
    root.querySelectorAll(".sip-device:not(.disabled)").forEach(el => {
      el.addEventListener("click", () => {
        this._dialTarget(el.dataset.tid, "asterisk", el.dataset.tnodeid || el.dataset.tid);
      });
    });

    // Target buttons (device, queue, node)
    root.querySelectorAll(".btn-target").forEach(btn => {
      btn.addEventListener("click", () => {
        const tid = btn.dataset.tid;
        const ttype = btn.dataset.ttype;
        const tnodeid = btn.dataset.tnodeid || tid;
        if (ttype === "node") {
          this._userPickerNodeId = tnodeid;
          this._userPickerTargetId = tid;
          this._callService("get_remote_users", { node_id: tnodeid });
        } else {
          this._dialTarget(tid, ttype, tnodeid);
        }
      });
    });

    // History callback buttons
    root.querySelectorAll(".history-callback").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nodeId = btn.dataset.callback;
        if (nodeId) {
          if (nodeId.startsWith("sip:") || nodeId.startsWith("asterisk:")) {
            const ext = nodeId.split(":")[1];
            this._dialSIPExtension(ext);
          } else {
            this._userPickerNodeId = nodeId;
            this._userPickerTargetId = nodeId;
            this._callService("get_remote_users", { node_id: nodeId });
          }
        }
      });
    });

    if (isActive) this._updateTimer();
  }

  // ── History rendering ───────────────────────────────────────────────

  _renderHistoryItem(h) {
    const isMissed = ["missed", "declined", "timeout", "failed"].includes(h.state);
    const isIncoming = h.direction === "incoming";
    const isAnswered = h.state === "ended" && h.duration > 0;
    const iconClass = isMissed ? "missed" : (isIncoming ? "incoming" : "outgoing");
    // Better icons: ↙ incoming-answered, ↗ outgoing-answered, ↙✗ missed, ↗✗ failed
    const icon = isMissed ? (isIncoming ? "📵" : "❌") : (isIncoming ? "📲" : "📤");
    const name = h.remote_label || h.remote_node_id || "Unknown";
    const stateLabel = this._callStateLabel(h.state);
    const duration = h.duration > 0 ? this._formatDuration(h.duration) : "";
    const time = h.started_at ? this._formatTime(h.started_at) : "";
    // Build a callback data attribute for the callback button.
    const callbackData = h.remote_node_id ? `data-callback="${this._esc(h.remote_node_id)}"` : "";

    return `
      <div class="history-item">
        <div class="history-icon ${iconClass}">${icon}</div>
        <div class="history-info">
          <div class="history-name">${this._esc(name)}</div>
          <div class="history-detail">
            <span class="history-state ${isMissed ? "state-missed" : isAnswered ? "state-answered" : ""}">${stateLabel}</span>
            ${duration ? `<span class="history-sep">·</span><span>${duration}</span>` : ""}
            <span class="history-sep">·</span><span>${this._esc(h.call_type || "voice")}</span>
          </div>
        </div>
        <div style="text-align:right;display:flex;align-items:center;gap:8px">
          <div class="history-time">${time}</div>
          ${callbackData ? `<button class="history-callback" ${callbackData} title="Call back">📞</button>` : ""}
        </div>
      </div>
    `;
  }

  _callStateLabel(state) {
    const labels = {
      ended: "Completed", active: "Active", missed: "Missed",
      declined: "Declined", timeout: "No Answer", failed: "Failed",
      idle: "Idle", requesting: "Dialing", ringing: "Ringing",
      incoming: "Incoming",
    };
    return labels[state] || state;
  }

  _formatDuration(seconds) {
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return `${m}m ${rem}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  _formatTime(timestamp) {
    try {
      const d = new Date(timestamp * 1000);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isToday) return timeStr;
      if (isYesterday) return `Yesterday ${timeStr}`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + timeStr;
    } catch { return ""; }
  }

  // ── Timer ───────────────────────────────────────────────────────────

  _updateTimer() {
    if (!this._callStart) return;
    const el = this._root()?.querySelector("#call-timer");
    if (!el) return;
    const secs = Math.floor((Date.now() - this._callStart) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
  }

  // ── Utility ─────────────────────────────────────────────────────────

  _esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  static getConfigElement() { return document.createElement("div"); }
  static getStubConfig() {
    return { type: "custom:simson-relay-card", title: "Simson" };
  }
  getCardSize() { return 4; }
}

// Primary registration — new unique name avoids conflict with any old manually-added card.
customElements.define("simson-relay-card", SimsonCard);

// Silent back-compat aliases — if user had old card already defined, these are skipped.
try { customElements.define("simson-card", class extends SimsonCard {}); } catch (e) {}
try { customElements.define("simson-call-card", class extends SimsonCard {}); } catch (e) {}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simson-relay-card",
  name: "Simson Call Relay",
  description: "Voice calling between Home Assistant instances — WebRTC, history, Asterisk/SIP",
  preview: false,
});

console.info(
  `%c SIMSON %c v${VERSION} `,
  "background:#03a9f4;color:#000;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
  "background:#222;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0",
);
