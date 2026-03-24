/**
 * Simson Call Card — Lovelace custom card for Simson Call Relay.
 *
 * Shows connection status, active call info, call controls.
 * Fires HA services for make/answer/reject/hangup.
 */

const CARD_VERSION = "1.0.0";

class SimsonCallCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    // Only re-render if relevant entity states changed.
    if (this._needsRender(oldHass, hass)) {
      this._render();
    }
  }

  setConfig(config) {
    if (!config.connection_entity) {
      throw new Error("Please define 'connection_entity'");
    }
    if (!config.call_state_entity) {
      throw new Error("Please define 'call_state_entity'");
    }
    this._config = {
      title: config.title || "Simson Calls",
      connection_entity: config.connection_entity,
      call_state_entity: config.call_state_entity,
      calls_count_entity: config.calls_count_entity || "",
      target_nodes: config.target_nodes || [],
      ...config,
    };
    this._render();
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return {
      title: "Simson Calls",
      connection_entity: "sensor.simson_unknown_connection",
      call_state_entity: "sensor.simson_unknown_call_state",
      calls_count_entity: "",
      target_nodes: [],
    };
  }

  _getState(entityId) {
    if (!this._hass || !entityId) return null;
    return this._hass.states[entityId] || null;
  }

  _callService(service, data) {
    if (!this._hass) return;
    this._hass.callService("simson", service, data);
  }

  _render() {
    if (!this._hass || !this._config.connection_entity) return;

    const connState = this._getState(this._config.connection_entity);
    const callState = this._getState(this._config.call_state_entity);
    const callsCount = this._getState(this._config.calls_count_entity);

    const connected = connState && connState.state === "connected";
    const currentCall = callState ? callState.state : "idle";
    const callAttrs = callState ? callState.attributes : {};

    const isIdle = currentCall === "idle";
    const isIncoming = currentCall === "incoming" || currentCall === "ringing";
    const isActive = currentCall === "active";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .title {
          font-size: 1.2em;
          font-weight: 500;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .status-dot.connected { background-color: #4caf50; }
        .status-dot.disconnected { background-color: #f44336; }
        .status-dot.unknown { background-color: #9e9e9e; }
        .status-row {
          display: flex;
          align-items: center;
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-bottom: 12px;
        }
        .call-info {
          background: var(--card-background-color, #1e1e1e);
          border: 1px solid var(--divider-color, #333);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .call-info .label {
          font-size: 0.85em;
          color: var(--secondary-text-color);
        }
        .call-info .value {
          font-size: 1.1em;
          font-weight: 500;
          margin-top: 2px;
        }
        .call-info .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .incoming-banner {
          background: #ff9800;
          color: #fff;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          text-align: center;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .incoming-banner .from {
          font-size: 1.2em;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .btn-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn {
          flex: 1;
          min-width: 80px;
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          font-size: 0.9em;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
          color: #fff;
        }
        .btn:hover { opacity: 0.85; }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-call { background: #4caf50; }
        .btn-answer { background: #4caf50; }
        .btn-reject { background: #f44336; }
        .btn-hangup { background: #f44336; }
        .btn-intercom { background: #2196f3; }
        .node-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .node-btn {
          padding: 10px 8px;
          border: 1px solid var(--divider-color, #333);
          border-radius: 8px;
          background: var(--card-background-color, #1e1e1e);
          color: var(--primary-text-color);
          cursor: pointer;
          text-align: center;
          font-size: 0.85em;
          transition: background 0.2s;
        }
        .node-btn:hover {
          background: var(--primary-color);
          color: #fff;
        }
        .node-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .node-btn .icon {
          font-size: 1.4em;
          margin-bottom: 4px;
        }
        .divider {
          height: 1px;
          background: var(--divider-color, #333);
          margin: 12px 0;
        }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: 16px;
          font-size: 0.9em;
        }
      </style>

      <ha-card>
        <div class="header">
          <span class="title">${this._config.title}</span>
          ${callsCount ? `<span style="font-size:0.85em;color:var(--secondary-text-color)">${callsCount.state} calls</span>` : ""}
        </div>

        <div class="status-row">
          <span class="status-dot ${connected ? "connected" : connState ? "disconnected" : "unknown"}"></span>
          ${connected ? "Connected to VPS" : connState ? "Disconnected" : "Unknown"}
          ${connState && connState.attributes.node_id ? ` &middot; ${connState.attributes.node_id}` : ""}
        </div>

        ${isIncoming ? this._renderIncoming(callAttrs) : ""}
        ${isActive ? this._renderActive(callAttrs) : ""}
        ${isIdle ? this._renderNodeGrid(connected) : ""}
      </ha-card>
    `;

    // Bind event listeners.
    this._bindButtons();
  }

  _needsRender(oldHass, newHass) {
    if (!oldHass) return true;
    const entities = [
      this._config.connection_entity,
      this._config.call_state_entity,
      this._config.calls_count_entity,
    ].filter(Boolean);
    return entities.some((e) => oldHass.states[e] !== newHass.states[e]);
  }

  _renderIncoming(attrs) {
    const callId = attrs.call_id || "";
    const from = attrs.remote_label || attrs.remote_node_id || "Unknown";
    const callType = attrs.call_type || "voice";
    return `
      <div class="incoming-banner">
        <div class="from">Incoming ${this._escapeHtml(callType)} call</div>
        <div>From: ${this._escapeHtml(from)}</div>
      </div>
      <div class="btn-row">
        <button class="btn btn-answer" data-action="answer" data-call-id="${this._escapeAttr(callId)}">
          Answer
        </button>
        <button class="btn btn-reject" data-action="reject" data-call-id="${this._escapeAttr(callId)}">
          Reject
        </button>
      </div>
    `;
  }

  _renderActive(attrs) {
    const callId = attrs.call_id || "";
    const remote = attrs.remote_label || attrs.remote_node_id || "Unknown";
    const callType = attrs.call_type || "voice";
    const direction = attrs.direction === "outgoing" ? "Outgoing" : "Incoming";
    return `
      <div class="call-info">
        <div class="row">
          <div><span class="label">State</span><div class="value">In Call</div></div>
          <div><span class="label">Type</span><div class="value">${this._escapeHtml(callType)}</div></div>
        </div>
        <div class="row">
          <div><span class="label">With</span><div class="value">${this._escapeHtml(remote)}</div></div>
          <div><span class="label">Direction</span><div class="value">${direction}</div></div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-hangup" data-action="hangup" data-call-id="${this._escapeAttr(callId)}">
          Hang Up
        </button>
      </div>
    `;
  }

  _renderNodeGrid(connected) {
    const nodes = this._config.target_nodes || [];
    if (nodes.length === 0) {
      return `<div class="empty">No target nodes configured.<br>Add <code>target_nodes</code> to card config.</div>`;
    }
    const items = nodes
      .map(
        (n) => `
      <button class="node-btn" data-action="call" data-node-id="${this._escapeAttr(n.node_id || n)}" ${!connected ? "disabled" : ""}>
        <div class="icon">📞</div>
        ${this._escapeHtml(n.label || n.node_id || n)}
      </button>
    `
      )
      .join("");
    return `
      <div class="divider"></div>
      <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px">Quick Call</div>
      <div class="node-grid">${items}</div>
    `;
  }

  _bindButtons() {
    this.shadowRoot.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        const callId = e.currentTarget.dataset.callId;
        const nodeId = e.currentTarget.dataset.nodeId;

        switch (action) {
          case "call":
            this._callService("make_call", { target_node_id: nodeId });
            break;
          case "answer":
            this._callService("answer_call", { call_id: callId });
            break;
          case "reject":
            this._callService("reject_call", { call_id: callId });
            break;
          case "hangup":
            this._callService("hangup_call", { call_id: callId });
            break;
        }
      });
    });
  }

  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  _escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

customElements.define("simson-call-card", SimsonCallCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simson-call-card",
  name: "Simson Call Card",
  description: "Call control card for Simson Call Relay",
  preview: true,
});

console.info(
  `%c SIMSON-CALL-CARD %c v${CARD_VERSION} `,
  "background:#4caf50;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#333;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0"
);
