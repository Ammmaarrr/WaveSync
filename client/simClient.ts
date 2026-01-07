/*
 Simple Node client to measure clock offset using the server's ping/pong.

 Usage (no local package.json needed):
   npx -y --package=tsx --package=ws tsx client/simClient.ts

 It will:
 - Connect to ws://localhost:4000/ws
 - Send 10 pings spaced ~100ms apart
 - Print median offset and RTT (with simple trimming of outliers)
*/

import WebSocket from 'ws';

interface Sample {
  t1: number;        // client send time
  t2: number;        // client receive time
  serverRecv: number;// server receive time (t2 server-side)
  serverTime: number;// server send time (t3 server-side)
}

function median(values: number[]): number {
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function computeOffsetAndRtt(samples: Sample[]) {
  // Derive per-sample RTT and offset using requested exact formulas:
  // RTT = t2 - t1
  // offset = serverTime - ((t1 + t2) / 2)
  const derived = samples.map(s => ({
    rtt: s.t2 - s.t1,
    offset: s.serverTime - ((s.t1 + s.t2) / 2),
  }));

  // Trim by RTT outliers if enough samples
  const byRtt = [...derived].sort((a, b) => a.rtt - b.rtt);
  let trimmed = byRtt;
  if (byRtt.length >= 7) {
    const k = Math.min(2, Math.floor(byRtt.length / 4));
    trimmed = byRtt.slice(k, byRtt.length - k);
  }

  const offsets = trimmed.map(x => x.offset);
  const rtts = trimmed.map(x => x.rtt);
  const offsetMed = median(offsets);
  const rttMed = median(rtts);

  // Robust error estimate via MAD on offsets
  const absDevs = offsets.map(v => Math.abs(v - offsetMed));
  const mad = median(absDevs);
  const errorMs = 1.4826 * mad; // ~1σ for normal dist

  return { offsetMed, rttMed, errorMs, used: trimmed.length, trimmed: samples.length - trimmed.length };
}

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const sessionId = 'lobby';
  const clientId = `sim-${Math.random().toString(16).slice(2, 8)}`;
  const url = `ws://localhost:4000/ws?sessionId=${encodeURIComponent(sessionId)}&clientId=${encodeURIComponent(clientId)}`;
  const ws = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', (e) => reject(e));
  });

  const samples: Sample[] = [];
  const total = 10;

  ws.on('message', (data) => {
    const t2 = Date.now();
    try {
      const msg = JSON.parse(data.toString());
      if (msg && msg.type === 'pong' && typeof msg.serverTime === 'number' && typeof msg.serverRecv === 'number') {
        const t1 = Number(msg.t1) || 0;
        samples.push({ t1, t2, serverRecv: msg.serverRecv, serverTime: msg.serverTime });
      }
    } catch { /* ignore non-JSON */ }
  });

  for (let i = 0; i < total; i++) {
    const t1 = Date.now();
    ws.send(JSON.stringify({ type: 'ping', t1 }));
    await delay(100);
  }

  // Wait a moment to ensure all pongs received
  await delay(200);
  ws.close();

  if (samples.length === 0) {
    console.log('No samples collected. Is the server running at ws://localhost:4000/ws?');
    return;
  }

  const { offsetMed, rttMed, errorMs, used, trimmed } = computeOffsetAndRtt(samples);
  console.log('Samples collected:', samples.length, `(used ${used}, trimmed ${trimmed})`);
  console.log(`Median offset: ${offsetMed.toFixed(2)} ms (±${errorMs.toFixed(2)} ms)`);
  console.log(`Median RTT:    ${rttMed.toFixed(2)} ms`);
}

run().catch((e) => {
  console.error('simClient error:', e);
  process.exitCode = 1;
});
