import { LitElement, html } from 'lit';

function gather(peer, signal) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',changed);signal.removeEventListener('abort',finish);resolve();};
    const changed=()=>{if(peer.iceGatheringState==='complete')finish();};
    const timer=setTimeout(finish,8000);
    peer.addEventListener('icegatheringstatechange',changed);
    signal.addEventListener('abort',finish,{once:true});
  });
}

export class SimsonDoorStream extends LitElement {
  static properties={hass:{attribute:false},nodeId:{},extension:{},callId:{},active:{type:Boolean},iceServers:{attribute:false},status:{state:true},error:{state:true}};
  createRenderRoot(){return this;}
  updated(){
    const key=`${this.nodeId}:${this.extension}:${this.callId}:${Boolean(this.active)}`;
    if(key!==this._key){this._key=key;this.stop();if(this.active && this.callId)this.connect();}
  }
  disconnectedCallback(){this.stop();super.disconnectedCallback();}
  stop(){
    this._generation=(this._generation || 0)+1;
    this._abort?.abort();clearTimeout(this._watchdog);
    this._peer?.close();this._peer=null;
    this._stream?.getTracks().forEach(track=>track.stop());this._stream=null;
    const video=this.querySelector('video');if(video){video.pause();video.srcObject=null;}
    this.status='idle';this.error='';
  }
  async connect(){
    const generation=this._generation;
    this.status='connecting';this.error='';
    this._abort=new AbortController();
    const peer=this._peer=new RTCPeerConnection({iceServers:this.iceServers || []});
    peer.addTransceiver('video',{direction:'recvonly'});
    peer.ontrack=async event=>{
      if(generation!==this._generation || event.track.kind!=='video')return;
      this._stream=event.streams[0] || new MediaStream([event.track]);
      await this.updateComplete;
      const video=this.querySelector('video');
      if(!video || generation!==this._generation)return;
      video.srcObject=this._stream;
      const ready=()=>{if(generation===this._generation && video.videoWidth>0){this.status='live';clearTimeout(this._watchdog);}};
      video.onloadeddata=ready;
      video.requestVideoFrameCallback?.(ready);
      try{await video.play();}catch{this.status='playback';}
    };
    peer.onconnectionstatechange=()=>{
      if(generation===this._generation && peer.connectionState==='failed'){
        this.status='error';this.error='Video connection failed. Check the bridge ICE/TURN configuration.';
      }
    };
    try{
      await peer.setLocalDescription(await peer.createOffer());
      await gather(peer,this._abort.signal);
      if(generation!==this._generation)return;
      let timer;
      let answer;
      try{
        answer=await Promise.race([this.hass.callApi('POST','simson/video/offer',{
          node_id:this.nodeId,extension:this.extension,call_id:this.callId,sdp:peer.localDescription.sdp}),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Video bridge timed out')),16000);})]);
      }finally{clearTimeout(timer);}
      if(generation!==this._generation)return;
      await peer.setRemoteDescription({type:'answer',sdp:answer.sdp});
      if(this.status!=='live')this._watchdog=setTimeout(()=>{
        if(generation===this._generation && this.status!=='live'){this.status='error';this.error='No video frames received. Check that the named RTSP stream supplies browser-compatible H.264.';}
      },12000);
    }catch{
      if(generation!==this._generation)return;
      peer.close();this.status='error';this.error='Live video could not connect. Check the linked stream and active-call permissions.';
    }
  }
  render(){return html`<div class="video-stage linked-door-video">
    <video autoplay muted playsinline></video>
    <span class="live-label">${this.status==='live'?'LIVE VIDEO':'RTSP · VIDEO ONLY'}</span>
    ${this.status!=='live'?html`<div class="stream-feedback" role="status"><b>${this.status==='error'?'Video unavailable':this.status==='idle'?'Video is stopped':this.status==='playback'?'Tap to play video':'Connecting door video…'}</b><small>${this.error || 'SIP audio stays connected independently.'}</small>
      ${['error','playback'].includes(this.status)?html`<button @click=${()=>{if(this.status==='playback'){const video=this.querySelector('video');video?.play().then(()=>{if(video.videoWidth>0)this.status='live';}).catch(()=>{});}else{this.stop();this.connect();}}}>${this.status==='playback'?'Play video':'Retry video'}</button>`:html``}</div>`:html``}
  </div>`;}
}
if(!customElements.get('simson-door-stream'))customElements.define('simson-door-stream',SimsonDoorStream);
