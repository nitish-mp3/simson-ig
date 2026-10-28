import { SimsonCardShell } from './shell.js';
import { SimsonCallPanel } from './panel.js';
import { SimsonRoomCard } from './room-card.js';

for (const name of ['simson-relay-card', 'simson-card', 'simson-call-card']) {
  if (!customElements.get(name)) customElements.define(name, class extends SimsonCardShell {});
}
window.customCards ||= [];
for (const [name, view] of [['simson-dial-card','dial'],['simson-live-call-card','live'],['simson-history-card','history'],['simson-devices-card','devices'],['simson-door-phone-card','door'],['simson-user-card','user']]) {
  if (!customElements.get(name)) customElements.define(name, class extends SimsonCardShell {
    static defaultView = view;
    static getStubConfig() { return {type: `custom:${name}`, view}; }
  });
  if (Array.isArray(window.customCards) && !window.customCards.some(card => card.type === name)) window.customCards.push({type:name,name:`Simson ${view}`,description:`Independent ${view} panel; shares the node call session`,preview:true});
}
if (Array.isArray(window.customCards) && !window.customCards.some(card => card.type === 'simson-relay-card')) window.customCards.push({type:'simson-relay-card',name:'Simson',description:'Calls, contacts and browser media',preview:true});
if (!customElements.get('simson-call-panel')) customElements.define('simson-call-panel', SimsonCallPanel);
if (!customElements.get('simson-room-card')) customElements.define('simson-room-card', SimsonRoomCard);
for(const [name,path,exportName] of [['simson-room-display-card','__SIMSON_ROOM_DISPLAY_CHUNK__','SimsonRoomDisplayCard'],['simson-room-source-card','__SIMSON_ROOM_SOURCE_CHUNK__','SimsonRoomSourceCard']])if(!customElements.get(name))customElements.define(name,class extends HTMLElement{
  setConfig(config){this._config=config;this._display?.setConfig(config);}
  set hass(value){this._hass=value;if(this._display)this._display.hass=value;}
  connectedCallback(){this._load();}
  async _load(){
    try{const module=await import(new URL(path,import.meta.url).href);
      if(!this.isConnected)return;const card=new module[exportName]();card.setConfig(this._config);card.hass=this._hass;
      this._display=card;this.replaceChildren(card);
    }catch{this.textContent='Room screen could not load. Refresh this dashboard.';}
  }
  getCardSize(){return 8;}
});
if (Array.isArray(window.customCards) && !window.customCards.some(card => card.type === 'simson-room-card')) window.customCards.push({type:'simson-room-card',name:'Simson room',description:'Coordinated room audio, video and display status',preview:true});
