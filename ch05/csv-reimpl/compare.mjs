import { createRequire } from "node:module";
import { toCsv as reimplToCsv } from "./csv.mjs";

const require = createRequire(import.meta.url);
const { toCsv: originalToCsv } = require("../notes-example/csv.js");

const cases = [
  ["빈 배열", []],
  ["단순 제목", [{ id: 1, title: "First note" }]],
  ["쉼표", [{ id: 2, title: "a, b, c" }]],
  ["큰따옴표", [{ id: 3, title: 'He said "hi"' }]],
  ["따옴표만", [{ id: 4, title: '"' }, { id: 5, title: '""' }]],
  ["줄바꿈 LF/CRLF", [{ id: 6, title: "line1\nline2" }, { id: 7, title: "a\r\nb" }]],
  ["한글", [{ id: 8, title: "회의 메모" }]],
  ["한글+쉼표+따옴표+줄바꿈", [{ id: 9, title: '장보기, "우유"\n그리고 빵' }]],
  ["이모지/결합문자", [{ id: 10, title: "👍 café" }]],
  ["빈 제목", [{ id: 11, title: "" }]],
  ["id에 쉼표(이스케이프 안 됨)", [{ id: "1,2", title: "x" }]],
  ["누락/특수 값", [{ id: undefined, title: undefined }, { id: null, title: null }, { id: 0, title: 0 }]],
  ["추가 속성 무시", [{ id: 12, title: "t", body: "ignored" }]],
  [
    "여러 줄 혼합",
    [
      { id: 1, title: "First note" },
      { id: 2, title: "둘째, \"메모\"" },
      { id: 3, title: "끝\n" },
    ],
  ],
];

let failures = 0;
for (const [name, input] of cases) {
  const a = Buffer.from(originalToCsv(input), "utf8");
  const b = Buffer.from(reimplToCsv(input), "utf8");
  const same = a.equals(b);
  if (!same) failures++;
  console.log(
    `${same ? "PASS" : "FAIL"}  ${name.padEnd(28)} bytes=${a.length}/${b.length}  ${JSON.stringify(a.toString("utf8"))}`,
  );
  if (!same) {
    console.log(`      original: ${a.toString("hex")}`);
    console.log(`      reimpl  : ${b.toString("hex")}`);
  }
}

console.log(`\n${cases.length - failures}/${cases.length} cases byte-identical`);
process.exitCode = failures ? 1 : 0;
