import{a as G}from"./chunk-LL4D4DSP.js";import{a as W,c as l,d as z,e as p,f as q,g as T}from"./chunk-KLUKP4ZZ.js";var k=class extends T{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let t=e.node_id||"";if(!t&&e.connection_entity){let a=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);a&&(t=a[1])}if(!t&&e.call_state_entity){let a=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);a&&(t=a[1])}if(!t&&e.calls_count_entity){let a=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);a&&(t=a[1])}let n=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(a=>typeof a=="string"?a:a?.node_id||a?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:t,target_nodes:n,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),n.forEach(a=>{this._usersCache[a]||(this._usersCache[a]={users:[],timestamp:0})}),this._render()}};var j=i=>class extends i{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let t=e.match(/^sensor\.simson_(.+)_connection$/);if(t){this._detectedNodeId=t[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return this._config.node_id||this._detectedNodeId}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,t=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"]];this._subscriptions=[];for(let[s,n]of t)this._hass.connection.subscribeEvents(a=>{e===this._subscriptionGeneration&&this.isConnected&&this[n](a.data)},s).then(a=>{e!==this._subscriptionGeneration||!this.isConnected?a():this._subscriptions.push(a)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(t=>{this._actionError=t?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){let{call_id:t,status:s,direction:n,remote_node_id:a,call_type:r,sip_bridge_id:o,target_user_id:c,caller_user_id:_,answered_by_user_id:h}=e,d=this._hass?.user?.id||"";if(t===this._currentCallId||n==="incoming"&&(!c||c===d)||n==="outgoing"&&(!_||_===d))if(r&&(this._currentCallType=r),clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,(s==="requesting"||s==="ringing")&&n==="outgoing")this._actionError="",this._currentCallId=t||this._currentCallId,this._currentRemoteNode=a||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){this._actionError="",console.log("[Simson] call_status active",{call_id:t,call_type:r,sip_bridge_id:o,direction:n,remote_node_id:a});let g=this._answeredByMe||this._answerPendingCallId===t;if(n==="incoming"&&!g){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:t}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),n==="incoming"&&h&&h!==d){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._render();return}this._currentCallId=t,this._answerPendingCallId=null,this._currentRemoteNode=a,o&&(this._sipBridgeId=o);let u=r==="sip"||String(a||"").startsWith("sip:")||String(a||"").startsWith("asterisk:");this._isCaller=n==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),u?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(f=>console.error("[Simson] SIP active start:",f)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:t,remote_node_id:a}):this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._actionError=s==="failed"?"The call could not be started. Check the selected gateway or SIP phone.":"",setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){let{call_id:t,from_node_id:s,from_label:n,call_type:a,target_user_id:r,metadata:o}=e;if(r&&this._hass?.user?.id&&r!==this._hass.user.id){this._ignoredCallId=t;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:t,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=t;return}let c=s+"|"+a;if(this._lastIncomingCall===c&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=c,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=t,this._currentCallType=a||"voice",this._currentRemoteNode=s,this._incomingFrom=n||s,this._incomingCallType=a||"voice",this._sipBridgeId=a==="sip"&&o?.sip_bridge_id?o.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===t&&(console.log("[Simson] Incoming call timeout - clearing phantom call",t),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let t=e.node_id||this._selectedNode;if(t&&(this._usersCache[t]={users:e.users,timestamp:Date.now()}),this._transferLoading&&t===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return this._hass?.states[`sensor.simson_${this._nodeId()}_${e}`]}_val(e,t="unknown"){return this._entity(e)?.state??t}_attr(e,t,s=null){return this._entity(e)?.attributes?.[t]??s}_effectivePstnTrunk(e=!0){let t=e?String(this._pstnTrunkDraft||"").trim():"";if(t)return t;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let n=this._attr("connection","routing",{})||{},a=String(n.default_gateway_trunk||"").trim();if(a)return a;let r=(this._targets||[]).find(o=>(o.type==="gateway"||o.trunk)&&o.trunk);return r?.trunk?String(r.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._val("call_state","idle");return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,t=""){return this._attr("call_state",e,t)}_isStaleRingingCall(){let e=Number(this._attr("call_state","started_at",0));return e?Date.now()-e*1e3>9e4:!1}async _callService(e,t={}){if(this._hass)try{await this._hass.callService("simson",e,t),setTimeout(()=>this._render(),250)}catch(s){return(e==="make_call"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let t=this._usersCache[e];if(t&&Date.now()-t.timestamp<3e3){this._remoteUsers=t.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var F=i=>class extends i{_beginOutgoingCall(e,t){this._currentRemoteNode=e||this._currentRemoteNode,this._currentCallType=t||"",this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._actionError="",clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=setTimeout(()=>{this._outgoingUiTimer=null,!(!this._isCaller||this._currentCallId||!this._outgoingIntentAt)&&(this._outgoingIntentAt=0,this._isCaller=!1,this._currentCallType="",this._actionError="No call status came back from the node. Check the gateway or SIP phone registration, then retry.",this._render())},45e3),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,t,s=650){let n=String(e||"action"),a=Date.now();if(!this._actionLocks.has(n)&&!(a-(this._lastActionAt[n]||0)<s)){this._lastActionAt[n]=a,this._actionLocks.add(n),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(t())}catch(r){console.error("[Simson] action failed:",n,r),this._actionError=r?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(n),s)}}}_bindAction(e,t,s,n=650){if(!e)return;let a=r=>{r.preventDefault(),r.stopPropagation(),this._runAction(t,s,n)};e.addEventListener("pointerup",a),e.addEventListener("click",a)}_dial(e,t,s){if(!e)return;let n=this._videoEnabled?"video":"voice";this._beginOutgoingCall(e,n);let a={target_node_id:e,call_type:n,caller_user_id:this._hass?.user?.id||""};return t&&(a.target_user_id=t,a.target_user_name=s||""),this._callService("make_call",a)}_dialTarget(e,t,s){let a=["asterisk","sip","gateway"].includes(t)?"sip":this._videoEnabled?"video":"voice";return this._beginOutgoingCall(s||e,a),this._callService("make_call",{target_id:e,call_type:a,caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let t=this._effectivePstnTrunk();return this._dialPSTNNumber(e,t)}return this._beginOutgoingCall(e,"sip"),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,t=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let a=String(t||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`,"sip"),this._callService("make_call",{phone_number:s,trunk:a,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let t=String(e||"").trim(),s=t.replace(/\D/g,"");return t.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){clearTimeout(this._outgoingUiTimer),this._outgoingUiTimer=null,this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}_answer(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!0,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0,this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""}),this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(t=>console.error("[Simson] SIP answer start:",t)))}_reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._callService("reject_call",{call_id:e,reason:"declined"}).catch(()=>{}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._callStart=null,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._incomingSuppressUntil=Date.now()+8e3,this._render()}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,t="",s=""){let n=this._activeCallAttr("call_id")||this._currentCallId,a=String(e||"").trim();!n||!a||this._callService("transfer_call",{call_id:n,target_node_id:a,target_user_id:t||"",target_user_name:s||""})}_loadTransferUsers(e){let t=String(e||"").trim();if(!t)return;let s=this._usersCache[t];if(this._transferNodeDraft=t,this._transferUsersNode=t,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:t}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._render()}_smartDialRoute(e,t=this._smartRouteMode||"auto"){let s=String(e||"").trim(),n=String(t||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(n==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(n==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(n==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let a=s.toLowerCase(),r=s.replace(/[^\d+]/g,""),o=r.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:r.startsWith("+")||o.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(_=>String(_.node_id||_.id||"").toLowerCase()===a||String(_.label||"").toLowerCase()===a)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,t=""){let s=String(e||"").trim();if(!s)return;let n=this._smartDialRoute(s);if(this._nodeInputDraft=s,n.kind==="pstn"){let r=String(t||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=r,this._dialPSTNNumber(s,r)}if(n.kind==="sip"){let r=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=r,this._dialSIPExtension(r)}let a=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=a,this._userPickerNodeId=a,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:a})}};var E="simson.card.media.v1",Y=i=>class extends i{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(E)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(E)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(E,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let t=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:t,video:s}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let t=null;try{if(e){try{t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(n){if(!this._videoEnabled)throw n;t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(n=>n.kind==="audioinput"),videoInputs:s.filter(n=>n.kind==="videoinput"),audioOutputs:s.filter(n=>n.kind==="audiooutput")},this._mediaDevices.audioInputs.length&&!this._mediaDevices.audioInputs.some(n=>n.deviceId===this._selectedAudioInput)&&(this._selectedAudioInput=""),this._mediaDevices.videoInputs.length&&!this._mediaDevices.videoInputs.some(n=>n.deviceId===this._selectedVideoInput)&&(this._selectedVideoInput=""),this._mediaDevices.audioOutputs.length&&!this._mediaDevices.audioOutputs.some(n=>n.deviceId===this._selectedAudioOutput)&&(this._selectedAudioOutput=""),this._mediaDevicesLoaded=!0,this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{t?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(t){if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&(this._selectedAudioInput||e&&this._selectedVideoInput)){this._selectedAudioInput="",this._selectedVideoInput="",this._saveMediaPreferences();try{let s=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e));return this._mediaDeviceError="A saved device is unavailable. Using the system default instead.",s}catch(s){t=s}}if(e){this._mediaDeviceError="Camera access is unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){t=s}}if(["NotFoundError","OverconstrainedError","NotReadableError"].includes(t.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw t}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let t=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=t,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(t){this._mediaDeviceError=t?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(t=>t.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let t=this._root()?.querySelector("#remote-video");t&&this._remoteStream?.getVideoTracks?.().length&&t.srcObject!==this._remoteStream&&(t.srcObject=this._remoteStream,t.play().catch(()=>{}));let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._applyAudioOutput()}async _applyAudioOutput(){if(!this._remoteAudio?.setSinkId){if(!this._selectedAudioOutput)return;this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="This browser cannot select a speaker. Using its system default.",this._render();return}if(this._remoteAudio.sinkId!==this._selectedAudioOutput)try{await this._remoteAudio.setSinkId(this._selectedAudioOutput)}catch{this._selectedAudioOutput="",this._saveMediaPreferences(),this._mediaDeviceError="Could not select that speaker. Call audio is using the system default.",this._render()}}};var w=[{urls:"stun:stun.l.google.com:19302"}];var Q=i=>class extends i{async _fetchWebRTCConfig(){if(this._webrtcConfig)return this._webrtcConfig;if(this._webrtcConfigPromise)return this._webrtcConfigPromise;if(Date.now()<(this._webrtcConfigNextRetryAt||0))return{ice_servers:w,sip:{enabled:!1}};this._webrtcConfigPromise=(async()=>{try{let e=this._hass?.auth?.data?.access_token,t=await fetch("/api/webrtc-config",{headers:e?{Authorization:"Bearer "+e}:{},signal:AbortSignal.timeout(8e3)});if(t.ok)return this._webrtcConfig=await t.json(),this._webrtcConfigNextRetryAt=0,this._webrtcConfig}catch{}return this._webrtcConfigNextRetryAt=Date.now()+3e4,{ice_servers:w,sip:{enabled:!1}}})();try{let e=await this._webrtcConfigPromise;return this._turnAvailable=this._hasTurnRelay(e),this.isConnected&&this._render(),e}finally{this._webrtcConfigPromise=null}}_hasTurnRelay(e){return(Array.isArray(e?.ice_servers)?e.ice_servers:[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(a=>/^(turn|turns):/i.test(String(a||""))))}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{let t=(async()=>{if(!navigator.mediaDevices?.getUserMedia){this._micAllowed=!1;return}try{let a=this._currentCallType||this._activeCallAttr("call_type","")||this._incomingCallType||"voice",r=await this._captureMedia(["video","webrtc-video"].includes(a));if(e!==this._rtcGeneration||!this.isConnected){r.getTracks().forEach(o=>o.stop());return}this._localStream=r,this._micAllowed=!0}catch(a){this._micAllowed=!1,this._mediaDeviceError=a?.message||"Allow microphone access to speak."}})(),[s]=await Promise.all([this._fetchWebRTCConfig(),t]);if(e!==this._rtcGeneration||!this.isConnected)return;let n=Array.isArray(s.ice_servers)?s.ice_servers:w;if(this._turnAvailable=this._hasTurnRelay({ice_servers:n}),e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:n}),this._pendingCandidates=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(a=>{this._pc.addTrack(a,this._localStream)}),this._pc.ontrack=a=>{if(a.streams?.[0])this._attachRemoteMedia(a.streams[0],null);else{let r=new MediaStream;r.addTrack(a.track),this._attachRemoteMedia(r,a.track)}},this._pc.onicecandidate=a=>{a.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:a.candidate.candidate,sdpMid:a.candidate.sdpMid,sdpMLineIndex:a.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(a){console.error("Simson: negotiation error:",a)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let a=this._pc?.connectionState;if(a==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(a==="disconnected")this._audioQuality=1;else if(a==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._mediaDeviceError=this._turnAvailable?"The media connection failed. Check network/firewall access and try again.":"The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.",this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let a=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(a)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:t,from_node_id:s,signal_type:n,data:a}=e;if(!(!t||!this._currentCallId||t!==this._currentCallId)&&!(s&&this._currentRemoteNode&&s!==this._currentRemoteNode))if(n==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;if(this._makingOffer||this._pc.signalingState!=="stable"){if(!this._polite)return;await this._pc.setLocalDescription({type:"rollback"})}if(await this._pc.setRemoteDescription(new RTCSessionDescription(a)),!this._isCaller&&this._localStream){let o=new Set([...String(a?.sdp||"").matchAll(/^m=(audio|video)\s/gm)].map(_=>_[1])),c=this._pc.getSenders();this._localStream.getTracks().filter(_=>o.has(_.kind)).filter(_=>!c.some(h=>h.track?.kind===_.kind)).forEach(_=>this._pc.addTrack(_,this._localStream))}await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let o of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(o));this._pendingCandidates=[]}else if(n==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"){await this._pc.setRemoteDescription(new RTCSessionDescription(a));for(let r of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(r));this._pendingCandidates=[]}}else n==="ice-candidate"&&(this._pc&&this._pc.remoteDescription?await this._pc.addIceCandidate(new RTCIceCandidate(a)):this._pendingCandidates.push(a))}_sendWebRTCSignal(e,t){let s=this._activeCallAttr("call_id")||this._currentCallId,n=this._currentRemoteNode;!s||!n||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:n,signal_type:e,data:t}).catch(a=>console.error("Simson: signal send failed:",a))}_cleanupWebRTC(){this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(e=>e.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,t=null){if(!e&&t&&(e=new MediaStream,e.addTrack(t)),!e)return;this._remoteStream=e,this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.srcObject=e;let s=e.getAudioTracks?e.getAudioTracks():[];console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(n=>n.readyState),muted:s.map(n=>n.muted)}),this._remoteAudio.play().catch(n=>{console.warn("[Simson] remote audio play blocked/failed:",n?.message||n)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,t=null){this._attachRemoteMedia(e,t)}async _updateQuality(){if(this._pc)try{let e=await this._pc.getStats(),t=0,s=0,n=0;e.forEach(r=>{if(r.type==="inbound-rtp"&&r.kind==="audio"&&(t=r.jitter||0,s=r.packetsLost||0,n=r.packetsReceived||1),r.type==="candidate-pair"&&r.state==="succeeded"){let o=e.get?e.get(r.remoteCandidateId):null;o?.candidateType&&(this._connectionType=o.candidateType)}});let a=s/Math.max(n,1);a>.1||t>.1?this._audioQuality=1:a>.03||t>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var K=i=>class extends i{_cleanupSIPUA(){if(this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e){console.warn("[Simson SIP] no bridgeId \u2014 abort");return}if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let t,s;try{[{MinimalSIPUA:t},s]=await Promise.all([import("./sip-ua-UHT3DF2Y.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._actionError="Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let n=s.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:n.enabled,ws_url:n.ws_url,username:n.username,domain:n.domain})),!n.enabled||!n.ws_url||!n.username||!n.password){this._actionError="Phone audio is unavailable. Check the addon connection.",this._render(),this._pendingSIPBridgeId=null;return}let a="sip:"+n.username+"@"+n.domain;this._sipUA=new t({uri:a,captureMedia:()=>this._captureMedia(!1),password:n.password,wsUrl:n.ws_url,iceServers:s.ice_servers||w,onAudioTrack:(r,o)=>{this._attachRemoteAudio(r,o)},onRegistered:()=>{this._sipUA._activeBridge=e,this._pendingSIPBridgeId=null,this._sipUA.dial(e).catch(r=>{console.error("Simson SIP dial error:",r),this._cleanupSIPUA()})},onError:r=>{console.error("Simson SIP UA error:",r),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render()},onBye:()=>{this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render()}}),this._sipUA.connect()}};var J=i=>class extends i{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let t=e.createOscillator(),s=e.createGain();t.connect(s),s.connect(e.destination),t.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),t.start(e.currentTime),t.stop(e.currentTime+.4),setTimeout(()=>{let n=e.createOscillator(),a=e.createGain();n.connect(a),a.connect(e.destination),n.frequency.value=480,a.gain.setValueAtTime(.15,e.currentTime),a.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),n.start(e.currentTime),n.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,t){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${t} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var X=i=>class extends i{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let t=Math.round(e);if(t<60)return`${t}s`;let s=Math.floor(t/60),n=t%60;return s<60?`${s}m ${n}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let t=new Date(e*1e3),s=new Date,n=t.toDateString()===s.toDateString(),a=new Date(s);a.setDate(a.getDate()-1);let r=t.toDateString()===a.toDateString(),o=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return n?o:r?`Yesterday ${o}`:t.toLocaleDateString([],{month:"short",day:"numeric"})+" "+o}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let t=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(t/60)).padStart(2,"0"),n=String(t%60).padStart(2,"0");e.textContent=`${s}:${n}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function Z(){let i=this._nodeId(),e=this._isConnected(),t=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",n=this._activeCallAttr("direction",""),a=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<45e3,r=a?"outgoing":n,o=this._hass?.user?.id||"",c=this._activeCallAttr("target_user_id",""),_=this._activeCallAttr("caller_user_id",""),h=this._activeCallAttr("answered_by_user_id",""),d=!s||s===this._currentCallId||!r||r==="incoming"&&(!c||c===o)&&(!h||h===o)||r==="outgoing"&&(!_||_===o),m=["incoming","requesting","ringing","active"],g=a&&["idle","unknown","unavailable"].includes(t),u=d&&(m.includes(t)&&s||g)?g?"requesting":t:"idle",f=u==="idle"||u==="unknown",b=u==="incoming"&&r!=="outgoing"&&!this._isCaller,C=u==="requesting"||u==="ringing",B=u==="active",fe=u==="missed",ve=u==="declined",be=u==="timeout",H=b||C||B,Ce=!!this._pc,S=this._activeCallAttr("call_type",""),V=this._activeCallAttr("sip_bridge_id",""),_e=this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||String(this._currentRemoteNode||"").replace(/^phone:/,"")||(r==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&d&&(this._currentCallId=s),H&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let I=this._prevCallState;if(I!==u)if(this._prevCallState=u,u==="incoming"&&I==="idle")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentCallType=S||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=this._activeCallAttr("remote_label")||this._currentRemoteNode||"Unknown",this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(u==="active"&&I!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentCallType=S||this._currentCallType,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),V&&(this._sipBridgeId=V),this._isCaller=r==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let A=Number(this._activeCallAttr("started_at",0));this._callStart=A>0?A*1e3:Date.now()}S==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:")?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(A=>console.error("[Simson] SIP state active start:",A)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):this._startWebRTC()}else u==="idle"&&I!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentCallType="",this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));return C&&d&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id","")),{nodeId:i,connected:e,direction:r,isIdle:f,isIncoming:b,isRinging:C,isActive:B,hasCall:H,activeCallType:S,remoteLabel:_e,callId:s}}var he=X(J(K(Q(Y(F(j(k))))))),x=class extends he{views=new Set;set hass(e){let t=this._hass;t?.connection&&t.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=this._nodeId(),n=["connection","call_state","active_call","calls_count"];(!t||t.user?.id!==e?.user?.id||n.some(r=>t.states?.[`sensor.simson_${s}_${r}`]!==e?.states?.[`sensor.simson_${s}_${r}`]))&&this.requestUpdate()}_connectHA(){this._hass&&(this._haEventSubscribed||this._subscribeHAEvents(),!this._webrtcConfig&&!this._webrtcConfigPromise&&this._fetchWebRTCConfig(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets())}connectedCallback(){super.connectedCallback(),this._connectHA(),this._mediaDevicesLoaded||this._refreshMediaDevices(!1),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),clearTimeout(this._outgoingUiTimer),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?Z.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return p}};customElements.get("simson-call-session")||customElements.define("simson-call-session",x);var ee=new WeakMap;function te(i,e,t){let s=e.connection||e,n=ee.get(s);n||ee.set(s,n=new Map);let r=t.node_id||[t.connection_entity,t.call_state_entity,t.calls_count_entity].map(_=>_?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(_=>_.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",o=`${e.user?.id||""}:${r}`,c=n.get(o);if(c||(c=new x,c.hidden=!0,c.setConfig({...t,node_id:r}),c.hass=e,c._release=()=>n.delete(o),n.set(o,c),document.body.append(c)),clearTimeout(c._releaseTimer),!c.views.has(i)||i._sessionConfig!==t){c.views.add(i),i._sessionConfig=t;let _=c._config,h=[...c.views].flatMap(d=>{let m=d._config.target_nodes;return Array.isArray(m)?m:m?[m]:[]});c.setConfig({..._,...t,node_id:r,target_nodes:h}),t.view==="history"&&c._loadHistory(),t.view==="devices"&&c._refreshMediaDevices(!1)}return c}function N(i,e){i.views.delete(e),i.views.size||(i._releaseTimer=setTimeout(()=>{i.views.size||(i.remove(),i._release())},0))}var ie={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},se=i=>(...e)=>({_$litDirective$:i,values:e}),$=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:pe}=q,ne=i=>i;var ae=()=>document.createComment(""),y=(i,e,t)=>{let s=i._$AA.parentNode,n=e===void 0?i._$AB:e._$AA;if(t===void 0){let a=s.insertBefore(ae(),n),r=s.insertBefore(ae(),n);t=new pe(a,r,i,i.options)}else{let a=t._$AB.nextSibling,r=t._$AM,o=r!==i;if(o){let c;t._$AQ?.(i),t._$AM=i,t._$AP!==void 0&&(c=i._$AU)!==r._$AU&&t._$AP(c)}if(a!==n||o){let c=t._$AA;for(;c!==a;){let _=ne(c).nextSibling;ne(s).insertBefore(c,n),c=_}}}return t},v=(i,e,t=i)=>(i._$AI(e,t),i),me={},re=(i,e=me)=>i._$AH=e,oe=i=>i._$AH,P=i=>{i._$AR(),i._$AA.remove()};var le=(i,e,t)=>{let s=new Map;for(let n=e;n<=t;n++)s.set(i[n],n);return s},R=se(class extends ${constructor(i){if(super(i),i.type!==ie.CHILD)throw Error("repeat() can only be used in text expressions")}dt(i,e,t){let s;t===void 0?t=e:e!==void 0&&(s=e);let n=[],a=[],r=0;for(let o of i)n[r]=s?s(o,r):r,a[r]=t(o,r),r++;return{values:a,keys:n}}render(i,e,t){return this.dt(i,e,t).values}update(i,[e,t,s]){let n=oe(i),{values:a,keys:r}=this.dt(e,t,s);if(!Array.isArray(n))return this.ut=r,a;let o=this.ut??=[],c=[],_,h,d=0,m=n.length-1,g=0,u=a.length-1;for(;d<=m&&g<=u;)if(n[d]===null)d++;else if(n[m]===null)m--;else if(o[d]===r[g])c[g]=v(n[d],a[g]),d++,g++;else if(o[m]===r[u])c[u]=v(n[m],a[u]),m--,u--;else if(o[d]===r[u])c[u]=v(n[d],a[u]),y(i,c[u+1],n[d]),d++,u--;else if(o[m]===r[g])c[g]=v(n[m],a[g]),y(i,n[d],n[m]),m--,g++;else if(_===void 0&&(_=le(r,g,u),h=le(o,d,m)),_.has(o[d]))if(_.has(o[m])){let f=h.get(r[g]),b=f!==void 0?n[f]:null;if(b===null){let C=y(i,n[d]);v(C,a[g]),c[g]=C}else c[g]=v(b,a[g]),y(i,n[d],b),n[f]=null;g++}else P(n[m]),m--;else P(n[d]),d++;for(;g<=u;){let f=y(i,c[u+1]);v(f,a[g]),c[g++]=f}for(;d<=m;){let f=n[d++];f!==null&&P(f)}return this.ut=r,re(i,c),z}});function U(i,e){let t=i._smartDialRoute(i._nodeInputDraft),s=[...i._targets];for(let r of i._config.target_nodes||[])s.some(o=>(o.node_id||o.id)===r)||s.push({id:r,node_id:r,label:r,type:"node"});let n=e.connected&&!e.hasCall,a=()=>n&&i._runAction("dial",()=>i._dialSmartValue(i._nodeInputDraft,i._pstnTrunkDraft));return l`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>A teammate, a room, or a number. One place to call.</p></div>
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([r,o])=>l`<button class=${i._smartRouteMode===r?"selected":""} aria-pressed=${i._smartRouteMode===r} @click=${()=>{i._smartRouteMode=r,i.requestUpdate()}}>${o}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${i._nodeInputDraft} placeholder="Search a node or dial a number" @input=${r=>{i._nodeInputDraft=r.target.value,i.requestUpdate()}} @keydown=${r=>{r.key==="Enter"&&a()}}><button class="primary" aria-label="Place call" ?disabled=${!n||!!i._actionPending||!i._nodeInputDraft.trim()} @click=${a}>Call ↗</button></div></label>
    <div class="route-hint"><span>${t.label}</span><small>${t.hint}</small></div>
    <label class="toggle node-video-toggle"><span><b>Video for node-to-node calls</b><small>Turn on once to grant camera access. SIP and gateway calls stay audio-only.</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${r=>{i._videoEnabled=r.target.checked,i._saveMediaPreferences(),i.requestUpdate(),i._videoEnabled&&i._refreshMediaDevices(!0)}}></label>
    ${i._videoEnabled&&!globalThis.isSecureContext?l`<div class="notice error" role="status">Camera and microphone access require HTTPS. Open this dashboard using its secure address.</div>`:p}
    ${i._videoEnabled&&i._turnAvailable===!1?l`<div class="notice error" role="status">No TURN relay is configured. Calls may fail on mobile or restrictive networks; ask the administrator to enable coturn.</div>`:p}
    ${t.kind==="pstn"?l`<label class="field"><span>Gateway trunk</span><input .value=${i._pstnTrunkDraft||i._effectivePstnTrunk()} placeholder="Site default" @input=${r=>{i._pstnTrunkDraft=r.target.value}}></label>`:p}
    <div class="section-heading"><h3>Quick connections</h3><span>${s.length} saved</span></div>
    ${s.length?l`<div class="contacts">${R(s,r=>r.id,r=>l`<button class="contact" ?disabled=${!n||!!i._actionPending} @click=${()=>{(r.type||"node")==="node"?(i._userPickerNodeId=r.node_id||r.id,i._userPickerTargetId=r.id,i._callService("get_remote_users",{node_id:i._userPickerNodeId})):i._runAction("target:"+r.id,()=>i._dialTarget(r.id,r.type,r.node_id))}}><span class="avatar">${String(r.label||r.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${r.label||r.id}</b><small>${r.type==="node"?"Home Assistant":r.trunk?"Gateway \xB7 "+r.trunk:"SIP \xB7 "+(r.extension||r.id)}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:l`<div class="empty compact">${i._targetsLoading?"Loading your contacts\u2026":"Saved nodes and phones appear here. You can always dial above."}</div>`}
    <button class="text-button" @click=${()=>i._selectTab("media")}>${i._videoEnabled?"Camera enabled for node calls":"Audio calls"} · Check your devices →</button>
  </section>`}function M(i,e){let t=!!i._localStream?.getVideoTracks().length,s=!!i._remoteStream?.getVideoTracks().length,n=e.isActive&&(t||s),r=e.activeCallType==="sip"||i._currentCallType==="sip"?!!i._sipUA?._activeBridge:i._pc?.connectionState==="connected",o=["video","webrtc-video"].includes(i._incomingCallType||e.activeCallType),c=i._mediaDeviceError?.startsWith("The media connection failed."),_=e.isActive?c?"Media connection failed":r?"Connected":"Connecting media\u2026":e.isIncoming?o?"Incoming video call":"Would like to talk to you":e.callId?"Ringing \xB7 Waiting for an answer\u2026":"Sending your call request to the node\u2026",h=(d,m)=>()=>i._runAction(d,m);return l`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":e.callId?"CALLING":"STARTING YOUR CALL"}</span>
    ${n?l`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?p:l`<span class="video-wait">Waiting for their camera</span>`}${t?l`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:p}<span class="live-label">LIVE</span></div>`:l`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption">${_} <span id="call-timer"></span></p>
    ${!e.isActive&&!e.isIncoming?l`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${e.callId?"The destination is being called":"Connecting to your call service"}</b><small>${e.callId?"You can stay here while the other phone rings.":"This card will update as soon as the node responds."}</small></span></div>`:p}
    ${i._micAllowed===!1?l`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:p}
    ${i._mediaDeviceError?l`<div class="notice error" role="status">${i._mediaDeviceError}</div>`:p}
    <div class="call-actions">
      ${e.isIncoming?l`<button class="primary" @click=${h("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${h("reject",()=>i._reject())}>Decline</button>`:l`
        <button aria-pressed=${i._muted} ?disabled=${!e.isActive} @click=${h("mute",()=>i._toggleMute())}>${i._muted?"Unmute":"Mute"}</button>
        ${t?l`<button aria-pressed=${i._cameraMuted} @click=${h("camera",()=>i._toggleCamera())}>${i._cameraMuted?"Camera on":"Camera off"}</button>`:p}
        <button class="danger" ?disabled=${!e.callId} @click=${h("hangup",()=>i._hangup())}>${e.callId?"End call":"Starting\u2026"}</button>
      `}
    </div>
    ${e.isActive&&(i._sipBridgeId||e.activeCallType==="sip")?l`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${i._transferNodeDraft} @input=${d=>{i._transferNodeDraft=d.target.value,i.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!i._transferNodeDraft.trim()} @click=${h("transfer-node",()=>i._transferCall(i._transferNodeDraft))}>To node</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${h("transfer-sip",()=>i._transferCall("sip:"+i._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${()=>i._loadTransferUsers(i._transferNodeDraft)}>Choose user</button></div>${i._transferUsers.map(d=>l`<button class="contact" @click=${h("transfer-user:"+d.user_id,()=>i._transferCall(i._transferUsersNode,d.user_id,d.user_name))}>${d.user_name}</button>`)}</details>`:p}
  </section>`}function O(i){return l`<section><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>i._loadHistory()}>Refresh</button></div>${i._history.length?l`<div class="history">${R(i._history.slice(0,50),(e,t)=>e.call_id||t,e=>l`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(e.state)?"missed":""}">${e.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${e.remote_label||e.remote_node_id||"Unknown caller"}</b><small>${e.state} · ${i._formatDuration(e.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{i._nodeInputDraft=e.remote_node_id||"",i._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:l`<div class="empty">${i._historyLoaded?"Your conversations will appear here.":"Loading recent calls\u2026"}</div>`}</section>`}function D(i){let e=i._mediaDevices,t=(s,n,a)=>l`<label class="field"><span>${s}</span><select .value=${i[a]} @change=${r=>{i[a]=r.target.value,i._saveMediaPreferences(),a==="_selectedAudioOutput"&&i._applyAudioOutput(),i._mediaPreviewStream&&i._startMediaPreview(),i.requestUpdate()}}><option value="">System default</option>${n.map((r,o)=>l`<option value=${r.deviceId}>${r.label||s+" "+(o+1)}</option>`)}</select></label>`;return l`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>i._runAction("detect",()=>i._refreshMediaDevices(!0))}>Detect</button></div>
    ${i._mediaDeviceError?l`<div class="notice error" role="alert">${i._mediaDeviceError}</div>`:p}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${i._mediaPreviewStream?.getVideoTracks().length?p:l`<div class="preview-empty"><b>${i._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${i._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Turn on once to grant camera access before a call</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${s=>{i._videoEnabled=s.target.checked,i._saveMediaPreferences(),i._mediaPreviewStream?i._startMediaPreview():i._videoEnabled&&i._refreshMediaDevices(!0),i.requestUpdate()}}></label>
    <div class="device-grid">${t("Microphone",e.audioInputs,"_selectedAudioInput")}${t("Camera",e.videoInputs,"_selectedVideoInput")}${t("Speaker",e.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>i._runAction("preview",()=>i._startMediaPreview())}>${i._mediaPreviewStream?"Restart preview":"Test devices"}</button>${i._mediaPreviewStream?l`<button @click=${()=>i._stopMediaPreview()}>Stop preview</button>`:p}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${i._notifPermission==="default"?l`<button class="text-button" @click=${()=>i._requestNotificationPermission()}>Enable incoming-call notifications</button>`:p}
  </section>`}function ce(i){if(!i._pickerOpen&&!i._showPopup)return p;let e=i._pickerOpen,t=s=>{let n=i._userPickerNodeId;i._removeUserPicker(),i._runAction("call-user",()=>i._dial(n,s?.user_id,s?.user_name))};return l`<div class="dialog-scrim"><section class="dialog" role="dialog" aria-modal="true" aria-label=${e?"Choose call recipient":"Incoming call"} @keydown=${s=>{s.key==="Escape"&&e&&i._removeUserPicker()}}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?i._userPickerNodeId:i._incomingFrom}</h2>
    ${e?l`<div class="dialog-options"><button class="primary" @click=${()=>t(null)}>Call everyone on this node</button>${i._remoteUsers.map(s=>l`<button @click=${()=>t(s)}>${s.user_name||s.user_id}</button>`)}</div><button class="text-button" @click=${()=>i._removeUserPicker()}>Cancel</button>`:l`<p>Would like to talk to you.</p><div class="call-actions"><button class="primary" @click=${()=>i._runAction("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${()=>i._runAction("reject",()=>i._reject())}>Decline</button></div>`}
  </section></div>`}var de=`:host {
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
`;var L=class extends T{static styles=W(de);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession(),this.session&&(this.session.hass=e)}_bindSession(){if(!this.isConnected||!this._hass)return;let e=te(this,this._hass,this._config);this.session!==e&&(this.session&&N(this.session,this),this.session=e,this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&N(this.session,this),this.session=null}updated(){this.session&&(this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer())}render(){let e=this.session,t=e?._view,s=this._config.view||"combined",n=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices"}[s]||"Simson",a=e?._activeTab||"dial",r=e?[...e.views]:[],o=r.find(h=>["dial","combined"].includes(h._config.view||"combined")),c=r.find(h=>h._config.view==="live")||o,_=e&&(e._pickerOpen?o===this:c===this);return l`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${n}</h1></div><span class="status ${t?.connected?"online":""}"><i></i>${t?.connected?"Connected":"Offline"}</span></header>
      ${t?l`
        ${t.connected?p:l`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?l`<div class="notice error" role="alert">${e._actionError}</div>`:p}
        ${e._actionPending?l`<div class="action-progress" role="status">${e._actionPending}</div>`:p}
        ${s==="live"?t.hasCall?M(e,t):l`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?O(e):s==="devices"?D(e):s==="dial"?a==="media"?l`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${D(e)}`:U(e,t):l`
            ${t.hasCall?M(e,t):p}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([h,d])=>l`<button class=${a===h?"selected":""} aria-current=${a===h?"page":"false"} @click=${()=>e._selectTab(h)}>${d}</button>`)}</nav>
            ${a==="history"?O(e):a==="media"?D(e):t.hasCall?l`<p class="fine-print">End the current call before starting another.</p>`:U(e,t)}
          `}
      `:l`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${_?ce(e):p}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${G}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",L);export{L as SimsonCard};
