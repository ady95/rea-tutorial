// Memo Stats: clean-room reimplementation from REQUIREMENTS.md.
// Dependency-free ES module.

// I-1: IPC channel name.
export const CHANNEL = "memo:summarize";

// L-1, L-2: only LF or CRLF break lines; a lone CR (or U+2028/U+2029) does not.
const LINE_BREAK = /\r?\n/;

// W-1: one or more JavaScript `\s` characters (Unicode whitespace + line terminators).
const WHITESPACE_RUN = /\s+/;

// T-1, T-2, T-4: `#` followed by the longest run of Unicode letters, numbers or `_`,
// code-point aware (u flag), global and non-overlapping, no left-boundary condition.
const TAG_PATTERN = /#([\p{L}\p{N}_]+)/gu;

const WORDS_PER_MINUTE = 200; // R-1
const MAX_TAGS = 3; // T-7

// IN-1, IN-2: nullish -> "", everything else -> String(value).
function toText(input) {
  return String(input ?? "");
}

// L-3, L-4: count pieces that are non-empty after String.prototype.trim.
function countLines(text) {
  return text.split(LINE_BREAK).filter((piece) => piece.trim() !== "").length;
}

// W-1..W-3: split on whitespace runs and drop empty pieces.
function countWords(text) {
  return text.split(WHITESPACE_RUN).filter((piece) => piece !== "").length;
}

// R-1, R-2: ceil(words / 200), at least 1.
function readingMinutesFor(words) {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

// T-6: UTF-16 code-unit order via plain `<` / `>` (not localeCompare).
function compareCodeUnits(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// T-1..T-8
function topTags(text) {
  // A Map keeps arbitrary keys (e.g. "__proto__") safe from prototype quirks.
  const counts = new Map();
  for (const match of text.matchAll(TAG_PATTERN)) {
    const tag = match[1].toLowerCase(); // T-5: locale-independent lowercase
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })) // O-3, T-8: key order tag, count
    .sort((a, b) => b.count - a.count || compareCodeUnits(a.tag, b.tag)) // T-6
    .slice(0, MAX_TAGS); // T-7
}

export function summarize(input) {
  const text = toText(input);
  const words = countWords(text);

  // O-1: exactly these four keys, in this order.
  return {
    lines: countLines(text),
    words,
    readingMinutes: readingMinutesFor(words),
    tags: topTags(text),
  };
}
