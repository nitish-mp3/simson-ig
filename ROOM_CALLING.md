# Room endpoints and split-device calling

Integration 3.9.0 / card 5.9.0 / addon 5.1.13 adds native SIP room audio alongside independent camera video and video-only Cast screens. The VPS must expose the authenticated native SIP-room capability before saving this mode. A room is not a
particular TV model and a caregiver does not need matching room hardware: the
caregiver uses their existing Home Assistant phone/browser contact.

## What is implemented

- **Simson → Room setup** in the HA sidebar: administrator-only graphical room
  management. Add/edit/remove rooms, duplicate routing and adapter policies,
  select discovered HA users, cameras, displays, scripts and panic devices,
  configure limits, and enable automatic calling without writing room YAML.
- Searchable, paginated room directory; responsive mobile forms; protected
  unsaved drafts; concurrent-edit revisions prevent silently overwriting
  another administrator's changes. Live sessions cannot be rebound or deleted.
- Persisted, administrator-configured room profiles with a dedicated HA user,
  default caregiver, audio mode, camera/display bindings and adapter scripts.
- One discoverable `sensor` per room (`simson_room: true`); stable entity unique
  IDs survive renaming. Sensor attributes expose exact session/call IDs, device
  bindings, component readiness, errors and cleanup status.
- Per-room call-caregiver and end-session button entities for dashboard cards,
  scripts and automations, retaining the authenticated caller context.
- `configure_room`, `get_room_configuration`, `start_room_call`, `end_room_call`,
  `bind_room_call` and `report_room_component` actions, with optional response data.
- Native browser-to-caregiver calling through the existing targeted user-call
  path and its Companion notifications. The room browser must use the room's
  dedicated HA login; caregiver identity is not replaced with the TV login.
- Native SIP audio with an editable registered handset extension, independent
  HA camera reception on the caregiver, and caregiver-camera publishing to Cast.
  No room computer or adapter scripts are required for this combination.
- An adapter contract for custom audio/video publishing and screen
  navigation. Readiness is acknowledged, never inferred from a camera
  being displayed or a script merely returning successfully.
- Duplicate-request protection, shared-device busy guards, setup/call-duration
  limits, peer-end reconciliation, session-scoped cleanup, retry backoff,
  ambiguous-request quarantine and safe restart recovery.
- `custom:simson-room-card`, a compact responsive room controller. Existing live
  call cards remain responsible for media and explicit browser consent.

## Important deployment boundary

This is **not** an Android TV camera driver. Native SIP rooms use the existing
Asterisk audio bridge: one selected handset supplies the room microphone and
speaker, and only the accepting caregiver joins its other audio leg. Their
device receives the configured HA camera directly and publishes their own
camera to the room TV. The two video paths never join call audio. Camera/TV
failure does not end healthy SIP audio. Explicit legacy adapter profiles remain supported.
Browser-audio rooms can select **Home Assistant camera · built-in WebRTC**.
The initiating browser receives the authenticated HA camera video and forwards
its real video track to the caregiver, while capturing only the selected/default
microphone locally. No snapshot polling, raw RTSP credentials or custom adapter
scripts are needed for this path. The camera must provide browser-decodable video
through HA's WebRTC provider. An unsupported Generic Camera ffmpeg wrapper can
fall back to a read-only Simson room camera using the original server-side stream
source; it never changes the original camera configuration. Camera failure leaves
audio available and reports the failure; it never silently opens a different webcam.
If HA's camera WebRTC provider rejects the source, supported browsers can forward
HA's authenticated HLS live video instead. This uses real decoded frames, not
snapshot polling, but adds the stream's HLS latency. Microphone audio remains
on the direct WebRTC call. Browsers without media-element capture need a working
native camera WebRTC provider. Room routing calls the shared validated call helper
directly rather than fabricating version-sensitive HA ServiceCall objects.

Choose **Built-in Home Assistant Cast** to show the caregiver's received video on
the room TV. Saving in Room setup creates a dedicated managed dashboard/view.
The Cast screen uses a second, video-only WebRTC connection from the accepting
caregiver in SIP mode, or the room source browser in browser mode: no microphone, audio transceiver, automatic answering or unrelated call
access. The screen requires HA's authenticated Cast receiver, HTTPS external URL and
a browser-compatible Cast receiver. The publishing device must remain open and
the caregiver must enable their camera. HA's configured Cast system identity is
authorized only for viewer signaling on rooms with a configured Cast display;
it cannot publish, obtain the room camera binding or join audio. Other HA users
and unrelated dashboards remain excluded. Cast service success alone is not screen
readiness: the display reports ready only after decoded video frames.

No SIP credentials, network camera URLs, passwords or TURN secrets belong in
room profiles, events or dashboard YAML. Keep those in the respective device or
media bridge integration. An RTSP viewing stream and an outgoing WebRTC video
track are different capabilities.

No TV auto-answer, anonymous media access, global dashboard navigation or
third-party audio listening is enabled. The room card does not acquire a
microphone or attach itself to someone else's call. Native browser media reports
readiness only after both inbound/outbound audio packets. Browser video requires
decoded/encoded frames; room-camera publishing requires encoded outgoing frames
without requiring the caregiver to enable their own camera. Blocked audio playback
does not count as ready. Signalling alone does not mark media ready. The native
display acknowledges decoded frames; custom adapters must acknowledge their own
real readiness.

During rolling deployment, the room workspace checks backend capabilities before
creating a camera/Cast profile or modifying its dashboard. If the newer Python
backend has not loaded, it refuses these changes clearly rather than sending
unsupported fields or pretending the media path is ready. Existing voice/custom
adapter room editing remains compatible with the previous backend.

Cross-node room destinations, native SIP-source-to-caregiver bridging,
unattended TV microphone acquisition are **not newly
implemented here**. A SIP adapter must implement the appropriate supported
transport and bind an actual room-owned call; connecting two unrelated calls
does not meet this contract. Do not label a split room production-ready until
that adapter is installed and verified on the selected hardware.

## Start with a browser room

**Recommended: open Simson in the HA sidebar, choose Room setup, then Add room.**
Choose the room/TV login and caregiver by name. Select browser or separate SIP
audio, the desired camera/display, and any installed reusable media adapters.
Save once; Simson creates the room sensor and call/end buttons automatically.
No chat-based device enrollment or per-room code changes are required.

For another room, use Duplicate setup to reuse routing, limits and media
adapters. Hardware bindings, room identity and the automatic trigger are
deliberately cleared, so copying a profile does not accidentally control the
original room's phone/TV or activate its panic device.

The UI lists HA entities already exposed by their integrations; SIP handset
extensions can be entered in the SIP field. It does not require forwarding
passwords or RTSP credentials. Device commissioning and installing a media
adapter remain separate tasks, not code you must rewrite for each room.

The existing service interface below remains available for provisioning tools
and advanced automations; it is **not** the required onboarding workflow.

Create a dedicated non-admin HA user for the room and use it on that room's
browser. As an administrator:

```yaml
action: simson.configure_room
data:
  node_id: YOUR_NODE_ID
  room_id: room-101
  label: Room 101
  room_user_id: ROOM_HA_USER_ID
  caregiver_user_id: CAREGIVER_HA_USER_ID
  audio_mode: browser
  video_mode: browser
  setup_timeout_sec: 90
  max_duration_sec: 3600
```

Find the new room sensor under the Simson integration. Use the actual entity ID
assigned by HA, not an assumed name:

```yaml
type: custom:simson-room-card
entity: sensor.YOUR_ROOM_SENSOR
```

Place the existing Simson live-call card alongside it or on the room's calling
dashboard. Starting a room call uses the room identity, even when an
administrator or trusted panic automation initiates it. The existing private
notification path targets only the caregiver's registered Companion devices;
delivery still depends on that user's device registration and push permissions.
Use the existing notification test action to verify those independently.

Panic automation action:

```yaml
action: simson.start_room_call
data:
  node_id: YOUR_NODE_ID
  room_id: room-101
  request_id: "{{ trigger.event.context.id }}"
response_variable: room_session
```

That request ID example is for **event-triggered** automations; use an ID suited
to your trigger. Reuse it only for retries of the same activation. Omit it for
manual actions. The current request and the previous 64 completed activation
IDs are retained per room across restarts; older IDs are not an indefinite
deduplication guarantee. Alert/escalation automations must remain independent of the TV
and camera: send a targeted caregiver alarm before attempting media, and handle
call-service failures instead of suppressing the alarm. This is not a certified
emergency calling system.

## Saved panic triggers, without writing an automation

In the room workspace, select a panic sensor/helper/button/event entity. Choose
either a specific state (for example `on`) or a button press/new event, set a
cooldown and explicitly enable it. Saving the profile never initiates a call.
The backend uses the saved room identity and caregiver routing; changing or
removing a profile updates its trigger binding immediately.

Initial entity creation, unavailable recovery, attribute-only updates and
matching-state repeats do not dial. The first real timestamped button press
from an initially unknown state is accepted; stale restored timestamps are not.
Cooldown limits switch bounce and repeated presses. Existing HA automations can
continue using the exposed call/end buttons and actions instead of this optional
managed trigger. Avoid enabling both paths for the same physical panic device.

`simson_room_triggered` fires **before** attempting the call and includes
`node_id`, `room_id`, `entity_id`, `request_id`. Use it for independent targeted
caregiver alarms/escalation. A failed call also emits
`simson_room_trigger_failed`; it does not cancel the preceding alarm event.
These events do not automatically send an additional push notification:
configure your alarm integration separately. Ordinary user-call notifications
still use the existing exact-recipient call path.

## Graphical configuration API contract

The workspace uses authenticated HA `call_service` WebSocket commands with
`return_response: true`, not a public unauthenticated configuration endpoint.
`simson.get_room_configuration` takes no arguments and requires a signed-in
administrator. It returns `nodes[]` (node ID, label, connectivity, saved rooms
and current session snapshots) and active non-system `users[]` (ID, label).
Media credentials are not part of this contract. Entity suggestions come from
the HA state inventory already available to the authenticated frontend.

Saving/removing uses the existing administrator-only `configure_room` action.
The optional `expected_revision` must equal the current room revision (zero
when creating); stale updates/deletes fail instead of overwriting newer edits.
The UI always supplies this guard. Successful saves increment the persisted
revision. Refresh does not replace unsaved draft fields silently.
`simson_room_configuration_changed` emits the actor, operation, revision and
changed field names for audit automations, without copying credentials/values.

Optional trigger fields are `trigger_entity`, `trigger_enabled` (default false),
`trigger_mode` (`state`/`press`), `trigger_state` (default `on`) and
`trigger_cooldown_sec` (1–3600; default 30). Only existing allowed-domain entities
can be bound. Simson's own call buttons cannot trigger themselves recursively.

## Split room adapter contract

Configure `audio_mode: sip`, `sip_extension`, optional `camera_entity`,
`video_mode: adapter`, `display_entity`, `start_script` and `stop_script`.
Both scripts are mandatory when split devices are configured; missing entities
are rejected. The services expose HA selectors so integrations can be chosen
without hardcoded vendors.

Start and cleanup scripts receive:

| Variable | Meaning |
| --- | --- |
| `room_id`, `session_id`, `request_id` | Stable room, exact activation and duplicate key |
| `node_id` | Exact Simson node owning this room |
| `room_user_id`, `target_user_id` | Exact room identity and selected caregiver |
| `call_id` | Native call ID, or initially empty for SIP adapters |
| `audio_policy` | `sip_only` or `browser_only`; never open both audio paths |
| `sip_extension`, `camera_entity`, `display_entity` | Configured source/target bindings |

Scripts must return within 20 seconds. Long-lived device/media sessions should
be managed by their owning integration/service, not a script that waits for the
entire conversation. Start must be idempotent for `session_id`. Cleanup must be
idempotent and scoped to that session, not every call on an endpoint.

1. Start SIP audio through an adapter capable of inviting the **specific**
   caregiver to the same call. Do not start a second browser audio call.
2. Once the actual call exists, call `simson.bind_room_call` with its exact
   `call_id`. It must be a live call whose caller is `room_user_id`. A SIP
   extension is not a call ID. Raw unmanaged Asterisk channels cannot be bound.
3. Navigate only the selected display/client. Wait for its acknowledgement.
   A successful `media_player` command alone is not proof the page appeared.
4. Publish the room camera as a **video-only** track to the same authorized
   caregiver session, and render caregiver video on the room screen. Keep TV
   audio muted when SIP handles audio. Verify decoded frames at the receiver.
5. Report actual audio/video/display readiness using the exact session ID.
6. Stop only those owned media/display resources on cleanup, then acknowledge
   `stopped` for each adapter-owned component. Without those acknowledgements,
   the session remains `attention` and cannot be reused accidentally.

Example acknowledgement **inside an adapter**, after verifying the device:

```yaml
action: simson.report_room_component
data:
  node_id: YOUR_NODE_ID
  room_id: "{{ room_id }}"
  session_id: "{{ session_id }}"
  component: display
  state: ready
```

Use `component: audio` after media connects, and `component: video` only after
the intended receiver decodes frames. These are acknowledgements, not commands
that start video or sound. Stale session acknowledgements are rejected.

## State and recovery

`starting → ringing → connecting → active`, with `degraded` for optional
video/display failures. `active` requires a live call **and** all enabled
components ready. `attention` means uncertainty, audio failure, restart recovery
or failed cleanup. It is not permission to dial again.

`end_room_call` requires both room ID and current session ID. It sends strict
hangup only for the exact owned call, then runs cleanup even if hangup failed.
Peer termination, a missing call after a 20-second successful-poll grace,
setup timeout and maximum duration trigger cleanup. Addon polling failures are
not interpreted as an ended call. Automatic cleanup retries back off; manual
cleanup remains available immediately.

An ambiguous native create timeout is never redialed automatically. An operator
may bind its verified live call ID. Otherwise two successful empty observations
after 30 seconds clear creation uncertainty; cleanup still has to complete.
After HA restarts, previous sessions require attention rather than automatically
reacquiring cameras/microphones. Profiles and exact session IDs persist.

`simson_room_changed` events contain `entry_id`, `room_id` and a `session`
snapshot (null if not yet started/removed). Use the sensor for discovery/current
state and events for automation. As with other HA state/event data, this is not
a secret channel: never put stream credentials or access tokens in it.

## Acceptance checks before a room goes live

### Panic button and audio selection

The panic helper only starts calls when its room profile has `trigger_enabled`
saved as true. The button-state listener emits `simson_room_triggered`; one
integration-owned consumer validates the unchanged enabled binding and starts
that exact request once. Do not add a second dialing automation for the same event.
Duplicate or restored events do not redial. Independent caregiver alarms should
also listen for the panic event and remain separate from call success.
A Cast receiver is a video-only output, not the
room microphone, even when the television hardware has a microphone.

**Browser audio only:** on the room's microphone-capable browser, signed in as its configured room user,
add `custom:simson-room-source-card` with `entity: sensor.your_simson_room`.
Click **Enable room station** after opening/reloading that page. It preflights
microphone permission and immediately releases the probe tracks. New matching
room sessions can then acquire media automatically; old sessions, other users,
unrelated calls and SIP-audio profiles cannot activate this microphone.
An authenticated, expiring server lease prevents two room browsers being armed
at once. Closing/disarming the owning station stops its media and requests
cleanup only for its exact joined room session. Keep the station page running;
a suspended/closed browser is not an unattended microphone appliance. An HA
restart never manufactures media readiness or replays a restored panic press.

For **SIP phone · room microphone and speaker**, choose the handset extension
(for example 1040), HA camera, optional Cast display and caregiver in Room setup.
Leave start/cleanup scripts empty for native mode. Select manual pickup or a
trusted auto-answer request; the phone must support and permit that request.
No room browser microphone is opened. The caregiver's phone microphone is the
other end of the conversation, not a replacement room microphone. They must
enable their own camera for video on the TV. An internal/USB TV microphone is
an alternative only through a microphone-capable browser/app, never HA Cast.

The native endpoint uses account/node install-token authentication, validates
same-account phone and node ownership, refuses unregistered/busy phones and
retains bounded request receipts for 24 hours in the running VPS process.
Ambiguous HTTP results are reconciled against exact room/session metadata, not
automatically redialed. Receipts are not durable across VPS restarts; restarting
the VPS is not a substitute for verifying and ending an uncertain session.

Frontend releases must deploy each JavaScript/manifest file together with its
matching `.gz` and `.br` representations. The frontend build generates these
representations and tests compare their decoded bytes. A stale compressed sibling
can register an older set of cards even when an uncompressed HTTP check succeeds;
verify a fresh browser load, not only an identity-encoding download. After a
frontend release, update the Lovelace resource version without restarting HA.

- Caller and caregiver are different users; an unrelated dashboard neither
  hears nor acquires the call. Test alternate phones/mobile data and TURN.
- One panic activation creates one session; retries do not ring twice.
- Caregiver answer/decline and remote hangup clean up SIP audio and the TV/video
  adapter without ending another room's call.
- Camera failure leaves healthy audio available and reports degraded state.
- TV failure does not suppress the independent caregiver alarm.
- Screen commands and media readiness are acknowledged by the selected device,
  not broadcast or assumed. No duplicate TV/SIP microphones or speakers.
- HA/addon restarts, offline cameras, stale commands and failed cleanup leave
  actionable state rather than silently reopening private media.

Local tests use dummy calls/media only. Native mode requires the matching addon
proxy, VPS operation and integration to be loaded together. Real handset pickup,
two-way audio, camera playback and TV frames still require device acceptance;
SIP answer and successful Cast launch alone are not proof of media delivery.
