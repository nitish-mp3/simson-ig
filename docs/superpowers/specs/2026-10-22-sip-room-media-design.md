# SIP Room Audio With Independent Camera and TV Video

Status: routing design approved; button/event clarification incorporated; implementation plan pending review.

## Approved outcome

Pressing a room's configured panic button must emit an event which one configured
listener consumes to start the room session and call its selected caregiver without
requiring a computer or room-side browser. For the first room, SIP extension 1040
provides both microphone and speaker, the existing Home Assistant camera provides
room video, and the existing Cast display shows the caregiver's phone camera.
The room interface selects these devices; 1040 is a profile value, not a constant.

The existing browser-audio mode remains available for a microphone-capable TV app,
tablet or browser, including compatible external microphones exposed to that app.
Cast remains a video-only receiver; the TV having microphone hardware does not
make that microphone accessible through Cast.

## Evidence and current limitation

Manual tests previously succeeded using a temporary computer as the sender. The
panic helper starts a targeted user call, but an unanswered room-side media role
leaves camera and display components pending. Existing SIP room profiles require
adapter scripts and cannot yet combine native SIP audio with an HA camera.
The VPS already originates SIP devices into Asterisk bridges, the caregiver card
already joins those bridges, and the integration already provides camera streaming
and video-only display signaling. Reuse these mechanisms rather than adding an
always-running computer, headless browser, or separate transcoding service.

## Routing

1. The button remains an event source. One reusable Simson listener normalizes
   the configured button/helper activation into `simson_room_triggered`, with
   node, room, entity and request IDs. A single orchestration consumer catches
   that event, validates the enabled saved binding and starts the idempotent
   room session. No second direct dial is made by the button listener. Existing
   external automations may observe the event for independent alarms but must
   not also dial for the same binding. No per-room user-written script is needed.
   HA then asks the addon for a room SIP call.
2. The addon authenticates to the VPS and requests one tracked Asterisk bridge.
   The VPS validates that the chosen extension belongs to the same account, is
   enabled, registered, and not in a conflicting call. It calls that extension
   with the selected speaker/auto-answer hint, without assuming it is supported.
3. Only the selected caregiver receives the call invitation. Accepting joins the
   existing SIP/WebRTC audio bridge. The room SIP phone, not another browser,
   carries the resident's two-way audio.
4. The accepting caregiver card independently opens the configured HA camera's
   video-only stream. Prefer native HA WebRTC; retain the tested HLS fallback
   when the provider is unsupported, fails or times out. Camera audio must never
   be played, transmitted or mixed with the SIP audio path.
5. If the caregiver enables their camera, their card publishes that video directly
   to the room's existing video-only Cast receiver. There is no room computer in
   this path. No caregiver camera means an explicit video-disabled/waiting state,
   not a false connection success.

## Interface boundaries

Preserve `simson.start_room_call` and `simson.end_room_call` as automation entry
points. Extend the native room profile so `audio_mode=sip` can use
`video_mode=ha_camera` and a Cast display without custom scripts. Legacy adapter
profiles continue using their existing execution and cleanup rules.

Introduce an addon room-SIP-call operation and authenticated VPS room-SIP-call
operation. Both accept a bounded request containing room/session/request identity,
source extension, target HA node/user identity, caller room-user identity,
auto-answer mode and timeout. They return the exact call and bridge identifiers.
Request identity is checked before creating a second originate. Ambiguous create
timeouts are reconciled by identity, never blindly retried as another call.

Room metadata is attached at creation so an early answer can still be attributed
to its room. The call includes the caregiver user ID and room-user identity,
control node and source extension. Validation must not relax ordinary SIP-call
authorization, existing node/account boundaries, or unrelated user ownership.

Extend `get_room_media` so only the actual accepting caregiver for this exact live
SIP-room call receives its camera binding and display publisher context. Signed-in
room users retain their existing browser-mode rights. Cast users remain receive-only
and never receive SIP passwords, RTSP credentials or a camera-source identity.
Unrelated users, system users and arbitrary administrators cannot acquire media by
knowing a room ID. Display signaling remains video-only and session/generation scoped.

## UI and device selection

Expose separate choices for SIP phone audio, microphone-capable browser/app audio,
HA camera video, and Cast display. Selecting native SIP audio does not silently
rewrite the selected camera to adapter mode or demand uninstalled scripts.
SIP mode never arms or opens a room browser microphone. Unsupported TV microphone
access must be explained rather than offered as a working Cast capability.
Keep extension selection editable, with registration/busy errors surfaced clearly.

Show independent audio, room-camera and caregiver-to-TV video readiness. SIP
answer, a video track, and a Cast launch are not proof of flowing media. Require
audio RTP/bridge evidence, decoded camera frames, and TV decoded-frame acknowledgement.

## Failure and cleanup rules

- One panic press creates one room session; cooldown, duplicate request and busy
  guards remain effective. Attribute updates and restart restoration never dial.
- The normalized event retains its request identity through call creation. A
  duplicate delivered event or disabled/removed/changed binding cannot create a
  second call. Event handling remains separate from media/call orchestration.
- Either-side hangup, caregiver decline, unanswered SIP phone, failed originate,
  setup timeout or duration limit releases only this session's SIP channels/bridge
  and stops its camera/display peers. Repeated cleanup is safe.
- Video/camera/TV failure does not tear down healthy two-way SIP audio. It reports
  degraded video with retry bounded to the same live session.
- Authentication failures do not trigger fallback to global credentials or another
  user. A third dashboard must not hear, answer or see the call automatically.
- A reconnect may reacquire media only for the same accepting user and live call;
  no automatic redial or resurrection of a terminated session.
- TV sleep/protection is distinct from media routing. Do not disable OLED protection
  or change unrelated device settings. Launch the selected view for a new call,
  acknowledge real frames, and report an unavailable display honestly.

## Compatibility and deployment

No changes to 1701, other gateways, PSTN routing, unrelated users or SwitchBot.
Do not switch the live room profile to native SIP mode until the deployed backend,
addon, VPS and card advertise compatible capabilities. Preserve a backup and the
existing browser profile until acceptance. Generate matching identity/gzip/Brotli
frontend assets and retain the previous release chunks.

Any additional HA Core restart, addon/service interruption or live ringing test
requires a separate user-facing notice and the applicable approval. No broad
Asterisk restart or endpoint reset is a substitute for scoped cleanup.

## Verification and acceptance

Regression tests cover profile compatibility, cross-account/user rejection,
offline/busy 1040, duplicate and ambiguous start, early answer, stale signals,
camera-provider timeout/HLS fallback, blocked playback, camera off, either-side
hangup, network loss, repeated cleanup and unrelated live calls.

First validate with dummy SIP/media fixtures and existing suites. Then, with the
user ready, run one actual panic-button call with all room-side browser senders
closed. Confirm two-way audio through 1040, decoded room-camera video on pika,
decoded pika video on the TV, and cleanup to zero test channels/calls. Repeat with
the opposite hangup side and a second call. Report local-test evidence separately
from actual device evidence; do not call the system production-ready before these
physical paths are verified.
