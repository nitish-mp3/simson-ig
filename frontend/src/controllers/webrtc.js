import { ICE_SERVERS } from '../transport/ice.js';
export const withWebRTC = Base => class extends Base {
async _fetchWebRTCConfig() {
    if (this._webrtcConfig) return this._webrtcConfig; // cache
    if (this._webrtcConfigPromise) return this._webrtcConfigPromise;
    if (Date.now() < (this._webrtcConfigNextRetryAt || 0)) {
      return { ice_servers: ICE_SERVERS, sip: { enabled: false } };
    }
    this._webrtcConfigPromise = (async () => {
      try {
        const token = this._hass?.auth?.data?.access_token;
        const resp = await fetch("/api/webrtc-config", {
          headers: token ? { Authorization: "Bearer " + token } : {},
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          this._webrtcConfig = await resp.json();
          this._webrtcConfigNextRetryAt = 0;
          return this._webrtcConfig;
        }
      } catch (e) { /* fall through to defaults */ }
      this._webrtcConfigNextRetryAt = Date.now() + 30000;
      return { ice_servers: ICE_SERVERS, sip: { enabled: false } };
    })();
    try {
      const config = await this._webrtcConfigPromise;
      this._turnAvailable = this._hasTurnRelay(config);
      if (this.isConnected) this._render();
      return config;
    } finally {
      this._webrtcConfigPromise = null;
    }
  }

_hasTurnRelay(config) {
    const servers = Array.isArray(config?.ice_servers) ? config.ice_servers : [];
    return servers.some(server => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some(url => /^(turn|turns):/i.test(String(url || "")));
    });
  }

async _startWebRTC() {
    if (this._pc) return;
    if (this._startingWebRTC) return;
    this._startingWebRTC = true;
    this._stopMediaPreview(false);
    const generation = this._rtcGeneration = (this._rtcGeneration || 0) + 1;
    try {

    const mediaPromise = (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        this._micAllowed = false;
        return;
      }
      try {
        const activeType = this._currentCallType || this._activeCallAttr("call_type", "") || this._incomingCallType || "voice";
        const stream = await this._captureMedia(["video", "webrtc-video"].includes(activeType));
        if (generation !== this._rtcGeneration || !this.isConnected) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        this._localStream = stream;
        this._micAllowed = true;
      } catch (error) {
        this._micAllowed = false;
        this._mediaDeviceError = error?.message || "Allow microphone access to speak.";
      }
    })();
    const [wrtcCfg] = await Promise.all([this._fetchWebRTCConfig(), mediaPromise]);
    if (generation !== this._rtcGeneration || !this.isConnected) return;
    const iceServers = Array.isArray(wrtcCfg.ice_servers) ? wrtcCfg.ice_servers : ICE_SERVERS;
    this._turnAvailable = this._hasTurnRelay({ ice_servers: iceServers });

    if (generation !== this._rtcGeneration || !this.isConnected) return;
    this._pc = new RTCPeerConnection({ iceServers });
    this._pendingCandidates = [];
    this._makingOffer = false;

    // CALLER adds tracks immediately → triggers onnegotiationneeded → creates offer.
    // CALLEE defers — tracks are added in _handleWebRTCSignal when we receive the offer.
    if (this._isCaller && this._localStream) {
      this._localStream.getTracks().forEach(track => {
        this._pc.addTrack(track, this._localStream);
      });
    }

    this._pc.ontrack = (ev) => {
      if (ev.streams?.[0]) {
        this._attachRemoteMedia(ev.streams[0], null);
      } else {
        const ms = new MediaStream();
        ms.addTrack(ev.track);
        this._attachRemoteMedia(ms, ev.track);
      }
    };

    this._pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this._sendWebRTCSignal("ice-candidate", {
          candidate: ev.candidate.candidate,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex,
        });
      }
    };

    this._pc.onnegotiationneeded = async () => {
      try {
        this._makingOffer = true;
        await this._pc.setLocalDescription();
        this._sendWebRTCSignal("offer", {
          sdp: this._pc.localDescription.sdp,
          type: this._pc.localDescription.type,
        });
      } catch (e) {
        console.error("Simson: negotiation error:", e);
      } finally {
        this._makingOffer = false;
      }
    };

    this._pc.onconnectionstatechange = () => {
      const state = this._pc?.connectionState;
      if (state === "connected") { this._audioQuality = 3; this._iceRestartAttempts = 0; }
      else if (state === "disconnected") this._audioQuality = 1;
      else if (state === "failed") {
        // Attempt ICE restart before giving up (fixes intermittent drops).
        if (!this._iceRestartAttempts) this._iceRestartAttempts = 0;
        if (this._iceRestartAttempts < 2 && this._isCaller && this._pc) {
          this._iceRestartAttempts++;
          console.warn("[Simson] ICE failed, attempting restart", this._iceRestartAttempts);
          this._pc.restartIce();
          return;
        }
        this._audioQuality = 0;
        this._mediaDeviceError = this._turnAvailable
          ? "The media connection failed. Check network/firewall access and try again."
          : "The media connection failed. This server has no TURN relay; restrictive networks need coturn enabled.";
        this._cleanupWebRTC();
      }
      this._render();
    };

    this._statsInterval = setInterval(() => this._updateQuality(), 3000);
    this._startingWebRTC = false;

    if (this._pendingOffer) {
      const offer = this._pendingOffer;
      this._pendingOffer = null;
      await this._handleWebRTCSignal(offer);
    }
    } catch (error) {
      this._actionError = 'Could not start call media. Check device permissions and retry.';
      this._cleanupWebRTC();
      this._render();
    } finally {
      if (generation === this._rtcGeneration) this._startingWebRTC = false;
    }
  }

async _handleWebRTCSignal(event) {
    const { call_id, from_node_id, signal_type, data } = event;

    if (!call_id || !this._currentCallId || call_id !== this._currentCallId) return;
    if (from_node_id && this._currentRemoteNode && from_node_id !== this._currentRemoteNode) return;

    if (signal_type === "offer") {
      if (this._startingWebRTC) { this._pendingOffer = event; return; }
      if (!this._pc) await this._startWebRTC();
      if (!this._pc) return;

      const collision = (this._makingOffer || this._pc.signalingState !== "stable");
      if (collision) {
        if (!this._polite) return;
        await this._pc.setLocalDescription({ type: "rollback" });
      }

      await this._pc.setRemoteDescription(new RTCSessionDescription(data));
      if (!this._isCaller && this._localStream) {
        const offeredKinds = new Set([...String(data?.sdp || "").matchAll(/^m=(audio|video)\s/gm)].map(match => match[1]));
        const existingSenders = this._pc.getSenders();
        this._localStream.getTracks()
          .filter(track => offeredKinds.has(track.kind))
          .filter(track => !existingSenders.some(sender => sender.track?.kind === track.kind))
          .forEach(track => this._pc.addTrack(track, this._localStream));
      }

      await this._pc.setLocalDescription();
      this._sendWebRTCSignal("answer", {
        sdp: this._pc.localDescription.sdp,
        type: this._pc.localDescription.type,
      });
      for (const c of this._pendingCandidates) {
        await this._pc.addIceCandidate(new RTCIceCandidate(c));
      }
      this._pendingCandidates = [];

    } else if (signal_type === "answer") {
      if (this._pc && this._pc.signalingState === "have-local-offer") {
        await this._pc.setRemoteDescription(new RTCSessionDescription(data));
        for (const c of this._pendingCandidates) {
          await this._pc.addIceCandidate(new RTCIceCandidate(c));
        }
        this._pendingCandidates = [];
      }
    } else if (signal_type === "ice-candidate") {
      if (this._pc && this._pc.remoteDescription) {
        await this._pc.addIceCandidate(new RTCIceCandidate(data));
      } else {
        this._pendingCandidates.push(data);
      }
    }
  }

_sendWebRTCSignal(signalType, data) {
    const callId = this._activeCallAttr("call_id") || this._currentCallId;
    const toNode = this._currentRemoteNode;
    if (!callId || !toNode || !this._hass) return;
    this._hass.callService("simson", "send_webrtc_signal", {
      call_id: callId, to_node_id: toNode, signal_type: signalType, data,
    }).catch(e => console.error("Simson: signal send failed:", e));
  }

_cleanupWebRTC() {
    this._rtcGeneration = (this._rtcGeneration || 0) + 1;
    this._startingWebRTC = false;
    if (this._statsInterval) { clearInterval(this._statsInterval); this._statsInterval = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    this._remoteAudio.pause();
    this._remoteAudio.srcObject = null;
    this._remoteStream = null;
    this._pendingOffer = null;
    this._makingOffer = false;
    this._muted = false;
    this._cameraMuted = false;
    this._audioQuality = 3;
    this._connectionType = "";
    this._pendingCandidates = [];
    this._isCaller = false;
    this._answeredByMe = false;
    this._answerPendingCallId = null;
    this._iceRestartAttempts = 0;
    // Tear down SIP UA if active (SIP phone call path)
    this._cleanupSIPUA();
    this._sipBridgeId = null;
    this._stopRingtone();
    this._removePopup();
    this._dismissBrowserNotification();
  }

_attachRemoteMedia(stream, track = null) {
    if (!stream && track) {
      stream = new MediaStream();
      stream.addTrack(track);
    }
    if (!stream) return;
    this._remoteStream = stream;
    this._remoteAudio.autoplay = true;
    this._remoteAudio.muted = false;
    this._remoteAudio.volume = 1;
    this._remoteAudio.srcObject = stream;
    const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
    console.log("[Simson] remote audio attached", {
      tracks: audioTracks.length,
      states: audioTracks.map(t => t.readyState),
      muted: audioTracks.map(t => t.muted),
    });
    this._remoteAudio.play().catch(e => {
      console.warn("[Simson] remote audio play blocked/failed:", e?.message || e);
    });
    this._attachMediaElements();
    if (stream.getVideoTracks?.().length) this._render();
  }

_attachRemoteAudio(stream, track = null) {
    this._attachRemoteMedia(stream, track);
  }

async _updateQuality() {
    if (!this._pc) return;
    try {
      const stats = await this._pc.getStats();
      let jitter = 0, packetsLost = 0, packetsReceived = 0;
      stats.forEach(report => {
        if (report.type === "inbound-rtp" && report.kind === "audio") {
          jitter = report.jitter || 0;
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 1;
        }
        // Track which ICE candidate type is active: host / srflx / relay
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          const remoteReport = stats.get ? stats.get(report.remoteCandidateId) : null;
          if (remoteReport?.candidateType) {
            this._connectionType = remoteReport.candidateType; // "host"|"srflx"|"relay"
          }
        }
      });
      const loss = packetsLost / Math.max(packetsReceived, 1);
      if (loss > 0.1 || jitter > 0.1) this._audioQuality = 1;
      else if (loss > 0.03 || jitter > 0.05) this._audioQuality = 2;
      else this._audioQuality = 3;
      this._render();
    } catch (e) { /* ignore */ }
  }
};
