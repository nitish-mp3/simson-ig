import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withMediaDevices } from '../src/controllers/media-devices.js';
import { withHomeAssistant } from '../src/controllers/home-assistant.js';
import { withCallActions } from '../src/controllers/call-actions.js';
import { withWebRTC } from '../src/controllers/webrtc.js';
import { authenticatedGet } from '../src/transport/ha-api.js';

class Base {
  constructor() { this.isConnected=true;this._selectedAudioInput='';this._selectedVideoInput=''; }
  _render() {}
}

test('media configuration uses HA authenticated API instead of a stale copied bearer token',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('raw fetch should not be used');};
  try {
    let requested;
    const hass={callApi:async(method,path)=>{requested={method,path};return {ice_servers:[]};}};
    assert.deepEqual(await authenticatedGet(hass,'webrtc-config?node_id=studio'),{ice_servers:[]});
    assert.deepEqual(requested,{method:'GET',path:'webrtc-config?node_id=studio'});
  }finally{globalThis.fetch=original;}
});

test('media cleanup preserves the browser that accepted the live call',()=>{
  const host=new (withWebRTC(Base))();
  Object.assign(host,{_isCaller:true,_answeredByMe:true,_initiatedHere:true,_answerPendingCallId:'one',
    _remoteAudio:{pause:()=>{}},_cleanupSIPUA:()=>{},_stopRingtone:()=>{},_removePopup:()=>{},_dismissBrowserNotification:()=>{}});
  host._cleanupWebRTC();
  assert.equal(host._isCaller,true);
  assert.equal(host._answeredByMe,true);
  assert.equal(host._initiatedHere,true);
  assert.equal(host._answerPendingCallId,'one');
  host._cleanupWebRTC({endCall:true});
  assert.equal(host._isCaller,false);
  assert.equal(host._answeredByMe,false);
  assert.equal(host._initiatedHere,false);
  assert.equal(host._answerPendingCallId,null);
});

test('configuration failures do not falsely report that TURN is disabled',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({ok:false,status:502});
  try {
    const host=new (withWebRTC(Base))();
    await host._fetchWebRTCConfig();
    assert.equal(host._turnAvailable,undefined);
    assert.match(host._webrtcConfigError,/could not be loaded/);
  }finally{globalThis.fetch=original;}
});

test('a call does not reuse an in-flight idle media authorization', async()=>{
  const original=globalThis.fetch;
  let release;
  const requests=[];
  globalThis.fetch=async url=>{
    requests.push(url);
    if(requests.length===1) await new Promise(resolve=>release=resolve);
    return {ok:true,json:async()=>({sip:{enabled:url.includes('call-123')}})};
  };
  try {
    const host=new (withWebRTC(Base))();
    const idle=host._fetchWebRTCConfig();
    host._currentCallId='call-123';
    const active=host._fetchWebRTCConfig();
    release();
    assert.equal((await idle).sip.enabled,false);
    assert.equal((await active).sip.enabled,true);
    assert.equal(requests.length,2);
  } finally {globalThis.fetch=original;}
});

test('answer waits for authorization and rejects media on a denied answer', async()=>{
  const host=new (withCallActions(Base))();
  let resolveAnswer,mediaStarts=0;
  host._activeCallAttr=()=> 'incoming';
  host._callState=()=> 'incoming';
  host._showIncomingPopup=()=>{};
  host._sipBridgeId='bridge';
  host._stopRingtone=host._removePopup=host._dismissBrowserNotification=()=>{};
  host._callService=()=>new Promise(resolve=>resolveAnswer=resolve);
  host._startSIPCall=async()=>mediaStarts++;
  const answer=host._answer();
  assert.equal(mediaStarts,0);
  resolveAnswer(false);await answer;
  assert.equal(mediaStarts,0);
  assert.equal(host._answeredByMe,false);
  const accepted=host._answer();
  resolveAnswer(undefined);await accepted;
  assert.equal(mediaStarts,1);
});

test('decline keeps failed actions retryable and clears accepted call snapshots',async()=>{
  const host=new (withCallActions(Base))();
  host._currentCallId='incoming';host._eventCallSnapshot={call_id:'incoming',state:'incoming'};
  host._activeCallAttr=()=> 'incoming';
  host._stopRingtone=host._removePopup=host._dismissBrowserNotification=()=>{};
  host._callService=async()=>false;
  await host._reject();
  assert.equal(host._currentCallId,'incoming');
  assert.ok(host._eventCallSnapshot);
  host._callService=async()=>undefined;
  await host._reject();
  assert.equal(host._currentCallId,null);
  assert.equal(host._eventCallSnapshot,null);
  assert.ok(host._endedCallIds.has('incoming'));
  assert.ok(!host._incomingSuppressUntil);
});
test('camera failure retries microphone and late preview cancellation releases tracks',async()=>{
  const original=globalThis.navigator;
  const requests=[];
  let stopped=0,release;
  const stream={getTracks:()=>[{stop:()=>stopped++}],getVideoTracks:()=>[]};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async constraints=>{
    requests.push(constraints);
    if(constraints.video)throw Object.assign(new Error('missing camera'),{name:'NotFoundError'});
    return stream;
  }}}});
  try {
    const host=new (withMediaDevices(Base))();host._videoEnabled=true;
    assert.equal(await host._captureMedia(true),stream);
    assert.equal(requests.length,2);assert.equal(requests[1].video,false);
    host._captureMedia=()=>new Promise(resolve=>release=resolve);
    const pending=host._startMediaPreview();
    host._stopMediaPreview(false);release(stream);await pending;
    assert.equal(stopped,1);assert.equal(host._mediaPreviewStream,null);
  }finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:original});}
});

test('stale saved cameras retry system defaults before falling back to audio',async()=>{
  const original=globalThis.navigator;
  const requests=[];
  const stream={getTracks:()=>[],getVideoTracks:()=>[{}]};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async constraints=>{
    requests.push(constraints);
    if(requests.length===1)throw Object.assign(new Error('saved device disappeared'),{name:'OverconstrainedError'});
    return stream;
  }}}});
  try {
    const host=new (withMediaDevices(Base))();
    host._selectedAudioInput='old-mic';host._selectedVideoInput='old-camera';
    host._saveMediaPreferences=()=>{};
    assert.equal(await host._captureMedia(true),stream);
    assert.equal(requests.length,2);
    assert.ok(requests[1].video);
    assert.equal('deviceId' in requests[1].audio,false);
    assert.equal('deviceId' in requests[1].video,false);
    assert.match(host._mediaDeviceError,/system default/i);
  }finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:original});}
});

test('all delayed subscriptions unsubscribe after the card disconnects',async()=>{
  const host=new (withHomeAssistant(Base))();const pending=[];let unsubscribed=0;
  host._hass={connection:{subscribeEvents:()=>new Promise(resolve=>pending.push(resolve))}};
  host._subscribeHAEvents();host.isConnected=false;host._unsubscribeHAEvents();
  pending.forEach(resolve=>resolve(()=>unsubscribed++));await Promise.resolve();
  assert.equal(unsubscribed,7);assert.equal(host._subscriptions.length,0);
});

test('numeric extensions and node IDs containing numbers use different routes',()=>{
  const host=new (withCallActions(Base))();
  host._getNodeTargets=()=>[];host._effectivePstnTrunk=()=> '7016';
  assert.equal(host._smartDialRoute('1040').kind,'sip');
  assert.equal(host._smartDialRoute('office2').kind,'node');
  assert.equal(host._smartDialRoute('+919123208334').kind,'pstn');
  assert.equal(host._smartDialRoute('7016','node').kind,'node');
});

test('node video calls preserve the selected user and explicit media type',()=>{
  const host=new (withCallActions(Base))();
  Object.assign(host,{_videoEnabled:true,_hass:{user:{id:'caller-user'}},_calls:[]});
  host._stopRingtone=host._removePopup=host._dismissBrowserNotification=()=>{};
  host._callService=async(service,data)=>{host._calls.push({service,data});};
  host._dial('studio-node','target-user','Studio user');
  assert.deepEqual(host._calls,[{service:'make_call',data:{target_node_id:'studio-node',call_type:'video',caller_user_id:'caller-user',target_user_id:'target-user',target_user_name:'Studio user'}}]);
  assert.equal(host._currentCallType,'video');
  clearTimeout(host._outgoingUiTimer);
});
