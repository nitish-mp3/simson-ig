import { LitElement, html, css } from 'lit';

class SimsonCardEditor extends LitElement {
  static styles = css`:host{display:grid;gap:16px;padding:16px}label{display:grid;gap:6px}input{padding:12px;font:inherit;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px}`;
  setConfig(config) { this.config=config;this.requestUpdate(); }
  change(key,value) {
    this.config={...this.config,[key]:value};
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));
  }
  render() {
    return html`<label>Title<input .value=${this.config?.title || 'Simson'} @input=${event => this.change('title',event.target.value)}></label><label>Node ID (leave blank to detect)<input .value=${this.config?.node_id || ''} @input=${event => this.change('node_id',event.target.value)}></label><label>Default gateway trunk<input .value=${this.config?.pstn_trunk || ''} @input=${event => this.change('pstn_trunk',event.target.value)}></label>`;
  }
}
if(!customElements.get('simson-card-editor'))customElements.define('simson-card-editor',SimsonCardEditor);
