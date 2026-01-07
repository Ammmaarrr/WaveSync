let samples = [];
export let offsetMs = null;
export let rttMs = null;
export function getOffsetMs() {
    return offsetMs;
}
function median(arr) { const a = [...arr].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function computeOffsets(log) {
    const derived = samples.map(s => ({
        rtt: s.t2 - s.t1,
        offset: s.serverTime - ((s.t1 + s.t2) / 2)
    }));
    derived.sort((a, b) => a.rtt - b.rtt);
    const trimmed = derived.length >= 7 ? derived.slice(Math.min(2, Math.floor(derived.length / 4)), derived.length - Math.min(2, Math.floor(derived.length / 4))) : derived;
    const offs = trimmed.map(d => d.offset);
    const rtts = trimmed.map(d => d.rtt);
    offsetMs = median(offs);
    rttMs = median(rtts);
    const offsetEl = document.getElementById('offset');
    if (offsetEl)
        offsetEl.textContent = offsetMs.toFixed(2);
    const rttEl = document.getElementById('rtt');
    if (rttEl)
        rttEl.textContent = rttMs.toFixed(2);
    log(`Clock sync => offset=${offsetMs.toFixed(2)}ms rtt=${rttMs.toFixed(2)}ms`);
}
export function handlePong(msg, t2) {
    samples.push({ t1: msg.t1, t2, serverRecv: msg.serverRecv, serverTime: msg.serverTime });
}
export async function runClockSync(channel, log) {
    if (!channel || channel.readyState !== WebSocket.OPEN) {
        log('WS not connected');
        return;
    }
    samples = [];
    for (let i = 0; i < 10; i++) {
        const t1 = Date.now();
        channel.send(JSON.stringify({ type: 'ping', t1 }));
        await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 200));
    if (!samples.length)
        return log('No samples');
    computeOffsets(log);
}
