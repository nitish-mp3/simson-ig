# Call controls and privacy

Requires integration 3.3.1, addon 5.1.7 and card 5.3.1. VPS fixes are version 1.6.9.

## Gateway recovery

```yaml
action: simson.clear_stuck_calls
data:
  endpoint_id: "1701"
```

This is a destructive recovery action: it ends channels belonging to that endpoint, including a valid call. Do not run it periodically while a call is connected. Interactive use requires an administrator; trusted automations can invoke it. Use the endpoint ID in the addon, which is normally the extension.

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

For notifications while the dashboard is closed, an administrator maps each contact to **that user's** Companion phone:

```yaml
action: simson.set_user_notification_target
data:
  entity_id: sensor.your_simson_user_contact
  notify_service: notify.mobile_app_that_users_phone
  dashboard_path: /lovelace/calls
```

Mappings persist in HA storage. Leave `notify_service` empty to disable. Answer/Decline opens the configured dashboard, where its Simson card performs an authenticated HA service action for that exact call. Ownership is checked server-side; no tokens are embedded in the link. The configured dashboard must contain a Simson card for that node. Targeted calls no longer create a global persistent notification visible to unrelated users. Without a mapped phone, an incoming call is available in that user's card while it is ringing, but cannot wake a closed browser.

Cards do not automatically join existing SIP/gateway calls on dashboard load. Browser media requires a local dialing action, an explicit answer, or an authenticated notification-answer handoff. Diagnostic HA entities are not per-user secrets: Home Assistant's shared state remains visible to users with HA state access. The underlying shared browser SIP credential is a remaining architectural limitation, not a per-user security boundary.

Legacy notification actions without a verified HA user context are refused. Use the authenticated Answer/Decline links from the user notification mapping instead.

Notification links follow the [Companion app's relative-dashboard URI format](https://companion.home-assistant.io/docs/notifications/actionable-notifications/). They open the dashboard rather than depending on a navigation request carrying an API bearer header. Tests cover exact-call handoff once, matching-node/user targeting, notification clearing, and preservation of existing dashboard query parameters.

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
