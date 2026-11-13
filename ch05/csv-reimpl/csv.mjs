// Independent implementation written from SPEC.md only.

const HEADER = "id,title";
const LF = "\n";

function quoteField(value) {
  let text = String(value);
  let escaped = "";
  for (const ch of text) {
    escaped += ch === '"' ? '""' : ch;
  }
  return '"' + escaped + '"';
}

export function toCsv(notes) {
  if (notes === null || notes === undefined || typeof notes.map !== "function") {
    throw new TypeError("toCsv expects an array of notes");
  }
  let out = HEADER + LF;
  for (const note of notes) {
    out += String(note.id) + "," + quoteField(note.title) + LF;
  }
  return out;
}
