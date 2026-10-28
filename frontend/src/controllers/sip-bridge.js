import { ICE_SERVERS } from '../transport/ice.js';
export const withSipBridge = Base => class extends Base {
_cleanupSIPUA() {
    this._sipRoomMedia?.close();
    this._sipRoomMedia=null;
    this._sipRoomMediaGeneration=(this._sipRoomMediaGeneration||0)+1;
    this._roomVideoError='';
    if (this._sipUA) {
      try { this._sipUA.disconnect(); } catch (e) { /* ignore */ }
      this._sipUA = null;
    }
    this._pendingSIPBridgeId = null;
    this._sipAudioStream=null;
  }

_attachSIPAudio(stream,track) {
    if(!this._sipRoomMedia){this._attachRemoteAudio(stream,track);return;}
    const tracks=stream?.getAudioTracks?.()||[];
    if(track?.kind==='audio'&&!tracks.includes(track))tracks.push(track);
    if(!tracks.length)return;
    this._sipAudioStream ||= new MediaStream();
    for(const audio of tracks)if(!this._sipAudioStream.getAudioTracks().includes(audio))this._sipAudioStream.addTrack(audio);
    this._attachRemoteAudio(this._sipAudioStream);
  }

_endActiveCallFromSip() {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    if (!callId) return;
    this._callService("hangup_call", { call_id: callId }).catch(() => {});
  }

async _startSIPCall(bridgeId) {
    console.log("[Simson SIP] _startSIPCall:", bridgeId);
    if (!bridgeId || (!this._initiatedHere && !this._answeredByMe && !this._answerPendingCallId)) return;
    // Guard against double-start: set pending flag BEFORE the async gap so a second
    // call (from set hass() sensor update racing with the HA event) exits early.
    if (this._pendingSIPBridgeId === bridgeId || (this._sipUA && this._sipUA._activeBridge === bridgeId)) {
      console.log("[Simson SIP] already connecting/in bridge", bridgeId); return;
    }
    this._pendingSIPBridgeId = bridgeId;
    this._mediaDeviceError = '';
    this._actionError = '';
    // Tear down any previous UA but preserve our pending flag.
    if (this._sipUA) { try { this._sipUA.disconnect(); } catch (e) {} this._sipUA = null; }

    let MinimalSIPUA;
    let cfg;
    try {
      [{ MinimalSIPUA }, cfg] = await Promise.all([
        import('../transport/sip-ua.js'), this._fetchWebRTCConfig(),
      ]);
    } catch (error) {
      this._pendingSIPBridgeId = null;
      this._mediaDeviceError = 'The media connection failed. Could not load phone audio. Please retry.';
      this._render();
      return;
    }
    if (this._pendingSIPBridgeId !== bridgeId || !this.isConnected) return;
    const sip = cfg?.sip || {};
    console.log("[Simson SIP] webrtc-config sip:", JSON.stringify({enabled: sip.enabled, ws_url: sip.ws_url, username: sip.username, domain: sip.domain}));
    if (!sip.enabled || !sip.ws_url || !sip.username || !sip.password) {
      this._mediaDeviceError = 'The media connection failed. ' + (sip.reason || this._webrtcConfigError || 'Phone audio configuration is incomplete. Check the addon connection and retry.');
      this._render();
      this._pendingSIPBridgeId = null;
      return;
    }
    const uri = "sip:" + sip.username + "@" + sip.domain;
    const ua = new MinimalSIPUA({
      uri,
      captureMedia: () => this._captureMedia(false),
      password: sip.password,
      wsUrl: sip.ws_url,
      iceServers: cfg.ice_servers || ICE_SERVERS,
      onAudioTrack: (stream, track) => {
        if(this._sipUA!==ua)return;
        this._attachSIPAudio(stream, track);
      },
      onRegistered: () => {
        if(this._sipUA!==ua)return;
        ua._activeBridge = bridgeId;
        this._pendingSIPBridgeId = null;
        ua.dial(bridgeId).catch(e => {
          if(this._sipUA!==ua)return;
          console.error("Simson SIP dial error:", e);
          this._mediaDeviceError = 'The media connection failed. ' + (e?.message || 'Could not join the SIP media bridge. Please retry.');
          this._cleanupSIPUA();
          this._render();
        });
      },
      onError: (e) => {
        if(this._sipUA!==ua)return;
        this._mediaDeviceError='The media connection failed. '+(e?.message || 'Phone audio is unavailable; retry the media connection.');
        console.error("Simson SIP UA error:", e);
        this._pendingSIPBridgeId = null;
        this._cleanupSIPUA();
        console.warn("[Simson SIP] Browser bridge error did not hang up the real call; use Hang Up to end it.");
        this._render();
      },
      onBye: () => {
        if(this._sipUA!==ua)return;
        this._cleanupSIPUA();
        console.warn("[Simson SIP] Browser bridge leg ended; waiting for VPS/Asterisk call status.");
        this._render();
      },
    });
    this._sipUA=ua;
    ua.connect();
    this._startSIPRoomMedia(ua,cfg.ice_servers||ICE_SERVERS);
  }

async _startSIPRoomMedia(ua,iceServers) {
    const generation=this._sipRoomMediaGeneration=(this._sipRoomMediaGeneration||0)+1;
    try{
      const [{SipRoomMedia},{roomMediaContext}]=await Promise.all([
        import('../transport/sip-room-media.js'),import('../transport/room-display-relay.js')]);
      for(let attempt=0;attempt<30;attempt++){
        if(this._sipUA!==ua||generation!==this._sipRoomMediaGeneration)return;
        if(!this._answeredByMe){await new Promise(resolve=>setTimeout(resolve,500));continue;}
        const context=await roomMediaContext(this);
        if(this._sipUA!==ua||generation!==this._sipRoomMediaGeneration)return;
        if(context.media_role==='sip_caregiver'){
          this._sipRoomMedia?.close();this._sipRoomMedia=new SipRoomMedia(this,context,iceServers);
          this._sipRoomMedia.start();this._render();return;
        }
        if(context.media_role)return;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      if(this._sipUA===ua&&generation===this._sipRoomMediaGeneration){this._roomVideoError='Room video authorization is not available yet. Retry video without ending the audio call.';this._render();}
    }catch(error){
      if(this._sipUA===ua&&generation===this._sipRoomMediaGeneration){
        this._roomVideoError='Room video could not be loaded. Phone audio is independent.';this._render();
      }
    }
  }
};
