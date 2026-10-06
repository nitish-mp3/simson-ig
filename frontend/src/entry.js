import { SimsonCardShell } from './shell.js';
import { SimsonCallPanel } from './panel.js';

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
