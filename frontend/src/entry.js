let runtime;
let attempts = 0;
const loadRuntime = () => runtime ||= (attempts++ ? import(new URL('__SIMSON_CARD_CHUNK__?retry=' + attempts, import.meta.url).href) : import('./card.js')).catch(error => {
  runtime = null;
  throw error;
});

class SimsonCardShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = config || {};
    this._card?.setConfig(this._config);
  }

  set hass(value) {
    this._hass = value;
    if (this._card) this._card.hass = value;
  }

  connectedCallback() {
    if (!this._card) this._load();
  }

  async _load() {
    if (this._loading) return;
    this._loading = true;
    this._showStatus('Opening Simson…');
    try {
      const { SimsonCard } = await loadRuntime();
      if (!this.isConnected) return;
      const card = new SimsonCard();
      card.setConfig(this._config);
      if (this._hass) card.hass = this._hass;
      this._card = card;
      this.shadowRoot.replaceChildren(card);
    } catch (error) {
      this._showStatus('Simson could not load. Check your connection and retry.', true);
      console.error('[Simson] Card module failed to load', error);
    } finally {
      this._loading = false;
    }
  }

  _showStatus(message, retry = false) {
    const panel = document.createElement('div');
    panel.style.cssText = 'padding:24px;border-radius:20px;background:var(--ha-card-background,var(--card-background-color,#151a22));color:var(--primary-text-color,#eee);font:14px system-ui;min-height:96px;box-sizing:border-box';
    panel.setAttribute('role', 'status');
    panel.textContent = message;
    if (retry) {
      const button = document.createElement('button');
      button.textContent = 'Retry';
      button.style.cssText = 'display:block;margin-top:16px;padding:10px 20px;cursor:pointer';
      button.addEventListener('click', () => this._load());
      panel.append(button);
    }
    this.shadowRoot.replaceChildren(panel);
  }

  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: 6, min_columns: 6, min_rows: 4 }; }
  static getStubConfig() { return { type: 'custom:simson-relay-card', title: 'Simson' }; }
  static async getConfigElement() {
    await import('./editor.js');
    return document.createElement('simson-card-editor');
  }
}

for (const name of ['simson-relay-card', 'simson-card', 'simson-call-card']) {
  if (!customElements.get(name)) customElements.define(name, class extends SimsonCardShell {});
}
window.customCards ||= [];
if (!window.customCards.some(card => card.type === 'simson-relay-card')) {
  window.customCards.push({ type: 'simson-relay-card', name: 'Simson', description: 'Calls, contacts and browser media', preview: true });
}
