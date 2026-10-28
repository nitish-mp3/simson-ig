# SIP Room Media Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task after plan review. Preserve the existing uncommitted workspace; do not commit or create branches without explicit permission.

**Goal:** A button event initiates a private caregiver call with editable SIP-phone audio, independent HA camera video, and caregiver video on the room TV, without a room computer.

**Architecture:** One event consumer starts one room session. The existing VPS Asterisk bridge carries SIP audio; the accepting caregiver reads the configured HA camera and publishes their own camera directly to the room display. Existing browser audio and custom adapters remain supported.

**Tech Stack:** HA integration/Python, aiohttp addon, Go VPS/Asterisk AMI, Lit browser cards and WebRTC.

**Spec:** `../specs/2026-10-22-sip-room-media-design.md`

## Global Constraints

- 1040 is the first selected extension, never a hardcoded routing default.
- No room computer or room-side browser is required for native SIP mode.
- Cast remains video-only; no microphone API is promised for Cast.
- One active room session owns its exact SIP bridge and media resources.
- No unrelated gateway, PSTN, SwitchBot or user changes.
- Do not deploy incompatible components, silently restart services, or place unannounced test calls.
- Preserve previous frontend chunks and matching compressed assets; keep rollback backups.

## Review Focus

1. Duplicate/early events and ambiguous creation must not create another SIP leg.
2. Cross-account extensions or unrelated HA users must not join or publish media.
3. A failed camera/TV must not terminate healthy SIP audio.
4. Either-side hangup must release only the exact session, including after reconnect.
5. Browser mode and old adapter profiles must retain their existing behavior.

## Task 1: Separate button events from orchestration

**Files:** `custom_components/simson/room_triggers.py`, `tests/test_room_triggers.py`.

**Interface:** Produce `simson_room_triggered` with `node_id`, `room_id`, `entity_id`, `request_id`. A single consumer calls `simson.start_room_call` using that same request ID only when the saved enabled binding still matches.

- [ ] Write failing tests for event emission without direct calling, consumer invocation, duplicate event delivery, cooldown, wrong node/entity, changed/disabled binding, restored timestamps, and independent alarm delivery on failure.
- [ ] Run `python -m pytest tests/test_room_triggers.py -q`; verify the new assertions fail for missing separation.
- [ ] Separate normalization and consumption, retain unload handlers, bound duplicate receipts, and keep startup/restoration guards. Do not install a second dialing automation.
- [ ] Run trigger and room-session suites; verify one request produces one start.

## Task 2: Native targeted room SIP operation

**Files:** new `../vps/server/room_calls.go`, new `../vps/server/room_calls_test.go`, route registration beside existing authenticated node endpoints, `../vps/calls/manager.go` only if room identity cannot be retained using current call metadata; new `../addon/app/room_calls.py`, `../addon/app/local_api.py`, new `../addon/tests/test_room_calls.py`.

**Interfaces:** Add authenticated `POST /node/room-calls` and addon `POST /api/room-calls`. Payload: `room_id`, `session_id`, `request_id`, `source_extension`, `target_node_id`, `target_user_id`, `caller_user_id`, `caller_user_name`, `source_auto_mode`, `timeout_sec`. Response: exact `call_id`, `sip_bridge_id`, `session_id`, state. No endpoint accepts arbitrary bridge IDs or account IDs as authority.

- [ ] Write Go tests for invalid identities, disabled/offline/busy/wrong-account extension, wrong-account node, repeated request with same versus changed parameters, and ended-request replay. Write addon forwarding tests for bounded payloads, authenticated transport, upstream error preservation and no unsafe retries.
- [ ] Run `go test ./server -run RoomCall` in VPS and `python -m pytest tests/test_room_calls.py -q` in addon; confirm missing native operation fails.
- [ ] Implement one call record and tracked originate into an owned ConfBridge using existing router primitives. Preserve the selected caregiver in invitation/status metadata and answer authorization. Preserve exact room/session identity before invitation delivery. Reserve endpoint/request ownership before asynchronous originate.
- [ ] Add request reconciliation to return the same known result after an ambiguous timeout. Never originate a second leg merely because the first HTTP response was lost.
- [ ] Exercise answer, decline, either-side hangup, failed originate and timed-out SIP leg using AMI fixtures; ensure existing exact-call cleanup cleans the bridge, never unrelated channels.
- [ ] Run focused tests then `go test ./server ./asterisk ./calls` and affected addon suites.

## Task 3: Room profile and session integration

**Files:** `custom_components/simson/api.py`, `rooms.py`, `room_display.py`, `camera.py` if necessary, `services.yaml`, `tests/test_room_services.py`, `tests/test_rooms.py`, `tests/test_room_display.py`.

**Interfaces:** `SimsonAPI.start_room_sip_call(profile, session_identity, target_user)` calls Task 2. Native SIP+HA-camera+Cast profiles no longer require adapter scripts; explicitly configured legacy adapters still execute as before. `get_room_media` returns a role-scoped context for this call's accepting caregiver, including camera entity and display publisher role, never RTSP/SIP credentials.

- [ ] Write failing tests for native SIP profile acceptance, compatibility with browser/adapter profiles, busy/shared devices, exact-session cleanup, early caregiver answer, and create-timeout reconciliation.
- [ ] Write authorization tests: only the actual selected/accepting caregiver may obtain native SIP camera/publisher context; unrelated user, system user, wrong call, stale session, arbitrary admin and cross-node call are rejected. Cast remains receive-only.
- [ ] Run focused Python tests and inspect the failures.
- [ ] Pass session/request identity into native SIP start, bind exact returned call/bridge, and preserve room-user/caregiver metadata for lifecycle checks. Advertise a native SIP-room capability only when the addon/VPS handshake supports it.
- [ ] Extend media/display context by explicit roles: source browser for existing mode, accepting caregiver for native SIP mode, Cast viewer only. Validate role and exact call on every signaling request.
- [ ] Permit the accepting caregiver to acknowledge their real SIP RTP/camera frames, while keeping TV readiness acknowledgement at the receiver. Cleanup is idempotent and exact-call scoped.
- [ ] Run room, user-access, API and display regression suites.

## Task 4: Independent caregiver camera/display media and simple UI

**Files:** new `frontend/src/transport/sip-room-media.js`, `frontend/src/controllers/sip-bridge.js`, `controllers/media-devices.js`, `controllers/webrtc.js`, `room-settings.js`, relevant call view, `frontend/tests/browser.test.mjs`, new `frontend/tests/sip-room-media.test.mjs`.

**Interfaces:** Native SIP-room media controller owns a camera receive source and a video-only display publisher alongside the existing SIP UA. It never opens a room-side browser microphone. The caregiver microphone goes only to SIP audio; caregiver camera goes only to the room display.

- [ ] Write failing tests for SIP-only audio acquisition, HA camera frames on the recipient, local caregiver-camera publishing to TV, camera-disabled status, delayed camera enable, HLS fallback, blocked playback, reconnect, duplicate events, and exact cleanup without stopping unrelated tracks.
- [ ] Test a third user's dashboard cannot acquire either video path. Verify a SIP room never invokes the browser-user-call offer path or opens a second audio peer.
- [ ] Implement the native SIP-room controller using existing `openCameraSource`, `RoomDisplayPublisher` and SIP UA. Keep independent readiness/error states and retries tied to the same live call. Guard late asynchronous completion after hangup.
- [ ] Update Room setup to retain HA camera selection when SIP audio is selected, show editable extension/auto-answer controls and capability errors, and remove script requirements only for supported native mode. Preserve legacy adapters explicitly.
- [ ] Run build plus `npm test`; exercise dummy media with no source browser connected and require decoded frames at both camera and display outputs.

## Task 5: Verification, capability-gated deployment and actual acceptance

**Files:** `ROOM_CALLING.md`, deployment scripts/artifacts already used by the project, version manifests after validation.

- [ ] Record supported native routing, event-to-call consumer, SIP pickup/auto-answer behavior, TV/app microphone limitations and independent alarm requirements. Do not describe a Cast receiver as a microphone.
- [ ] Run targeted tests, affected broader suites and `git diff --check`. Inspect compressed asset parity and retain previous chunks.
- [ ] Stage compatible integration, addon and VPS artifacts with rollback backups. Obtain approval for any service interruption before activation. Keep the working live profile unchanged until all capabilities are confirmed.
- [ ] Configure living room with extension 1040 via the same supported profile API used by the UI, preserving its camera, display, users and panic event binding.
- [ ] Announce one bounded panic-button test when users are ready. Close all room browser senders. Require actual two-way 1040 RTP, decoded camera frames on pika and decoded pika frames on TV, not just SIP answer or Cast launch.
- [ ] Verify both hangup directions and a following call leave zero test channels/calls, with all session media stopped. Do not disturb another live call.
- [ ] Report separately: implemented/local tests, deployed capabilities, actual device results and any remaining unverified limitations. No zero-defect or production-readiness claim without physical acceptance.

## Current Execution State

User approved inline implementation, including the button/event separation. Executing in the existing workspace to preserve the current uncommitted changes; no commits or branches. Tasks 1–5 are in progress, with production changes gated on compatibility and validation.
