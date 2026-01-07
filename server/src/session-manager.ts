import { WebSocket } from 'ws';
import { randomBytes } from 'crypto';

export type ClientId = string;
export type SessionId = string;

export type Session = {
  id: SessionId;
  createdAt: number;
  clients: Map<ClientId, { socket?: WebSocket; joinedAt: number; lastSeen: number }>; // in-memory only
};

const sessions = new Map<SessionId, Session>();

export function createSession(): Session {
  const id = randomBytes(8).toString('hex');
  const s: Session = { id, createdAt: Date.now(), clients: new Map() };
  sessions.set(id, s);
  return s;
}

export function ensureSession(id: SessionId): Session | undefined {
  return sessions.get(id);
}

export function getSession(id: SessionId): Session | undefined {
    return sessions.get(id);
}
