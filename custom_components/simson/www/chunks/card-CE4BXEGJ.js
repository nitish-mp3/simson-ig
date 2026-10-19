import{a as ee,c,d as te,e as p,f as ie,g as b}from"./chunk-KLUKP4ZZ.js";import{a as se}from"./chunk-NSQ5CV2I.js";var $=class extends b{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let i=e.node_id||"";if(!i&&e.connection_entity){let n=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);n&&(i=n[1])}if(!i&&e.call_state_entity){let n=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);n&&(i=n[1])}if(!i&&e.calls_count_entity){let n=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);n&&(i=n[1])}let a=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(n=>typeof n=="string"?n:n?.node_id||n?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:i,connection_entity:e.connection_entity,call_state_entity:e.call_state_entity,calls_count_entity:e.calls_count_entity,target_nodes:a,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),a.forEach(n=>{this._usersCache[n]||(this._usersCache[n]={users:[],timestamp:0})}),this._render()}};function C(t,e,i=""){return!t?.call_id||!e?!1:t.local_user_call&&t.caller_user_id===e?!0:t.direction==="outgoing"?t.caller_user_id===e:t.direction!=="incoming"||t.target_user_id&&t.target_user_id!==e||t.answered_by_user_id&&t.answered_by_user_id!==e?!1:t.status==="active"||t.state==="active"?t.answered_by_user_id===e||t.call_id===i:!0}function B(t,e={},i=""){let s=t?.states||{};if(e.connection_entity&&s[e.connection_entity])return s[e.connection_entity];let a=e.node_id||i;if(a){let n=s[`sensor.simson_${a}_connection`];return n||Object.entries(s).find(([r,l])=>/^sensor\.simson_.+_connection$/.test(r)&&l.attributes?.node_id===a)?.[1]}return Object.entries(s).find(([n])=>/^sensor\.simson_.+_connection$/.test(n))?.[1]}function I(t,e={},i=""){return B(t,e,i)?.attributes?.node_id||e.node_id||i||""}function P(t,e,i,s){let a=t?.states||{},n=e?.[`${s}_entity`];if(n&&a[n])return a[n];if(s==="connection")return B(t,e,i);let r=B(t,e,i),d=Object.keys(a).find(_=>a[_]===r)?.replace(/_connection$/,`_${s}`);if(d&&a[d])return a[d];let o=I(t,e,i),h=a[`sensor.simson_${o}_${s}`];return h||Object.entries(a).find(([_,g])=>_.startsWith("sensor.simson_")&&_.endsWith(`_${s}`)&&g.attributes?.node_id===o)?.[1]}async function E(t,e,i=8e3){if(t?.callApi){let n;try{return await Promise.race([t.callApi("GET",e),new Promise((r,l)=>{n=setTimeout(()=>l(Error("Home Assistant request timed out")),i)})])}finally{clearTimeout(n)}}let s=t?.auth?.data?.access_token,a=await fetch("/api/"+e,{headers:s?{Authorization:"Bearer "+s}:{},signal:AbortSignal.timeout(i)});if(!a.ok)throw Error("Home Assistant request failed ("+a.status+")");return a.json()}var ae=t=>class extends t{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let i=e.match(/^sensor\.simson_(.+)_connection$/);if(i){this._detectedNodeId=i[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return I(this._hass,this._config,this._detectedNodeId)}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,i=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"],["simson_user_call_started","_onHAUserCallStarted"]];this._subscriptions=[];for(let[s,a]of i)this._hass.connection.subscribeEvents(n=>{e===this._subscriptionGeneration&&this.isConnected&&this[a](n.data)},s).then(n=>{e!==this._subscriptionGeneration||!this.isConnected?n():this._subscriptions.push(n)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAUserCallStarted(e){if(!e.interactive||e.node_id!==this._nodeId()||!e.call_id||e.caller_user_id!==this._hass?.user?.id||this._endedCallIds?.has(e.call_id)||this._currentCallId&&this._currentCallId!==e.call_id)return;let i=!!this._initiatedHere;this._currentCallId||this._beginOutgoingCall(e.node_id,e.call_type,e.target_user_name),this._initiatedHere=i,this._currentCallId=e.call_id,this._currentRemoteNode=e.node_id,this._currentRemoteLabel=e.target_user_name,this._currentCallType=e.call_type||"voice",this._isCaller=!0,clearTimeout(this._outgoingUiTimer),this._eventCallSnapshot={...e,...this._eventCallSnapshot,call_id:e.call_id,direction:"outgoing",state:this._eventCallSnapshot?.state||"requesting"},i||(this._showCallDialog=!0),this._render()}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(i=>{this._actionError=i?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){if(e.node_id&&e.node_id!==this._nodeId()||this._endedCallIds?.has(e.call_id)&&["requesting","ringing","active"].includes(e.status))return;e.local_user_call&&e.caller_user_id===this._hass?.user?.id&&(e={...e,direction:"outgoing"});let{call_id:i,status:s,direction:a,remote_node_id:n,call_type:r,sip_bridge_id:l,target_user_id:d,caller_user_id:o,answered_by_user_id:h}=e,_=this._hass?.user?.id||"";if(C(e,_,this._currentCallId)&&!(this._currentCallId&&i!==this._currentCallId))if(["requesting","ringing","active"].includes(s)&&(this._eventCallSnapshot={...this._eventCallSnapshot,...e,state:s}),r&&(this._currentCallType=r),clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,(s==="requesting"||s==="ringing")&&a==="outgoing")this._actionError="",this._currentCallId=i||this._currentCallId,this._currentRemoteNode=n||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){this._actionError="",console.log("[Simson] call_status active",{call_id:i,call_type:r,sip_bridge_id:l,direction:a,remote_node_id:n});let m=this._answeredByMe||this._answerPendingCallId===i;if(a==="incoming"&&!m){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:i}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),a==="incoming"&&h&&h!==_){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._render();return}this._currentCallId=i,m&&(this._answeredByMe=!0),this._answerPendingCallId=null,this._currentRemoteNode=n,l&&(this._sipBridgeId=l);let u=r==="sip"||String(n||"").startsWith("sip:")||String(n||"").startsWith("asterisk:");this._isCaller=a==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification();let f=this._initiatedHere||m;u&&f?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(v=>console.error("[Simson] SIP active start:",v)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:i,remote_node_id:n}):!u&&f&&this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&((this._endedCallIds||=new Set).add(i),this._endedCallIds.size>100&&this._endedCallIds.delete(this._endedCallIds.values().next().value),this._eventCallSnapshot=null,this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._initiatedHere=!1,this._showCallDialog=!1,this._actionError=s==="failed"?"The call could not be started. Check the selected gateway or SIP phone.":"",setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){if(e.node_id&&e.node_id!==this._nodeId()||this._endedCallIds?.has(e.call_id))return;let{call_id:i,from_node_id:s,from_label:a,call_type:n,target_user_id:r,metadata:l}=e;if(!this._hass?.user?.id)return;if(r&&this._hass?.user?.id&&r!==this._hass.user.id){this._ignoredCallId=i;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:i,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=i;return}if(!i||this._endedCallIds?.has(i))return;let d=i;if(this._lastIncomingCall===d&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=d,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=i,this._currentCallType=n||"voice",this._eventCallSnapshot={...l,call_id:i,state:"incoming",direction:"incoming",remote_node_id:s,remote_label:a,call_type:n,target_user_id:r},this._currentRemoteNode=s,this._incomingFrom=a||s,this._incomingCallType=n||"voice",this._sipBridgeId=n==="sip"&&l?.sip_bridge_id?l.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===i&&!this._answeredByMe&&!this._answerPendingCallId&&this._callState()!=="active"&&(console.log("[Simson] Incoming call timeout - clearing phantom call",i),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._clearLocalCallState(),this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let i=e.node_id||this._selectedNode;if(i&&(this._usersCache[i]={users:e.users,timestamp:Date.now()}),this._transferLoading&&i===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return P(this._hass,this._config,this._detectedNodeId,e)}_val(e,i="unknown"){return this._entity(e)?.state??i}_attr(e,i,s=null){return this._entity(e)?.attributes?.[i]??s}_effectivePstnTrunk(e=!0){let i=e?String(this._pstnTrunkDraft||"").trim():"";if(i)return i;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let a=this._attr("connection","routing",{})||{},n=String(a.default_gateway_trunk||"").trim();if(n)return n;let r=(this._targets||[]).find(l=>(l.type==="gateway"||l.trunk)&&l.trunk);return r?.trunk?String(r.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._visibleCall()?.state||"idle";return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,i=""){return this._visibleCall()?.[e]??i}_visibleCall(){let e=this._hass?.user?.id||"",i=this._attr("calls_count","active_calls",[])||[],s=this._entity("call_state"),a=[this._eventCallSnapshot,...i,{...s?.attributes,state:s?.state}].filter(r=>r&&!this._endedCallIds?.has(r.call_id)),n=a.find(r=>r.call_id===this._currentCallId&&C(r,e,this._currentCallId))||a.find(r=>C(r,e,this._currentCallId));return n?.local_user_call&&n.caller_user_id===e?{...n,direction:"outgoing",remote_label:n.target_user_name||n.remote_label}:n}_isStaleRingingCall(){let e=Number(this._visibleCall()?.started_at||0);return e?Date.now()-e*1e3>9e4:!1}async _callService(e,i={}){if(this._hass)try{await this._hass.callService("simson",e,i),setTimeout(()=>this._render(),250)}catch(s){return!/may have started|request timed out/i.test(s?.message||"")&&(e==="make_call"||e==="call_user"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadPeople(e=!1){let i=this._nodeId();if(!(!i||this._peopleLoading||!e&&this._peopleAttemptNode===i&&Date.now()-(this._peopleFetchedAt||0)<3e4)){this._peopleLoading=!0,this._peopleAttemptNode=i;try{let s=await E(this._hass,"simson/users?node_id="+encodeURIComponent(i));if(i!==this._nodeId()||s.node_id!==i)return;this._localUsers=s.users||[],this._videoProfiles=s.videophones||[],this._peopleNode=i,this._peopleError=""}catch{this._peopleError="Directory unavailable. Showing available contact entities."}finally{this._peopleFetchedAt=Date.now(),this._peopleLoading=!1,this._render()}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let i=this._usersCache[e];if(i&&Date.now()-i.timestamp<3e3){this._remoteUsers=i.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var ne=t=>class extends t{_beginOutgoingCall(e,i,s=""){this._initiatedHere=!0,this._currentRemoteNode=e||this._currentRemoteNode,this._currentRemoteLabel=s,this._currentCallType=i||"",this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._actionError="",clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=setTimeout(()=>{this._outgoingUiTimer=null,!(!this._isCaller||this._currentCallId||!this._outgoingIntentAt)&&(this._outgoingIntentAt=0,this._isCaller=!1,this._currentCallType="",this._actionError="No call status came back from the node. Check the gateway or SIP phone registration, then retry.",this._render())},45e3),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,i,s=650){let a=String(e||"action"),n=Date.now();if(!this._actionLocks.has(a)&&!(n-(this._lastActionAt[a]||0)<s)){this._lastActionAt[a]=n,this._actionLocks.add(a),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(i())}catch(r){console.error("[Simson] action failed:",a,r),this._actionError=r?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(a),s)}}}_bindAction(e,i,s,a=650){if(!e)return;let n=r=>{r.preventDefault(),r.stopPropagation(),this._runAction(i,s,a)};e.addEventListener("pointerup",n),e.addEventListener("click",n)}_callUserEntity(e){let i=this._hass?.states?.[e];if(i?.attributes?.simson_contact)return this._beginOutgoingCall(i.attributes.node_id,this._videoEnabled?"video":"voice",i.attributes.user_name||"User"),this._callService("call_user",{entity_id:e,call_type:this._videoEnabled?"video":"voice"})}_callDirectoryUser(e){return e.entity_id&&this._hass?.states?.[e.entity_id]?this._callUserEntity(e.entity_id):(this._beginOutgoingCall(this._nodeId(),this._videoEnabled?"video":"voice",e.user_name),this._callService("call_user",{node_id:this._nodeId(),target_user_id:e.user_id,call_type:this._videoEnabled?"video":"voice"}))}_joinUserCall(){if(!this._currentCallId||!this._isCaller)return;this._initiatedHere=!0,this._videoEnabled=this._currentCallType==="video";let e=this._callState()==="active"?this._startWebRTC():void 0;return this._render(),e}_dial(e,i,s){if(!e)return;let a=this._videoEnabled?"video":"voice";this._beginOutgoingCall(e,a,s||"");let n={target_node_id:e,call_type:a,caller_user_id:this._hass?.user?.id||""};return i&&(n.target_user_id=i,n.target_user_name=s||""),this._callService("make_call",n)}_dialTarget(e,i,s){let n=["asterisk","sip","gateway"].includes(i)?"sip":this._videoEnabled?"video":"voice";return this._beginOutgoingCall(s||e,n),this._callService("make_call",{target_id:e,call_type:n,caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let i=this._effectivePstnTrunk();return this._dialPSTNNumber(e,i)}return this._beginOutgoingCall(e,"sip"),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,i=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let n=String(i||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`,"sip"),this._callService("make_call",{phone_number:s,trunk:n,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let i=String(e||"").trim(),s=i.replace(/\D/g,"");return i.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){this._initiatedHere=!1,this._showCallDialog=!1,this._currentCallId&&(this._endedCallIds||=new Set).add(this._currentCallId),this._eventCallSnapshot=null,clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}async _answer(e=this._activeCallAttr("call_id")||this._currentCallId){if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!1,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0;let i=await this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""});if(this._currentCallId===e){if(i===!1){this._answerPendingCallId=null,this._answeredByMe=!1,this._callStart=null,this._callState()==="incoming"&&this._showIncomingPopup(),this._render();return}this._answeredByMe=!0,this._showCallDialog=!0,this._render(),this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(s=>console.error("[Simson] SIP answer start:",s))}}async _reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null);let i=await this._callService("reject_call",{call_id:e,reason:"declined"});if(!(this._currentCallId&&this._currentCallId!==e)){if(i===!1){this._render();return}this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId||(this._currentCallId=e),this._clearLocalCallState()}}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,i="",s=""){let a=this._activeCallAttr("call_id")||this._currentCallId,n=String(e||"").trim();!a||!n||this._callService("transfer_call",{call_id:a,target_node_id:n,target_user_id:i||"",target_user_name:s||""})}_loadTransferUsers(e){let i=String(e||"").trim();if(!i)return;let s=this._usersCache[i];if(this._transferNodeDraft=i,this._transferUsersNode=i,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:i}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._render()}_smartDialRoute(e,i=this._smartRouteMode||"auto"){let s=String(e||"").trim(),a=String(i||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(a==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(a==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(a==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let n=s.toLowerCase(),r=s.replace(/[^\d+]/g,""),l=r.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:r.startsWith("+")||l.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(o=>String(o.node_id||o.id||"").toLowerCase()===n||String(o.label||"").toLowerCase()===n)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,i=""){let s=String(e||"").trim();if(!s)return;let a=this._smartDialRoute(s);if(this._nodeInputDraft=s,a.kind==="pstn"){let r=String(i||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=r,this._dialPSTNNumber(s,r)}if(a.kind==="sip"){let r=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=r,this._dialSIPExtension(r)}let n=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=n,this._userPickerNodeId=n,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:n})}};var H="simson.card.media.v1",re=t=>class extends t{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(H)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(H)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(H,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let i=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:i,video:s}}async _enableCamera(){let e=this._pc;if(!e||this._localStream?.getVideoTracks().length||this._enablingCamera)return;this._enablingCamera=!0;let i;try{try{i=await navigator.mediaDevices.getUserMedia({audio:!1,video:this._mediaConstraints(!0).video})}catch(s){if(!["NotFoundError","OverconstrainedError"].includes(s.name))throw s;i=await navigator.mediaDevices.getUserMedia({audio:!1,video:!0})}if(this._pc!==e||!this.isConnected){i.getTracks().forEach(s=>s.stop());return}this._localStream||=new MediaStream,i.getVideoTracks().forEach(s=>{this._localStream.addTrack(s),e.addTrack(s,this._localStream)}),this._cameraMuted=!1,this._mediaDeviceError=""}catch(s){i?.getTracks().forEach(a=>a.stop()),this._mediaDeviceError=s.message||"Camera unavailable. Audio continues."}finally{this._enablingCamera=!1,this._render()}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let i=null;try{if(e){try{i=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(a){if(!this._videoEnabled)throw a;i=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(a=>a.kind==="audioinput"),videoInputs:s.filter(a=>a.kind==="videoinput"),audioOutputs:s.filter(a=>a.kind==="audiooutput")},this._mediaDevices.audioInputs.length&&!this._mediaDevices.audioInputs.some(a=>a.deviceId===this._selectedAudioInput)&&(this._selectedAudioInput=""),this._mediaDevices.videoInputs.length&&!this._mediaDevices.videoInputs.some(a=>a.deviceId===this._selectedVideoInput)&&(this._selectedVideoInput=""),this._mediaDevices.audioOutputs.length&&!this._mediaDevices.audioOutputs.some(a=>a.deviceId===this._selectedAudioOutput)&&(this._selectedAudioOutput=""),this._mediaDevicesLoaded=!0,this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{i?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(i){if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(i.name)&&(this._selectedAudioInput||e&&this._selectedVideoInput)){this._selectedAudioInput="",this._selectedVideoInput="",this._saveMediaPreferences();try{let s=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e));return this._mediaDeviceError="A saved device is unavailable. Using the system default instead.",s}catch(s){i=s}}if(e){this._mediaDeviceError="Camera access is unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){i=s}}if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(i.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw i}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let i=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){i.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=i,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(i){this._mediaDeviceError=i?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(i=>i.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let i=this._root()?.querySelector("#remote-video");i&&this._remoteStream?.getVideoTracks?.().length&&i.srcObject!==this._remoteStream&&(i.srcObject=this._remoteStream,i.play().catch(()=>{}));let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._applyAudioOutput()}async _applyAudioOutput(){if(!this._remoteAudio?.setSinkId){if(!this._selectedAudioOutput)return;this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="This browser cannot select a speaker. Using its system default.",this._render();return}if(this._remoteAudio.sinkId!==this._selectedAudioOutput)try{await this._remoteAudio.setSinkId(this._selectedAudioOutput)}catch{this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="Could not select that speaker. Call audio is using the system default.",this._render()}}};var x=[{urls:"stun:stun.l.google.com:19302"}];var oe=t=>class extends t{async _fetchWebRTCConfig(){let e=this._currentCallId||"";if(this._webrtcConfig&&(!e||this._webrtcConfig.sip?.enabled)&&this._webrtcConfigCallId===e&&(!this._webrtcConfigFetchedAt||Date.now()-this._webrtcConfigFetchedAt<6e4))return this._webrtcConfig;if(this._webrtcConfigPromise)return this._webrtcConfigPromiseCallId===e?this._webrtcConfigPromise:(await this._webrtcConfigPromise,this._fetchWebRTCConfig());if(this._webrtcConfigRetryCallId===e&&Date.now()<(this._webrtcConfigNextRetryAt||0))return{ice_servers:x,sip:{enabled:!1}};this._webrtcConfigPromiseCallId=e,this._webrtcConfigPromise=(async()=>{try{return this._webrtcConfig=await E(this._hass,"webrtc-config?call_id="+encodeURIComponent(e)+"&node_id="+encodeURIComponent(this._nodeId?.()||""),15e3),this._webrtcConfigFetchedAt=Date.now(),this._webrtcConfigCallId=e,this._webrtcConfigNextRetryAt=0,this._webrtcConfigError="",this._webrtcConfig}catch(i){let s=Number(i?.status||i?.status_code||i?.body?.status||0);this._webrtcConfigError=s===404?"The requested Simson node was not found. Check the card node and integration instance.":s===401||s===403?"Home Assistant denied the media configuration request. Sign in again and retry.":"Media configuration could not be loaded"+(s?" (HTTP "+s+")":"")+". Check the Home Assistant integration logs and retry."}return this._webrtcConfigRetryCallId=e,this._webrtcConfigNextRetryAt=Date.now()+3e4,{ice_servers:x,sip:{enabled:!1}}})();try{let i=await this._webrtcConfigPromise;return this._turnAvailable=this._webrtcConfigError?void 0:this._hasTurnRelay(i),this.isConnected&&this._render(),i}finally{this._webrtcConfigPromise=null}}_hasTurnRelay(e){return(Array.isArray(e?.ice_servers)?e.ice_servers:[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(n=>/^(turn|turns):/i.test(String(n||""))))}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{let i=(async()=>{if(!navigator.mediaDevices?.getUserMedia){this._micAllowed=!1;return}try{let n=this._currentCallType||this._activeCallAttr("call_type","")||this._incomingCallType||"voice",r=await this._captureMedia(["video","webrtc-video"].includes(n));if(e!==this._rtcGeneration||!this.isConnected){r.getTracks().forEach(l=>l.stop());return}this._localStream=r,this._micAllowed=!0}catch(n){this._micAllowed=!1,this._mediaDeviceError=n?.message||"Allow microphone access to speak."}})(),[s]=await Promise.all([this._fetchWebRTCConfig(),i]);if(e!==this._rtcGeneration||!this.isConnected)return;let a=Array.isArray(s.ice_servers)?s.ice_servers:x;if(this._turnAvailable=this._webrtcConfigError?void 0:this._hasTurnRelay({ice_servers:a}),e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:a}),this._pendingCandidates||=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(n=>{this._pc.addTrack(n,this._localStream)}),this._pc.ontrack=n=>{if(n.streams?.[0])this._attachRemoteMedia(n.streams[0],null);else{let r=new MediaStream;r.addTrack(n.track),this._attachRemoteMedia(r,n.track)}},this._pc.onicecandidate=n=>{n.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:n.candidate.candidate,sdpMid:n.candidate.sdpMid,sdpMLineIndex:n.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(n){console.error("Simson: negotiation error:",n)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let n=this._pc?.connectionState;if(n==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(n==="disconnected")this._audioQuality=1;else if(n==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._mediaDeviceError=this._webrtcConfigError?"The media connection failed. Relay configuration was unavailable; reload the integration connection and retry.":this._turnAvailable?"The media connection failed. Check network/firewall access and try again.":"The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.",this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let n=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(n)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:i,from_node_id:s,signal_type:a,data:n}=e;if(!(n?.simson_sender_user_id&&n.simson_sender_user_id===this._hass?.user?.id)&&!(!i||!this._currentCallId||i!==this._currentCallId)&&!(!this._initiatedHere&&!this._answeredByMe&&this._answerPendingCallId!==i)&&!(s&&this._currentRemoteNode&&s!==this._currentRemoteNode)){if(a==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;let r=this._makingOffer||this._pc.signalingState!=="stable"&&!this._isSettingRemoteAnswerPending;if(this._ignoreOffer=r&&!this._polite,this._ignoreOffer)return;if(r&&await this._pc.setLocalDescription({type:"rollback"}),await this._pc.setRemoteDescription(new RTCSessionDescription(n)),!this._isCaller&&this._localStream){let l=new Set([...String(n?.sdp||"").matchAll(/^m=(audio|video)\s/gm)].map(o=>o[1])),d=this._pc.getSenders();this._localStream.getTracks().filter(o=>l.has(o.kind)).filter(o=>!d.some(h=>h.track?.kind===o.kind)).forEach(o=>this._pc.addTrack(o,this._localStream))}await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let l of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(l));this._pendingCandidates=[]}else if(a==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"){this._isSettingRemoteAnswerPending=!0;try{await this._pc.setRemoteDescription(new RTCSessionDescription(n))}finally{this._isSettingRemoteAnswerPending=!1}for(let r of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(r));this._pendingCandidates=[]}}else if(a==="ice-candidate")if(this._pc&&this._pc.remoteDescription)try{await this._pc.addIceCandidate(new RTCIceCandidate(n))}catch(r){if(!this._ignoreOffer)throw r}else this._pendingCandidates.push(n)}}_sendWebRTCSignal(e,i){let s=this._activeCallAttr("call_id")||this._currentCallId,a=this._currentRemoteNode;!s||!a||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:a,signal_type:e,data:i}).catch(n=>console.error("Simson: signal send failed:",n))}_cleanupWebRTC({endCall:e=!1}={}){this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(i=>i.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._playbackBlocked=!1,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._ignoreOffer=!1,this._isSettingRemoteAnswerPending=!1,e&&(this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._initiatedHere=!1),this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,i=null){if(!e&&i&&(e=new MediaStream,e.addTrack(i)),!e)return;for(let a of e.getVideoTracks?.()||[])a.addEventListener("unmute",()=>this._render(),{once:!0});this._remoteStream=e,this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.srcObject=e;let s=e.getAudioTracks?e.getAudioTracks():[];console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(a=>a.readyState),muted:s.map(a=>a.muted)}),this._remoteAudio.play().then(()=>{this._playbackBlocked=!1}).catch(a=>{this._playbackBlocked=!0,this._render(),console.warn("[Simson] remote audio play blocked/failed:",a?.message||a)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,i=null){this._attachRemoteMedia(e,i)}async _updateQuality(){if(this._pc)try{let e=await this._pc.getStats(),i=0,s=0,a=0;e.forEach(r=>{if(r.type==="inbound-rtp"&&r.kind==="audio"&&(i=r.jitter||0,s=r.packetsLost||0,a=r.packetsReceived||1),r.type==="candidate-pair"&&r.state==="succeeded"){let l=e.get?e.get(r.remoteCandidateId):null;l?.candidateType&&(this._connectionType=l.candidateType)}});let n=s/Math.max(a,1);n>.1||i>.1?this._audioQuality=1:n>.03||i>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var le=t=>class extends t{_cleanupSIPUA(){if(this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e||!this._initiatedHere&&!this._answeredByMe&&!this._answerPendingCallId)return;if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._mediaDeviceError="",this._actionError="",this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let i,s;try{[{MinimalSIPUA:i},s]=await Promise.all([import("./sip-ua-PVB54IXM.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._mediaDeviceError="The media connection failed. Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let a=s?.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:a.enabled,ws_url:a.ws_url,username:a.username,domain:a.domain})),!a.enabled||!a.ws_url||!a.username||!a.password){this._mediaDeviceError="The media connection failed. "+(a.reason||this._webrtcConfigError||"Phone audio configuration is incomplete. Check the addon connection and retry."),this._render(),this._pendingSIPBridgeId=null;return}let n="sip:"+a.username+"@"+a.domain,r=new i({uri:n,captureMedia:()=>this._captureMedia(!1),password:a.password,wsUrl:a.ws_url,iceServers:s.ice_servers||x,onAudioTrack:(l,d)=>{this._sipUA===r&&this._attachRemoteAudio(l,d)},onRegistered:()=>{this._sipUA===r&&(r._activeBridge=e,this._pendingSIPBridgeId=null,r.dial(e).catch(l=>{this._sipUA===r&&(console.error("Simson SIP dial error:",l),this._mediaDeviceError="The media connection failed. "+(l?.message||"Could not join the SIP media bridge. Please retry."),this._cleanupSIPUA(),this._render())}))},onError:l=>{this._sipUA===r&&(this._mediaDeviceError="The media connection failed. "+(l?.message||"Phone audio is unavailable; retry the media connection."),console.error("Simson SIP UA error:",l),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render())},onBye:()=>{this._sipUA===r&&(this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render())}});this._sipUA=r,r.connect()}};var ce=t=>class extends t{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let i=e.createOscillator(),s=e.createGain();i.connect(s),s.connect(e.destination),i.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),i.start(e.currentTime),i.stop(e.currentTime+.4),setTimeout(()=>{let a=e.createOscillator(),n=e.createGain();a.connect(n),n.connect(e.destination),a.frequency.value=480,n.gain.setValueAtTime(.15,e.currentTime),n.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),a.start(e.currentTime),a.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,i){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${i} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var de=t=>class extends t{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let i=Math.round(e);if(i<60)return`${i}s`;let s=Math.floor(i/60),a=i%60;return s<60?`${s}m ${a}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let i=new Date(e*1e3),s=new Date,a=i.toDateString()===s.toDateString(),n=new Date(s);n.setDate(n.getDate()-1);let r=i.toDateString()===n.toDateString(),l=i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return a?l:r?`Yesterday ${l}`:i.toLocaleDateString([],{month:"short",day:"numeric"})+" "+l}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let i=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(i/60)).padStart(2,"0"),a=String(i%60).padStart(2,"0");e.textContent=`${s}:${a}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function _e(){let t=this._nodeId(),e=this._isConnected(),i=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",a=this._activeCallAttr("direction",""),n=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<45e3,r=n?"outgoing":a,l=this._hass?.user?.id||"",d=this._activeCallAttr("target_user_id",""),o=this._activeCallAttr("caller_user_id",""),h=this._activeCallAttr("answered_by_user_id",""),_=!this._endedCallIds?.has(s)&&C({call_id:s,direction:a,state:i,target_user_id:d,caller_user_id:o,answered_by_user_id:h},l,this._currentCallId),g=["incoming","requesting","ringing","active"],m=n&&(!_||!g.includes(i)),u=m?"requesting":_&&g.includes(i)&&s?m?"requesting":i:"idle";u==="ringing"&&r==="incoming"&&!this._isCaller&&(u="incoming");let f=u==="idle"||u==="unknown",v=u==="incoming"&&r!=="outgoing"&&!this._isCaller,w=u==="requesting"||u==="ringing",Q=u==="active",De=u==="missed",Ne=u==="declined",Ue=u==="timeout",K=v||w||Q,Me=!!this._pc,T=this._activeCallAttr("call_type",""),J=this._activeCallAttr("sip_bridge_id",""),X=this._initiatedHere&&this._currentRemoteLabel||m&&String(this._currentRemoteNode||"").replace(/^phone:/,"")||this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||String(this._currentRemoteNode||"").replace(/^phone:/,"")||(r==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&_&&(this._currentCallId=s),K&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let L=this._prevCallState;if(L!==u)if(this._prevCallState=u,u==="incoming")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentCallType=T||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=X,this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(u==="active"&&L!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentCallType=T||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),J&&(this._sipBridgeId=J),this._isCaller=r==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let A=Number(this._activeCallAttr("started_at",0));this._callStart=A>0?A*1e3:Date.now()}let O=T==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:"),Z=this._initiatedHere||this._answeredByMe||this._answerPendingCallId===s;O&&Z?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(A=>console.error("[Simson] SIP state active start:",A)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):!O&&Z&&this._startWebRTC()}else u==="idle"&&L!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC({endCall:!0}),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));w&&_&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let ke=_?s:m&&!this._endedCallIds?.has(this._currentCallId)&&this._currentCallId||"";return{nodeId:t,connected:e,direction:r,isIdle:f,isIncoming:v,isRinging:w,isActive:Q,hasCall:K,activeCallType:T,remoteLabel:X,callId:ke}}var Te=de(ce(le(oe(re(ne(ae($))))))),k=class extends Te{views=new Set;set hass(e){let i=this._hass;i?.user?.id&&i.user.id!==e?.user?.id&&(this._cleanupWebRTC(),this._cleanupSIPUA(),this._clearLocalCallState(),this._webrtcConfig=null,this._webrtcConfigCallId=null),i?.connection&&i.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=["connection","call_state","active_call","calls_count"],a=Object.keys(e?.states||{}).filter(r=>e.states[r].attributes?.simson_contact);(!i||i.user?.id!==e?.user?.id||a.some(r=>i.states?.[r]!==e.states[r])||s.some(r=>P(i,this._config,this._detectedNodeId,r)!==this._entity(r)))&&this.requestUpdate()}_connectHA(){if(this._hass){if(this._hass.user?.id){let e=new URL(window.location.href),i=e.searchParams.get("simson_node");if(!i||i===this._nodeId()){let s=e.searchParams.get("simson_action"),a=e.searchParams.get("simson_call");if(a&&["answer","decline","hangup"].includes(s)){for(let r of["simson_action","simson_call","simson_node"])e.searchParams.delete(r);window.history.replaceState(window.history.state,"",e),s==="answer"?this._answer(a):this._runAction(s==="decline"?"Declining call\u2026":"Ending call\u2026",()=>this._callService(s==="decline"?"reject_call":"hangup_call",{call_id:a,...s==="decline"?{reason:"declined_from_notification"}:{}}))}let n=e.searchParams.get("simson_answer");n&&(this._answerPendingCallId=n,this._currentCallId=n,e.searchParams.delete("simson_answer"),e.searchParams.delete("simson_node"),window.history.replaceState(window.history.state,"",e))}}this._haEventSubscribed||this._subscribeHAEvents(),!this._webrtcConfig&&!this._webrtcConfigPromise&&this._fetchWebRTCConfig(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets(),this._loadPeople()}}connectedCallback(){super.connectedCallback(),this._connectHA(),this._mediaDevicesLoaded||this._refreshMediaDevices(!1),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),clearTimeout(this._outgoingUiTimer),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?_e.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return p}};customElements.get("simson-call-session")||customElements.define("simson-call-session",k);var ue=new WeakMap;function he(t,e,i){let s=e.connection||e,a=ue.get(s);a||ue.set(s,a=new Map);let r=i.node_id||e.states?.[i.entity]?.attributes?.node_id||[i.connection_entity,i.call_state_entity,i.calls_count_entity].map(h=>h?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(h=>h.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",l=I(e,{...i,node_id:r}),d=`${e.user?.id||""}:${l}`,o=a.get(d);if(o||(o=new k,o.hidden=!0,o.setConfig({...i,node_id:l}),o.hass=e,o._release=()=>a.delete(d),a.set(d,o),document.body.append(o)),clearTimeout(o._releaseTimer),!o.views.has(t)||t._sessionConfig!==i){o.views.add(t),t._sessionConfig=i;let h=o._config,_=[...o.views].flatMap(g=>{let m=g._config.target_nodes;return Array.isArray(m)?m:m?[m]:[]});o.setConfig({...h,...i,node_id:l,target_nodes:_}),i.view==="history"&&o._loadHistory(),i.view==="devices"&&o._refreshMediaDevices(!1)}return o}function V(t,e){t.views.delete(e),t.views.size||(t._releaseTimer=setTimeout(()=>{t.views.size||(t.remove(),t._release())},0))}var pe={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},me=t=>(...e)=>({_$litDirective$:t,values:e}),R=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,s){this._$Ct=e,this._$AM=i,this._$Ci=s}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}};var{I:Ae}=ie,ge=t=>t;var fe=()=>document.createComment(""),S=(t,e,i)=>{let s=t._$AA.parentNode,a=e===void 0?t._$AB:e._$AA;if(i===void 0){let n=s.insertBefore(fe(),a),r=s.insertBefore(fe(),a);i=new Ae(n,r,t,t.options)}else{let n=i._$AB.nextSibling,r=i._$AM,l=r!==t;if(l){let d;i._$AQ?.(t),i._$AM=t,i._$AP!==void 0&&(d=t._$AU)!==r._$AU&&i._$AP(d)}if(n!==a||l){let d=i._$AA;for(;d!==n;){let o=ge(d).nextSibling;ge(s).insertBefore(d,a),d=o}}}return i},y=(t,e,i=t)=>(t._$AI(e,i),t),$e={},ve=(t,e=$e)=>t._$AH=e,be=t=>t._$AH,D=t=>{t._$AR(),t._$AA.remove()};var ye=(t,e,i)=>{let s=new Map;for(let a=e;a<=i;a++)s.set(t[a],a);return s},N=me(class extends R{constructor(t){if(super(t),t.type!==pe.CHILD)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let s;i===void 0?i=e:e!==void 0&&(s=e);let a=[],n=[],r=0;for(let l of t)a[r]=s?s(l,r):r,n[r]=i(l,r),r++;return{values:n,keys:a}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,s]){let a=be(t),{values:n,keys:r}=this.dt(e,i,s);if(!Array.isArray(a))return this.ut=r,n;let l=this.ut??=[],d=[],o,h,_=0,g=a.length-1,m=0,u=n.length-1;for(;_<=g&&m<=u;)if(a[_]===null)_++;else if(a[g]===null)g--;else if(l[_]===r[m])d[m]=y(a[_],n[m]),_++,m++;else if(l[g]===r[u])d[u]=y(a[g],n[u]),g--,u--;else if(l[_]===r[u])d[u]=y(a[_],n[u]),S(t,d[u+1],a[_]),_++,u--;else if(l[g]===r[m])d[m]=y(a[g],n[m]),S(t,a[_],a[g]),g--,m++;else if(o===void 0&&(o=ye(r,m,u),h=ye(l,_,g)),o.has(l[_]))if(o.has(l[g])){let f=h.get(r[m]),v=f!==void 0?a[f]:null;if(v===null){let w=S(t,a[_]);y(w,n[m]),d[m]=w}else d[m]=y(v,n[m]),S(t,a[_],v),a[f]=null;m++}else D(a[g]),g--;else D(a[_]),_++;for(;m<=u;){let f=S(t,d[u+1]);y(f,n[m]),d[m++]=f}for(;_<=g;){let f=a[_++];f!==null&&D(f)}return this.ut=r,ve(t,d),te}});function Pe(t){let e=new Map;for(let[i,s]of Object.entries(t._hass?.states||{})){let a=s.attributes||{};a.simson_contact&&!a.simson_call_button&&a.node_id===t._nodeId()&&s.state!=="unavailable"&&e.set(a.user_id,{user_id:a.user_id,user_name:a.user_name||"User",entity_id:i,state:s.state})}for(let i of t._localUsers||[])e.set(i.user_id,{...e.get(i.user_id),...i});return[...e.values()].filter(i=>i.user_id&&i.user_id!==t._hass?.user?.id).sort((i,s)=>i.user_name.localeCompare(s.user_name,void 0,{numeric:!0,sensitivity:"base"}))}function W(t,e=0,i=6){let s=Math.max(1,Math.ceil(t.length/i)),a=Math.max(0,Math.min(e,s-1));return{items:t.slice(a*i,(a+1)*i),current:a,pages:s,total:t.length}}function z(t,e,i){return t.pages>1?c`<nav class="list-pager" aria-label=${e}>
    <span aria-live="polite">${t.current+1} / ${t.pages} · ${t.total} total</span>
    <button aria-label=${"Previous "+e} ?disabled=${t.current===0} @click=${()=>i(t.current-1)}>Previous</button>
    <button aria-label=${"Next "+e} ?disabled=${t.current===t.pages-1} @click=${()=>i(t.current+1)}>Next</button>
  </nav>`:p}function we(t,e,i){let s=Pe(t),a=t._directoryTab==="devices",n=String(t._directorySearch||"").trim().toLowerCase(),r=(a?e:s).filter(o=>[o.user_name,o.label,o.user_id,o.extension,o.id].some(h=>String(h||"").toLowerCase().includes(n))),l=W(r,t._directoryPage),d=o=>{t._directoryPage=o,t.requestUpdate()};return c`<section class="directory-workspace">
    <div class="section-heading"><h3>${a?"Quick connections":"People at this site"}</h3><button class="text-button" aria-label="Refresh people" ?disabled=${t._peopleLoading} @click=${()=>t._loadPeople(!0)}>${t._peopleLoading?"Updating\u2026":"Refresh"}</button></div>
    <div class="directory-toolbar"><div class="route-options" aria-label="Directory">
      <button class=${a?"":"selected"} aria-pressed=${!a} @click=${()=>{t._directoryTab="people",d(0)}}>People · ${s.length}</button>
      <button class=${a?"selected":""} aria-pressed=${a} @click=${()=>{t._directoryTab="devices",d(0)}}>Devices · ${e.length}</button>
    </div><input aria-label="Search contacts and devices" placeholder="Search name or extension" .value=${t._directorySearch||""} @input=${o=>{t._directorySearch=o.target.value,d(0)}}></div>
    ${t._peopleError&&!a?c`<p class="fine-print" role="status">${t._peopleError}</p>`:p}
    ${r.length?c`<div class="contacts compact-contacts">${N(l.items,o=>o.user_id||o.id,o=>c`
      <button class="contact" ?disabled=${!i||!!t._actionPending||!a&&o.state!=="ready"} @click=${()=>t._runAction("directory:"+(o.user_id||o.id),()=>a?(o.type||"node")==="node"?(t._userPickerNodeId=o.node_id||o.id,t._userPickerTargetId=o.id,t._callService("get_remote_users",{node_id:t._userPickerNodeId})):t._dialTarget(o.id,o.type,o.node_id):t._callDirectoryUser(o))}><span class="avatar">${String(o.user_name||o.label||o.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${o.user_name||o.label||o.id}</b><small>${a?o.type==="node"?"Home Assistant":o.trunk?"Gateway \xB7 "+o.trunk:"SIP \xB7 "+(o.extension||o.id):o.state==="ready"?"Available to call":"Busy"}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:c`<div class="empty compact">${n?"No matching contacts.":a?"No saved devices. Dial an extension above.":t._peopleLoading?"Loading people\u2026":"No other active HA users at this site."}</div>`}
    ${z(l,"contacts page",d)}
  </section>`}function q(t,e){let i=t._smartDialRoute(t._nodeInputDraft),s=[...t._targets];for(let r of t._config.target_nodes||[])s.some(l=>(l.node_id||l.id)===r)||s.push({id:r,node_id:r,label:r,type:"node"});let a=e.connected&&!e.hasCall,n=()=>a&&t._runAction("dial",()=>t._dialSmartValue(t._nodeInputDraft,t._pstnTrunkDraft));return c`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>Call a person, a room, or an outside number.</p></div>
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([r,l])=>c`<button class=${t._smartRouteMode===r?"selected":""} aria-pressed=${t._smartRouteMode===r} @click=${()=>{t._smartRouteMode=r,t.requestUpdate()}}>${l}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${t._nodeInputDraft} placeholder="Enter extension, number or node" @input=${r=>{t._nodeInputDraft=r.target.value,t.requestUpdate()}} @keydown=${r=>{r.key==="Enter"&&n()}}><button class="primary" aria-label="Place call" ?disabled=${!a||!!t._actionPending||!t._nodeInputDraft.trim()} @click=${n}>Call ↗</button></div></label>
    <div class="route-hint"><span>${i.label}</span><small>${i.hint}</small></div>
    ${i.kind==="pstn"?c`<label class="field"><span>Gateway trunk</span><input .value=${t._pstnTrunkDraft||t._effectivePstnTrunk()} placeholder="Site default" @input=${r=>{t._pstnTrunkDraft=r.target.value}}></label>`:p}
    ${we(t,s,a)}
    <details class="call-preferences"><summary>Call preferences · ${t._videoEnabled?"Camera enabled":"Audio first"}</summary>
      <label class="toggle node-video-toggle"><span><b>Share camera on user calls</b><small>Door-phone RTSP video is separate from your camera and SIP audio.</small></span><input type="checkbox" .checked=${t._videoEnabled} @change=${r=>{t._videoEnabled=r.target.checked,t._saveMediaPreferences(),t.requestUpdate(),t._videoEnabled&&t._refreshMediaDevices(!0)}}></label>
      ${t._videoEnabled&&t._turnAvailable===!1?c`<div class="notice" role="status">No TURN relay is configured. Mobile or restrictive networks may need a relay.</div>`:p}
      ${t._videoEnabled&&!globalThis.isSecureContext?c`<div class="notice error">Camera and microphone access require HTTPS.</div>`:p}
      <button class="text-button" @click=${()=>t._selectTab("media")}>Camera, microphone & sound settings →</button>
    </details>
  </section>`}function Ee(t,e){return t.iceGatheringState==="complete"?Promise.resolve():new Promise(i=>{let s=()=>{clearTimeout(n),t.removeEventListener("icegatheringstatechange",a),e.removeEventListener("abort",s),i()},a=()=>{t.iceGatheringState==="complete"&&s()},n=setTimeout(s,8e3);t.addEventListener("icegatheringstatechange",a),e.addEventListener("abort",s,{once:!0})})}var j=class extends b{static properties={hass:{attribute:!1},nodeId:{},extension:{},callId:{},active:{type:Boolean},iceServers:{attribute:!1},status:{state:!0},error:{state:!0}};createRenderRoot(){return this}updated(){let e=`${this.nodeId}:${this.extension}:${this.callId}:${!!this.active}`;e!==this._key&&(this._key=e,this.stop(),this.active&&this.callId&&this.connect())}disconnectedCallback(){this.stop(),super.disconnectedCallback()}stop(){this._generation=(this._generation||0)+1,this._abort?.abort(),clearTimeout(this._watchdog),this._peer?.close(),this._peer=null,this._stream?.getTracks().forEach(i=>i.stop()),this._stream=null;let e=this.querySelector("video");e&&(e.pause(),e.srcObject=null),this.status="idle",this.error=""}async connect(){let e=this._generation;this.status="connecting",this.error="",this._abort=new AbortController;let i=this._peer=new RTCPeerConnection({iceServers:this.iceServers||[]});i.addTransceiver("video",{direction:"recvonly"}),i.ontrack=async s=>{if(e!==this._generation||s.track.kind!=="video")return;this._stream=s.streams[0]||new MediaStream([s.track]),await this.updateComplete;let a=this.querySelector("video");if(!a||e!==this._generation)return;a.srcObject=this._stream;let n=()=>{e===this._generation&&a.videoWidth>0&&(this.status="live",clearTimeout(this._watchdog))};a.onloadeddata=n,a.requestVideoFrameCallback?.(n);try{await a.play()}catch{this.status="playback"}},i.onconnectionstatechange=()=>{e===this._generation&&i.connectionState==="failed"&&(this.status="error",this.error="Video connection failed. Check the bridge ICE/TURN configuration.")};try{if(await i.setLocalDescription(await i.createOffer()),await Ee(i,this._abort.signal),e!==this._generation)return;let s,a;try{a=await Promise.race([this.hass.callApi("POST","simson/video/offer",{node_id:this.nodeId,extension:this.extension,call_id:this.callId,sdp:i.localDescription.sdp}),new Promise((n,r)=>{s=setTimeout(()=>r(Error("Video bridge timed out")),16e3)})])}finally{clearTimeout(s)}if(e!==this._generation)return;await i.setRemoteDescription({type:"answer",sdp:a.sdp}),this.status!=="live"&&(this._watchdog=setTimeout(()=>{e===this._generation&&this.status!=="live"&&(this.status="error",this.error="No video frames received. Check that the named RTSP stream supplies browser-compatible H.264.")},12e3))}catch{if(e!==this._generation)return;i.close(),this.status="error",this.error="Live video could not connect. Check the linked stream and active-call permissions."}}render(){return c`<div class="video-stage linked-door-video">
    <video autoplay muted playsinline></video>
    <span class="live-label">${this.status==="live"?"LIVE VIDEO":"RTSP \xB7 VIDEO ONLY"}</span>
    ${this.status!=="live"?c`<div class="stream-feedback" role="status"><b>${this.status==="error"?"Video unavailable":this.status==="idle"?"Video is stopped":this.status==="playback"?"Tap to play video":"Connecting door video\u2026"}</b><small>${this.error||"SIP audio stays connected independently."}</small>
      ${["error","playback"].includes(this.status)?c`<button @click=${()=>{if(this.status==="playback"){let e=this.querySelector("video");e?.play().then(()=>{e.videoWidth>0&&(this.status="live")}).catch(()=>{})}else this.stop(),this.connect()}}>${this.status==="playback"?"Play video":"Retry video"}</button>`:c``}</div>`:c``}
  </div>`}};customElements.get("simson-door-stream")||customElements.define("simson-door-stream",j);function U(t,e){let i=!!t._localStream?.getVideoTracks().length,s=!!t._remoteStream?.getVideoTracks().some(u=>u.readyState==="live"&&!u.muted),a=e.isActive&&(i||!!t._remoteStream?.getVideoTracks().length),n=e.activeCallType==="sip"||t._currentCallType==="sip",r=n?t._sipUA?._pc?.connectionState==="connected":t._pc?.connectionState==="connected",l=["video","webrtc-video"].includes(t._incomingCallType||e.activeCallType),d=t._mediaDeviceError?.startsWith("The media connection failed."),o=e.isActive?d?"Media connection failed":r?"Connected":"Connecting media\u2026":e.isIncoming?l?"Incoming video call":"Would like to talk to you":e.callId?"Ringing \xB7 Waiting for an answer\u2026":"Sending your call request to the node\u2026",h=(u,f)=>()=>t._runAction(u,f),_=String(t._activeCallAttr("target_extension")||t._activeCallAttr("remote_node_id")||t._currentRemoteNode||"").replace(/^sip:/,""),g=n&&(t._videoProfiles||[]).some(u=>u.extension===_),m=t._initiatedHere||t._answeredByMe||t._answerPendingCallId===e.callId;return c`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":e.callId?"CALLING":"STARTING YOUR CALL"}</span>
    ${g&&e.isActive?c`<simson-door-stream .hass=${t._hass} .nodeId=${t._nodeId()} .extension=${_} .callId=${e.callId} .active=${!!m} .iceServers=${t._webrtcConfig?.ice_servers||[]}></simson-door-stream>`:a?c`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?p:c`<span class="video-wait">No SIP video frames received.${n?" Link this extension to its RTSP stream using simson.configure_videophone.":""}</span>`}${i?c`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:p}<span class="live-label">${s?"LIVE":"WAITING FOR VIDEO"}</span></div>`:c`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption" role="status">${o} <span id="call-timer"></span></p>
    ${!e.isActive&&!e.isIncoming?c`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${e.callId?"The destination is being called":"Connecting to your call service"}</b><small>${e.callId?"You can stay here while the other phone rings.":"This card will update as soon as the node responds."}</small></span></div>`:p}
    ${t._micAllowed===!1?c`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:p}
    ${t._mediaDeviceError?c`<div class="notice error" role="status">${t._mediaDeviceError}</div>`:p}
    ${e.isActive&&t._playbackBlocked?c`<button class="primary" @click=${h("enable-sound",async()=>{await t._remoteAudio.play(),t._playbackBlocked=!1,t._render()})}>Enable call sound</button>`:p}
    ${e.isActive&&d&&(t._initiatedHere||t._answeredByMe)?c`<button class="primary" @click=${h("retry-media",()=>(t._webrtcConfig=null,t._webrtcConfigNextRetryAt=0,n?t._startSIPCall(t._sipBridgeId||e.activeSipBridgeId):t._startWebRTC()))}>Retry media connection</button>`:p}
    ${t._isCaller&&!t._initiatedHere&&!n?c`<div class="browser-join"><p>This call was started by a script or another dashboard. Choose this browser to use its microphone and camera.</p><button class="primary" @click=${h("join-browser",()=>t._joinUserCall())}>Use this browser for audio${t._currentCallType==="video"?" & video":""}</button></div>`:p}
    <div class="call-actions">
      ${e.isIncoming?c`<button class="primary" ?disabled=${!!t._actionPending} @click=${h("answer",()=>t._answer())}>Answer</button><button class="danger" ?disabled=${!!t._actionPending} @click=${h("reject",()=>t._reject())}>Decline</button>`:c`
        <button aria-pressed=${t._muted} ?disabled=${!e.isActive} @click=${h("mute",()=>t._toggleMute())}>${t._muted?"Unmute":"Mute"}</button>
        ${i?c`<button aria-pressed=${t._cameraMuted} @click=${h("camera",()=>t._toggleCamera())}>${t._cameraMuted?"Camera on":"Camera off"}</button>`:p}
        ${e.isActive&&!n&&!i&&t._pc?c`<button @click=${h("enable-camera",()=>t._enableCamera())}>Enable camera</button>`:p}
        <button class="danger" ?disabled=${!e.callId||!!t._actionPending} @click=${h("hangup",()=>t._hangup())}>${e.callId?"End call":"Starting\u2026"}</button>
      `}
    </div>
    ${e.isActive&&(t._sipBridgeId||e.activeCallType==="sip")?c`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${t._transferNodeDraft} @input=${u=>{t._transferNodeDraft=u.target.value,t.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!t._transferNodeDraft.trim()} @click=${h("transfer-node",()=>t._transferCall(t._transferNodeDraft))}>To node</button><button ?disabled=${!t._transferNodeDraft.trim()} @click=${h("transfer-sip",()=>t._transferCall("sip:"+t._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!t._transferNodeDraft.trim()} @click=${()=>t._loadTransferUsers(t._transferNodeDraft)}>Choose user</button></div>${t._transferUsers.map(u=>c`<button class="contact" @click=${h("transfer-user:"+u.user_id,()=>t._transferCall(t._transferUsersNode,u.user_id,u.user_name))}>${u.user_name}</button>`)}</details>`:p}
  </section>`}function F(t){let e=String(t._historySearch||"").toLowerCase().trim(),i=t._history.filter(n=>(!t._historyFilter||t._historyFilter==="all"||t._historyFilter==="missed"&&["missed","failed","declined","timeout"].includes(n.state)||n.direction===t._historyFilter)&&[n.remote_label,n.remote_node_id,n.state].some(r=>String(r||"").toLowerCase().includes(e))),s=W(i,t._historyPage),a=n=>{t._historyPage=n,t.requestUpdate()};return c`<section class="history-workspace"><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>t._loadHistory()}>Refresh</button></div>
    <div class="directory-toolbar"><input aria-label="Search call history" placeholder="Search calls" .value=${t._historySearch||""} @input=${n=>{t._historySearch=n.target.value,a(0)}}>
      <select aria-label="Filter call history" .value=${t._historyFilter||"all"} @change=${n=>{t._historyFilter=n.target.value,a(0)}}>${[["all","All calls"],["incoming","Incoming"],["outgoing","Outgoing"],["missed","Missed & failed"]].map(([n,r])=>c`<option value=${n}>${r}</option>`)}</select></div>
    ${s.total?c`<div class="history">${N(s.items,(n,r)=>n.call_id||r,n=>c`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(n.state)?"missed":""}">${n.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${n.remote_label||n.remote_node_id||"Unknown caller"}</b><small>${n.state} · ${t._formatDuration(n.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{t._nodeInputDraft=String(n.remote_node_id||"").replace(/^(sip:|phone:)/,""),t._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:c`<div class="empty compact">${t._historyLoaded?"No calls match this view.":"Loading recent calls\u2026"}</div>`}
    ${z(s,"history page",a)}</section>`}function M(t){let e=Object.entries(t._hass?.states||{}).find(([,a])=>a.attributes?.simson_contact&&!a.attributes.simson_call_button&&a.attributes.node_id===t._nodeId()&&a.attributes.user_id===t._hass?.user?.id)?.[0],i=t._mediaDevices,s=(a,n,r)=>c`<label class="field"><span>${a}</span><select .value=${t[r]} @change=${l=>{t[r]=l.target.value,t._saveMediaPreferences(),r==="_selectedAudioOutput"&&t._applyAudioOutput(),t._mediaPreviewStream&&t._startMediaPreview(),t.requestUpdate()}}><option value="">System default</option>${n.map((l,d)=>c`<option value=${l.deviceId}>${l.label||a+" "+(d+1)}</option>`)}</select></label>`;return c`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>t._runAction("detect",()=>t._refreshMediaDevices(!0))}>Detect</button></div>
    ${t._mediaDeviceError?c`<div class="notice error" role="alert">${t._mediaDeviceError}</div>`:p}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${t._mediaPreviewStream?.getVideoTracks().length?p:c`<div class="preview-empty"><b>${t._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${t._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Turn on once to grant camera access before a call</small></span><input type="checkbox" .checked=${t._videoEnabled} @change=${a=>{t._videoEnabled=a.target.checked,t._saveMediaPreferences(),t._mediaPreviewStream?t._startMediaPreview():t._videoEnabled&&t._refreshMediaDevices(!0),t.requestUpdate()}}></label>
    <div class="device-grid">${s("Microphone",i.audioInputs,"_selectedAudioInput")}${s("Camera",i.videoInputs,"_selectedVideoInput")}${s("Speaker",i.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>t._runAction("preview",()=>t._startMediaPreview())}>${t._mediaPreviewStream?"Restart preview":"Test devices"}</button>${t._mediaPreviewStream?c`<button @click=${()=>t._stopMediaPreview()}>Stop preview</button>`:p}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${t._notifPermission==="default"?c`<button class="text-button" @click=${()=>t._requestNotificationPermission()}>Enable incoming-call notifications</button>`:p}
    ${e?c`<button class="text-button" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("notification-test",()=>t._callService("test_user_notification",{entity_id:e}))}>Send a test to my Companion phone</button><p class="fine-print">Registered phones are matched to your HA user. Notification permissions must also be enabled on the phone.</p>`:p}
  </section>`}function Ce(t){if(!t._pickerOpen&&!t._showPopup&&!(t._showCallDialog&&t._view?.hasCall))return p;let e=t._pickerOpen,i=!e&&!t._showPopup&&t._showCallDialog,s=r=>{let l=t._userPickerNodeId;t._removeUserPicker(),t._runAction("call-user",()=>t._dial(l,r?.user_id,r?.user_name))},a=r=>{if(r.key==="Escape"&&(e?t._removeUserPicker():i&&(t._showCallDialog=!1,t._render())),r.key!=="Tab")return;let l=[...r.currentTarget.querySelectorAll("button:not(:disabled), input:not(:disabled), summary")],d=l[0],o=l.at(-1),h=r.currentTarget.getRootNode().activeElement;r.shiftKey&&h===d?(r.preventDefault(),o?.focus()):!r.shiftKey&&h===o&&(r.preventDefault(),d?.focus())},n=r=>{r.preventDefault(),e?t._removeUserPicker():i&&(t._showCallDialog=!1,t._render())};return i?c`<dialog class="dialog-scrim" aria-label="Your call" @cancel=${n}><section class="dialog call-dialog" @keydown=${a}>
    <div class="dialog-heading"><span class="eyebrow">YOUR PRIVATE CALL</span><button class="text-button" @click=${()=>{t._showCallDialog=!1,t._render()}}>Minimize</button></div>
    ${t._actionError?c`<div class="notice error" role="alert">${t._actionError}</div>`:p}
    ${U(t,t._view)}
  </section></dialog>`:c`<dialog class="dialog-scrim" aria-label=${e?"Choose call recipient":"Incoming call"} @cancel=${n}><section class="dialog" @keydown=${a}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?t._userPickerNodeId:t._incomingFrom}</h2>
    ${e?c`<div class="dialog-options"><button class="primary" @click=${()=>s(null)}>Call everyone on this node</button>${t._remoteUsers.map(r=>c`<button @click=${()=>s(r)}>${r.user_name||r.user_id}</button>`)}</div><button class="text-button" @click=${()=>t._removeUserPicker()}>Cancel</button>`:c`<p>Would like to talk to you.</p>${t._actionError?c`<div class="notice error" role="alert">${t._actionError}</div>`:p}<div class="call-actions"><button class="primary" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("answer",()=>t._answer())}>Answer</button><button class="danger" ?disabled=${!!t._actionPending} @click=${()=>t._runAction("reject",()=>t._reject())}>Decline</button></div>`}
  </section></dialog>`}var G=class extends b{static properties={hass:{attribute:!1},entity:{},live:{type:Boolean}};createRenderRoot(){return this}updated(){let e=`${this.entity}:${this.live}:${!!this.hass?.states?.[this.entity]}`;this._key!==e&&(this._key=e,this._load(e)),this._camera&&(this._camera.hass=this.hass)}async _load(e){this._camera=null;let i=this.querySelector(".camera-container");if(i){if(i.replaceChildren(),!this.entity||!this.hass?.states?.[this.entity]){i.textContent="Choose your Home Assistant camera entity in the card editor.";return}try{let a=(await window.loadCardHelpers()).createCardElement({type:"picture-entity",entity:this.entity,camera_view:this.live?"live":"auto",show_name:!1,show_state:!1,tap_action:{action:"none"},hold_action:{action:"none"}});if(this._key!==e||!this.isConnected)return;a.hass=this.hass,this._camera=a,i.replaceChildren(a)}catch{this._key===e&&(i.textContent="Camera could not load. Check its Home Assistant integration.")}}}render(){return c`<div class="camera-container"></div>`}};customElements.get("simson-door-camera")||customElements.define("simson-door-camera",G);function xe(t,e,i,s){let a=t._config,n=String(a.extension||"").trim(),r=a.camera_entity||"",l=!!n&&i.hasCall&&(String(e._currentRemoteNode||"")===n||e._activeCallAttr("target_extension")===n||e._activeCallAttr("remote_node_id")===`sip:${n}`);return c`<section class="door-workspace">
    <div class="section-heading"><h2>${a.device_name||"Door phone"}</h2><span>SIP ${n||"not configured"}</span></div>
    <simson-door-camera .hass=${t._hass} .entity=${r} .live=${l||t._doorPreview===!0}></simson-door-camera>
    <p class="fine-print">SIP provides two-way audio. Link a named RTSP/WebRTC source with simson.configure_videophone for independent live video during your call. An optional HA camera can still provide preview.</p>
    ${l?s(e,i):c`<div class="call-actions">
      <button class="primary" ?disabled=${!n||!i.connected||i.hasCall||!!e._actionPending}
        @click=${()=>e._runAction("door:"+n,()=>e._dialSIPExtension(n))}>Call door phone</button>
      <button ?disabled=${!r} aria-pressed=${t._doorPreview===!0}
        @click=${()=>{t._doorPreview=!t._doorPreview,t.requestUpdate()}}>${t._doorPreview?"Stop video":"View live video"}</button>
    </div>`}
    ${n?p:c`<div class="notice">Set the SIP extension and select a camera in this card’s editor.</div>`}
  </section>`}function Se(t,e,i,s){let a=t._config.entity,n=e._hass?.states?.[a];if(!n?.attributes?.simson_contact||n.attributes.simson_call_button)return c`<div class="empty"><h2>Choose a user</h2><p>Select a Simson user contact sensor in the card editor.</p></div>`;let r=n.attributes.user_name||n.attributes.friendly_name||"User",l=n.attributes.user_id===e._hass?.user?.id,d=n.state==="ready",o=n.attributes.notification;return c`<section class="user-workspace">
    ${i.hasCall?s(e,i):c`<div class="user-profile"><span class="call-avatar">${r.slice(0,2).toUpperCase()}</span><h2>${r}</h2><span class="user-presence ${d?"ready":""}">${l?"This is you":d?"Ready to receive a call":n.state==="unavailable"?"Unavailable":"In a call"}</span></div>
      <p class="fine-print">Calls are private to you and the recipient. They can answer from their dashboard or configured phone notification.</p>
      <div class="user-actions"><button class="primary" ?disabled=${l||!d||!i.connected||!!e._actionPending} @click=${()=>e._runAction("user:"+a,()=>e._callUserEntity(a))}>Call ${r}</button>
        <label class="toggle"><span>Start with video</span><input type="checkbox" .checked=${e._videoEnabled} @change=${h=>{e._videoEnabled=h.target.checked,e._saveMediaPreferences(),e.requestUpdate()}}></label></div>`}
    ${o?.status==="failed"||o?.status==="clear_failed"?c`<div class="notice error" role="status">Phone notification could not be ${o.status==="failed"?"sent":"cleared"}. Dashboard calling remains available; ask the administrator to check the Companion app mapping.</div>`:p}
  </section>`}var Ie=`:host {
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
.directory-toolbar input{min-width:0;width:100%;flex:1;padding:11px 12px;font-size:13px}
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
`;var Y=class extends b{static styles=ee(Ie);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession()}_bindSession(){if(!this.isConnected||!this._hass)return;let e=he(this,this._hass,this._config);this.session!==e&&(this.session&&V(this.session,this),this.session=e,this.requestUpdate()),e.hass=this._hass}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&V(this.session,this),this.session=null}updated(){if(!this.session)return;this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer();let e=this.shadowRoot.querySelector("dialog");e&&!e.open&&e.showModal(),e&&!this._dialogVisible?(this._previousFocus=this.shadowRoot.activeElement,e.querySelector("button:not(:disabled)")?.focus()):!e&&this._dialogVisible&&this._previousFocus?.focus(),this._dialogVisible=!!e}render(){let e=this.session,i=e?._view,s=this._config.view||"combined",a=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices",user:"Call a user"}[s]||"Simson",n=e?._activeTab||"dial",r=e?[...e.views]:[],l=r.find(_=>["dial","combined"].includes(_._config.view||"combined"))||r[0],d=r.find(_=>_._config.view==="live")||l,o=e&&(e._pickerOpen?l===this:d===this),h=(_,g)=>e._showCallDialog&&o?p:U(_,g);return c`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${a}</h1></div><span class="status ${i?.connected?"online":""}"><i></i>${i?.connected?"Connected":"Offline"}</span></header>
      ${i?c`
        ${i.connected?p:c`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?c`<div class="notice error" role="alert">${e._actionError}</div>`:p}
        ${e._actionPending?c`<div class="action-progress" role="status">${e._actionPending}</div>`:p}
        ${s==="dial"&&i.hasCall?c`<div class="current-call-banner" role="status"><span><b>${i.remoteLabel}</b><small>${i.isActive?"Call in progress":i.isIncoming?"Incoming call":"Calling\u2026"}</small></span><button @click=${()=>{e._showCallDialog=!0,e._render()}}>Call controls</button></div>`:p}
        ${s==="user"?Se(this,e,i,h):s==="door"?xe(this,e,i,h):s==="live"?i.hasCall?h(e,i):c`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?F(e):s==="devices"?M(e):s==="dial"?n==="media"?c`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${M(e)}`:q(e,i):c`
            ${i.hasCall?h(e,i):p}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([_,g])=>c`<button class=${n===_?"selected":""} aria-current=${n===_?"page":"false"} @click=${()=>e._selectTab(_)}>${g}</button>`)}</nav>
            ${n==="history"?F(e):n==="media"?M(e):i.hasCall?c`<p class="fine-print">End the current call before starting another.</p>`:q(e,i)}
          `}
      `:c`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${o?Ce(e):p}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${se}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",Y);export{Y as SimsonCard};
