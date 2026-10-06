import { LitElement, html, nothing } from 'lit';

class DoorCamera extends LitElement {
  static properties = {hass: {attribute: false}, entity: {}, live: {type: Boolean}};
  createRenderRoot() { return this; }
  updated() {
    const key = `${this.entity}:${this.live}:${Boolean(this.hass?.states?.[this.entity])}`;
    if (this._key !== key) { this._key = key; this._load(key); }
    if (this._camera) this._camera.hass = this.hass;
  }
  async _load(key) {
    this._camera = null;
    const container = this.querySelector('.camera-container');
    if (!container) return;
    container.replaceChildren();
    if (!this.entity || !this.hass?.states?.[this.entity]) {
      container.textContent = 'Choose your Home Assistant camera entity in the card editor.';
      return;
    }
    try {
      const helpers = await window.loadCardHelpers();
      const camera = helpers.createCardElement({type: 'picture-entity', entity: this.entity,
        camera_view: this.live ? 'live' : 'auto', show_name: false, show_state: false,
        tap_action: {action: 'none'}, hold_action: {action: 'none'}});
      if (this._key !== key || !this.isConnected) return;
      camera.hass = this.hass;
      this._camera = camera;
      container.replaceChildren(camera);
    } catch {
      if (this._key === key) container.textContent = 'Camera could not load. Check its Home Assistant integration.';
    }
  }
  render() { return html`<div class="camera-container"></div>`; }
}
if (!customElements.get('simson-door-camera')) customElements.define('simson-door-camera', DoorCamera);

export function doorView(card, host, view, renderCall) {
  const config = card._config;
  const extension = String(config.extension || '').trim();
  const camera = config.camera_entity || '';
  const callingDoor = Boolean(extension) && view.hasCall && (String(host._currentRemoteNode || '') === extension ||
    host._activeCallAttr('target_extension') === extension || host._activeCallAttr('remote_node_id') === `sip:${extension}`);
  return html`<section class="door-workspace">
    <div class="section-heading"><h2>${config.device_name || 'Door phone'}</h2><span>SIP ${extension || 'not configured'}</span></div>
    <simson-door-camera .hass=${card._hass} .entity=${camera} .live=${callingDoor || card._doorPreview === true}></simson-door-camera>
    <p class="fine-print">Video uses your Home Assistant camera. Calling uses the door’s registered SIP extension. Viewing never joins another call.</p>
    ${callingDoor ? renderCall(host,view) : html`<div class="call-actions">
      <button class="primary" ?disabled=${!extension || !view.connected || view.hasCall || Boolean(host._actionPending)}
        @click=${()=>host._runAction('door:'+extension,()=>host._dialSIPExtension(extension))}>Call door phone</button>
      <button ?disabled=${!camera} aria-pressed=${card._doorPreview === true}
        @click=${()=>{card._doorPreview = !card._doorPreview; card.requestUpdate();}}>${card._doorPreview ? 'Stop video' : 'View live video'}</button>
    </div>`}
    ${!extension ? html`<div class="notice">Set the SIP extension and select a camera in this card’s editor.</div>` : nothing}
  </section>`;
}
