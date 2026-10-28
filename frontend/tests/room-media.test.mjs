import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportRoomMedia} from '../src/transport/room-media.js';

function fixture() {
  const calls = [];
  const room = {simson_room:true,node_id:'site',room_id:'101',room_user_id:'room',
    call_id:'call',session_id:'session',audio_mode:'browser',video_mode:'browser',components:{}};
  const host = {_initiatedHere:true,_currentCallId:'call',_pc:{connectionState:'connected'},
    _hass:{user:{id:'room'},states:{'sensor.room':{state:'connecting',attributes:room}},
      callService:async(...args)=>calls.push(args)}};
  const stats = new Map([
    ['in-a',{type:'inbound-rtp',kind:'audio',packetsReceived:20}],
    ['out-a',{type:'outbound-rtp',kind:'audio',packetsSent:20}],
    ['in-v',{type:'inbound-rtp',kind:'video',framesDecoded:10}],
    ['out-v',{type:'outbound-rtp',kind:'video',framesEncoded:10}],
  ]);
  return {host,room,stats,calls};
}

test('native room acknowledges actual bidirectional media once per session',async()=>{
  const {host,stats,calls}=fixture();
  await reportRoomMedia(host,stats);
  await reportRoomMedia(host,stats);
  assert.deepEqual(calls.map(call=>call[2].component),['audio','video']);
  assert.ok(calls.every(call=>call[2].session_id==='session'&&call[2].state==='ready'));
});

test('view-only bystanders, other users and separate SIP audio never report browser readiness',async()=>{
  for (const alter of [host=>{host._initiatedHere=false;},host=>{host._hass.user.id='observer';},
    host=>{host._currentCallId='other';},host=>{host._pc.connectionState='failed';},
    host=>{host._hass.states['sensor.room'].attributes.audio_mode='sip';}]) {
    const {host,stats,calls}=fixture();alter(host);
    await reportRoomMedia(host,stats);assert.equal(calls.length,0);
  }
});

test('a negotiated video track without decoded frames is not video ready',async()=>{
  const {host,stats,calls}=fixture();stats.get('in-v').framesDecoded=0;
  await reportRoomMedia(host,stats);
  assert.deepEqual(calls.map(call=>call[2].component),['audio']);
});

test('room camera publishing does not require the caregiver to enable their own camera',async()=>{
  const {host,room,stats,calls}=fixture();room.video_mode='ha_camera';stats.delete('in-v');
  await reportRoomMedia(host,stats);
  assert.deepEqual(calls.map(call=>call[2].component),['audio','video']);
});

test('blocked playback or one-way RTP is not audio ready',async()=>{
  for (const alter of [(host,stats)=>{host._playbackBlocked=true;},
    (host,stats)=>{stats.get('out-a').packetsSent=0;}]) {
    const {host,stats,calls}=fixture();alter(host,stats);await reportRoomMedia(host,stats);
    assert.deepEqual(calls.map(call=>call[2].component),['video']);
  }
});

test('a failed telemetry action backs off without failing the media call',async()=>{
  const {host,stats}=fixture();let attempts=0;
  host._hass.callService=async()=>{attempts++;throw Error('offline');};
  await reportRoomMedia(host,stats);await reportRoomMedia(host,stats);
  assert.equal(attempts,2);
});
