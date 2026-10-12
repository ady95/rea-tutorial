// Independent re-implementation written from SPEC.md only.

const HEADER = "id,title";
const EOL = "\n";

function quoteField(value) {
  return '"' + String(value).split('"').join('""') + '"';
}

export function toCsv(notes) {
  const lines = [HEADER];
  for (const note of notes) {
    lines.push(String(note.id) + "," + quoteField(note.title));
  }
  let out = "";
  for (const line of lines) {
    out += line + EOL;
  }
  return out;
}
