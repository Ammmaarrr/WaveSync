# WaveSync Web Client (Spotify Web Playback SDK)

A minimal browser client that:
- Connects to your WaveSync server via WebSocket.
- Runs the same 10x ping/pong clock sync to estimate offset and RTT.
- Initializes Spotify Web Playback SDK with a provided OAuth token.
- Transfers playback to the web player device.
- Schedules a Spotify track to start at a server-provided start_time.
- Sends basic telemetry (drift, timestamp) every 3 seconds.

## Requirements
- Spotify Premium account.
- Spotify app is NOT required on desktop for Web SDK, but you need an OAuth token with scopes:
  - `streaming`, `user-read-playback-state`, `user-modify-playback-state`.
- HTTPS origin is required by Spotify except for `http://localhost` during development.

## Quick start

1. Get an OAuth token (temporary) with the scopes above (e.g. from your backend or Spotify console for testing).
2. Install deps and start the dev server:

```powershell
cd web-client
npm install
npm run dev
```

3. Open the shown URL (typically `http://localhost:5173`).
4. Enter your WaveSync server HTTP/WS base, a sessionId, and the OAuth token.
5. Click:
   - "Connect WS"
   - "Clock Sync (10x)"
   - "Init Spotify Player"
   - "Transfer Playback"
   - Enter a `spotify:track:...` URI and optional `seek (ms)`
   - "Start in 3s (Host)"

## Notes and limitations
- Web SDK has higher and more variable latency than native. Recommend `buffer_ms >= 3000` between when you announce `start_time` and when clients call `play`.
- Preloading on the Web is limited; this sample starts playback at the scheduled time using Web API `PUT /v1/me/player/play` to the web player `device_id`.
- Ensure your token is valid and not expired. For production, implement a secure token service.
- CORS: All Spotify Web API calls must be from secure origins. Local dev (`http://localhost`) is allowed.
