# Simson Call Relay — Home Assistant Integration

Custom integration that pairs with the **Simson addon** to expose call state sensors and call control services inside Home Assistant.
..
..
## Installation

1. Install/download the Simson Call Relay integration.
2. Restart Home Assistant.
3. Go to **Settings -> Devices & Services -> Add Integration -> Simson Call Relay**.
4. Enter the addon API URL, usually `http://localhost:8099` when the addon runs on the same HAOS instance.
5. Finish setup and refresh the browser once.

Important: seeing **Simson Call Relay** under **Downloaded** only means the files are installed. The Lovelace card is registered only after the integration is added under **Devices & Services**.

## Entities

| Entity | Type | Description |
|--------|------|-------------|
| `sensor.simson_<node>_connection` | Sensor | VPS connection status (`connected` / `disconnected`) |
| `sensor.simson_<node>_call_state` | Sensor | Current call state (`idle`, `ringing`, `incoming`, `active`) |
| `sensor.simson_<node>_calls_count` | Sensor | Total tracked calls count |

## Services

| Service | Description | Parameters |
|---------|-------------|------------|
| `simson.make_call` | Initiate a call | `target_node_id` or `target_id`; for outside calls use `phone_number` plus optional `trunk` such as `7009` |
| `simson.answer_call` | Answer an incoming call | `call_id` (required) |
| `simson.reject_call` | Reject an incoming call | `call_id` (required), `reason` (optional) |
| `simson.hangup_call` | End an active call | `call_id` (required) |
| `simson.transfer_call` | Transfer an active SIP/gateway bridge call to another node/user | `call_id`, `target_node_id`, optional `target_user_id`, `target_user_name` |
| `simson.run_trigger` | Run an admin-approved call automation preset | `trigger_id`, configured in the addon panel |

## Events

The addon fires these HA events for automations:

| Event | Description | Data |
|-------|-------------|------|
| `simson_incoming_call` | Incoming call received | `call_id`, `from_node_id`, `from_label`, `call_type` |
| `simson_call_status` | Call status changed | `call_id`, `status`, `reason`, `direction`, `remote_node_id` |
| `simson_call_event` | Normalized call lifecycle event for automations | `event`, `status`, `direction`, `call_type`, `remote_number`, `sip_extension`, `sip_bridge_id`, `node_id`, `target_user_id` |
| `simson_automation_triggered` | Configured call preset started | `trigger_id`, `target_id`, `source` |
| `simson_door_station_call` | Outdoor camera SIP bridge started | `trigger_id`, `source_extension`, `target_extension`, `call_id`, `status` |
| `simson_error` | VPS error received | `code`, `message`, `ref` |

## Lovelace Card

The integration serves and auto-loads the card after the integration is configured. In the card picker, search for **Simson** and choose **Simson Calls** / **Simson Relay Card**.

If the card picker still only shows **Manual**, the frontend has not loaded the card JS yet. Use this fallback:

1. Go to **Settings -> Dashboards -> Resources**.
2. Add this resource:

```
URL: /simson/www/simson-card.js?v=4.8.10
Type: JavaScript Module
```

3. Reload the dashboard. If an older manual resource exists, update it to the versioned URL above.
4. Add the card manually with:

```yaml
type: custom:simson-relay-card
title: Simson Calls
connection_entity: sensor.simson_mynode_connection
call_state_entity: sensor.simson_mynode_call_state
calls_count_entity: sensor.simson_mynode_calls_count
target_nodes:
  - node_id: living-room
    label: Living Room
  - node_id: kitchen
    label: Kitchen
  - node_id: office
    label: Office
```

Legacy aliases `custom:simson-call-card` and `custom:simson-card` are kept for existing dashboards, but new installs should use `custom:simson-relay-card`.

### Card does not appear

Check these in order:

1. **Downloaded is not enough**: add **Simson Call Relay** from **Settings -> Devices & Services -> Add Integration**.
2. Confirm the addon is running and reachable at the URL entered during setup.
3. Open `/simson/www/simson-card.js` in the HA browser. If it returns 404, the integration is not loaded.
4. Add `/simson/www/simson-card.js?v=4.8.10` as a Dashboard Resource and reload the dashboard.

## SIP Phone / Landline Routing

SIP desk phones and ATA-backed landline handsets are configured in the addon panel, not in the Lovelace card.

1. Open the Simson addon panel and copy the HAOS **Node ID** from Overview.
2. Go to **Settings -> SIP Phone Endpoints -> Add SIP Phone**.
3. Create an endpoint, for example extension `1025`, username `1025`, and a strong password.
4. Set **Route To Node ID** to the copied HAOS Node ID when calls to that phone should ring this HA instance.
5. Configure the SIP phone/ATA with the VPS hostname, port `5060`, TCP or UDP transport, endpoint username/password, and PCMU/PCMA codecs only.

The browser card audio bridge is automatic. Do not add manual SIP-over-WebSocket settings in the integration.

For GSM/PSTN callback from the card, use **Phone via Gateway**, enter a number like `+9192387324`, and keep the trunk field as `7009` for the current Synway GSM gateway.

## Call Transfer

During an active SIP/PSTN/GSM bridge call, the Lovelace card shows **Transfer Call**. Enter a target node ID, press **Users** to see active users on that node, then transfer either to the whole node or to one named user. The current browser leg is dismissed only after the new target answers, so the gateway/SIP audio bridge stays alive.

Targeted transfers and direct user calls include `target_user_id` / `target_user_name` in `simson_incoming_call`, so HA automations can route mobile notifications to the intended user even when their dashboard is not open.

Configured presets are the recommended way to place calls from automations. In the addon panel, create a routing target for the destination SIP phone or node, then add an **Automation & Webhook Calls** preset such as `doorbell_call`.

```yaml
action:
  - service: simson.run_trigger
    data:
      trigger_id: doorbell_call
```

## Automation Examples

### React to any call lifecycle event

Use `simson_call_event` when one automation should handle incoming, outgoing,
active, ended, failed, missed, forwarded, or fallback-routed calls.

```yaml
automation:
  - alias: "Simson — SIP call lifecycle"
    trigger:
      - platform: event
        event_type: simson_call_event
    condition:
      - condition: template
        value_template: "{{ trigger.event.data.event == 'incoming' }}"
      - condition: template
        value_template: "{{ trigger.event.data.call_type == 'sip' }}"
    action:
      - service: logbook.log
        data:
          name: Simson
          message: >
            Incoming SIP call from {{ trigger.event.data.remote_number }}
            on extension {{ trigger.event.data.sip_extension }}
            for node {{ trigger.event.data.node_id }}.
```

### Notify on incoming call

```yaml
automation:
  - alias: "Simson — Incoming call notification"
    trigger:
      - platform: event
        event_type: simson_incoming_call
    action:
      - service: notify.mobile_app
        data:
          title: "Incoming Call"
          message: "Call from {{ trigger.event.data.from_label }}"
          data:
            actions:
              - action: simson_answer
                title: "Answer"
              - action: simson_reject
                title: "Reject"
```

### Auto-answer intercom calls

```yaml
automation:
  - alias: "Simson — Auto-answer intercom"
    trigger:
      - platform: event
        event_type: simson_incoming_call
    condition:
      - condition: template
        value_template: "{{ trigger.event.data.call_type == 'intercom' }}"
    action:
      - service: simson.answer_call
        data:
          call_id: "{{ trigger.event.data.call_id }}"
```
