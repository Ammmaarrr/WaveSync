/*
  WaveSync Web Client using Spotify Web Playback SDK
  - Clock sync via WS ping/pong
  - Init Spotify Player with token
  - Transfer playback to web player device
  - Schedule track start in the future
*/

import { pkceSignIn, handleCallback, setAccessToken, getAccessToken } from './auth/spotify-auth';
import { runClockSync, handlePong, Pong, getOffsetMs } from './sync/clock-sync';
import { initSpotify, transferPlayback, scheduleStart, getPlayer } from './player/web-player';

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const logEl = document.getElementById('log') as HTMLElement;
function log(msg: string) { const line = `[${new Date().toISOString()}] ${msg}`; console.log(line); logEl.textContent += line + '\n'; logEl.scrollTop = logEl.scrollHeight; }

let channel: WebSocket | null = null;
let driftTimer: number | null = null;
let currentSessionId: string = '';
let telemetryBatch: Array<{clientId: string; drift: number; timestamp: number}> = [];

function connectWs() {
  const wsBase = $('wsBase').value.trim();
  const sessionId = $('sessionId').value.trim();
  const clientId = $('clientId').value.trim() || `web-${Math.floor(Math.random()*10000)}`;
  const url = `${wsBase}/ws?sessionId=${encodeURIComponent(sessionId)}&clientId=${encodeURIComponent(clientId)}`;
  currentSessionId = sessionId;
  channel?.close();
  channel = new WebSocket(url);
  channel.onopen = () => log('WS open');
  channel.onclose = () => log('WS closed');
  channel.onerror = (e) => log(`WS error: ${e}`);
  channel.onmessage = ev => {
    const t2 = Date.now();
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg.type === 'pong') handlePong(msg as Pong, t2);
      else if (msg.type === 'relay' && msg.data?.type === 'start') handleStart(msg.data);
      else log(`WS: ${ev.data}`);
    } catch {
      log(`WS text: ${ev.data}`);
    }
  };
}

function handleStart(data: any) {
  const start = Number(data.startTime ?? data.start_time);
  const track = String(data.trackUri ?? data.track_uri ?? '');
  const seekMs = Number(data.seek_ms ?? 0);
  if (!start || !track) { log('Start missing start_time or track_uri'); return; }
  log(`Start received: server=${start} track=${track} seekMs=${seekMs}`);
  scheduleStart(start, track, seekMs, 3000, log);
  // Start drift/telemetry polling
  if (driftTimer) window.clearInterval(driftTimer);
  driftTimer = window.setInterval(async () => {
    try {
      const nowServer = Date.now() + (getOffsetMs() ?? 0);
      const expected = nowServer - start;
      // Player getPosition: Web SDK has no direct method; we query state via player.getCurrentState()
      const player = getPlayer();
      const state = await (player as any)?.getCurrentState?.();
      const actual = state?.position ?? 0;
      const drift = actual - expected;
      channel?.send(JSON.stringify({ type: 'telemetry', clientId: $('clientId').value.trim(), drift, timestamp: nowServer }));
      log(`telemetry drift=${drift}ms ts=${nowServer}`);
    } catch (e) {
      log(`telemetry error: ${e}`);
    }
  }, 3000);
}

async function hostStartIn3s() {
  const httpBase = $('httpBase').value.trim();
  const track = $('trackUri').value.trim();
  const seekMs = Number($('seekMs').value.trim() || '0');
  const resp = await fetch(`${httpBase}/server-time`);
  const nowServer = (await resp.json()).serverTime as number;
  const startTime = nowServer + 3000; // schedule 3s ahead
  log(`Host scheduling start at ${startTime}`);
  channel?.send(JSON.stringify({ type: 'start', start_time: startTime, track_uri: track, seek_ms: seekMs }));
  handleStart({ start_time: startTime, track_uri: track, seek_ms: seekMs }); // also start locally
}

async function uploadTelemetryBatch() {
  if (telemetryBatch.length === 0) return;
  const httpBase = $('httpBase').value.trim();
  try {
    const resp = await fetch(`${httpBase}/telemetry/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: telemetryBatch })
    });
    if (resp.ok) {
      log(`Uploaded ${telemetryBatch.length} telemetry records`);
      telemetryBatch = [];
    }
  } catch (e) {
    log(`Telemetry upload failed: ${e}`);
  }
}

// Wire UI
(document.getElementById('btnConnectWs') as HTMLButtonElement).onclick = connectWs;
(document.getElementById('btnSync') as HTMLButtonElement).onclick = () => runClockSync(channel, log);
const pkceBtn = document.getElementById('btnPkceSignIn') as HTMLButtonElement | null;
if (pkceBtn) pkceBtn.onclick = () => pkceSignIn($('httpBase').value.trim(), 'YOUR_SPOTIFY_CLIENT_ID'); // TODO: Configurable Client ID
(document.getElementById('btnInit') as HTMLButtonElement).onclick = () => {
  const manualToken = $('token').value.trim();
  if (manualToken) setAccessToken(manualToken);
  initSpotify($('httpBase').value.trim(), log);
};
(document.getElementById('btnTransfer') as HTMLButtonElement).onclick = () => transferPlayback(false, log);
(document.getElementById('btnStart') as HTMLButtonElement).onclick = hostStartIn3s;

// Initialize defaults
$('clientId').value = `web-${Math.floor(Math.random() * 10000)}`;

// Check for callback on page load
if (window.location.search.includes('code=')) {
  handleCallback($('httpBase').value.trim(), log);
}

log('Ready. Use PKCE sign-in button or provide a manual Spotify OAuth token with scopes: streaming, user-read-playback-state, user-modify-playback-state.');
log('Limitation: Web Playback has higher and more variable latency. Recommend buffer_ms >= 3000 when scheduling.');
