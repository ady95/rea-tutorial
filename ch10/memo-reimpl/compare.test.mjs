// 원본 IPC 처리기(harness.mjs)와 재구현(summarize.mjs)을 같은 입력으로 비교한다.
// 실행: node --test

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

import { loadOriginal } from "./harness.mjs";
import { CHANNEL, summarize } from "./summarize.mjs";

let original;

before(() => {
  original = loadOriginal();
});

// 원본은 IPC 를 거쳐 호출하고, 재구현도 같은 structuredClone 경계를 거치게 한다.
async function compare(input) {
  const expected = await original.invoke(CHANNEL, input);
  const actual = structuredClone(summarize(structuredClone(input)));
  assert.deepStrictEqual(actual, expected);
  // 키 순서까지 같아야 renderer/직렬화 결과가 동일하다 (O-1, O-3)
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  return expected;
}

function words(n, word = "word") {
  return Array.from({ length: n }, (_, i) => `${word}${i}`).join(" ");
}

describe("하네스", () => {
  test("원본 main 이 memo:summarize 처리기를 등록한다", () => {
    assert.equal(CHANNEL, "memo:summarize");
    assert.deepEqual(original.channels(), ["memo:summarize"]);
    assert.ok(original.requests.includes("electron"));
  });
});

const cases = {
  "빈 문자열 / 입력 변환": {
    "빈 문자열": "",
    undefined: undefined,
    null: null,
    "숫자": 123,
    "0": 0,
    "false": false,
    "배열": ["a #x", "b"],
    "객체": { text: "#nope" },
  },
  "줄바꿈 종류": {
    "LF": "one\ntwo\nthree",
    "CRLF": "one\r\ntwo\r\nthree",
    "LF·CRLF 혼합": "a\r\nb\nc\r\n\r\nd",
    "CR 단독(옛 Mac)": "one\rtwo\rthree",
    "LF CR 순서 뒤집힘": "one\n\rtwo",
    "끝 줄바꿈": "line\n",
    "끝 CRLF 여러 개": "line\r\n\r\n\r\n",
    "줄바꿈만": "\n\n\r\n",
    "U+2028/U+2029": "a b c",
  },
  "공백만 있는 줄": {
    "스페이스·탭 줄": "a\n   \n\t\t\nb",
    "CRLF 사이 공백 줄": "a\r\n  \r\n\t\r\nb",
    "전각 공백 줄": "가\n　　\n나",
    "NBSP·BOM 줄": "x\n \n﻿\ny",
    "전체가 공백": "   \t  \n \r\n 　 ",
    "앞뒤 공백 단어": "  hello   world  ",
  },
  "한글·영문 태그": {
    "한글 태그": "오늘 #회의 내용 #회의 정리 #할일",
    "영문 태그": "notes #todo #idea #todo",
    "혼합": "#회의 #meeting #회의 #MEETING #할일",
    "숫자·밑줄 태그": "#2024 #v2_release #_ #①번 #Ⅻ #２０２６",
    "태그 경계": "a#b ##x #tag-name #end. #it's (#paren) #한글!",
    "태그 아님": "# 공백 #\t탭 ＃전각 #-dash #",
    "URL 앵커": "see https://example.com/page#top and #top",
    "결합 문자": "#café #café #cafe",
    "서로게이트 문자": "#𝒜 #𝒜 #ｱ #ｱ #😀 #a",
    "프로토타입 이름 태그": "#__proto__ #constructor #__proto__ #toString",
  },
  "대소문자": {
    "같은 태그 대소문자": "#Tag #TAG #tag #tAg",
    "터키어 İ": "#İstanbul #istanbul #ISTANBUL",
    "그리스어 시그마": "#ΟΔΟΣ #οδος #Σ",
    "독일어 ß/ẞ": "#Straße #STRASSE #ẞ",
  },
  "태그 동점 정렬": {
    "동점 알파벳순": "#c #b #a #d",
    "동점 혼합 문자권": "#나 #가 #b #A #1 #_",
    "횟수 우선": "#z #z #z #y #y #x #w",
    "상위 3개 자르기": "#e #d #c #b #a #e #d",
    "대문자 정렬은 소문자화 후": "#Banana #apple #Cherry",
    "코드 단위 vs 코드 포인트": "#ｱ #𝒜 #ﾟ #\u{10400}",
  },
};

for (const [group, inputs] of Object.entries(cases)) {
  describe(group, () => {
    for (const [name, input] of Object.entries(inputs)) {
      test(name, () => compare(input));
    }
  });
}

describe("긴 텍스트", () => {
  for (const n of [199, 200, 201, 400, 401]) {
    test(`readingMinutes 경계 ${n}단어`, () => compare(words(n)));
  }

  test("10만 단어 + CRLF + 태그", async () => {
    const lines = [];
    for (let i = 0; i < 5000; i++) {
      lines.push(`${words(20, "w")} #tag${i % 7} #태그${i % 5}`);
      if (i % 100 === 0) lines.push("   ");
    }
    const r = await compare(lines.join("\r\n"));
    assert.equal(r.lines, 5000);
  });

  test("100만 자 단일 줄", () => compare("가나다 #긴글 ".repeat(150_000)));
});

describe("무작위 입력 (고정 시드)", () => {
  // mulberry32
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const alphabet = [
    "#", "#", "#", "a", "B", "z", "가", "힣", "1", "_", "-", ".", " ", " ", "\t",
    "\n", "\r", "\r\n", "　", " ", " ", "İ", "Σ", "é", "́", "𝒜", "ｱ", "①",
  ];
  const random = rng(20261013);
  for (let i = 0; i < 300; i++) {
    const len = Math.floor(random() * 80);
    let s = "";
    for (let j = 0; j < len; j++) s += alphabet[Math.floor(random() * alphabet.length)];
    test(`fuzz #${i}`, () => compare(s));
  }
});
