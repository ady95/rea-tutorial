// Author's mutation check for chapter 10: copy memo-reimpl to a temp dir, apply one
// plausible-but-wrong change to summarize.mjs at a time, run node --test.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const src = process.argv[2];
const asar = path.resolve(src, '../memo-bin/app.asar');
const base = readFileSync(path.join(src, 'summarize.mjs'), 'utf8');
const mutants = [
  ['localeCompare 정렬', 'compareCodeUnits(a.tag, b.tag)', 'a.tag.localeCompare(b.tag)'],
  ['코드 포인트 정렬', 'return a < b ? -1 : 1;', 'const x=[...a].map(c=>c.codePointAt(0)),y=[...b].map(c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;'],
  ['동점 2차 정렬 없음', ' || compareCodeUnits(a.tag, b.tag)', ''],
  ['개수 오름차순', 'b.count - a.count', 'a.count - b.count'],
  ['상위 5개', 'const MAX_TAGS = 3;', 'const MAX_TAGS = 5;'],
  ['단독 CR도 줄바꿈', 'const LINE_BREAK = /\\r?\\n/;', 'const LINE_BREAK = /\\r\\n|\\r|\\n/;'],
  ['trim 없이 빈 줄 판정', 'line.trim().length > 0', 'line.length > 0'],
  ['단어를 공백 한 칸으로 분리', 'return text.match(NON_SPACE_RUN)?.length ?? 0;', 'return text.split(" ").filter(Boolean).length;'],
  ['태그를 \\w로 인식', 'const TAG = /#([\\p{L}\\p{N}_]+)/gu;', 'const TAG = /#(\\w+)/g;'],
  ['소문자 변환 생략', 'const tag = name.toLowerCase();', 'const tag = name;'],
  ['읽기 시간 최소 0분', 'Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))', 'Math.ceil(words / WORDS_PER_MINUTE)'],
  ['읽기 시간 내림', 'Math.ceil(words / WORDS_PER_MINUTE)', 'Math.floor(words / WORDS_PER_MINUTE)'],
  ['분당 250단어', 'const WORDS_PER_MINUTE = 200;', 'const WORDS_PER_MINUTE = 250;'],
  ['null을 "null"로 변환', 'String(input ?? "")', 'String(input)'],
];
const runTests = (dir) => {
  const r = spawnSync(process.execPath, ['--test'], { cwd: dir, encoding: 'utf8', env: { ...process.env, MEMO_ASAR: asar } });
  return Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] ?? NaN);
};
// Baseline: a reader's own build fails the analysed-build hash test, so count only extra failures.
const baseline = runTests(src);
console.log(`baseline failures: ${baseline}`);
let caught = 0;
for (const [name, from, to] of mutants) {
  if (!base.includes(from)) { console.log('SKIP (pattern missing):', name); continue; }
  const dir = mkdtempSync(path.join(tmpdir(), 'memo-mut-'));
  cpSync(src, dir, { recursive: true });
  writeFileSync(path.join(dir, 'summarize.mjs'), base.replace(from, to));
  const fail = runTests(dir) - baseline;
  const ok = fail > 0;
  if (ok) caught++;
  console.log(`${ok ? 'CAUGHT' : 'MISSED'} ${name} (fail ${fail})`);
  rmSync(dir, { recursive: true, force: true });
}
console.log(`${caught}/${mutants.length} caught`);
