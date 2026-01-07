import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export type TelemetryRecord = {
  id?: number;
  sessionId: string;
  clientId: string;
  timestamp: number;
  drift: number;
  rtt?: number;
  offset?: number;
  eventType: 'sync' | 'playback_start' | 'playback_pause' | 'error';
  metadata?: string;
};

export type SessionRecord = {
  id?: number;
  sessionId: string;
  createdAt: number;
  endedAt?: number;
  hostClientId?: string;
  trackUri?: string;
  startTime?: number;
  participantCount?: number;
};

export class WaveSyncDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/wavesync.db') {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        ended_at INTEGER,
        host_client_id TEXT,
        track_uri TEXT,
        start_time INTEGER,
        participant_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

      CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        drift REAL NOT NULL,
        rtt REAL,
        offset REAL,
        event_type TEXT NOT NULL,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON telemetry(session_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
      CREATE INDEX IF NOT EXISTS idx_telemetry_client_id ON telemetry(client_id);
    `);
  }

  // Session operations
  insertSession(record: SessionRecord): number {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (session_id, created_at, ended_at, host_client_id, track_uri, start_time, participant_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      record.sessionId,
      record.createdAt,
      record.endedAt ?? null,
      record.hostClientId ?? null,
      record.trackUri ?? null,
      record.startTime ?? null,
      record.participantCount ?? 0
    );
    return result.lastInsertRowid as number;
  }

  updateSession(sessionId: string, updates: Partial<SessionRecord>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.endedAt !== undefined) {
      fields.push('ended_at = ?');
      values.push(updates.endedAt);
    }
    if (updates.hostClientId !== undefined) {
      fields.push('host_client_id = ?');
      values.push(updates.hostClientId);
    }
    if (updates.trackUri !== undefined) {
      fields.push('track_uri = ?');
      values.push(updates.trackUri);
    }
    if (updates.startTime !== undefined) {
      fields.push('start_time = ?');
      values.push(updates.startTime);
    }
    if (updates.participantCount !== undefined) {
      fields.push('participant_count = ?');
      values.push(updates.participantCount);
    }

    if (fields.length === 0) return;

    values.push(sessionId);
    const stmt = this.db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE session_id = ?`);
    stmt.run(...values);
  }

  getSession(sessionId: string): SessionRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      endedAt: row.ended_at ?? undefined,
      hostClientId: row.host_client_id ?? undefined,
      trackUri: row.track_uri ?? undefined,
      startTime: row.start_time ?? undefined,
      participantCount: row.participant_count ?? 0,
    };
  }

  getAllSessions(limit: number = 100): SessionRecord[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      endedAt: row.ended_at ?? undefined,
      hostClientId: row.host_client_id ?? undefined,
      trackUri: row.track_uri ?? undefined,
      startTime: row.start_time ?? undefined,
      participantCount: row.participant_count ?? 0,
    }));
  }

  // Telemetry operations
  insertTelemetry(record: TelemetryRecord): number {
    const stmt = this.db.prepare(`
      INSERT INTO telemetry (session_id, client_id, timestamp, drift, rtt, offset, event_type, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      record.sessionId,
      record.clientId,
      record.timestamp,
      record.drift,
      record.rtt ?? null,
      record.offset ?? null,
      record.eventType,
      record.metadata ?? null
    );
    return result.lastInsertRowid as number;
  }

  insertTelemetryBatch(records: TelemetryRecord[]) {
    const stmt = this.db.prepare(`
      INSERT INTO telemetry (session_id, client_id, timestamp, drift, rtt, offset, event_type, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((records: TelemetryRecord[]) => {
      for (const record of records) {
        stmt.run(
          record.sessionId,
          record.clientId,
          record.timestamp,
          record.drift,
          record.rtt ?? null,
          record.offset ?? null,
          record.eventType,
          record.metadata ?? null
        );
      }
    });

    transaction(records);
  }

  getTelemetry(sessionId: string, limit: number = 1000): TelemetryRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM telemetry 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const rows = stmt.all(sessionId, limit) as any[];
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      clientId: row.client_id,
      timestamp: row.timestamp,
      drift: row.drift,
      rtt: row.rtt ?? undefined,
      offset: row.offset ?? undefined,
      eventType: row.event_type as TelemetryRecord['eventType'],
      metadata: row.metadata ?? undefined,
    }));
  }

  getSessionStats(sessionId: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(drift) as avgDrift,
        MIN(drift) as minDrift,
        MAX(drift) as maxDrift,
        AVG(rtt) as avgRtt,
        COUNT(DISTINCT client_id) as deviceCount
      FROM telemetry
      WHERE session_id = ? AND event_type = 'sync'
    `);
    return stmt.get(sessionId) as {
      count: number;
      avgDrift: number;
      minDrift: number;
      maxDrift: number;
      avgRtt: number;
      deviceCount: number;
    };
  }

  getClientStats(sessionId: string, clientId: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(drift) as avgDrift,
        MIN(drift) as minDrift,
        MAX(drift) as maxDrift,
        AVG(rtt) as avgRtt
      FROM telemetry
      WHERE session_id = ? AND client_id = ? AND event_type = 'sync'
    `);
    return stmt.get(sessionId, clientId) as {
      count: number;
      avgDrift: number;
      minDrift: number;
      maxDrift: number;
      avgRtt: number;
    };
  }

  exportTelemetryCSV(sessionId: string): string {
    const records = this.getTelemetry(sessionId, 100000);
    const header = 'id,session_id,client_id,timestamp,drift,rtt,offset,event_type,metadata\n';
    const rows = records.map(r => 
      `${r.id},${r.sessionId},${r.clientId},${r.timestamp},${r.drift},${r.rtt ?? ''},${r.offset ?? ''},${r.eventType},${r.metadata ?? ''}`
    ).join('\n');
    return header + rows;
  }

  close() {
    this.db.close();
  }
}
