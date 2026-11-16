# SOS room recovery — 2026-10-28

## Live changes

- Found installed integration manifest 3.6.0 without native SIP room/media
  services, while the addon and VPS supported native room calls. Restored the
  matching 3.9.1 backend after an approved idle-guarded Core restart. Room bindings
  were retained: living, SIP 1040, pika, original HA camera and selected Cast TV.
- Integration backup:
  `/homeassistant/simson_backups/before-sos-backend-3.9.1-20261028T124233Z.zip`.
- After the user deferred further Core restarts, only frontend assets and the
  owned room-display dashboard/resources were updated. No VPS, PBX or gateway
  restart/configuration change was performed.
- The selected view remains `simson-room-screens/room-5cc36ebd30683524b292` on
  `media_player.s95d5413`. Its card is now `custom:simson-cast-room-screen`.
  A self-contained, Chrome-80-targeted bundle is loaded through an absolute
  HTTPS Lovelace resource; it does not depend on lazy loading the shared card.
  The Cast receiver application was quit/recast without restarting HA. The TV
  emitted a real diagnostic from Chrome 90 with authenticated signaling and
  WebRTC available. This proves card execution, not decoded caregiver frames.
- Frontend 5.9.3 prefers HA HLS for independent network-camera video in SIP
  rooms, with WebRTC fallback when the browser cannot forward HLS. SIP audio
  ownership/connections are unchanged. Existing room settings preserve the
  dedicated Cast card instead of treating it as an unrelated customized view.
- Frontend backup:
  `/homeassistant/simson_backups/before-sos-frontend-5.9.3-20261028T130709Z.zip`.

## Activation and acceptance

The local 3.9.2 backend adds a narrowly scoped exception for authenticated manual
button presses while HA global startup is incomplete. It retains receipt
validation, cooldown, restored-state filtering and the startup gate for anonymous
device/state events. Its tests reproduce the previous ignored-press failure.
The user subsequently committed/downloaded 3.9.2 through HACS and approved Core
restart. The fresh Core process restored the Simson connection, and a real
authenticated `input_button.panic_call` press emitted `simson_room_triggered`
and created `call_37a101d5-d4f0-503a-ab4a-373910dda3b4`. This verifies the loaded
startup exception rather than only manually calling the room service. Global
HA startup had not reached RUNNING at the last check; unrelated integrations
were not disabled or changed.

New browser code requires pika to reload the dashboard. Caregiver camera capture
still requires the caregiver's explicit enable-camera action; the TV does not
capture or publish a microphone/camera. During that actual SOS call the room
reported both `video: ready` and `display: ready`: the accepting browser reported
decoded room video, and the Cast viewer acknowledged decoded caregiver video.
The audio component still had no browser readiness acknowledgement at that
observation, despite the user's previous report that two-way voice worked.
Do not describe all three components as fully verified active from video alone.

## Evidence

- Integration tests: 118 passed, including startup manual presses, anonymous and
  restored-state rejection and duplicate consumer protection.
- Final frontend suite: 81 passed, including standalone Cast registration
  without shared/lazy scripts, native room configuration, HLS preference/WebRTC
  fallback and matching compressed assets.
- Real original-camera HLS preflight decoded 32 frames at width 3840 and forwarded
  decoded video to a width-1920 receiver. This did not originate a phone call.
- User-authorized manual room calls reached the VPS, SIP 1040 and pika; the VPS
  recorded pika's acceptance and a subsequent normal hangup for the first test.
  The final SOS-button test subsequently produced the device video/display
  readiness acknowledgements described above. The active user call was left
  open rather than automatically hung up for test cleanup.
