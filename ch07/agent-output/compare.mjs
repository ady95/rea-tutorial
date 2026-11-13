// 원본 ShippingFee.dll 과 fee.mjs 재구현을 여러 입력으로 비교한다.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runCli } from './fee.mjs';

const DOTNET = 'C:/tools/dotnet/dotnet.exe';
const DLL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ShippingFee.dll');

const cases = [
  // 기본 요금 / 구간 경계
  ['1', 'domestic'], ['1000', 'domestic'], ['1001', 'domestic'], ['2000', 'domestic'],
  ['2001', 'domestic'], ['5500', 'domestic'], ['1', 'jeju'], ['1000', 'jeju'],
  ['1001', 'jeju'], ['3000', 'jeju'], ['1', 'overseas'], ['10000', 'overseas'],
  ['10001', 'overseas'],
  // 특송 (3/2 배, 정수 버림)
  ['1', 'domestic', 'express'], ['1001', 'domestic', 'express'], ['1001', 'jeju', 'express'],
  ['2500', 'overseas', 'express'], ['999999', 'overseas', 'express'],
  // 세 번째 인자가 정확히 "express" 가 아니면 일반
  ['1001', 'domestic', 'Express'], ['1001', 'domestic', 'fast'],
  // 오류 경로
  ['0', 'domestic'], ['-5', 'jeju'], ['100', 'Domestic'], ['100', 'busan'],
  ['abc', 'domestic'], ['99999999999', 'domestic'],
  // 인자 부족
  ['100'], [],
  // int32 오버플로 (unchecked 산술)
  ['2147483647', 'overseas'], ['2147483647', 'overseas', 'express'],
  ['1500000000', 'domestic', 'express'],
  // int.Parse 의 공백/부호 허용
  [' 1500 ', 'domestic'], ['+1500', 'domestic'],
];

function runOriginal(args) {
  const r = spawnSync(DOTNET, [DLL, ...args], { encoding: 'utf8' });
  const m = /Unhandled exception\.\s+System\.(\w+)/.exec(r.stderr ?? '');
  if (m) return { exitCode: null, stdout: '', error: m[1] };
  return { exitCode: r.status, stdout: (r.stdout ?? '').trim(), error: null };
}

const fmt = (o) => (o.error ? `throw ${o.error}` : `exit=${o.exitCode} "${o.stdout}"`);

let pass = 0;
const rows = cases.map((args) => {
  const orig = runOriginal(args);
  const re = runCli(args);
  const same = orig.error === re.error && orig.exitCode === re.exitCode && orig.stdout === re.stdout;
  if (same) pass++;
  return { input: args.map((a) => JSON.stringify(a)).join(' ') || '(none)', original: fmt(orig), reimpl: fmt(re), match: same ? 'OK' : 'DIFF' };
});

console.table(rows);
console.log(`\n${pass}/${cases.length} 일치`);
process.exit(pass === cases.length ? 0 : 1);
