import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownsCall } from '../src/state/call-ownership.js';
import { reconcileCall } from '../src/controllers/call-state.js';

test('automation, unowned and other-user outgoing calls remain private', () => {
  for (const caller of ['', 'automation:door', 'someone-else']) {
    assert.equal(ownsCall({call_id:'one',direction:'outgoing',caller_user_id:caller,state:'active'},'me'), false);
  }
  assert.equal(ownsCall({call_id:'one',direction:'outgoing',caller_user_id:'me'},'me'), true);
});

test('opening a dashboard never adopts an already answered incoming call', () => {
  assert.equal(ownsCall({call_id:'one',direction:'incoming',state:'active'},'me'), false);
  assert.equal(ownsCall({call_id:'one',direction:'incoming',state:'active',answered_by_user_id:'other'},'me','one'), false);
});

test('local dialing renders immediately despite another call occupying the shared sensor', () => {
  const attributes = {call_id:'other',direction:'outgoing',caller_user_id:'someone-else'};
  const host = {_nodeId:()=> 'office',_isConnected:()=>true,_callState:()=> 'active',
    _activeCallAttr:(key,fallback='')=>attributes[key]??fallback,
    _hass:{user:{id:'me'}},_isCaller:true,_outgoingIntentAt:Date.now(),
    _currentRemoteNode:'phone:59330025',_prevCallState:'requesting'};
  const view = reconcileCall.call(host);
  assert.equal(view.isRinging,true);
  assert.equal(view.remoteLabel,'59330025');
  assert.equal(host._currentCallId,undefined);
  assert.equal(view.callId,'');
});

test('confirmed terminal calls cannot resurrect from stale ringing sensors',()=>{
  const attributes={call_id:'ended',direction:'outgoing',caller_user_id:'me'};
  const host={_nodeId:()=> 'office',_isConnected:()=>true,_callState:()=> 'ringing',
    _activeCallAttr:(key,fallback='')=>attributes[key]??fallback,_hass:{user:{id:'me'}},
    _endedCallIds:new Set(['ended']),_prevCallState:'idle'};
  const view=reconcileCall.call(host);
  assert.equal(view.hasCall,false);
  assert.equal(view.callId,'');
});

test('cold incoming ringing state restores answer controls only for its recipient', () => {
  const attributes={call_id:'incoming-one',direction:'incoming',target_user_id:'recipient',remote_name:'ds'};
  let popups=0;
  const host={_nodeId:()=> 'office',_isConnected:()=>true,_callState:()=> 'ringing',
    _activeCallAttr:(key,fallback='')=>attributes[key]??fallback,_hass:{user:{id:'recipient'}},
    _playRingtone:()=>{},_showIncomingPopup:()=>{popups++;},_showBrowserNotification:()=>{}};
  const view=reconcileCall.call(host);
  assert.equal(view.isIncoming,true);
  assert.equal(view.isRinging,false);
  assert.equal(host._incomingFrom,'ds');
  assert.equal(popups,1);
  reconcileCall.call(host);
  assert.equal(popups,1);
  const observer={...host,_hass:{user:{id:'observer'}},_currentCallId:null,_prevCallState:'idle'};
  assert.equal(reconcileCall.call(observer).hasCall,false);
});
