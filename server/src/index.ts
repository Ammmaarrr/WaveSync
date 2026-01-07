import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors, { CorsOptions } from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_ORIGIN = (process.env.ORIGIN || '*').split(',').map(s => s.trim());

const app = express();
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGIN.includes('*') || ALLOWED_ORIGIN.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
};
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);

// Simple room-based broadcast hub
type ClientInfo = { room: string };
const rooms = new Map<string, Set<WebSocket>>();

function joinRoom(sock: WebSocket, room: string) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(sock);
}

function leaveRoom(sock: WebSocket) {
  for (const set of rooms.values()) set.delete(sock);
}

function broadcast(room: string, data: any, except?: WebSocket) {
  const set = rooms.get(room);
  if (!set) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of set) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const room = url.searchParams.get('room') || process.env.DEFAULT_ROOM || 'lobby';
    (socket as any)._info = { room } as ClientInfo;
    joinRoom(socket, room);

    socket.send(JSON.stringify({ type: 'welcome', room }));

    socket.on('message', (raw) => {
      let msg: any = raw.toString();
      try { msg = JSON.parse(msg); } catch { /* leave as string */ }
      // Expect messages like { type: 'play'|'pause'|'seek'|'sync', ... }
      broadcast(room, { type: 'relay', data: msg }, socket);
    });

    socket.on('close', () => {
      leaveRoom(socket);
    });

    socket.on('error', () => {
      leaveRoom(socket);
    });
  } catch (e) {
    socket.close();
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`WaveSync server listening on http://localhost:${PORT} (ws path: /ws)`);
});
