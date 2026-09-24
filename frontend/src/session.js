import { nothing } from 'lit';
import { CardBase } from './card-base.js';
import { withHomeAssistant } from './controllers/home-assistant.js';
import { withCallActions } from './controllers/call-actions.js';
import { withMediaDevices } from './controllers/media-devices.js';
import { withWebRTC } from './controllers/webrtc.js';
import { withSipBridge } from './controllers/sip-bridge.js';
import { withNotifications } from './controllers/notifications.js';
import { withFormatting } from './shared/format.js';
import { reconcileCall } from './controllers/call-state.js';

const CardController = withFormatting(withNotifications(withSipBridge(withWebRTC(withMediaDevices(withCallActions(withHomeAssistant(CardBase)))))));

export class CallSession extends CardController {
  views = new Set();

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
    if (!this._webrtcConfig && !this._webrtcConfigPromise) this._fetchWebRTCConfig();
    if (!this._userHeartbeatInterval && this._hass.user) {
      this._sendUserHeartbeat();
      this._userHeartbeatInterval = setInterval(() => this._sendUserHeartbeat(), 20000);
    }
    if (!this._targetsLoaded && !this._targetsLoading) this._loadTargets();
  }

  connectedCallback() {
    super.connectedCallback();
    this._connectHA();
    if (!this._mediaDevicesLoaded) this._refreshMediaDevices(false);
    this._timerInterval = setInterval(() => {
      for (const view of this.views) { this._viewHost = view; this._updateTimer(); }
    }, 1000);
    navigator.mediaDevices?.addEventListener?.('devicechange', this._deviceChangeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timerInterval);
    clearInterval(this._userHeartbeatInterval);
    clearTimeout(this._incomingCallTimeout);
    clearTimeout(this._outgoingUiTimer);
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
    for (const view of this.views) view.requestUpdate();
  }

  _root() { return this._viewHost?.shadowRoot || this.shadowRoot; }

  _selectTab(tab) {
    if (tab !== 'media') this._stopMediaPreview(false);
    this._activeTab = tab;
    if (tab === 'history' && !this._historyLoaded) this._loadHistory();
    if (tab === 'media') this._refreshMediaDevices(false);
    this.requestUpdate();
  }


  render() { return nothing; }
}

if (!customElements.get("simson-call-session")) customElements.define("simson-call-session", CallSession);
