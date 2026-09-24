import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withMediaDevices } from '../src/controllers/media-devices.js';
import { withHomeAssistant } from '../src/controllers/home-assistant.js';
import { withCallActions } from '../src/controllers/call-actions.js';

class Base {
  constructor() { this.isConnected=true;this._selectedAudioInput='';this._selectedVideoInput=''; }
  _render() {}
}
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
  assert.equal(unsubscribed,6);assert.equal(host._subscriptions.length,0);
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
