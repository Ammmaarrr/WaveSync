# Privacy & Policy Checklist + Store Listing Notes

## Privacy checklist (short)

- Spotify Premium required for full playback control and synchronization.
- We do not store or transmit audio media to our servers. Playback occurs on the device using Spotify.
- Spotify access tokens are stored securely on the device (platform secure storage) and are never logged to the server.
- Minimal telemetry may be sent to the sync server (e.g., session ID, timestamps, anonymized device label, drift/latency metrics) to improve synchronization. No precise location, contacts, or audio recordings are collected.
- If a display name is entered, it’s only used for session identification and not shared outside the session.
- All network traffic uses HTTPS/WSS where available.
- Uninstalling the app removes local data. We do not keep user-identifiable data on our servers.
- The app uses Spotify APIs subject to Spotify’s Developer Terms. Spotify is a registered trademark of Spotify AB.
- Intended for users 13+; not directed to children.

## In‑app privacy text (copy/paste)

We use Spotify’s APIs to control playback on your device. Spotify Premium is required for full control. We do not store or transmit audio to our servers. Your Spotify tokens are stored securely on your device and are never logged. We may collect minimal, non‑identifying telemetry (e.g., timing and drift metrics) to improve sync quality. You can revoke Spotify access at any time from your Spotify account settings.

---

## App Store Connect – Review Notes

- This app integrates Spotify’s iOS SDK/Web API for device playback control; no audio is downloaded by the app. Spotify Premium required for full control.
- Sign‑in: The reviewer may sign in with a Spotify Premium account. If a test account is required, we will provide credentials in the App Review notes.
- Permissions rationale:
  - Bluetooth/audio route awareness: used to detect output route (e.g., speaker vs. Bluetooth) to inform the user and improve sync; no Bluetooth device data is stored.
  - Network: required to join a sync session and communicate timing data.
- Data types collected (App Privacy):
  - Diagnostics/Performance: anonymized timing and drift metrics, session IDs (not linked to identity; not used for tracking).
  - No precise location, contacts, photos, microphone recordings, or health data.
- Third‑party services: Spotify APIs (see <https://developer.spotify.com/terms/>).
- Trademark: “Spotify” is a trademark of Spotify AB.

### App Store short description (suggested)

Sync Spotify playback across devices with sub‑second precision. Requires Spotify Premium.

### App Store privacy policy URL (suggested content)

Link this repository’s Privacy Policy (or host a copy) reflecting the points above.

---

## Google Play – Store Listing Notes

- This app controls playback via Spotify; it does not host or stream audio. Spotify Premium required for full control.
- Permissions:
  - Bluetooth/audio route awareness (optional) to detect output route for better sync; no data is stored.
  - Internet for session coordination and timing sync.
- Data safety (summary):
  - Collected: session timing/drift metrics, session IDs (Diagnostics). Purpose: app functionality and performance.
  - Not collected: precise location, contacts, photos, audio recordings.
  - Data handling: not shared with third parties; not sold; retained only in aggregate or ephemeral form for diagnostics.
- Third‑party SDK: Spotify APIs (Developer Terms apply).

### Google Play short description (suggested)

Synchronize Spotify playback across devices. Requires Spotify Premium.

---

## Reviewer test steps (both stores)

1) Launch app and sign in to Spotify (Premium account).
2) Create or join a session; choose a track and start synchronized playback.
3) Optionally switch audio route (e.g., speaker vs. Bluetooth) to observe the in‑app prompt.
4) Verify no audio is uploaded; playback remains local on device.
