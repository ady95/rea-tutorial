import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { toCsv as reimpl } from "./csv.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { toCsv: original } = require(path.join(here, "..", "notes-example", "csv.js"));

const cases = [
  ["empty array", []],
  ["basic", [{ id: 1, title: "First note" }]],
  ["comma", [{ id: 2, title: "a,b,c" }]],
  ["double quote", [{ id: 3, title: 'say "hi"' }]],
  ["only quotes", [{ id: 4, title: '""' }]],
  ["LF newline", [{ id: 5, title: "line1\nline2" }]],
  ["CRLF newline", [{ id: 6, title: "x\r\ny" }]],
  ["korean", [{ id: 7, title: "한글 제목" }]],
  ["all mixed", [{ id: 8, title: '회의, "중요"\n내일' }]],
  ["empty title", [{ id: 9, title: "" }]],
  ["number title", [{ id: 10, title: 42 }]],
  ["null title", [{ id: 11, title: null }]],
  ["missing title", [{ id: 12 }]],
  ["id with comma/quote", [{ id: '1,"2"', title: "t" }]],
  ["emoji", [{ id: 13, title: "😀 note" }]],
  ["multiple rows", [{ id: 1, title: "a" }, { id: 2, title: "b,\"c\"" }, { id: 3, title: "다\n라" }]],
];

let failures = 0;
for (const [name, input] of cases) {
  const a = Buffer.from(original(input), "utf8");
  const b = Buffer.from(reimpl(input), "utf8");
  const same = a.equals(b);
  if (!same) failures++;
  console.log(`${same ? "PASS" : "FAIL"}  ${name.padEnd(20)} ${a.length}B vs ${b.length}B`);
  if (!same) {
    console.log("  original:", a.toString("hex"));
    console.log("  reimpl:  ", b.toString("hex"));
  }
}

for (const [name, bad] of [["undefined arg", undefined], ["null arg", null], ["object arg", {}]]) {
  const threw = (fn) => { try { fn(bad); return null; } catch (e) { return e.constructor.name; } };
  const ea = threw(original), eb = threw(reimpl);
  const same = ea === eb;
  if (!same) failures++;
  console.log(`${same ? "PASS" : "FAIL"}  ${name.padEnd(20)} throws ${ea} vs ${eb}`);
}

console.log(`\n${cases.length + 3 - failures}/${cases.length + 3} matched`);
process.exitCode = failures ? 1 : 0;
