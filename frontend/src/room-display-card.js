import {LitElement,html,css,nothing} from 'lit';
import {gatherRoomIce,roomRPC} from './transport/room-display-relay.js';

export class SimsonRoomDisplayCard extends LitElement {
  static properties={_status:{state:true},_error:{state:true}};
  static styles=css`:host{display:block;background:#080e16;color:#e8f2f7;font-family:Arial,sans-serif}.screen{position:relative;min-height:65vh;display:grid;place-items:center}video{width:100%;height:90vh;object-fit:contain;background:#080e16}.caption{position:absolute;bottom:20px;left:24px;padding:12px 18px;border-radius:12px;background:#101e2bcc}.empty{padding:48px;text-align:center}h2{margin:0 0 12px}p{max-width:600px;line-height:1.5;color:#a6b7c9}button{font:inherit;padding:12px 22px;min-height:48px;border:0;border-radius:12px;background:#9de8ce;color:#0b2525}`;
  constructor(){super();this._status='Waiting for a room call';this.clientId=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16)).join('-');}
  setConfig(config){if(!config.node_id||!config.room_id)throw Error('Select the room and node for this display');this._config=config;}
  set hass(value){this._hass=value;if(this.isConnected&&!this._polling&&!this._timer)this._poll();}
  connectedCallback(){super.connectedCallback();if(this._hass&&!this._polling)this._poll();}
  disconnectedCallback(){this._generation=(this._generation||0)+1;clearTimeout(this._timer);this._reset();super.disconnectedCallback();}
  getCardSize(){return 8;}
  _reset(){this._abort?.abort();this._peer?.close();this._peer=null;this._context=null;this._offerGeneration='';this._frameReady=false;const video=this.shadowRoot?.querySelector('video');if(video){video.pause();video.srcObject=null;}}
  async _poll(){
    if(!this._config||!this.isConnected)return;
    clearTimeout(this._timer);this._timer=null;
    this._polling=true;const generation=this._generation||0;
    try{
      if(this._config.diagnostics&&!this._diagnosticSent){
        this._diagnosticSent=true;
        this._hass.callService?.('system_log','write',{message:'Simson room display diagnostic '+JSON.stringify({origin:location.origin,browser:navigator.userAgent,rtc:typeof RTCPeerConnection,secure:isSecureContext,callWS:typeof this._hass.callWS,connection:typeof this._hass.connection?.sendMessagePromise}),level:'warning',logger:'custom_components.simson.room_display'}).catch(()=>{});
      }
      const context=await roomRPC(this._hass,'get_room_media',{node_id:this._config.node_id,room_id:this._config.room_id,include_ice:!this._context});
      if(!this.isConnected||generation!==(this._generation||0))return;
      if(!context.session_id){this._reset();this._status='Waiting for a room call';this._error='';return;}
      if(this._context?.session_id!==context.session_id){this._reset();this._context=context;this._abort=new AbortController();}
      const result=await roomRPC(this._hass,'room_display_signal',{node_id:this._config.node_id,room_id:this._config.room_id,
        call_id:context.call_id,session_id:context.session_id,operation:'viewer_poll',client_id:this.clientId});
      if(!this.isConnected||generation!==(this._generation||0))return;
      if(!result.offer){if(this._peer)this._reset();this._status='Waiting for caregiver video';this._error='';return;}
      if(this._offerGeneration!==result.generation){
        this._peer?.close();this._frameReady=false;
        const peer=this._peer=new RTCPeerConnection({iceServers:this._context?.ice_servers||context.ice_servers||[]});
        peer.addTransceiver('video',{direction:'recvonly'});
        peer.ontrack=async event=>{
          if(event.track.kind!=='video'||this._peer!==peer)return;
          await this.updateComplete;const video=this.shadowRoot.querySelector('video');
          if(this._peer!==peer||!this.isConnected)return;
          video.srcObject=new MediaStream([event.track]);
          const ready=()=>{if(this._peer===peer&&video.videoWidth>0&&!this._frameReady){this._frameReady=true;this._status='Live caregiver video';
            roomRPC(this._hass,'room_display_signal',{node_id:this._config.node_id,room_id:this._config.room_id,
              session_id:context.session_id,call_id:context.call_id,operation:'viewer_ready',client_id:this.clientId,generation:result.generation}).catch(()=>{this._frameReady=false;});}};
          video.onloadeddata=ready;video.requestVideoFrameCallback?.(ready);
          try{await video.play();}catch{this._status='Tap to enable video';this._blocked=true;this.requestUpdate();}
        };
        await peer.setRemoteDescription({type:'offer',sdp:result.offer});
        await peer.setLocalDescription(await peer.createAnswer());await gatherRoomIce(peer,this._abort?.signal);
        if(!this.isConnected||this._peer!==peer)return;
        await roomRPC(this._hass,'room_display_signal',{node_id:this._config.node_id,room_id:this._config.room_id,
          call_id:context.call_id,session_id:context.session_id,operation:'answer',client_id:this.clientId,generation:result.generation,sdp:peer.localDescription.sdp});
        this._offerGeneration=result.generation;this._status='Connecting caregiver video';
      }
      this._error='';
    }catch(error){this._status='Room display unavailable';this._error=error?.message||'Reconnect the room display.';}
    finally{this._polling=false;if(this.isConnected)this._timer=setTimeout(()=>this._poll(),2000);}
  }
  render(){return html`<section class="screen"><video autoplay muted playsinline></video><div class="caption" role="status"><h2>${this._config?.title||'Room call'}</h2><p>${this._status}</p>${this._error?html`<p>${this._error}</p>`:nothing}${this._blocked?html`<button @click=${async()=>{await this.shadowRoot.querySelector('video').play();this._blocked=false;this.requestUpdate();}}>Play video</button>`:nothing}</div></section>`;}
}
if(!customElements.get('simson-room-display-runtime'))customElements.define('simson-room-display-runtime',SimsonRoomDisplayCard);
