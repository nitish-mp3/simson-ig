# Simson card frontend

Edit `src/`, not `www/`. The root `www/simson-call-card.js` and integration-served
`custom_components/simson/www/simson-card.js` are generated distribution loaders.

## Structure

- `entry.js`: immediately registers all three supported custom-card names. No HA
  connection, addon API, SIP library, or device permissions are needed to register.
- `card.js`: Lit lifecycle, selective HA updates, and the main card composition.
- `card-base.js`: configuration compatibility and initial session state.
- `views/`: dial, active call, history, devices, and recipient dialog templates.
- `controllers/`: HA events, actions, call state, media devices, WebRTC, SIP bridge,
  and notifications. They compose the card without replacing the DOM on updates.
- `transport/`: lazy-loaded SIP client and ICE defaults.
- `styles/`: scoped card design tokens, layout, and responsive styles.
- `editor.js`: separately loaded dashboard configuration editor.

## Build and test

Use Node 22 or newer:

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

On Windows tests use installed Chrome; set `CHROME_PATH` to override its location.
Tests use mocked Home Assistant services and local browser media. They do not place
telephone calls or contact the VPS. The browser suite includes actual local
WebRTC negotiation with fake camera and microphone devices.

The build emits hashed runtime chunks, copies identical assets into both release
directories, and produces `bundle-report.json` with raw and gzip byte counts.
The registration bundle has a hard 12 KB budget. Lit is bundled locally; no CDN
or runtime package download is involved. Ship the entire `www` directory including
`chunks/`. Copying only the loader file is insufficient.

## Release

Update `src/version.js`, integration `frontend.py`, and `manifest.json` together.
Run the build and checks, then include generated assets in the release commit.
The integration migrates its known legacy resource URLs and removes duplicate
Simson resource entries, while preserving other cards. YAML-managed dashboards
must use `/simson/www/simson-card.js?v=5.0.0` as a JavaScript module resource.

The call protocol and gateway routes retain their existing API contract. The
addon Media Studio preview and the dashboard card store separate browser device
preferences; choose call devices in the card's Devices tab.
