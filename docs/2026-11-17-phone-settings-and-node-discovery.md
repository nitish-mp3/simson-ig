# Phone settings and automatic node discovery

Release target: integration 3.9.4 and card 5.9.5.

## Confirmed live findings

Read-only inspection on 17 November found HA 2026.11.2, card 5.9.4,
the Simson entry loaded, eight contact/button entities and named Companion
notification services. A retired connection sensor was unavailable and appeared
before the current connected node sensor. All three call-dashboard cards used
automatic selection. The old implementation selected the first matching sensor,
which accounts for the observed false Offline display. The current node's call
state entity also uses a renamed entity ID.

## Changes

- Automatic selection prefers a connected connection sensor, then a disconnected
  one, then an unavailable one. Explicit node selections remain scoped.
- Connection, call-state and call-count sensors expose stable roles and node IDs
  so entity renames do not break lookup. A renamed connection sensor is never
  mistaken for its own sibling call-state sensor.
- Unavailable sensor states are distinguished from confirmed disconnection.
- Settings → Devices & services → Simson → Configure now offers People and phone
  mappings, alongside Add-on connection. An administrator selects a contact and
  Companion phone, restores Automatic, disables notifications, or sends a test.
- This editor calls the same persisted mapping services as other controls.
  Scripts and native Call buttons continue selecting only the user entity.
  Dashboard/card changes do not change or remove the saved mapping.
- The existing add-on API address is preserved when editing phone mappings.
- Card headers link to Simson settings. No particular dashboard is required.

No live mapping, dashboard, gateway, VPS configuration or service was changed.
Validation: all 126 integration tests passed. All 89 frontend tests passed with
`node --test --test-concurrency=1 tests/*.test.mjs`; the parallel run stalled in
an existing camera test, which also passed separately. Both distribution
manifests match and all referenced runtime assets are present.
The update requires installing the integration files and restarting HA to load
the Python options flow and sensor attributes, then refreshing the browser.
After installation, select the intended recipient's Companion phone in settings;
do not infer an assignment from a device name alone. A real phone notification
and operator-controlled call remain necessary to verify delivery and audio.
