const EXPLICIT_REFERENCE_PATTERNS = [
  /аналогич(?:ен|на|но|ны|ным|ной|ному|ного)?\s+(?:результат(?:у|ом|а)?\s*)?(\d+)\b/giu,
  /то\s+же,?\s+что\s+(?:результат(?:у|ом|а)?\s*)?(\d+)\b/giu,
  /как\s+(?:в\s+)?(?:пункте\s+|результате\s+)?(\d+)\b/giu,
  /см\.?\s*(?:результат(?:а|у|ом)?\s*)?(\d+)\b/giu,
  /(?:примените|используйте)\s+результат\s+(\d+)\b/giu
];

function findEntryIndex(entries, result) {
  return entries.findIndex(entry => result >= Number(entry[0]) && result <= Number(entry[1]));
}

function findReferencedEntryIndexes(entries, sourceIndex) {
  const text = String(entries[sourceIndex]?.[3] ?? "");
  const indexes = new Set();

  for (const pattern of EXPLICIT_REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const index = findEntryIndex(entries, Number(match[1]));
      if (index >= 0) indexes.add(index);
    }
  }

  if (/как\s+(?:указано\s+)?выше/iu.test(text) && sourceIndex > 0) {
    indexes.add(sourceIndex - 1);
  }

  return indexes;
}

export function resolveTableReferences(entries, sourceEntry) {
  if (!Array.isArray(entries) || !sourceEntry) return [];
  const sourceIndex = entries.indexOf(sourceEntry);
  if (sourceIndex < 0) return [];

  const visited = new Set([sourceIndex]);
  const resolved = [];

  const visit = (entryIndex, depth) => {
    if (depth >= entries.length) return;
    for (const referencedIndex of findReferencedEntryIndexes(entries, entryIndex)) {
      if (visited.has(referencedIndex)) continue;
      visited.add(referencedIndex);
      resolved.push(entries[referencedIndex]);
      visit(referencedIndex, depth + 1);
    }
  };

  visit(sourceIndex, 0);
  return resolved;
}

export function buildTableNote({ entries, entry, note, escapeHTML }) {
  const references = resolveTableReferences(entries, entry);
  if (!note && references.length === 0) return "";

  const esc = value => typeof escapeHTML === "function" ? escapeHTML(String(value ?? "")) : String(value ?? "");
  const parts = [];
  if (note) parts.push(`<div>${esc(note)}</div>`);
  if (references.length) {
    const margin = note ? "margin-top:8px;" : "";
    parts.push(`<div style="${margin}display:grid;gap:6px">${references.map(reference => `<div><strong>Результат ${esc(reference[2])}</strong><div>${esc(reference[3])}</div></div>`).join("")}</div>`);
  }

  return `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">Примечание таблицы</summary><div style="margin-top:5px">${parts.join("")}</div></details>`;
}