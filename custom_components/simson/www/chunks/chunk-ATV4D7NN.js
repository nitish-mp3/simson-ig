import{a as ne}from"./chunk-FO2F77I5.js";import{a as te,c,d as ie,e as p,f as se,g as b}from"./chunk-KLUKP4ZZ.js";import{a as B}from"./chunk-JRAU7HWG.js";import{c as ae,d as re}from"./chunk-4YHDLG2C.js";var $=class extends b{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let i=e.node_id||"";if(!i&&e.connection_entity){let r=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);r&&(i=r[1])}if(!i&&e.call_state_entity){let r=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);r&&(i=r[1])}if(!i&&e.calls_count_entity){let r=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);r&&(i=r[1])}let a=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(r=>typeof r=="string"?r:r?.node_id||r?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:i,connection_entity:e.connection_entity,call_state_entity:e.call_state_entity,calls_count_entity:e.calls_count_entity,target_nodes:a,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),a.forEach(r=>{this._usersCache[r]||(this._usersCache[r]={users:[],timestamp:0})}),this._render()}};function x(t,e,i=""){return!t?.call_id||!e?!1:t.local_user_call&&t.caller_user_id===e?!0:t.direction==="outgoing"?t.caller_user_id===e:t.direction!=="incoming"||t.target_user_id&&t.target_user_id!==e||t.answered_by_user_id&&t.answered_by_user_id!==e?!1:t.status==="active"||t.state==="active"?t.answered_by_user_id===e||t.call_id===i:!0}function H(t,e={},i=""){let s=t?.states||{};if(e.connection_entity&&s[e.connection_entity])return s[e.connection_entity];let a=e.node_id||i;if(a){let r=s[`sensor.simson_${a}_connection`];return r||Object.entries(s).find(([n,o])=>/^sensor\.simson_.+_connection$/.test(n)&&o.attributes?.node_id===a)?.[1]}return Object.entries(s).find(([r])=>/^sensor\.simson_.+_connection$/.test(r))?.[1]}function I(t,e={},i=""){return H(t,e,i)?.attributes?.node_id||e.node_id||i||""}function P(t,e,i,s){let a=t?.states||{},r=e?.[`${s}_entity`];if(r&&a[r])return a[r];if(s==="connection")return H(t,e,i);let n=H(t,e,i),d=Object.keys(a).find(_=>a[_]===n)?.replace(/_connection$/,`_${s}`);if(d&&a[d])return a[d];let l=I(t,e,i),u=a[`sensor.simson_${l}_${s}`];return u||Object.entries(a).find(([_,f])=>_.startsWith("sensor.simson_")&&_.endsWith(`_${s}`)&&f.attributes?.node_id===l)?.[1]}async function R(t,e,i=8e3){if(t?.callApi){let r;try{return await Promise.race([t.callApi("GET",e),new Promise((n,o)=>{r=setTimeout(()=>o(Error("Home Assistant request timed out")),i)})])}finally{clearTimeout(r)}}let s=t?.auth?.data?.access_token,a=await fetch("/api/"+e,{headers:s?{Authorization:"Bearer "+s}:{},signal:AbortSignal.timeout(i)});if(!a.ok)throw Error("Home Assistant request failed ("+a.status+")");return a.json()}var oe=t=>class extends t{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let i=e.match(/^sensor\.simson_(.+)_connection$/);if(i){this._detectedNodeId=i[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return I(this._hass,this._config,this._detectedNodeId)}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,i=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"],["simson_user_call_started","_onHAUserCallStarted"]];this._subscriptions=[];for(let[s,a]of i)this._hass.connection.subscribeEvents(r=>{e===this._subscriptionGeneration&&this.isConnected&&this[a](r.data)},s).then(r=>{e!==this._subscriptionGeneration||!this.isConnected?r():this._subscriptions.push(r)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAUserCallStarted(e){if(!e.interactive||e.node_id!==this._nodeId()||!e.call_id||e.caller_user_id!==this._hass?.user?.id||this._endedCallIds?.has(e.call_id)||this._currentCallId&&this._currentCallId!==e.call_id)return;let i=!!this._initiatedHere;this._currentCallId||this._beginOutgoingCall(e.node_id,e.call_type,e.target_user_name),this._initiatedHere=i,this._currentCallId=e.call_id,this._currentRemoteNode=e.node_id,this._currentRemoteLabel=e.target_user_name,this._currentCallType=e.call_type||"voice",this._isCaller=!0,clearTimeout(this._outgoingUiTimer),this._eventCallSnapshot={...e,...this._eventCallSnapshot,call_id:e.call_id,direction:"outgoing",state:this._eventCallSnapshot?.state||"requesting",_receivedAt:Date.now()},i||(this._showCallDialog=!0),this._render()}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(i=>{this._actionError=i?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){if(e.node_id&&e.node_id!==this._nodeId()||this._endedCallIds?.has(e.call_id)&&["requesting","ringing","active"].includes(e.status))return;e.local_user_call&&e.caller_user_id===this._hass?.user?.id&&(e={...e,direction:"outgoing"});let{call_id:i,status:s,direction:a,remote_node_id:r,call_type:n,sip_bridge_id:o,target_user_id:d,caller_user_id:l,answered_by_user_id:u}=e,_=this._hass?.user?.id||"";if(x(e,_,this._currentCallId)&&!(this._currentCallId&&i!==this._currentCallId))if(["requesting","ringing","active"].includes(s)&&(this._eventCallSnapshot={...this._eventCallSnapshot,...e,state:s,_receivedAt:Date.now()}),n&&(this._currentCallType=n),clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,(s==="requesting"||s==="ringing")&&a==="outgoing")this._actionError="",this._currentCallId=i||this._currentCallId,this._currentRemoteNode=r||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){this._actionError="",console.log("[Simson] call_status active",{call_id:i,call_type:n,sip_bridge_id:o,direction:a,remote_node_id:r});let m=this._answeredByMe||this._answerPendingCallId===i;if(a==="incoming"&&!m){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:i}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),a==="incoming"&&u&&u!==_){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._render();return}this._currentCallId=i,m&&(this._answeredByMe=!0),this._answerPendingCallId=null,this._currentRemoteNode=r,o&&(this._sipBridgeId=o);let h=n==="sip"||String(r||"").startsWith("sip:")||String(r||"").startsWith("asterisk:");this._isCaller=a==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification();let g=this._initiatedHere||m;h&&g?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(v=>console.error("[Simson] SIP active start:",v)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:i,remote_node_id:r}):!h&&g&&this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&((this._endedCallIds||=new Set).add(i),this._endedCallIds.size>100&&this._endedCallIds.delete(this._endedCallIds.values().next().value),this._eventCallSnapshot=null,this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._initiatedHere=!1,this._showCallDialog=!1,this._actionError=s==="failed"?"The call could not be started. Check the selected gateway or SIP phone.":"",setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){if(e.node_id&&e.node_id!==this._nodeId()||this._endedCallIds?.has(e.call_id))return;let{call_id:i,from_node_id:s,from_label:a,call_type:r,target_user_id:n,metadata:o}=e;if(!this._hass?.user?.id)return;if(n&&this._hass?.user?.id&&n!==this._hass.user.id){this._ignoredCallId=i;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:i,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=i;return}if(!i||this._endedCallIds?.has(i))return;let d=i;if(this._lastIncomingCall===d&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=d,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=i,this._currentCallType=r||"voice",this._eventCallSnapshot={...o,call_id:i,state:"incoming",direction:"incoming",remote_node_id:s,remote_label:a,call_type:r,target_user_id:n},this._currentRemoteNode=s,this._incomingFrom=a||s,this._incomingCallType=r||"voice",this._sipBridgeId=r==="sip"&&o?.sip_bridge_id?o.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===i&&!this._answeredByMe&&!this._answerPendingCallId&&this._callState()!=="active"&&(console.log("[Simson] Incoming call timeout - clearing phantom call",i),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._clearLocalCallState(),this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let i=e.node_id||this._selectedNode;if(i&&(this._usersCache[i]={users:e.users,timestamp:Date.now()}),this._transferLoading&&i===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return P(this._hass,this._config,this._detectedNodeId,e)}_val(e,i="unknown"){return this._entity(e)?.state??i}_attr(e,i,s=null){return this._entity(e)?.attributes?.[i]??s}_effectivePstnTrunk(e=!0){let i=e?String(this._pstnTrunkDraft||"").trim():"";if(i)return i;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let a=this._attr("connection","routing",{})||{},r=String(a.default_gateway_trunk||"").trim();if(r)return r;let n=(this._targets||[]).find(o=>(o.type==="gateway"||o.trunk)&&o.trunk);return n?.trunk?String(n.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._visibleCall()?.state||"idle";return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,i=""){return this._visibleCall()?.[e]??i}_visibleCall(){let e=this._hass?.user?.id||"",i=this._attr("calls_count","active_calls",[])||[],s=this._entity("call_state"),a=this._eventCallSnapshot,r=this._entity("calls_count"),o=[a?._receivedAt&&Date.now()-a._receivedAt>5e3&&this._isConnected()&&r?.state==="0"&&Date.parse(r.last_updated)>a._receivedAt?null:a,...i,{...s?.attributes,state:s?.state}].filter(l=>l&&!this._endedCallIds?.has(l.call_id)).sort((l,u)=>+(u.state==="active"||u.status==="active")-+(l.state==="active"||l.status==="active")),d=o.find(l=>l.call_id===this._currentCallId&&x(l,e,this._currentCallId))||o.find(l=>x(l,e,this._currentCallId));return d?.local_user_call&&d.caller_user_id===e?{...d,direction:"outgoing",remote_label:d.target_user_name||d.remote_label}:d}_isStaleRingingCall(){let e=Number(this._visibleCall()?.started_at||0);return e?Date.now()-e*1e3>9e4:!1}async _callService(e,i={}){if(this._hass)try{await this._hass.callService("simson",e,i),setTimeout(()=>this._render(),250)}catch(s){return!/may have started|request timed out/i.test(s?.message||"")&&(e==="make_call"||e==="call_user"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadPeople(e=!1){let i=this._nodeId();if(!(!i||this._peopleLoading||!e&&this._peopleAttemptNode===i&&Date.now()-(this._peopleFetchedAt||0)<3e4)){this._peopleLoading=!0,this._peopleAttemptNode=i;try{let s=await R(this._hass,"simson/users?node_id="+encodeURIComponent(i));if(i!==this._nodeId()||s.node_id!==i)return;this._localUsers=s.users||[],this._videoProfiles=s.videophones||[],this._peopleNode=i,this._peopleError=""}catch{this._peopleError="Directory unavailable. Showing available contact entities."}finally{this._peopleFetchedAt=Date.now(),this._peopleLoading=!1,this._render()}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let i=this._usersCache[e];if(i&&Date.now()-i.timestamp<3e3){this._remoteUsers=i.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var le=t=>class extends t{_beginOutgoingCall(e,i,s=""){this._initiatedHere=!0,this._currentRemoteNode=e||this._currentRemoteNode,this._currentRemoteLabel=s,this._currentCallType=i||"",this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._actionError="",clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=setTimeout(()=>{this._outgoingUiTimer=null,!(!this._isCaller||this._currentCallId||!this._outgoingIntentAt)&&(this._outgoingIntentAt=0,this._isCaller=!1,this._currentCallType="",this._actionError="No call status came back from the node. Check the gateway or SIP phone registration, then retry.",this._render())},45e3),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,i,s=650){let a=String(e||"action"),r=Date.now();if(!this._actionLocks.has(a)&&!(r-(this._lastActionAt[a]||0)<s)){this._lastActionAt[a]=r,this._actionLocks.add(a),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(i())}catch(n){console.error("[Simson] action failed:",a,n),this._actionError=n?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(a),s)}}}_bindAction(e,i,s,a=650){if(!e)return;let r=n=>{n.preventDefault(),n.stopPropagation(),this._runAction(i,s,a)};e.addEventListener("pointerup",r),e.addEventListener("click",r)}_callUserEntity(e){let i=this._hass?.states?.[e];if(i?.attributes?.simson_contact)return this._beginOutgoingCall(i.attributes.node_id,this._videoEnabled?"video":"voice",i.attributes.user_name||"User"),this._callService("call_user",{entity_id:e,call_type:this._videoEnabled?"video":"voice"})}_callDirectoryUser(e){return e.entity_id&&this._hass?.states?.[e.entity_id]?this._callUserEntity(e.entity_id):(this._beginOutgoingCall(this._nodeId(),this._videoEnabled?"video":"voice",e.user_name),this._callService("call_user",{node_id:this._nodeId(),target_user_id:e.user_id,call_type:this._videoEnabled?"video":"voice"}))}_joinUserCall(){if(!this._currentCallId||!this._isCaller)return;this._initiatedHere=!0,this._videoEnabled=this._currentCallType==="video";let e=this._callState()==="active"?this._startWebRTC():void 0;return this._render(),e}_dial(e,i,s){if(!e)return;let a=this._videoEnabled?"video":"voice";this._beginOutgoingCall(e,a,s||"");let r={target_node_id:e,call_type:a,caller_user_id:this._hass?.user?.id||""};return i&&(r.target_user_id=i,r.target_user_name=s||""),this._callService("make_call",r)}_dialTarget(e,i,s){let r=["asterisk","sip","gateway"].includes(i)?"sip":this._videoEnabled?"video":"voice";return this._beginOutgoingCall(s||e,r),this._callService("make_call",{target_id:e,call_type:r,caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let i=this._effectivePstnTrunk();return this._dialPSTNNumber(e,i)}return this._beginOutgoingCall(e,"sip"),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,i=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let r=String(i||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`,"sip"),this._callService("make_call",{phone_number:s,trunk:r,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let i=String(e||"").trim(),s=i.replace(/\D/g,"");return i.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){this._initiatedHere=!1,this._showCallDialog=!1,this._currentCallId&&(this._endedCallIds||=new Set).add(this._currentCallId),this._eventCallSnapshot=null,clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}async _answer(e=this._activeCallAttr("call_id")||this._currentCallId){if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!1,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0;let i=await this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""});if(this._currentCallId===e){if(i===!1){this._answerPendingCallId=null,this._answeredByMe=!1,this._callStart=null,this._callState()==="incoming"&&this._showIncomingPopup(),this._render();return}this._answeredByMe=!0,this._showCallDialog=!0,this._render(),this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(s=>console.error("[Simson] SIP answer start:",s))}}async _reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null);let i=await this._callService("reject_call",{call_id:e,reason:"declined"});if(!(this._currentCallId&&this._currentCallId!==e)){if(i===!1){this._render();return}this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId||(this._currentCallId=e),this._clearLocalCallState()}}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,i="",s=""){let a=this._activeCallAttr("call_id")||this._currentCallId,r=String(e||"").trim();!a||!r||this._callService("transfer_call",{call_id:a,target_node_id:r,target_user_id:i||"",target_user_name:s||""})}_loadTransferUsers(e){let i=String(e||"").trim();if(!i)return;let s=this._usersCache[i];if(this._transferNodeDraft=i,this._transferUsersNode=i,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:i}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._sipRoomMedia?.cameraChanged(),this._render()}_smartDialRoute(e,i=this._smartRouteMode||"auto"){let s=String(e||"").trim(),a=String(i||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(a==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(a==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(a==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let r=s.toLowerCase(),n=s.replace(/[^\d+]/g,""),o=n.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:n.startsWith("+")||o.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(l=>String(l.node_id||l.id||"").toLowerCase()===r||String(l.label||"").toLowerCase()===r)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,i=""){let s=String(e||"").trim();if(!s)return;let a=this._smartDialRoute(s);if(this._nodeInputDraft=s,a.kind==="pstn"){let n=String(i||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=n,this._dialPSTNNumber(s,n)}if(a.kind==="sip"){let n=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=n,this._dialSIPExtension(n)}let r=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=r,this._userPickerNodeId=r,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:r})}};var V="simson.card.media.v1",ce=t=>class extends t{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(V)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(V)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(V,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let i=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:i,video:s}}async _enableCamera(){if(this._sipRoomMedia)return this._sipRoomMedia.enableCamera();let e=this._pc;if(!e||this._localStream?.getVideoTracks().length||this._enablingCamera)return;this._enablingCamera=!0;let i;try{if(this._roomMediaContext?.camera_entity){this._cameraSourceAbort?.abort(),this._cameraSourceAbort=new AbortController;let s=await B(this._hass,this._roomMediaContext.camera_entity,this._cameraSourceAbort.signal,this._webrtcConfig?.ice_servers||[],this._roomMediaContext.camera_fallback_entity);if(this._pc!==e||!this.isConnected){s.close();return}this._roomCameraSource=s,i=s.stream}else try{i=await navigator.mediaDevices.getUserMedia({audio:!1,video:this._mediaConstraints(!0).video})}catch(s){if(!["NotFoundError","OverconstrainedError"].includes(s.name))throw s;i=await navigator.mediaDevices.getUserMedia({audio:!1,video:!0})}if(this._pc!==e||!this.isConnected){i.getTracks().forEach(s=>s.stop());return}this._localStream||=new MediaStream,i.getVideoTracks().forEach(s=>{this._localStream.addTrack(s),e.addTrack(s,this._localStream)}),this._cameraMuted=!1,this._mediaDeviceError=""}catch(s){i?.getTracks().forEach(a=>a.stop()),this._mediaDeviceError=s.message||"Camera unavailable. Audio continues."}finally{this._enablingCamera=!1,this._render()}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let i=null;try{if(e){try{i=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(a){if(!this._videoEnabled)throw a;i=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(a=>a.kind==="audioinput"),videoInputs:s.filter(a=>a.kind==="videoinput"),audioOutputs:s.filter(a=>a.kind==="audiooutput")},this._mediaDevices.audioInputs.length&&!this._mediaDevices.audioInputs.some(a=>a.deviceId===this._selectedAudioInput)&&(this._selectedAudioInput=""),this._mediaDevices.videoInputs.length&&!this._mediaDevices.videoInputs.some(a=>a.deviceId===this._selectedVideoInput)&&(this._selectedVideoInput=""),this._mediaDevices.audioOutputs.length&&!this._mediaDevices.audioOutputs.some(a=>a.deviceId===this._selectedAudioOutput)&&(this._selectedAudioOutput=""),this._mediaDevicesLoaded=!0,this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{i?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(e&&this._roomMediaContext?.camera_entity){let i=this._rtcGeneration,s=await this._captureMedia(!1);if(i!==this._rtcGeneration)throw s.getTracks().forEach(a=>a.stop()),new DOMException("Call ended","AbortError");try{this._cameraSourceAbort?.abort(),this._cameraSourceAbort=new AbortController;let a=await B(this._hass,this._roomMediaContext.camera_entity,this._cameraSourceAbort.signal,this._webrtcConfig?.ice_servers||[],this._roomMediaContext.camera_fallback_entity);if(i!==this._rtcGeneration)throw a.close(),s.getTracks().forEach(r=>r.stop()),new DOMException("Call ended","AbortError");this._roomCameraSource=a,a.stream.getVideoTracks().forEach(r=>s.addTrack(r))}catch(a){this._mediaDeviceError=a?.name==="AbortError"?"":a.message||"Room camera unavailable. Audio continues."}return s}if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(i){if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(i.name)&&(this._selectedAudioInput||e&&this._selectedVideoInput)){this._selectedAudioInput="",this._selectedVideoInput="",this._saveMediaPreferences();try{let s=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e));return this._mediaDeviceError="A saved device is unavailable. Using the system default instead.",s}catch(s){i=s}}if(e){this._mediaDeviceError="Camera access is unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){i=s}}if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(i.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw i}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let i=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){i.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=i,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(i){this._mediaDeviceError=i?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(i=>i.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let i=this._root()?.querySelector("#remote-video");if(i&&this._remoteStream?.getVideoTracks?.().length&&i.srcObject!==this._remoteStream){i.srcObject=this._remoteStream,this._remoteVideoReady=!1;let a=()=>{i.srcObject===this._remoteStream&&i.videoWidth>0&&!this._remoteVideoReady&&(this._remoteVideoReady=!0,this._render())};i.onloadeddata=a,i.requestVideoFrameCallback?.(a),i.play().catch(()=>{})}let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._applyAudioOutput()}async _applyAudioOutput(){if(!this._remoteAudio?.setSinkId){if(!this._selectedAudioOutput)return;this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="This browser cannot select a speaker. Using its system default.",this._render();return}if(this._remoteAudio.sinkId!==this._selectedAudioOutput)try{await this._remoteAudio.setSinkId(this._selectedAudioOutput)}catch{this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="Could not select that speaker. Call audio is using the system default.",this._render()}}};var w=[{urls:"stun:stun.l.google.com:19302"}];async function de(t,e){if(!t._hass?.callService||!t._currentCallId||t._pc?.connectionState!=="connected"||!t._initiatedHere&&!t._answeredByMe)return;let i=[...e.values()],s=!t._playbackBlocked&&i.some(n=>n.type==="inbound-rtp"&&n.kind==="audio"&&n.packetsReceived>0)&&i.some(n=>n.type==="outbound-rtp"&&n.kind==="audio"&&n.packetsSent>0),a=i.some(n=>n.type==="inbound-rtp"&&n.kind==="video"&&n.framesDecoded>0),r=i.some(n=>n.type==="outbound-rtp"&&n.kind==="video"&&n.framesEncoded>0);for(let n of Object.values(t._hass.states||{})){let o=n.attributes||{};if(!(!o.simson_room||o.call_id!==t._currentCallId||o.room_user_id!==t._hass.user?.id||o.audio_mode!=="browser"||!o.session_id||!["ringing","connecting","active","degraded"].includes(n.state)))for(let d of["audio","video"]){if(o.call_id!==t._currentCallId||t._pc?.connectionState!=="connected")return;if((d==="audio"?!s:!r||o.video_mode!=="ha_camera"&&!a||!["browser","ha_camera"].includes(o.video_mode))||o.components?.[d]==="ready")continue;t._roomMediaReports||=new Map;let l=`${o.session_id}:${d}`;if(!((t._roomMediaReports.get(l)||0)>Date.now())){t._roomMediaReports.set(l,Date.now()+15e3);try{await t._hass.callService("simson","report_room_component",{node_id:o.node_id,room_id:o.room_id,session_id:o.session_id,component:d,state:"ready"}),t._roomMediaReports.set(l,1/0)}catch{}}}}}var _e=t=>class extends t{async _fetchWebRTCConfig(){let e=this._currentCallId||"";if(this._webrtcConfig&&(!e||this._webrtcConfig.sip?.enabled)&&this._webrtcConfigCallId===e&&(!this._webrtcConfigFetchedAt||Date.now()-this._webrtcConfigFetchedAt<6e4))return this._webrtcConfig;if(this._webrtcConfigPromise)return this._webrtcConfigPromiseCallId===e?this._webrtcConfigPromise:(await this._webrtcConfigPromise,this._fetchWebRTCConfig());if(this._webrtcConfigRetryCallId===e&&Date.now()<(this._webrtcConfigNextRetryAt||0))return{ice_servers:w,sip:{enabled:!1}};this._webrtcConfigPromiseCallId=e,this._webrtcConfigPromise=(async()=>{try{return this._webrtcConfig=await R(this._hass,"webrtc-config?call_id="+encodeURIComponent(e)+"&node_id="+encodeURIComponent(this._nodeId?.()||""),15e3),this._webrtcConfigFetchedAt=Date.now(),this._webrtcConfigCallId=e,this._webrtcConfigNextRetryAt=0,this._webrtcConfigError="",this._webrtcConfig}catch(i){let s=Number(i?.status||i?.status_code||i?.body?.status||0);this._webrtcConfigError=s===404?"The requested Simson node was not found. Check the card node and integration instance.":s===401||s===403?"Home Assistant denied the media configuration request. Sign in again and retry.":"Media configuration could not be loaded"+(s?" (HTTP "+s+")":"")+". Check the Home Assistant integration logs and retry."}return this._webrtcConfigRetryCallId=e,this._webrtcConfigNextRetryAt=Date.now()+3e4,{ice_servers:w,sip:{enabled:!1}}})();try{let i=await this._webrtcConfigPromise;return this._turnAvailable=this._webrtcConfigError?void 0:this._hasTurnRelay(i),this.isConnected&&this._render(),i}finally{this._webrtcConfigPromise=null}}_hasTurnRelay(e){return(Array.isArray(e?.ice_servers)?e.ice_servers:[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(r=>/^(turn|turns):/i.test(String(r||""))))}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{try{this._roomMediaContext=await re(this)}catch{if(Object.values(this._hass?.states||{}).find(n=>n.attributes?.simson_room&&n.attributes.call_id===this._currentCallId&&n.attributes.room_user_id===this._hass?.user?.id)?.attributes.video_mode==="ha_camera")throw Error("Room camera configuration could not be authorized. Reconnect Home Assistant before retrying.");this._roomMediaContext=null}if(e!==this._rtcGeneration||!this.isConnected)return;let i=(async()=>{if(!navigator.mediaDevices?.getUserMedia){this._micAllowed=!1;return}try{let r=this._currentCallType||this._activeCallAttr("call_type","")||this._incomingCallType||"voice",n=await this._captureMedia(["video","webrtc-video"].includes(r));if(e!==this._rtcGeneration||!this.isConnected){n.getTracks().forEach(o=>o.stop());return}this._localStream=n,this._micAllowed=!0}catch(r){this._micAllowed=!1,this._mediaDeviceError=r?.message||"Allow microphone access to speak."}})(),[s]=await Promise.all([this._fetchWebRTCConfig(),i]);if(e!==this._rtcGeneration||!this.isConnected)return;let a=Array.isArray(s.ice_servers)?s.ice_servers:w;if(this._turnAvailable=this._webrtcConfigError?void 0:this._hasTurnRelay({ice_servers:a}),e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:a}),this._pendingCandidates||=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(r=>{this._pc.addTrack(r,this._localStream)}),this._pc.ontrack=r=>{if(r.streams?.[0])this._attachRemoteMedia(r.streams[0],null);else{let n=new MediaStream;n.addTrack(r.track),this._attachRemoteMedia(n,r.track)}},this._pc.onicecandidate=r=>{r.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:r.candidate.candidate,sdpMid:r.candidate.sdpMid,sdpMLineIndex:r.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(r){console.error("Simson: negotiation error:",r)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let r=this._pc?.connectionState;if(r==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(r==="disconnected")this._audioQuality=1;else if(r==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._mediaDeviceError=this._webrtcConfigError?"The media connection failed. Relay configuration was unavailable; reload the integration connection and retry.":this._turnAvailable?"The media connection failed. Check network/firewall access and try again.":"The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.",this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let r=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(r)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:i,from_node_id:s,signal_type:a,data:r}=e;if(!(r?.simson_sender_user_id&&r.simson_sender_user_id===this._hass?.user?.id)&&!(!i||!this._currentCallId||i!==this._currentCallId)&&!(!this._initiatedHere&&!this._answeredByMe&&this._answerPendingCallId!==i)&&!(s&&this._currentRemoteNode&&s!==this._currentRemoteNode)){if(a==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;let n=this._makingOffer||this._pc.signalingState!=="stable"&&!this._isSettingRemoteAnswerPending;if(this._ignoreOffer=n&&!this._polite,this._ignoreOffer)return;if(n&&await this._pc.setLocalDescription({type:"rollback"}),await this._pc.setRemoteDescription(new RTCSessionDescription(r)),!this._isCaller&&this._localStream){let o=new Set([...String(r?.sdp||"").matchAll(/^m=(audio|video)\s/gm)].map(l=>l[1])),d=this._pc.getSenders();this._localStream.getTracks().filter(l=>o.has(l.kind)).filter(l=>!d.some(u=>u.track?.kind===l.kind)).forEach(l=>this._pc.addTrack(l,this._localStream))}await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let o of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(o));this._pendingCandidates=[]}else if(a==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"&&!this._isSettingRemoteAnswerPending){this._isSettingRemoteAnswerPending=!0;try{await this._pc.setRemoteDescription(new RTCSessionDescription(r))}finally{this._isSettingRemoteAnswerPending=!1}for(let n of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(n));this._pendingCandidates=[]}}else if(a==="ice-candidate")if(this._pc&&this._pc.remoteDescription)try{await this._pc.addIceCandidate(new RTCIceCandidate(r))}catch(n){if(!this._ignoreOffer)throw n}else this._pendingCandidates.push(r)}}_sendWebRTCSignal(e,i){let s=this._activeCallAttr("call_id")||this._currentCallId,a=this._currentRemoteNode;!s||!a||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:a,signal_type:e,data:i}).catch(r=>console.error("Simson: signal send failed:",r))}_cleanupWebRTC({endCall:e=!1}={}){this._cameraSourceAbort?.abort(),this._roomCameraSource?.close(),this._roomCameraSource=null,this._roomDisplayPublisher?.close(),this._roomDisplayPublisher=null,this._roomMediaContext=null,this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(i=>i.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._remoteVideoReady=!1,this._playbackBlocked=!1,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._roomMediaReports?.clear(),this._ignoreOffer=!1,this._isSettingRemoteAnswerPending=!1,e&&(this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._initiatedHere=!1),this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,i=null){if(!e&&i&&(e=new MediaStream,e.addTrack(i)),!e)return;for(let a of e.getVideoTracks?.()||[])a.addEventListener("unmute",()=>this._render(),{once:!0});this._sipRoomMedia?.source||(this._remoteStream=e),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1;let s=e.getAudioTracks?e.getAudioTracks():[];if(!s.length){this._attachMediaElements(),this._render();return}this._remoteAudio.srcObject=e,console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(a=>a.readyState),muted:s.map(a=>a.muted)}),this._remoteAudio.play().then(()=>{this._playbackBlocked=!1}).catch(a=>{this._playbackBlocked=!0,this._render(),console.warn("[Simson] remote audio play blocked/failed:",a?.message||a)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,i=null){this._attachRemoteMedia(e,i)}async _updateQuality(){if(this._pc)try{let e=this._pc,i=this._currentCallId,s=await e.getStats();if(this._pc!==e||this._currentCallId!==i)return;await de(this,s),this._roomMediaContext?.display_entity&&this._roomMediaContext.display_mode==="cast"&&this._remoteStream?.getVideoTracks().some(d=>d.readyState==="live")&&!this._roomDisplayPublisher&&(this._roomDisplayPublisher=new ae(this._hass,this._roomMediaContext,this._remoteStream,this._webrtcConfig?.ice_servers||[]));let a=0,r=0,n=0;s.forEach(d=>{if(d.type==="inbound-rtp"&&d.kind==="audio"&&(a=d.jitter||0,r=d.packetsLost||0,n=d.packetsReceived||1),d.type==="candidate-pair"&&d.state==="succeeded"){let l=s.get?s.get(d.remoteCandidateId):null;l?.candidateType&&(this._connectionType=l.candidateType)}});let o=r/Math.max(n,1);o>.1||a>.1?this._audioQuality=1:o>.03||a>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var ue=t=>class extends t{_cleanupSIPUA(){if(this._sipRoomMedia?.close(),this._sipRoomMedia=null,this._sipRoomMediaGeneration=(this._sipRoomMediaGeneration||0)+1,this._roomVideoError="",this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null,this._sipAudioStream=null}_attachSIPAudio(e,i){if(!this._sipRoomMedia){this._attachRemoteAudio(e,i);return}let s=e?.getAudioTracks?.()||[];if(i?.kind==="audio"&&!s.includes(i)&&s.push(i),!!s.length){this._sipAudioStream||=new MediaStream;for(let a of s)this._sipAudioStream.getAudioTracks().includes(a)||this._sipAudioStream.addTrack(a);this._attachRemoteAudio(this._sipAudioStream)}}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e||!this._initiatedHere&&!this._answeredByMe&&!this._answerPendingCallId)return;if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._mediaDeviceError="",this._actionError="",this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let i,s;try{[{MinimalSIPUA:i},s]=await Promise.all([import("./sip-ua-JV7WWI3T.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._mediaDeviceError="The media connection failed. Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let a=s?.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:a.enabled,ws_url:a.ws_url,username:a.username,domain:a.domain})),!a.enabled||!a.ws_url||!a.username||!a.password){this._mediaDeviceError="The media connection failed. "+(a.reason||this._webrtcConfigError||"Phone audio configuration is incomplete. Check the addon connection and retry."),this._render(),this._pendingSIPBridgeId=null;return}let r="sip:"+a.username+"@"+a.domain,n=new i({uri:r,captureMedia:()=>this._captureMedia(!1),password:a.password,wsUrl:a.ws_url,iceServers:s.ice_servers||w,onAudioTrack:(o,d)=>{this._sipUA===n&&this._attachSIPAudio(o,d)},onRegistered:()=>{this._sipUA===n&&(n._activeBridge=e,this._pendingSIPBridgeId=null,n.dial(e).catch(o=>{this._sipUA===n&&(console.error("Simson SIP dial error:",o),this._mediaDeviceError="The media connection failed. "+(o?.message||"Could not join the SIP media bridge. Please retry."),this._cleanupSIPUA(),this._render())}))},onError:o=>{this._sipUA===n&&(this._mediaDeviceError="The media connection failed. "+(o?.message||"Phone audio is unavailable; retry the media connection."),console.error("Simson SIP UA error:",o),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render())},onBye:()=>{this._sipUA===n&&(this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render())}});this._sipUA=n,n.connect(),this._startSIPRoomMedia(n,s.ice_servers||w)}async _startSIPRoomMedia(e,i){let s=this._sipRoomMediaGeneration=(this._sipRoomMediaGeneration||0)+1;try{let[{SipRoomMedia:a},{roomMediaContext:r}]=await Promise.all([import("./sip-room-media-5SE27RRJ.js"),import("./room-display-relay-LOUXGZWJ.js")]);for(let n=0;n<30;n++){if(this._sipUA!==e||s!==this._sipRoomMediaGeneration)return;if(!this._answeredByMe){await new Promise(d=>setTimeout(d,500));continue}let o=await r(this);if(this._sipUA!==e||s!==this._sipRoomMediaGeneration)return;if(o.media_role==="sip_caregiver"){this._sipRoomMedia?.close(),this._sipRoomMedia=new a(this,o,i),this._sipRoomMedia.start(),this._render();return}if(o.media_role)return;await new Promise(d=>setTimeout(d,500))}this._sipUA===e&&s===this._sipRoomMediaGeneration&&(this._roomVideoError="Room video authorization is not available yet. Retry video without ending the audio call.",this._render())}catch{this._sipUA===e&&s===this._sipRoomMediaGeneration&&(this._roomVideoError="Room video could not be loaded. Phone audio is independent.",this._render())}}};var he=t=>class extends t{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let i=e.createOscillator(),s=e.createGain();i.connect(s),s.connect(e.destination),i.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),i.start(e.currentTime),i.stop(e.currentTime+.4),setTimeout(()=>{let a=e.createOscillator(),r=e.createGain();a.connect(r),r.connect(e.destination),a.frequency.value=480,r.gain.setValueAtTime(.15,e.currentTime),r.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),a.start(e.currentTime),a.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,i){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${i} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var pe=t=>class extends t{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let i=Math.round(e);if(i<60)return`${i}s`;let s=Math.floor(i/60),a=i%60;return s<60?`${s}m ${a}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let i=new Date(e*1e3),s=new Date,a=i.toDateString()===s.toDateString(),r=new Date(s);r.setDate(r.getDate()-1);let n=i.toDateString()===r.toDateString(),o=i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return a?o:n?`Yesterday ${o}`:i.toLocaleDateString([],{month:"short",day:"numeric"})+" "+o}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let i=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(i/60)).padStart(2,"0"),a=String(i%60).padStart(2,"0");e.textContent=`${s}:${a}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function me(){let t=this._nodeId(),e=this._isConnected(),i=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",a=this._activeCallAttr("direction",""),r=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<45e3,n=r?"outgoing":a,o=this._hass?.user?.id||"",d=this._activeCallAttr("target_user_id",""),l=this._activeCallAttr("caller_user_id",""),u=this._activeCallAttr("answered_by_user_id",""),_=!this._endedCallIds?.has(s)&&x({call_id:s,direction:a,state:i,target_user_id:d,caller_user_id:l,answered_by_user_id:u},o,this._currentCallId),f=["incoming","requesting","ringing","active"],m=r&&(!_||!f.includes(i)),h=m?"requesting":_&&f.includes(i)&&s?m?"requesting":i:"idle";h==="ringing"&&n==="incoming"&&!this._isCaller&&(h="incoming");let g=h==="idle"||h==="unknown",v=h==="incoming"&&n!=="outgoing"&&!this._isCaller,C=h==="requesting"||h==="ringing",K=h==="active",Le=h==="missed",Oe=h==="declined",Be=h==="timeout",J=v||C||K,He=!!this._pc,A=this._activeCallAttr("call_type",""),X=this._activeCallAttr("sip_bridge_id",""),Z=this._initiatedHere&&this._currentRemoteLabel||m&&String(this._currentRemoteNode||"").replace(/^phone:/,"")||this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||String(this._currentRemoteNode||"").replace(/^phone:/,"")||(n==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&_&&(this._currentCallId=s),J&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let L=this._prevCallState;if(L!==h)if(this._prevCallState=h,h==="incoming")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentCallType=A||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=Z,this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(h==="active"&&L!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentCallType=A||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),X&&(this._sipBridgeId=X),this._isCaller=n==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let T=Number(this._activeCallAttr("started_at",0));this._callStart=T>0?T*1e3:Date.now()}let O=A==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:"),ee=this._initiatedHere||this._answeredByMe||this._answerPendingCallId===s;O&&ee?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(T=>console.error("[Simson] SIP state active start:",T)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):!O&&ee&&this._startWebRTC()}else h==="idle"&&L!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC({endCall:!0}),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));C&&_&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let Pe=_?s:m&&!this._endedCallIds?.has(this._currentCallId)&&this._currentCallId||"";return{nodeId:t,connected:e,direction:n,isIdle:g,isIncoming:v,isRinging:C,isActive:K,hasCall:J,activeCallType:A,remoteLabel:Z,callId:Pe}}var Re=pe(he(ue(_e(ce(le(oe($))))))),k=class extends Re{views=new Set;set hass(e){let i=this._hass;i?.user?.id&&i.user.id!==e?.user?.id&&(this._cleanupWebRTC(),this._cleanupSIPUA(),this._clearLocalCallState(),this._webrtcConfig=null,this._webrtcConfigCallId=null),i?.connection&&i.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=["connection","call_state","active_call","calls_count"],a=Object.keys(e?.states||{}).filter(n=>e.states[n].attributes?.simson_contact);(!i||i.user?.id!==e?.user?.id||a.some(n=>i.states?.[n]!==e.states[n])||s.some(n=>P(i,this._config,this._detectedNodeId,n)!==this._entity(n)))&&this.requestUpdate()}_connectHA(){if(this._hass){if(this._hass.user?.id){let e=new URL(window.location.href),i=e.searchParams.get("simson_node");if(!i||i===this._nodeId()){let s=e.searchParams.get("simson_action"),a=e.searchParams.get("simson_call");if(a&&["answer","decline","hangup"].includes(s)){for(let n of["simson_action","simson_call","simson_node"])e.searchParams.delete(n);window.history.replaceState(window.history.state,"",e),s==="answer"?this._answer(a):this._runAction(s==="decline"?"Declining call\u2026":"Ending call\u2026",()=>this._callService(s==="decline"?"reject_call":"hangup_call",{call_id:a,...s==="decline"?{reason:"declined_from_notification"}:{}}))}let r=e.searchParams.get("simson_answer");r&&(this._answerPendingCallId=r,this._currentCallId=r,e.searchParams.delete("simson_answer"),e.searchParams.delete("simson_node"),window.history.replaceState(window.history.state,"",e))}}this._haEventSubscribed||this._subscribeHAEvents(),!this._webrtcConfig&&!this._webrtcConfigPromise&&this._fetchWebRTCConfig(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets(),this._loadPeople()}}connectedCallback(){super.connectedCallback(),this._foregroundRecovery=()=>{if(!(document.visibilityState==="hidden"||!this.isConnected)){this._render();for(let e of this.views)this._viewHost=e,this._attachMediaElements(),e.requestUpdate();this._sipUA&&this._answeredByMe&&!this._sipRoomMedia&&this._startSIPRoomMedia(this._sipUA,this._webrtcConfig?.ice_servers||[])}},document.addEventListener("visibilitychange",this._foregroundRecovery),window.addEventListener("pageshow",this._foregroundRecovery),this._connectHA(),this._mediaDevicesLoaded||this._refreshMediaDevices(!1),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._foregroundRecovery),window.removeEventListener("pageshow",this._foregroundRecovery),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),clearTimeout(this._outgoingUiTimer),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?me.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return p}};customElements.get("simson-call-session")||customElements.define("simson-call-session",k);var fe=new WeakMap;function ge(t,e,i){let s=e.connection||e,a=fe.get(s);a||fe.set(s,a=new Map);let n=i.node_id||e.states?.[i.entity]?.attributes?.node_id||[i.connection_entity,i.call_state_entity,i.calls_count_entity].map(u=>u?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(u=>u.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",o=I(e,{...i,node_id:n}),d=`${e.user?.id||""}:${o}`,l=a.get(d);if(l||(l=new k,l.hidden=!0,l.setConfig({...i,node_id:o}),l.hass=e,l._release=()=>a.delete(d),a.set(d,l),document.body.append(l)),clearTimeout(l._releaseTimer),!l.views.has(t)||t._sessionConfig!==i){l.views.add(t),t._sessionConfig=i;let u=l._config,_=[...l.views].flatMap(f=>{let m=f._config.target_nodes;return Array.isArray(m)?m:m?[m]:[]});l.setConfig({...u,...i,node_id:o,target_nodes:_}),i.view==="history"&&l._loadHistory(),i.view==="devices"&&l._refreshMediaDevices(!1)}return l}function z(t,e){t.views.delete(e),t.views.size||(t._releaseTimer=setTimeout(()=>{t.views.size||(t.remove(),t._release())},0))}var ve={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},be=t=>(...e)=>({_$litDirective$:t,values:e}),E=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,s){this._$Ct=e,this._$AM=i,this._$Ci=s}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}};var{I:Ee}=se,ye=t=>t;var we=()=>document.createComment(""),S=(t,e,i)=>{let s=t._$AA.parentNode,a=e===void 0?t._$AB:e._$AA;if(i===void 0){let r=s.insertBefore(we(),a),n=s.insertBefore(we(),a);i=new Ee(r,n,t,t.options)}else{let r=i._$AB.nextSibling,n=i._$AM,o=n!==t;if(o){let d;i._$AQ?.(t),i._$AM=t,i._$AP!==void 0&&(d=t._$AU)!==n._$AU&&i._$AP(d)}if(r!==a||o){let d=i._$AA;for(;d!==r;){let l=ye(d).nextSibling;ye(s).insertBefore(d,a),d=l}}}return i},y=(t,e,i=t)=>(t._$AI(e,i),t),De={},Ce=(t,e=De)=>t._$AH=e,xe=t=>t._$AH,D=t=>{t._$AR(),t._$AA.remove()};var Se=(t,e,i)=>{let s=new Map;for(let a=e;a<=i;a++)s.set(t[a],a);return s},M=be(class extends E{constructor(t){if(super(t),t.type!==ve.CHILD)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let s;i===void 0?i=e:e!==void 0&&(s=e);let a=[],r=[],n=0;for(let o of t)a[n]=s?s(o,n):n,r[n]=i(o,n),n++;return{values:r,keys:a}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,s]){let a=xe(t),{values:r,keys:n}=this.dt(e,i,s);if(!Array.isArray(a))return this.ut=n,r;let o=this.ut??=[],d=[],l,u,_=0,f=a.length-1,m=0,h=r.length-1;for(;_<=f&&m<=h;)if(a[_]===null)_++;else if(a[f]===null)f--;else if(o[_]===n[m])d[m]=y(a[_],r[m]),_++,m++;else if(o[f]===n[h])d[h]=y(a[f],r[h]),f--,h--;else if(o[_]===n[h])d[h]=y(a[_],r[h]),S(t,d[h+1],a[_]),_++,h--;else if(o[f]===n[m])d[m]=y(a[f],r[m]),S(t,a[_],a[f]),f--,m++;else if(l===void 0&&(l=Se(n,m,h),u=Se(o,_,f)),l.has(o[_]))if(l.has(o[f])){let g=u.get(n[m]),v=g!==void 0?a[g]:null;if(v===null){let C=S(t,a[_]);y(C,r[m]),d[m]=C}else d[m]=y(v,r[m]),S(t,a[_],v),a[g]=null;m++}else D(a[f]),f--;else D(a[_]),_++;for(;m<=h;){let g=S(t,d[h+1]);y(g,r[m]),d[m++]=g}for(;_<=f;){let g=a[_++];g!==null&&D(g)}return this.ut=n,Ce(t,d),ie}});function Me(t){let e=new Map;for(let[i,s]of Object.entries(t._hass?.states||{})){let a=s.attributes||{};a.simson_contact&&!a.simson_call_button&&a.node_id===t._nodeId()&&s.state!=="unavailable"&&e.set(a.user_id,{user_id:a.user_id,user_name:a.user_name||"User",entity_id:i,state:s.state})}for(let i of t._localUsers||[]){let s=e.get(i.user_id);e.set(i.user_id,{...s,...i,state:s?.state||i.state,entity_id:i.entity_id||s?.entity_id||""})}return[...e.values()].filter(i=>i.user_id&&i.user_id!==t._hass?.user?.id).sort((i,s)=>i.user_name.localeCompare(s.user_name,void 0,{numeric:!0,sensitivity:"base"}))}function q(t,e=0,i=6){let s=Math.max(1,Math.ceil(t.length/i)),a=Math.max(0,Math.min(e,s-1));return{items:t.slice(a*i,(a+1)*i),current:a,pages:s,total:t.length}}function W(t,e,i){return t.pages>1?c`<nav class="list-pager" aria-label=${e}>
    <span aria-live="polite">${t.current+1} / ${t.pages} · ${t.total} total</span>
    <button aria-label=${"Previous "+e} ?disabled=${t.current===0} @click=${()=>i(t.current-1)}>Previous</button>
    <button aria-label=${"Next "+e} ?disabled=${t.current===t.pages-1} @click=${()=>i(t.current+1)}>Next</button>
  </nav>`:p}function Ie(t,e,i){let s=Me(t),a=t._directoryTab==="devices",r=String(t._directorySearch||"").trim().toLowerCase(),n=(a?e:s).filter(l=>[l.user_name,l.label,l.user_id,l.extension,l.id].some(u=>String(u||"").toLowerCase().includes(r))),o=q(n,t._directoryPage),d=l=>{t._directoryPage=l,t.requestUpdate()};return c`<section class="directory-workspace">
    <div class="section-heading"><h3>${a?"Quick connections":"People at this site"}</h3><button class="text-button" aria-label="Refresh people" ?disabled=${t._peopleLoading} @click=${()=>t._loadPeople(!0)}>${t._peopleLoading?"Updating\u2026":"Refresh"}</button></div>
    <div class="directory-toolbar"><div class="route-options" aria-label="Directory">
      <button class=${a?"":"selected"} aria-pressed=${!a} @click=${()=>{t._directoryTab="people",d(0)}}>People · ${s.length}</button>
      <button class=${a?"selected":""} aria-pressed=${a} @click=${()=>{t._directoryTab="devices",d(0)}}>Devices · ${e.length}</button>
    </div><input aria-label="Search contacts and devices" placeholder="Search name or extension" .value=${t._directorySearch||""} @input=${l=>{t._directorySearch=l.target.value,d(0)}}></div>
    ${t._peopleError&&!a?c`<p class="fine-print" role="status">${t._peopleError}</p>`:p}
    ${n.length?c`<div class="contacts compact-contacts">${M(o.items,l=>l.user_id||l.id,l=>c`
      <button class="contact" ?disabled=${!i||!!t._actionPending||!a&&l.state!=="ready"} @click=${()=>t._runAction("directory:"+(l.user_id||l.id),()=>a?(l.type||"node")==="node"?(t._userPickerNodeId=l.node_id||l.id,t._userPickerTargetId=l.id,t._callService("get_remote_users",{node_id:t._userPickerNodeId})):t._dialTarget(l.id,l.type,l.node_id):t._callDirectoryUser(l))}><span class="avatar">${String(l.user_name||l.label||l.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${l.user_name||l.label||l.id}</b><small>${a?l.type==="node"?"Home Assistant":l.trunk?"Gateway \xB7 "+l.trunk:"SIP \xB7 "+(l.extension||l.id):l.state==="ready"?"Available to call":"Busy"}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:c`<div class="empty compact">${r?"No matching contacts.":a?"No saved devices. Dial an extension above.":t._peopleLoading?"Loading people\u2026":"No other active HA users at this site."}</div>`}
    ${W(o,"contacts page",d)}
  </section>`}function j(t,e){let i=t._smartDialRoute(t._nodeInputDraft),s=[...t._targets];for(let n of t._config.target_nodes||[])s.some(o=>(o.node_id||o.id)===n)||s.push({id:n,node_id:n,label:n,type:"node"});let a=e.connected&&!e.hasCall,r=()=>a&&t._runAction("dial",()=>t._dialSmartValue(t._nodeInputDraft,t._pstnTrunkDraft));return c`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>Call a person, a room, or an outside number.</p></div>
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([n,o])=>c`<button class=${t._smartRouteMode===n?"selected":""} aria-pressed=${t._smartRouteMode===n} @click=${()=>{t._smartRouteMode=n,t.requestUpdate()}}>${o}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${t._nodeInputDraft} placeholder="Enter extension, number or node" @input=${n=>{t._nodeInputDraft=n.target.value,t.requestUpdate()}} @keydown=${n=>{n.key==="Enter"&&r()}}><button class="primary" aria-label="Place call" ?disabled=${!a||!!t._actionPending||!t._nodeInputDraft.trim()} @click=${r}>Call ↗</button></div></label>
    <div class="route-hint"><span>${i.label}</span><small>${i.hint}</small></div>
    ${i.kind==="pstn"?c`<label class="field"><span>Gateway trunk</span><input .value=${t._pstnTrunkDraft||t._effectivePstnTrunk()} placeholder="Site default" @input=${n=>{t._pstnTrunkDraft=n.target.value}}></label>`:p}
    ${Ie(t,s,a)}
    <details class="call-preferences"><summary>Call preferences · ${t._videoEnabled?"Camera enabled":"Audio first"}</summary>
      <label class="toggle node-video-toggle"><span><b>Share camera on user calls</b><small>Door-phone RTSP video is separate from your camera and SIP audio.</small></span><input type="checkbox" .checked=${t._videoEnabled} @change=${n=>{t._videoEnabled=n.target.checked,t._saveMediaPreferences(),t.requestUpdate(),t._videoEnabled&&t._refreshMediaDevices(!0)}}></label>
      ${t._videoEnabled&&t._turnAvailable===!1?c`<div class="notice" role="status">No TURN relay is configured. Mobile or restrictive networks may need a relay.</div>`:p}
      ${t._videoEnabled&&!globalThis.isSecureContext?c`<div class="notice error">Camera and microphone access require HTTPS.</div>`:p}
      <button class="text-button" @click=${()=>t._selectTab("media")}>Camera, microphone & sound settings →</button>
    </details>
  </section>`}function Ne(t,e){return t.iceGatheringState==="complete"?Promise.resolve():new Promise(i=>{let s=()=>{clearTimeout(r),t.removeEventListener("icegatheringstatechange",a),e.removeEventListener("abort",s),i()},a=()=>{t.iceGatheringState==="complete"&&s()},r=setTimeout(s,8e3);t.addEventListener("icegatheringstatechange",a),e.addEventListener("abort",s,{once:!0})})}var G=class extends b{static properties={hass:{attribute:!1},nodeId:{},extension:{},callId:{},active:{type:Boolean},iceServers:{attribute:!1},status:{state:!0},error:{state:!0}};createRenderRoot(){return this}updated(){let e=`${this.nodeId}:${this.extension}:${this.callId}:${!!this.active}`;e!==this._key&&(this._key=e,this.stop(),this.active&&this.callId&&this.connect())}disconnectedCallback(){this.stop(),super.disconnectedCallback()}stop(){this._generation=(this._generation||0)+1,this._abort?.abort(),clearTimeout(this._watchdog),this._peer?.close(),this._peer=null,this._stream?.getTracks().forEach(i=>i.stop()),this._stream=null;let e=this.querySelector("video");e&&(e.pause(),e.srcObject=null),this.status="idle",this.error=""}async connect(){let e=this._generation;this.status="connecting",this.error="",this._abort=new AbortController;let i=this._peer=new RTCPeerConnection({iceServers:this.iceServers||[]});i.addTransceiver("video",{direction:"recvonly"}),i.ontrack=async s=>{if(e!==this._generation||s.track.kind!=="video")return;this._stream=s.streams[0]||new MediaStream([s.track]),await this.updateComplete;let a=this.querySelector("video");if(!a||e!==this._generation)return;a.srcObject=this._stream;let r=()=>{e===this._generation&&a.videoWidth>0&&(this.status="live",clearTimeout(this._watchdog))};a.onloadeddata=r,a.requestVideoFrameCallback?.(r);try{await a.play()}catch{this.status="playback"}},i.onconnectionstatechange=()=>{e===this._generation&&i.connectionState==="failed"&&(this.status="error",this.error="Video connection failed. Check the bridge ICE/TURN configuration.")};try{if(await i.setLocalDescription(await i.createOffer()),await Ne(i,this._abort.signal),e!==this._generation)return;let s,a;try{a=await Promise.race([this.hass.callApi("POST","simson/video/offer",{node_id:this.nodeId,extension:this.extension,call_id:this.callId,sdp:i.localDescription.sdp}),new Promise((r,n)=>{s=setTimeout(()=>n(Error("Video bridge timed out")),16e3)})])}finally{clearTimeout(s)}if(e!==this._generation)return;await i.setRemoteDescription({type:"answer",sdp:a.sdp}),this.status!=="live"&&(this._watchdog=setTimeout(()=>{e===this._generation&&this.status!=="live"&&(this.status="error",this.error="No video frames received. Check that the named RTSP stream supplies browser-compatible H.264.")},12e3))}catch{if(e!==this._generation)return;i.close(),this.status="error",this.error="Live video could not connect. Check the linked stream and active-call permissions."}}render(){return c`<div class="video-stage linked-door-video">
    <video autoplay muted playsinline></video>
    <span class="live-label">${this.status==="live"?"LIVE VIDEO":"RTSP \xB7 VIDEO ONLY"}</span>
    ${this.status!=="live"?c`<div class="stream-feedback" role="status"><b>${this.status==="error"?"Video unavailable":this.status==="idle"?"Video is stopped":this.status==="playback"?"Tap to play video":"Connecting door video\u2026"}</b><small>${this.error||"SIP audio stays connected independently."}</small>
      ${["error","playback"].includes(this.status)?c`<button @click=${()=>{if(this.status==="playback"){let e=this.querySelector("video");e?.play().then(()=>{e.videoWidth>0&&(this.status="live")}).catch(()=>{})}else this.stop(),this.connect()}}>${this.status==="playback"?"Play video":"Retry video"}</button>`:c``}</div>`:c``}
  </div>`}};customElements.get("simson-door-stream")||customElements.define("simson-door-stream",G);function N(t,e){let i=!!t._localStream?.getVideoTracks().length,s=!!(t._remoteVideoReady&&t._remoteStream?.getVideoTracks().some(h=>h.readyState==="live"&&!h.muted)),a=e.isActive&&(i||!!t._remoteStream?.getVideoTracks().length),r=e.activeCallType==="sip"||t._currentCallType==="sip",n=r?t._sipUA?._pc?.connectionState==="connected":t._pc?.connectionState==="connected",o=["video","webrtc-video"].includes(t._incomingCallType||e.activeCallType),d=t._mediaDeviceError?.startsWith("The media connection failed."),l=e.isActive?d?"Media connection failed":n?"Connected":"Connecting media\u2026":e.isIncoming?o?"Incoming video call":"Would like to talk to you":e.callId?"Ringing \xB7 Waiting for an answer\u2026":"Sending your call request to the node\u2026",u=(h,g)=>()=>t._runAction(h,g),_=String(t._activeCallAttr("target_extension")||t._activeCallAttr("remote_node_id")||t._currentRemoteNode||"").replace(/^sip:/,""),f=r&&!t._sipRoomMedia&&(t._videoProfiles||[]).some(h=>h.extension===_),m=t._initiatedHere||t._answeredByMe||t._answerPendingCallId===e.callId;return c`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":e.callId?"CALLING":"STARTING YOUR CALL"}</span>
    ${f&&e.isActive?c`<simson-door-stream .hass=${t._hass} .nodeId=${t._nodeId()} .extension=${_} .callId=${e.callId} .active=${!!m} .iceServers=${t._webrtcConfig?.ice_servers||[]}></simson-door-stream>`:a?c`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?p:c`<span class="video-wait">Camera video has not arrived yet.${r?" SIP audio remains connected. RTSP is optional, not required for SIP video.":""}</span>`}${i?c`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:p}<span class="live-label">${s?"LIVE":"WAITING FOR VIDEO"}</span></div>`:c`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption" role="status">${l} <span id="call-timer"></span></p>
    ${!e.isActive&&!e.isIncoming?c`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${e.callId?"The destination is being called":"Connecting to your call service"}</b><small>${e.callId?"You can stay here while the other phone rings.":"This card will update as soon as the node responds."}</small></span></div>`:p}
    ${t._micAllowed===!1?c`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:p}
    ${t._mediaDeviceError?c`<div class="notice error" role="status">${t._mediaDeviceError}</div>`:p}
    ${t._roomVideoError?c`<div class="notice error" role="status">${t._roomVideoError}<button @click=${u("retry-room-video",()=>t._sipRoomMedia?t._sipRoomMedia.resume():t._sipUA&&t._startSIPRoomMedia(t._sipUA,t._webrtcConfig?.ice_servers||[]))}>Retry room video</button></div>`:p}
    ${e.isActive&&t._playbackBlocked?c`<button class="primary" @click=${u("enable-sound",async()=>{await t._remoteAudio.play(),t._playbackBlocked=!1,t._render()})}>Enable call sound</button>`:p}
    ${e.isActive&&d&&(t._initiatedHere||t._answeredByMe)?c`<button class="primary" @click=${u("retry-media",()=>(t._webrtcConfig=null,t._webrtcConfigNextRetryAt=0,r?t._startSIPCall(t._sipBridgeId||e.activeSipBridgeId):t._startWebRTC()))}>Retry media connection</button>`:p}
    ${t._isCaller&&!t._initiatedHere&&!r?c`<div class="browser-join"><p>This call was started by a script or another dashboard. Choose this browser to use its microphone and camera.</p><button class="primary" @click=${u("join-browser",()=>t._joinUserCall())}>Use this browser for audio${t._currentCallType==="video"?" & video":""}</button></div>`:p}
    <div class="call-actions">
      ${e.isIncoming?c`<button class="primary" ?disabled=${!!t._actionPending} @click=${u("answer",()=>t._answer())}>Answer</button><button class="danger" ?disabled=${!!t._actionPending} @click=${u("reject",()=>t._reject())}>Decline</button>`:c`
        <button aria-pressed=${t._muted} ?disabled=${!e.isActive} @click=${u("mute",()=>t._toggleMute())}>${t._muted?"Unmute":"Mute"}</button>
        ${i?c`<button aria-pressed=${t._cameraMuted} @click=${u("camera",()=>t._toggleCamera())}>${t._cameraMuted?"Camera on":"Camera off"}</button>`:p}
        ${e.isActive&&!i&&(t._sipRoomMedia||!r&&t._pc)?c`<button @click=${u("enable-camera",()=>t._enableCamera())}>Enable camera</button>`:p}
        <button class="danger" ?disabled=${!e.callId||!!t._actionPending} @click=${u("hangup",()=>t._hangup())}>${e.callId?"End call":"Starting\u2026"}</button>
      `}
    </div>
    ${e.isActive&&(t._sipBridgeId||e.activeCallType==="sip")?c`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${t._transferNodeDraft} @input=${h=>{t._transferNodeDraft=h.target.value,t.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!t._transferNodeDraft.trim()} @click=${u("transfer-node",()=>t._transferCall(t._transferNodeDraft))}>To node</button><button ?disabled=${!t._transferNodeDraft.trim()} @click=${u("transfer-sip",()=>t._transferCall("sip:"+t._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!t._transferNodeDraft.trim()} @click=${()=>t._loadTransferUsers(t._transferNodeDraft)}>Choose user</button></div>${t._transferUsers.map(h=>c`<button class="contact" @click=${u("transfer-user:"+h.user_id,()=>t._transferCall(t._transferUsersNode,h.user_id,h.user_name))}>${h.user_name}</button>`)}</details>`:p}
  </section>`}function F(t){let e=String(t._historySearch||"").toLowerCase().trim(),i=t._history.filter(r=>(!t._historyFilter||t._historyFilter==="all"||t._historyFilter==="missed"&&["missed","failed","declined","timeout"].includes(r.state)||r.direction===t._historyFilter)&&[r.remote_label,r.remote_node_id,r.state].some(n=>String(n||"").toLowerCase().includes(e))),s=q(i,t._historyPage),a=r=>{t._historyPage=r,t.requestUpdate()};return c`<section class="history-workspace"><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>t._loadHistory()}>Refresh</button></div>
    <div class="directory-toolbar"><input aria-label="Search call history" placeholder="Search calls" .value=${t._historySearch||""} @input=${r=>{t._historySearch=r.target.value,a(0)}}>
      <select aria-label="Filter call history" .value=${t._historyFilter||"all"} @change=${r=>{t._historyFilter=r.target.value,a(0)}}>${[["all","All calls"],["incoming","Incoming"],["outgoing","Outgoing"],["missed","Missed & failed"]].map(([r,n])=>c`<option value=${r}>${n}</option>`)}</select></div>
    ${s.total?c`<div class="history">${M(s.items,(r,n)=>r.call_id||n,r=>c`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(r.state)?"missed":""}">${r.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${r.remote_label||r.remote_node_id||"Unknown caller"}</b><small>${r.state} · ${t._formatDuration(r.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{t._nodeInputDraft=String(r.remote_node_id||"").replace(/^(sip:|phone:)/,""),t._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:c`<div class="empty compact">${t._historyLoaded?"No calls match this view.":"Loading recent calls\u2026"}</div>`}
    ${W(s,"history page",a)}</section>`}function U(t){let e=Object.entries(t._hass?.states||{}).find(([,a])=>a.attributes?.simson_contact&&!a.attributes.simson_call_button&&a.attributes.node_id===t._nodeId()&&a.attributes.user_id===t._hass?.user?.id)?.[0],i=t._mediaDevices,s=(a,r,n)=>c`<label class="field"><span>${a}</span><select .value=${t[n]} @change=${o=>{t[n]=o.target.value,t._saveMediaPreferences(),n==="_selectedAudioOutput"&&t._applyAudioOutput(),t._mediaPreviewStream&&t._startMediaPreview(),t.requestUpdate()}}><option value="">System default</option>${r.map((o,d)=>c`<option value=${o.deviceId}>${o.label||a+" "+(d+1)}</option>`)}</select></label>`;return c`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>t._runAction("detect",()=>t._refreshMediaDevices(!0))}>Detect</button></div>
    ${t._mediaDeviceError?c`<div class="notice error" role="alert">${t._mediaDeviceError}</div>`:p}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${t._mediaPreviewStream?.getVideoTracks().length?p:c`<div class="preview-empty"><b>${t._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${t._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Turn on once to grant camera access before a call</small></span><input type="checkbox" .checked=${t._videoEnabled} @change=${a=>{t._videoEnabled=a.target.checked,t._saveMediaPreferences(),t._mediaPreviewStream?t._startMediaPreview():t._videoEnabled&&t._refreshMediaDevices(!0),t.requestUpdate()}}></label>
    <div class="device-grid">${s("Microphone",i.audioInputs,"_selectedAudioInput")}${s("Camera",i.videoInputs,"_selectedVideoInput")}${s("Speaker",i.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>t._runAction("preview",()=>t._startMediaPreview())}>${t._mediaPreviewStream?"Restart preview":"Test devices"}</button>${t._mediaPreviewStream?c`<button @click=${()=>t._stopMediaPreview()}>Stop preview</button>`:p}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${t._notifPermission==="default"?c`<button class="text-button" @click=${()=>t._requestNotificationPermission()}>Enable incoming-call notifications</button>`:p}
    ${e?c`<button class="text-button" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("notification-test",()=>t._callService("test_user_notification",{entity_id:e}))}>Send a test to my Companion phone</button><p class="fine-print">Registered phones are matched to your HA user. Notification permissions must also be enabled on the phone.</p>`:p}
  </section>`}function ke(t){if(!t._pickerOpen&&!t._showPopup&&!(t._showCallDialog&&t._view?.hasCall))return p;let e=t._pickerOpen,i=!e&&!t._showPopup&&t._showCallDialog,s=n=>{let o=t._userPickerNodeId;t._removeUserPicker(),t._runAction("call-user",()=>t._dial(o,n?.user_id,n?.user_name))},a=n=>{if(n.key==="Escape"&&(e?t._removeUserPicker():i&&(t._showCallDialog=!1,t._render())),n.key!=="Tab")return;let o=[...n.currentTarget.querySelectorAll("button:not(:disabled), input:not(:disabled), summary")],d=o[0],l=o.at(-1),u=n.currentTarget.getRootNode().activeElement;n.shiftKey&&u===d?(n.preventDefault(),l?.focus()):!n.shiftKey&&u===l&&(n.preventDefault(),d?.focus())},r=n=>{n.preventDefault(),e?t._removeUserPicker():i&&(t._showCallDialog=!1,t._render())};return i?c`<dialog class="dialog-scrim" aria-label="Your call" @cancel=${r}><section class="dialog call-dialog" @keydown=${a}>
    <div class="dialog-heading"><span class="eyebrow">YOUR PRIVATE CALL</span><button class="text-button" @click=${()=>{t._showCallDialog=!1,t._render()}}>Minimize</button></div>
    ${t._actionError?c`<div class="notice error" role="alert">${t._actionError}</div>`:p}
    ${N(t,t._view)}
  </section></dialog>`:c`<dialog class="dialog-scrim" aria-label=${e?"Choose call recipient":"Incoming call"} @cancel=${r}><section class="dialog" @keydown=${a}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?t._userPickerNodeId:t._incomingFrom}</h2>
    ${e?c`<div class="dialog-options"><button class="primary" @click=${()=>s(null)}>Call everyone on this node</button>${t._remoteUsers.map(n=>c`<button @click=${()=>s(n)}>${n.user_name||n.user_id}</button>`)}</div><button class="text-button" @click=${()=>t._removeUserPicker()}>Cancel</button>`:c`<p>Would like to talk to you.</p>${t._actionError?c`<div class="notice error" role="alert">${t._actionError}</div>`:p}<div class="call-actions"><button class="primary" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("answer",()=>t._answer())}>Answer</button><button class="danger" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("reject",()=>t._reject())}>Decline</button></div>`}
  </section></dialog>`}var Y=class extends b{static properties={hass:{attribute:!1},entity:{},live:{type:Boolean}};createRenderRoot(){return this}updated(){let e=`${this.entity}:${this.live}:${!!this.hass?.states?.[this.entity]}`;this._key!==e&&(this._key=e,this._load(e)),this._camera&&(this._camera.hass=this.hass)}async _load(e){this._camera=null;let i=this.querySelector(".camera-container");if(i){if(i.replaceChildren(),!this.entity||!this.hass?.states?.[this.entity]){i.textContent="Choose your Home Assistant camera entity in the card editor.";return}try{let a=(await window.loadCardHelpers()).createCardElement({type:"picture-entity",entity:this.entity,camera_view:this.live?"live":"auto",show_name:!1,show_state:!1,tap_action:{action:"none"},hold_action:{action:"none"}});if(this._key!==e||!this.isConnected)return;a.hass=this.hass,this._camera=a,i.replaceChildren(a)}catch{this._key===e&&(i.textContent="Camera could not load. Check its Home Assistant integration.")}}}render(){return c`<div class="camera-container"></div>`}};customElements.get("simson-door-camera")||customElements.define("simson-door-camera",Y);function Ae(t,e,i,s){let a=t._config,r=String(a.extension||"").trim(),n=a.camera_entity||"",o=!!r&&i.hasCall&&(String(e._currentRemoteNode||"")===r||e._activeCallAttr("target_extension")===r||e._activeCallAttr("remote_node_id")===`sip:${r}`);return c`<section class="door-workspace">
    <div class="section-heading"><h2>${a.device_name||"Door phone"}</h2><span>SIP ${r||"not configured"}</span></div>
    ${n&&!o?c`<simson-door-camera .hass=${t._hass} .entity=${n} .live=${t._doorPreview===!0}></simson-door-camera>`:p}
    <p class="fine-print">SIP carries two-way audio and supported door-phone video. A linked RTSP source or HA camera preview is optional, not required.</p>
    ${o?s(e,i):c`<div class="call-actions">
      <button class="primary" ?disabled=${!r||!i.connected||i.hasCall||!!e._actionPending}
        @click=${()=>e._runAction("door:"+r,()=>e._dialSIPExtension(r))}>Call door phone</button>
      <button ?disabled=${!n} aria-pressed=${t._doorPreview===!0}
        @click=${()=>{t._doorPreview=!t._doorPreview,t.requestUpdate()}}>${t._doorPreview?"Stop video":"View live video"}</button>
    </div>`}
    ${r?p:c`<div class="notice">Choose the door phone’s SIP extension in this card’s editor.</div>`}
  </section>`}function Te(t,e,i,s){let a=t._config.entity,r=e._hass?.states?.[a];if(!r?.attributes?.simson_contact||r.attributes.simson_call_button)return c`<div class="empty"><h2>Choose a user</h2><p>Select a Simson user contact sensor in the card editor.</p></div>`;let n=r.attributes.user_name||r.attributes.friendly_name||"User",o=r.attributes.user_id===e._hass?.user?.id,d=r.state==="ready",l=r.attributes.notification;return c`<section class="user-workspace">
    ${i.hasCall?s(e,i):c`<div class="user-profile"><span class="call-avatar">${n.slice(0,2).toUpperCase()}</span><h2>${n}</h2><span class="user-presence ${d?"ready":""}">${o?"This is you":d?"Ready to receive a call":r.state==="unavailable"?"Unavailable":"In a call"}</span></div>
      <p class="fine-print">Calls are private to you and the recipient. They can answer from their dashboard or configured phone notification.</p>
      <div class="user-actions"><button class="primary" ?disabled=${o||!d||!i.connected||!!e._actionPending} @click=${()=>e._runAction("user:"+a,()=>e._callUserEntity(a))}>Call ${n}</button>
        <label class="toggle"><span>Start with video</span><input type="checkbox" .checked=${e._videoEnabled} @change=${u=>{e._videoEnabled=u.target.checked,e._saveMediaPreferences(),e.requestUpdate()}}></label></div>`}
    ${l?.status==="failed"||l?.status==="clear_failed"?c`<div class="notice error" role="status">Phone notification could not be ${l.status==="failed"?"sent":"cleared"}. Dashboard calling remains available; ask the administrator to check the Companion app mapping.</div>`:p}
  </section>`}var $e=`:host {
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
.directory-workspace{border-top:1px solid var(--line);margin-top:20px;padding-top:4px}
.directory-toolbar{display:flex;align-items:center;gap:10px;margin:10px 0 16px;min-width:0}
.directory-toolbar input{min-width:0;width:100%;flex:1;padding:11px 12px;font:inherit;font-size:13px;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-sizing:border-box}
.directory-toolbar select{min-width:0;max-width:45%;padding:11px;font:inherit;font-size:13px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:10px}
.directory-toolbar .route-options{flex:none;gap:4px;margin:0}
.directory-toolbar .route-options button{padding:10px;font-size:12px;white-space:nowrap}
.compact-contacts .contact{padding:12px;gap:10px;min-height:72px}
.compact-contacts .avatar{width:34px;height:34px;border-radius:11px;font-size:12px;flex:none}
.compact-contacts .contact-text b{font-size:13px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.compact-contacts .contact-text small{font-size:11px;margin-top:3px}
.list-pager{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px}
.list-pager span{margin-right:auto;color:var(--muted);font-size:12px}
.list-pager button{padding:8px 11px;min-height:36px;font-size:12px}
@container(max-width:360px){.status{font-size:11px}}
.call-preferences{margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.call-preferences summary{color:var(--muted);font-size:13px;cursor:pointer;padding:6px 0}
.linked-door-video{aspect-ratio:16/10;min-height:200px}
.stream-feedback{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:#0c131be8}
.stream-feedback small{color:var(--muted);max-width:42ch;line-height:1.6}
.stream-feedback button{padding:9px 14px;font-size:13px}
.history-workspace .history-row{padding:12px 0;gap:12px}
.history-workspace .avatar{width:34px;height:34px;font-size:15px;flex:none}
@media(max-width:430px){.directory-toolbar{flex-wrap:wrap}.directory-toolbar input{flex-basis:100%}.contacts.compact-contacts{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.compact-contacts .contact{padding:10px;gap:8px}.compact-contacts .contact>span:last-child{display:none}.list-pager{flex-wrap:wrap}.compact-contacts .avatar{width:28px;height:28px;font-size:11px}}
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
`;var Q=class extends b{static styles=te($e);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession()}_bindSession(){if(!this.isConnected||!this._hass)return;let e=ge(this,this._hass,this._config);this.session!==e&&(this.session&&z(this.session,this),this.session=e,this.requestUpdate()),e.hass=this._hass}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&z(this.session,this),this.session=null}updated(){if(!this.session)return;this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer();let e=this.shadowRoot.querySelector("dialog");e&&!e.open&&e.showModal(),e&&!this._dialogVisible?(this._previousFocus=this.shadowRoot.activeElement,e.querySelector("button:not(:disabled)")?.focus()):!e&&this._dialogVisible&&this._previousFocus?.focus(),this._dialogVisible=!!e}render(){let e=this.session,i=e?._view,s=this._config.view||"combined",a=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices",user:"Call a user"}[s]||"Simson",r=e?._activeTab||"dial",n=e?[...e.views]:[],o=n.find(_=>["dial","combined"].includes(_._config.view||"combined"))||n[0],d=n.find(_=>_._config.view==="live")||o,l=e&&(e._pickerOpen?o===this:d===this),u=(_,f)=>e._showCallDialog&&l?p:N(_,f);return c`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${a}</h1></div><span class="status ${i?.connected?"online":""}"><i></i>${i?.connected?"Connected":"Offline"}</span></header>
      ${i?c`
        ${i.connected?p:c`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?c`<div class="notice error" role="alert">${e._actionError}</div>`:p}
        ${e._actionPending?c`<div class="action-progress" role="status">${e._actionPending}</div>`:p}
        ${s==="dial"&&i.hasCall?c`<div class="current-call-banner" role="status"><span><b>${i.remoteLabel}</b><small>${i.isActive?"Call in progress":i.isIncoming?"Incoming call":"Calling\u2026"}</small></span><button @click=${()=>{e._showCallDialog=!0,e._render()}}>Call controls</button></div>`:p}
        ${s==="user"?Te(this,e,i,u):s==="door"?Ae(this,e,i,u):s==="live"?i.hasCall?u(e,i):c`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?F(e):s==="devices"?U(e):s==="dial"?r==="media"?c`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${U(e)}`:j(e,i):c`
            ${i.hasCall?u(e,i):p}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([_,f])=>c`<button class=${r===_?"selected":""} aria-current=${r===_?"page":"false"} @click=${()=>e._selectTab(_)}>${f}</button>`)}</nav>
            ${r==="history"?F(e):r==="media"?U(e):i.hasCall?c`<p class="fine-print">End the current call before starting another.</p>`:j(e,i)}
          `}
      `:c`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${l?ke(e):p}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${ne}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",Q);export{Q as a};
