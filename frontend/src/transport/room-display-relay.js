export async function roomRPC(hass, service, data) {
  const request=hass.callWS?.bind(hass)||hass.connection?.sendMessagePromise?.bind(hass.connection);
  if(!request)throw Error('This display has no authenticated Home Assistant signaling connection.');
  const result=await request({type:'call_service',domain:'simson',service,service_data:data,return_response:true});
  return result?.response || {};
}

export function gatherRoomIce(peer, signal) {
  if(peer.iceGatheringState==='complete')return Promise.resolve();
  return new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',changed);signal?.removeEventListener('abort',finish);resolve();};
    const changed=()=>{if(peer.iceGatheringState==='complete')finish();};
    const timer=setTimeout(finish,7000);
    peer.addEventListener('icegatheringstatechange',changed);signal?.addEventListener('abort',finish,{once:true});
    if(signal?.aborted)finish();
  });
}

export class RoomDisplayPublisher {
  constructor(hass, context, stream, iceServers) {
    this.hass=hass;this.context=context;this.stream=stream;this.iceServers=iceServers;
    this.clientId=crypto.randomUUID();this.peers=new Map();this.abort=new AbortController();this.tick();
  }
  request(operation, extra={}){return roomRPC(this.hass,'room_display_signal',{
    node_id:this.context.node_id,room_id:this.context.room_id,session_id:this.context.session_id,
    call_id:this.context.call_id,operation,client_id:this.clientId,...extra});}
  async tick(){
    if(this.closed)return;
    try{
      const result=await this.request('publisher_poll');
      if(this.closed)return;
      const viewers=result.viewers||[];
      for(const [key,value] of this.peers)if(!viewers.some(viewer=>viewer.viewer_id===key)){value.peer.close();this.peers.delete(key);}
      for(const viewer of viewers){
        if(this.closed)break;
        let entry=this.peers.get(viewer.viewer_id);
        if(entry&&(['failed','closed'].includes(entry.peer.connectionState)||entry.peer.connectionState!=='connected'&&Date.now()-entry.createdAt>20000)){entry.peer.close();this.peers.delete(viewer.viewer_id);entry=null;}
        if(!entry){
          const track=this.stream.getVideoTracks().find(track=>track.readyState==='live');
          if(!track)continue;
          const peer=new RTCPeerConnection({iceServers:this.iceServers||[]});
          entry={peer,createdAt:Date.now()};this.peers.set(viewer.viewer_id,entry);
          peer.addTransceiver(track,{direction:'sendonly',streams:[new MediaStream([track])]});
          await peer.setLocalDescription(await peer.createOffer());await gatherRoomIce(peer,this.abort.signal);
          if(this.closed)break;
          const response=await this.request('offer',{viewer_id:viewer.viewer_id,sdp:peer.localDescription.sdp});
          entry.generation=response.generation;
        }else if(viewer.answer&&entry.peer.signalingState==='have-local-offer'&&viewer.generation===entry.generation){
          await entry.peer.setRemoteDescription({type:'answer',sdp:viewer.answer});
        }
      }
    }catch{}
    finally{if(!this.closed)this.timer=setTimeout(()=>this.tick(),2000);}
  }
  close(){
    if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.abort.abort();
    for(const value of this.peers.values())value.peer.close();this.peers.clear();
    this.request('publisher_leave').catch(()=>{});
  }
}

export async function roomMediaContext(host) {
  if(!host._hass?.callWS||!host._currentCallId)return {};
  const callId=host._currentCallId;
  const response=await roomRPC(host._hass,'get_room_media',{node_id:host._nodeId(),call_id:callId});
  if(host._currentCallId!==callId)return {};
  return {...response,node_id:host._nodeId()};
}
