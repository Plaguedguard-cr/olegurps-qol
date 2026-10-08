import { finiteLevel, normalizeGunsSpecialty } from "./targeted-attack-service.js";
import { getAttackOverrideKey } from "./weapon-attack-overrides.js";

const FAMILIES = new Set(["guns", "beam weapons", "gunner", "bow", "crossbow",
  "sling", "blowpipe", "thrown weapon", "throwing", "innate attack",
  "artillery", "liquid projector"]);

function parseSkill(entry) {
  const name = String(entry?.name ?? entry?.originalName ?? "").trim();
  const match = name.match(/^([^()]+?)(?:\s*\/\s*TL\s*\d+)?\s*(?:\(([^()]*)\))?$/iu);
  if (!match) return null;
  const family = match[1].trim().toLowerCase().replace(/\s+tl\s*\d+$/iu, "");
  if (!FAMILIES.has(family) || String(entry?.type ?? "skill").toLowerCase() === "technique") return null;
  const level = finiteLevel(entry);
  if (!Number.isFinite(level) || level <= 0) return null;
  return { name, family, specialty: family === "guns" ? normalizeGunsSpecialty(match[2]) : null, level };
}

export function listRangedGoverningSkills(actor) {
  const result = [];
  const visit = (tree, path) => {
    for (const [index, entry] of Object.entries(tree ?? {})) {
      if (!entry || typeof entry !== "object") continue;
      const entryPath = path + "." + index;
      const parsed = parseSkill(entry);
      if (parsed) {
        const identity = [entry.uuid, entry.id, entry._id, entry.itemid, entry.itemId]
          .find(value => String(value ?? "").trim());
        result.push({ ...parsed, key: identity ? "id:" + identity : "path:" + entryPath,
          entry, path: entryPath });
      }
      visit(entry.contains, entryPath + ".contains");
      visit(entry.collapsed, entryPath + ".collapsed");
    }
  };
  visit(actor?.system?.skills, "system.skills");
  return result;
}

export function bindingForGoverningSkill(skill) {
  return skill ? { key: skill.key, name: skill.name } : null;
}

export function resolveRangedGoverningSkill({ actor, binding, legacySpecialty,
  allowAutomatic = false } = {}) {
  const skills = listRangedGoverningSkills(actor);
  const selectedKey = String(binding?.key ?? "").trim();
  const selectedName = String(binding?.name ?? "").trim().toLowerCase();
  if (selectedKey || selectedName) {
    const keyed = selectedKey ? skills.find(skill => skill.key === selectedKey) : null;
    if (keyed) return { ...keyed, source: "binding" };
    const named = selectedName ? skills.filter(skill => skill.name.toLowerCase() === selectedName) : [];
    return named.length === 1 ? { ...named[0], source: "name-fallback" } : null;
  }
  const specialty = normalizeGunsSpecialty(legacySpecialty);
  if (specialty) {
    const matches = skills.filter(skill => skill.family === "guns" && skill.specialty === specialty);
    return matches.length === 1 ? { ...matches[0], source: "legacy-specialty" } : null;
  }
  return allowAutomatic && skills.length === 1 ? { ...skills[0], source: "single-skill" } : null;
}

export function getRangedGoverningAttackKey(reference) {
  const raw = getAttackOverrideKey(reference);
  return raw ? encodeURIComponent(raw).replaceAll(".", "%2E") : "";
}
