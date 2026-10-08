import { flattenEntries, finiteLevel, relativeLevel, normalizeGunsSpecialty,
  specialtyFromPrerequisite } from "./targeted-attack-service.js";
import { normalizeBulk } from "./fire-service.js";

const CLOSE_HIP_NAME = /^Close[-\s]Hip\s+Shooting(?=\s|\(|$)/iu;

function techniqueSpecialty(entry) {
  for (const value of [entry?.governingSpecialty, entry?.weaponSpecialty,
    entry?.specialty, entry?.specialization]) {
    const specialty = normalizeGunsSpecialty(value);
    if (specialty) return specialty;
  }
  for (const value of [entry?.prerequisite, entry?.prereq, entry?.governingSkill,
    entry?.governingSkillName, entry?.default, entry?.defaults]) {
    const specialty = specialtyFromPrerequisite(value);
    if (specialty) return specialty;
  }
  const name = String(entry?.name ?? entry?.originalName ?? "");
  const match = name.match(/\(([^()]*)\)\s*$/u);
  return match ? normalizeGunsSpecialty(match[1]) : null;
}

export function findCloseHipShooting({ actor, governingSkill } = {}) {
  if (governingSkill?.family !== "guns" || !governingSkill.specialty ||
      !Number.isFinite(governingSkill.level)) return null;
  let best = null;
  for (const entry of flattenEntries(actor?.system?.skills)) {
    if (![entry?.name, entry?.originalName].some(name => CLOSE_HIP_NAME.test(String(name ?? "")))) continue;
    if (techniqueSpecialty(entry) !== governingSkill.specialty) continue;
    const imported = finiteLevel(entry);
    const relative = relativeLevel(entry);
    const rawLevel = Number.isFinite(imported) ? imported
      : Number.isFinite(relative) ? governingSkill.level + relative : null;
    if (!Number.isFinite(rawLevel)) continue;
    const level = Math.max(governingSkill.level, Math.min(governingSkill.level + 3, rawLevel));
    if (!best || level > best.level) best = { entry, level, relativeLevel: level - governingSkill.level };
  }
  return best;
}

export function resolveCloseHipShooting({ actor, attack, governingSkill, enabled } = {}) {
  const technique = findCloseHipShooting({ actor, governingSkill });
  if (!enabled || !technique) return null;
  const baseLevel = Number(attack?.level);
  const bulk = normalizeBulk(attack?.data?.bulk ?? attack?.bulk);
  if (!Number.isFinite(baseLevel) || baseLevel <= 0 || !Number.isFinite(bulk)) return null;
  const weaponTechniqueLevel = baseLevel + technique.relativeLevel;
  const closeHipBase = Math.min(baseLevel, weaponTechniqueLevel + bulk);
  return {
    label: String(technique.entry.name ?? "Close-Hip Shooting"),
    governingSkillName: governingSkill.name,
    governingSkillLevel: governingSkill.level,
    techniqueLevel: technique.level,
    techniqueRelativeLevel: technique.relativeLevel,
    weaponTechniqueLevel,
    bulk,
    closeHipBase,
    effectivePenalty: closeHipBase - baseLevel,
    entry: technique.entry
  };
}

