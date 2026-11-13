// Memo Stats: clean-room reimplementation from REQUIREMENTS.md (sections 2-5).
// Pure function, no dependencies (R5.1), no validation or throwing (R5.2).

const WORDS_PER_MINUTE = 200; // R4.3.1

export function summarize(text) {
  // R2.1/R2.2 (optional per R2.3): null/undefined -> "", otherwise String(value).
  const src = text == null ? "" : String(text);

  // R4.1.1: only LF and CRLF separate lines (lone CR and U+2028 do not).
  // R4.1.2/R4.1.3: count pieces that are non-empty after String#trim().
  let lines = 0;
  for (const piece of src.split(/\r?\n/)) {
    if (piece.trim() !== "") lines++;
  }

  // R4.2.1/R4.2.2: split on runs of JS \s, drop empty edge pieces.
  // R4.2.3: punctuation is not special.
  let words = 0;
  for (const piece of src.split(/\s+/)) {
    if (piece !== "") words++;
  }

  // R4.3.1: max(1, ceil(words / 200)).
  const readingMinutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  // R4.4.1-R4.4.4: '#' followed by a maximal run of L*, N*, or '_'; no word
  // boundary required; global left-to-right non-overlapping scan.
  // R4.4.5/R4.4.6: lowercase (locale-independent) before counting.
  const counts = new Map();
  for (const m of src.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    const tag = m[1].toLowerCase();
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  // R4.4.7: count desc, then tag asc by UTF-16 code units (< / >, not localeCompare).
  // R4.4.8: keep at most 3. R4.4.9: { tag, count } key order.
  const tags = [...counts]
    .sort(([ta, ca], [tb, cb]) => (cb - ca) || (ta < tb ? -1 : ta > tb ? 1 : 0))
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  // Section 3: keys in this exact order.
  return { lines, words, readingMinutes, tags };
}

export default summarize;
