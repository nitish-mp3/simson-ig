# Dashboard panels

The original `custom:simson-relay-card` remains an all-in-one workspace.
For independently arranged panels, add these cards to your dashboard:

```yaml
type: custom:simson-dial-card
node_id: your_node_id
```

```yaml
type: custom:simson-live-call-card
node_id: your_node_id
```

```yaml
type: custom:simson-history-card
node_id: your_node_id
```

Optional: `custom:simson-devices-card` for camera and microphone settings.
The visual editor also offers a Panel selector. Existing aliases support
`view: combined`, `dial`, `live`, `history`, or `devices`.

Use the same node ID across panels. Within one browser document and HA
connection, panels share subscriptions, call state, microphone and playback.
Removing one panel does not interrupt the others; removing every panel releases
the local session. Separate browser tabs still have independent sessions.

These UI changes do not alter gateway routing or PBX settings. Install the
updated integration and addon to use the new assets; refresh dashboard resources
after upgrading. Keep the entire generated chunks directory with the entry file.
