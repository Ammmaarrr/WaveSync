import { Router, Request, Response } from 'express';
import { WaveSyncDatabase, TelemetryRecord } from './database.js';

export function createTelemetryRouter(db: WaveSyncDatabase): Router {
  const router = Router();

  // POST /telemetry - Single telemetry record
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { sessionId, clientId, timestamp, drift, rtt, offset, eventType, metadata } = req.body;

      if (!sessionId || !clientId || timestamp === undefined || drift === undefined) {
        return res.status(400).json({ error: 'Missing required fields: sessionId, clientId, timestamp, drift' });
      }

      const record: TelemetryRecord = {
        sessionId,
        clientId,
        timestamp: Number(timestamp),
        drift: Number(drift),
        rtt: rtt !== undefined ? Number(rtt) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
        eventType: eventType || 'sync',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      const id = db.insertTelemetry(record);
      res.json({ ok: true, id });
    } catch (err: any) {
      console.error('[telemetry] insert error', err);
      res.status(500).json({ error: 'Failed to insert telemetry', message: err.message });
    }
  });

  // POST /telemetry/batch - Batch insert
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'records must be a non-empty array' });
      }

      const telemetryRecords: TelemetryRecord[] = records.map((r: any) => ({
        sessionId: r.sessionId,
        clientId: r.clientId,
        timestamp: Number(r.timestamp),
        drift: Number(r.drift),
        rtt: r.rtt !== undefined ? Number(r.rtt) : undefined,
        offset: r.offset !== undefined ? Number(r.offset) : undefined,
        eventType: r.eventType || 'sync',
        metadata: r.metadata ? JSON.stringify(r.metadata) : undefined,
      }));

      db.insertTelemetryBatch(telemetryRecords);
      res.json({ ok: true, count: telemetryRecords.length });
    } catch (err: any) {
      console.error('[telemetry] batch insert error', err);
      res.status(500).json({ error: 'Failed to insert batch', message: err.message });
    }
  });

  // GET /telemetry/:sessionId - Get telemetry for session
  router.get('/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const limit = Number(req.query.limit) || 1000;

      const records = db.getTelemetry(sessionId, limit);
      res.json({ sessionId, count: records.length, records });
    } catch (err: any) {
      console.error('[telemetry] get error', err);
      res.status(500).json({ error: 'Failed to retrieve telemetry', message: err.message });
    }
  });

  // GET /telemetry/:sessionId/stats - Get session statistics
  router.get('/:sessionId/stats', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const stats = db.getSessionStats(sessionId);
      res.json({ sessionId, stats });
    } catch (err: any) {
      console.error('[telemetry] stats error', err);
      res.status(500).json({ error: 'Failed to retrieve stats', message: err.message });
    }
  });

  // GET /telemetry/:sessionId/client/:clientId - Get client-specific stats
  router.get('/:sessionId/client/:clientId', async (req: Request, res: Response) => {
    try {
      const { sessionId, clientId } = req.params;
      const stats = db.getClientStats(sessionId, clientId);
      res.json({ sessionId, clientId, stats });
    } catch (err: any) {
      console.error('[telemetry] client stats error', err);
      res.status(500).json({ error: 'Failed to retrieve client stats', message: err.message });
    }
  });

  // GET /telemetry/:sessionId/export - Export as CSV
  router.get('/:sessionId/export', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const csv = db.exportTelemetryCSV(sessionId);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="telemetry-${sessionId}.csv"`);
      res.send(csv);
    } catch (err: any) {
      console.error('[telemetry] export error', err);
      res.status(500).json({ error: 'Failed to export telemetry', message: err.message });
    }
  });

  return router;
}

// Analytics router for dashboard
export function createAnalyticsRouter(db: WaveSyncDatabase): Router {
  const router = Router();

  // GET /analytics/sessions - List all sessions
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const sessions = db.getAllSessions(limit);
      res.json({ count: sessions.length, sessions });
    } catch (err: any) {
      console.error('[analytics] sessions error', err);
      res.status(500).json({ error: 'Failed to retrieve sessions', message: err.message });
    }
  });

  // GET /analytics/session/:sessionId - Get session details with stats
  router.get('/session/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = db.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const stats = db.getSessionStats(sessionId);
      res.json({ session, stats });
    } catch (err: any) {
      console.error('[analytics] session detail error', err);
      res.status(500).json({ error: 'Failed to retrieve session', message: err.message });
    }
  });

  return router;
}
