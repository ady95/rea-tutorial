// Memo statistics, reimplemented from REQUIREMENTS.md (requirement IDs in comments).

const LINE_BREAK = /\r?\n/; // R-4.1.1: LF or CRLF; a lone CR is not a break
const NON_SPACE_RUN = /\S+/g; // R-4.2.1: words are runs of non-whitespace
const TAG = /#([\p{L}\p{N}_]+)/gu; // R-4.4.1
const WORDS_PER_MINUTE = 200; // R-4.3.1
const MAX_TAGS = 3; // R-4.4.7

/**
 * @param {unknown} input text from the renderer; null/undefined become "" (R-2.2)
 * @returns {{lines: number, words: number, readingMinutes: number,
 *            tags: {tag: string, count: number}[]}}
 */
export function summarize(input) {
  const text = String(input ?? "");
  const words = countWords(text);
  return {
    lines: countLines(text),
    words,
    readingMinutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
    tags: topTags(text),
  };
}

// R-4.1: lines whose trimmed content is not empty.
function countLines(text) {
  let count = 0;
  for (const line of text.split(LINE_BREAK)) {
    if (line.trim().length > 0) count++;
  }
  return count;
}

// R-4.2
function countWords(text) {
  return text.match(NON_SPACE_RUN)?.length ?? 0;
}

// R-4.4: case-insensitive tag counts, count desc then code-unit asc, top 3.
function topTags(text) {
  const counts = new Map();
  for (const [, name] of text.matchAll(TAG)) {
    const tag = name.toLowerCase(); // R-4.4.4
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || compareCodeUnits(a.tag, b.tag))
    .slice(0, MAX_TAGS);
}

// R-4.4.6: plain UTF-16 code-unit order, not locale order.
function compareCodeUnits(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
