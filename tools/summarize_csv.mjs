#!/usr/bin/env node
import fs from 'node:fs';

function median(a) { const s = [...a].sort((x,y)=>x-y); const m = Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }
function mean(a) { return a.reduce((p,c)=>p+c,0)/a.length; }
function stddev(a) { const m=mean(a); const v = mean(a.map(x=>(x-m)**2)); return Math.sqrt(v); }

const args = process.argv.slice(2);
function getArg(name, def) {
  const p = `--${name}=`; const f = args.find(a=>a.startsWith(p)); return f? f.slice(p.length) : def;
}

const file = getArg('file');
const column = getArg('column');
if (!file || !column) {
  console.error('Usage: node summarize_csv.mjs --file=<path> --column=<name>');
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
const lines = text.trim().split(/\r?\n/);
const header = lines.shift();
const cols = header.split(',');
const idx = cols.indexOf(column);
if (idx < 0) {
  console.error(`Column not found: ${column}`);
  process.exit(1);
}

const values = lines.map(l => Number(l.split(',')[idx])).filter(v => Number.isFinite(v));
if (!values.length) {
  console.error('No numeric values found.');
  process.exit(1);
}

console.log(`count=${values.length}`);
console.log(`mean=${mean(values).toFixed(2)}`);
console.log(`median=${median(values).toFixed(2)}`);
console.log(`stddev=${stddev(values).toFixed(2)}`);
