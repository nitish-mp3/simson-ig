import{a as Q}from"./chunk-OM74RKVW.js";import{a as G,c,d as F,e as u,f as Y,g as w}from"./chunk-KLUKP4ZZ.js";var P=class extends w{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let t=e.node_id||"";if(!t&&e.connection_entity){let n=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);n&&(t=n[1])}if(!t&&e.call_state_entity){let n=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);n&&(t=n[1])}if(!t&&e.calls_count_entity){let n=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);n&&(t=n[1])}let a=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(n=>typeof n=="string"?n:n?.node_id||n?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:t,target_nodes:a,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),a.forEach(n=>{this._usersCache[n]||(this._usersCache[n]={users:[],timestamp:0})}),this._render()}};function y(i,e,t=""){return!i?.call_id||!e?!1:i.local_user_call&&i.caller_user_id===e?!0:i.direction==="outgoing"?i.caller_user_id===e:i.direction!=="incoming"||i.target_user_id&&i.target_user_id!==e||i.answered_by_user_id&&i.answered_by_user_id!==e?!1:i.status==="active"||i.state==="active"?i.answered_by_user_id===e||i.call_id===t:!0}var J=i=>class extends i{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let t=e.match(/^sensor\.simson_(.+)_connection$/);if(t){this._detectedNodeId=t[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return this._config.node_id||this._detectedNodeId}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,t=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"]];this._subscriptions=[];for(let[s,a]of t)this._hass.connection.subscribeEvents(n=>{e===this._subscriptionGeneration&&this.isConnected&&this[a](n.data)},s).then(n=>{e!==this._subscriptionGeneration||!this.isConnected?n():this._subscriptions.push(n)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(t=>{this._actionError=t?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){if(e.node_id&&e.node_id!==this._nodeId())return;e.local_user_call&&e.caller_user_id===this._hass?.user?.id&&(e={...e,direction:"outgoing"});let{call_id:t,status:s,direction:a,remote_node_id:n,call_type:r,sip_bridge_id:o,target_user_id:l,caller_user_id:_,answered_by_user_id:p}=e,d=this._hass?.user?.id||"";if(y(e,d,this._currentCallId))if(["requesting","ringing","active"].includes(s)&&(this._eventCallSnapshot={...this._eventCallSnapshot,...e,state:s}),r&&(this._currentCallType=r),clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,(s==="requesting"||s==="ringing")&&a==="outgoing")this._actionError="",this._currentCallId=t||this._currentCallId,this._currentRemoteNode=n||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){this._actionError="",console.log("[Simson] call_status active",{call_id:t,call_type:r,sip_bridge_id:o,direction:a,remote_node_id:n});let m=this._answeredByMe||this._answerPendingCallId===t;if(a==="incoming"&&!m){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:t}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),a==="incoming"&&p&&p!==d){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._render();return}this._currentCallId=t,m&&(this._answeredByMe=!0),this._answerPendingCallId=null,this._currentRemoteNode=n,o&&(this._sipBridgeId=o);let h=r==="sip"||String(n||"").startsWith("sip:")||String(n||"").startsWith("asterisk:");this._isCaller=a==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification();let g=this._initiatedHere||m;h&&g?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(v=>console.error("[Simson] SIP active start:",v)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:t,remote_node_id:n}):!h&&g&&this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&((this._endedCallIds||=new Set).add(t),this._endedCallIds.size>100&&this._endedCallIds.delete(this._endedCallIds.values().next().value),this._eventCallSnapshot=null,this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._initiatedHere=!1,this._actionError=s==="failed"?"The call could not be started. Check the selected gateway or SIP phone.":"",setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){if(e.node_id&&e.node_id!==this._nodeId())return;let{call_id:t,from_node_id:s,from_label:a,call_type:n,target_user_id:r,metadata:o}=e;if(r&&this._hass?.user?.id&&r!==this._hass.user.id){this._ignoredCallId=t;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:t,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=t;return}let l=s+"|"+n;if(this._lastIncomingCall===l&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=l,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=t,this._currentCallType=n||"voice",this._eventCallSnapshot={...o,call_id:t,state:"incoming",direction:"incoming",remote_node_id:s,remote_label:a,call_type:n,target_user_id:r},this._currentRemoteNode=s,this._incomingFrom=a||s,this._incomingCallType=n||"voice",this._sipBridgeId=n==="sip"&&o?.sip_bridge_id?o.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===t&&(console.log("[Simson] Incoming call timeout - clearing phantom call",t),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let t=e.node_id||this._selectedNode;if(t&&(this._usersCache[t]={users:e.users,timestamp:Date.now()}),this._transferLoading&&t===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return this._hass?.states[`sensor.simson_${this._nodeId()}_${e}`]}_val(e,t="unknown"){return this._entity(e)?.state??t}_attr(e,t,s=null){return this._entity(e)?.attributes?.[t]??s}_effectivePstnTrunk(e=!0){let t=e?String(this._pstnTrunkDraft||"").trim():"";if(t)return t;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let a=this._attr("connection","routing",{})||{},n=String(a.default_gateway_trunk||"").trim();if(n)return n;let r=(this._targets||[]).find(o=>(o.type==="gateway"||o.trunk)&&o.trunk);return r?.trunk?String(r.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._visibleCall()?.state||"idle";return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,t=""){return this._visibleCall()?.[e]??t}_visibleCall(){let e=this._hass?.user?.id||"",t=this._attr("calls_count","active_calls",[])||[],s=this._entity("call_state"),a=[this._eventCallSnapshot,...t,{...s?.attributes,state:s?.state}].filter(r=>r&&!this._endedCallIds?.has(r.call_id)),n=a.find(r=>r.call_id===this._currentCallId&&y(r,e,this._currentCallId))||a.find(r=>y(r,e,this._currentCallId));return n?.local_user_call&&n.caller_user_id===e?{...n,direction:"outgoing",remote_label:n.target_user_name||n.remote_label}:n}_isStaleRingingCall(){let e=Number(this._visibleCall()?.started_at||0);return e?Date.now()-e*1e3>9e4:!1}async _callService(e,t={}){if(this._hass)try{await this._hass.callService("simson",e,t),setTimeout(()=>this._render(),250)}catch(s){return(e==="make_call"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let t=this._usersCache[e];if(t&&Date.now()-t.timestamp<3e3){this._remoteUsers=t.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var K=i=>class extends i{_beginOutgoingCall(e,t,s=""){this._initiatedHere=!0,this._currentRemoteNode=e||this._currentRemoteNode,this._currentRemoteLabel=s,this._currentCallType=t||"",this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._actionError="",clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=setTimeout(()=>{this._outgoingUiTimer=null,!(!this._isCaller||this._currentCallId||!this._outgoingIntentAt)&&(this._outgoingIntentAt=0,this._isCaller=!1,this._currentCallType="",this._actionError="No call status came back from the node. Check the gateway or SIP phone registration, then retry.",this._render())},45e3),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,t,s=650){let a=String(e||"action"),n=Date.now();if(!this._actionLocks.has(a)&&!(n-(this._lastActionAt[a]||0)<s)){this._lastActionAt[a]=n,this._actionLocks.add(a),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(t())}catch(r){console.error("[Simson] action failed:",a,r),this._actionError=r?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(a),s)}}}_bindAction(e,t,s,a=650){if(!e)return;let n=r=>{r.preventDefault(),r.stopPropagation(),this._runAction(t,s,a)};e.addEventListener("pointerup",n),e.addEventListener("click",n)}_dial(e,t,s){if(!e)return;let a=this._videoEnabled?"video":"voice";this._beginOutgoingCall(e,a,s||"");let n={target_node_id:e,call_type:a,caller_user_id:this._hass?.user?.id||""};return t&&(n.target_user_id=t,n.target_user_name=s||""),this._callService("make_call",n)}_dialTarget(e,t,s){let n=["asterisk","sip","gateway"].includes(t)?"sip":this._videoEnabled?"video":"voice";return this._beginOutgoingCall(s||e,n),this._callService("make_call",{target_id:e,call_type:n,caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let t=this._effectivePstnTrunk();return this._dialPSTNNumber(e,t)}return this._beginOutgoingCall(e,"sip"),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,t=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let n=String(t||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`,"sip"),this._callService("make_call",{phone_number:s,trunk:n,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let t=String(e||"").trim(),s=t.replace(/\D/g,"");return t.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){this._initiatedHere=!1,this._currentCallId&&(this._endedCallIds||=new Set).add(this._currentCallId),this._eventCallSnapshot=null,clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}async _answer(e=this._activeCallAttr("call_id")||this._currentCallId){if(!e)return;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!1,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0;let t=await this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""});if(this._currentCallId===e){if(t===!1){this._answerPendingCallId=null,this._answeredByMe=!1,this._callStart=null,this._render();return}this._answeredByMe=!0,this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(s=>console.error("[Simson] SIP answer start:",s))}}_reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._callService("reject_call",{call_id:e,reason:"declined"}).catch(()=>{}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._callStart=null,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._incomingSuppressUntil=Date.now()+8e3,this._render()}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,t="",s=""){let a=this._activeCallAttr("call_id")||this._currentCallId,n=String(e||"").trim();!a||!n||this._callService("transfer_call",{call_id:a,target_node_id:n,target_user_id:t||"",target_user_name:s||""})}_loadTransferUsers(e){let t=String(e||"").trim();if(!t)return;let s=this._usersCache[t];if(this._transferNodeDraft=t,this._transferUsersNode=t,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:t}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._render()}_smartDialRoute(e,t=this._smartRouteMode||"auto"){let s=String(e||"").trim(),a=String(t||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(a==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(a==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(a==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let n=s.toLowerCase(),r=s.replace(/[^\d+]/g,""),o=r.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:r.startsWith("+")||o.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(_=>String(_.node_id||_.id||"").toLowerCase()===n||String(_.label||"").toLowerCase()===n)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,t=""){let s=String(e||"").trim();if(!s)return;let a=this._smartDialRoute(s);if(this._nodeInputDraft=s,a.kind==="pstn"){let r=String(t||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=r,this._dialPSTNNumber(s,r)}if(a.kind==="sip"){let r=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=r,this._dialSIPExtension(r)}let n=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=n,this._userPickerNodeId=n,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:n})}};var M="simson.card.media.v1",X=i=>class extends i{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(M)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(M)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(M,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let t=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:t,video:s}}async _enableCamera(){let e=this._pc;if(!e||this._localStream?.getVideoTracks().length||this._enablingCamera)return;this._enablingCamera=!0;let t;try{try{t=await navigator.mediaDevices.getUserMedia({audio:!1,video:this._mediaConstraints(!0).video})}catch(s){if(!["NotFoundError","OverconstrainedError"].includes(s.name))throw s;t=await navigator.mediaDevices.getUserMedia({audio:!1,video:!0})}if(this._pc!==e||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._localStream||=new MediaStream,t.getVideoTracks().forEach(s=>{this._localStream.addTrack(s),e.addTrack(s,this._localStream)}),this._cameraMuted=!1,this._mediaDeviceError=""}catch(s){t?.getTracks().forEach(a=>a.stop()),this._mediaDeviceError=s.message||"Camera unavailable. Audio continues."}finally{this._enablingCamera=!1,this._render()}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let t=null;try{if(e){try{t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(a){if(!this._videoEnabled)throw a;t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(a=>a.kind==="audioinput"),videoInputs:s.filter(a=>a.kind==="videoinput"),audioOutputs:s.filter(a=>a.kind==="audiooutput")},this._mediaDevices.audioInputs.length&&!this._mediaDevices.audioInputs.some(a=>a.deviceId===this._selectedAudioInput)&&(this._selectedAudioInput=""),this._mediaDevices.videoInputs.length&&!this._mediaDevices.videoInputs.some(a=>a.deviceId===this._selectedVideoInput)&&(this._selectedVideoInput=""),this._mediaDevices.audioOutputs.length&&!this._mediaDevices.audioOutputs.some(a=>a.deviceId===this._selectedAudioOutput)&&(this._selectedAudioOutput=""),this._mediaDevicesLoaded=!0,this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{t?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(t){if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&(this._selectedAudioInput||e&&this._selectedVideoInput)){this._selectedAudioInput="",this._selectedVideoInput="",this._saveMediaPreferences();try{let s=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e));return this._mediaDeviceError="A saved device is unavailable. Using the system default instead.",s}catch(s){t=s}}if(e){this._mediaDeviceError="Camera access is unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){t=s}}if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw t}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let t=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=t,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(t){this._mediaDeviceError=t?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(t=>t.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let t=this._root()?.querySelector("#remote-video");t&&this._remoteStream?.getVideoTracks?.().length&&t.srcObject!==this._remoteStream&&(t.srcObject=this._remoteStream,t.play().catch(()=>{}));let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._applyAudioOutput()}async _applyAudioOutput(){if(!this._remoteAudio?.setSinkId){if(!this._selectedAudioOutput)return;this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="This browser cannot select a speaker. Using its system default.",this._render();return}if(this._remoteAudio.sinkId!==this._selectedAudioOutput)try{await this._remoteAudio.setSinkId(this._selectedAudioOutput)}catch{this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="Could not select that speaker. Call audio is using the system default.",this._render()}}};var S=[{urls:"stun:stun.l.google.com:19302"}];var Z=i=>class extends i{async _fetchWebRTCConfig(){let e=this._currentCallId||"";if(this._webrtcConfig&&this._webrtcConfigCallId===e)return this._webrtcConfig;if(this._webrtcConfigPromise)return this._webrtcConfigPromiseCallId===e?this._webrtcConfigPromise:(await this._webrtcConfigPromise,this._fetchWebRTCConfig());if(this._webrtcConfigRetryCallId===e&&Date.now()<(this._webrtcConfigNextRetryAt||0))return{ice_servers:S,sip:{enabled:!1}};this._webrtcConfigPromiseCallId=e,this._webrtcConfigPromise=(async()=>{try{let t=this._hass?.auth?.data?.access_token,s=await fetch("/api/webrtc-config?call_id="+encodeURIComponent(e),{headers:t?{Authorization:"Bearer "+t}:{},signal:AbortSignal.timeout(8e3)});if(s.ok)return this._webrtcConfig=await s.json(),this._webrtcConfigCallId=e,this._webrtcConfigNextRetryAt=0,this._webrtcConfig}catch{}return this._webrtcConfigRetryCallId=e,this._webrtcConfigNextRetryAt=Date.now()+3e4,{ice_servers:S,sip:{enabled:!1}}})();try{let t=await this._webrtcConfigPromise;return this._turnAvailable=this._hasTurnRelay(t),this.isConnected&&this._render(),t}finally{this._webrtcConfigPromise=null}}_hasTurnRelay(e){return(Array.isArray(e?.ice_servers)?e.ice_servers:[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(n=>/^(turn|turns):/i.test(String(n||""))))}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{let t=(async()=>{if(!navigator.mediaDevices?.getUserMedia){this._micAllowed=!1;return}try{let n=this._currentCallType||this._activeCallAttr("call_type","")||this._incomingCallType||"voice",r=await this._captureMedia(["video","webrtc-video"].includes(n));if(e!==this._rtcGeneration||!this.isConnected){r.getTracks().forEach(o=>o.stop());return}this._localStream=r,this._micAllowed=!0}catch(n){this._micAllowed=!1,this._mediaDeviceError=n?.message||"Allow microphone access to speak."}})(),[s]=await Promise.all([this._fetchWebRTCConfig(),t]);if(e!==this._rtcGeneration||!this.isConnected)return;let a=Array.isArray(s.ice_servers)?s.ice_servers:S;if(this._turnAvailable=this._hasTurnRelay({ice_servers:a}),e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:a}),this._pendingCandidates=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(n=>{this._pc.addTrack(n,this._localStream)}),this._pc.ontrack=n=>{if(n.streams?.[0])this._attachRemoteMedia(n.streams[0],null);else{let r=new MediaStream;r.addTrack(n.track),this._attachRemoteMedia(r,n.track)}},this._pc.onicecandidate=n=>{n.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:n.candidate.candidate,sdpMid:n.candidate.sdpMid,sdpMLineIndex:n.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(n){console.error("Simson: negotiation error:",n)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let n=this._pc?.connectionState;if(n==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(n==="disconnected")this._audioQuality=1;else if(n==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._mediaDeviceError=this._turnAvailable?"The media connection failed. Check network/firewall access and try again.":"The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.",this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let n=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(n)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:t,from_node_id:s,signal_type:a,data:n}=e;if(!(n?.simson_sender_user_id&&n.simson_sender_user_id===this._hass?.user?.id)&&!(!t||!this._currentCallId||t!==this._currentCallId)&&!(!this._initiatedHere&&!this._answeredByMe&&this._answerPendingCallId!==t)&&!(s&&this._currentRemoteNode&&s!==this._currentRemoteNode))if(a==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;if(this._makingOffer||this._pc.signalingState!=="stable"){if(!this._polite)return;await this._pc.setLocalDescription({type:"rollback"})}if(await this._pc.setRemoteDescription(new RTCSessionDescription(n)),!this._isCaller&&this._localStream){let o=new Set([...String(n?.sdp||"").matchAll(/^m=(audio|video)\s/gm)].map(_=>_[1])),l=this._pc.getSenders();this._localStream.getTracks().filter(_=>o.has(_.kind)).filter(_=>!l.some(p=>p.track?.kind===_.kind)).forEach(_=>this._pc.addTrack(_,this._localStream))}await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let o of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(o));this._pendingCandidates=[]}else if(a==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"){await this._pc.setRemoteDescription(new RTCSessionDescription(n));for(let r of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(r));this._pendingCandidates=[]}}else a==="ice-candidate"&&(this._pc&&this._pc.remoteDescription?await this._pc.addIceCandidate(new RTCIceCandidate(n)):this._pendingCandidates.push(n))}_sendWebRTCSignal(e,t){let s=this._activeCallAttr("call_id")||this._currentCallId,a=this._currentRemoteNode;!s||!a||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:a,signal_type:e,data:t}).catch(n=>console.error("Simson: signal send failed:",n))}_cleanupWebRTC(){this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(e=>e.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,t=null){if(!e&&t&&(e=new MediaStream,e.addTrack(t)),!e)return;this._remoteStream=e,this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.srcObject=e;let s=e.getAudioTracks?e.getAudioTracks():[];console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(a=>a.readyState),muted:s.map(a=>a.muted)}),this._remoteAudio.play().catch(a=>{console.warn("[Simson] remote audio play blocked/failed:",a?.message||a)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,t=null){this._attachRemoteMedia(e,t)}async _updateQuality(){if(this._pc)try{let e=await this._pc.getStats(),t=0,s=0,a=0;e.forEach(r=>{if(r.type==="inbound-rtp"&&r.kind==="audio"&&(t=r.jitter||0,s=r.packetsLost||0,a=r.packetsReceived||1),r.type==="candidate-pair"&&r.state==="succeeded"){let o=e.get?e.get(r.remoteCandidateId):null;o?.candidateType&&(this._connectionType=o.candidateType)}});let n=s/Math.max(a,1);n>.1||t>.1?this._audioQuality=1:n>.03||t>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var ee=i=>class extends i{_cleanupSIPUA(){if(this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e||!this._initiatedHere&&!this._answeredByMe&&!this._answerPendingCallId)return;if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let t,s;try{[{MinimalSIPUA:t},s]=await Promise.all([import("./sip-ua-6HJZI4WV.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._actionError="Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let a=s.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:a.enabled,ws_url:a.ws_url,username:a.username,domain:a.domain})),!a.enabled||!a.ws_url||!a.username||!a.password){this._actionError="Phone audio is unavailable. Check the addon connection.",this._render(),this._pendingSIPBridgeId=null;return}let n="sip:"+a.username+"@"+a.domain;this._sipUA=new t({uri:n,captureMedia:()=>this._captureMedia(!1),password:a.password,wsUrl:a.ws_url,iceServers:s.ice_servers||S,onAudioTrack:(r,o)=>{this._attachRemoteAudio(r,o)},onRegistered:()=>{this._sipUA._activeBridge=e,this._pendingSIPBridgeId=null,this._sipUA.dial(e).catch(r=>{console.error("Simson SIP dial error:",r),this._cleanupSIPUA()})},onError:r=>{console.error("Simson SIP UA error:",r),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render()},onBye:()=>{this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render()}}),this._sipUA.connect()}};var te=i=>class extends i{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let t=e.createOscillator(),s=e.createGain();t.connect(s),s.connect(e.destination),t.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),t.start(e.currentTime),t.stop(e.currentTime+.4),setTimeout(()=>{let a=e.createOscillator(),n=e.createGain();a.connect(n),n.connect(e.destination),a.frequency.value=480,n.gain.setValueAtTime(.15,e.currentTime),n.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),a.start(e.currentTime),a.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,t){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${t} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var ie=i=>class extends i{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let t=Math.round(e);if(t<60)return`${t}s`;let s=Math.floor(t/60),a=t%60;return s<60?`${s}m ${a}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let t=new Date(e*1e3),s=new Date,a=t.toDateString()===s.toDateString(),n=new Date(s);n.setDate(n.getDate()-1);let r=t.toDateString()===n.toDateString(),o=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return a?o:r?`Yesterday ${o}`:t.toLocaleDateString([],{month:"short",day:"numeric"})+" "+o}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let t=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(t/60)).padStart(2,"0"),a=String(t%60).padStart(2,"0");e.textContent=`${s}:${a}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function se(){let i=this._nodeId(),e=this._isConnected(),t=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",a=this._activeCallAttr("direction",""),n=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<45e3,r=n?"outgoing":a,o=this._hass?.user?.id||"",l=this._activeCallAttr("target_user_id",""),_=this._activeCallAttr("caller_user_id",""),p=this._activeCallAttr("answered_by_user_id",""),d=y({call_id:s,direction:a,state:t,target_user_id:l,caller_user_id:_,answered_by_user_id:p},o,this._currentCallId),f=["incoming","requesting","ringing","active"],m=n&&(!d||!f.includes(t)),h=m?"requesting":d&&f.includes(t)&&s?m?"requesting":t:"idle",g=h==="idle"||h==="unknown",v=h==="incoming"&&r!=="outgoing"&&!this._isCaller,C=h==="requesting"||h==="ringing",W=h==="active",we=h==="missed",ye=h==="declined",Se=h==="timeout",z=v||C||W,xe=!!this._pc,T=this._activeCallAttr("call_type",""),q=this._activeCallAttr("sip_bridge_id",""),fe=this._initiatedHere&&this._currentRemoteLabel||m&&String(this._currentRemoteNode||"").replace(/^phone:/,"")||this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||String(this._currentRemoteNode||"").replace(/^phone:/,"")||(r==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&d&&(this._currentCallId=s),z&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let k=this._prevCallState;if(k!==h)if(this._prevCallState=h,h==="incoming"&&k==="idle")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentCallType=T||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=this._activeCallAttr("remote_label")||this._currentRemoteNode||"Unknown",this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(h==="active"&&k!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentCallType=T||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),q&&(this._sipBridgeId=q),this._isCaller=r==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let $=Number(this._activeCallAttr("started_at",0));this._callStart=$>0?$*1e3:Date.now()}let U=T==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:"),j=this._initiatedHere||this._answeredByMe||this._answerPendingCallId===s;U&&j?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch($=>console.error("[Simson] SIP state active start:",$)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):!U&&j&&this._startWebRTC()}else h==="idle"&&k!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));return C&&d&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id","")),{nodeId:i,connected:e,direction:r,isIdle:g,isIncoming:v,isRinging:C,isActive:W,hasCall:z,activeCallType:T,remoteLabel:fe,callId:s}}var ge=ie(te(ee(Z(X(K(J(P))))))),I=class extends ge{views=new Set;set hass(e){let t=this._hass;t?.user?.id&&t.user.id!==e?.user?.id&&(this._cleanupWebRTC(),this._cleanupSIPUA(),this._clearLocalCallState(),this._webrtcConfig=null,this._webrtcConfigCallId=null),t?.connection&&t.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=this._nodeId(),a=["connection","call_state","active_call","calls_count"],n=Object.keys(e?.states||{}).filter(o=>e.states[o].attributes?.simson_contact);(!t||t.user?.id!==e?.user?.id||n.some(o=>t.states?.[o]!==e.states[o])||a.some(o=>t.states?.[`sensor.simson_${s}_${o}`]!==e?.states?.[`sensor.simson_${s}_${o}`]))&&this.requestUpdate()}_connectHA(){if(this._hass){if(!this._notificationHandoffChecked&&this._hass.user?.id){let e=new URL(window.location.href),t=e.searchParams.get("simson_node");if(!t||t===this._nodeId()){this._notificationHandoffChecked=!0;let s=e.searchParams.get("simson_action"),a=e.searchParams.get("simson_call");if(a&&["answer","decline"].includes(s)){for(let r of["simson_action","simson_call","simson_node"])e.searchParams.delete(r);window.history.replaceState(window.history.state,"",e),s==="answer"?this._answer(a):this._callService("reject_call",{call_id:a,reason:"declined_from_notification"})}let n=e.searchParams.get("simson_answer");n&&(this._answerPendingCallId=n,this._currentCallId=n,e.searchParams.delete("simson_answer"),e.searchParams.delete("simson_node"),window.history.replaceState(window.history.state,"",e))}}this._haEventSubscribed||this._subscribeHAEvents(),!this._webrtcConfig&&!this._webrtcConfigPromise&&this._fetchWebRTCConfig(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets()}}connectedCallback(){super.connectedCallback(),this._connectHA(),this._mediaDevicesLoaded||this._refreshMediaDevices(!1),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),clearTimeout(this._outgoingUiTimer),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?se.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return u}};customElements.get("simson-call-session")||customElements.define("simson-call-session",I);var ne=new WeakMap;function ae(i,e,t){let s=e.connection||e,a=ne.get(s);a||ne.set(s,a=new Map);let r=t.node_id||[t.connection_entity,t.call_state_entity,t.calls_count_entity].map(_=>_?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(_=>_.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",o=`${e.user?.id||""}:${r}`,l=a.get(o);if(l||(l=new I,l.hidden=!0,l.setConfig({...t,node_id:r}),l.hass=e,l._release=()=>a.delete(o),a.set(o,l),document.body.append(l)),clearTimeout(l._releaseTimer),!l.views.has(i)||i._sessionConfig!==t){l.views.add(i),i._sessionConfig=t;let _=l._config,p=[...l.views].flatMap(d=>{let f=d._config.target_nodes;return Array.isArray(f)?f:f?[f]:[]});l.setConfig({..._,...t,node_id:r,target_nodes:p}),t.view==="history"&&l._loadHistory(),t.view==="devices"&&l._refreshMediaDevices(!1)}return l}function O(i,e){i.views.delete(e),i.views.size||(i._releaseTimer=setTimeout(()=>{i.views.size||(i.remove(),i._release())},0))}var re={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},oe=i=>(...e)=>({_$litDirective$:i,values:e}),R=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:ve}=Y,le=i=>i;var ce=()=>document.createComment(""),x=(i,e,t)=>{let s=i._$AA.parentNode,a=e===void 0?i._$AB:e._$AA;if(t===void 0){let n=s.insertBefore(ce(),a),r=s.insertBefore(ce(),a);t=new ve(n,r,i,i.options)}else{let n=t._$AB.nextSibling,r=t._$AM,o=r!==i;if(o){let l;t._$AQ?.(i),t._$AM=i,t._$AP!==void 0&&(l=i._$AU)!==r._$AU&&t._$AP(l)}if(n!==a||o){let l=t._$AA;for(;l!==n;){let _=le(l).nextSibling;le(s).insertBefore(l,a),l=_}}}return t},b=(i,e,t=i)=>(i._$AI(e,t),i),be={},de=(i,e=be)=>i._$AH=e,_e=i=>i._$AH,E=i=>{i._$AR(),i._$AA.remove()};var he=(i,e,t)=>{let s=new Map;for(let a=e;a<=t;a++)s.set(i[a],a);return s},A=oe(class extends R{constructor(i){if(super(i),i.type!==re.CHILD)throw Error("repeat() can only be used in text expressions")}dt(i,e,t){let s;t===void 0?t=e:e!==void 0&&(s=e);let a=[],n=[],r=0;for(let o of i)a[r]=s?s(o,r):r,n[r]=t(o,r),r++;return{values:n,keys:a}}render(i,e,t){return this.dt(i,e,t).values}update(i,[e,t,s]){let a=_e(i),{values:n,keys:r}=this.dt(e,t,s);if(!Array.isArray(a))return this.ut=r,n;let o=this.ut??=[],l=[],_,p,d=0,f=a.length-1,m=0,h=n.length-1;for(;d<=f&&m<=h;)if(a[d]===null)d++;else if(a[f]===null)f--;else if(o[d]===r[m])l[m]=b(a[d],n[m]),d++,m++;else if(o[f]===r[h])l[h]=b(a[f],n[h]),f--,h--;else if(o[d]===r[h])l[h]=b(a[d],n[h]),x(i,l[h+1],a[d]),d++,h--;else if(o[f]===r[m])l[m]=b(a[f],n[m]),x(i,a[d],a[f]),f--,m++;else if(_===void 0&&(_=he(r,m,h),p=he(o,d,f)),_.has(o[d]))if(_.has(o[f])){let g=p.get(r[m]),v=g!==void 0?a[g]:null;if(v===null){let C=x(i,a[d]);b(C,n[m]),l[m]=C}else l[m]=b(v,n[m]),x(i,a[d],v),a[g]=null;m++}else E(a[f]),f--;else E(a[d]),d++;for(;m<=h;){let g=x(i,l[h+1]);b(g,n[m]),l[m++]=g}for(;d<=f;){let g=a[d++];g!==null&&E(g)}return this.ut=r,de(i,l),F}});function L(i,e){let t=i._smartDialRoute(i._nodeInputDraft),s=[...i._targets];for(let o of i._config.target_nodes||[])s.some(l=>(l.node_id||l.id)===o)||s.push({id:o,node_id:o,label:o,type:"node"});let a=e.connected&&!e.hasCall,n=Object.entries(i._hass?.states||{}).filter(([,o])=>o.attributes?.simson_contact&&o.attributes.node_id===i._nodeId()&&o.attributes.user_id!==i._hass?.user?.id),r=()=>a&&i._runAction("dial",()=>i._dialSmartValue(i._nodeInputDraft,i._pstnTrunkDraft));return c`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>A teammate, a room, or a number. One place to call.</p></div>
    ${n.length?c`<div class="section-heading"><h3>People at this site</h3><span>${n.length} contacts</span></div>
      <div class="contacts">${A(n,([o])=>o,([o,l])=>c`<button class="contact" ?disabled=${!a||!!i._actionPending||l.state==="unavailable"}
        @click=${()=>i._runAction("user:"+o,()=>i._dial(i._nodeId(),l.attributes.user_id,l.attributes.user_name))}>
        <span class="avatar">${String(l.attributes.user_name||"User").slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${l.attributes.user_name}</b><small>${l.state==="ready"?"Call directly":l.state}</small></span><span>↗</span></button>`)}</div>`:u}
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([o,l])=>c`<button class=${i._smartRouteMode===o?"selected":""} aria-pressed=${i._smartRouteMode===o} @click=${()=>{i._smartRouteMode=o,i.requestUpdate()}}>${l}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${i._nodeInputDraft} placeholder="Search a node or dial a number" @input=${o=>{i._nodeInputDraft=o.target.value,i.requestUpdate()}} @keydown=${o=>{o.key==="Enter"&&r()}}><button class="primary" aria-label="Place call" ?disabled=${!a||!!i._actionPending||!i._nodeInputDraft.trim()} @click=${r}>Call ↗</button></div></label>
    <div class="route-hint"><span>${t.label}</span><small>${t.hint}</small></div>
    <label class="toggle node-video-toggle"><span><b>Video for node-to-node calls</b><small>Turn on once to grant camera access. SIP and gateway calls stay audio-only.</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${o=>{i._videoEnabled=o.target.checked,i._saveMediaPreferences(),i.requestUpdate(),i._videoEnabled&&i._refreshMediaDevices(!0)}}></label>
    ${i._videoEnabled&&!globalThis.isSecureContext?c`<div class="notice error" role="status">Camera and microphone access require HTTPS. Open this dashboard using its secure address.</div>`:u}
    ${i._videoEnabled&&i._turnAvailable===!1?c`<div class="notice error" role="status">No TURN relay is configured. Calls may fail on mobile or restrictive networks; ask the administrator to enable coturn.</div>`:u}
    ${t.kind==="pstn"?c`<label class="field"><span>Gateway trunk</span><input .value=${i._pstnTrunkDraft||i._effectivePstnTrunk()} placeholder="Site default" @input=${o=>{i._pstnTrunkDraft=o.target.value}}></label>`:u}
    <div class="section-heading"><h3>Quick connections</h3><span>${s.length} saved</span></div>
    ${s.length?c`<div class="contacts">${A(s,o=>o.id,o=>c`<button class="contact" ?disabled=${!a||!!i._actionPending} @click=${()=>{(o.type||"node")==="node"?(i._userPickerNodeId=o.node_id||o.id,i._userPickerTargetId=o.id,i._callService("get_remote_users",{node_id:i._userPickerNodeId})):i._runAction("target:"+o.id,()=>i._dialTarget(o.id,o.type,o.node_id))}}><span class="avatar">${String(o.label||o.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${o.label||o.id}</b><small>${o.type==="node"?"Home Assistant":o.trunk?"Gateway \xB7 "+o.trunk:"SIP \xB7 "+(o.extension||o.id)}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:c`<div class="empty compact">${i._targetsLoading?"Loading your contacts\u2026":"Saved nodes and phones appear here. You can always dial above."}</div>`}
    <button class="text-button" @click=${()=>i._selectTab("media")}>${i._videoEnabled?"Camera enabled for node calls":"Audio calls"} · Check your devices →</button>
  </section>`}function D(i,e){let t=!!i._localStream?.getVideoTracks().length,s=!!i._remoteStream?.getVideoTracks().length,a=e.isActive&&(t||s),n=e.activeCallType==="sip"||i._currentCallType==="sip",r=n?!!i._sipUA?._activeBridge:i._pc?.connectionState==="connected",o=["video","webrtc-video"].includes(i._incomingCallType||e.activeCallType),l=i._mediaDeviceError?.startsWith("The media connection failed."),_=e.isActive?l?"Media connection failed":r?"Connected":"Connecting media\u2026":e.isIncoming?o?"Incoming video call":"Would like to talk to you":e.callId?"Ringing \xB7 Waiting for an answer\u2026":"Sending your call request to the node\u2026",p=(d,f)=>()=>i._runAction(d,f);return c`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":e.callId?"CALLING":"STARTING YOUR CALL"}</span>
    ${a?c`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?u:c`<span class="video-wait">Waiting for their camera</span>`}${t?c`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:u}<span class="live-label">LIVE</span></div>`:c`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption" role="status">${_} <span id="call-timer"></span></p>
    ${!e.isActive&&!e.isIncoming?c`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${e.callId?"The destination is being called":"Connecting to your call service"}</b><small>${e.callId?"You can stay here while the other phone rings.":"This card will update as soon as the node responds."}</small></span></div>`:u}
    ${i._micAllowed===!1?c`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:u}
    ${i._mediaDeviceError?c`<div class="notice error" role="status">${i._mediaDeviceError}</div>`:u}
    <div class="call-actions">
      ${e.isIncoming?c`<button class="primary" @click=${p("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${p("reject",()=>i._reject())}>Decline</button>`:c`
        <button aria-pressed=${i._muted} ?disabled=${!e.isActive} @click=${p("mute",()=>i._toggleMute())}>${i._muted?"Unmute":"Mute"}</button>
        ${t?c`<button aria-pressed=${i._cameraMuted} @click=${p("camera",()=>i._toggleCamera())}>${i._cameraMuted?"Camera on":"Camera off"}</button>`:u}
        ${e.isActive&&!n&&!t&&i._pc?c`<button @click=${p("enable-camera",()=>i._enableCamera())}>Enable camera</button>`:u}
        <button class="danger" ?disabled=${!e.callId} @click=${p("hangup",()=>i._hangup())}>${e.callId?"End call":"Starting\u2026"}</button>
      `}
    </div>
    ${e.isActive&&(i._sipBridgeId||e.activeCallType==="sip")?c`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${i._transferNodeDraft} @input=${d=>{i._transferNodeDraft=d.target.value,i.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!i._transferNodeDraft.trim()} @click=${p("transfer-node",()=>i._transferCall(i._transferNodeDraft))}>To node</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${p("transfer-sip",()=>i._transferCall("sip:"+i._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${()=>i._loadTransferUsers(i._transferNodeDraft)}>Choose user</button></div>${i._transferUsers.map(d=>c`<button class="contact" @click=${p("transfer-user:"+d.user_id,()=>i._transferCall(i._transferUsersNode,d.user_id,d.user_name))}>${d.user_name}</button>`)}</details>`:u}
  </section>`}function B(i){return c`<section><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>i._loadHistory()}>Refresh</button></div>${i._history.length?c`<div class="history">${A(i._history.slice(0,50),(e,t)=>e.call_id||t,e=>c`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(e.state)?"missed":""}">${e.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${e.remote_label||e.remote_node_id||"Unknown caller"}</b><small>${e.state} · ${i._formatDuration(e.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{i._nodeInputDraft=e.remote_node_id||"",i._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:c`<div class="empty">${i._historyLoaded?"Your conversations will appear here.":"Loading recent calls\u2026"}</div>`}</section>`}function N(i){let e=i._mediaDevices,t=(s,a,n)=>c`<label class="field"><span>${s}</span><select .value=${i[n]} @change=${r=>{i[n]=r.target.value,i._saveMediaPreferences(),n==="_selectedAudioOutput"&&i._applyAudioOutput(),i._mediaPreviewStream&&i._startMediaPreview(),i.requestUpdate()}}><option value="">System default</option>${a.map((r,o)=>c`<option value=${r.deviceId}>${r.label||s+" "+(o+1)}</option>`)}</select></label>`;return c`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>i._runAction("detect",()=>i._refreshMediaDevices(!0))}>Detect</button></div>
    ${i._mediaDeviceError?c`<div class="notice error" role="alert">${i._mediaDeviceError}</div>`:u}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${i._mediaPreviewStream?.getVideoTracks().length?u:c`<div class="preview-empty"><b>${i._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${i._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Turn on once to grant camera access before a call</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${s=>{i._videoEnabled=s.target.checked,i._saveMediaPreferences(),i._mediaPreviewStream?i._startMediaPreview():i._videoEnabled&&i._refreshMediaDevices(!0),i.requestUpdate()}}></label>
    <div class="device-grid">${t("Microphone",e.audioInputs,"_selectedAudioInput")}${t("Camera",e.videoInputs,"_selectedVideoInput")}${t("Speaker",e.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>i._runAction("preview",()=>i._startMediaPreview())}>${i._mediaPreviewStream?"Restart preview":"Test devices"}</button>${i._mediaPreviewStream?c`<button @click=${()=>i._stopMediaPreview()}>Stop preview</button>`:u}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${i._notifPermission==="default"?c`<button class="text-button" @click=${()=>i._requestNotificationPermission()}>Enable incoming-call notifications</button>`:u}
  </section>`}function ue(i){if(!i._pickerOpen&&!i._showPopup)return u;let e=i._pickerOpen,t=s=>{let a=i._userPickerNodeId;i._removeUserPicker(),i._runAction("call-user",()=>i._dial(a,s?.user_id,s?.user_name))};return c`<div class="dialog-scrim"><section class="dialog" role="dialog" aria-modal="true" aria-label=${e?"Choose call recipient":"Incoming call"} @keydown=${s=>{s.key==="Escape"&&e&&i._removeUserPicker()}}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?i._userPickerNodeId:i._incomingFrom}</h2>
    ${e?c`<div class="dialog-options"><button class="primary" @click=${()=>t(null)}>Call everyone on this node</button>${i._remoteUsers.map(s=>c`<button @click=${()=>t(s)}>${s.user_name||s.user_id}</button>`)}</div><button class="text-button" @click=${()=>i._removeUserPicker()}>Cancel</button>`:c`<p>Would like to talk to you.</p><div class="call-actions"><button class="primary" @click=${()=>i._runAction("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${()=>i._runAction("reject",()=>i._reject())}>Decline</button></div>`}
  </section></div>`}var H=class extends w{static properties={hass:{attribute:!1},entity:{},live:{type:Boolean}};createRenderRoot(){return this}updated(){let e=`${this.entity}:${this.live}:${!!this.hass?.states?.[this.entity]}`;this._key!==e&&(this._key=e,this._load(e)),this._camera&&(this._camera.hass=this.hass)}async _load(e){this._camera=null;let t=this.querySelector(".camera-container");if(t){if(t.replaceChildren(),!this.entity||!this.hass?.states?.[this.entity]){t.textContent="Choose your Home Assistant camera entity in the card editor.";return}try{let a=(await window.loadCardHelpers()).createCardElement({type:"picture-entity",entity:this.entity,camera_view:this.live?"live":"auto",show_name:!1,show_state:!1,tap_action:{action:"none"},hold_action:{action:"none"}});if(this._key!==e||!this.isConnected)return;a.hass=this.hass,this._camera=a,t.replaceChildren(a)}catch{this._key===e&&(t.textContent="Camera could not load. Check its Home Assistant integration.")}}}render(){return c`<div class="camera-container"></div>`}};customElements.get("simson-door-camera")||customElements.define("simson-door-camera",H);function pe(i,e,t,s){let a=i._config,n=String(a.extension||"").trim(),r=a.camera_entity||"",o=t.hasCall&&(String(e._currentRemoteNode||"")===n||e._activeCallAttr("target_extension")===n||e._activeCallAttr("remote_node_id")===`sip:${n}`);return c`<section class="door-workspace">
    <div class="section-heading"><h2>${a.device_name||"Door phone"}</h2><span>SIP ${n||"not configured"}</span></div>
    <simson-door-camera .hass=${i._hass} .entity=${r} .live=${o||i._doorPreview===!0}></simson-door-camera>
    <p class="fine-print">Video uses your Home Assistant camera. Calling uses the door’s registered SIP extension. Viewing never joins another call.</p>
    ${o?s(e,t):c`<div class="call-actions">
      <button class="primary" ?disabled=${!n||!t.connected||t.hasCall||!!e._actionPending}
        @click=${()=>e._runAction("door:"+n,()=>e._dialSIPExtension(n))}>Call door phone</button>
      <button ?disabled=${!r} aria-pressed=${i._doorPreview===!0}
        @click=${()=>{i._doorPreview=!i._doorPreview,i.requestUpdate()}}>${i._doorPreview?"Stop video":"View live video"}</button>
    </div>`}
    ${n?u:c`<div class="notice">Set the SIP extension and select a camera in this card’s editor.</div>`}
  </section>`}var me=`:host {
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
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #080d17e8;
}
.dialog {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 20px 60px #0006;
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
.call-actions button:disabled{opacity:.62;cursor:wait}
@media(max-width:520px){.call-setup-status{margin-top:14px;padding:11px 12px}.call-setup-status b{font-size:12px}}
`;var V=class extends w{static styles=G(me);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession(),this.session&&(this.session.hass=e)}_bindSession(){if(!this.isConnected||!this._hass)return;let e=ae(this,this._hass,this._config);this.session!==e&&(this.session&&O(this.session,this),this.session=e,this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&O(this.session,this),this.session=null}updated(){this.session&&(this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer())}render(){let e=this.session,t=e?._view,s=this._config.view||"combined",a=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices"}[s]||"Simson",n=e?._activeTab||"dial",r=e?[...e.views]:[],o=r.find(p=>["dial","combined"].includes(p._config.view||"combined")),l=r.find(p=>p._config.view==="live")||o,_=e&&(e._pickerOpen?o===this:l===this);return c`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${a}</h1></div><span class="status ${t?.connected?"online":""}"><i></i>${t?.connected?"Connected":"Offline"}</span></header>
      ${t?c`
        ${t.connected?u:c`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?c`<div class="notice error" role="alert">${e._actionError}</div>`:u}
        ${e._actionPending?c`<div class="action-progress" role="status">${e._actionPending}</div>`:u}
        ${s==="door"?pe(this,e,t,D):s==="live"?t.hasCall?D(e,t):c`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?B(e):s==="devices"?N(e):s==="dial"?n==="media"?c`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${N(e)}`:L(e,t):c`
            ${t.hasCall?D(e,t):u}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([p,d])=>c`<button class=${n===p?"selected":""} aria-current=${n===p?"page":"false"} @click=${()=>e._selectTab(p)}>${d}</button>`)}</nav>
            ${n==="history"?B(e):n==="media"?N(e):t.hasCall?c`<p class="fine-print">End the current call before starting another.</p>`:L(e,t)}
          `}
      `:c`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${_?ue(e):u}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${Q}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",V);export{V as SimsonCard};
