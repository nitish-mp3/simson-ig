import { LitElement, html, css } from 'lit';

class SimsonCardEditor extends LitElement {
  static styles = css`:host{display:grid;gap:16px;padding:16px}label{display:grid;gap:6px}input,select{padding:12px;font:inherit;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px}`;
  setConfig(config) { this.config=config;this.requestUpdate(); }
  change(key,value) {
    this.config={...this.config,[key]:value};
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));
  }
  render() {
    return html`<label>Panel<select .value=${this.config?.view || ({"custom:simson-dial-card":"dial","custom:simson-live-call-card":"live","custom:simson-history-card":"history","custom:simson-devices-card":"devices"}[this.config?.type] || "combined")} @change=${event => this.change("view",event.target.value)}>${[["combined","All-in-one"],["dial","Dialer"],["live","Live call"],["history","History"],["devices","Camera & microphone"]].map(([value,label])=>html`<option value=${value}>${label}</option>`)}</select></label><label>Title<input .value=${this.config?.title || 'Simson'} @input=${event => this.change('title',event.target.value)}></label><label>Node ID (leave blank to detect)<input .value=${this.config?.node_id || ''} @input=${event => this.change('node_id',event.target.value)}></label><label>Default gateway trunk<input .value=${this.config?.pstn_trunk || ''} @input=${event => this.change('pstn_trunk',event.target.value)}></label>`;
  }
}
if(!customElements.get('simson-card-editor'))customElements.define('simson-card-editor',SimsonCardEditor);
