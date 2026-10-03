import{a as Q}from"./chunk-GDU4CE5Y.js";import{a as G,c as l,d as F,e as u,f as Y,g as w}from"./chunk-KLUKP4ZZ.js";var P=class extends w{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let t=e.node_id||"";if(!t&&e.connection_entity){let a=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);a&&(t=a[1])}if(!t&&e.call_state_entity){let a=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);a&&(t=a[1])}if(!t&&e.calls_count_entity){let a=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);a&&(t=a[1])}let n=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(a=>typeof a=="string"?a:a?.node_id||a?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:t,target_nodes:n,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),n.forEach(a=>{this._usersCache[a]||(this._usersCache[a]={users:[],timestamp:0})}),this._render()}};function y(i,e,t=""){return!i?.call_id||!e?!1:i.local_user_call&&i.caller_user_id===e?!0:i.direction==="outgoing"?i.caller_user_id===e:i.direction!=="incoming"||i.target_user_id&&i.target_user_id!==e||i.answered_by_user_id&&i.answered_by_user_id!==e?!1:i.status==="active"||i.state==="active"?i.answered_by_user_id===e||i.call_id===t:!0}var K=i=>class extends i{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let t=e.match(/^sensor\.simson_(.+)_connection$/);if(t){this._detectedNodeId=t[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return this._config.node_id||this._detectedNodeId}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,t=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"],["simson_user_call_started","_onHAUserCallStarted"]];this._subscriptions=[];for(let[s,n]of t)this._hass.connection.subscribeEvents(a=>{e===this._subscriptionGeneration&&this.isConnected&&this[n](a.data)},s).then(a=>{e!==this._subscriptionGeneration||!this.isConnected?a():this._subscriptions.push(a)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAUserCallStarted(e){if(!e.interactive||e.node_id!==this._nodeId()||!e.call_id||e.caller_user_id!==this._hass?.user?.id||this._endedCallIds?.has(e.call_id)||this._currentCallId&&this._currentCallId!==e.call_id)return;let t=!!this._initiatedHere;this._currentCallId||this._beginOutgoingCall(e.node_id,e.call_type,e.target_user_name),this._initiatedHere=t,this._currentCallId=e.call_id,this._currentRemoteNode=e.node_id,this._currentRemoteLabel=e.target_user_name,this._currentCallType=e.call_type||"voice",this._isCaller=!0,clearTimeout(this._outgoingUiTimer),this._eventCallSnapshot={...e,...this._eventCallSnapshot,call_id:e.call_id,direction:"outgoing",state:this._eventCallSnapshot?.state||"requesting"},t||(this._showCallDialog=!0),this._render()}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(t=>{this._actionError=t?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){if(e.node_id&&e.node_id!==this._nodeId())return;e.local_user_call&&e.caller_user_id===this._hass?.user?.id&&(e={...e,direction:"outgoing"});let{call_id:t,status:s,direction:n,remote_node_id:a,call_type:r,sip_bridge_id:o,target_user_id:c,caller_user_id:_,answered_by_user_id:h}=e,d=this._hass?.user?.id||"";if(y(e,d,this._currentCallId)&&!(this._currentCallId&&t!==this._currentCallId))if(["requesting","ringing","active"].includes(s)&&(this._eventCallSnapshot={...this._eventCallSnapshot,...e,state:s}),r&&(this._currentCallType=r),clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,(s==="requesting"||s==="ringing")&&n==="outgoing")this._actionError="",this._currentCallId=t||this._currentCallId,this._currentRemoteNode=a||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){this._actionError="",console.log("[Simson] call_status active",{call_id:t,call_type:r,sip_bridge_id:o,direction:n,remote_node_id:a});let g=this._answeredByMe||this._answerPendingCallId===t;if(n==="incoming"&&!g){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:t}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),n==="incoming"&&h&&h!==d){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._render();return}this._currentCallId=t,g&&(this._answeredByMe=!0),this._answerPendingCallId=null,this._currentRemoteNode=a,o&&(this._sipBridgeId=o);let p=r==="sip"||String(a||"").startsWith("sip:")||String(a||"").startsWith("asterisk:");this._isCaller=n==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification();let f=this._initiatedHere||g;p&&f?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(v=>console.error("[Simson] SIP active start:",v)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:t,remote_node_id:a}):!p&&f&&this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&((this._endedCallIds||=new Set).add(t),this._endedCallIds.size>100&&this._endedCallIds.delete(this._endedCallIds.values().next().value),this._eventCallSnapshot=null,this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._initiatedHere=!1,this._showCallDialog=!1,this._actionError=s==="failed"?"The call could not be started. Check the selected gateway or SIP phone.":"",setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){if(e.node_id&&e.node_id!==this._nodeId())return;let{call_id:t,from_node_id:s,from_label:n,call_type:a,target_user_id:r,metadata:o}=e;if(r&&this._hass?.user?.id&&r!==this._hass.user.id){this._ignoredCallId=t;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:t,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=t;return}if(!t||this._endedCallIds?.has(t))return;let c=t;if(this._lastIncomingCall===c&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=c,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=t,this._currentCallType=a||"voice",this._eventCallSnapshot={...o,call_id:t,state:"incoming",direction:"incoming",remote_node_id:s,remote_label:n,call_type:a,target_user_id:r},this._currentRemoteNode=s,this._incomingFrom=n||s,this._incomingCallType=a||"voice",this._sipBridgeId=a==="sip"&&o?.sip_bridge_id?o.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===t&&!this._answeredByMe&&!this._answerPendingCallId&&this._callState()!=="active"&&(console.log("[Simson] Incoming call timeout - clearing phantom call",t),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._clearLocalCallState(),this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let t=e.node_id||this._selectedNode;if(t&&(this._usersCache[t]={users:e.users,timestamp:Date.now()}),this._transferLoading&&t===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return this._hass?.states[`sensor.simson_${this._nodeId()}_${e}`]}_val(e,t="unknown"){return this._entity(e)?.state??t}_attr(e,t,s=null){return this._entity(e)?.attributes?.[t]??s}_effectivePstnTrunk(e=!0){let t=e?String(this._pstnTrunkDraft||"").trim():"";if(t)return t;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let n=this._attr("connection","routing",{})||{},a=String(n.default_gateway_trunk||"").trim();if(a)return a;let r=(this._targets||[]).find(o=>(o.type==="gateway"||o.trunk)&&o.trunk);return r?.trunk?String(r.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._visibleCall()?.state||"idle";return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,t=""){return this._visibleCall()?.[e]??t}_visibleCall(){let e=this._hass?.user?.id||"",t=this._attr("calls_count","active_calls",[])||[],s=this._entity("call_state"),n=[this._eventCallSnapshot,...t,{...s?.attributes,state:s?.state}].filter(r=>r&&!this._endedCallIds?.has(r.call_id)),a=n.find(r=>r.call_id===this._currentCallId&&y(r,e,this._currentCallId))||n.find(r=>y(r,e,this._currentCallId));return a?.local_user_call&&a.caller_user_id===e?{...a,direction:"outgoing",remote_label:a.target_user_name||a.remote_label}:a}_isStaleRingingCall(){let e=Number(this._visibleCall()?.started_at||0);return e?Date.now()-e*1e3>9e4:!1}async _callService(e,t={}){if(this._hass)try{await this._hass.callService("simson",e,t),setTimeout(()=>this._render(),250)}catch(s){return(e==="make_call"||e==="call_user"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let t=this._usersCache[e];if(t&&Date.now()-t.timestamp<3e3){this._remoteUsers=t.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var J=i=>class extends i{_beginOutgoingCall(e,t,s=""){this._initiatedHere=!0,this._currentRemoteNode=e||this._currentRemoteNode,this._currentRemoteLabel=s,this._currentCallType=t||"",this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._actionError="",clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=setTimeout(()=>{this._outgoingUiTimer=null,!(!this._isCaller||this._currentCallId||!this._outgoingIntentAt)&&(this._outgoingIntentAt=0,this._isCaller=!1,this._currentCallType="",this._actionError="No call status came back from the node. Check the gateway or SIP phone registration, then retry.",this._render())},45e3),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,t,s=650){let n=String(e||"action"),a=Date.now();if(!this._actionLocks.has(n)&&!(a-(this._lastActionAt[n]||0)<s)){this._lastActionAt[n]=a,this._actionLocks.add(n),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(t())}catch(r){console.error("[Simson] action failed:",n,r),this._actionError=r?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(n),s)}}}_bindAction(e,t,s,n=650){if(!e)return;let a=r=>{r.preventDefault(),r.stopPropagation(),this._runAction(t,s,n)};e.addEventListener("pointerup",a),e.addEventListener("click",a)}_callUserEntity(e){let t=this._hass?.states?.[e];if(t?.attributes?.simson_contact)return this._beginOutgoingCall(t.attributes.node_id,this._videoEnabled?"video":"voice",t.attributes.user_name||"User"),this._callService("call_user",{entity_id:e,call_type:this._videoEnabled?"video":"voice"})}_joinUserCall(){if(!this._currentCallId||!this._isCaller)return;this._initiatedHere=!0,this._videoEnabled=this._currentCallType==="video";let e=this._callState()==="active"?this._startWebRTC():void 0;return this._render(),e}_dial(e,t,s){if(!e)return;let n=this._videoEnabled?"video":"voice";this._beginOutgoingCall(e,n,s||"");let a={target_node_id:e,call_type:n,caller_user_id:this._hass?.user?.id||""};return t&&(a.target_user_id=t,a.target_user_name=s||""),this._callService("make_call",a)}_dialTarget(e,t,s){let a=["asterisk","sip","gateway"].includes(t)?"sip":this._videoEnabled?"video":"voice";return this._beginOutgoingCall(s||e,a),this._callService("make_call",{target_id:e,call_type:a,caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let t=this._effectivePstnTrunk();return this._dialPSTNNumber(e,t)}return this._beginOutgoingCall(e,"sip"),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,t=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let a=String(t||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`,"sip"),this._callService("make_call",{phone_number:s,trunk:a,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let t=String(e||"").trim(),s=t.replace(/\D/g,"");return t.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){this._initiatedHere=!1,this._showCallDialog=!1,this._currentCallId&&(this._endedCallIds||=new Set).add(this._currentCallId),this._eventCallSnapshot=null,clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}async _answer(e=this._activeCallAttr("call_id")||this._currentCallId){if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!1,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0;let t=await this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""});if(this._currentCallId===e){if(t===!1){this._answerPendingCallId=null,this._answeredByMe=!1,this._callStart=null,this._callState()==="incoming"&&this._showIncomingPopup(),this._render();return}this._answeredByMe=!0,this._showCallDialog=!0,this._render(),this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(s=>console.error("[Simson] SIP answer start:",s))}}async _reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null);let t=await this._callService("reject_call",{call_id:e,reason:"declined"});if(!(this._currentCallId&&this._currentCallId!==e)){if(t===!1){this._render();return}this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId||(this._currentCallId=e),this._clearLocalCallState()}}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,t="",s=""){let n=this._activeCallAttr("call_id")||this._currentCallId,a=String(e||"").trim();!n||!a||this._callService("transfer_call",{call_id:n,target_node_id:a,target_user_id:t||"",target_user_name:s||""})}_loadTransferUsers(e){let t=String(e||"").trim();if(!t)return;let s=this._usersCache[t];if(this._transferNodeDraft=t,this._transferUsersNode=t,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:t}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._render()}_smartDialRoute(e,t=this._smartRouteMode||"auto"){let s=String(e||"").trim(),n=String(t||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(n==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(n==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(n==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let a=s.toLowerCase(),r=s.replace(/[^\d+]/g,""),o=r.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:r.startsWith("+")||o.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(_=>String(_.node_id||_.id||"").toLowerCase()===a||String(_.label||"").toLowerCase()===a)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,t=""){let s=String(e||"").trim();if(!s)return;let n=this._smartDialRoute(s);if(this._nodeInputDraft=s,n.kind==="pstn"){let r=String(t||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=r,this._dialPSTNNumber(s,r)}if(n.kind==="sip"){let r=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=r,this._dialSIPExtension(r)}let a=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=a,this._userPickerNodeId=a,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:a})}};var M="simson.card.media.v1",X=i=>class extends i{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(M)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(M)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(M,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let t=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:t,video:s}}async _enableCamera(){let e=this._pc;if(!e||this._localStream?.getVideoTracks().length||this._enablingCamera)return;this._enablingCamera=!0;let t;try{try{t=await navigator.mediaDevices.getUserMedia({audio:!1,video:this._mediaConstraints(!0).video})}catch(s){if(!["NotFoundError","OverconstrainedError"].includes(s.name))throw s;t=await navigator.mediaDevices.getUserMedia({audio:!1,video:!0})}if(this._pc!==e||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._localStream||=new MediaStream,t.getVideoTracks().forEach(s=>{this._localStream.addTrack(s),e.addTrack(s,this._localStream)}),this._cameraMuted=!1,this._mediaDeviceError=""}catch(s){t?.getTracks().forEach(n=>n.stop()),this._mediaDeviceError=s.message||"Camera unavailable. Audio continues."}finally{this._enablingCamera=!1,this._render()}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let t=null;try{if(e){try{t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(n){if(!this._videoEnabled)throw n;t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(n=>n.kind==="audioinput"),videoInputs:s.filter(n=>n.kind==="videoinput"),audioOutputs:s.filter(n=>n.kind==="audiooutput")},this._mediaDevices.audioInputs.length&&!this._mediaDevices.audioInputs.some(n=>n.deviceId===this._selectedAudioInput)&&(this._selectedAudioInput=""),this._mediaDevices.videoInputs.length&&!this._mediaDevices.videoInputs.some(n=>n.deviceId===this._selectedVideoInput)&&(this._selectedVideoInput=""),this._mediaDevices.audioOutputs.length&&!this._mediaDevices.audioOutputs.some(n=>n.deviceId===this._selectedAudioOutput)&&(this._selectedAudioOutput=""),this._mediaDevicesLoaded=!0,this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{t?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(t){if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&(this._selectedAudioInput||e&&this._selectedVideoInput)){this._selectedAudioInput="",this._selectedVideoInput="",this._saveMediaPreferences();try{let s=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e));return this._mediaDeviceError="A saved device is unavailable. Using the system default instead.",s}catch(s){t=s}}if(e){this._mediaDeviceError="Camera access is unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){t=s}}if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw t}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let t=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=t,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(t){this._mediaDeviceError=t?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(t=>t.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let t=this._root()?.querySelector("#remote-video");t&&this._remoteStream?.getVideoTracks?.().length&&t.srcObject!==this._remoteStream&&(t.srcObject=this._remoteStream,t.play().catch(()=>{}));let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._applyAudioOutput()}async _applyAudioOutput(){if(!this._remoteAudio?.setSinkId){if(!this._selectedAudioOutput)return;this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="This browser cannot select a speaker. Using its system default.",this._render();return}if(this._remoteAudio.sinkId!==this._selectedAudioOutput)try{await this._remoteAudio.setSinkId(this._selectedAudioOutput)}catch{this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="Could not select that speaker. Call audio is using the system default.",this._render()}}};var x=[{urls:"stun:stun.l.google.com:19302"}];var Z=i=>class extends i{async _fetchWebRTCConfig(){let e=this._currentCallId||"";if(this._webrtcConfig&&this._webrtcConfigCallId===e)return this._webrtcConfig;if(this._webrtcConfigPromise)return this._webrtcConfigPromiseCallId===e?this._webrtcConfigPromise:(await this._webrtcConfigPromise,this._fetchWebRTCConfig());if(this._webrtcConfigRetryCallId===e&&Date.now()<(this._webrtcConfigNextRetryAt||0))return{ice_servers:x,sip:{enabled:!1}};this._webrtcConfigPromiseCallId=e,this._webrtcConfigPromise=(async()=>{try{let t=this._hass?.auth?.data?.access_token,s=await fetch("/api/webrtc-config?call_id="+encodeURIComponent(e),{headers:t?{Authorization:"Bearer "+t}:{},signal:AbortSignal.timeout(8e3)});if(s.ok)return this._webrtcConfig=await s.json(),this._webrtcConfigCallId=e,this._webrtcConfigNextRetryAt=0,this._webrtcConfig}catch{}return this._webrtcConfigRetryCallId=e,this._webrtcConfigNextRetryAt=Date.now()+3e4,{ice_servers:x,sip:{enabled:!1}}})();try{let t=await this._webrtcConfigPromise;return this._turnAvailable=this._hasTurnRelay(t),this.isConnected&&this._render(),t}finally{this._webrtcConfigPromise=null}}_hasTurnRelay(e){return(Array.isArray(e?.ice_servers)?e.ice_servers:[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(a=>/^(turn|turns):/i.test(String(a||""))))}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{let t=(async()=>{if(!navigator.mediaDevices?.getUserMedia){this._micAllowed=!1;return}try{let a=this._currentCallType||this._activeCallAttr("call_type","")||this._incomingCallType||"voice",r=await this._captureMedia(["video","webrtc-video"].includes(a));if(e!==this._rtcGeneration||!this.isConnected){r.getTracks().forEach(o=>o.stop());return}this._localStream=r,this._micAllowed=!0}catch(a){this._micAllowed=!1,this._mediaDeviceError=a?.message||"Allow microphone access to speak."}})(),[s]=await Promise.all([this._fetchWebRTCConfig(),t]);if(e!==this._rtcGeneration||!this.isConnected)return;let n=Array.isArray(s.ice_servers)?s.ice_servers:x;if(this._turnAvailable=this._hasTurnRelay({ice_servers:n}),e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:n}),this._pendingCandidates=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(a=>{this._pc.addTrack(a,this._localStream)}),this._pc.ontrack=a=>{if(a.streams?.[0])this._attachRemoteMedia(a.streams[0],null);else{let r=new MediaStream;r.addTrack(a.track),this._attachRemoteMedia(r,a.track)}},this._pc.onicecandidate=a=>{a.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:a.candidate.candidate,sdpMid:a.candidate.sdpMid,sdpMLineIndex:a.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(a){console.error("Simson: negotiation error:",a)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let a=this._pc?.connectionState;if(a==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(a==="disconnected")this._audioQuality=1;else if(a==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._mediaDeviceError=this._turnAvailable?"The media connection failed. Check network/firewall access and try again.":"The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.",this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let a=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(a)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:t,from_node_id:s,signal_type:n,data:a}=e;if(!(a?.simson_sender_user_id&&a.simson_sender_user_id===this._hass?.user?.id)&&!(!t||!this._currentCallId||t!==this._currentCallId)&&!(!this._initiatedHere&&!this._answeredByMe&&this._answerPendingCallId!==t)&&!(s&&this._currentRemoteNode&&s!==this._currentRemoteNode))if(n==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;if(this._makingOffer||this._pc.signalingState!=="stable"){if(!this._polite)return;await this._pc.setLocalDescription({type:"rollback"})}if(await this._pc.setRemoteDescription(new RTCSessionDescription(a)),!this._isCaller&&this._localStream){let o=new Set([...String(a?.sdp||"").matchAll(/^m=(audio|video)\s/gm)].map(_=>_[1])),c=this._pc.getSenders();this._localStream.getTracks().filter(_=>o.has(_.kind)).filter(_=>!c.some(h=>h.track?.kind===_.kind)).forEach(_=>this._pc.addTrack(_,this._localStream))}await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let o of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(o));this._pendingCandidates=[]}else if(n==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"){await this._pc.setRemoteDescription(new RTCSessionDescription(a));for(let r of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(r));this._pendingCandidates=[]}}else n==="ice-candidate"&&(this._pc&&this._pc.remoteDescription?await this._pc.addIceCandidate(new RTCIceCandidate(a)):this._pendingCandidates.push(a))}_sendWebRTCSignal(e,t){let s=this._activeCallAttr("call_id")||this._currentCallId,n=this._currentRemoteNode;!s||!n||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:n,signal_type:e,data:t}).catch(a=>console.error("Simson: signal send failed:",a))}_cleanupWebRTC(){this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(e=>e.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,t=null){if(!e&&t&&(e=new MediaStream,e.addTrack(t)),!e)return;this._remoteStream=e,this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.srcObject=e;let s=e.getAudioTracks?e.getAudioTracks():[];console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(n=>n.readyState),muted:s.map(n=>n.muted)}),this._remoteAudio.play().catch(n=>{console.warn("[Simson] remote audio play blocked/failed:",n?.message||n)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,t=null){this._attachRemoteMedia(e,t)}async _updateQuality(){if(this._pc)try{let e=await this._pc.getStats(),t=0,s=0,n=0;e.forEach(r=>{if(r.type==="inbound-rtp"&&r.kind==="audio"&&(t=r.jitter||0,s=r.packetsLost||0,n=r.packetsReceived||1),r.type==="candidate-pair"&&r.state==="succeeded"){let o=e.get?e.get(r.remoteCandidateId):null;o?.candidateType&&(this._connectionType=o.candidateType)}});let a=s/Math.max(n,1);a>.1||t>.1?this._audioQuality=1:a>.03||t>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var ee=i=>class extends i{_cleanupSIPUA(){if(this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e||!this._initiatedHere&&!this._answeredByMe&&!this._answerPendingCallId)return;if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let t,s;try{[{MinimalSIPUA:t},s]=await Promise.all([import("./sip-ua-J7KWV3EN.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._actionError="Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let n=s.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:n.enabled,ws_url:n.ws_url,username:n.username,domain:n.domain})),!n.enabled||!n.ws_url||!n.username||!n.password){this._actionError="Phone audio is unavailable. Check the addon connection.",this._render(),this._pendingSIPBridgeId=null;return}let a="sip:"+n.username+"@"+n.domain;this._sipUA=new t({uri:a,captureMedia:()=>this._captureMedia(!1),password:n.password,wsUrl:n.ws_url,iceServers:s.ice_servers||x,onAudioTrack:(r,o)=>{this._attachRemoteAudio(r,o)},onRegistered:()=>{this._sipUA._activeBridge=e,this._pendingSIPBridgeId=null,this._sipUA.dial(e).catch(r=>{console.error("Simson SIP dial error:",r),this._cleanupSIPUA()})},onError:r=>{console.error("Simson SIP UA error:",r),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render()},onBye:()=>{this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render()}}),this._sipUA.connect()}};var te=i=>class extends i{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let t=e.createOscillator(),s=e.createGain();t.connect(s),s.connect(e.destination),t.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),t.start(e.currentTime),t.stop(e.currentTime+.4),setTimeout(()=>{let n=e.createOscillator(),a=e.createGain();n.connect(a),a.connect(e.destination),n.frequency.value=480,a.gain.setValueAtTime(.15,e.currentTime),a.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),n.start(e.currentTime),n.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,t){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${t} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var ie=i=>class extends i{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let t=Math.round(e);if(t<60)return`${t}s`;let s=Math.floor(t/60),n=t%60;return s<60?`${s}m ${n}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let t=new Date(e*1e3),s=new Date,n=t.toDateString()===s.toDateString(),a=new Date(s);a.setDate(a.getDate()-1);let r=t.toDateString()===a.toDateString(),o=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return n?o:r?`Yesterday ${o}`:t.toLocaleDateString([],{month:"short",day:"numeric"})+" "+o}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let t=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(t/60)).padStart(2,"0"),n=String(t%60).padStart(2,"0");e.textContent=`${s}:${n}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function se(){let i=this._nodeId(),e=this._isConnected(),t=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",n=this._activeCallAttr("direction",""),a=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<45e3,r=a?"outgoing":n,o=this._hass?.user?.id||"",c=this._activeCallAttr("target_user_id",""),_=this._activeCallAttr("caller_user_id",""),h=this._activeCallAttr("answered_by_user_id",""),d=y({call_id:s,direction:n,state:t,target_user_id:c,caller_user_id:_,answered_by_user_id:h},o,this._currentCallId),m=["incoming","requesting","ringing","active"],g=a&&(!d||!m.includes(t)),p=g?"requesting":d&&m.includes(t)&&s?g?"requesting":t:"idle",f=p==="idle"||p==="unknown",v=p==="incoming"&&r!=="outgoing"&&!this._isCaller,C=p==="requesting"||p==="ringing",W=p==="active",ye=p==="missed",xe=p==="declined",Se=p==="timeout",z=v||C||W,Ie=!!this._pc,A=this._activeCallAttr("call_type",""),j=this._activeCallAttr("sip_bridge_id",""),fe=this._initiatedHere&&this._currentRemoteLabel||g&&String(this._currentRemoteNode||"").replace(/^phone:/,"")||this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||String(this._currentRemoteNode||"").replace(/^phone:/,"")||(r==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&d&&(this._currentCallId=s),z&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let T=this._prevCallState;if(T!==p)if(this._prevCallState=p,p==="incoming"&&T==="idle")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentCallType=A||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=this._activeCallAttr("remote_label")||this._currentRemoteNode||"Unknown",this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(p==="active"&&T!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentCallType=A||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),j&&(this._sipBridgeId=j),this._isCaller=r==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let $=Number(this._activeCallAttr("started_at",0));this._callStart=$>0?$*1e3:Date.now()}let U=A==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:"),q=this._initiatedHere||this._answeredByMe||this._answerPendingCallId===s;U&&q?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch($=>console.error("[Simson] SIP state active start:",$)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):!U&&q&&this._startWebRTC()}else p==="idle"&&T!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));return C&&d&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id","")),{nodeId:i,connected:e,direction:r,isIdle:f,isIncoming:v,isRinging:C,isActive:W,hasCall:z,activeCallType:A,remoteLabel:fe,callId:s}}var ve=ie(te(ee(Z(X(J(K(P))))))),I=class extends ve{views=new Set;set hass(e){let t=this._hass;t?.user?.id&&t.user.id!==e?.user?.id&&(this._cleanupWebRTC(),this._cleanupSIPUA(),this._clearLocalCallState(),this._webrtcConfig=null,this._webrtcConfigCallId=null),t?.connection&&t.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=this._nodeId(),n=["connection","call_state","active_call","calls_count"],a=Object.keys(e?.states||{}).filter(o=>e.states[o].attributes?.simson_contact);(!t||t.user?.id!==e?.user?.id||a.some(o=>t.states?.[o]!==e.states[o])||n.some(o=>t.states?.[`sensor.simson_${s}_${o}`]!==e?.states?.[`sensor.simson_${s}_${o}`]))&&this.requestUpdate()}_connectHA(){if(this._hass){if(!this._notificationHandoffChecked&&this._hass.user?.id){let e=new URL(window.location.href),t=e.searchParams.get("simson_node");if(!t||t===this._nodeId()){this._notificationHandoffChecked=!0;let s=e.searchParams.get("simson_action"),n=e.searchParams.get("simson_call");if(n&&["answer","decline"].includes(s)){for(let r of["simson_action","simson_call","simson_node"])e.searchParams.delete(r);window.history.replaceState(window.history.state,"",e),s==="answer"?this._answer(n):this._callService("reject_call",{call_id:n,reason:"declined_from_notification"})}let a=e.searchParams.get("simson_answer");a&&(this._answerPendingCallId=a,this._currentCallId=a,e.searchParams.delete("simson_answer"),e.searchParams.delete("simson_node"),window.history.replaceState(window.history.state,"",e))}}this._haEventSubscribed||this._subscribeHAEvents(),!this._webrtcConfig&&!this._webrtcConfigPromise&&this._fetchWebRTCConfig(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets()}}connectedCallback(){super.connectedCallback(),this._connectHA(),this._mediaDevicesLoaded||this._refreshMediaDevices(!1),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),clearTimeout(this._outgoingUiTimer),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?se.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return u}};customElements.get("simson-call-session")||customElements.define("simson-call-session",I);var ae=new WeakMap;function ne(i,e,t){let s=e.connection||e,n=ae.get(s);n||ae.set(s,n=new Map);let r=t.node_id||e.states?.[t.entity]?.attributes?.node_id||[t.connection_entity,t.call_state_entity,t.calls_count_entity].map(_=>_?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(_=>_.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",o=`${e.user?.id||""}:${r}`,c=n.get(o);if(c||(c=new I,c.hidden=!0,c.setConfig({...t,node_id:r}),c.hass=e,c._release=()=>n.delete(o),n.set(o,c),document.body.append(c)),clearTimeout(c._releaseTimer),!c.views.has(i)||i._sessionConfig!==t){c.views.add(i),i._sessionConfig=t;let _=c._config,h=[...c.views].flatMap(d=>{let m=d._config.target_nodes;return Array.isArray(m)?m:m?[m]:[]});c.setConfig({..._,...t,node_id:r,target_nodes:h}),t.view==="history"&&c._loadHistory(),t.view==="devices"&&c._refreshMediaDevices(!1)}return c}function L(i,e){i.views.delete(e),i.views.size||(i._releaseTimer=setTimeout(()=>{i.views.size||(i.remove(),i._release())},0))}var re={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},oe=i=>(...e)=>({_$litDirective$:i,values:e}),R=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:be}=Y,le=i=>i;var ce=()=>document.createComment(""),S=(i,e,t)=>{let s=i._$AA.parentNode,n=e===void 0?i._$AB:e._$AA;if(t===void 0){let a=s.insertBefore(ce(),n),r=s.insertBefore(ce(),n);t=new be(a,r,i,i.options)}else{let a=t._$AB.nextSibling,r=t._$AM,o=r!==i;if(o){let c;t._$AQ?.(i),t._$AM=i,t._$AP!==void 0&&(c=i._$AU)!==r._$AU&&t._$AP(c)}if(a!==n||o){let c=t._$AA;for(;c!==a;){let _=le(c).nextSibling;le(s).insertBefore(c,n),c=_}}}return t},b=(i,e,t=i)=>(i._$AI(e,t),i),Ce={},de=(i,e=Ce)=>i._$AH=e,_e=i=>i._$AH,E=i=>{i._$AR(),i._$AA.remove()};var ue=(i,e,t)=>{let s=new Map;for(let n=e;n<=t;n++)s.set(i[n],n);return s},k=oe(class extends R{constructor(i){if(super(i),i.type!==re.CHILD)throw Error("repeat() can only be used in text expressions")}dt(i,e,t){let s;t===void 0?t=e:e!==void 0&&(s=e);let n=[],a=[],r=0;for(let o of i)n[r]=s?s(o,r):r,a[r]=t(o,r),r++;return{values:a,keys:n}}render(i,e,t){return this.dt(i,e,t).values}update(i,[e,t,s]){let n=_e(i),{values:a,keys:r}=this.dt(e,t,s);if(!Array.isArray(n))return this.ut=r,a;let o=this.ut??=[],c=[],_,h,d=0,m=n.length-1,g=0,p=a.length-1;for(;d<=m&&g<=p;)if(n[d]===null)d++;else if(n[m]===null)m--;else if(o[d]===r[g])c[g]=b(n[d],a[g]),d++,g++;else if(o[m]===r[p])c[p]=b(n[m],a[p]),m--,p--;else if(o[d]===r[p])c[p]=b(n[d],a[p]),S(i,c[p+1],n[d]),d++,p--;else if(o[m]===r[g])c[g]=b(n[m],a[g]),S(i,n[d],n[m]),m--,g++;else if(_===void 0&&(_=ue(r,g,p),h=ue(o,d,m)),_.has(o[d]))if(_.has(o[m])){let f=h.get(r[g]),v=f!==void 0?n[f]:null;if(v===null){let C=S(i,n[d]);b(C,a[g]),c[g]=C}else c[g]=b(v,a[g]),S(i,n[d],v),n[f]=null;g++}else E(n[m]),m--;else E(n[d]),d++;for(;g<=p;){let f=S(i,c[p+1]);b(f,a[g]),c[g++]=f}for(;d<=m;){let f=n[d++];f!==null&&E(f)}return this.ut=r,de(i,c),F}});function O(i,e){let t=i._smartDialRoute(i._nodeInputDraft),s=[...i._targets];for(let o of i._config.target_nodes||[])s.some(c=>(c.node_id||c.id)===o)||s.push({id:o,node_id:o,label:o,type:"node"});let n=e.connected&&!e.hasCall,a=Object.entries(i._hass?.states||{}).filter(([,o])=>o.attributes?.simson_contact&&!o.attributes.simson_call_button&&o.attributes.node_id===i._nodeId()&&o.attributes.user_id!==i._hass?.user?.id),r=()=>n&&i._runAction("dial",()=>i._dialSmartValue(i._nodeInputDraft,i._pstnTrunkDraft));return l`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>A teammate, a room, or a number. One place to call.</p></div>
    ${a.length?l`<div class="section-heading"><h3>People at this site</h3><span>${a.length} contacts</span></div>
      <div class="contacts">${k(a,([o])=>o,([o,c])=>l`<button class="contact" ?disabled=${!n||!!i._actionPending||c.state!=="ready"}
        @click=${()=>i._runAction("user:"+o,()=>i._callUserEntity(o))}>
        <span class="avatar">${String(c.attributes.user_name||"User").slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${c.attributes.user_name}</b><small>${c.state==="ready"?"Call directly":c.state}</small></span><span>↗</span></button>`)}</div>`:u}
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([o,c])=>l`<button class=${i._smartRouteMode===o?"selected":""} aria-pressed=${i._smartRouteMode===o} @click=${()=>{i._smartRouteMode=o,i.requestUpdate()}}>${c}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${i._nodeInputDraft} placeholder="Search a node or dial a number" @input=${o=>{i._nodeInputDraft=o.target.value,i.requestUpdate()}} @keydown=${o=>{o.key==="Enter"&&r()}}><button class="primary" aria-label="Place call" ?disabled=${!n||!!i._actionPending||!i._nodeInputDraft.trim()} @click=${r}>Call ↗</button></div></label>
    <div class="route-hint"><span>${t.label}</span><small>${t.hint}</small></div>
    <label class="toggle node-video-toggle"><span><b>Video for node-to-node calls</b><small>Turn on once to grant camera access. SIP and gateway calls stay audio-only.</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${o=>{i._videoEnabled=o.target.checked,i._saveMediaPreferences(),i.requestUpdate(),i._videoEnabled&&i._refreshMediaDevices(!0)}}></label>
    ${i._videoEnabled&&!globalThis.isSecureContext?l`<div class="notice error" role="status">Camera and microphone access require HTTPS. Open this dashboard using its secure address.</div>`:u}
    ${i._videoEnabled&&i._turnAvailable===!1?l`<div class="notice error" role="status">No TURN relay is configured. Calls may fail on mobile or restrictive networks; ask the administrator to enable coturn.</div>`:u}
    ${t.kind==="pstn"?l`<label class="field"><span>Gateway trunk</span><input .value=${i._pstnTrunkDraft||i._effectivePstnTrunk()} placeholder="Site default" @input=${o=>{i._pstnTrunkDraft=o.target.value}}></label>`:u}
    <div class="section-heading"><h3>Quick connections</h3><span>${s.length} saved</span></div>
    ${s.length?l`<div class="contacts">${k(s,o=>o.id,o=>l`<button class="contact" ?disabled=${!n||!!i._actionPending} @click=${()=>{(o.type||"node")==="node"?(i._userPickerNodeId=o.node_id||o.id,i._userPickerTargetId=o.id,i._callService("get_remote_users",{node_id:i._userPickerNodeId})):i._runAction("target:"+o.id,()=>i._dialTarget(o.id,o.type,o.node_id))}}><span class="avatar">${String(o.label||o.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${o.label||o.id}</b><small>${o.type==="node"?"Home Assistant":o.trunk?"Gateway \xB7 "+o.trunk:"SIP \xB7 "+(o.extension||o.id)}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:l`<div class="empty compact">${i._targetsLoading?"Loading your contacts\u2026":"Saved nodes and phones appear here. You can always dial above."}</div>`}
    <button class="text-button" @click=${()=>i._selectTab("media")}>${i._videoEnabled?"Camera enabled for node calls":"Audio calls"} · Check your devices →</button>
  </section>`}function D(i,e){let t=!!i._localStream?.getVideoTracks().length,s=!!i._remoteStream?.getVideoTracks().length,n=e.isActive&&(t||s),a=e.activeCallType==="sip"||i._currentCallType==="sip",r=a?!!i._sipUA?._activeBridge:i._pc?.connectionState==="connected",o=["video","webrtc-video"].includes(i._incomingCallType||e.activeCallType),c=i._mediaDeviceError?.startsWith("The media connection failed."),_=e.isActive?c?"Media connection failed":r?"Connected":"Connecting media\u2026":e.isIncoming?o?"Incoming video call":"Would like to talk to you":e.callId?"Ringing \xB7 Waiting for an answer\u2026":"Sending your call request to the node\u2026",h=(d,m)=>()=>i._runAction(d,m);return l`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":e.callId?"CALLING":"STARTING YOUR CALL"}</span>
    ${n?l`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?u:l`<span class="video-wait">Waiting for their camera</span>`}${t?l`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:u}<span class="live-label">LIVE</span></div>`:l`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption" role="status">${_} <span id="call-timer"></span></p>
    ${!e.isActive&&!e.isIncoming?l`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${e.callId?"The destination is being called":"Connecting to your call service"}</b><small>${e.callId?"You can stay here while the other phone rings.":"This card will update as soon as the node responds."}</small></span></div>`:u}
    ${i._micAllowed===!1?l`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:u}
    ${i._mediaDeviceError?l`<div class="notice error" role="status">${i._mediaDeviceError}</div>`:u}
    ${i._isCaller&&!i._initiatedHere&&!a?l`<div class="browser-join"><p>This call was started by a script or another dashboard. Choose this browser to use its microphone and camera.</p><button class="primary" @click=${h("join-browser",()=>i._joinUserCall())}>Use this browser for audio${i._currentCallType==="video"?" & video":""}</button></div>`:u}
    <div class="call-actions">
      ${e.isIncoming?l`<button class="primary" ?disabled=${!!i._actionPending} @click=${h("answer",()=>i._answer())}>Answer</button><button class="danger" ?disabled=${!!i._actionPending} @click=${h("reject",()=>i._reject())}>Decline</button>`:l`
        <button aria-pressed=${i._muted} ?disabled=${!e.isActive} @click=${h("mute",()=>i._toggleMute())}>${i._muted?"Unmute":"Mute"}</button>
        ${t?l`<button aria-pressed=${i._cameraMuted} @click=${h("camera",()=>i._toggleCamera())}>${i._cameraMuted?"Camera on":"Camera off"}</button>`:u}
        ${e.isActive&&!a&&!t&&i._pc?l`<button @click=${h("enable-camera",()=>i._enableCamera())}>Enable camera</button>`:u}
        <button class="danger" ?disabled=${!e.callId||!!i._actionPending} @click=${h("hangup",()=>i._hangup())}>${e.callId?"End call":"Starting\u2026"}</button>
      `}
    </div>
    ${e.isActive&&(i._sipBridgeId||e.activeCallType==="sip")?l`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${i._transferNodeDraft} @input=${d=>{i._transferNodeDraft=d.target.value,i.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!i._transferNodeDraft.trim()} @click=${h("transfer-node",()=>i._transferCall(i._transferNodeDraft))}>To node</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${h("transfer-sip",()=>i._transferCall("sip:"+i._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${()=>i._loadTransferUsers(i._transferNodeDraft)}>Choose user</button></div>${i._transferUsers.map(d=>l`<button class="contact" @click=${h("transfer-user:"+d.user_id,()=>i._transferCall(i._transferUsersNode,d.user_id,d.user_name))}>${d.user_name}</button>`)}</details>`:u}
  </section>`}function B(i){return l`<section><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>i._loadHistory()}>Refresh</button></div>${i._history.length?l`<div class="history">${k(i._history.slice(0,50),(e,t)=>e.call_id||t,e=>l`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(e.state)?"missed":""}">${e.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${e.remote_label||e.remote_node_id||"Unknown caller"}</b><small>${e.state} · ${i._formatDuration(e.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{i._nodeInputDraft=e.remote_node_id||"",i._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:l`<div class="empty">${i._historyLoaded?"Your conversations will appear here.":"Loading recent calls\u2026"}</div>`}</section>`}function N(i){let e=i._mediaDevices,t=(s,n,a)=>l`<label class="field"><span>${s}</span><select .value=${i[a]} @change=${r=>{i[a]=r.target.value,i._saveMediaPreferences(),a==="_selectedAudioOutput"&&i._applyAudioOutput(),i._mediaPreviewStream&&i._startMediaPreview(),i.requestUpdate()}}><option value="">System default</option>${n.map((r,o)=>l`<option value=${r.deviceId}>${r.label||s+" "+(o+1)}</option>`)}</select></label>`;return l`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>i._runAction("detect",()=>i._refreshMediaDevices(!0))}>Detect</button></div>
    ${i._mediaDeviceError?l`<div class="notice error" role="alert">${i._mediaDeviceError}</div>`:u}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${i._mediaPreviewStream?.getVideoTracks().length?u:l`<div class="preview-empty"><b>${i._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${i._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Turn on once to grant camera access before a call</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${s=>{i._videoEnabled=s.target.checked,i._saveMediaPreferences(),i._mediaPreviewStream?i._startMediaPreview():i._videoEnabled&&i._refreshMediaDevices(!0),i.requestUpdate()}}></label>
    <div class="device-grid">${t("Microphone",e.audioInputs,"_selectedAudioInput")}${t("Camera",e.videoInputs,"_selectedVideoInput")}${t("Speaker",e.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>i._runAction("preview",()=>i._startMediaPreview())}>${i._mediaPreviewStream?"Restart preview":"Test devices"}</button>${i._mediaPreviewStream?l`<button @click=${()=>i._stopMediaPreview()}>Stop preview</button>`:u}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${i._notifPermission==="default"?l`<button class="text-button" @click=${()=>i._requestNotificationPermission()}>Enable incoming-call notifications</button>`:u}
  </section>`}function he(i){if(!i._pickerOpen&&!i._showPopup&&!(i._showCallDialog&&i._view?.hasCall))return u;let e=i._pickerOpen,t=!e&&!i._showPopup&&i._showCallDialog,s=r=>{let o=i._userPickerNodeId;i._removeUserPicker(),i._runAction("call-user",()=>i._dial(o,r?.user_id,r?.user_name))},n=r=>{if(r.key==="Escape"&&(e?i._removeUserPicker():t&&(i._showCallDialog=!1,i._render())),r.key!=="Tab")return;let o=[...r.currentTarget.querySelectorAll("button:not(:disabled), input:not(:disabled), summary")],c=o[0],_=o.at(-1),h=r.currentTarget.getRootNode().activeElement;r.shiftKey&&h===c?(r.preventDefault(),_?.focus()):!r.shiftKey&&h===_&&(r.preventDefault(),c?.focus())},a=r=>{r.preventDefault(),e?i._removeUserPicker():t&&(i._showCallDialog=!1,i._render())};return t?l`<dialog class="dialog-scrim" aria-label="Your call" @cancel=${a}><section class="dialog call-dialog" @keydown=${n}>
    <div class="dialog-heading"><span class="eyebrow">YOUR PRIVATE CALL</span><button class="text-button" @click=${()=>{i._showCallDialog=!1,i._render()}}>Minimize</button></div>
    ${i._actionError?l`<div class="notice error" role="alert">${i._actionError}</div>`:u}
    ${D(i,i._view)}
  </section></dialog>`:l`<dialog class="dialog-scrim" aria-label=${e?"Choose call recipient":"Incoming call"} @cancel=${a}><section class="dialog" @keydown=${n}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?i._userPickerNodeId:i._incomingFrom}</h2>
    ${e?l`<div class="dialog-options"><button class="primary" @click=${()=>s(null)}>Call everyone on this node</button>${i._remoteUsers.map(r=>l`<button @click=${()=>s(r)}>${r.user_name||r.user_id}</button>`)}</div><button class="text-button" @click=${()=>i._removeUserPicker()}>Cancel</button>`:l`<p>Would like to talk to you.</p>${i._actionError?l`<div class="notice error" role="alert">${i._actionError}</div>`:u}<div class="call-actions"><button class="primary" ?disabled=${!!i._actionPending} @click=${()=>i._runAction("answer",()=>i._answer())}>Answer</button><button class="danger" ?disabled=${!!i._actionPending} @click=${()=>i._runAction("reject",()=>i._reject())}>Decline</button></div>`}
  </section></dialog>`}var H=class extends w{static properties={hass:{attribute:!1},entity:{},live:{type:Boolean}};createRenderRoot(){return this}updated(){let e=`${this.entity}:${this.live}:${!!this.hass?.states?.[this.entity]}`;this._key!==e&&(this._key=e,this._load(e)),this._camera&&(this._camera.hass=this.hass)}async _load(e){this._camera=null;let t=this.querySelector(".camera-container");if(t){if(t.replaceChildren(),!this.entity||!this.hass?.states?.[this.entity]){t.textContent="Choose your Home Assistant camera entity in the card editor.";return}try{let n=(await window.loadCardHelpers()).createCardElement({type:"picture-entity",entity:this.entity,camera_view:this.live?"live":"auto",show_name:!1,show_state:!1,tap_action:{action:"none"},hold_action:{action:"none"}});if(this._key!==e||!this.isConnected)return;n.hass=this.hass,this._camera=n,t.replaceChildren(n)}catch{this._key===e&&(t.textContent="Camera could not load. Check its Home Assistant integration.")}}}render(){return l`<div class="camera-container"></div>`}};customElements.get("simson-door-camera")||customElements.define("simson-door-camera",H);function pe(i,e,t,s){let n=i._config,a=String(n.extension||"").trim(),r=n.camera_entity||"",o=t.hasCall&&(String(e._currentRemoteNode||"")===a||e._activeCallAttr("target_extension")===a||e._activeCallAttr("remote_node_id")===`sip:${a}`);return l`<section class="door-workspace">
    <div class="section-heading"><h2>${n.device_name||"Door phone"}</h2><span>SIP ${a||"not configured"}</span></div>
    <simson-door-camera .hass=${i._hass} .entity=${r} .live=${o||i._doorPreview===!0}></simson-door-camera>
    <p class="fine-print">Video uses your Home Assistant camera. Calling uses the door’s registered SIP extension. Viewing never joins another call.</p>
    ${o?s(e,t):l`<div class="call-actions">
      <button class="primary" ?disabled=${!a||!t.connected||t.hasCall||!!e._actionPending}
        @click=${()=>e._runAction("door:"+a,()=>e._dialSIPExtension(a))}>Call door phone</button>
      <button ?disabled=${!r} aria-pressed=${i._doorPreview===!0}
        @click=${()=>{i._doorPreview=!i._doorPreview,i.requestUpdate()}}>${i._doorPreview?"Stop video":"View live video"}</button>
    </div>`}
    ${a?u:l`<div class="notice">Set the SIP extension and select a camera in this card’s editor.</div>`}
  </section>`}function me(i,e,t,s){let n=i._config.entity,a=e._hass?.states?.[n];if(!a?.attributes?.simson_contact||a.attributes.simson_call_button)return l`<div class="empty"><h2>Choose a user</h2><p>Select a Simson user contact sensor in the card editor.</p></div>`;let r=a.attributes.user_name||a.attributes.friendly_name||"User",o=a.attributes.user_id===e._hass?.user?.id,c=a.state==="ready",_=a.attributes.notification;return l`<section class="user-workspace">
    ${t.hasCall?s(e,t):l`<div class="user-profile"><span class="call-avatar">${r.slice(0,2).toUpperCase()}</span><h2>${r}</h2><span class="user-presence ${c?"ready":""}">${o?"This is you":c?"Ready to receive a call":a.state==="unavailable"?"Unavailable":"In a call"}</span></div>
      <p class="fine-print">Calls are private to you and the recipient. They can answer from their dashboard or configured phone notification.</p>
      <div class="user-actions"><button class="primary" ?disabled=${o||!c||!t.connected||!!e._actionPending} @click=${()=>e._runAction("user:"+n,()=>e._callUserEntity(n))}>Call ${r}</button>
        <label class="toggle"><span>Start with video</span><input type="checkbox" .checked=${e._videoEnabled} @change=${h=>{e._videoEnabled=h.target.checked,e._saveMediaPreferences(),e.requestUpdate()}}></label></div>`}
    ${_?.status==="failed"||_?.status==="clear_failed"?l`<div class="notice error" role="status">Phone notification could not be ${_.status==="failed"?"sent":"cleared"}. Dashboard calling remains available; ask the administrator to check the Companion app mapping.</div>`:u}
  </section>`}var ge=`:host {
  display: block;
  --ink:#e9eff8;
  --muted:#94a3ba;
  --line:#ffffff14;
  --accent:#a7efcf;
  --panel:#161e2b;
  color: var(--ink);
  font-family: var(--primary-font-family,Inter,system-ui,sans-serif);
  font-size: 14px;
  line-height: 1.5;
  color-scheme: dark;
}
* {
  box-sizing: border-box;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
  touch-action: manipulation;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 15px;
  background: #ffffff08;
  color: var(--ink);
  transition: background .15s, border-color .15s;
  min-height: 44px;
}
button:hover {
  background: #ffffff12;
  border-color: #ffffff30;
}
button:disabled {
  opacity: .42;
  cursor: default;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.surface {
  background:
    linear-gradient(
      150deg,
      #1b2535,
      #111925 65%);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 24px;
  overflow: hidden;
  container-type: inline-size;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--accent);
  color: #193529;
  font-size: 24px;
  font-weight: 800;
}
.heading {
  flex: 1;
  min-width: 0;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1 {
  font-size: 21px;
  letter-spacing: -.6px;
  font-weight: 650;
}
h2 {
  font-size: 25px;
  letter-spacing: -.8px;
  line-height: 1.2;
}
h3 {
  font-size: 14px;
  font-weight: 600;
}
.eyebrow {
  display: block;
  font-size: 9px;
  letter-spacing: 1.6px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 5px;
}
.status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
}
.status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9aa7ba;
}
.status.online {
  color: var(--accent);
}
.status.online i {
  background: var(--accent);
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  gap: 24px;
  margin-bottom: 24px;
}
.tabs button {
  border: 0;
  border-radius: 0;
  background: none;
  color: var(--muted);
  padding: 8px 2px 12px;
  min-height: 42px;
  border-bottom: 2px solid transparent;
}
.tabs button.selected {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.intro p {
  color: var(--muted);
  font-size: 12px;
  margin-top: 10px;
}
.route-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 22px 0 18px;
}
.route-options button {
  padding: 6px 13px;
  font-size: 12px;
  min-height: 36px;
  border-radius: 9px;
}
.route-options button.selected {
  background: #a7efcf18;
  border-color: #a7efcf40;
  color: var(--accent);
}
.field {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}
.field > span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}
.field input,
.field select {
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  background: #0c1420;
  min-height: 46px;
}
.dial-input {
  display: flex;
  gap: 8px;
}
.dial-input input {
  flex: 1;
}
.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #163729;
  font-weight: 650;
}
.primary:hover {
  background: #c5f9e0;
  border-color: #c5f9e0;
}
.danger {
  background: #f47d881b;
  color: #ffacb4;
  border-color: #f47d8835;
}
.route-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 11px;
}
.route-hint > span {
  color: var(--accent);
  padding: 2px 7px;
  background: #a7efcf12;
  border-radius: 5px;
  white-space: nowrap;
}
.route-hint small {
  font-size: 11px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 26px 0 14px;
}
.section-heading > span {
  color: var(--muted);
  font-size: 11px;
}
.contacts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.contact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  text-align: left;
  min-width: 0;
  width: 100%;
  border-radius: 14px;
}
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #91b8f21a;
  color: #bdd6fc;
  font-size: 12px;
  font-weight: 600;
}
.contact-text {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}
.contact-text b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 550;
}
.contact-text small {
  color: var(--muted);
  font-size: 10px;
}
.text-button {
  border: 0;
  background: none;
  padding: 8px 0;
  color: var(--accent);
  font-size: 12px;
  text-align: left;
}
.dial-workspace > .text-button {
  margin-top: 18px;
}
.empty {
  padding: 35px 10px;
  text-align: center;
  color: var(--muted);
}
.empty h2 {
  color: var(--ink);
  margin-bottom: 12px;
  font-size: 20px;
}
.empty.compact {
  padding: 24px 12px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  font-size: 12px;
}
.notice {
  padding: 12px;
  border: 1px solid #d4aa6a50;
  border-radius: 12px;
  color: #efd5aa;
  background: #d4aa6a0c;
  font-size: 12px;
  margin: 12px 0;
}
.notice.error {
  color: #ffb7bf;
  border-color: #f47d8835;
  background: #f47d8810;
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
  color: #7f90aa;
  font-size: 10px;
}
footer span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.call-workspace {
  text-align: center;
}
.call-workspace > .eyebrow {
  margin-bottom: 18px;
}
.call-avatar {
  width: 90px;
  height: 90px;
  display: grid;
  place-items: center;
  margin: 28px auto;
  border-radius: 28px;
  background: #a7efcf14;
  border: 1px solid #a7efcf30;
  color: var(--accent);
  font-size: 32px;
}
.call-caption {
  color: var(--muted);
  margin: 10px 0 20px;
  font-size: 12px;
}
.call-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}
.transfer {
  margin-top: 24px;
  border: 1px solid var(--line);
  padding: 14px;
  border-radius: 14px;
  text-align: left;
}
.transfer summary {
  cursor: pointer;
  color: var(--muted);
}
.video-stage,
.preview {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
  border-radius: 16px;
  background: #0a1019;
  border: 1px solid var(--line);
  margin-bottom: 20px;
}
.video-stage > video,
.preview > video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview > video {
  transform: scaleX(-1);
}
.video-stage > .local-video {
  position: absolute;
  width: 25%;
  height: 36%;
  bottom: 12px;
  right: 12px;
  border-radius: 10px;
  border: 2px solid #ffffffb0;
  transform: scaleX(-1);
  z-index: 1;
}
.live-label {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--accent);
  background: #152620b8;
  font-size: 9px;
  letter-spacing: 1px;
}
.video-wait,
.preview-empty {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  color: var(--muted);
  gap: 6px;
}
.preview-empty b {
  color: var(--ink);
  font-size: 15px;
}
.preview-empty small {
  font-size: 11px;
  max-width: 90%;
  text-align: center;
}
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px;
  background: #a7efcf0b;
  border: 1px solid #a7efcf20;
  border-radius: 12px;
}
.toggle span {
  display: grid;
  gap: 4px;
}
.toggle b {
  font-size: 12px;
}
.toggle small {
  color: var(--muted);
  font-size: 11px;
}
.toggle input {
  accent-color: var(--accent);
  width: 20px;
  height: 20px;
}
.device-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.device-grid > .field:last-child {
  grid-column: 1/-1;
}
.fine-print {
  font-size: 11px;
  color: var(--muted);
  margin-top: 16px;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.avatar.missed {
  color: #ffacb4;
  background: #f47d8810;
}
@container (max-width:360px) {
  .contacts,
  .device-grid {
    grid-template-columns: 1fr;
  }
  .status {
    font-size: 0;
  }
  .status i {
    width: 8px;
    height: 8px;
  }
  .eyebrow {
    font-size: 8px;
    letter-spacing: 1.1px;
  }
  h2 {
    font-size: 22px;
  }
  .route-options {
    gap: 4px;
  }
  .route-options button {
    padding: 6px 10px;
  }
  .dial-input {
    flex-wrap: wrap;
  }
  .dial-input .primary {
    width: 100%;
  }
  .header {
    gap: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
.surface {
  position: relative;
}
.dialog-scrim {
  position: fixed;
  inset: 0;
  margin: 0;
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  border: 0;
  color: var(--ink);
  display: grid;
  place-items: center;
  padding: 16px;
  background: #080d17e8;
}
.dialog-scrim:not([open]){display:none}
.dialog-scrim::backdrop{background:#080d17b3}
.dialog {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 20px 60px #0006;
  max-height: calc(100dvh - 32px);
  overflow: auto;
}
.dialog h2 {
  overflow-wrap: anywhere;
}
.dialog p {
  margin-top: 12px;
  color: var(--muted);
}
.dialog-options {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  max-height: 280px;
  overflow: auto;
}
.live-idle{padding:32px 0;text-align:center;display:grid;justify-items:center;gap:12px}
.live-idle p{color:var(--muted);max-width:32ch;line-height:1.6;margin:0}
.idle-indicator{width:48px;height:48px;border-radius:16px;background:var(--panel);border:1px solid var(--line)}
.action-progress{padding:10px 14px;border-radius:10px;background:var(--panel);font-size:13px;margin:12px 0}
.mode-history .intro,.mode-dial .intro{padding-top:8px}
.heading{min-width:0}
.heading h1{overflow-wrap:anywhere}
@media(max-width:420px){.header{flex-wrap:wrap;gap:12px}.status{margin-left:auto}}
.call-setup-status{display:flex;align-items:center;gap:12px;max-width:440px;margin:20px auto 0;padding:13px 16px;text-align:left;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.call-setup-status>span:last-child{display:grid;gap:2px}
.call-setup-status b{font-size:13px}
.call-setup-status small{color:var(--muted);font-size:12px;line-height:1.45}
.call-setup-spinner{width:18px;height:18px;flex:none;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:call-spin .8s linear infinite}
@keyframes call-spin{to{transform:rotate(360deg)}}
.user-workspace{display:grid;gap:20px;padding:20px 0}
.user-profile{display:grid;justify-items:center;gap:14px;text-align:center;min-width:0}
.user-profile h2{margin:0;overflow-wrap:anywhere}
.user-presence{font-size:13px;border:1px solid var(--line);border-radius:24px;padding:8px 14px;color:var(--muted)}
.user-presence.ready{color:var(--accent)}
.user-actions{display:grid;gap:14px}
.current-call-banner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin:14px 0}
.current-call-banner>span{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.current-call-banner small{color:var(--muted)}
.user-actions>button{white-space:normal;overflow-wrap:anywhere;min-height:48px}
.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.call-dialog{width:min(100%,560px);max-width:560px}
.call-dialog .call-workspace{padding-top:16px}
.browser-join{display:grid;gap:12px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);text-align:left;margin-top:18px}
.browser-join p{margin:0;font-size:13px;line-height:1.6;color:var(--muted)}
@media(prefers-reduced-motion:reduce){.call-setup-spinner{animation:none}}
.call-actions button:disabled{opacity:.62;cursor:wait}
@media(max-width:520px){.call-setup-status{margin-top:14px;padding:11px 12px}.call-setup-status b{font-size:12px}}
`;var V=class extends w{static styles=G(ge);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession(),this.session&&(this.session.hass=e)}_bindSession(){if(!this.isConnected||!this._hass)return;let e=ne(this,this._hass,this._config);this.session!==e&&(this.session&&L(this.session,this),this.session=e,this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&L(this.session,this),this.session=null}updated(){if(!this.session)return;this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer();let e=this.shadowRoot.querySelector("dialog");e&&!e.open&&e.showModal(),e&&!this._dialogVisible?(this._previousFocus=this.shadowRoot.activeElement,e.querySelector("button:not(:disabled)")?.focus()):!e&&this._dialogVisible&&this._previousFocus?.focus(),this._dialogVisible=!!e}render(){let e=this.session,t=e?._view,s=this._config.view||"combined",n=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices",user:"Call a user"}[s]||"Simson",a=e?._activeTab||"dial",r=e?[...e.views]:[],o=r.find(d=>["dial","combined"].includes(d._config.view||"combined"))||r[0],c=r.find(d=>d._config.view==="live")||o,_=e&&(e._pickerOpen?o===this:c===this),h=(d,m)=>e._showCallDialog&&_?u:D(d,m);return l`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${n}</h1></div><span class="status ${t?.connected?"online":""}"><i></i>${t?.connected?"Connected":"Offline"}</span></header>
      ${t?l`
        ${t.connected?u:l`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?l`<div class="notice error" role="alert">${e._actionError}</div>`:u}
        ${e._actionPending?l`<div class="action-progress" role="status">${e._actionPending}</div>`:u}
        ${s==="dial"&&t.hasCall?l`<div class="current-call-banner" role="status"><span><b>${t.remoteLabel}</b><small>${t.isActive?"Call in progress":t.isIncoming?"Incoming call":"Calling\u2026"}</small></span><button @click=${()=>{e._showCallDialog=!0,e._render()}}>Call controls</button></div>`:u}
        ${s==="user"?me(this,e,t,h):s==="door"?pe(this,e,t,h):s==="live"?t.hasCall?h(e,t):l`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?B(e):s==="devices"?N(e):s==="dial"?a==="media"?l`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${N(e)}`:O(e,t):l`
            ${t.hasCall?h(e,t):u}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([d,m])=>l`<button class=${a===d?"selected":""} aria-current=${a===d?"page":"false"} @click=${()=>e._selectTab(d)}>${m}</button>`)}</nav>
            ${a==="history"?B(e):a==="media"?N(e):t.hasCall?l`<p class="fine-print">End the current call before starting another.</p>`:O(e,t)}
          `}
      `:l`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${_?he(e):u}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${Q}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",V);export{V as SimsonCard};
