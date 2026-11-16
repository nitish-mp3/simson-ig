# Outgoing SIP audio preparation

The card previously started SIP registration, microphone capture, SDP offer creation
and ICE gathering only after receiving the active call event. ICE gathering has
a ten-second safety timeout. This puts browser setup on the critical path after
the destination answers and can explain several seconds of initial silence.

The frontend now prepares microphone capture and its SDP/ICE offer during an
owned outgoing SIP call's requesting/ringing state. It registers the browser but
sends no bridge INVITE until the existing active event. Incoming calls retain the
explicit answer requirement. Ending a call closes the prepared peer and stops
late microphone tracks. Concurrent event/sensor updates reuse one preparation
and send one INVITE. The existing ICE timeout and TURN gathering are preserved.

SIP calls now also use the audio quality monitor. Previously that monitor only
read the direct WebRTC peer and ignored the SIP peer. It can now show poor SIP
receive quality based on RTP loss/jitter; this is diagnostic, not noise filtering.

Production read-only observations on 2026-11-16:

- Asterisk gateway endpoints allow ulaw/alaw, direct_media=false,
  rtp_symmetric=true and rtp_keepalive=2. The WebRTC endpoint allows the same
  audio codecs with ICE and DTLS. No codec mismatch was established.
- The gateway's answered-call SDP includes PCMU/8000 and PCMA/8000.
- Gateway jitter buffer is 20 ms. Silence suppression, AGC and noise reduction
  are disabled. Its 200 OK setting is after pickup with zero configured delay.
- The VPS was lightly loaded and its primary interface reported zero RX/TX
  errors or dropped packets at inspection. This does not measure call RTP loss.
- The successful gateway call entered talking at 13:23:52 UTC, Asterisk reported
  answer at 13:23:53 UTC, and the call ended normally at 13:25:41 UTC. The gateway
  clock displays UTC+4. No timing for first audible RTP was captured.
- A separate automatic post-answer # DTMF profile exists for Synway gateways.
  Its configured 0.2-second wait does not explain ten seconds of silence.

Validation: frontend build and all 85 frontend tests passed, including explicit
checks for preparation before INVITE, cancellation during permission capture,
duplicate activation and SIP audio quality. Build assets are generated in both
integration distribution directories. Existing unrelated workspace edits remain.

Deployment: this is an integration frontend change. No add-on or VPS binary,
gateway setting, database or live service was changed. Install the reviewed
integration frontend assets on HA, refresh the browser, then have the operator
make one call to measure pickup-to-audio delay. Noise remains unverified: compare
packet loss/jitter on that call and determine which direction contains noise
before changing gateway gain, codec or network settings.
