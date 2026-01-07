import { randomBytes } from 'crypto';
const sessions = new Map();
export function createSession() {
    const id = randomBytes(8).toString('hex');
    const s = { id, createdAt: Date.now(), clients: new Map() };
    sessions.set(id, s);
    return s;
}
export function ensureSession(id) {
    return sessions.get(id);
}
export function getSession(id) {
    return sessions.get(id);
}
