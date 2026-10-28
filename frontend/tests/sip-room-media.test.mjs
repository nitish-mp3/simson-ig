import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SipRoomMedia} from '../src/transport/sip-room-media.js';

function videoStream() {
  const track={kind:'video',readyState:'live',enabled:true,stop(){this.readyState='ended';}};
  return {getVideoTracks:()=>[track],getTracks:()=>[track]};
}
function fixture() {
  const reports=[],published=[];
  const context={node_id:'site',room_id:'living',session_id:'session',call_id:'call',media_role:'sip_caregiver',camera_entity:'camera.room',display_entity:'media_player.tv',display_mode:'cast'};
  const host={_currentCallId:'call',_answeredByMe:true,isConnected:true,_render(){},_attachMediaElements(){},
    _remoteAudio:{srcObject:{audio:true}},_hass:{callWS:async message=>{reports.push(message);return {response:{}};}},
    _sipUA:{_pc:{connectionState:'connected',getStats:async()=>new Map([
      ['in',{type:'inbound-rtp',kind:'audio',packetsReceived:3}],
      ['out',{type:'outbound-rtp',kind:'audio',packetsSent:3}],
    ])}},_mediaConstraints:()=>({video:true})};
  const room=videoStream(),local=videoStream();let closed=0;
  const dependencies={openCamera:async()=>({stream:room,close(){closed++;}}),captureCamera:async constraints=>{
    assert.equal(constraints.audio,false);return local;
  },createPublisher:(_hass,_context,stream)=>{published.push(stream);return {close(){}};}};
  return {host,context,dependencies,room,local,reports,published,get closed(){return closed;}};
}

test('SIP caregiver receives room video without replacing SIP audio and publishes only their own camera',async()=>{
  const data=fixture(),audio=data.host._remoteAudio.srcObject;
  const media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  await media.openVideo();
  assert.equal(data.host._remoteStream,data.room);
  assert.equal(data.host._remoteAudio.srcObject,audio);
  assert.equal(data.published.length,0);
  await media.enableCamera();
  assert.equal(data.host._localStream,data.local);
  assert.deepEqual(data.published,[data.local]);
  media.close();media.close();assert.equal(data.closed,1);
  assert.equal(data.local.getVideoTracks()[0].readyState,'ended');
});

test('late camera acquisition cannot attach to a different or ended call',async()=>{
  const data=fixture();let release;
  data.dependencies.openCamera=()=>new Promise(resolve=>{release=resolve;});
  const media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  const opening=media.openVideo();media.close();data.host._currentCallId='another';
  let closed=false;release({stream:data.room,close(){closed=true;}});await opening;
  assert.equal(closed,true);assert.equal(data.host._remoteStream,undefined);
});

test('negotiated camera without decoded frames switches to HA streaming without touching audio',async()=>{
  const data=fixture();let fallback=0;
  data.dependencies.openFallback=async()=>{fallback++;return {stream:data.local,close(){}};};
  const media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  await media.openVideo();media.videoOpenedAt=Date.now()-25000;
  const audio=data.host._remoteAudio.srcObject;
  await media.checkVideo();
  assert.equal(fallback,1);assert.equal(data.host._remoteStream,data.local);
  assert.equal(data.host._remoteAudio.srcObject,audio);media.close();
});

test('foreground recovery reopens camera and publisher but never SIP audio',async()=>{
  const data=fixture(),media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  await media.openVideo();await media.enableCamera();const ua=data.host._sipUA;
  await media.resume();assert.equal(data.closed,1);assert.equal(data.published.length,2);
  assert.equal(data.host._sipUA,ua);media.close();
});

test('network-camera SIP rooms prefer decoded HLS and fall back to WebRTC when forwarding is unsupported',async()=>{
  for(const unsupported of [false,true]){
    const data=fixture();data.context.video_mode='ha_camera';
    let hls=0,webrtc=0;
    data.dependencies.openFallback=async()=>{hls++;if(unsupported)throw Error('forwarding unsupported');return {kind:'hls',stream:data.room,close(){}};};
    data.dependencies.openCamera=async()=>{webrtc++;return {stream:data.room,close(){}};};
    const ua=data.host._sipUA,media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
    await media.openVideo();
    assert.equal(hls,1);assert.equal(webrtc,unsupported?1:0);
    assert.equal(data.host._remoteStream,data.room);assert.equal(data.host._sipUA,ua);
    media.close();
  }
});

test('SIP room readiness needs bidirectional RTP and decoded camera video',async()=>{
  const data=fixture(),media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  await media.openVideo();data.host._playbackBlocked=true;
  await media.report();assert.equal(data.reports.length,0);
  data.host._playbackBlocked=false;await media.report();
  assert.deepEqual(data.reports.map(message=>message.service_data.component),['audio']);
  data.host._remoteVideoReady=true;await media.report();
  assert.deepEqual(data.reports.map(message=>message.service_data.component),['audio','video']);
  media.close();
});

test('room-camera failure leaves phone audio running and rejects view-only contexts',async()=>{
  const data=fixture();data.dependencies.openCamera=async()=>{throw Error('camera offline');};
  const ua=data.host._sipUA,media=new SipRoomMedia(data.host,data.context,[],data.dependencies);
  await media.openVideo();assert.match(data.host._roomVideoError,/camera offline/);
  assert.equal(data.host._sipUA,ua);assert.equal(data.host._mediaDeviceError,undefined);media.close();
  assert.throws(()=>new SipRoomMedia(data.host,{...data.context,media_role:'cast_viewer'},[],data.dependencies),/caregiver/);
});
