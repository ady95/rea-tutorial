// Compares the original "memo:summarize" handler (run via harness.mjs) with summarize.mjs.
// Run: node --test

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { loadOriginalMain } from "./harness.mjs";
import { summarize } from "./summarize.mjs";

const CHANNEL = "memo:summarize";
// Build analysed in REQUIREMENTS.md.
const ANALYSED_ASAR_SHA256 = "a4cf334833b8b363f95df9a83a373366291c61edf84251c2585902ab09eefcc6";
const ANALYSED_MAIN_SHA256 = "3e02cf388b61784d61cc5df4c2572415cec87daf4a8d553b56cd5eb79c131ccf";

let original;

before(async () => {
  original = await loadOriginalMain();
});

async function assertSameAsOriginal(input) {
  const expected = await original.invoke(CHANNEL, input);
  const actual = summarize(input);
  assert.deepStrictEqual(actual, expected);
  // deepStrictEqual ignores key order; the IPC result shape should match it too (R-3.1, R-3.3).
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  return expected;
}

function words(n, word = "word") {
  return Array.from({ length: n }, (_, i) => `${word}${i}`).join(" ");
}

const cases = {
  "빈 문자열 / 비문자열 입력": {
    "empty string": "",
    "undefined": undefined,
    "null": null,
    "number": 42,
    "boolean": false,
  },
  "줄바꿈 종류": {
    "LF": "first\nsecond\nthird",
    "CRLF": "first\r\nsecond\r\nthird",
    "mixed LF and CRLF": "a\r\nb\nc\r\nd",
    "lone CR is not a break": "a\rb\rc",
    "trailing LF": "a\nb\n",
    "trailing CRLF": "a\r\nb\r\n",
    "only newlines": "\n\r\n\n",
    "CR before CRLF": "a\r\r\nb",
  },
  "공백만 있는 줄": {
    "spaces and tabs": "a\n   \n\t\t\nb",
    "CRLF blank lines": "a\r\n \r\n\t\r\nb",
    "NBSP and ideographic space": "a\n  \n　\nb",
    "whitespace only text": " \t \n \r\n　",
    "leading/trailing spaces in words": "  hello   world  \n\t foo\t",
  },
  "한글·영문 태그": {
    "korean tags": "오늘 #회의 내용 #할일 정리 #회의",
    "english tags": "#work #home #work #todo",
    "mixed korean english": "#회의 #meeting #회의 #meeting #일정",
    "digits and underscore": "#2026 #v2_release #_ #2026",
    "tag terminators": "#todo-list #a.b #x,y #한글!",
    "adjacent hashes": "#a#b ##c mail#tag",
    "bare hash": "# alone and end #",
    "tags across lines": "#a\r\n#b\n#a\r\n#c",
    "decomposed hangul (NFD)": "#한 #한",
    "combining mark ends tag": "#café #cafe",
  },
  "대소문자": {
    "case folding": "#Work #WORK #work #wOrK",
    "case groups": "#Todo #TODO #Done #done #Done",
    "dotted capital I": "#İstanbul #istanbul",
    "greek sigma": "#ΣΟΦΙΑ #σοφια",
  },
  "태그 동점 정렬": {
    "all ties, reverse input order": "#d #c #b #a",
    "ties across scripts": "#한 #b #a #_ #9",
    "case-folded ties": "#B #a #C #b #c #A",
    "ties at boundary of top 3": "#x #x #y #y #z #z #w #w",
    "count beats name": "#z #z #z #a #b #b",
    "uppercase sorts as lowercase": "#Zebra #apple #Mango",
    "underscore vs letters": "#a_ #ab #a",
  },
  "긴 텍스트": {
    "199 words": words(199),
    "200 words": words(200),
    "201 words": words(201),
    "400 words": words(400),
    "401 words": words(401),
    "10k words over many lines": Array.from({ length: 500 }, (_, i) => words(20, `l${i}w`)).join("\r\n"),
    "100k words with tags": Array.from({ length: 100_000 }, (_, i) => (i % 7 === 0 ? `#t${i % 5}` : "단어")).join(" "),
    "long single line": "가".repeat(200_000),
    "many blank lines": "\n \r\n".repeat(50_000) + "end",
  },
};

describe("harness", () => {
  test("loads the analysed build and registers memo:summarize", () => {
    assert.equal(original.asarSha256, ANALYSED_ASAR_SHA256);
    assert.equal(original.mainSha256, ANALYSED_MAIN_SHA256);
    assert.deepEqual(original.channels, [CHANNEL]);
  });

  test("original handler produces real results (not a trivial match)", async () => {
    const result = await original.invoke(CHANNEL, "a b\n\n#X #x #y");
    assert.deepStrictEqual(result, {
      lines: 2,
      words: 5,
      readingMinutes: 1,
      tags: [{ tag: "x", count: 2 }, { tag: "y", count: 1 }],
    });
  });
});

for (const [group, inputs] of Object.entries(cases)) {
  describe(group, () => {
    for (const [name, input] of Object.entries(inputs)) {
      test(name, () => assertSameAsOriginal(input));
    }
  });
}

describe("무작위 입력", () => {
  // Small deterministic PRNG so failures are reproducible.
  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pieces = [
    "#", "#a", "#A", "#회의", "#할일", "#b_2", "#Ü", "a", "B", "가", "9", "_", "-", ".",
    " ", "  ", "\t", "\n", "\r\n", "\r", " ", "　", "word", "단어",
  ];

  test("2000 seeded random memos", async () => {
    const random = mulberry32(0x5eed);
    for (let i = 0; i < 2000; i++) {
      const length = Math.floor(random() * 60);
      let text = "";
      for (let j = 0; j < length; j++) text += pieces[Math.floor(random() * pieces.length)];
      await assert.doesNotReject(assertSameAsOriginal(text), `seed case #${i}: ${JSON.stringify(text)}`);
    }
  });
});
