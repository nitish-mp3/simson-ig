# Media and door video

Versions: VPS 1.6.14, integration 3.3.7, addon 5.1.10, card 5.3.6.

## Browser media configuration recovery

The screenshot of card 5.3.4 shows an answered call with unavailable phone audio, not a missing card. This error occurs before the SIP browser leg connects. Media configuration previously used the four-second polling timeout even though the addon upstream fetch can take longer. That request now has a separate bounded twelve-second timeout; browser configuration requests allow fifteen seconds, with call authorization fetched in parallel. Disabled active-call configurations are not cached for a minute. Configuration/import/dial failures now expose the media retry control and retain the real handset call. Responses distinguish denied/ended calls from unavailable VPS media settings without returning SIP credentials to unauthorized users. These fixes do not prove which configuration failure happened in that browser: its authenticated response and console are not available. They also do not implement the missing live RTSP bridge or certify native SIP video.

## 1605 regression correction

Calls at 14:08:47, 14:09:15 and 14:10:10 IST on 7 October reached 1605 and answered, then immediately ended. Each coincided with Asterisk's `No translator path: (starting codec is not valid)` warning. The 1.6.13 change explicitly seeded H.264 into the legacy Local/ConfBridge originate topology. That is unsafe on this installed media engine and has been reverted in 1.6.14 to the earlier working audio originate. No endpoint passwords, transports or routes were changed. A synthetic browser SDP test did not establish that the older Asterisk engine could mix that topology; native browser SIP video on this path is **not certified ready**.

The card no longer resurrects confirmed-ended calls from stale ringing sensors or delayed events. Ambiguous request timeouts retain the known call ID instead of abandoning control. Mutation requests have a bounded 30-second response budget, distinct from the 4-second polling budget, because addon call registration awaits HA telemetry that can take longer than four seconds. Timed-out POSTs still never automatically repeat. Errors refresh the coordinator and distinguish an ended call from another user's live call; ownership checks are not relaxed.

## Verified fixes

The production VPS previously had no coturn installation or ICE configuration. An addon checkbox cannot start a relay on that server. The independent relay now uses authenticated, one-hour TURN REST credentials, restricted peer addresses, bounded relay ports and allocation/bandwidth quotas. Node-authorized configuration returns the relay without publishing its master secret. Public UDP and TCP relay-only browser data-channel probes succeeded. TLS validates locally but external port 5349 did not reach the VPS during testing; that URL is not advertised until external ingress is verified. TURN does not guarantee access through every corporate firewall.

The addon merges remote ICE entries with local entries instead of deleting a configured local TURN relay when the VPS returns only STUN. Multi-entry HA instances select the correct node's configuration; unknown nodes fail rather than silently using another instance. Failure to fetch configuration is distinct from verified absence of TURN. Camera renegotiation handles offer collisions and preserves early ICE candidates. Transport cleanup retains the browser's accepted-call intent, so media errors do not turn a live local call into an unrelated script-join prompt. Other browsers still require explicit media consent; shared call diagnostics are not a cross-device media lease.

Browser regressions measure received audio packets and decoded video frames when both users add cameras during a voice call. These tests use fake local devices, not the production handsets. The public TURN probe exchanges only dummy data, never telephone calls.

## 1605 and native SIP video

The existing unknown-face automation displays SIP video on the 1603 indoor display without RTSP configuration. That is evidence of a functioning native SIP-video device path; RTSP is not a prerequisite for displaying the same source in the browser. The routes differ: `OriginateDoorStationCall` uses a direct PJSIP originate with H.264 and a plain Dial bridge, whereas ordinary browser-originated extension calls currently use a Local channel followed by ConfBridge. The live 1605 endpoint permits `ulaw|alaw|h264`. Its registration and that codec allow-list do not demonstrate negotiated video on the separate browser route. Do not change the working display automation while repairing that route.

Registration identifies 1605 as an Akuvox E16C, not a 2N device. Its endpoint already allowed H.264, but the browser SIP client offered only audio and the conference profile disabled video. The browser still supports receive-only H.264 without local camera acquisition, and the conference profile enables video forwarding. Explicit H.264 format seeding of Local originates has been removed due to the regression above. Gateway endpoints remain audio-only. A synthetic browser SIP offer verifies reception capability, not physical-device video delivery.

Actual device delivery remains untested: both ends must negotiate compatible H.264, and the door station must transmit video during the answered SIP call. Asterisk forwards conference video; it does not transcode, upscale or synthesize frames. `follow_talker` selects the talking video-capable source. This is not a claim of simultaneous multi-camera conference layouts or native video on every SIP model.

## 2N / My2N

My2N cloud access, local SIP calling and local RTSP streaming are separate paths. Supported 2N IP intercoms can send camera video in a SIP call; enable SIP video and compatible H.264 on the device and its Simson endpoint. Firmware/hardware identifier 570v6 alone does not establish the model's licences or enabled services.

If native SIP video is unavailable or an independent live preview is required, the production fallback is **local RTSP H.264 → an authenticated LAN-side WebRTC bridge such as go2rtc → the card**, alongside the SIP audio call. A browser cannot play `rtsp://` directly. Do not expose RTSP/bridge management ports to the Internet or put camera passwords in Lovelace YAML. Keep source URL, username and password in server-side device configuration, and expose only a named stream through an authenticated, authorized SDP endpoint. The bridge must reach the door's LAN; a remote VPS cannot reach a private device without a configured network path.

2N commonly publishes `/h264_stream`; use the URL shown by that device's streaming configuration, enable RTSP/video, and choose a browser-compatible H.264 profile and suitable frame rate. A JPEG snapshot integration is not a real-time stream and its refresh rate cannot be fixed with card CSS. Continuous video need not be represented by a snapshot camera entity. The current door card's existing camera-entity mode is retained for compatibility; a new direct-RTSP configuration/bridge UI is **not implemented in this release**. No actual 2N RTSP address or credentials were supplied, so its local stream has not been connected or verified.

References: [2N streaming](https://wiki.2n.com/hip/conf/latest/en/5-konfigurace-interkomu/5-4-sluzby/5-4-2-streamovani), [2N camera/SIP video](https://wiki.2n.com/hip/conf/latest/en/5-konfigurace-interkomu/5-5-hardware/5-5-3-kamera), [Asterisk conference video](https://docs.asterisk.org/Configuration/Applications/Conferencing-Applications/ConfBridge/ConfBridge-Configuration/), [go2rtc](https://github.com/AlexxIT/go2rtc).

## ds → nitish notification diagnosis

The recipient's Companion registration must belong to nitish's HA user. Changing a dashboard login does not establish the owner of a previously registered mobile app. Do not hardcode device names or broadcast to other phones. Run `simson.test_user_notification` with nitish's actual contact sensor (administrator, or nitish testing their own contact); it sends no call. Automatic discovery includes only supported push-capable registrations with that exact owner. An explicit disabled mapping is preserved; use `simson.set_user_notification_target` with `automatic: true` to restore discovery or explicitly select the correct Companion service as administrator. Notification diagnostics now explain missing/disabled targets.

The Companion app also needs OS notification permissions and a working push channel. Service acceptance is not proof of phone delivery. Installed-site registration ownership, push reception and real-device audio/video remain unverified because no authenticated HA administration connection was available. Deploy the new integration/addon assets before judging these client changes; the VPS update does not update HA cards by itself.
