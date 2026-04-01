/**
 * Simson Call Relay — Lovelace Card
 *
 * Config example:
 *   type: custom:simson-card
 *   node_id: living_room          # matches your node_id in addon config
 *   target_node_id: office        # default dial target (optional)
 *   title: Simson                 # card title (optional)
 */

const VERSION = "1.0.1";

// ── Styles ────────────────────────────────────────────────────────────────────
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
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .header-icon {
    width: 36px; height: 36px;
    background: #03a9f422;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  .header-title { font-size: 16px; font-weight: 600; flex: 1; }
  .badge {
    font-size: 11px; font-weight: 700; padding: 2px 9px;
    border-radius: 10px; text-transform: uppercase; letter-spacing: .5px;
  }
  .badge-ok   { background: #1b5e2088; color: #a5d6a7; border: 1px solid #a5d6a740; }
  .badge-err  { background: #b71c1c88; color: #ef9a9a; border: 1px solid #ef9a9a40; }
  .badge-warn { background: #e65100aa; color: #ffcc80; border: 1px solid #ffcc8040; }

  /* Dial pad */
  .dial-section { margin-bottom: 14px; }
  .dial-label { font-size: 11px; color: var(--secondary-text-color, #888); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
  .input-row { display: flex; gap: 8px; }
  .node-input {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 9px 12px;
    color: var(--primary-text-color, #e1e1e1);
    font-size: 14px;
    outline: none;
    transition: border-color .2s;
  }
  .node-input:focus { border-color: #03a9f4; }
  .node-input[disabled] { opacity: .5; cursor: not-allowed; }

  /* Buttons */
  .btn {
    border: none; border-radius: 8px; padding: 9px 16px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: opacity .15s, transform .1s;
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap;
  }
  .btn:active { transform: scale(.96); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-call   { background: #2e7d32; color: #fff; }
  .btn-answer { background: #1565c0; color: #fff; }
  .btn-reject { background: #b71c1c; color: #fff; }
  .btn-hangup { background: #b71c1c; color: #fff; }

  /* Active call panel */
  .call-panel {
    background: #1a2940;
    border: 1px solid #1565c044;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }
  .call-panel.incoming {
    background: #1a2700;
    border-color: #33691e55;
    animation: pulse-incoming 1.5s infinite;
  }
  @keyframes pulse-incoming {
    0%, 100% { border-color: #33691e55; }
    50% { border-color: #8bc34a99; }
  }
  .call-who { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .call-meta { font-size: 12px; color: #888; margin-bottom: 10px; }
  .call-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* Timer */
  .timer { font-size: 12px; color: #888; font-variant-numeric: tabular-nums; }

  /* Divider */
  hr { border: none; border-top: 1px solid #333; margin: 14px 0; }

  /* Status row */
  .status-row {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--secondary-text-color, #888);
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-ok  { background: #4caf50; }
  .dot-err { background: #f44336; }
`;

// ── Card element ──────────────────────────────────────────────────────────────
class SimsonCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._interval = null;
    this._callStart = null;
    this._timerInterval = null;
    this._targetInput = "";
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
    this._render();
  }

  connectedCallback() {
    // Timer tick every second for call duration display.
    this._timerInterval = setInterval(() => this._updateTimer(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timerInterval);
  }

  // ── Data helpers ─────────────────────────────────────────────────────────

  _entity(suffix) {
    return this._hass?.states[`sensor.simson_${this._config.node_id}_${suffix}`];
  }

  _attr(suffix, key, fallback = null) {
    return this._entity(suffix)?.attributes?.[key] ?? fallback;
  }

  _val(suffix, fallback = "unknown") {
    return this._entity(suffix)?.state ?? fallback;
  }

  _isConnected() { return this._val("connection") === "connected"; }

  _callState() { return this._val("call_state", "idle"); }

  _activeCallAttr(key, fallback = "") {
    return this._attr("call_state", key, fallback);
  }

  // ── HA service calls ─────────────────────────────────────────────────────

  async _callService(service, data = {}) {
    if (!this._hass) return;
    await this._hass.callService("simson", service, data);
    // Re-render after a brief delay for state to propagate.
    setTimeout(() => this._render(), 600);
  }

  _dial() {
    const target = this._root().querySelector("#target-input")?.value?.trim();
    if (!target) return;
    this._callStart = Date.now();
    this._callService("make_call", { target_node_id: target, call_type: "voice" });
  }

  _answer() {
    const callId = this._activeCallAttr("call_id");
    this._callStart = Date.now();
    this._callService("answer_call", { call_id: callId });
  }

  _reject() {
    const callId = this._activeCallAttr("call_id");
    this._callService("reject_call", { call_id: callId, reason: "declined" });
  }

  _hangup() {
    const callId = this._activeCallAttr("call_id");
    this._callStart = null;
    this._callService("hangup_call", { call_id: callId });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _root() { return this.shadowRoot; }

  _render() {
    if (!this._config.node_id) return;

    const connected = this._isConnected();
    const callState = this._callState();
    const isIdle      = callState === "idle" || callState === "unknown";
    const isIncoming  = callState === "incoming";
    const isRinging   = callState === "requesting" || callState === "ringing";
    const isActive    = callState === "active";
    const hasCall     = !isIdle;

    const remoteLabel = this._activeCallAttr("remote_label") || this._activeCallAttr("remote_node_id", "Unknown");
    const callId      = this._activeCallAttr("call_id", "");
    const direction   = this._activeCallAttr("direction", "");
    const callType    = this._activeCallAttr("call_type", "voice");
    const answeredAt  = this._activeCallAttr("answered_at");

    // Sync call timer start from answered_at if available.
    if (isActive && answeredAt && !this._callStart) {
      this._callStart = new Date(answeredAt).getTime();
    }
    if (isIdle) { this._callStart = null; }

    const badgeClass = connected ? "badge-ok" : "badge-err";
    const badgeText  = connected ? "Online" : "Offline";

    const connDot    = connected ? "dot-ok" : "dot-err";
    const nodeId     = this._attr("connection", "node_id", this._config.node_id);
    const accountId  = this._attr("connection", "account_id", "");

    // ── HTML ─────────────────────────────────────────────────────────────
    const callPanelHtml = hasCall ? `
      <div class="call-panel ${isIncoming ? "incoming" : ""}">
        <div class="call-who">${remoteLabel}</div>
        <div class="call-meta">
          ${direction === "incoming" ? "⬇ Incoming" : "⬆ Outgoing"} · ${callType}
          ${isActive ? `· <span class="timer" id="call-timer">00:00</span>` : ""}
          ${isIncoming ? "· Ringing..." : ""}
          ${isRinging  ? "· Calling..." : ""}
        </div>
        <div class="call-actions">
          ${isIncoming
            ? `<button class="btn btn-answer" id="btn-answer">📞 Answer</button>
               <button class="btn btn-reject" id="btn-reject">❌ Decline</button>`
            : `<button class="btn btn-hangup" id="btn-hangup">📴 Hang Up</button>`
          }
        </div>
      </div>` : "";

    const html = `
      <style>${STYLES}</style>
      <div class="card">
        <div class="header">
          <div class="header-icon">📞</div>
          <div class="header-title">${this._config.title}</div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        ${callPanelHtml}

        ${isIdle ? `
        <div class="dial-section">
          <div class="dial-label">Dial</div>
          <div class="input-row">
            <input
              id="target-input"
              class="node-input"
              type="text"
              placeholder="node_id (e.g. office)"
              value="${this._targetInput}"
              ${!connected ? "disabled" : ""}
            />
            <button class="btn btn-call" id="btn-call" ${!connected ? "disabled" : ""}>
              📞 Call
            </button>
          </div>
        </div>` : ""}

        <hr/>
        <div class="status-row">
          <div class="dot ${connDot}"></div>
          <span>${nodeId}${accountId ? " · " + accountId : ""}</span>
        </div>
      </div>`;

    // Save focus state before wiping DOM so typing isn't interrupted.
    const root = this._root();
    const wasInputFocused = root.activeElement?.id === "target-input";
    const selStart = wasInputFocused ? root.querySelector("#target-input")?.selectionStart : null;
    const selEnd   = wasInputFocused ? root.querySelector("#target-input")?.selectionEnd   : null;

    root.innerHTML = html;

    // Attach event listeners.
    root.querySelector("#btn-call")?.addEventListener("click", () => this._dial());
    root.querySelector("#btn-answer")?.addEventListener("click", () => this._answer());
    root.querySelector("#btn-reject")?.addEventListener("click", () => this._reject());
    root.querySelector("#btn-hangup")?.addEventListener("click", () => this._hangup());

    const inputEl = root.querySelector("#target-input");
    if (inputEl) {
      inputEl.addEventListener("input", e => { this._targetInput = e.target.value; });
      inputEl.addEventListener("keydown", e => { if (e.key === "Enter") this._dial(); });
      // Restore focus and cursor position if the input was active during re-render.
      if (wasInputFocused) {
        inputEl.focus();
        inputEl.setSelectionRange(selStart, selEnd);
      }
    }

    // Prime timer if call is active.
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

  // Config editor stub (required by HA for custom cards to work in UI editor).
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
  description: "Dial pad and call control for Simson Call Relay",
  preview: false,
  documentationURL: "https://github.com/nitish-mp3/simson-ig",
});

console.info(
  `%c SIMSON-CARD %c v${VERSION} `,
  "background:#03a9f4;color:#000;font-weight:700;padding:2px 4px;border-radius:4px 0 0 4px",
  "background:#333;color:#fff;padding:2px 4px;border-radius:0 4px 4px 0",
);
