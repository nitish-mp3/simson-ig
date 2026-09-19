import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { acquireSession, releaseSession } from './state/sessions.js';
import { dialView } from './views/dial.js';
import { callView } from './views/call.js';
import { historyView } from './views/history.js';
import { mediaView } from './views/media.js';
import { dialogsView } from './views/dialogs.js';
import styles from './styles/card.css';
import { VERSION } from './version.js';

export class SimsonCard extends LitElement {
  static styles = unsafeCSS(styles);
  constructor() { super(); this._config = {}; }
  setConfig(config) {
    this._config = config || {};
    this._bindSession();
    this.requestUpdate();
  }
  set hass(value) {
    this._hass = value;
    this._bindSession();
    if (this.session) this.session.hass = value;
  }
  _bindSession() {
    if (!this.isConnected || !this._hass) return;
    const session = acquireSession(this, this._hass, this._config);
    if (this.session !== session) {
      if (this.session) releaseSession(this.session, this);
      this.session = session;
      this.requestUpdate();
    }
  }
  connectedCallback() { super.connectedCallback(); this._bindSession(); }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.session) releaseSession(this.session, this);
    this.session = null;
  }
  updated() {
    if (!this.session) return;
    this.session._viewHost = this;
    this.session._attachMediaElements();
    this.session._updateTimer();
  }
  render() {
    const host = this.session;
    const view = host?._view;
    const mode = this._config.view || 'combined';
    const title = this._config.title || ({dial:'Dial a call',live:'Live call',history:'Recent calls',devices:'Call devices'}[mode] || 'Simson');
    const panel = host?._activeTab || 'dial';
    const peers = host ? [...host.views] : [];
    const pickerOwner = peers.find(item => ['dial','combined'].includes(item._config.view || 'combined'));
    const liveOwner = peers.find(item => item._config.view === 'live') || pickerOwner;
    const showDialog = host && (host._pickerOpen ? pickerOwner === this : liveOwner === this);
    return html`<article class="surface mode-${mode}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${mode === 'combined' ? 'CALL WORKSPACE' : mode.toUpperCase()}</span><h1>${title}</h1></div><span class="status ${view?.connected ? 'online' : ''}"><i></i>${view?.connected ? 'Connected' : 'Offline'}</span></header>
      ${!view ? html`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>` : html`
        ${!view.connected ? html`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>` : nothing}
        ${host._actionError ? html`<div class="notice error" role="alert">${host._actionError}</div>` : nothing}
        ${host._actionPending ? html`<div class="action-progress" role="status">${host._actionPending}</div>` : nothing}
        ${mode === 'live' ? (view.hasCall ? callView(host,view) : html`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`) :
          mode === 'history' ? historyView(host) : mode === 'devices' ? mediaView(host) : mode === 'dial' ? (panel === 'media' ? html`<button class="text-button" @click=${()=>host._selectTab('dial')}>← Back to dialing</button>${mediaView(host)}` : dialView(host,view)) : html`
            ${view.hasCall ? callView(host,view) : nothing}
            <nav class="tabs" aria-label="Call workspace">${[['dial','Dial'],['history','Recent'],['media','Devices']].map(([id,label])=>html`<button class=${panel===id?'selected':''} aria-current=${panel===id?'page':'false'} @click=${()=>host._selectTab(id)}>${label}</button>`)}</nav>
            ${panel==='history'?historyView(host):panel==='media'?mediaView(host):view.hasCall?html`<p class="fine-print">End the current call before starting another.</p>`:dialView(host,view)}
          `}
      `}
      ${showDialog ? dialogsView(host) : nothing}
      <footer><span>${host?._nodeId() || 'Connecting node'}</span><span>v${VERSION}</span></footer>
    </article>`;
  }
}
if (!customElements.get('simson-card-runtime')) customElements.define('simson-card-runtime', SimsonCard);
