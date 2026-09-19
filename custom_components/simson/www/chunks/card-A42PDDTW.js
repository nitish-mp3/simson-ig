import{a as G}from"./chunk-LL4D4DSP.js";import{a as V,c,d as W,e as u,f as z,g as A}from"./chunk-KLUKP4ZZ.js";var k=class extends A{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._detectedNodeId="",this._activeTab="dial",this._selectedNode="",this._nodeInputDraft="",this._sipDialDraft="",this._pstnDialDraft="",this._pstnTrunkDraft="",this._smartRouteMode="auto",this._remoteUsers=[],this._usersLoading=!1,this._usersCache={},this._history=[],this._historyLoaded=!1,this._targets=[],this._targetsLoaded=!1,this._targetsLoading=!1,this._pc=null,this._localStream=null,this._muted=!1,this._micAllowed=null,this._audioQuality=3,this._connectionType="",this._statsInterval=null,this._startingWebRTC=!1,this._pendingOffer=null,this._iceServers=null,this._webrtcConfig=null,this._videoEnabled=!1,this._cameraMuted=!1,this._selectedAudioInput="",this._selectedVideoInput="",this._selectedAudioOutput="",this._mediaDevices={audioInputs:[],videoInputs:[],audioOutputs:[]},this._mediaPermission="prompt",this._mediaDeviceError="",this._mediaPreviewStream=null,this._remoteStream=null,this._loadMediaPreferences(),this._sipUA=null,this._sipBridgeId=null,this._remoteAudio=document.createElement("audio"),this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.setAttribute("playsinline",""),this.shadowRoot.appendChild(this._remoteAudio),this._haEventUnsub=null,this._haStatusUnsub=null,this._haIncomingUnsub=null,this._haTargetsUnsub=null,this._haRemoteUsersUnsub=null,this._haHistoryUnsub=null,this._haEventSubscribed=!1,this._callStart=null,this._timerInterval=null,this._prevCallState="idle",this._currentCallId=null,this._currentRemoteNode=null,this._isCaller=!1,this._polite=!1,this._makingOffer=!1,this._pendingCandidates=[],this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._incomingCallTimeout=null,this._lastIncomingCall=null,this._lastIncomingCallTime=0,this._ringCtx=null,this._ringLoop=null,this._popupEl=null,this._showPopup=!1,this._incomingFrom="",this._incomingCallType="",this._userPickerEl=null,this._userPickerNodeId="",this._userPickerTargetId="",this._ignoredCallId=null,this._transferNodeDraft="",this._transferUsers=[],this._transferUsersNode="",this._transferLoading=!1,this._notifPermission=typeof Notification<"u"?Notification.permission:"denied",this._activeNotification=null,this._userHeartbeatInterval=null,this._actionLocks=new Set,this._lastActionAt={},this._deviceChangeHandler=()=>this._refreshMediaDevices(!1)}setConfig(e){e=e||{};let t=e.node_id||"";if(!t&&e.connection_entity){let r=e.connection_entity.match(/^sensor\.simson_(.+)_connection$/);r&&(t=r[1])}if(!t&&e.call_state_entity){let r=e.call_state_entity.match(/^sensor\.simson_(.+)_call_state$/);r&&(t=r[1])}if(!t&&e.calls_count_entity){let r=e.calls_count_entity.match(/^sensor\.simson_(.+)_calls_count$/);r&&(t=r[1])}let n=(Array.isArray(e.target_nodes)?e.target_nodes:e.target_nodes?[e.target_nodes]:[]).map(r=>typeof r=="string"?r:r?.node_id||r?.id||"").filter(Boolean);this._config={title:e.title||"Simson",node_id:t,target_nodes:n,pstn_trunk:String(e.pstn_trunk||"").trim(),video_enabled:e.video_enabled===!0},e.video_enabled===!0&&(this._videoEnabled=!0),n.forEach(r=>{this._usersCache[r]||(this._usersCache[r]={users:[],timestamp:0})}),this._render()}};var j=i=>class extends i{_autoDetectNodeId(){if(this._hass?.states)for(let e of Object.keys(this._hass.states)){let t=e.match(/^sensor\.simson_(.+)_connection$/);if(t){this._detectedNodeId=t[1],console.info("Simson: auto-detected node_id:",this._detectedNodeId);return}}}_nodeId(){return this._config.node_id||this._detectedNodeId}_subscribeHAEvents(){if(!this._hass?.connection)return;this._haEventSubscribed=!0;let e=this._subscriptionGeneration=(this._subscriptionGeneration||0)+1,t=[["simson_webrtc_signal","_onHAWebRTCSignal"],["simson_call_status","_onHACallStatus"],["simson_incoming_call","_onHAIncomingCall"],["simson_targets_result","_onHATargetsResult"],["simson_remote_users","_onHARemoteUsers"],["simson_call_history","_onHACallHistory"]];this._subscriptions=[];for(let[s,n]of t)this._hass.connection.subscribeEvents(r=>{e===this._subscriptionGeneration&&this.isConnected&&this[n](r.data)},s).then(r=>{e!==this._subscriptionGeneration||!this.isConnected?r():this._subscriptions.push(r)}).catch(()=>{e===this._subscriptionGeneration&&this._unsubscribeHAEvents()})}_unsubscribeHAEvents(){this._subscriptionGeneration=(this._subscriptionGeneration||0)+1;for(let e of this._subscriptions||[])e();this._subscriptions=[],this._haEventSubscribed=!1}_onHAWebRTCSignal(e){this._handleWebRTCSignal(e).catch(t=>{this._actionError=t?.message||"The media connection could not be established.",this._render()})}_onHACallStatus(e){let{call_id:t,status:s,direction:n,remote_node_id:r,call_type:a,sip_bridge_id:o,target_user_id:l,caller_user_id:h,answered_by_user_id:m}=e,_=this._hass?.user?.id||"";if(t===this._currentCallId||n==="incoming"&&(!l||l===_)||n==="outgoing"&&(!h||h===_))if((s==="requesting"||s==="ringing")&&n==="outgoing")this._currentCallId=t||this._currentCallId,this._currentRemoteNode=r||this._currentRemoteNode,this._isCaller=!0,this._polite=!1,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render();else if(s==="active"){console.log("[Simson] call_status active",{call_id:t,call_type:a,sip_bridge_id:o,direction:n,remote_node_id:r});let d=this._answeredByMe||this._answerPendingCallId===t;if(n==="incoming"&&!d){console.log("[Simson] Incoming call became active elsewhere; not auto-answering browser card",{call_id:t}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentRemoteNode=null,this._sipBridgeId=null,this._callStart=null,this._render();return}if(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),n==="incoming"&&m&&m!==_){this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentRemoteNode=null,this._render();return}this._currentCallId=t,this._answerPendingCallId=null,this._currentRemoteNode=r,o&&(this._sipBridgeId=o);let g=a==="sip"||String(r||"").startsWith("sip:")||String(r||"").startsWith("asterisk:");this._isCaller=n==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,this._callStart||(this._callStart=Date.now()),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),g?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(f=>console.error("[Simson] SIP active start:",f)):console.warn("[Simson] Active SIP call missing sip_bridge_id",{call_id:t,remote_node_id:r}):this._startWebRTC(),this._render()}else["ended","failed","missed","declined","timeout"].includes(s)&&(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentRemoteNode=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3),this._render())}_onHAIncomingCall(e){let{call_id:t,from_node_id:s,from_label:n,call_type:r,target_user_id:a,metadata:o}=e;if(a&&this._hass?.user?.id&&a!==this._hass.user.id){this._ignoredCallId=t;return}if(this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3){console.log("[Simson] Ignoring outgoing bridge invite in incoming UI",{call_id:t,from_node_id:s});return}if(this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil){console.log("[Simson] Ignoring incoming call \u2014 suppression active until",this._incomingSuppressUntil),this._ignoredCallId=t;return}let l=s+"|"+r;if(this._lastIncomingCall===l&&Date.now()-this._lastIncomingCallTime<2e3){console.log("[Simson] Ignoring duplicate incoming call from",s,"within 2s");return}this._lastIncomingCall=l,this._lastIncomingCallTime=Date.now(),this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._currentCallId=t,this._currentRemoteNode=s,this._incomingFrom=n||s,this._incomingCallType=r||"voice",this._sipBridgeId=r==="sip"&&o?.sip_bridge_id?o.sip_bridge_id:null,this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType),this._incomingCallTimeout=setTimeout(()=>{this._currentCallId===t&&(console.log("[Simson] Incoming call timeout - clearing phantom call",t),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=null,this._currentRemoteNode=null,this._sipBridgeId=null,this._incomingCallTimeout=null,this._render())},3e4),this._render()}_onHARemoteUsers(e){if(e&&Array.isArray(e.users)){this._remoteUsers=e.users,this._usersLoading=!1;let t=e.node_id||this._selectedNode;if(t&&(this._usersCache[t]={users:e.users,timestamp:Date.now()}),this._transferLoading&&t===this._transferUsersNode){this._transferUsers=e.users,this._transferLoading=!1,this._render();return}this._userPickerNodeId?this._showUserPickerPopup():this._render()}}_onHATargetsResult(e){e&&Array.isArray(e.targets)&&(this._targets=e.targets,this._targetsLoaded=!0,this._targetsLoading=!1,this._render())}_onHACallHistory(e){e&&Array.isArray(e.history)&&(this._history=e.history,this._historyLoaded=!0,this._render())}_entity(e){return this._hass?.states[`sensor.simson_${this._nodeId()}_${e}`]}_val(e,t="unknown"){return this._entity(e)?.state??t}_attr(e,t,s=null){return this._entity(e)?.attributes?.[t]??s}_effectivePstnTrunk(e=!0){let t=e?String(this._pstnTrunkDraft||"").trim():"";if(t)return t;let s=String(this._config?.pstn_trunk||"").trim();if(s)return s;let n=this._attr("connection","routing",{})||{},r=String(n.default_gateway_trunk||"").trim();if(r)return r;let a=(this._targets||[]).find(o=>(o.type==="gateway"||o.trunk)&&o.trunk);return a?.trunk?String(a.trunk).trim():"7009"}_isConnected(){return this._val("connection")==="connected"}_callState(){let e=this._val("call_state","idle");return(e==="incoming"||e==="ringing"||e==="requesting")&&this._isStaleRingingCall()?"idle":e}_activeCallAttr(e,t=""){return this._attr("call_state",e,t)}_isStaleRingingCall(){let e=Number(this._attr("call_state","started_at",0));return e?Date.now()-e*1e3>9e4:!1}async _callService(e,t={}){if(this._hass)try{await this._hass.callService("simson",e,t),setTimeout(()=>this._render(),250)}catch(s){return(e==="make_call"||e==="call_sip_phone"||e==="call_phone_number")&&this._clearLocalCallState(),this._actionError=s?.message||"Could not reach Simson. Please retry.",this._render(),!1}}async _loadTargets(){if(!(!this._hass||this._targetsLoading)){this._targetsLoading=!0;try{await this._hass.callService("simson","get_targets",{})}catch{this._targetsLoading=!1}}}async _loadHistory(){if(this._hass)try{await this._hass.callService("simson","get_call_history",{limit:50})}catch(e){this._actionError=`Could not load recent calls: ${e.message||"connection failed"}`,this._render()}}_fetchRemoteUsers(e){if(!e||!this._hass)return;let t=this._usersCache[e];if(t&&Date.now()-t.timestamp<3e3){this._remoteUsers=t.users,this._usersLoading=!1,this._render();return}this._usersLoading=!0,this._remoteUsers=[],this._render(),this._callService("get_remote_users",{node_id:e})}_getNodeTargets(){return this._targets.filter(e=>e.type==="node")}_getNonNodeTargets(){return this._targets.filter(e=>e.type!=="node")}_sendUserHeartbeat(){this._hass?.user&&this._callService("user_heartbeat",{user_id:this._hass.user.id,user_name:this._hass.user.name})}};var q=i=>class extends i{_beginOutgoingCall(e){this._currentRemoteNode=e||this._currentRemoteNode,this._callStart=null,this._isCaller=!0,this._polite=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=Date.now(),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._render()}async _runAction(e,t,s=650){let n=String(e||"action"),r=Date.now();if(!this._actionLocks.has(n)&&!(r-(this._lastActionAt[n]||0)<s)){this._lastActionAt[n]=r,this._actionLocks.add(n),this._actionError="",this._actionPending="Working\u2026",this._render();try{await Promise.resolve(t())}catch(a){console.error("[Simson] action failed:",n,a),this._actionError=a?.message||"The action could not complete. Please retry.",this._render()}finally{this._actionPending="",this._render(),setTimeout(()=>this._actionLocks.delete(n),s)}}}_bindAction(e,t,s,n=650){if(!e)return;let r=a=>{a.preventDefault(),a.stopPropagation(),this._runAction(t,s,n)};e.addEventListener("pointerup",r),e.addEventListener("click",r)}_dial(e,t,s){if(!e)return;this._beginOutgoingCall(e);let n={target_node_id:e,call_type:this._videoEnabled?"video":"voice",caller_user_id:this._hass?.user?.id||""};return t&&(n.target_user_id=t,n.target_user_name=s||""),this._callService("make_call",n)}_dialTarget(e,t,s){this._beginOutgoingCall(s||e);let n=["asterisk","sip","gateway"];return this._callService("make_call",{target_id:e,call_type:n.includes(t)?"sip":this._videoEnabled?"video":"voice",caller_user_id:this._hass?.user?.id||""})}_dialSIPExtension(e){if(e){if(this._looksLikePhoneNumber(e)){let t=this._effectivePstnTrunk();return this._dialPSTNNumber(e,t)}return this._beginOutgoingCall(e),this._callService("make_call",{target_id:`asterisk_${e}`,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}}_dialPSTNNumber(e,t=""){let s=String(e||"").replace(/[^\d+]/g,"");if(!s.replace(/^\+/,""))return;let r=String(t||this._effectivePstnTrunk()).trim();return this._beginOutgoingCall(`phone:${s}`),this._callService("make_call",{phone_number:s,trunk:r,call_type:"sip",caller_user_id:this._hass?.user?.id||""})}_looksLikePhoneNumber(e){let t=String(e||"").trim(),s=t.replace(/\D/g,"");return t.startsWith("+")&&s.length>=7||s.length>=7}_clearLocalCallState(){this._callStart=null,this._currentCallId=null,this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._render()}_answer(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&(this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._callStart=Date.now(),this._answeredByMe=!0,this._answerPendingCallId=e,this._currentCallId=e,this._incomingSuppressUntil=0,this._callService("answer_call",{call_id:e,answered_by_user_id:this._hass?.user?.id||""}),this._sipBridgeId&&this._startSIPCall(this._sipBridgeId).catch(t=>console.error("[Simson] SIP answer start:",t)))}_reject(){let e=this._activeCallAttr("call_id")||this._currentCallId;this._incomingCallTimeout&&(clearTimeout(this._incomingCallTimeout),this._incomingCallTimeout=null),this._callService("reject_call",{call_id:e,reason:"declined"}).catch(()=>{}),this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._ignoredCallId=e,this._currentCallId=null,this._currentRemoteNode=null,this._sipBridgeId=null,this._isCaller=!1,this._callStart=null,this._answeredByMe=!1,this._answerPendingCallId=null,this._outgoingIntentAt=0,this._prevCallState="idle",this._incomingSuppressUntil=Date.now()+8e3,this._render()}_hangup(){let e=this._activeCallAttr("call_id")||this._currentCallId;try{this._sipUA?.hangup()}catch{}this._cleanupWebRTC(),this._clearLocalCallState(),e&&this._callService("hangup_call",{call_id:e})}_transferCall(e,t="",s=""){let n=this._activeCallAttr("call_id")||this._currentCallId,r=String(e||"").trim();!n||!r||this._callService("transfer_call",{call_id:n,target_node_id:r,target_user_id:t||"",target_user_name:s||""})}_loadTransferUsers(e){let t=String(e||"").trim();if(!t)return;let s=this._usersCache[t];if(this._transferNodeDraft=t,this._transferUsersNode=t,s&&Date.now()-s.timestamp<3e4){this._transferUsers=s.users||[],this._transferLoading=!1,this._render();return}this._transferUsers=[],this._transferLoading=!0,this._render(),this._callService("get_remote_users",{node_id:t}).catch(()=>{this._transferLoading=!1,this._render()})}_toggleMute(){this._muted=!this._muted,this._localStream&&this._localStream.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._sipUA?._localStream?.getAudioTracks().forEach(e=>{e.enabled=!this._muted}),this._render()}_toggleCamera(){this._cameraMuted=!this._cameraMuted,this._localStream?.getVideoTracks().forEach(e=>{e.enabled=!this._cameraMuted}),this._render()}_smartDialRoute(e,t=this._smartRouteMode||"auto"){let s=String(e||"").trim(),n=String(t||"auto").toLowerCase();if(!s)return{kind:"ready",label:"Ready",icon:"\u{1F50E}",hint:"Type extension, phone number, or node"};if(n==="sip")return{kind:"sip",label:"SIP",icon:"\u260E",hint:"Forced SIP extension route"};if(n==="pstn")return{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Forced outside call via trunk ${this._effectivePstnTrunk()}`};if(n==="node")return{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Forced Home Assistant node/user route"};let r=s.toLowerCase(),a=s.replace(/[^\d+]/g,""),o=a.replace(/\D/g,"");return/^sip:/i.test(s)||/^ext:/i.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Calls an internal SIP extension"}:/^node:/i.test(s)||/^haos:/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:/^\d{1,6}$/.test(s)?{kind:"sip",label:"SIP",icon:"\u260E",hint:"Numeric values up to 6 digits are SIP extensions"}:a.startsWith("+")||o.length>=7?{kind:"pstn",label:"Gateway",icon:"\u{1F4F2}",hint:`Uses trunk ${this._effectivePstnTrunk()}`}:this._getNodeTargets().find(h=>String(h.node_id||h.id||"").toLowerCase()===r||String(h.label||"").toLowerCase()===r)||/^[a-z][a-z0-9_-]{1,}$/i.test(s)?{kind:"node",label:"HAOS",icon:"\u{1F3E0}",hint:"Calls a Home Assistant node/user"}:{kind:"sip",label:"SIP",icon:"\u260E",hint:"Defaulting to SIP; switch route if needed"}}_dialSmartValue(e,t=""){let s=String(e||"").trim();if(!s)return;let n=this._smartDialRoute(s);if(this._nodeInputDraft=s,n.kind==="pstn"){let a=String(t||this._pstnTrunkDraft||this._effectivePstnTrunk(!1)||"").trim();return this._pstnDialDraft=s,this._pstnTrunkDraft=a,this._dialPSTNNumber(s,a)}if(n.kind==="sip"){let a=s.replace(/^sip:/i,"").replace(/^ext:/i,"").trim();return this._sipDialDraft=a,this._dialSIPExtension(a)}let r=s.replace(/^node:/i,"").replace(/^haos:/i,"").trim();return this._selectedNode=r,this._userPickerNodeId=r,this._userPickerTargetId="",this._callService("get_remote_users",{node_id:r})}};var D="simson.card.media.v1",F=i=>class extends i{_loadMediaPreferences(){try{let e=JSON.parse(localStorage.getItem(D)||"{}");this._videoEnabled=e.videoEnabled===!0,this._selectedAudioInput=String(e.audioInput||""),this._selectedVideoInput=String(e.videoInput||""),this._selectedAudioOutput=String(e.audioOutput||"")}catch{try{localStorage.removeItem(D)}catch{}}}_saveMediaPreferences(){try{localStorage.setItem(D,JSON.stringify({videoEnabled:this._videoEnabled,audioInput:this._selectedAudioInput,videoInput:this._selectedVideoInput,audioOutput:this._selectedAudioOutput}))}catch{}}_mediaConstraints(e=this._videoEnabled){let t=this._selectedAudioInput?{deviceId:{exact:this._selectedAudioInput},echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},s=e?this._selectedVideoInput?{deviceId:{exact:this._selectedVideoInput},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:!1;return{audio:t,video:s}}async _refreshMediaDevices(e=!1){if(!navigator.mediaDevices?.enumerateDevices)return;let t=null;try{if(e){try{t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled))}catch(n){if(!this._videoEnabled)throw n;t=await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1)),this._mediaDeviceError="Camera permission was not granted. Audio calls remain available."}this._mediaPermission="granted"}let s=await navigator.mediaDevices.enumerateDevices();this._mediaDevices={audioInputs:s.filter(n=>n.kind==="audioinput"),videoInputs:s.filter(n=>n.kind==="videoinput"),audioOutputs:s.filter(n=>n.kind==="audiooutput")},this._mediaDevices.audioInputs.some(n=>n.deviceId===this._selectedAudioInput)||(this._selectedAudioInput=this._mediaDevices.audioInputs[0]?.deviceId||""),this._mediaDevices.videoInputs.some(n=>n.deviceId===this._selectedVideoInput)||(this._selectedVideoInput=this._mediaDevices.videoInputs[0]?.deviceId||""),this._mediaDevices.audioOutputs.some(n=>n.deviceId===this._selectedAudioOutput)||(this._selectedAudioOutput=this._mediaDevices.audioOutputs[0]?.deviceId||""),this._saveMediaPreferences()}catch(s){this._mediaPermission=s?.name==="NotAllowedError"?"denied":"prompt",this._mediaDeviceError=s?.message||"Could not access media devices."}finally{t?.getTracks().forEach(s=>s.stop())}this._render()}async _captureMedia(e){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Use HTTPS and allow browser microphone access.");this._mediaDeviceError="";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(e))}catch(t){if(e){this._mediaDeviceError="Camera unavailable. Continuing with audio only.";try{return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1))}catch(s){t=s}}if(["NotFoundError","OverconstrainedError"].includes(t.name)&&this._selectedAudioInput)return this._selectedAudioInput="",this._saveMediaPreferences(),await navigator.mediaDevices.getUserMedia(this._mediaConstraints(!1));throw t}}async _startMediaPreview(){this._stopMediaPreview(!1);let e=this._previewGeneration;try{let t=await this._captureMedia(this._videoEnabled);if(e!==this._previewGeneration||!this.isConnected){t.getTracks().forEach(s=>s.stop());return}this._mediaPreviewStream=t,this._mediaPermission="granted",await this._refreshMediaDevices(!1)}catch(t){this._mediaDeviceError=t?.message||"Could not start media preview."}this._render()}_stopMediaPreview(e=!0){this._previewGeneration=(this._previewGeneration||0)+1,this._mediaPreviewStream?.getTracks().forEach(t=>t.stop()),this._mediaPreviewStream=null,e&&this.isConnected&&this._render()}_attachMediaElements(){this._remoteAudio.isConnected||this.shadowRoot.appendChild(this._remoteAudio);let e=this._root()?.querySelector("#media-local-preview");e&&this._mediaPreviewStream&&e.srcObject!==this._mediaPreviewStream&&(e.srcObject=this._mediaPreviewStream,e.play().catch(()=>{}));let t=this._root()?.querySelector("#remote-video");t&&this._remoteStream?.getVideoTracks?.().length&&t.srcObject!==this._remoteStream&&(t.srcObject=this._remoteStream,t.play().catch(()=>{}));let s=this._root()?.querySelector("#local-video");s&&this._localStream?.getVideoTracks?.().length&&s.srcObject!==this._localStream&&(s.srcObject=this._localStream,s.play().catch(()=>{})),this._remoteAudio?.setSinkId&&this._remoteAudio.sinkId!==this._selectedAudioOutput&&this._remoteAudio.setSinkId(this._selectedAudioOutput).catch(()=>{})}};var y=[{urls:"stun:stun.l.google.com:19302"}];var Q=i=>class extends i{async _fetchWebRTCConfig(){if(this._webrtcConfig)return this._webrtcConfig;try{let e=this._hass?.auth?.data?.access_token,t=await fetch("/api/webrtc-config",{headers:e?{Authorization:"Bearer "+e}:{},signal:AbortSignal.timeout(8e3)});if(t.ok)return this._webrtcConfig=await t.json(),this._webrtcConfig}catch{}return{ice_servers:y,sip:{enabled:!1}}}async _startWebRTC(){if(this._pc||this._startingWebRTC)return;this._startingWebRTC=!0,this._stopMediaPreview(!1);let e=this._rtcGeneration=(this._rtcGeneration||0)+1;try{let t=await this._fetchWebRTCConfig();if(e!==this._rtcGeneration||!this.isConnected)return;let s=t.ice_servers||y;if(navigator.mediaDevices?.getUserMedia)try{let n=this._activeCallAttr("call_type","")||this._incomingCallType||"voice",r=this._videoEnabled&&!["sip","gateway","pstn"].includes(n),a=await this._captureMedia(r);if(e!==this._rtcGeneration||!this.isConnected){a.getTracks().forEach(o=>o.stop());return}this._localStream=a,this._micAllowed=!0}catch{this._micAllowed=!1}else this._micAllowed=!1;if(e!==this._rtcGeneration||!this.isConnected)return;if(this._pc=new RTCPeerConnection({iceServers:s}),this._pendingCandidates=[],this._makingOffer=!1,this._isCaller&&this._localStream&&this._localStream.getTracks().forEach(n=>{this._pc.addTrack(n,this._localStream)}),this._pc.ontrack=n=>{if(n.streams?.[0])this._attachRemoteMedia(n.streams[0],null);else{let r=new MediaStream;r.addTrack(n.track),this._attachRemoteMedia(r,n.track)}},this._pc.onicecandidate=n=>{n.candidate&&this._sendWebRTCSignal("ice-candidate",{candidate:n.candidate.candidate,sdpMid:n.candidate.sdpMid,sdpMLineIndex:n.candidate.sdpMLineIndex})},this._pc.onnegotiationneeded=async()=>{try{this._makingOffer=!0,await this._pc.setLocalDescription(),this._sendWebRTCSignal("offer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type})}catch(n){console.error("Simson: negotiation error:",n)}finally{this._makingOffer=!1}},this._pc.onconnectionstatechange=()=>{let n=this._pc?.connectionState;if(n==="connected")this._audioQuality=3,this._iceRestartAttempts=0;else if(n==="disconnected")this._audioQuality=1;else if(n==="failed"){if(this._iceRestartAttempts||(this._iceRestartAttempts=0),this._iceRestartAttempts<2&&this._isCaller&&this._pc){this._iceRestartAttempts++,console.warn("[Simson] ICE failed, attempting restart",this._iceRestartAttempts),this._pc.restartIce();return}this._audioQuality=0,this._cleanupWebRTC()}this._render()},this._statsInterval=setInterval(()=>this._updateQuality(),3e3),this._startingWebRTC=!1,this._pendingOffer){let n=this._pendingOffer;this._pendingOffer=null,await this._handleWebRTCSignal(n)}}catch{this._actionError="Could not start call media. Check device permissions and retry.",this._cleanupWebRTC(),this._render()}finally{e===this._rtcGeneration&&(this._startingWebRTC=!1)}}async _handleWebRTCSignal(e){let{call_id:t,from_node_id:s,signal_type:n,data:r}=e;if(!(t&&this._currentCallId&&t!==this._currentCallId))if(n==="offer"){if(this._startingWebRTC){this._pendingOffer=e;return}if(this._pc||await this._startWebRTC(),!this._pc)return;if(this._makingOffer||this._pc.signalingState!=="stable"){if(!this._polite)return;await this._pc.setLocalDescription({type:"rollback"})}!this._isCaller&&this._localStream&&(this._pc.getSenders().some(l=>l.track)||this._localStream.getTracks().forEach(l=>{this._pc.addTrack(l,this._localStream)})),await this._pc.setRemoteDescription(new RTCSessionDescription(r)),await this._pc.setLocalDescription(),this._sendWebRTCSignal("answer",{sdp:this._pc.localDescription.sdp,type:this._pc.localDescription.type});for(let o of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(o));this._pendingCandidates=[]}else if(n==="answer"){if(this._pc&&this._pc.signalingState==="have-local-offer"){await this._pc.setRemoteDescription(new RTCSessionDescription(r));for(let a of this._pendingCandidates)await this._pc.addIceCandidate(new RTCIceCandidate(a));this._pendingCandidates=[]}}else n==="ice-candidate"&&(this._pc&&this._pc.remoteDescription?await this._pc.addIceCandidate(new RTCIceCandidate(r)):this._pendingCandidates.push(r))}_sendWebRTCSignal(e,t){let s=this._activeCallAttr("call_id")||this._currentCallId,n=this._currentRemoteNode;!s||!n||!this._hass||this._hass.callService("simson","send_webrtc_signal",{call_id:s,to_node_id:n,signal_type:e,data:t}).catch(r=>console.error("Simson: signal send failed:",r))}_cleanupWebRTC(){this._rtcGeneration=(this._rtcGeneration||0)+1,this._startingWebRTC=!1,this._statsInterval&&(clearInterval(this._statsInterval),this._statsInterval=null),this._pc&&(this._pc.close(),this._pc=null),this._localStream&&(this._localStream.getTracks().forEach(e=>e.stop()),this._localStream=null),this._remoteAudio.pause(),this._remoteAudio.srcObject=null,this._remoteStream=null,this._pendingOffer=null,this._makingOffer=!1,this._muted=!1,this._cameraMuted=!1,this._audioQuality=3,this._connectionType="",this._pendingCandidates=[],this._isCaller=!1,this._answeredByMe=!1,this._answerPendingCallId=null,this._iceRestartAttempts=0,this._cleanupSIPUA(),this._sipBridgeId=null,this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification()}_attachRemoteMedia(e,t=null){if(!e&&t&&(e=new MediaStream,e.addTrack(t)),!e)return;this._remoteStream=e,this._remoteAudio.autoplay=!0,this._remoteAudio.muted=!1,this._remoteAudio.volume=1,this._remoteAudio.srcObject=e;let s=e.getAudioTracks?e.getAudioTracks():[];console.log("[Simson] remote audio attached",{tracks:s.length,states:s.map(n=>n.readyState),muted:s.map(n=>n.muted)}),this._remoteAudio.play().catch(n=>{console.warn("[Simson] remote audio play blocked/failed:",n?.message||n)}),this._attachMediaElements(),e.getVideoTracks?.().length&&this._render()}_attachRemoteAudio(e,t=null){this._attachRemoteMedia(e,t)}async _updateQuality(){if(this._pc)try{let e=await this._pc.getStats(),t=0,s=0,n=0;e.forEach(a=>{if(a.type==="inbound-rtp"&&a.kind==="audio"&&(t=a.jitter||0,s=a.packetsLost||0,n=a.packetsReceived||1),a.type==="candidate-pair"&&a.state==="succeeded"){let o=e.get?e.get(a.remoteCandidateId):null;o?.candidateType&&(this._connectionType=o.candidateType)}});let r=s/Math.max(n,1);r>.1||t>.1?this._audioQuality=1:r>.03||t>.05?this._audioQuality=2:this._audioQuality=3,this._render()}catch{}}};var Y=i=>class extends i{_cleanupSIPUA(){if(this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}this._pendingSIPBridgeId=null}_endActiveCallFromSip(){let e=this._activeCallAttr("call_id")||this._currentCallId;e&&this._callService("hangup_call",{call_id:e}).catch(()=>{})}async _startSIPCall(e){if(console.log("[Simson SIP] _startSIPCall:",e),!e){console.warn("[Simson SIP] no bridgeId \u2014 abort");return}if(this._pendingSIPBridgeId===e||this._sipUA&&this._sipUA._activeBridge===e){console.log("[Simson SIP] already connecting/in bridge",e);return}if(this._pendingSIPBridgeId=e,this._sipUA){try{this._sipUA.disconnect()}catch{}this._sipUA=null}let t,s;try{[{MinimalSIPUA:t},s]=await Promise.all([import("./sip-ua-UHT3DF2Y.js"),this._fetchWebRTCConfig()])}catch{this._pendingSIPBridgeId=null,this._actionError="Could not load phone audio. Please retry.",this._render();return}if(this._pendingSIPBridgeId!==e||!this.isConnected)return;let n=s.sip||{};if(console.log("[Simson SIP] webrtc-config sip:",JSON.stringify({enabled:n.enabled,ws_url:n.ws_url,username:n.username,domain:n.domain})),!n.enabled||!n.ws_url||!n.username||!n.password){this._actionError="Phone audio is unavailable. Check the addon connection.",this._render(),this._pendingSIPBridgeId=null;return}let r="sip:"+n.username+"@"+n.domain;this._sipUA=new t({uri:r,captureMedia:()=>this._captureMedia(!1),password:n.password,wsUrl:n.ws_url,iceServers:s.ice_servers||y,onAudioTrack:(a,o)=>{this._attachRemoteAudio(a,o)},onRegistered:()=>{this._sipUA._activeBridge=e,this._pendingSIPBridgeId=null,this._sipUA.dial(e).catch(a=>{console.error("Simson SIP dial error:",a),this._cleanupSIPUA()})},onError:a=>{console.error("Simson SIP UA error:",a),this._pendingSIPBridgeId=null,this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it."),this._render()},onBye:()=>{this._cleanupSIPUA(),console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status."),this._render()}}),this._sipUA.connect()}};var K=i=>class extends i{_playRingtone(){this._stopRingtone();try{let e=new(window.AudioContext||window.webkitAudioContext);this._ringCtx=e,this._ringLoop=setInterval(()=>{let t=e.createOscillator(),s=e.createGain();t.connect(s),s.connect(e.destination),t.frequency.value=440,s.gain.setValueAtTime(.15,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),t.start(e.currentTime),t.stop(e.currentTime+.4),setTimeout(()=>{let n=e.createOscillator(),r=e.createGain();n.connect(r),r.connect(e.destination),n.frequency.value=480,r.gain.setValueAtTime(.15,e.currentTime),r.gain.exponentialRampToValueAtTime(.001,e.currentTime+.4),n.start(e.currentTime),n.stop(e.currentTime+.4)},200)},3e3)}catch{}}_stopRingtone(){this._ringLoop&&(clearInterval(this._ringLoop),this._ringLoop=null),this._ringCtx&&(this._ringCtx.close().catch(()=>{}),this._ringCtx=null)}_showIncomingPopup(){this._showPopup=!0,this._render()}_removePopup(){this._showPopup=!1,this._render()}_showUserPickerPopup(){this._pickerOpen=!0,this._render()}_removeUserPicker(){this._pickerOpen=!1,this._userPickerNodeId="",this._userPickerTargetId="",this._render()}async _requestNotificationPermission(){if(!(typeof Notification>"u"))try{this._notifPermission=await Notification.requestPermission(),this._render()}catch{}}_showBrowserNotification(e,t){if(!(typeof Notification>"u"||Notification.permission!=="granted")){this._dismissBrowserNotification();try{this._activeNotification=new Notification("Incoming Call",{body:`\u{1F4DE} ${e} \u2014 ${t} call`,tag:"simson-incoming-call",requireInteraction:!0}),this._activeNotification.onclick=()=>{window.focus(),this._activeNotification.close()}}catch{}}}_dismissBrowserNotification(){this._activeNotification&&(this._activeNotification.close(),this._activeNotification=null)}};var J=i=>class extends i{_callStateLabel(e){return{ended:"Completed",active:"Active",missed:"Missed",declined:"Declined",timeout:"No Answer",failed:"Failed",idle:"Idle",requesting:"Dialing",ringing:"Ringing",incoming:"Incoming"}[e]||e}_formatDuration(e){let t=Math.round(e);if(t<60)return`${t}s`;let s=Math.floor(t/60),n=t%60;return s<60?`${s}m ${n}s`:`${Math.floor(s/60)}h ${s%60}m`}_formatTime(e){try{let t=new Date(e*1e3),s=new Date,n=t.toDateString()===s.toDateString(),r=new Date(s);r.setDate(r.getDate()-1);let a=t.toDateString()===r.toDateString(),o=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return n?o:a?`Yesterday ${o}`:t.toLocaleDateString([],{month:"short",day:"numeric"})+" "+o}catch{return""}}_updateTimer(){if(!this._callStart)return;let e=this._root()?.querySelector("#call-timer");if(!e)return;let t=Math.floor((Date.now()-this._callStart)/1e3),s=String(Math.floor(t/60)).padStart(2,"0"),n=String(t%60).padStart(2,"0");e.textContent=`${s}:${n}`}_esc(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}_root(){return this.shadowRoot}_hasEditingFocus(){let e=this._root()?.activeElement;return e?["INPUT","TEXTAREA","SELECT"].includes(e.tagName):!1}};function X(){let i=this._nodeId(),e=this._isConnected(),t=this._callState(),s=this._activeCallAttr("call_id","")||this._currentCallId||"",n=this._activeCallAttr("direction",""),a=this._isCaller&&this._outgoingIntentAt&&Date.now()-this._outgoingIntentAt<15e3?"outgoing":n,o=this._hass?.user?.id||"",l=this._activeCallAttr("target_user_id",""),h=this._activeCallAttr("caller_user_id",""),m=this._activeCallAttr("answered_by_user_id",""),_=!s||s===this._currentCallId||!a||a==="incoming"&&(!l||l===o)&&(!m||m===o)||a==="outgoing"&&(!h||h===o),d=_&&["incoming","requesting","ringing","active"].includes(t)&&s?t:"idle",g=d==="idle"||d==="unknown",f=d==="incoming"&&a!=="outgoing"&&!this._isCaller,b=d==="requesting"||d==="ringing",C=d==="active",ge=d==="missed",fe=d==="declined",ve=d==="timeout",O=f||b||C,be=!!this._pc,B=this._activeCallAttr("call_type",""),H=this._activeCallAttr("sip_bridge_id",""),de=this._activeCallAttr("remote_name")||this._activeCallAttr("display_name")||this._activeCallAttr("remote_label")||this._activeCallAttr("remote_number")||this._activeCallAttr("remote_node_id")||this._currentRemoteNode||(a==="incoming"?"Caller":"Destination");s&&!this._currentCallId&&_&&(this._currentCallId=s),O&&!this._currentRemoteNode&&(this._currentRemoteNode=this._activeCallAttr("remote_node_id",""));let x=this._prevCallState;if(x!==d)if(this._prevCallState=d,d==="incoming"&&x==="idle")this._incomingSuppressUntil&&Date.now()<this._incomingSuppressUntil?(this._ignoredCallId=s,this._prevCallState="idle"):this._ignoredCallId&&this._ignoredCallId===s||(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),this._isCaller=!1,this._polite=!0,this._incomingFrom=this._activeCallAttr("remote_label")||this._currentRemoteNode||"Unknown",this._incomingCallType=this._activeCallAttr("call_type")||"voice",this._playRingtone(),this._showIncomingPopup(),this._showBrowserNotification(this._incomingFrom,this._incomingCallType));else if(d==="active"&&x!=="active"){if(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id",""),H&&(this._sipBridgeId=H),this._isCaller=a==="outgoing"||this._isCaller,this._outgoingIntentAt=0,this._polite=!this._isCaller,!this._callStart){let I=Number(this._activeCallAttr("started_at",0));this._callStart=I>0?I*1e3:Date.now()}B==="sip"||String(this._currentRemoteNode||"").startsWith("sip:")||String(this._currentRemoteNode||"").startsWith("asterisk:")?this._sipBridgeId?this._startSIPCall(this._sipBridgeId).catch(I=>console.error("[Simson] SIP state active start:",I)):console.warn("[Simson] Active SIP state missing sip_bridge_id",{callId:s,remote:this._currentRemoteNode}):this._startWebRTC()}else d==="idle"&&x!=="idle"&&(this._stopRingtone(),this._removePopup(),this._dismissBrowserNotification(),this._cleanupWebRTC(),this._callStart=null,this._currentCallId=null,this._currentRemoteNode=null,this._ignoredCallId=null,this._isCaller=!1,this._outgoingIntentAt=0,setTimeout(()=>this._loadHistory(),2e3));return b&&_&&!this._currentCallId&&s&&(this._currentCallId=s,this._currentRemoteNode=this._activeCallAttr("remote_node_id","")),{nodeId:i,connected:e,direction:a,isIdle:g,isIncoming:f,isRinging:b,isActive:C,hasCall:O,activeCallType:B,remoteLabel:de,callId:s}}var he=J(K(Y(Q(F(q(j(k))))))),S=class extends he{views=new Set;set hass(e){let t=this._hass;t?.connection&&t.connection!==e?.connection&&this._unsubscribeHAEvents(),this._hass=e,!this._config.node_id&&!this._detectedNodeId&&this._autoDetectNodeId(),this.isConnected&&this._connectHA();let s=this._nodeId(),n=["connection","call_state","active_call","calls_count"];(!t||t.user?.id!==e?.user?.id||n.some(a=>t.states?.[`sensor.simson_${s}_${a}`]!==e?.states?.[`sensor.simson_${s}_${a}`]))&&this.requestUpdate()}_connectHA(){this._hass&&(this._haEventSubscribed||this._subscribeHAEvents(),!this._userHeartbeatInterval&&this._hass.user&&(this._sendUserHeartbeat(),this._userHeartbeatInterval=setInterval(()=>this._sendUserHeartbeat(),2e4)),!this._targetsLoaded&&!this._targetsLoading&&this._loadTargets())}connectedCallback(){super.connectedCallback(),this._connectHA(),this._timerInterval=setInterval(()=>{for(let e of this.views)this._viewHost=e,this._updateTimer()},1e3),navigator.mediaDevices?.addEventListener?.("devicechange",this._deviceChangeHandler)}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._timerInterval),clearInterval(this._userHeartbeatInterval),clearTimeout(this._incomingCallTimeout),this._userHeartbeatInterval=null,this._unsubscribeHAEvents(),navigator.mediaDevices?.removeEventListener?.("devicechange",this._deviceChangeHandler),this._stopMediaPreview(!1),this._cleanupWebRTC(),this._removeUserPicker()}_render(){this.requestUpdate()}willUpdate(){this._view=this._nodeId()?X.call(this):null,this._view?.hasCall&&this._stopMediaPreview(!1)}updated(){for(let e of this.views)e.requestUpdate()}_root(){return this._viewHost?.shadowRoot||this.shadowRoot}_selectTab(e){e!=="media"&&this._stopMediaPreview(!1),this._activeTab=e,e==="history"&&!this._historyLoaded&&this._loadHistory(),e==="media"&&this._refreshMediaDevices(!1),this.requestUpdate()}render(){return u}};customElements.get("simson-call-session")||customElements.define("simson-call-session",S);var Z=new WeakMap;function ee(i,e,t){let s=e.connection||e,n=Z.get(s);n||Z.set(s,n=new Map);let a=t.node_id||[t.connection_entity,t.call_state_entity,t.calls_count_entity].map(h=>h?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean)||Object.keys(e.states||{}).map(h=>h.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean)||"",o=`${e.user?.id||""}:${a}`,l=n.get(o);if(l||(l=new S,l.hidden=!0,l.setConfig({...t,node_id:a}),l.hass=e,l._release=()=>n.delete(o),n.set(o,l),document.body.append(l)),clearTimeout(l._releaseTimer),!l.views.has(i)||i._sessionConfig!==t){l.views.add(i),i._sessionConfig=t;let h=l._config,m=[...l.views].flatMap(_=>{let p=_._config.target_nodes;return Array.isArray(p)?p:p?[p]:[]});l.setConfig({...h,...t,node_id:a,target_nodes:m}),t.view==="history"&&l._loadHistory(),t.view==="devices"&&l._refreshMediaDevices(!1)}return l}function N(i,e){i.views.delete(e),i.views.size||(i._releaseTimer=setTimeout(()=>{i.views.size||(i.remove(),i._release())},0))}var te={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},ie=i=>(...e)=>({_$litDirective$:i,values:e}),T=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:ue}=z,se=i=>i;var ne=()=>document.createComment(""),w=(i,e,t)=>{let s=i._$AA.parentNode,n=e===void 0?i._$AB:e._$AA;if(t===void 0){let r=s.insertBefore(ne(),n),a=s.insertBefore(ne(),n);t=new ue(r,a,i,i.options)}else{let r=t._$AB.nextSibling,a=t._$AM,o=a!==i;if(o){let l;t._$AQ?.(i),t._$AM=i,t._$AP!==void 0&&(l=i._$AU)!==a._$AU&&t._$AP(l)}if(r!==n||o){let l=t._$AA;for(;l!==r;){let h=se(l).nextSibling;se(s).insertBefore(l,n),l=h}}}return t},v=(i,e,t=i)=>(i._$AI(e,t),i),pe={},ae=(i,e=pe)=>i._$AH=e,re=i=>i._$AH,$=i=>{i._$AR(),i._$AA.remove()};var oe=(i,e,t)=>{let s=new Map;for(let n=e;n<=t;n++)s.set(i[n],n);return s},P=ie(class extends T{constructor(i){if(super(i),i.type!==te.CHILD)throw Error("repeat() can only be used in text expressions")}dt(i,e,t){let s;t===void 0?t=e:e!==void 0&&(s=e);let n=[],r=[],a=0;for(let o of i)n[a]=s?s(o,a):a,r[a]=t(o,a),a++;return{values:r,keys:n}}render(i,e,t){return this.dt(i,e,t).values}update(i,[e,t,s]){let n=re(i),{values:r,keys:a}=this.dt(e,t,s);if(!Array.isArray(n))return this.ut=a,r;let o=this.ut??=[],l=[],h,m,_=0,p=n.length-1,d=0,g=r.length-1;for(;_<=p&&d<=g;)if(n[_]===null)_++;else if(n[p]===null)p--;else if(o[_]===a[d])l[d]=v(n[_],r[d]),_++,d++;else if(o[p]===a[g])l[g]=v(n[p],r[g]),p--,g--;else if(o[_]===a[g])l[g]=v(n[_],r[g]),w(i,l[g+1],n[_]),_++,g--;else if(o[p]===a[d])l[d]=v(n[p],r[d]),w(i,n[_],n[p]),p--,d++;else if(h===void 0&&(h=oe(a,d,g),m=oe(o,_,p)),h.has(o[_]))if(h.has(o[p])){let f=m.get(a[d]),b=f!==void 0?n[f]:null;if(b===null){let C=w(i,n[_]);v(C,r[d]),l[d]=C}else l[d]=v(b,r[d]),w(i,n[_],b),n[f]=null;d++}else $(n[p]),p--;else $(n[_]),_++;for(;d<=g;){let f=w(i,l[g+1]);v(f,r[d]),l[d++]=f}for(;_<=p;){let f=n[_++];f!==null&&$(f)}return this.ut=a,ae(i,l),W}});function E(i,e){let t=i._smartDialRoute(i._nodeInputDraft),s=[...i._targets];for(let a of i._config.target_nodes||[])s.some(o=>(o.node_id||o.id)===a)||s.push({id:a,node_id:a,label:a,type:"node"});let n=e.connected&&!e.hasCall,r=()=>n&&i._runAction("dial",()=>i._dialSmartValue(i._nodeInputDraft,i._pstnTrunkDraft));return c`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>A teammate, a room, or a number. One place to call.</p></div>
    <div class="route-options" aria-label="Call route">${[["auto","Auto"],["node","Node"],["sip","SIP phone"],["pstn","Outside"]].map(([a,o])=>c`<button class=${i._smartRouteMode===a?"selected":""} aria-pressed=${i._smartRouteMode===a} @click=${()=>{i._smartRouteMode=a,i.requestUpdate()}}>${o}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${i._nodeInputDraft} placeholder="Search a node or dial a number" @input=${a=>{i._nodeInputDraft=a.target.value,i.requestUpdate()}} @keydown=${a=>{a.key==="Enter"&&r()}}><button class="primary" aria-label="Place call" ?disabled=${!n||!!i._actionPending||!i._nodeInputDraft.trim()} @click=${r}>Call ↗</button></div></label>
    <div class="route-hint"><span>${t.label}</span><small>${t.hint}</small></div>
    ${t.kind==="pstn"?c`<label class="field"><span>Gateway trunk</span><input .value=${i._pstnTrunkDraft||i._effectivePstnTrunk()} placeholder="Site default" @input=${a=>{i._pstnTrunkDraft=a.target.value}}></label>`:u}
    <div class="section-heading"><h3>Quick connections</h3><span>${s.length} saved</span></div>
    ${s.length?c`<div class="contacts">${P(s,a=>a.id,a=>c`<button class="contact" ?disabled=${!n||!!i._actionPending} @click=${()=>{(a.type||"node")==="node"?(i._userPickerNodeId=a.node_id||a.id,i._userPickerTargetId=a.id,i._callService("get_remote_users",{node_id:i._userPickerNodeId})):i._runAction("target:"+a.id,()=>i._dialTarget(a.id,a.type,a.node_id))}}><span class="avatar">${String(a.label||a.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${a.label||a.id}</b><small>${a.type==="node"?"Home Assistant":a.trunk?"Gateway \xB7 "+a.trunk:"SIP \xB7 "+(a.extension||a.id)}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`:c`<div class="empty compact">${i._targetsLoading?"Loading your contacts\u2026":"Saved nodes and phones appear here. You can always dial above."}</div>`}
    <button class="text-button" @click=${()=>i._selectTab("media")}>${i._videoEnabled?"Camera enabled for node calls":"Audio calls"} · Check your devices →</button>
  </section>`}function U(i,e){let t=!!i._localStream?.getVideoTracks().length,s=!!i._remoteStream?.getVideoTracks().length,n=e.isActive&&(t||s),r=(a,o)=>()=>i._runAction(a,o);return c`<section class="call-workspace">
    <span class="eyebrow">${e.isActive?"LIVE CONVERSATION":e.isIncoming?"INCOMING CALL":"CONNECTING"}</span>
    ${n?c`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${s?u:c`<span class="video-wait">Waiting for their camera</span>`}${t?c`<video class="local-video" id="local-video" autoplay muted playsinline></video>`:u}<span class="live-label">LIVE</span></div>`:c`<div class="call-avatar">${String(e.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${e.remoteLabel}</h2><p class="call-caption">${e.isActive?"Connected":e.isIncoming?"Would like to talk to you":"Waiting for an answer\u2026"} <span id="call-timer"></span></p>
    ${i._micAllowed===!1?c`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>`:u}
    <div class="call-actions">
      ${e.isIncoming?c`<button class="primary" @click=${r("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${r("reject",()=>i._reject())}>Decline</button>`:c`
        <button aria-pressed=${i._muted} ?disabled=${!e.isActive} @click=${r("mute",()=>i._toggleMute())}>${i._muted?"Unmute":"Mute"}</button>
        ${t?c`<button aria-pressed=${i._cameraMuted} @click=${r("camera",()=>i._toggleCamera())}>${i._cameraMuted?"Camera on":"Camera off"}</button>`:u}
        <button class="danger" @click=${r("hangup",()=>i._hangup())}>End call</button>
      `}
    </div>
    ${e.isActive&&(i._sipBridgeId||e.activeCallType==="sip")?c`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${i._transferNodeDraft} @input=${a=>{i._transferNodeDraft=a.target.value,i.requestUpdate()}}></label><div class="call-actions"><button ?disabled=${!i._transferNodeDraft.trim()} @click=${r("transfer-node",()=>i._transferCall(i._transferNodeDraft))}>To node</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${r("transfer-sip",()=>i._transferCall("sip:"+i._transferNodeDraft.replace(/^sip:/i,"")))}>To SIP</button><button ?disabled=${!i._transferNodeDraft.trim()} @click=${()=>i._loadTransferUsers(i._transferNodeDraft)}>Choose user</button></div>${i._transferUsers.map(a=>c`<button class="contact" @click=${r("transfer-user:"+a.user_id,()=>i._transferCall(i._transferUsersNode,a.user_id,a.user_name))}>${a.user_name}</button>`)}</details>`:u}
  </section>`}function M(i){return c`<section><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>i._loadHistory()}>Refresh</button></div>${i._history.length?c`<div class="history">${P(i._history.slice(0,50),(e,t)=>e.call_id||t,e=>c`<div class="history-row"><span class="avatar ${["missed","failed","declined"].includes(e.state)?"missed":""}">${e.direction==="incoming"?"\u2199":"\u2197"}</span><div class="contact-text"><b>${e.remote_label||e.remote_node_id||"Unknown caller"}</b><small>${e.state} · ${i._formatDuration(e.duration||0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{i._nodeInputDraft=e.remote_node_id||"",i._selectTab("dial")}}>Call ↗</button></div>`)}</div>`:c`<div class="empty">${i._historyLoaded?"Your conversations will appear here.":"Loading recent calls\u2026"}</div>`}</section>`}function R(i){let e=i._mediaDevices,t=(s,n,r)=>c`<label class="field"><span>${s}</span><select .value=${i[r]} @change=${a=>{i[r]=a.target.value,i._saveMediaPreferences(),i._mediaPreviewStream&&i._startMediaPreview(),i.requestUpdate()}}><option value="">System default</option>${n.map((a,o)=>c`<option value=${a.deviceId}>${a.label||s+" "+(o+1)}</option>`)}</select></label>`;return c`<section class="media-workspace"><div class="section-heading"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Your devices</h2></div><button @click=${()=>i._runAction("detect",()=>i._refreshMediaDevices(!0))}>Detect</button></div>
    ${i._mediaDeviceError?c`<div class="notice error" role="alert">${i._mediaDeviceError}</div>`:u}
    <div class="preview"><video id="media-local-preview" autoplay muted playsinline></video>${i._mediaPreviewStream?.getVideoTracks().length?u:c`<div class="preview-empty"><b>${i._videoEnabled?"Camera preview":"Audio-only mode"}</b><small>${globalThis.isSecureContext?"Your preview stays on this device":"Open Home Assistant over HTTPS for camera access"}</small></div>`}<span class="live-label">${i._mediaPreviewStream?"PREVIEW ON":"PRIVATE"}</span></div>
    <label class="toggle"><span><b>Video for node calls</b><small>Share your camera when you connect</small></span><input type="checkbox" .checked=${i._videoEnabled} @change=${s=>{i._videoEnabled=s.target.checked,i._saveMediaPreferences(),i._mediaPreviewStream&&i._startMediaPreview(),i.requestUpdate()}}></label>
    <div class="device-grid">${t("Microphone",e.audioInputs,"_selectedAudioInput")}${t("Camera",e.videoInputs,"_selectedVideoInput")}${t("Speaker",e.audioOutputs,"_selectedAudioOutput")}</div>
    <div class="call-actions"><button class="primary" ?disabled=${!navigator.mediaDevices?.getUserMedia} @click=${()=>i._runAction("preview",()=>i._startMediaPreview())}>${i._mediaPreviewStream?"Restart preview":"Test devices"}</button>${i._mediaPreviewStream?c`<button @click=${()=>i._stopMediaPreview()}>Stop preview</button>`:u}</div><p class="fine-print">Device choices stay in this browser. Speaker selection depends on browser support.</p>
    ${i._notifPermission==="default"?c`<button class="text-button" @click=${()=>i._requestNotificationPermission()}>Enable incoming-call notifications</button>`:u}
  </section>`}function le(i){if(!i._pickerOpen&&!i._showPopup)return u;let e=i._pickerOpen,t=s=>{let n=i._userPickerNodeId;i._removeUserPicker(),i._runAction("call-user",()=>i._dial(n,s?.user_id,s?.user_name))};return c`<div class="dialog-scrim"><section class="dialog" role="dialog" aria-modal="true" aria-label=${e?"Choose call recipient":"Incoming call"} @keydown=${s=>{s.key==="Escape"&&e&&i._removeUserPicker()}}>
    <span class="eyebrow">${e?"CHOOSE A RECIPIENT":"INCOMING CALL"}</span>
    <h2>${e?i._userPickerNodeId:i._incomingFrom}</h2>
    ${e?c`<div class="dialog-options"><button class="primary" @click=${()=>t(null)}>Call everyone on this node</button>${i._remoteUsers.map(s=>c`<button @click=${()=>t(s)}>${s.user_name||s.user_id}</button>`)}</div><button class="text-button" @click=${()=>i._removeUserPicker()}>Cancel</button>`:c`<p>Would like to talk to you.</p><div class="call-actions"><button class="primary" @click=${()=>i._runAction("answer",()=>i._answer())}>Answer</button><button class="danger" @click=${()=>i._runAction("reject",()=>i._reject())}>Decline</button></div>`}
  </section></div>`}var ce=`:host {
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
`;var L=class extends A{static styles=V(ce);constructor(){super(),this._config={}}setConfig(e){this._config=e||{},this._bindSession(),this.requestUpdate()}set hass(e){this._hass=e,this._bindSession(),this.session&&(this.session.hass=e)}_bindSession(){if(!this.isConnected||!this._hass)return;let e=ee(this,this._hass,this._config);this.session!==e&&(this.session&&N(this.session,this),this.session=e,this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._bindSession()}disconnectedCallback(){super.disconnectedCallback(),this.session&&N(this.session,this),this.session=null}updated(){this.session&&(this.session._viewHost=this,this.session._attachMediaElements(),this.session._updateTimer())}render(){let e=this.session,t=e?._view,s=this._config.view||"combined",n=this._config.title||{dial:"Dial a call",live:"Live call",history:"Recent calls",devices:"Call devices"}[s]||"Simson",r=e?._activeTab||"dial",a=e?[...e.views]:[],o=a.find(m=>["dial","combined"].includes(m._config.view||"combined")),l=a.find(m=>m._config.view==="live")||o,h=e&&(e._pickerOpen?o===this:l===this);return c`<article class="surface mode-${s}">
      <header class="header"><span class="brand-mark" aria-hidden="true">S</span><div class="heading"><span class="eyebrow">SIMSON · ${s==="combined"?"CALL WORKSPACE":s.toUpperCase()}</span><h1>${n}</h1></div><span class="status ${t?.connected?"online":""}"><i></i>${t?.connected?"Connected":"Offline"}</span></header>
      ${t?c`
        ${t.connected?u:c`<div class="notice" role="status"><b>Node is offline</b><br>Calling resumes when the addon reconnects. Your saved contacts remain available.</div>`}
        ${e._actionError?c`<div class="notice error" role="alert">${e._actionError}</div>`:u}
        ${e._actionPending?c`<div class="action-progress" role="status">${e._actionPending}</div>`:u}
        ${s==="live"?t.hasCall?U(e,t):c`<div class="live-idle"><span class="idle-indicator"></span><h2>Ready for your next call</h2><p>Answer, mute, video and hang-up controls appear here during a call.</p></div>`:s==="history"?M(e):s==="devices"?R(e):s==="dial"?r==="media"?c`<button class="text-button" @click=${()=>e._selectTab("dial")}>← Back to dialing</button>${R(e)}`:E(e,t):c`
            ${t.hasCall?U(e,t):u}
            <nav class="tabs" aria-label="Call workspace">${[["dial","Dial"],["history","Recent"],["media","Devices"]].map(([m,_])=>c`<button class=${r===m?"selected":""} aria-current=${r===m?"page":"false"} @click=${()=>e._selectTab(m)}>${_}</button>`)}</nav>
            ${r==="history"?M(e):r==="media"?R(e):t.hasCall?c`<p class="fine-print">End the current call before starting another.</p>`:E(e,t)}
          `}
      `:c`<div class="empty"><h2>Waiting for your node</h2><p>Select a Simson node in the card editor, or wait for the integration to connect.</p></div>`}
      ${h?le(e):u}
      <footer><span>${e?._nodeId()||"Connecting node"}</span><span>v${G}</span></footer>
    </article>`}};customElements.get("simson-card-runtime")||customElements.define("simson-card-runtime",L);export{L as SimsonCard};
