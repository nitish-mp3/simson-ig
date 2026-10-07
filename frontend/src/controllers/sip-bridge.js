import { ICE_SERVERS } from '../transport/ice.js';
export const withSipBridge = Base => class extends Base {
_cleanupSIPUA() {
    if (this._sipUA) {
      try { this._sipUA.disconnect(); } catch (e) { /* ignore */ }
      this._sipUA = null;
    }
    this._pendingSIPBridgeId = null;
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
      this._actionError = 'Could not load phone audio. Please retry.';
      this._render();
      return;
    }
    if (this._pendingSIPBridgeId !== bridgeId || !this.isConnected) return;
    const sip = cfg.sip || {};
    console.log("[Simson SIP] webrtc-config sip:", JSON.stringify({enabled: sip.enabled, ws_url: sip.ws_url, username: sip.username, domain: sip.domain}));
    if (!sip.enabled || !sip.ws_url || !sip.username || !sip.password) {
      this._actionError = 'Phone audio is unavailable. Check the addon connection.';
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
        this._attachRemoteAudio(stream, track);
      },
      onRegistered: () => {
        if(this._sipUA!==ua)return;
        ua._activeBridge = bridgeId;
        this._pendingSIPBridgeId = null;
        ua.dial(bridgeId).catch(e => {
          if(this._sipUA!==ua)return;
          console.error("Simson SIP dial error:", e);
          this._cleanupSIPUA();
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
  }
};
