import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalNodeId, nodeEntity } from '../src/state/node-identity.js';
import { withHomeAssistant } from '../src/controllers/home-assistant.js';
import { withWebRTC } from '../src/controllers/webrtc.js';

const connection = {state:'connected',attributes:{node_id:'site-one'}};
const call = {state:'active',attributes:{node_id:'site-one',call_id:'owned-call'}};
const hass = {states:{
  'sensor.simson_install_slug_connection':connection,
  'sensor.simson_install_slug_call_state':call,
  'sensor.simson_site_two_connection':{state:'connected',attributes:{node_id:'site-two'}},
}};

test('sensor aliases map to canonical node identity without losing their sibling call sensor',()=>{
  assert.equal(canonicalNodeId(hass,{node_id:'install_slug'}),'site-one');
  assert.equal(nodeEntity(hass,{node_id:'install_slug'},'', 'call_state'),call);
  assert.equal(nodeEntity(hass,{node_id:'site-one'},'', 'call_state'),call);
});

test('explicit connection entities preserve their canonical site and unknown sites do not fall back',()=>{
  assert.equal(canonicalNodeId(hass,{connection_entity:'sensor.simson_install_slug_connection'}),'site-one');
  assert.equal(canonicalNodeId(hass,{node_id:'missing'}),'missing');
  assert.equal(nodeEntity(hass,{node_id:'missing'},'', 'connection'),undefined);
  assert.equal(nodeEntity(hass,{node_id:'missing'},'', 'call_state'),undefined);
  assert.equal(canonicalNodeId(hass,{node_id:'site-two'}),'site-two');
});

test('media HTTP requests use the canonical node, not the sensor prefix',async()=>{
  class Base { _render() {} }
  const host = new (withWebRTC(withHomeAssistant(Base)))();
  let requested;
  host._config={node_id:'install_slug'};
  host._currentCallId='owned-call';
  host._hass={...hass,callApi:async(method,path)=>{requested=path;return {sip:{enabled:true}};}};
  await host._fetchWebRTCConfig();
  assert.match(requested,/node_id=site-one$/);
  assert.match(requested,/call_id=owned-call/);
});

test('node lookup failures report node identity instead of claiming TURN is missing',async()=>{
  class Base { _render() {} }
  const host = new (withWebRTC(Base))();
  host._hass={callApi:async()=>{throw {status_code:404};}};
  await host._fetchWebRTCConfig();
  assert.match(host._webrtcConfigError,/node was not found/);
  assert.equal(host._turnAvailable,undefined);
});
