export class SimsonCallPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=':host{display:block;min-height:100%;box-sizing:border-box;background:var(--primary-background-color,#0e1420);color:var(--primary-text-color,#e8f2f7)}main{max-width:680px;padding:24px;margin:auto}main.rooms{max-width:1320px}nav{display:flex;gap:12px;margin-bottom:20px}button{font:inherit;min-height:44px;padding:10px 18px;border:1px solid var(--divider-color,#415365);border-radius:10px;background:var(--card-background-color,#152130);color:inherit;cursor:pointer}button[aria-pressed=true]{border-color:var(--primary-color,#9de8ce)}[hidden]{display:none!important}@media(max-width:520px){main{padding:12px}}';
    const main=document.createElement('main');
    this._card=document.createElement('simson-relay-card');
    const node=new URL(window.location.href).searchParams.get('simson_node') || '';
    this._card.setConfig({node_id:node,title:'Your calls'});
    this._main=main;
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Simson workspace');
    this._callButton=document.createElement('button');this._callButton.textContent='Calls';this._callButton.onclick=()=>this._show(false);
    this._roomsButton=document.createElement('button');this._roomsButton.textContent='Room setup';this._roomsButton.hidden=true;this._roomsButton.onclick=()=>this._show(true);
    nav.append(this._callButton,this._roomsButton);
    this._roomHost=document.createElement('section');this._roomHost.hidden=true;
    main.append(nav,this._card,this._roomHost);
    this.shadowRoot.append(style,main);
  }
  set hass(value){
    this._hass=value;this._card.hass=value;
    this._roomsButton.hidden=!value?.user?.is_admin;
    if(this._settings)this._settings.hass=value;
    if(this._roomsVisible&&!value?.user?.is_admin)this._show(false);
    if(!this._initialView&&value?.user){this._initialView=true;this._show(value.user.is_admin&&new URL(location.href).searchParams.get('tab')==='rooms');}
  }
  async _show(rooms){
    rooms=Boolean(rooms&&this._hass?.user?.is_admin);this._roomsVisible=rooms;
    this._main.classList.toggle('rooms',rooms);this._roomHost.hidden=!rooms;this._card.hidden=rooms;
    this._callButton.setAttribute('aria-pressed',String(!rooms));this._roomsButton.setAttribute('aria-pressed',String(rooms));
    if(!rooms||this._settings||this._loadingRooms)return;
    this._loadingRooms=true;this._roomHost.textContent='Loading room setup…';
    try{
      const path='__SIMSON_ROOMS_CHUNK__';await import(new URL(path,import.meta.url).href);
      this._settings=document.createElement('simson-room-settings');this._settings.hass=this._hass;
      this._roomHost.replaceChildren(this._settings);
    }catch{this._roomHost.textContent='Room setup could not load. Select Calls, then Room setup to retry.';}
    finally{this._loadingRooms=false;}
  }
}
