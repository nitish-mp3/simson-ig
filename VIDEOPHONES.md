# Videophone calls and video

Requires integration 3.4.0, card 5.4.0 and VPS 1.6.16. Install the complete integration, including its built `www` directory and chunks, restart Home Assistant, and use the module resource `/simson/www/simson-card.js?v=5.4.0`. Addon 5.1.12 contains the corresponding notification navigation fix. Updating the VPS alone does not install these HA components.

## Native SIP video: no RTSP required

The Akuvox's working 1604-to-1603 display automation already uses SIP video. Calling a compatible video-enabled phone from the card can receive H.264 through SIP without an RTSP URL, camera entity or local camera permission. The camera-sharing preference controls user-call camera capture, not whether a SIP doorphone may send video.

For uncomplicated enabled video endpoints, the VPS uses a direct PJSIP originate and a dedicated marked-camera conference. Reserved gateways, outbound trunks and endpoints with auto-answer/speaker, callback bridging, announcements or duration rules retain their existing routes. Do not change a working display automation to obtain browser video. Asterisk forwards compatible video; it cannot invent missing frames or transcode incompatible H.264 profiles.

The live panel shows LIVE only after actual decoded frames arrive. Waiting for video is not proof of delivery; check the camera's negotiated H.264 and transmission settings if audio works but frames do not arrive. The isolated dummy-endpoint test received decoded video and audio through the installed Asterisk version. Physical Akuvox delivery has not been tested by placing a call.

## Optional independent RTSP video alongside SIP audio

Use this only when a device exposes an independent stream and that path is desired. Configure the private camera source, including its credentials, in a LAN-side go2rtc instance. The source must have a stable named stream, for example `front_door`; Simson does not discover or create the RTSP source.

As a signed-in HA administrator, run:

```yaml
action: simson.configure_videophone
data:
  node_id: your_node
  extension: "1604"
  label: Front door
  bridge_url: http://your-private-go2rtc-host:1984
  stream_name: front_door
```

Optional `bridge_username` and `bridge_password` configure server-side Basic authentication. Use a reachable private host: `127.0.0.1` means the Home Assistant Core container, not a separate addon. The bridge URL must be an HTTP(S) origin without credentials or a path. To unlink, provide the same node/extension with `remove: true`.

The source is stored server-side, not in Lovelace. During that extension's active call, the local participant's live panel requests video-only WebRTC while SIP continues to carry audio. Preview never joins another user's call. Unrelated users cannot negotiate the stream; ownership is checked before and after signaling. Failure or retry of the independent stream does not redial or end SIP audio. Hangup closes the browser video connection.

The authenticated HA signaling endpoint is `POST /api/simson/video/offer` with `node_id`, `extension`, `call_id` and a video-only `sdp`. The browser cannot choose an arbitrary upstream URL. Answers and offers are bounded; upstream failures return a sanitized 502 without camera credentials. Directory metadata exposes only extension and label.

Keep RTSP and bridge management private. WebRTC media needs a reachable bridge candidate or a working TURN route; the HTTP signaling proxy does not tunnel the video itself. Configure browser-compatible H.264 and follow the bridge's network guidance. No physical RTSP camera has been configured or verified in this release.

References: [go2rtc WebRTC networking](https://github.com/AlexxIT/go2rtc/tree/master/internal/webrtc), [go2rtc API contract](https://github.com/AlexxIT/go2rtc/blob/master/website/api/openapi.yaml).
