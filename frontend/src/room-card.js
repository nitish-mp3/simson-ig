export function roomSnapshot(state) {
  const attributes = state?.attributes || {};
  return {
    configured: Boolean(attributes.simson_room && attributes.node_id && attributes.room_id),
    label: attributes.friendly_name || attributes.room_id || 'Room calling',
    state: state?.state || 'unavailable',
    node: attributes.node_id, room: attributes.room_id,
    session: attributes.session_id || '', call: attributes.call_id || '',
    components: attributes.components || {}, reason: attributes.reason || '',
    audio: attributes.audio_mode || 'browser', video: attributes.video_mode || 'none',
  };
}

export function roomCanStart(state) {
  return ['idle', 'ended'].includes(state);
}

export class SimsonRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
  }
  setConfig(config) {
    if (!config?.entity) throw Error('Select a Simson room sensor with entity: sensor.your_room');
    this._config = config;
    this._snapshot = '';
    this._render();
  }
  set hass(value) { this._hass = value; this._render(); }
  getCardSize() { return 4; }
  static getStubConfig() { return {type: 'custom:simson-room-card', entity: ''}; }
  async _action(action, room) {
    if (this._pending) return;
    this._pending = true;
    this._error = '';
    this._render();
    try {
      const data = {node_id: room.node, room_id: room.room};
      if (action === 'start_room_call') {
        this._requestId ||= crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
        data.request_id = this._requestId;
      } else data.session_id = room.session;
      await this._hass.callService('simson', action, data);
      this._requestId = '';
    } catch (error) {
      this._error = error?.message || 'The room action failed. Check the room state before retrying.';
    } finally { this._pending = false; this._render(); }
  }
  _render() {
    if (!this._config || !this._hass) return;
    const room = roomSnapshot(this._hass.states[this._config.entity]);
    const snapshot = JSON.stringify([room, this._pending, this._error]);
    if (snapshot === this._snapshot) return;
    this._snapshot = snapshot;
    const focusedAction = this.shadowRoot.activeElement?.dataset?.action;
    this.shadowRoot.replaceChildren();
    const style = document.createElement('style');
    style.textContent = `:host{display:block;font-family:var(--paper-font-body1_-_font-family,Arial,sans-serif)}ha-card{display:block;padding:24px;border-radius:20px;background:var(--ha-card-background,var(--card-background-color,#152130));color:var(--primary-text-color,#e8f2f7)}h2{margin:4px 0 16px;font-size:1.35rem;overflow-wrap:anywhere}p{line-height:1.5;overflow-wrap:anywhere}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.12em;color:var(--secondary-text-color,#9eb1c4)}.status{font-weight:600;text-transform:capitalize}.components{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.chip{padding:6px 10px;background:var(--secondary-background-color,#233242);border-radius:20px;font-size:.85rem}button{min-height:48px;padding:12px 20px;border:0;border-radius:12px;background:var(--primary-color,#9de8ce);color:var(--text-primary-color,#0b2525);font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:3px solid var(--primary-text-color,#e8f2f7);outline-offset:3px}.warning{color:var(--error-color,#ffb4b4)}.hint{font-size:.85rem;color:var(--secondary-text-color,#9eb1c4)}`;
    const card = document.createElement('ha-card');
    const append = (tag, text, className = '') => {
      const element = document.createElement(tag);
      element.textContent = text;
      element.className = className;
      card.append(element);
      return element;
    };
    append('div', 'Simson · Room', 'eyebrow');
    append('h2', this._config.title || room.label);
    const status = append('p', room.state.replaceAll('_', ' '), 'status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (!room.configured) append('p', 'Configure a room with simson.configure_room, then select its sensor.', 'warning');
    else {
      append('p', `${room.audio === 'sip' ? 'SIP handset' : 'Browser'} audio · ${room.video === 'none' ? 'Voice only' : 'Video enabled'}`, 'hint');
      const components = append('div', '', 'components');
      for (const [name, state] of Object.entries(room.components)) {
        if (state === 'disabled') continue;
        const chip = document.createElement('span');
        chip.className = 'chip'; chip.textContent = `${name}: ${state}`; components.append(chip);
      }
      if (room.reason || this._error) append('p', this._error || room.reason, 'warning');
      const starting = roomCanStart(room.state);
      const action = starting ? 'start_room_call' : 'end_room_call';
      const button = append('button', this._pending ? 'Working…' : starting ? 'Call caregiver' : room.state === 'attention' ? 'Retry cleanup' : 'End room session');
      button.dataset.action = action;
      button.disabled = this._pending || room.state === 'unavailable' || (!starting && !room.session);
      button.addEventListener('click', () => this._action(action, room));
      append('p', 'Room controls coordinate devices. Use the Simson live-call card for media; other dashboards never join automatically.', 'hint');
    }
    this.shadowRoot.append(style, card);
    if(this._hass.user?.is_admin){
      const link=append('a','Manage rooms');link.href='/simson-call?tab=rooms';
      link.style.cssText='display:inline-block;margin-top:16px;color:var(--primary-color,#9de8ce)';
    }
    if (focusedAction) this.shadowRoot.querySelector(`[data-action="${focusedAction}"]`)?.focus();
  }
}
