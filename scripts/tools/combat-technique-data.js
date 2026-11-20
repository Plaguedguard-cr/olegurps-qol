// Shared read-only GGA skill traversal and numeric decoding.
export function flattenEntries(tree, result = [], seen = new Set()) {
  if (!tree || typeof tree !== "object" || seen.has(tree)) return result;
  seen.add(tree);
  if (Array.isArray(tree)) {
    for (const entry of tree) flattenEntries(entry, result, seen);
    return result;
  }
  for (const entry of Object.values(tree)) {
    if (!entry || typeof entry !== "object") continue;
    result.push(entry);
    flattenEntries(entry.contains, result, seen);
    flattenEntries(entry.collapsed, result, seen);
  }
  return result;
}
export function finiteLevel(entry) {
  for (const key of ["level", "import"]) {
    const source = entry?.[key];
    if (source === null || source === undefined || String(source).trim() === "") continue;
    const value = Number(source);
    if (Number.isFinite(value)) return Math.trunc(value);
  }
  return null;
}
export function relativeLevel(entry) {
  for (const key of ["relativelevel", "relativeLevel", "relative", "rsl"]) {
    const text = String(entry?.[key] ?? "").trim();
    if (/^[+-]?\d+$/.test(text)) return Number(text);
  }
  return null;
}

// LT/BS historically traverse object rows, including nested contains/collapsed.
// Keep that policy distinct from ranged array containers; do not reinterpret imports.
export function objectSkillRows(tree) {
  const out=[];
  const walk=t=>{for(const r of Object.values(t??{}))if(r&&typeof r==='object'){out.push(r);walk(r.contains);walk(r.collapsed);}};
  walk(tree);return out;
}
export function readCombatTechniqueSkills(actor, { objectRows=false }={}) {
  return objectRows ? objectSkillRows(actor?.system?.skills) : flattenEntries(actor?.system?.skills);
}
