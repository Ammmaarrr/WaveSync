/*
 Headless Node (TypeScript) client simulator for WaveSync.

 Features:
 - Spawns N simulated clients in-process (--clients=N)
 - Connects to ws://<host>/ws and performs clock sync (10 pings by default)
 - Optionally joins via REST POST /session/join (Node 18+ fetch)
 - Listens for { type: 'start', start_time } or { startTime }
 - Schedules a console.log at local adjusted time = start_server_time - offset
 - Outputs CSV rows of scheduled and actual timestamps and computed offsets

 Run (no install needed):
   npx -y --package=tsx --package=ws tsx client/simulator.ts --clients=5 --ws=ws://localhost:4000 --http=http://localhost:4000 --session=lobby
*/

import WebSocket from 'ws';

// -------- Types --------
interface Sample { t1: number; t2: number; serverRecv: number; serverTime: number; }
interface Derived { rtt: number; offset: number; }
interface ClientResult {
  clientId: string;
  offsetMs: number;
  rttMs: number;
  errorMs: number;
  startServerTime?: number;
  startLocalTarget?: number;
  startActualTs?: number;
  deltaFromTargetMs?: number;
}

// -------- Utilities --------
function median(arr: number[]): number {
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function computeOffsetSet(samples: Sample[]) {
  const derived: Derived[] = samples.map((s) => ({
    rtt: s.t2 - s.t1,
    offset: s.serverTime - ((s.t1 + s.t2) / 2),
  }));
  const byRtt = [...derived].sort((a, b) => a.rtt - b.rtt);
  let trimmed = byRtt;
  if (byRtt.length >= 7) {
    const k = Math.min(2, Math.floor(byRtt.length / 4));
    trimmed = byRtt.slice(k, byRtt.length - k);
  }
  const offsets = trimmed.map(d => d.offset);
  const rtts = trimmed.map(d => d.rtt);
  const offsetMed = median(offsets);
  const rttMed = median(rtts);
  const absDevs = offsets.map(v => Math.abs(v - offsetMed));
  const mad = median(absDevs);
  const errorMs = 1.4826 * mad;
  return { offsetMed, rttMed, errorMs, used: trimmed.length, trimmed: byRtt.length - trimmed.length };
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function parseArg(name: string, def?: string): string | undefined {
  const p = `--${name}=`;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(p)) return a.slice(p.length);
    if (a === `--${name}`) return 'true';
  }
  return def;
}

// -------- Simulated Client --------
class SimClient {
  private ws?: WebSocket;
  private samples: Sample[] = [];
  private offsetMed = 0;
  private rttMed = 0;
  private errorMs = 0;
  private startPromiseResolve?: () => void;
  public readonly started: Promise<void>;

  constructor(
    public readonly id: string,
    private wsBase: string,
    private sessionId: string,
    private httpBase: string | undefined,
    private jitterMaxMs: number,
  ) {
    this.started = new Promise<void>((res) => (this.startPromiseResolve = res));
  }

  private randJitter(): number {
    return this.jitterMaxMs > 0 ? Math.floor(Math.random() * (this.jitterMaxMs + 1)) : 0;
  }

  async joinSession(): Promise<void> {
    if (!this.httpBase) return; // optional
    try {
      const resp = await fetch(`${this.httpBase}/session/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, clientId: this.id })
      });
      if (!resp.ok) {
        console.warn(`[${this.id}] join failed: ${resp.status}`);
      }
    } catch (e) {
      console.warn(`[${this.id}] join error:`, e);
    }
  }

  async connect(): Promise<void> {
    const url = `${this.wsBase}/ws?sessionId=${encodeURIComponent(this.sessionId)}&clientId=${encodeURIComponent(this.id)}`;
    this.ws = new WebSocket(url);

    await new Promise<void>((resolve, reject) => {
      this.ws!.once('open', () => resolve());
      this.ws!.once('error', (e) => reject(e));
    });

  console.log(`[${this.id}] connected (jitter 0-${this.jitterMaxMs}ms)`);
  this.ws.on('message', (data) => setTimeout(() => this.onMessage(data), this.randJitter()));
  this.ws.on('close', () => console.log(`[${this.id}] ws closed`));
  }

  private onMessage(data: WebSocket.RawData) {
    const t2 = Date.now();
    let msg: any;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'pong') {
      const t1 = Number(msg.t1) || 0;
      const serverRecv = Number(msg.serverRecv) || 0;
      const serverTime = Number(msg.serverTime) || 0;
      this.samples.push({ t1, t2, serverRecv, serverTime });
    } else if (msg.type === 'relay' && msg.data) {
      // Accept both startTime and start_time
      const data = msg.data;
      if (data.type === 'start') {
        const st = Number(data.startTime ?? data.start_time);
        if (Number.isFinite(st)) this.scheduleStart(st);
      }
    } else if (msg.type === 'start') {
      const st = Number(msg.startTime ?? msg.start_time);
      if (Number.isFinite(st)) this.scheduleStart(st);
    }
  }

  async syncClock(pings = 10, intervalMs = 100): Promise<void> {
    if (!this.ws) throw new Error('ws not connected');
    for (let i = 0; i < pings; i++) {
  // Add outbound jitter before sending ping
  await sleep(this.randJitter());
  const t1 = Date.now();
  this.ws.send(JSON.stringify({ type: 'ping', t1 }));
  await sleep(intervalMs);
    }
    await sleep(200);
    if (this.samples.length === 0) throw new Error(`[${this.id}] no pong samples`);
    const { offsetMed, rttMed, errorMs } = computeOffsetSet(this.samples);
    this.offsetMed = offsetMed;
    this.rttMed = rttMed;
    this.errorMs = errorMs;
    console.log(`[${this.id}] offset=${offsetMed.toFixed(2)}ms rtt=${rttMed.toFixed(2)}ms ±${errorMs.toFixed(2)}ms`);
  }

  scheduleStart(startServerTime: number) {
    const localTarget = startServerTime - this.offsetMed; // when to start locally
    const delay = Math.max(0, Math.round(localTarget - Date.now()));
    console.log(`[${this.id}] scheduling start in ${delay} ms (target=${Math.round(localTarget)})`);
    setTimeout(() => {
      const actual = Date.now();
      const delta = actual - localTarget;
      const row: ClientResult = {
        clientId: this.id,
        offsetMs: this.offsetMed,
        rttMs: this.rttMed,
        errorMs: this.errorMs,
        startServerTime: startServerTime,
        startLocalTarget: Math.round(localTarget),
        startActualTs: actual,
        deltaFromTargetMs: Math.round(delta),
      };
      printCsvRow(row);
      this.startPromiseResolve && this.startPromiseResolve();
    }, delay);
  }
}

// -------- CSV helpers --------
let printedHeader = false;
function printCsvRow(r: ClientResult) {
  if (!printedHeader) {
    console.log('clientId,offsetMs,rttMs,errorMs,startServerTime,startLocalTarget,startActualTs,deltaFromTargetMs');
    printedHeader = true;
  }
  console.log([
    r.clientId,
    r.offsetMs.toFixed(2),
    r.rttMs.toFixed(2),
    r.errorMs.toFixed(2),
    r.startServerTime ?? '',
    r.startLocalTarget ?? '',
    r.startActualTs ?? '',
    r.deltaFromTargetMs ?? '',
  ].join(','));
}

// -------- Main orchestration --------
(async () => {
  const clients = Number(parseArg('clients', '1')) || 1;
  const wsBase = parseArg('ws', 'ws://localhost:4000')!;
  const httpBase = parseArg('http', 'http://localhost:4000');
  const sessionId = parseArg('session', 'lobby')!;
  const pings = Number(parseArg('pings', '10')) || 10;
  const interval = Number(parseArg('interval', '100')) || 100;
  const jitter = Math.max(0, Number(parseArg('jitter', '0')) || 0);

  console.log(`Starting ${clients} simulated clients -> session=${sessionId}`);

  const sims: SimClient[] = [];
  for (let i = 0; i < clients; i++) {
    const id = `sim-${(i + 1).toString().padStart(2, '0')}-${Math.random().toString(16).slice(2, 6)}`;
    const sim = new SimClient(id, wsBase, sessionId, httpBase, jitter);
    sims.push(sim);
  }

  // Connect and join
  await Promise.all(sims.map(s => s.joinSession().catch(() => undefined)));
  await Promise.all(sims.map(s => s.connect()));

  // Sync all
  await Promise.all(sims.map(s => s.syncClock(pings, interval)));

  console.log('Waiting for start message... (type:"start" with start_time/startTime)');
  // Wait until every client schedules and logs after receiving a start
  await Promise.all(sims.map(s => s.started));

  console.log('All clients reported their scheduled start. Exiting.');
})();
