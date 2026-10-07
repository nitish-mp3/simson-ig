import { html, nothing } from 'lit';

export function callView(host, view) {
  const localVideo = Boolean(host._localStream?.getVideoTracks().length);
  const remoteVideo = Boolean(host._remoteStream?.getVideoTracks().some(track=>track.readyState==='live'&&!track.muted));
  const video = view.isActive && (localVideo || Boolean(host._remoteStream?.getVideoTracks().length));
  const isSipCall = view.activeCallType === 'sip' || host._currentCallType === 'sip';
  const mediaConnected = isSipCall ? host._sipUA?._pc?.connectionState === 'connected' : host._pc?.connectionState === 'connected';
  const incomingVideo = ['video', 'webrtc-video'].includes(host._incomingCallType || view.activeCallType);
  const mediaFailed = host._mediaDeviceError?.startsWith('The media connection failed.');
  const statusText = view.isActive ? (mediaFailed ? 'Media connection failed' : mediaConnected ? 'Connected' : 'Connecting media…') : view.isIncoming ? (incomingVideo ? 'Incoming video call' : 'Would like to talk to you') : view.callId ? 'Ringing · Waiting for an answer…' : 'Sending your call request to the node…';
  const act = (key, action) => () => host._runAction(key, action);
  return html`<section class="call-workspace">
    <span class="eyebrow">${view.isActive ? 'LIVE CONVERSATION' : view.isIncoming ? 'INCOMING CALL' : view.callId ? 'CALLING' : 'STARTING YOUR CALL'}</span>
    ${video ? html`<div class="video-stage"><video id="remote-video" autoplay muted playsinline></video>${!remoteVideo ? html`<span class="video-wait">Waiting for their camera</span>` : nothing}${localVideo ? html`<video class="local-video" id="local-video" autoplay muted playsinline></video>` : nothing}<span class="live-label">LIVE</span></div>` : html`<div class="call-avatar">${String(view.remoteLabel).slice(0,2).toUpperCase()}</div>`}
    <h2>${view.remoteLabel}</h2><p class="call-caption" role="status">${statusText} <span id="call-timer"></span></p>
    ${!view.isActive && !view.isIncoming ? html`<div class="call-setup-status" role="status"><span class="call-setup-spinner"></span><span><b>${view.callId ? 'The destination is being called' : 'Connecting to your call service'}</b><small>${view.callId ? 'You can stay here while the other phone rings.' : 'This card will update as soon as the node responds.'}</small></span></div>` : nothing}
    ${host._micAllowed === false ? html`<div class="notice error">Microphone unavailable. Allow microphone access in your browser to speak.</div>` : nothing}
    ${host._mediaDeviceError ? html`<div class="notice error" role="status">${host._mediaDeviceError}</div>` : nothing}
    ${view.isActive && host._playbackBlocked ? html`<button class="primary" @click=${act('enable-sound',async()=>{await host._remoteAudio.play();host._playbackBlocked=false;host._render();})}>Enable call sound</button>` : nothing}
    ${view.isActive && mediaFailed && (host._initiatedHere || host._answeredByMe) ? html`<button class="primary" @click=${act('retry-media',()=>{host._webrtcConfig=null;host._webrtcConfigNextRetryAt=0;return isSipCall?host._startSIPCall(host._sipBridgeId || view.activeSipBridgeId):host._startWebRTC();})}>Retry media connection</button>` : nothing}
    ${host._isCaller && !host._initiatedHere && !isSipCall ? html`<div class="browser-join"><p>This call was started by a script or another dashboard. Choose this browser to use its microphone and camera.</p><button class="primary" @click=${act('join-browser',()=>host._joinUserCall())}>Use this browser for audio${host._currentCallType === 'video' ? ' & video' : ''}</button></div>` : nothing}
    <div class="call-actions">
      ${view.isIncoming ? html`<button class="primary" ?disabled=${Boolean(host._actionPending)} @click=${act('answer', () => host._answer())}>Answer</button><button class="danger" ?disabled=${Boolean(host._actionPending)} @click=${act('reject', () => host._reject())}>Decline</button>` : html`
        <button aria-pressed=${host._muted} ?disabled=${!view.isActive} @click=${act('mute', () => host._toggleMute())}>${host._muted ? 'Unmute' : 'Mute'}</button>
        ${localVideo ? html`<button aria-pressed=${host._cameraMuted} @click=${act('camera', () => host._toggleCamera())}>${host._cameraMuted ? 'Camera on' : 'Camera off'}</button>` : nothing}
        ${view.isActive && !isSipCall && !localVideo && host._pc ? html`<button @click=${act('enable-camera',()=>host._enableCamera())}>Enable camera</button>` : nothing}
        <button class="danger" ?disabled=${!view.callId || Boolean(host._actionPending)} @click=${act('hangup', () => host._hangup())}>${view.callId ? 'End call' : 'Starting…'}</button>
      `}
    </div>
    ${view.isActive && (host._sipBridgeId || view.activeCallType === 'sip') ? html`<details class="transfer"><summary>Transfer this call</summary><label class="field"><span>Node ID or SIP extension</span><input .value=${host._transferNodeDraft} @input=${event => {host._transferNodeDraft=event.target.value;host.requestUpdate();}}></label><div class="call-actions"><button ?disabled=${!host._transferNodeDraft.trim()} @click=${act('transfer-node', () => host._transferCall(host._transferNodeDraft))}>To node</button><button ?disabled=${!host._transferNodeDraft.trim()} @click=${act('transfer-sip', () => host._transferCall('sip:'+host._transferNodeDraft.replace(/^sip:/i,'')))}>To SIP</button><button ?disabled=${!host._transferNodeDraft.trim()} @click=${() => host._loadTransferUsers(host._transferNodeDraft)}>Choose user</button></div>${host._transferUsers.map(user => html`<button class="contact" @click=${act('transfer-user:'+user.user_id, () => host._transferCall(host._transferUsersNode,user.user_id,user.user_name))}>${user.user_name}</button>`)}</details>` : nothing}
  </section>`;
}
