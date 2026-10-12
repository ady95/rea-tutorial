// Runs the original ShippingFee.dll and the fee.mjs re-implementation on the same inputs and compares.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCli } from './fee.mjs';

const DOTNET = 'dotnet';
const DLL = join(dirname(fileURLToPath(import.meta.url)), 'ShippingFee.dll');

const CASES = [
  // weight boundaries per zone
  ...['domestic', 'jeju', 'overseas'].flatMap((z) =>
    [1, 500, 1000, 1001, 1999, 2000, 2001, 5500, 10000, 10001].flatMap((w) => [[String(w), z], [String(w), z, 'express']])),
  // express rounding (odd base after extra)
  ['3001', 'domestic', 'express'], ['1001', 'jeju', 'express'], ['999999', 'overseas', 'express'],
  // express flag variants
  ['1500', 'domestic', 'Express'], ['1500', 'domestic', 'EXPRESS'], ['1500', 'domestic', 'fast'], ['1500', 'domestic', 'express', 'extra'],
  // invalid weight
  ['0', 'domestic'], ['-1', 'jeju'], ['-2147483648', 'overseas'], ['0', 'mars'],
  // invalid zone (case/whitespace sensitive)
  ['1000', 'mars'], ['1000', 'Domestic'], ['1000', 'JEJU'], ['1000', ' jeju'], ['1000', ''],
  // int.Parse behaviour
  ['+1500', 'domestic'], [' 1500 ', 'domestic'], ['007', 'jeju'], ['1.5', 'domestic'], ['abc', 'domestic'], ['', 'domestic'],
  ['2147483648', 'domestic'], ['1e3', 'domestic'],
  // int32 overflow edges
  ['2147483647', 'domestic'], ['2147483647', 'overseas'], ['2147468001', 'overseas'], ['2147468000', 'overseas'],
  ['715827882', 'domestic', 'express'], ['715830000', 'domestic', 'express'], ['2147483647', 'overseas', 'express'],
  // usage
  [], ['1000'],
];

function runOriginal(args) {
  const p = spawnSync(DOTNET, [DLL, ...args], { encoding: 'utf8' });
  if (p.error) throw p.error;
  const stdout = p.stdout.trim();
  const m = /Unhandled exception\.\s+([\w.]+)/.exec(p.stderr);
  if (m) return { stdout: '', exitCode: null, error: m[1] };
  return { stdout, exitCode: p.status, error: null };
}

const show = (r) => (r.error ? `throw ${r.error}` : `${JSON.stringify(r.stdout)} (exit ${r.exitCode})`);

let pass = 0;
const rows = [];
for (const args of CASES) {
  const orig = runOriginal(args);
  const mine = runCli(args);
  const ok = orig.error === mine.error && orig.stdout === mine.stdout && orig.exitCode === mine.exitCode;
  if (ok) pass++;
  rows.push({ ok, args, orig, mine });
}

const w = Math.max(...rows.map((r) => JSON.stringify(r.args).length));
for (const r of rows) {
  const line = `${r.ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(r.args).padEnd(w)}  original=${show(r.orig)}`;
  console.log(r.ok ? line : `${line}\n      reimpl=${show(r.mine)}`);
}
console.log(`\n${pass}/${rows.length} cases match`);
process.exit(pass === rows.length ? 0 : 1);
