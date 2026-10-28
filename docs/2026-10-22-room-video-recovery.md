# Card 5.9.2 video recovery

User acceptance confirmed two-way SIP audio and call duration after 3.9.1, but
camera video remained absent and the view froze after app background/foreground.

The camera transport previously treated a negotiated track as success and
cleared its timeout before any video was decoded. The room controller now
checks decoded-video readiness and switches to authenticated HA HLS after
20 seconds without frames. SIP audio is not restarted. Camera and display
publisher connections are reopened on foreground; the session also reattaches
media elements and retries a previously missing authorized room context.
Only the existing answering user's exact call can recover media.

Verification: 79 frontend tests passed, including missing-frame fallback and
foreground recovery without replacing SIP audio. Live HA is RUNNING and serves
5.9.2. Actual camera HLS preflight decoded 22 frames at width 3840 and forwarded
decoded video at width 1280; one nonfatal HLS gap recovery was observed.
No test call was placed. Actual mobile resumption and camera receipt on pika's
phone still require user acceptance; browser background execution is not guaranteed.

Frontend-only deployment rollback:
`/homeassistant/simson_backups/before-room-video-5.9.2-121450.zip`.
