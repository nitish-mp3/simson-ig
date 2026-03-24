# Simson Call Relay — Home Assistant Integration

Custom integration that pairs with the **Simson addon** to expose call state sensors and call control services inside Home Assistant.

## Installation

1. Copy the `custom_components/simson/` folder into your HA `config/custom_components/` directory.
2. Copy `www/simson-call-card.js` into `config/www/`.
3. Restart Home Assistant.
4. Go to **Settings → Devices & Services → Add Integration → Simson Call Relay**.
5. Enter the addon API URL (default: `http://localhost:8099`).

## Entities

| Entity | Type | Description |
|--------|------|-------------|
| `sensor.simson_<node>_connection` | Sensor | VPS connection status (`connected` / `disconnected`) |
| `sensor.simson_<node>_call_state` | Sensor | Current call state (`idle`, `ringing`, `incoming`, `active`) |
| `sensor.simson_<node>_calls_count` | Sensor | Total tracked calls count |

## Services

| Service | Description | Parameters |
|---------|-------------|------------|
| `simson.make_call` | Initiate a call | `target_node_id` (required), `call_type` (optional, default: `voice`) |
| `simson.answer_call` | Answer an incoming call | `call_id` (required) |
| `simson.reject_call` | Reject an incoming call | `call_id` (required), `reason` (optional) |
| `simson.hangup_call` | End an active call | `call_id` (required) |

## Events

The addon fires these HA events for automations:

| Event | Description | Data |
|-------|-------------|------|
| `simson_incoming_call` | Incoming call received | `call_id`, `from_node_id`, `from_label`, `call_type` |
| `simson_call_status` | Call status changed | `call_id`, `status`, `reason`, `direction`, `remote_node_id` |
| `simson_error` | VPS error received | `code`, `message`, `ref` |

## Lovelace Card

Add the card resource in **Settings → Dashboards → Resources**:

```
URL: /local/simson-call-card.js
Type: JavaScript Module
```

Then add the card to a dashboard:

```yaml
type: custom:simson-call-card
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

## Automation Examples

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
