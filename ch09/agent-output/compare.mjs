// compare.mjs - run tagcode.exe and tagcode_re.exe on the same ASCII inputs and
// compare stdout, stderr and exit code.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ORIG = path.join(dir, 'tagcode.exe');
const RE = path.join(dir, 'tagcode_re.exe');

// Deterministic PRNG so runs are reproducible.
let seed = 0x13579bdf;
const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
const randAscii = (len) =>
  Array.from({ length: len }, () => String.fromCharCode(0x20 + Math.floor(rand() * 95))).join('');

// Mirror of the spec, used ONLY to pick inputs that land on grade boundaries.
// The verdict always comes from comparing the two real executables.
const specCode = (s) => {
  let h = 0x1234;
  for (const ch of Buffer.from(s, 'latin1')) {
    h = (Math.imul(h, 31) + ch) >>> 0;
    h = (h ^ (h >>> 7)) >>> 0;
  }
  return h % 10000;
};
const boundaryTargets = [0, 1, 3999, 4000, 6999, 7000, 8999, 9000, 9999];
const boundaryInputs = [];
for (const target of boundaryTargets) {
  for (let i = 0; i < 5_000_000; i++) {
    const s = `k${i}`;
    if (specCode(s) === target) { boundaryInputs.push(s); break; }
  }
}

// Each case is an argv array (excluding the program name).
const cases = [
  [],                                   // no argument -> usage
  [''],                                 // empty string
  ['a'], ['A'], ['abc'], ['hello'], ['Hello, World!'],
  ['tagcode'], ['PLATINUM'], ['GOLD'], ['SILVER'], ['BRONZE'],
  ['0'], ['1234'], ['9999'], ['~'], [' '], ['  leading and trailing  '],
  ['with "quotes" inside'], ['back\\slash\\'], ['tab\there'],
  ['!@#$%^&*()_+-=[]{}|;:,.<>/?`'],
  ['x'.repeat(1000)], ['The quick brown fox jumps over the lazy dog'],
  ['first', 'second', 'third'],         // extra args are ignored
  ['', 'ignored'],
  ...boundaryInputs.map((s) => [s]),
  ...Array.from({ length: 40 }, () => [randAscii(1 + Math.floor(rand() * 40))]),
];

const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'latin1', windowsHide: true });
  if (r.error) throw r.error;
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
};

let pass = 0;
const failures = [];
const show = (s) => JSON.stringify(s.length > 40 ? s.slice(0, 37) + '...' : s);

console.log('#   result  exit  stdout (original)                    args');
cases.forEach((args, i) => {
  const a = run(ORIG, args);
  const b = run(RE, args);
  const same = a.stdout === b.stdout && a.stderr === b.stderr && a.status === b.status;
  if (same) pass++; else failures.push({ args, orig: a, re: b });
  console.log(
    `${String(i + 1).padStart(3)} ${same ? 'OK  ' : 'DIFF'}    ${String(a.status).padEnd(4)}  ` +
    `${a.stdout.trimEnd().padEnd(35)}  ${args.length ? args.map(show).join(' ') : '(none)'}`
  );
});

console.log(`\n${pass}/${cases.length} cases identical (stdout, stderr, exit code).`);
for (const f of failures) {
  console.log('\nMISMATCH for args', JSON.stringify(f.args));
  console.log('  original:', JSON.stringify(f.orig));
  console.log('  re      :', JSON.stringify(f.re));
}
process.exit(failures.length ? 1 : 0);
