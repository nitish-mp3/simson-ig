import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withSipBridge} from '../src/controllers/sip-bridge.js';

test('native SIP audio ignores video-only events and merges streamless audio tracks',()=>{
  globalThis.MediaStream=class {constructor(tracks=[]){this.tracks=tracks;}getAudioTracks(){return this.tracks.filter(track=>track.kind==='audio');}addTrack(track){this.tracks.push(track);}};
  const host=new (withSipBridge(class {}))();
  host._sipRoomMedia={};const attached=[];host._attachRemoteAudio=stream=>attached.push(stream);
  const audio={kind:'audio',id:'a'},video={kind:'video',id:'v'};
  host._attachSIPAudio(null,audio);host._attachSIPAudio(new MediaStream([video]),video);
  assert.equal(attached.length,1);assert.deepEqual(attached[0].getAudioTracks(),[audio]);
});
