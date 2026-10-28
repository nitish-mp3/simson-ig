import {LitElement, html, css, nothing} from 'lit';
import {SimsonCard} from './card.js';
import {roomRPC} from './transport/room-display-relay.js';

const stationId=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16)).join('-');

export class SimsonRoomSourceCard extends LitElement {
  static properties={_armed:{state:true},_error:{state:true},_status:{state:true},_busy:{state:true}};
  static styles=css`:host{display:block;font:14px system-ui;color:var(--primary-text-color,#eee)}section{padding:24px;border-radius:20px;background:var(--card-background-color,#152130)}h2{margin:0 0 12px}p{line-height:1.5}button{font:inherit;padding:12px 20px;min-height:44px;border:0;border-radius:12px;background:#9de8ce;color:#0b2525}.error{color:#ffb4b4}.hint{opacity:.8}`;
  constructor(){super();this.clientId=stationId();this._status='Not armed';this._generation=0;}
  set entity(value){if(value&&this._config?.entity!==value)this.setConfig({entity:value});}
  setConfig(config){if(!config?.entity)throw Error('Select a Simson room sensor');if(this._config?.entity!==config.entity)this._disarm();this._config=config;}
  set hass(value){
    if(this._hass?.user?.id!==value?.user?.id||this._hass?.connection!==value?.connection)this._disarm();
    this._hass=value;if(this._card)this._card.hass=value;
    const binding=JSON.stringify([this._room()?.room_user_id,this._room()?.revision,this._room()?.node_id]);
    if(this._binding&&this._binding!==binding)this._disarm();this._binding=binding;this.requestUpdate();
    this._tick();
  }
  connectedCallback(){super.connectedCallback();this._timer=setInterval(()=>this._tick(),5000);}
  disconnectedCallback(){clearInterval(this._timer);this._disarm();super.disconnectedCallback();}
  _room(){return this._hass?.states?.[this._config?.entity]?.attributes;}
  _rpc(service,data={}){const room=this._room();return roomRPC(this._hass,service,{node_id:room.node_id,room_id:room.room_id,...data});}
  async _arm(){
    if(this._busy||this._armed)return;this._busy=true;this._error='';this.clientId=stationId();const generation=++this._generation;
    const room=this._room();
    try{
      if(!room?.simson_room||room.room_user_id!==this._hass?.user?.id)throw Error('Sign in as this room’s configured user on the room audio device.');
      if(room.audio_mode!=='browser')throw Error('SIP audio uses the configured media adapter, not this browser microphone.');
      if(!navigator.mediaDevices?.getUserMedia)throw Error('This screen cannot provide a microphone. Use a microphone-capable room browser or configure SIP audio. Cast is video-only.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:room.video_mode==='browser'});
      stream.getTracks().forEach(track=>track.stop());
      if(generation!==this._generation||!this.isConnected)return;
      const lease=await this._rpc('room_source_lease',{operation:'claim',client_id:this.clientId});
      if(generation!==this._generation||!this.isConnected){await this._rpc('room_source_lease',{operation:'release',client_id:this.clientId});return;}
      this._card=new SimsonCard();this._card.setConfig({node_id:room.node_id,title:'Room calling',view:'live'});this._card.hass=this._hass;
      this._seenSession=lease.current_session_id||room.session_id||'';this._leaseAt=Date.now();this._armed=true;this._status='Armed for new room calls';
      await this.updateComplete;this.shadowRoot.querySelector('.call').replaceChildren(this._card);
    }catch(error){this._error=error.message||'Could not arm this station';this._rpc('room_source_lease',{operation:'release',client_id:this.clientId}).catch(()=>{});}
    finally{this._busy=false;}
  }
  async _disarm(){
    this._generation++;const wasArmed=this._armed;this._armed=false;this._status='Not armed';this._leaseAt=0;
    const call=this._card?.session;
    if(this._joinedSession&&call?._currentCallId===this._joinedCall){
      this._rpc('end_room_call',{session_id:this._joinedSession}).catch(()=>{});
      call._cleanupWebRTC({endCall:true});
    }
    this._card?.remove();this._card=null;this._joinedSession='';this._joinedCall='';
    if(wasArmed&&this._room())this._rpc('room_source_lease',{operation:'release',client_id:this.clientId}).catch(()=>{});
    this.requestUpdate();
  }
  async _tick(){
    if(!this._armed||this._ticking||!this.isConnected)return;
    this._ticking=true;const generation=this._generation;
    try{
      if(Date.now()-this._leaseAt>25000)throw Error('The room station was paused or disconnected. Enable it again on this device.');
      if(Date.now()-this._leaseAt>8000){await this._rpc('room_source_lease',{operation:'claim',client_id:this.clientId});this._leaseAt=Date.now();}
      const room=this._room(),state=this._hass.states[this._config.entity]?.state;
      if(generation!==this._generation||!this._armed||!room?.call_id||!['ringing','connecting','active','degraded'].includes(state)||room.session_id===this._seenSession)return;
      const session=this._card?.session;if(!session)return;
      if(session._currentCallId&&session._currentCallId!==room.call_id)throw Error('This room browser is already in another call.');
      const context=await this._rpc('get_room_media',{call_id:room.call_id,session_id:room.session_id});
      if(generation!==this._generation||!this._armed||context.session_id!==room.session_id)return;
      if(Date.now()-this._leaseAt>25000)throw Error('The room station connection expired. Enable it again.');
      this._seenSession=room.session_id;this._joinedSession=room.session_id;this._joinedCall=room.call_id;
      session._onHAUserCallStarted({node_id:room.node_id,call_id:room.call_id,caller_user_id:room.room_user_id,
        target_user_id:room.target_user_id,interactive:true,target_user_name:'Caregiver',call_type:['browser','ha_camera'].includes(room.video_mode)?'video':'voice'});
      await session._joinUserCall();this._status='Room call joined';
    }catch(error){this._error=error.message||'Room station connection lost';await this._disarm();}
    finally{this._ticking=false;}
  }
  getCardSize(){return 4;}
  render(){const room=this._room();return html`<section><h2>${this._config?.title||'Room audio station'}</h2><p role="status">${this._status}</p>
    ${this._error?html`<p class="error" role="alert">${this._error}</p>`:nothing}
    <p class="hint">${room?.trigger_enabled?'Panic trigger enabled.':'Panic trigger disabled — enable and save it in Room setup.'} Keep this page open on the room’s microphone device. Arming permits automatic media for new calls in this room only; refreshing requires arming again.</p>
    <button ?disabled=${this._busy} @click=${()=>this._armed?this._disarm():this._arm()}>${this._busy?'Checking microphone…':this._armed?'Disarm room station':'Enable room station'}</button><div class="call"></div></section>`;}
}
if(!customElements.get('simson-room-source-runtime'))customElements.define('simson-room-source-runtime',SimsonRoomSourceCard);
