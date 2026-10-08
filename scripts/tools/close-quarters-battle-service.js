import {
  normalizeGunsSpecialty, collectGunsSkills, explicitAttackSpecialties,
  flattenEntries, finiteLevel, relativeLevel, specialtyFromPrerequisite
} from "./targeted-attack-service.js";

const CQB_NAME = /^Close[-\s]Quarters\s+Battle(?=\s|\(|$)/iu;
const ACUTE_VISION_NAME = /^Acute\s+Vision(?=\s|\(|$)/iu;

function techniqueSpecialty(entry) {
  for (const value of [entry?.governingSpecialty, entry?.weaponSpecialty,
    entry?.specialty, entry?.specialization]) {
    const specialty = normalizeGunsSpecialty(value);
    if (specialty) return specialty;
  }
  for (const value of [entry?.governingSkill, entry?.governingSkillName,
    entry?.skill, entry?.skillName, entry?.default, entry?.defaults,
    entry?.prerequisite, entry?.prereq]) {
    const specialty = specialtyFromPrerequisite(value);
    if (specialty) return specialty;
  }
  for (const name of [entry?.name, entry?.originalName]) {
    if (!CQB_NAME.test(String(name ?? ""))) continue;
    for (const match of String(name).matchAll(/\(([^()]*)\)/gu)) {
      const specialty = normalizeGunsSpecialty(match[1]);
      if (specialty) return specialty;
    }
  }
  return null;
}

function finiteNonnegative(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
}

export function getCloseQuartersBattleRange(actor) {
  const per = finiteNonnegative(actor?.system?.attributes?.PER?.value) ??
    finiteNonnegative(actor?.system?.attributes?.PER?.import) ??
    finiteNonnegative(actor?.system?.per) ?? null;
  if (per === null) return null;
  const acute = flattenEntries(actor?.system?.ads)
    .filter(entry => [entry?.name, entry?.originalName].some(name => ACUTE_VISION_NAME.test(String(name ?? ""))))
    .map(entry => finiteNonnegative(entry?.levels) ?? finiteNonnegative(entry?.level) ??
      finiteNonnegative(entry?.import) ?? 0);
  const explicitTotal = per + Math.max(0, ...acute);
  const vision = finiteNonnegative(actor?.system?.vision);
  return Math.max(explicitTotal, vision ?? per);
}

export function resolveCloseQuartersBattle({ actor, attack, governingSpecialty, governingSkill,
  moveAndAttack, movePenalty, physicalDistance } = {}) {
  const distance = physicalDistance === null || physicalDistance === undefined ||
    physicalDistance === "" ? Number.NaN : Number(physicalDistance);
  const maxDistance = getCloseQuartersBattleRange(actor);
  if (!moveAndAttack || !Number.isFinite(distance) || distance < 0 ||
      maxDistance === null || distance > maxDistance) return null;
  const skills = collectGunsSkills(actor);
  const candidates = explicitAttackSpecialties(attack, skills);
  const specialty = governingSkill
    ? (governingSkill.family === "guns" ? governingSkill.specialty : null)
    : normalizeGunsSpecialty(governingSpecialty) ?? (candidates.length === 1 ? candidates[0] : null);
  const matchingSkills = skills.filter(skill => skill.specialty === specialty && Number.isFinite(skill.level));
  const governing = governingSkill?.family === "guns" ? governingSkill
    : governingSkill ? null : matchingSkills.length === 1 ? matchingSkills[0] : null;
  const baseLevel = Number(attack?.level);
  if (!governing || !Number.isFinite(baseLevel) || baseLevel <= 0 ||
      !Number.isFinite(movePenalty) || movePenalty > 0) return null;
  let best = null;
  for (const entry of flattenEntries(actor?.system?.skills)) {
    if (![entry?.name, entry?.originalName].some(name => CQB_NAME.test(String(name ?? "")))) continue;
    if (techniqueSpecialty(entry) !== specialty) continue;
    const relative = relativeLevel(entry);
    const imported = finiteLevel(entry);
    const level = Number.isFinite(relative)
      ? governing.level + Math.max(0, Math.min(4, Math.trunc(relative)))
      : Number.isFinite(imported)
        ? Math.max(governing.level, Math.min(governing.level + 4, imported)) : null;
    if (level !== null && (!best || level > best.level)) best = { entry, level };
  }
  if (!best) return null;
  const techniqueRelativeLevel = best.level - governing.level;
  const weaponTechniqueLevel = baseLevel + techniqueRelativeLevel;
  const cqbBase = Math.min(baseLevel, weaponTechniqueLevel + movePenalty);
  return {
    specialty, governingSkillLevel: governing.level,
    governingSkillName: governing.name ?? "Guns (" + governing.label + ")",
    techniqueLevel: best.level, techniqueRelativeLevel, weaponTechniqueLevel,
    movePenalty, cqbBase, effectivePenalty: cqbBase - baseLevel,
    physicalDistance: distance, maxDistance, entry: best.entry,
    label: String(best.entry.name ?? "Close-Quarters Battle (" + (governing.label ?? specialty) + ")")
  };
}
