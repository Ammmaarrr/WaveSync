#!/usr/bin/env node
import fs from 'node:fs';

const args = process.argv.slice(2);
function getArg(name, def) { const p=`--${name}=`; const f=args.find(a=>a.startsWith(p)); return f? f.slice(p.length):def; }

const file = getArg('file');
const deviceId = getArg('deviceId', 'device');
if (!file) { console.error('Usage: node flutter_logs_to_csv.mjs --file=<log> --deviceId=<id>'); process.exit(1); }

const text = fs.readFileSync(file, 'utf8');
let offset; let scheduledStart; let playCallTs; let sdkPos; let drift;

for (const line of text.split(/\r?\n/)) {
  const m1 = line.match(/Clock sync => offset=([0-9.]+)ms/);
  if (m1) { offset = Number(m1[1]); continue; }
  const m2 = line.match(/Start track signal: .* server=(\d+)/);
  if (m2) { scheduledStart = Number(m2[1]); continue; }
  const m3 = line.match(/Spotify play\(\) call at (\d+)/);
  if (m3) { playCallTs = Number(m3[1]); continue; }
  const m4 = line.match(/Micro-adjust check: expected=(\d+) ms, pos=(\d+) ms, drift=(-?\d+) ms/);
  if (m4) { sdkPos = Number(m4[2]); drift = Number(m4[3]); continue; }
}

console.log('deviceId,offset,scheduledStart,playCallTs,sdkPositionAt1s,drift');
console.log([deviceId, offset??'', scheduledStart??'', playCallTs??'', sdkPos??'', drift??''].join(','));
