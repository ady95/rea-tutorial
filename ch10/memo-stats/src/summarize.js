// 메모 텍스트의 통계를 만든다
const WORDS_PER_MINUTE = 200;

function extractTags(text) {
  const counts = new Map();
  for (const match of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    const tag = match[1].toLowerCase();
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
    .slice(0, 3);
}

function summarize(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  const words = text.split(/\s+/).filter((word) => word !== "").length;
  const readingMinutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { lines, words, readingMinutes, tags: extractTags(text) };
}

module.exports = { summarize };
