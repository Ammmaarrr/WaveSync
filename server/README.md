# WaveSync Server

TypeScript/Node server that provides REST endpoints for session management and a WebSocket endpoint for clock sync and realtime relay.

## Environment variables

- `PORT` (number, default: `4000`)
  - HTTP port to listen on.
- `ORIGIN` (string, default: `*`)
  - Comma‑separated list of allowed CORS origins (e.g., `https://app.example.com, http://localhost:5173`). `*` allows all.
- `SPOTIFY_CLIENT_ID` (string, required for Spotify token exchange)
  - Spotify app client ID used for OAuth PKCE token exchange.
- `SPOTIFY_REDIRECT_URI_WEB` (string, optional)
  - Suggested redirect URI for web flows. Used only as documentation; clients must send their actual redirectUri in requests.

## REST endpoints

- `GET /health` — basic health and uptime.
- `GET /server-time` — returns `{ serverTime }` for bootstrapping clock sync.
- `POST /session/create` — returns `{ sessionId }` creating a new session.
- `POST /session/join` — body `{ sessionId, clientId }`, joins or updates presence in a session.
- `POST /spotify/exchange` — body `{ code, codeVerifier, redirectUri }`; exchanges an auth code for Spotify tokens (PKCE).
- `POST /spotify/refresh` — body `{ refreshToken }`; refreshes Spotify access tokens.

## WebSocket endpoint

- Path: `/ws`
- Query params: `?sessionId=<id>&clientId=<client>`
- Messages:
  - Clock sync: client sends `{ type: "ping", t1 }`; server replies `{ type: "pong", t1, serverRecv, serverTime }`.
  - Relay: any other message is broadcast to other clients in the same session as `{ type: "relay", from, data }`.

## Local development

1. Install deps
   
   ```powershell
   npm install
   ```

2. Run in dev (auto‑reload)
   
   ```powershell
   npm run dev
   ```

3. Build and start
   
   ```powershell
   npm run build
   npm start
   ```

Optionally create a `.env` file:

```properties
PORT=4000
ORIGIN=http://localhost:5173
SPOTIFY_CLIENT_ID=your_spotify_app_client_id
SPOTIFY_REDIRECT_URI_WEB=http://localhost:5173/callback
```

## Docker

Build the image (from the `server/` directory):

```powershell
docker build -t wavesync-server .
```

Run the container:

```powershell
docker run --rm -p 4000:4000 -e PORT=4000 -e ORIGIN="http://localhost:5173" wavesync-server
```

- The server listens on port 4000 inside the container (exposed in the Dockerfile). Map as needed with `-p <hostPort>:4000`.
- Provide `ORIGIN` to restrict CORS in production.

## Notes

- All state is in‑memory; sessions are ephemeral. Persisting telemetry or sessions would require extending the server.
- Requires Node.js 18+ if running outside Docker.
