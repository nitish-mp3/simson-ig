export class SimsonCallPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=':host{display:block;min-height:100%;box-sizing:border-box;background:var(--primary-background-color)}main{max-width:680px;padding:24px;margin:auto}@media(max-width:520px){main{padding:12px}}';
    const main=document.createElement('main');
    this._card=document.createElement('simson-relay-card');
    const node=new URL(window.location.href).searchParams.get('simson_node') || '';
    this._card.setConfig({node_id:node,title:'Your calls'});
    main.append(this._card);
    this.shadowRoot.append(style,main);
  }
  set hass(value){this._card.hass=value;}
}
