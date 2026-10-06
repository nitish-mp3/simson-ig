import { loadRuntime, loadEditor } from './transport/runtime-loader.js';

export class SimsonCardShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._config = {};
    this._recover = ()=>{if(this.isConnected && document.visibilityState !== 'hidden' && !this._card){this._retryCount=0;this._load();}};
  }
  setConfig(config) {
    this._config = {view:this.constructor.defaultView || 'combined', ...config};
    this._card?.setConfig(this._config);
  }
  set hass(value) {this._hass=value;if(this._card)this._card.hass=value;}
  connectedCallback() {
    window.addEventListener('online',this._recover);
    document.addEventListener('visibilitychange',this._recover);
    if (!this._card) this._load();
  }
  disconnectedCallback() {
    clearTimeout(this._retryTimer);
    window.removeEventListener('online',this._recover);
    document.removeEventListener('visibilitychange',this._recover);
  }
  async _load() {
    if (this._loading) return;
    clearTimeout(this._retryTimer);
    this._loading=true;
    this._showStatus('Opening Simson…');
    try {
      const {SimsonCard}=await loadRuntime();
      if(!this.isConnected)return;
      const card=new SimsonCard();
      card.setConfig(this._config);
      if(this._hass)card.hass=this._hass;
      this._card=card;
      this._retryCount=0;
      this.shadowRoot.replaceChildren(card);
    } catch(error) {
      this._showStatus('Simson could not load. Reconnecting…',true);
      console.error('[Simson] Card runtime could not load',error);
      const retry=this._retryCount || 0;
      if(retry<3 && this.isConnected){
        this._retryCount=retry+1;
        this._retryTimer=setTimeout(()=>this._load(),[800,2000,4000][retry]);
      }
    } finally {this._loading=false;}
  }
  _showStatus(message,retry=false) {
    const panel=document.createElement('div');
    panel.style.cssText='padding:24px;border-radius:20px;background:var(--ha-card-background,var(--card-background-color,#151a22));color:var(--primary-text-color,#eee);font:14px system-ui;min-height:96px;box-sizing:border-box';
    panel.setAttribute('role','status');panel.textContent=message;
    if(retry){const button=document.createElement('button');button.textContent='Retry';button.style.cssText='display:block;margin-top:16px;padding:10px 20px;cursor:pointer';button.addEventListener('click',this._recover);panel.append(button);}
    this.shadowRoot.replaceChildren(panel);
  }
  getCardSize(){return 5;}
  getGridOptions(){return {columns:12,rows:'auto',min_columns:6};}
  static getStubConfig(){return {type:'custom:simson-relay-card',title:'Simson'};}
  static async getConfigElement(){await loadEditor();return document.createElement('simson-card-editor');}
}
