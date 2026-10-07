# Call controls and privacy

Requires integration 3.3.7, addon 5.1.10 and card 5.3.6. VPS fixes are version 1.6.14. See [media and door video](MEDIA_AND_DOOR_VIDEO.md) for the legacy 1605 codec correction, verified relay fixes and remaining device/notification setup.

## Gateway recovery

```yaml
action: simson.clear_stuck_calls
data:
  endpoint_id: "1701"
```

This is a destructive recovery action: it ends channels belonging to that endpoint, including a valid call. Do not run it periodically while a call is connected. Interactive use requires an administrator; trusted automations can invoke it. Use the endpoint ID in the addon, which is normally the extension.

Recovery accepts either the database endpoint ID or its extension, within the same account. It succeeds with `already_clear: true` if no channels remain; zero channels alone does not prove a hardware fault. For a stranded handset-first callback, release the source phone (for example `3101`), not an idle gateway (`1701`). `simson.hangup_call` requires an actual call ID, never a SIP extension.

VPS 1.6.10 moves originate-result callbacks off the AMI reader so a gateway originate cannot block reading its own acknowledgement. Cleanup preserves real Local channel suffixes (`;1`/`;2`), follows actual bridge membership and Local siblings, and never groups channels by equal duration. Callback ring deadlines and a 20-second missing-peer grace period recover tracked automation orphans on the VPS; healthy paired calls are not ended by this watchdog. It does not replace analog disconnect supervision on a gateway that continues reporting a connected call.

Handset-to-gateway automation status is sent only to the initiating node, with source/trunk and call ID. Addon 5.1.8 represents it as an observed outgoing callback for diagnostic entities, without exposing browser Answer or auto-join media controls. Older addon versions do not receive this new telemetry, to preserve privacy during rolling upgrades. Administrators can hang up these observed callbacks by exact call ID. Endpoint recovery works after the VPS update; diagnostic visibility requires the addon update.

The existing `Calls Count` sensor exposes `active_calls` with call IDs, state, direction, source/target extensions, trunk, owner and timing. `simson.hangup_call` accepts an exact `call_id`. Interactive call controls enforce the authenticated user's ownership and do not fall back to somebody else's call when an ID expires.

### Mauritius trunk 6202 validation

The regression suite exercises card dialing through the HA client, addon protocol request and mock AMI action. `59330025`, `23059330025` and `+23059330025` retain their intended digits and explicit trunk `6202`; no Indian country code or leading-zero retry is added to these numbers. The `+` is removed before Asterisk's digits-only outbound dialplan. Mock AMI uses an in-memory pipe, not the production server or gateway.

Read-only VPS checks confirmed 6202 enabled/default-outbound, a registered TCP contact and an established connection, G.711 codecs, and the installed `from-simson-out` dialplan selecting `${SIMSON_TRUNK}`. `NonQual` means OPTIONS probing is disabled, not that registration is absent. These checks do not prove that a gateway processes INVITEs or that its SIM completes a call. Physical delivery, ringing, audio and hangup cannot be certified from registration or mocks alone. No real test calls were placed.

## User contacts

Every enabled, non-system HA user has a stable Simson contact sensor. Its `contact_id` is derived from the integration entry and HA user ID, so changing a display name does not change the unique ID. The contact remains selectable without dashboard presence; it is not a claim that the browser is online. Renaming contacts uses the normal HA entity UI.

```yaml
action: simson.call_user
data:
  entity_id: sensor.your_simson_user_contact
  call_type: voice
```

Local contacts appear directly in the dialer. Node selection remains available for another site. User browser calls require a browser/Companion app to answer; a SIP handset callback still uses `simson.make_call` with `source_extension`.

Each contact also has a native `button` entity named `Call <user>`. Use `button.press` from a dashboard action, or invoke `simson.call_user` from a script with either the sensor or button entity. The authenticated user is the caller; a provided caller ID cannot override their identity. Self-calls, disabled users and busy participants return actionable errors. Concurrent contact calls on an integration entry are serialized before the addon request.

Example script (replace the entity with the contact created on your HA instance):

```yaml
alias: Call reception
mode: single
sequence:
  - action: simson.call_user
    data:
      entity_id: sensor.your_simson_user_contact
      call_type: voice
```

A standard dashboard Button card can run that script using its normal tap action; the native `Call <user>` entity can also be selected directly in a Button card. Use the user card below if you want inline call controls rather than a script button plus popup.

Interactive scripts open private calling controls on the caller's loaded Simson dashboard. Select **Use this browser for audio & video** (or audio) to join from that browser; this prevents other tabs/devices automatically opening microphones. Unattended scripts must provide `caller_user_id` and do not automatically join any browser. A dashboard must contain a Simson card for popup controls; scripts alone cannot inject UI into arbitrary HA pages.

For a dedicated contact card with in-place controls:

```yaml
type: custom:simson-user-card
entity: sensor.your_simson_user_contact
title: Call the reception team
```

Its contact entity selects the node automatically. The editor offers the available users. A dial-only card also shows a current-call banner to reopen minimized controls, without requiring a separate live-call card.

For notifications while the dashboard is closed, Simson automatically selects push-capable Android/iOS Companion registrations owned by **that HA user**. Device names are not hardcoded and other users' phones are never automatic targets. The Companion app must be registered as the recipient, with OS notification permissions enabled. Service success means submission to HA, not proof of delivery to the phone.

Default Answer/Decline links open the authenticated `/simson-call` panel, independent of dashboard layout. Reopening during ringing restores incoming controls even if the original event was missed. Caller names come from the authenticated caller profile rather than the site label.

Test binding without creating a call:

```yaml
action: simson.test_user_notification
data:
  entity_id: sensor.your_simson_user_contact
```

Users may test their own contact; administrators may test any contact. The card's Devices tab offers the same non-call test for the logged-in user. No phone produces a helpful error instead of broadcasting. Public diagnostics contain counts/status, never private mobile-app webhook IDs.

An administrator may explicitly override automatic discovery (set `automatic: true` to remove an existing override, including a disabled mapping):

```yaml
action: simson.set_user_notification_target
data:
  entity_id: sensor.your_simson_user_contact
  notify_service: notify.mobile_app_that_users_phone
  dashboard_path: /lovelace/calls
```

Mappings persist in HA storage. Leave `notify_service` empty to disable. Answer/Decline opens the configured dashboard, where its Simson card performs an authenticated HA service action for that exact call. Ownership is checked server-side; no tokens are embedded in the link. The configured dashboard must contain a Simson card for that node. Targeted calls no longer create a global persistent notification visible to unrelated users. Without a mapped phone, an incoming call is available in that user's card while it is ringing, but cannot wake a closed browser.

The contact's `notification` attribute and `simson_user_notification_status` event expose the last call ID, service, status and error. `sent` means the HA notify service accepted the request, **not** that a phone received it. Incoming notifications are deduplicated; sending and clearing are ordered, and late invites cannot resurrect an already-cleared notification. Failed sends remain retryable on a repeated incoming event. Tests use mocked notify services and browser media; physical push delivery still needs validation on each configured phone. Companion platforms can limit notification clearing depending on app activity; see [notification limitations](https://companion.home-assistant.io/docs/notifications/notifications-basic/).

Cards do not automatically join existing SIP/gateway calls on dashboard load. Browser media requires a local dialing action, an explicit answer, or an authenticated notification-answer handoff. Diagnostic HA entities are not per-user secrets: Home Assistant's shared state remains visible to users with HA state access. The underlying shared browser SIP credential is a remaining architectural limitation, not a per-user security boundary.

Legacy notification actions without a verified HA user context are refused. Use the authenticated Answer/Decline links from the user notification mapping instead.

Notification links follow the [Companion app's relative-dashboard URI format](https://companion.home-assistant.io/docs/notifications/actionable-notifications/). They open the dashboard rather than depending on a navigation request carrying an API bearer header. Tests cover exact-call handoff once, matching-node/user targeting, notification clearing, and preservation of existing dashboard query parameters.

## Gateway 1701 findings (6 October)

The 06:10:25 UTC handset callback answered 3101 and dialed `09123208334` through 1701. The gateway's own log confirms receipt and SIP 486; Asterisk recorded cause 17 and released the source and gateway channels. Physical FXO `in_use` with zero server channels is distinct from a VPS orphan. Following the user's reboot, read-only checks showed FXO1 `connected` and both SIP contacts available. No real validation calls were placed, so analog disconnect/delivery is not certified.

VPS 1.6.11 preserves gateway cause 17/21 as `gateway_busy`/`gateway_rejected` instead of generic unavailable, without retrying these definitive failures. Endpoint recovery reports `hardware_checked: false`: it releases server channels, not a physical line. Busy-tone detection and polarity settings are not changed automatically; they require carrier/device-specific disconnect verification.

## 2N door phone

```yaml
type: custom:simson-door-phone-card
title: Front entrance
node_id: your_node
extension: "your_registered_door_extension"
camera_entity: camera.your_2n_camera
device_name: Front entrance
```

Select a camera and SIP extension in the card editor. The card combines camera viewing with SIP audio and in-place call controls. Page load does not dial or join any conversation. Video is requested explicitly or during your call to that door.

The device must register its SIP account separately. A My2N cloud account is not a Simson SIP registration. Existing Doorman camera snapshots do not become smooth video just because the UI changes. Configure a stream-capable HA camera using the device's local RTSP URL (often `rtsp://device-address/h264_stream`) and authenticated camera access, according to the device's settings and licence. Do not publish RTSP or embed device passwords in dashboard YAML. Remote viewing should use HA's authenticated camera/stream proxy.

Official references: [2N streaming configuration](https://wiki.2n.com/hip/conf/latest/en/5-konfigurace-interkomu/5-4-sluzby/5-4-2-streamovani) and [2N camera configuration](https://wiki.2n.com/hip/conf/latest/en/5-konfigurace-interkomu/5-5-hardware/5-5-3-kamera). Hardware identifier 570v6 alone does not establish which SIP/video features or licences are enabled. Native SIP video negotiation with a physical 2N unit remains unverified; this card uses HA camera video alongside SIP audio.
