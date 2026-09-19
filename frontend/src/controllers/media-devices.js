const MEDIA_PREFS_KEY = 'simson.card.media.v1';
export const withMediaDevices = Base => class extends Base {
_loadMediaPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(MEDIA_PREFS_KEY) || "{}");
      this._videoEnabled = saved.videoEnabled === true;
      this._selectedAudioInput = String(saved.audioInput || "");
      this._selectedVideoInput = String(saved.videoInput || "");
      this._selectedAudioOutput = String(saved.audioOutput || "");
    } catch (_) {
      try { localStorage.removeItem(MEDIA_PREFS_KEY); } catch (_) { /* Storage is unavailable. */ }
    }
  }

_saveMediaPreferences() {
    try {
      localStorage.setItem(MEDIA_PREFS_KEY, JSON.stringify({
        videoEnabled: this._videoEnabled,
        audioInput: this._selectedAudioInput,
        videoInput: this._selectedVideoInput,
        audioOutput: this._selectedAudioOutput,
      }));
    } catch (_) { /* Storage may be disabled; retain preferences for this session. */ }
  }

_mediaConstraints(includeVideo = this._videoEnabled) {
    const audio = this._selectedAudioInput
      ? { deviceId: { exact: this._selectedAudioInput }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const video = !includeVideo ? false : this._selectedVideoInput
      ? { deviceId: { exact: this._selectedVideoInput }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
    return { audio, video };
  }

  async _refreshMediaDevices(requestPermission = false) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let probe = null;
    try {
      if (requestPermission) {
        try {
          probe = await navigator.mediaDevices.getUserMedia(this._mediaConstraints(this._videoEnabled));
        } catch (error) {
          if (!this._videoEnabled) throw error;
          probe = await navigator.mediaDevices.getUserMedia(this._mediaConstraints(false));
          this._mediaDeviceError = "Camera permission was not granted. Audio calls remain available.";
        }
        this._mediaPermission = "granted";
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      this._mediaDevices = {
        audioInputs: devices.filter(device => device.kind === "audioinput"),
        videoInputs: devices.filter(device => device.kind === "videoinput"),
        audioOutputs: devices.filter(device => device.kind === "audiooutput"),
      };
      if (!this._mediaDevices.audioInputs.some(device => device.deviceId === this._selectedAudioInput)) {
        this._selectedAudioInput = this._mediaDevices.audioInputs[0]?.deviceId || "";
      }
      if (!this._mediaDevices.videoInputs.some(device => device.deviceId === this._selectedVideoInput)) {
        this._selectedVideoInput = this._mediaDevices.videoInputs[0]?.deviceId || "";
      }
      if (!this._mediaDevices.audioOutputs.some(device => device.deviceId === this._selectedAudioOutput)) {
        this._selectedAudioOutput = this._mediaDevices.audioOutputs[0]?.deviceId || "";
      }
      this._saveMediaPreferences();
    } catch (error) {
      this._mediaPermission = error?.name === "NotAllowedError" ? "denied" : "prompt";
      this._mediaDeviceError = error?.message || "Could not access media devices.";
    } finally {
      probe?.getTracks().forEach(track => track.stop());
    }
    this._render();
  }

async _captureMedia(includeVideo) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Use HTTPS and allow browser microphone access.');
    this._mediaDeviceError = '';
    try {
      return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(includeVideo));
    } catch (error) {
      if (includeVideo) {
        this._mediaDeviceError = 'Camera unavailable. Continuing with audio only.';
        try { return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(false)); }
        catch (audioError) { error = audioError; }
      }
      if (['NotFoundError', 'OverconstrainedError'].includes(error.name) && this._selectedAudioInput) {
        this._selectedAudioInput = '';
        this._saveMediaPreferences();
        return await navigator.mediaDevices.getUserMedia(this._mediaConstraints(false));
      }
      throw error;
    }
  }

async _startMediaPreview() {
    this._stopMediaPreview(false);
    const generation = this._previewGeneration;
    try {
      const stream = await this._captureMedia(this._videoEnabled);
      if (generation !== this._previewGeneration || !this.isConnected) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this._mediaPreviewStream = stream;
      this._mediaPermission = 'granted';
      await this._refreshMediaDevices(false);
    } catch (error) {
      this._mediaDeviceError = error?.message || "Could not start media preview.";
    }
    this._render();
  }

_stopMediaPreview(render = true) {
    this._previewGeneration = (this._previewGeneration || 0) + 1;
    this._mediaPreviewStream?.getTracks().forEach(track => track.stop());
    this._mediaPreviewStream = null;
    if (render && this.isConnected) this._render();
  }

_attachMediaElements() {
    if (!this._remoteAudio.isConnected) this.shadowRoot.appendChild(this._remoteAudio);
    const preview = this._root()?.querySelector("#media-local-preview");
    if (preview && this._mediaPreviewStream && preview.srcObject !== this._mediaPreviewStream) {
      preview.srcObject = this._mediaPreviewStream;
      preview.play().catch(() => {});
    }
    const remoteVideo = this._root()?.querySelector("#remote-video");
    if (remoteVideo && this._remoteStream?.getVideoTracks?.().length && remoteVideo.srcObject !== this._remoteStream) {
      remoteVideo.srcObject = this._remoteStream;
      remoteVideo.play().catch(() => {});
    }
    const localVideo = this._root()?.querySelector("#local-video");
    if (localVideo && this._localStream?.getVideoTracks?.().length && localVideo.srcObject !== this._localStream) {
      localVideo.srcObject = this._localStream;
      localVideo.play().catch(() => {});
    }
    if (this._remoteAudio?.setSinkId && this._remoteAudio.sinkId !== this._selectedAudioOutput) {
      this._remoteAudio.setSinkId(this._selectedAudioOutput).catch(() => {});
    }
  }
};
