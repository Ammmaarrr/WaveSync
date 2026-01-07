#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

function median(a) { const s = [...a].sort((x,y)=>x-y); const m = Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }
function mean(a) { return a.reduce((p,c)=>p+c,0)/a.length; }
function stddev(a) { const m=mean(a); const v = mean(a.map(x=>(x-m)**2)); return Math.sqrt(v); }

const args = process.argv.slice(2);
function getArg(name, def) {
  const p = `--${name}=`; const f = args.find(a=>a.startsWith(p)); return f? f.slice(p.length) : def;
}

const clients = Number(getArg('clients', '10'));
const ws = getArg('ws', 'ws://localhost:4000');
const http = getArg('http', 'http://localhost:4000');
const session = getArg('session', 'lobby');
const jitter = Number(getArg('jitter', '0'));

const child = spawn(process.execPath, [
  process.execPath, // placeholder to keep node path on Windows PowerShell
]);
child.kill();

const simCmd = process.platform.startsWith('win') ? 'npx.cmd' : 'npx';
const simArgs = ['-y', '--package=tsx', '--package=ws', 'tsx', 'client/simulator.ts', `--clients=${clients}`, `--ws=${ws}`, `--http=${http}`, `--session=${session}`, `--jitter=${jitter}`];

const proc = spawn(simCmd, simArgs, { stdio: ['ignore', 'pipe', 'inherit'], cwd: process.cwd() });
const rl = createInterface({ input: proc.stdout });

const deltas = [];
let headerSeen = false;
rl.on('line', line => {
  if (!headerSeen && line.startsWith('clientId,')) { headerSeen = true; return; }
  if (!headerSeen) return;
  const cols = line.split(',');
  const delta = Number(cols[7]);
  if (!Number.isFinite(delta)) return;
  deltas.push(delta);
});

proc.on('close', code => {
  if (!deltas.length) {
    console.error('No CSV delta rows captured.');
    process.exit(code ?? 1);
  }
  console.log(`count=${deltas.length}`);
  console.log(`mean=${mean(deltas).toFixed(2)} ms`);
  console.log(`median=${median(deltas).toFixed(2)} ms`);
  console.log(`stddev=${stddev(deltas).toFixed(2)} ms`);
});
