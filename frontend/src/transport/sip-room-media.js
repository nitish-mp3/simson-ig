import {openCameraSource} from './ha-camera-source.js';
import {RoomDisplayPublisher,roomRPC} from './room-display-relay.js';

export class SipRoomMedia {
  constructor(host,context,iceServers,dependencies={}) {
    if(context.media_role!=='sip_caregiver'||context.call_id!==host._currentCallId||!host._answeredByMe)
      throw Error('Only the accepting caregiver can start room media.');
    this.host=host;this.context=context;this.iceServers=iceServers;this.abort=new AbortController();
    this.openCamera=dependencies.openCamera||openCameraSource;
    this.openFallback=dependencies.openFallback||(async(...args)=>{const {openHlsCameraSource}=await import('./ha-camera-hls.js');return openHlsCameraSource(...args);});
    this.captureCamera=dependencies.captureCamera||(constraints=>navigator.mediaDevices.getUserMedia(constraints));
    this.createPublisher=dependencies.createPublisher||((...args)=>new RoomDisplayPublisher(...args));
    this.reported=new Set();this.attempts=0;
  }
  current(){return !this.closed&&this.host.isConnected&&this.host._currentCallId===this.context.call_id&&this.host._answeredByMe;}
  start(){
    this.onVisibility=()=>{if(document.visibilityState==='visible')this.resume();};
    document.addEventListener('visibilitychange',this.onVisibility);
    this.openVideo();
    if(this.host._videoEnabled)this.enableCamera();
    this.tick();
  }
  async openVideo(){
    if(!this.current()||!this.context.camera_entity||this.opening)return;
    clearTimeout(this.retryTimer);
    this.opening=true;this.attempts++;
    try{
      const previous=this.source;this.source=null;previous?.close();
      let source;
      const preferHls=this.useFallback||this.context.video_mode==='ha_camera';
      try{
        source=await (preferHls?this.openFallback:this.openCamera)(this.host._hass,this.context.camera_entity,this.abort.signal,this.iceServers,this.context.camera_fallback_entity);
      }catch(error){
        if(!preferHls||this.abort.signal.aborted||error.name==='AbortError')throw error;
        source=await this.openCamera(this.host._hass,this.context.camera_entity,this.abort.signal,this.iceServers,this.context.camera_fallback_entity);
      }
      if(!this.current()){source.close();return;}
      this.source=source;this.host._remoteStream=source.stream;this.host._remoteVideoReady=false;
      this.videoOpenedAt=Date.now();
      for(const track of source.stream.getVideoTracks())track.addEventListener?.('ended',()=>{
        if(this.current()&&this.source===source){this.host._roomVideoError='Room camera disconnected. Reconnecting; phone audio continues.';this.host._render();this.openVideo();}
      },{once:true});
      this.host._roomVideoError='';this.host._attachMediaElements();
    }catch(error){
      if(this.current()&&error.name!=='AbortError'){
        this.host._roomVideoError='Room video unavailable: '+(error.message||'camera connection failed')+'. Phone audio is independent.';
        if(this.attempts<3)this.retryTimer=setTimeout(()=>this.openVideo(),15000);
      }
    }finally{this.opening=false;if(this.current())this.host._render();}
  }
  async enableCamera(){
    if(!this.current()||this.enabling||this.local)return;
    this.enabling=true;
    try{
      let stream;
      try{stream=await this.captureCamera({audio:false,video:this.host._mediaConstraints(true).video});}
      catch(error){
        if(!['NotFoundError','OverconstrainedError'].includes(error.name))throw error;
        stream=await this.captureCamera({audio:false,video:true});
      }
      if(!this.current()){stream.getTracks().forEach(track=>track.stop());return;}
      this.local=stream;this.host._localStream=stream;this.host._cameraMuted=false;
      this.publish();this.host._roomVideoError='';
    }catch(error){if(this.current())this.host._roomVideoError='Your camera is unavailable: '+(error.message||'permission required')+'. Phone audio continues.';}
    finally{this.enabling=false;if(this.current())this.host._render();}
  }
  publish(){
    if(this.current()&&this.context.display_entity&&this.context.display_mode==='cast'&&this.local&&!this.host._cameraMuted&&!this.publisher)
      this.publisher=this.createPublisher(this.host._hass,this.context,this.local,this.iceServers);
  }
  cameraChanged(){
    if(this.host._cameraMuted){this.publisher?.close();this.publisher=null;}
    else this.publish();
  }
  async report(){
    if(!this.current())return;
    const peer=this.host._sipUA?._pc;
    const stats=peer?.connectionState==='connected'?await peer.getStats():new Map();
    if(!this.current())return;
    let incoming=0,outgoing=0;
    stats.forEach(value=>{
      if((value.kind||value.mediaType)!=='audio')return;
      if(value.type==='inbound-rtp')incoming+=value.packetsReceived||0;
      if(value.type==='outbound-rtp')outgoing+=value.packetsSent||0;
    });
    const ready=[];
    if(incoming>0&&outgoing>0&&!this.host._playbackBlocked)ready.push('audio');
    if(this.source&&this.host._remoteVideoReady)ready.push('video');
    for(const component of ready){
      if(!this.current()||this.reported.has(component))continue;
      await roomRPC(this.host._hass,'report_room_component',{node_id:this.context.node_id,room_id:this.context.room_id,
        session_id:this.context.session_id,component,state:'ready'});
      if(this.current())this.reported.add(component);
    }
  }
  async tick(){
    if(!this.current())return;
    try{await this.checkVideo();await this.report();}catch{}
    finally{if(this.current())this.timer=setTimeout(()=>this.tick(),2000);}
  }
  async checkVideo(){
    if(!this.current()||!this.source||this.opening)return;
    if(!this.host._remoteVideoReady&&Date.now()-this.videoOpenedAt>20000&&!this.useFallback&&this.source.kind!=='hls'){
      this.useFallback=true;
      this.host._roomVideoError='Camera negotiated but no video decoded. Opening the HA live-stream fallback; audio continues.';
      this.host._render();await this.openVideo();
    }
  }
  async resume(){
    if(!this.current()||this.resuming)return;
    this.resuming=true;
    try{
      this.publisher?.close();this.publisher=null;
      this.host._attachMediaElements();this.host._render();
      await this.openVideo();this.publish();
    }finally{this.resuming=false;}
  }
  close(){
    if(this.closed)return;this.closed=true;clearTimeout(this.timer);clearTimeout(this.retryTimer);this.abort.abort();
    if(this.onVisibility)document.removeEventListener('visibilitychange',this.onVisibility);
    this.source?.close();this.publisher?.close();this.local?.getTracks().forEach(track=>track.stop());
    if(this.source&&this.host._remoteStream===this.source.stream){this.host._remoteStream=null;this.host._remoteVideoReady=false;}
    if(this.local&&this.host._localStream===this.local)this.host._localStream=null;
  }
}
