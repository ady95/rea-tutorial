// 원본 tagcode와 tagcode_re의 stdout/stderr/종료 코드를 비교한다.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const ORIG = join(dir, 'tagcode');
const RE = join(dir, 'tagcode_re');

// 인자 배열 목록. null = 인자 없음
const cases = [
  null, [''], ['a'], ['A'], ['z'], ['0'], [' '], ['~'], ['!'],
  ['hello'], ['Hello'], ['hello world'], ['tagcode'], ['abc', 'extra'],
  ['The quick brown fox jumps over the lazy dog'],
  ['0123456789'], ['!@#$%^&*()_+-=[]{}|;:,.<>/?'], ['\t\n'],
  ['x'.repeat(1000)], ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
];
// 결정적 의사난수 ASCII(0x01-0x7f) 입력
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
for (let i = 0; i < 200; i++) {
  const len = Math.floor(rnd() * 40) + 1;
  let s = '';
  for (let j = 0; j < len; j++) s += String.fromCharCode(1 + Math.floor(rnd() * 127));
  cases.push([s]);
}

const run = (bin, args) => {
  const r = spawnSync(bin, args ?? [], { encoding: 'utf8' });
  return { out: r.stdout, err: r.stderr, code: r.status };
};

let pass = 0, fail = 0;
const grades = {};
for (const args of cases) {
  const a = run(ORIG, args), b = run(RE, args);
  const ok = a.out === b.out && a.err === b.err && a.code === b.code;
  ok ? pass++ : fail++;
  const g = /grade=(\w+)/.exec(a.out)?.[1] ?? '(usage)';
  grades[g] = (grades[g] ?? 0) + 1;
  if (!ok || cases.indexOf(args) < 20) {
    const label = args === null ? '<no args>' : JSON.stringify(args).slice(0, 50);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(52)} exit=${a.code}/${b.code} ${a.out.trim()}${ok ? '' : ` | re: ${b.out.trim()}`}`);
  }
}
console.log(`\n총 ${cases.length}건: 일치 ${pass}, 불일치 ${fail}`);
console.log('원본 등급 분포:', grades);
process.exit(fail ? 1 : 0);
