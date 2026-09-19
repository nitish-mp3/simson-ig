import { html, nothing, unsafeCSS } from 'lit';
import { CardBase } from './card-base.js';
import { withHomeAssistant } from './controllers/home-assistant.js';
import { withCallActions } from './controllers/call-actions.js';
import { withMediaDevices } from './controllers/media-devices.js';
import { withWebRTC } from './controllers/webrtc.js';
import { withSipBridge } from './controllers/sip-bridge.js';
import { withNotifications } from './controllers/notifications.js';
import { withFormatting } from './shared/format.js';
import { reconcileCall } from './controllers/call-state.js';
import { dialView } from './views/dial.js';
import { callView } from './views/call.js';
import { historyView } from './views/history.js';
import { mediaView } from './views/media.js';
import { dialogsView } from './views/dialogs.js';
import styles from './styles/card.css';
import { VERSION } from './version.js';

const CardController = withFormatting(withNotifications(withSipBridge(withWebRTC(withMediaDevices(withCallActions(withHomeAssistant(CardBase)))))));

export class SimsonCard extends CardController {
  static styles = unsafeCSS(styles);

  set hass(value) {
    const previous = this._hass;
    if (previous?.connection && previous.connection !== value?.connection) this._unsubscribeHAEvents();
    this._hass = value;
    if (!this._config.node_id && !this._detectedNodeId) this._autoDetectNodeId();
    if (this.isConnected) this._connectHA();
    const node = this._nodeId();
    const suffixes = ['connection', 'call_state', 'active_call', 'calls_count'];
    const changed = !previous || previous.user?.id !== value?.user?.id ||
      suffixes.some(suffix => previous.states?.[`sensor.simson_${node}_${suffix}`] !== value?.states?.[`sensor.simson_${node}_${suffix}`]);
    if (changed) this.requestUpdate();
  }

  _connectHA() {
    if (!this._hass) return;
    if (!this._haEventSubscribed) this._subscribeHAEvents();
    if (!this._userHeartbeatInterval && this._hass.user) {
      this._sendUserHeartbeat();
      this._userHeartbeatInterval = setInterval(() => this._sendUserHeartbeat(), 20000);
    }
    if (!this._targetsLoaded && !this._targetsLoading) this._loadTargets();
  }

  connectedCallback() {
    super.connectedCallback();
    this._connectHA();
    this._timerInterval = setInterval(() => this._updateTimer(), 1000);
    navigator.mediaDevices?.addEventListener?.('devicechange', this._deviceChangeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timerInterval);
    clearInterval(this._userHeartbeatInterval);
    clearTimeout(this._incomingCallTimeout);
    this._userHeartbeatInterval = null;
    this._unsubscribeHAEvents();
    navigator.mediaDevices?.removeEventListener?.('devicechange', this._deviceChangeHandler);
    this._stopMediaPreview(false);
    this._cleanupWebRTC();
    this._removeUserPicker();
  }

  _render() { this.requestUpdate(); }

  willUpdate() {
    this._view = this._nodeId() ? reconcileCall.call(this) : null;
    if (this._view?.hasCall) this._stopMediaPreview(false);
  }

  updated() {
    this._attachMediaElements();
    this._updateTimer();
  }

  _selectTab(tab) {
    if (tab !== 'media') this._stopMediaPreview(false);
    this._activeTab = tab;
    if (tab === 'history' && !this._historyLoaded) this._loadHistory();
    if (tab === 'media') this._refreshMediaDevices(false);
    this.requestUpdate();
  }

  render() {
    const view = this._view;
    return html`<article class="surface">
      <header class="header">
        <span class="brand-mark" aria-hidden="true">S</span>
        <div class="heading"><span class="eyebrow">YOUR CONNECTION SPACE</span><h1>${this._config.title || 'Simson'}</h1></div>
        <span class="status ${view?.connected ? 'online' : ''}"><i></i>${view?.connected ? 'Connected' : 'Offline'}</span>
      </header>
      ${!view ? html`<div class="empty"><h2>Waiting for your node</h2><p>The card is ready. Your Simson integration will connect here.</p></div>` : html`
        ${this._actionError ? html`<div class="notice error" role="alert">${this._actionError}</div>` : nothing}
        ${this._mediaDeviceError && view.hasCall ? html`<div class="notice" role="status">${this._mediaDeviceError}</div>` : nothing}
        ${view.hasCall ? callView(this, view) : html`
          <nav class="tabs" aria-label="Call workspace">${[['dial','Call'],['history','Recent'],['media','Devices']].map(([id,label]) => html`<button aria-current=${this._activeTab === id ? 'page' : 'false'} class=${this._activeTab === id ? 'selected' : ''} @click=${() => this._selectTab(id)}>${label}</button>`)}</nav>
          ${this._activeTab === 'history' ? historyView(this) : this._activeTab === 'media' ? mediaView(this) : dialView(this, view)}
        `}
      `}
      ${dialogsView(this)}
      <footer><span>${this._nodeId() || 'Connecting node'}</span><span>Simson ${VERSION}</span></footer>
    </article>`;
  }
}

if (!customElements.get('simson-card-runtime')) customElements.define('simson-card-runtime', SimsonCard);
