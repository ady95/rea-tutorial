// Differential test: original `memo:summarize` handler (via harness) vs. summarize.mjs.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { loadOriginal } from "./harness.mjs";
import { summarize } from "./summarize.mjs";

let original;
before(() => {
  original = loadOriginal();
  assert.deepEqual(original.channels, ["memo:summarize"]);
});

async function check(input) {
  const expected = await original.invoke("memo:summarize", input);
  const actual = await summarize(input);
  assert.deepEqual(actual, expected);
  // Key order must match as well (deepEqual ignores it).
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  return expected;
}

const longText = Array.from({ length: 1500 }, (_, i) =>
  `줄 ${i} word${i % 7} #Tag${i % 5} #태그${i % 3}${i % 50 === 0 ? "\r\n   \n" : "\n"}`,
).join("");

const cases = {
  "빈 문자열": "",
  "LF만": "a\nb\nc",
  "CRLF만": "a\r\nb\r\nc\r\n",
  "LF/CRLF 혼합": "a\r\nb\nc\r\n\r\nd",
  "단독 CR (줄 구분자 아님)": "a\rb\rc",
  "공백만 있는 줄": "a\n   \n\t\t\n \r\nb",
  "전각/NBSP 공백만 있는 줄": "a\n　　\n \nb",
  "공백만 있는 텍스트": "   \t  \n  \r\n ",
  "줄바꿈만": "\n\n\r\n\n",
  "앞뒤 공백 단어": "   hello   world   ",
  "한글 태그": "#회의 #메모 #회의 오늘 #할일",
  "영문 태그": "#work #idea #work #todo",
  "한글·영문 혼합 태그": "#메모 #memo #메모 #Memo #MEMO",
  "대소문자 합산": "#Foo #FOO #foo #Bar #bAR",
  "태그 동점 정렬(영문)": "#delta #alpha #charlie #bravo",
  "태그 동점 정렬(한글·영문·숫자)": "#하나 #zeta #둘 #alpha #10 #2 #_x",
  "동점+빈도 혼합, 상위 3개 자르기": "#c #b #a #d #d #e #e #a",
  "태그 경계 문자": "#foo-bar #baz.qux #a_b #한글123 ##double a#mid #!no #",
  "태그 연속": "#a#b#c #A",
  "숫자 입력(비문자열)": 42,
  "null 입력": null,
  "undefined 입력": undefined,
  "긴 텍스트": longText,
  "단어 200 경계": Array(200).fill("w").join(" "),
  "단어 201 경계": Array(201).fill("w").join(" "),
};

describe("원본 처리기 vs 재구현", () => {
  for (const [name, input] of Object.entries(cases)) {
    test(name, () => check(input));
  }

  test("긴 텍스트 결과 확인", async () => {
    const r = await check(longText);
    assert.ok(r.words > 200 && r.readingMinutes > 1);
    assert.equal(r.tags.length, 3);
  });

  test("무작위 입력 500개 (seed 고정)", async () => {
    let seed = 0x5eed;
    const rnd = (n) => ((seed = (seed * 1103515245 + 12345) >>> 0) % n);
    const alphabet = ["a", "B", "가", "힣", "1", "_", "#", "#", "#", " ", " ", "\t",
      "\n", "\r\n", "\r", "　", " ", "-", ".", "É", "é", "İ", "ß"];
    for (let i = 0; i < 500; i++) {
      const len = rnd(80);
      let s = "";
      for (let j = 0; j < len; j++) s += alphabet[rnd(alphabet.length)];
      await check(s);
    }
  });
});
