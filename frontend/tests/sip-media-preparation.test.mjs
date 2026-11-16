import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MinimalSIPUA} from '../src/transport/sip-ua.js';
import {withSipBridge} from '../src/controllers/sip-bridge.js';
import {withWebRTC} from '../src/controllers/webrtc.js';

test('outgoing media gathers while ringing and sends one INVITE only when dial is requested', async () => {
  const original=globalThis.RTCPeerConnection;
  let captures=0, finishGathering;
  const sent=[];
  globalThis.RTCPeerConnection=class {
    addTrack() {} addTransceiver() {} getTransceivers(){return [];}
    async createOffer(){return {type:'offer',sdp:'prepared-sdp'};}
    async setLocalDescription(value){this.localDescription=value;}
    close(){}
  };
  try {
    const ua=new MinimalSIPUA({uri:'sip:test@example.invalid',captureMedia:async()=>{
      captures++;return {getAudioTracks:()=>[],getTracks:()=>[]};
    }});
    ua._registered=true;
    ua._preferPcmCodecs=()=>{};
    ua._send=msg=>sent.push(msg);
    ua._waitICE=()=>new Promise(resolve=>{finishGathering=resolve;});
    const prepared=ua.prepareMedia();
    assert.equal(ua.prepareMedia(),prepared);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(captures,1);
    assert.equal(sent.length,0);
    const dial=ua.dial('bridge-test');
    assert.equal(sent.length,0);
    finishGathering();await prepared;await dial;
    assert.equal(sent.length,1);
    assert.match(sent[0],/^INVITE sip:bridge-test@example.invalid/);
    assert.ok(sent[0].endsWith('prepared-sdp'));
    await ua.dial('bridge-test');
    assert.equal(sent.length,1);
  } finally {globalThis.RTCPeerConnection=original;}
});

test('ending the call during microphone permission stops late media and never dials',async()=>{
  let grant,stopped=0;
  const ua=new MinimalSIPUA({uri:'sip:test@example.invalid',captureMedia:()=>new Promise(resolve=>{grant=resolve;})});
  ua._registered=true;
  ua._send=()=>assert.fail('cancelled call must not send INVITE');
  const dial=ua.dial('bridge-test');
  ua._intentionalClose=true;ua._cleanup();
  grant({getTracks:()=>[{stop(){stopped++;}}]});await dial;
  assert.equal(stopped,1);
  assert.equal(ua._pc,null);
});

test('activation of a prepared SIP bridge joins once and does not recapture media',async()=>{
  const host=new (withSipBridge(class {}))();
  host._initiatedHere=true;
  let dials=0;
  const ua={registered:true,_activeBridge:'bridge-test',dial:async()=>{dials++;}};
  host._sipUA=ua;
  await host._startSIPCall('bridge-test',true);
  assert.equal(dials,0);
  await host._startSIPCall('bridge-test');
  await host._startSIPCall('bridge-test');
  assert.equal(dials,1);
  clearInterval(host._sipStatsInterval);
});

test('SIP call quality reads the SIP peer and exposes packet loss instead of ignoring it',async()=>{
  const host=new (withWebRTC(class {}))();
  host._currentCallId='owned-call';host._render=()=>{};
  host._sipUA={_pc:{getStats:async()=>new Map([['audio',{
    type:'inbound-rtp',kind:'audio',jitter:0.15,packetsLost:20,packetsReceived:80,
  }]])}};
  await host._updateQuality();
  assert.equal(host._audioQuality,1);
});
