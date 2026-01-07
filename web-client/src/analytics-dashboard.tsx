import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './analytics.css';

type Session = {
  id?: number;
  sessionId: string;
  createdAt: number;
  endedAt?: number;
  hostClientId?: string;
  trackUri?: string;
  startTime?: number;
  participantCount?: number;
};

type SessionStats = {
  count: number;
  avgDrift: number;
  minDrift: number;
  maxDrift: number;
  avgRtt: number;
  deviceCount: number;
};

type TelemetryRecord = {
  id?: number;
  sessionId: string;
  clientId: string;
  timestamp: number;
  drift: number;
  rtt?: number;
  offset?: number;
  eventType: string;
};

function AnalyticsDashboard() {
  const [httpBase, setHttpBase] = useState('http://localhost:4000');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{ session: Session; stats: SessionStats } | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${httpBase}/analytics/sessions`);
      const data = await resp.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetail = async (sessionId: string) => {
    setLoading(true);
    try {
      const [detailResp, telemetryResp] = await Promise.all([
        fetch(`${httpBase}/analytics/session/${sessionId}`),
        fetch(`${httpBase}/telemetry/${sessionId}?limit=5000`)
      ]);
      
      const detail = await detailResp.json();
      const telemetryData = await telemetryResp.json();
      
      setSessionDetail(detail);
      setTelemetry(telemetryData.records || []);
      setSelectedSession(sessionId);
    } catch (e) {
      console.error('Failed to load session detail', e);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    if (!selectedSession) return;
    try {
      const resp = await fetch(`${httpBase}/telemetry/${selectedSession}/export`);
      const csv = await resp.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry-${selectedSession}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  // Prepare chart data
  const driftOverTime = telemetry
    .filter(t => t.eventType === 'sync')
    .map(t => ({
      time: new Date(t.timestamp).toLocaleTimeString(),
      drift: t.drift,
      clientId: t.clientId,
    }));

  const deviceDriftStats = React.useMemo(() => {
    const byDevice = new Map<string, number[]>();
    telemetry
      .filter(t => t.eventType === 'sync')
      .forEach(t => {
        if (!byDevice.has(t.clientId)) byDevice.set(t.clientId, []);
        byDevice.get(t.clientId)!.push(t.drift);
      });

    return Array.from(byDevice.entries()).map(([clientId, drifts]) => ({
      clientId,
      avgDrift: drifts.reduce((a, b) => a + b, 0) / drifts.length,
      maxDrift: Math.max(...drifts),
      minDrift: Math.min(...drifts),
      count: drifts.length,
    }));
  }, [telemetry]);

  return (
    <div className="dashboard">
      <header>
        <h1>📊 WaveSync Analytics Dashboard</h1>
        <div className="config">
          <label>
            Server:
            <input
              type="text"
              value={httpBase}
              onChange={(e) => setHttpBase(e.target.value)}
              placeholder="http://localhost:4000"
            />
          </label>
          <button onClick={loadSessions} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Sessions'}
          </button>
        </div>
      </header>

      <div className="content">
        <aside className="sessions-list">
          <h2>Sessions ({sessions.length})</h2>
          <div className="session-items">
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                className={`session-item ${selectedSession === s.sessionId ? 'selected' : ''}`}
                onClick={() => loadSessionDetail(s.sessionId)}
              >
                <div className="session-id">{s.sessionId.slice(0, 8)}</div>
                <div className="session-meta">
                  {new Date(s.createdAt).toLocaleString()}
                </div>
                <div className="session-meta">
                  {s.participantCount || 0} devices
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="session-detail">
          {!selectedSession && (
            <div className="placeholder">
              <p>Select a session from the left to view analytics</p>
            </div>
          )}

          {selectedSession && sessionDetail && (
            <>
              <div className="session-header">
                <h2>Session: {selectedSession}</h2>
                <button onClick={exportCSV}>Export CSV</button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Avg Drift</h3>
                  <div className="stat-value">
                    {sessionDetail.stats.avgDrift.toFixed(2)} ms
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Max Drift</h3>
                  <div className="stat-value">
                    {sessionDetail.stats.maxDrift.toFixed(2)} ms
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Min Drift</h3>
                  <div className="stat-value">
                    {sessionDetail.stats.minDrift.toFixed(2)} ms
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Devices</h3>
                  <div className="stat-value">{sessionDetail.stats.deviceCount}</div>
                </div>
                <div className="stat-card">
                  <h3>Avg RTT</h3>
                  <div className="stat-value">
                    {sessionDetail.stats.avgRtt?.toFixed(2) || 'N/A'} ms
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Data Points</h3>
                  <div className="stat-value">{telemetry.length}</div>
                </div>
              </div>

              <div className="chart-section">
                <h3>Drift Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={driftOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: 'Drift (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="drift" stroke="#8884d8" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-section">
                <h3>Per-Device Statistics</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deviceDriftStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="clientId" />
                    <YAxis label={{ value: 'Drift (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgDrift" fill="#8884d8" name="Avg Drift" />
                    <Bar dataKey="maxDrift" fill="#82ca9d" name="Max Drift" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="device-table">
                <h3>Device Details</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Client ID</th>
                      <th>Avg Drift (ms)</th>
                      <th>Max Drift (ms)</th>
                      <th>Min Drift (ms)</th>
                      <th>Data Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceDriftStats.map((d) => (
                      <tr key={d.clientId}>
                        <td>{d.clientId}</td>
                        <td>{d.avgDrift.toFixed(2)}</td>
                        <td>{d.maxDrift.toFixed(2)}</td>
                        <td>{d.minDrift.toFixed(2)}</td>
                        <td>{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<AnalyticsDashboard />);
}
