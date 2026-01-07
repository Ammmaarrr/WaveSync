import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors, { CorsOptions } from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'crypto';
import { WaveSyncDatabase } from './database.js';
import { createTelemetryRouter, createAnalyticsRouter } from './telemetry.js';
import { createSession, ensureSession, SessionId, ClientId } from './session-manager.js';
import { handleClockSync } from './time-sync.js';

export interface StartOptions {
  port?: number;
}

const ORIGIN_LIST = (process.env.ORIGIN || '*').split(',').map(s => s.trim());

export async function startServer(opts: StartOptions = {}): Promise<http.Server> {
  const PORT = Number(opts.port ?? process.env.PORT ?? 4000);
  
  // Initialize database
  const db = new WaveSyncDatabase(process.env.DB_PATH || './data/wavesync.db');
  console.log('[db] Database initialized');

  const app = express();
  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || ORIGIN_LIST.includes('*') || ORIGIN_LIST.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Health
  app.get('/health', async (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), now: Date.now() });
  });

  // Spotify PKCE token helpers
  const ensureSpotifyClientId = (): string | undefined => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    return clientId && clientId.trim().length > 0 ? clientId : undefined;
  };

  type SpotifyTokenResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
    [key: string]: unknown;
  };

  const forwardSpotifyToken = (
    res: Response,
    status: number,
    body: SpotifyTokenResponse,
  ): void => {
    if (status >= 200 && status < 300) {
      res.status(status).json({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_in: body.expires_in,
        scope: body.scope,
        token_type: body.token_type,
        received_at: Date.now(),
      });
      return;
    }
    res.status(status).json(body);
  };

  app.post('/spotify/exchange', async (req: Request, res: Response) => {
    try {
      const clientId = ensureSpotifyClientId();
      if (!clientId) {
        return res.status(500).json({ error: 'missing_spotify_client_id' });
      }

      const { code, codeVerifier, redirectUri } = req.body ?? {};
      if (typeof code !== 'string' || code.length === 0) {
        return res.status(400).json({ error: 'code required' });
      }
      if (typeof codeVerifier !== 'string' || codeVerifier.length === 0) {
        return res.status(400).json({ error: 'codeVerifier required' });
      }
      if (typeof redirectUri !== 'string' || redirectUri.length === 0) {
        return res.status(400).json({ error: 'redirectUri required' });
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      });

      const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const payload = (await tokenResp.json()) as SpotifyTokenResponse;
      forwardSpotifyToken(res, tokenResp.status, payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[spotify] exchange error', err);
      res.status(500).json({ error: 'spotify_exchange_failed' });
    }
  });

  app.post('/spotify/refresh', async (req: Request, res: Response) => {
    try {
      const clientId = ensureSpotifyClientId();
      if (!clientId) {
        return res.status(500).json({ error: 'missing_spotify_client_id' });
      }

      const { refreshToken } = req.body ?? {};
      if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        return res.status(400).json({ error: 'refreshToken required' });
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      });

      const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const payload = (await tokenResp.json()) as SpotifyTokenResponse;
      forwardSpotifyToken(res, tokenResp.status, payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[spotify] refresh error', err);
      res.status(500).json({ error: 'spotify_refresh_failed' });
    }
  });

  // Server time endpoint for client-side time sync bootstrapping
  app.get('/server-time', async (_req: Request, res: Response) => {
    res.json({ serverTime: Date.now() });
  });

  // Telemetry and Analytics APIs
  app.use('/telemetry', createTelemetryRouter(db));
  app.use('/analytics', createAnalyticsRouter(db));

  // Create a new session
  app.post('/session/create', async (_req: Request, res: Response) => {
    const s = createSession();
    // Store in database
    db.insertSession({
      sessionId: s.id,
      createdAt: s.createdAt,
      participantCount: 0,
    });
    res.json({ sessionId: s.id });
  });

  // Join an existing session
  app.post('/session/join', async (req: Request, res: Response) => {
    const { sessionId, clientId } = req.body ?? {};
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      return res.status(400).json({ error: 'sessionId required' });
    }
    if (typeof clientId !== 'string' || clientId.length === 0) {
      return res.status(400).json({ error: 'clientId required' });
    }
    const s = ensureSession(sessionId);
    if (!s) return res.status(404).json({ error: 'session not found' });

    const now = Date.now();
    const existing = s.clients.get(clientId);
    if (existing) {
      existing.lastSeen = now;
    } else {
      s.clients.set(clientId, { joinedAt: now, lastSeen: now });
    }
    // Log join
    // eslint-disable-next-line no-console
    console.log(`[session] join sessionId=${sessionId} clientId=${clientId}`);
    
    // Update database
    db.updateSession(sessionId, { participantCount: s.clients.size });
    
    return res.json({ ok: true, sessionId, clientId, clientCount: s.clients.size });
  });

  const server = http.createServer(app);

  // WS endpoint for realtime messages and clock sync
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track which socket is in which session and with which clientId
  const socketInfo = new WeakMap<WebSocket, { sessionId: SessionId; clientId: ClientId }>();

  wss.on('connection', (socket, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const sessionId = (url.searchParams.get('sessionId') || url.searchParams.get('session') || 'lobby') as SessionId;
      const clientId = (url.searchParams.get('clientId') || randomBytes(4).toString('hex')) as ClientId;

      let session = ensureSession(sessionId);
      if (!session) {
        // Allow implicit create on first connect for convenience
        session = createSession();
        // If sessionId provided but not found, remap to new id
        if (sessionId !== 'lobby') {
          // eslint-disable-next-line no-console
          console.warn(`[session] requested sessionId=${sessionId} not found; created ${session.id}`);
        }
      }

      // Associate socket to session/client
      session.clients.set(clientId, { socket, joinedAt: Date.now(), lastSeen: Date.now() });
      socketInfo.set(socket, { sessionId: session.id, clientId });
      // eslint-disable-next-line no-console
      console.log(`[ws] connected sessionId=${session.id} clientId=${clientId}`);

      // Welcome payload includes authoritative server time
      socket.send(JSON.stringify({ type: 'welcome', sessionId: session.id, clientId, serverTime: Date.now() }));

      socket.on('message', (raw) => {
        const serverRecv = Date.now();
        let msg: any;
        try { msg = JSON.parse(raw.toString()); } catch { msg = { type: 'raw', data: raw.toString() }; }

        if (msg && msg.type === 'ping') {
          handleClockSync(socket, msg, serverRecv);
          return;
        }

        if (msg && msg.type === 'command') {
          // Broadcast command to session
          const si = socketInfo.get(socket);
          if (si) {
            const s = ensureSession(si.sessionId);
            if (s) {
              const payload = JSON.stringify({ type: 'command', from: si.clientId, command: msg.command });
              for (const [cid, info] of s.clients.entries()) {
                if (cid === si.clientId) continue;
                if (info.socket && info.socket.readyState === WebSocket.OPEN) info.socket.send(payload);
              }
            }
          }
          return;
        }

        // Optional: forward other realtime messages to same session (except sender)
        const si = socketInfo.get(socket);
        if (si) {
          const s = ensureSession(si.sessionId);
          if (s) {
            const payload = JSON.stringify({ type: 'relay', from: si.clientId, data: msg });
            for (const [cid, info] of s.clients.entries()) {
              if (cid === si.clientId) continue;
              if (info.socket && info.socket.readyState === WebSocket.OPEN) info.socket.send(payload);
            }
          }
        }
      });

      socket.on('close', () => {
        const si = socketInfo.get(socket);
        if (!si) return;
        const s = ensureSession(si.sessionId);
        if (!s) return;
        const entry = s.clients.get(si.clientId);
        if (entry) entry.socket = undefined;
        // eslint-disable-next-line no-console
        console.log(`[ws] disconnected sessionId=${si.sessionId} clientId=${si.clientId}`);
      });

      socket.on('error', () => {
        const si = socketInfo.get(socket);
        if (!si) return;
        const s = ensureSession(si.sessionId);
        if (!s) return;
        const entry = s.clients.get(si.clientId);
        if (entry) entry.socket = undefined;
      });
    } catch {
      socket.close();
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT} (ws: /ws)`);
  return server;
}

// If not running in test, auto-start the server
if (process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  startServer();
}

/**
 * Client clock sync notes (NTP-like):
 * - Client sends: { type: 'ping', t1 } where t1 is client timestamp at send time.
 * - Server replies: { type: 'pong', t1, serverRecv: t2, serverTime: t3 }.
 * - Client receives at local time t4.
 *
 * Compute:
 *   RTT  = (t4 - t1) - (t3 - t2)          // round-trip minus server processing (usually small)
 *   offset ≈ ((t2 - t1) + (t3 - t4)) / 2   // estimated client->server clock offset
 *
 * Then serverTimeAtReceive ≈ t4 + offset.
 * Use serverTime to schedule synchronized playback across clients.
 */
