# Room media repair 3.9.1 / card 5.9.1

The living-room profile's 90-second setup deadline was also terminating active
native SIP calls when the browser failed to acknowledge bidirectional media.
Active native calls now remain degraded, not falsely ready or automatically
terminated by that deadline. Ringing timeouts, explicit hangup, missing-call
reconciliation and the configured maximum duration still apply.

SIP audio attachment now accumulates audio tracks independently of video-only
track events. A video-only event cannot replace the audio playback source.
Caregiver room-media startup tolerates delayed answer/state synchronization for
up to 15 seconds instead of abandoning setup after approximately 1.5 seconds.
Ended camera tracks trigger reconnect while the exact call remains owned.

TV output remains video-only in the current Cast adapter. Routing caregiver
sound to TV while retaining SIP microphone capture requires a separate audio
output/echo-control implementation and handset support for independent speaker
suppression. This release does not claim that support or open a second audio
path automatically. TV speakers are output devices, not microphones.

Verification: 114 standalone integration tests and 77 frontend tests passed.
No call was placed by the agent. Actual 1040 microphone RTP and recipient audio
playback still require verification during a user-initiated call; code changes
and SIP answer are not proof of audible two-way media.

Installed files have a rollback archive under
`/homeassistant/simson_backups/before-room-media-3.9.1-115233.zip`.
