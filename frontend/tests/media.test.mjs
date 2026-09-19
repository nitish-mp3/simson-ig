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
