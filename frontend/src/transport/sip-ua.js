import { VERSION } from '../version.js';

export class MinimalSIPUA {
  constructor({ uri, password, wsUrl, iceServers, onAudioTrack, onRegistered, onError, onBye, captureMedia }) {
    this._captureMedia = captureMedia || (() => navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
    this._uri = uri;            // "sip:webrtc-pool@simson-vps.vipsy.in"
    this._password = password;
    this._wsUrl = wsUrl;        // "wss://simson-vps.vipsy.in/sip/ws"
    this._iceServers = iceServers || [];
    this._onAudioTrack = onAudioTrack;
    this._onRegistered = onRegistered;
    this._onError = onError;
    this._onBye = onBye;
    this._ws = null;
    this._pc = null;
    this._localStream = null;
    this._cseq = 1;
    this._tag = this._rand(10);
    this._regCallId = this._rand(16) + "@" + this._domain();
    this._callId = null;
    this._registered = false;
    this._activeCallFrom = null;
    this._activeCallVia = null;
    this._activeCallCseq = null;
    this._activeCallToTag = null;
    this._regInterval = null;
    this._inviteCSeq = null;   // CSeq number of the last INVITE (for ACK)
    this._lastAck = null;      // cached ACK for 200 OK retransmissions
    this._regRetryCount = 0;   // REGISTER retry counter
    this._regRetryMax = 3;     // max retry attempts
    this._regRetryDelay = 1000; // exponential backoff: 1s, 2s, 4s
    this._intentionalClose = false;
  }

  // ── Public API ────────────────────────────────────────────────

  connect() {
    console.log("[Simson SIPua] connect →", this._wsUrl);
    try {
      this._ws = new WebSocket(this._wsUrl, "sip");
    } catch (e) {
      console.error("[Simson SIPua] WebSocket() threw:", e.message);
      this._onError && this._onError(new Error("SIP WS connection failed: " + e.message));
      return;
    }
    this._ws.onopen  = () => { console.log("[Simson SIPua] WS open — sending REGISTER"); this._register(); };
    this._ws.onmessage = (e) => { if (!e.data || !e.data.trim()) { console.log("[Simson SIPua] RX: (empty frame — ignored)"); return; } console.log("[Simson SIPua] RX:", e.data.slice(0, 200)); this._handleRaw(e.data); };
    this._ws.onerror = (ev) => { console.error("[Simson SIPua] WS error", ev); this._onError && this._onError(new Error("SIP WebSocket error")); };
    this._ws.onclose = (ev) => {
      console.log("[Simson SIPua] WS close", ev.code, ev.reason);
      const hadActiveCall = !!this._callId;
      this._registered = false;
      if (this._regInterval) { clearInterval(this._regInterval); this._regInterval = null; }
      if (hadActiveCall && !this._intentionalClose) {
        this._onError && this._onError(new Error("SIP WebSocket closed during active call"));
      }
    };
  }

  disconnect() {
    this._intentionalClose = true;
    if (this._registered) this._sendUnregister();
    setTimeout(() => { this._ws && this._ws.close(); }, 400);
    this._cleanup();
  }

  // Dial a ConfBridge extension (e.g. "bridge-AbC123").
  async dial(extension) {
    if (!this._registered) {
      this._onError && this._onError(new Error("SIP not registered"));
      return;
    }
    try {
      this._localStream = await this._captureMedia();
    } catch (e) {
      this._onError && this._onError(e);
      return;
    }
    this._pc = new RTCPeerConnection({ iceServers: this._iceServers });
    this._pc.ontrack = (ev) => {
      console.log("[Simson SIPua] ontrack fired — kind:", ev.track.kind, "readyState:", ev.track.readyState);
      this._onAudioTrack && this._onAudioTrack(ev.streams?.[0] || null, ev.track);
    };
    this._pc.oniceconnectionstatechange = () => console.log("[Simson SIPua] ICE state:", this._pc?.iceConnectionState);
    this._pc.onconnectionstatechange = () => console.log("[Simson SIPua] Connection state:", this._pc?.connectionState);
    this._pc.onicegatheringstatechange = () => console.log("[Simson SIPua] ICE gathering:", this._pc?.iceGatheringState);
    this._pc.onicecandidate = (ev) => { if (ev.candidate) console.log("[Simson SIPua] ICE candidate:", ev.candidate.candidate.slice(0, 80)); };
    for (const t of this._localStream.getAudioTracks()) this._pc.addTrack(t, this._localStream);
    this._preferPcmCodecs();

    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);
    await this._waitICE();

    this._callId = this._rand(16) + "@" + this._domain();
    this._lastAck = null;
    const target = "sip:" + extension + "@" + this._domain();
    this._inviteCSeq = this._cseq;
    this._send(this._buildRequest("INVITE", target, this._callId, this._cseq++, "",
      this._pc.localDescription.sdp));
  }

  hangup() {
    if (!this._callId) return;
    this._intentionalClose = true;
    // BYE to the contact we got from 200 OK (or use To fallback)
    const to = "sip:" + this._domain();
    this._send(this._buildRequest("BYE", to, this._callId, this._cseq++));
    this._cleanup();
    this._callId = null;
  }

  get registered() { return this._registered; }

  // ── SIP message construction ──────────────────────────────────

  _rand(n = 8) { return Math.random().toString(36).slice(2, 2 + n); }
  _domain()    { return this._uri.split("@")[1]; }
  _user()      { return this._uri.split(":")[1]?.split("@")[0] || ""; }

  _buildRequest(method, targetUri, callId, cseq, extraHeaders = "", body = "", toUri = null) {
    const via    = `SIP/2.0/WS ${this._domain()};branch=z9hG4bK${this._rand()};rport`;
    const from   = `<${this._uri}>;tag=${this._tag}`;
    const to     = `<${toUri || targetUri}>`;
    const ctLen  = body ? `Content-Type: application/sdp\r\nContent-Length: ${body.length}` : "Content-Length: 0";
    return `${method} ${targetUri} SIP/2.0\r\n` +
      `Via: ${via}\r\n` +
      `Max-Forwards: 70\r\n` +
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Call-ID: ${callId}\r\n` +
      `CSeq: ${cseq} ${method}\r\n` +
      `Contact: <${this._uri};transport=ws>\r\n` +
      `User-Agent: Simson/${VERSION}\r\n` +
      (extraHeaders || "") +
      `${ctLen}\r\n\r\n${body}`;
  }

  _buildResponse(code, phrase, from, to, callId, via, cseq, body = "") {
    const ctLen = body ? `Content-Type: application/sdp\r\nContent-Length: ${body.length}` : "Content-Length: 0";
    return `SIP/2.0 ${code} ${phrase}\r\n` +
      `Via: ${via}\r\n` +
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Call-ID: ${callId}\r\n` +
      `CSeq: ${cseq}\r\n` +
      `Contact: <${this._uri};transport=ws>\r\n` +
      `${ctLen}\r\n\r\n${body}`;
  }

  _send(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) this._ws.send(msg);
  }

  // ── REGISTER ──────────────────────────────────────────────────

  _register() {
    console.log("[Simson SIPua] → REGISTER", this._uri);
    this._send(this._buildRequest("REGISTER", "sip:" + this._domain(),
      this._regCallId, this._cseq++, "Expires: 3600\r\n", "", this._uri));
  }

  _sendUnregister() {
    this._send(this._buildRequest("REGISTER", "sip:" + this._domain(),
      this._regCallId, this._cseq++, "Expires: 0\r\n", "", this._uri));
  }

  // ── Message parsing ───────────────────────────────────────────

  _hdr(raw, name) {
    const lo = name.toLowerCase();
    const line = raw.split("\r\n").find(l => l.toLowerCase().startsWith(lo + ":"));
    return line ? line.slice(name.length + 1).trim() : null;
  }

  _body(raw) {
    const idx = raw.indexOf("\r\n\r\n");
    return idx >= 0 ? raw.slice(idx + 4) : "";
  }

  _handleRaw(data) {
    try {
      const first = data.split("\r\n")[0];
      if (first.startsWith("SIP/2.0")) {
        const code = parseInt(first.split(" ")[1]);
        const cseqHdr = this._hdr(data, "CSeq") || "";
        const method = cseqHdr.split(" ")[1] || "";
        this._handleResponse(code, method, data);
      } else {
        const method = first.split(" ")[0];
        this._handleRequest(method, data);
      }
    } catch (e) { /* malformed SIP — ignore */ }
  }

  _handleResponse(code, method, raw) {
    if (method === "REGISTER") {
      if (code === 200) {
        console.log("[Simson SIPua] REGISTER 200 OK — registered");
        this._registered = true;
        this._regRetryCount = 0; // reset retry counter on success
        if (this._regInterval) clearInterval(this._regInterval);
        this._regInterval = setInterval(() => { if (this._registered) this._register(); }, 300000);
        this._onRegistered && this._onRegistered();
      } else if (code === 401 || code === 407) {
        console.log("[Simson SIPua] REGISTER", code, "— retrying with Digest auth");
        this._handleDigestChallenge(code, raw, "REGISTER", "sip:" + this._domain(), this._regCallId);
      } else {
        console.error("[Simson SIPua] REGISTER rejected:", code);
        if (this._regRetryCount < this._regRetryMax) {
          this._regRetryCount++;
          const delay = this._regRetryDelay * Math.pow(2, this._regRetryCount - 1);
          console.warn(`[Simson SIPua] REGISTER failed with ${code}, retrying in ${delay}ms (attempt ${this._regRetryCount}/${this._regRetryMax})`);
          setTimeout(() => { if (!this._registered) this._register(); }, delay);
        } else {
          console.error("[Simson SIPua] REGISTER max retries exceeded");
          this._onError && this._onError(new Error("SIP REGISTER rejected after retries: " + code));
        }
      }
    } else if (method === "INVITE") {
      if (code >= 100 && code < 200) return; // provisional
      if (code === 200) this._handleInvite200OK(raw);
      else if (code === 401 || code === 407) {
        const digestUri = "sip:" + (this._activeBridge ? this._activeBridge + "@" + this._domain() : this._domain());
        this._handleDigestChallenge(code, raw, "INVITE", digestUri, this._callId);
      } else if (code >= 300) {
        // INVITE failed — clean up
        this._cleanup();
        this._callId = null;
        this._onError && this._onError(new Error("SIP INVITE failed: " + code));
      }
    }
  }

  _handleRequest(method, raw) {
    if (method === "INVITE") this._handleIncomingInvite(raw);
    else if (method === "BYE") this._handleBye(raw);
  }

  // ── INVITE 200 OK (answer from Asterisk) ─────────────────────

  async _handleInvite200OK(raw) {
    if (!this._pc) return;

    // ── 200 OK retransmission: just re-send the cached ACK ──────────────
    if (this._lastAck) {
      console.log("[Simson SIPua] 200 OK retransmission — re-sending ACK");
      this._send(this._lastAck);
      return;
    }

    const sdp = this._body(raw);
    if (!sdp) return;
    // Log the media IP from the SDP answer
    const cLine = sdp.match(/c=IN IP4 ([^\r\n]+)/);
    console.log("[Simson SIPua] SDP answer c-line:", cLine ? cLine[1] : "MISSING");
    console.log("[Simson SIPua] SDP answer (first 500 chars):", sdp.slice(0, 500));
    try {
      await this._pc.setRemoteDescription({ type: "answer", sdp });
    } catch(e) {
      console.error("[Simson SIPua] setRemoteDescription failed:", e);
      return;
    }

    // ── Build ACK — CSeq MUST match the INVITE per RFC 3261 §13.2.2.4 ──
    const cseqHdr   = this._hdr(raw, "CSeq") || "";
    const ackCSeq   = parseInt(cseqHdr) || this._inviteCSeq || 1;
    const toHdr     = this._hdr(raw, "To") || "";
    const fromHdr   = this._hdr(raw, "From") || "";
    const callId    = this._hdr(raw, "Call-ID") || this._callId;
    const contactHdr = this._hdr(raw, "Contact") || "";
    const ackUri    = contactHdr.match(/<([^>]+)>/)?.[1] || "sip:" + this._domain();
    const via       = `SIP/2.0/WS ${this._domain()};branch=z9hG4bK${this._rand()};rport`;
    const ack = `ACK ${ackUri} SIP/2.0\r\n` +
      `Via: ${via}\r\nMax-Forwards: 70\r\n` +
      `From: ${fromHdr}\r\nTo: ${toHdr}\r\n` +
      `Call-ID: ${callId}\r\nCSeq: ${ackCSeq} ACK\r\nContent-Length: 0\r\n\r\n`;
    this._lastAck = ack;
    console.log("[Simson SIPua] sending ACK with CSeq", ackCSeq);
    this._send(ack);
  }

  // ── Incoming INVITE from Asterisk (bridge inviting us) ────────

  async _handleIncomingInvite(raw) {
    const from   = this._hdr(raw, "From") || "";
    const to     = this._hdr(raw, "To") || "";
    const callId = this._hdr(raw, "Call-ID") || this._rand(16);
    const via    = this._hdr(raw, "Via") || "";
    const cseq   = this._hdr(raw, "CSeq") || "1 INVITE";
    const sdpOffer = this._body(raw);
    // 100 Trying
    this._send(this._buildResponse(100, "Trying", from, to, callId, via, cseq));

    if (!sdpOffer) {
      this._send(this._buildResponse(400, "Bad Request", from, to, callId, via, cseq));
      return;
    }
    // Set up WebRTC
    if (!this._pc) {
      try {
        this._localStream = await this._captureMedia();
      } catch (e) {
        this._send(this._buildResponse(486, "Busy Here", from, to, callId, via, cseq));
        return;
      }
      this._pc = new RTCPeerConnection({ iceServers: this._iceServers });
      this._pc.ontrack = (ev) => this._onAudioTrack && this._onAudioTrack(ev.streams?.[0] || null, ev.track);
      for (const t of this._localStream.getAudioTracks()) this._pc.addTrack(t, this._localStream);
      this._preferPcmCodecs();
    }

    const toWithTag = to + ";tag=" + this._rand(8);
    this._activeCallFrom = from;
    this._activeCallVia  = via;
    this._activeCallCseq = cseq;
    this._activeCallToTag = toWithTag;
    this._callId = callId;

    await this._pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });
    const answer = await this._pc.createAnswer();
    await this._pc.setLocalDescription(answer);
    await this._waitICE();

    this._send(this._buildResponse(200, "OK", from, toWithTag, callId, via, cseq,
      this._pc.localDescription.sdp));
  }

  _handleBye(raw) {
    const from   = this._hdr(raw, "From") || "";
    const to     = this._hdr(raw, "To")   || "";
    const callId = this._hdr(raw, "Call-ID") || "";
    const via    = this._hdr(raw, "Via")  || "";
    const cseq   = this._hdr(raw, "CSeq") || "1 BYE";
    this._send(this._buildResponse(200, "OK", from, to, callId, via, cseq));
    this._cleanup();
    this._callId = null;
    this._onBye && this._onBye();
  }

  _preferPcmCodecs() {
    try {
      const caps = RTCRtpSender.getCapabilities?.("audio");
      if (!caps?.codecs?.length || !this._pc?.getTransceivers) return;
      const pcm = caps.codecs.filter(c => {
        const mime = String(c.mimeType || "").toLowerCase();
        return (mime === "audio/pcmu" || mime === "audio/pcma") && c.clockRate === 8000;
      });
      if (!pcm.length) return;
      for (const tx of this._pc.getTransceivers()) {
        if (tx.sender?.track?.kind === "audio" && tx.setCodecPreferences) {
          tx.setCodecPreferences(pcm);
          console.log("[Simson SIPua] codec preference:", pcm.map(c => c.mimeType).join(", "));
        }
      }
    } catch (e) {
      console.warn("[Simson SIPua] codec preference failed:", e);
    }
  }

  // ── Digest auth ───────────────────────────────────────────────

  _handleDigestChallenge(code, raw, method, uri, callId) {
    const hdrName = code === 401 ? "WWW-Authenticate" : "Proxy-Authenticate";
    const auth = this._hdr(raw, hdrName) || "";
    const realm  = auth.match(/realm="([^"]+)"/)?.[1]  || this._domain();
    const nonce  = auth.match(/nonce="([^"]+)"/)?.[1]  || "";
    const opaque = auth.match(/opaque="([^"]+)"/)?.[1] || "";
    const qop    = auth.match(/qop="([^"]+)"/)?.[1]    || "";
    const ha1 = this._md5(this._user() + ":" + realm + ":" + this._password);
    const ha2 = this._md5(method + ":" + uri);
    let resp, aHdr;
    if (qop && qop.split(",").map(q => q.trim()).includes("auth")) {
      // RFC 2617 §3.2.2 qop=auth — Asterisk requires this form
      const nc     = "00000001";
      const cnonce = this._rand(8);
      resp = this._md5(ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":auth:" + ha2);
      aHdr = `Digest username="${this._user()}",realm="${realm}",nonce="${nonce}",` +
        `uri="${uri}",response="${resp}",algorithm=MD5,qop=auth,nc=${nc},cnonce="${cnonce}"`;
    } else {
      resp = this._md5(ha1 + ":" + nonce + ":" + ha2);
      aHdr = `Digest username="${this._user()}",realm="${realm}",nonce="${nonce}",` +
        `uri="${uri}",response="${resp}",algorithm=MD5`;
    }
    if (opaque) aHdr += `,opaque="${opaque}"`;
    const authLine = (code === 401 ? "Authorization" : "Proxy-Authorization") + ": " + aHdr;
    console.log("[Simson SIPua] Digest auth →", authLine);
    console.log("[Simson SIPua] Digest debug: realm=", realm, "nonce=", nonce, "qop=", qop, "opaque=", opaque, "ha1=", ha1, "ha2=", ha2, "resp=", resp);
    if (method === "REGISTER") {
      this._send(this._buildRequest("REGISTER", "sip:" + this._domain(), this._regCallId,
        this._cseq++, "Expires: 3600\r\n" + authLine + "\r\n", "", this._uri));
    } else if (method === "INVITE") {
      // Re-send INVITE with auth — reuse existing PeerConnection and SDP
      const sdp = this._pc?.localDescription?.sdp || "";
      const target = "sip:" + (this._activeBridge || "") + "@" + this._domain();
      this._inviteCSeq = this._cseq;  // track for ACK
      this._send(this._buildRequest("INVITE", target, this._callId, this._cseq++,
        authLine + "\r\n", sdp));
    }
  }

  // ── ICE gathering helper ──────────────────────────────────────

  _waitICE() {
    return new Promise((resolve) => {
      if (!this._pc || this._pc.iceGatheringState === "complete") { resolve(); return; }
      const done = () => { if (this._pc?.iceGatheringState === "complete") resolve(); };
      this._pc.addEventListener("icegatheringstatechange", done);
      setTimeout(resolve, 4000); // max wait
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────

  _cleanup() {
    if (this._regInterval) { clearInterval(this._regInterval); this._regInterval = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    if (this._localStream) { this._localStream.getTracks().forEach(t => t.stop()); this._localStream = null; }
    this._lastAck = null;
    this._inviteCSeq = null;
  }

  // ── MD5 (RFC 1321) — required for SIP Digest authentication ──
  // Pure-JS implementation; no external deps.

  _md5(str) {
    const add = (a, b) => ((a + b) | 0);
    const rl  = (n, s) => (n << s) | (n >>> (32 - s));
    const S   = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
                 5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
                 4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
                 6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const K   = Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*0x100000000)>>>0);
    const bytes = new TextEncoder().encode(str);
    const n = bytes.length;
    const padLen = (55 - n % 64 + 64) % 64;
    const msg = new Uint8Array(n + 1 + padLen + 8);
    msg.set(bytes); msg[n] = 0x80;
    const dv = new DataView(msg.buffer);
    dv.setUint32(n + 1 + padLen,     (n * 8) >>> 0,          true);
    dv.setUint32(n + 1 + padLen + 4, Math.floor(n / 0x20000000), true);
    let a=0x67452301, b=0xefcdab89, c=0x98badcfe, d=0x10325476;
    for (let i = 0; i < msg.length; i += 64) {
      const M = Array.from({length:16}, (_, j) => dv.getInt32(i + j*4, true));
      let [A, B, C, D] = [a, b, c, d];
      for (let j = 0; j < 64; j++) {
        let F, g;
        if      (j < 16) { F=(B&C)|(~B&D); g=j; }
        else if (j < 32) { F=(D&B)|(~D&C); g=(5*j+1)%16; }
        else if (j < 48) { F=B^C^D;        g=(3*j+5)%16; }
        else             { F=C^(B|~D);     g=(7*j)%16; }
        const temp = D;
        D = C; C = B;
        B = add(B, rl(add(add(add(A, F), M[g]), K[j]), S[j]));
        A = temp;
      }
      a=add(a,A); b=add(b,B); c=add(c,C); d=add(d,D);
    }
    return [a,b,c,d].map(v =>
      [(v>>>0)&0xff,(v>>>8)&0xff,(v>>>16)&0xff,(v>>>24)&0xff]
        .map(byte => byte.toString(16).padStart(2,"0")).join("")
    ).join("");
  }
}
