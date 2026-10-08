import {
  normalizeGunsSpecialty, collectGunsSkills, explicitAttackSpecialties,
  flattenEntries, finiteLevel, relativeLevel, specialtyFromPrerequisite
} from "./targeted-attack-service.js";

const QUICK_SHOT_NAME = /^Quick[-\s]Shot(?=\s|\(|$)/iu;

function techniqueSpecialty(entry) {
  const structured = [entry?.governingSpecialty, entry?.weaponSpecialty, entry?.specialty,
    entry?.specialization, entry?.governingSkill, entry?.governingSkillName,
    entry?.skill, entry?.skillName, entry?.default, entry?.defaults,
    entry?.prerequisite, entry?.prereq];
  for (const value of structured) {
    const specialty = specialtyFromPrerequisite(value);
    if (specialty) return specialty;
  }
  const name = [entry?.name, entry?.originalName].map(String).find(value => QUICK_SHOT_NAME.test(value)) ?? "";
  if (!name) return null;
  for (const match of name.matchAll(/\(([^()]*)\)/gu)) {
    const specialty = normalizeGunsSpecialty(match[1]);
    if (specialty) return specialty;
  }
  return null;
}

export function getRangedRapidStrikeSpecialties({ actor, attack } = {}) {
  const skills = collectGunsSkills(actor);
  const explicit = explicitAttackSpecialties(attack, skills);
  const candidates = explicit.length ? explicit : [...new Set(skills.map(skill => skill.specialty))];
  return candidates.map(value => ({ value, label: skills.find(skill => skill.specialty === value)?.label ?? value }));
}

export function resolveRangedRapidStrike({ actor, attack, governingSpecialty, governingSkill } = {}) {
  const skills = collectGunsSkills(actor);
  const candidates = getRangedRapidStrikeSpecialties({ actor, attack });
  const specialty = governingSkill
    ? (governingSkill.family === "guns" ? governingSkill.specialty : null)
    : normalizeGunsSpecialty(governingSpecialty) ?? (candidates.length === 1 ? candidates[0].value : null);
  const matchingSkills = skills.filter(skill => skill.specialty === specialty && Number.isFinite(skill.level));
  const governing = governingSkill?.family === "guns" ? governingSkill
    : governingSkill ? null : matchingSkills.length === 1 ? matchingSkills[0] : null;
  let best = null;
  if (governing) for (const entry of flattenEntries(actor?.system?.skills)) {
    if (![entry?.name, entry?.originalName].some(name => QUICK_SHOT_NAME.test(String(name ?? "")))) continue;
    if (techniqueSpecialty(entry) !== specialty) continue;
    const relative = relativeLevel(entry);
    const level = finiteLevel(entry);
    const modifier = Number.isFinite(relative) ? relative
      : Number.isFinite(level) ? level - governing.level : null;
    if (!Number.isFinite(modifier)) continue;
    const penalty = Math.max(-6, Math.min(0, Math.trunc(modifier)));
    if (!best || penalty > best.penalty) best = { entry, penalty, level, relative };
  }
  return {
    specialty, governingSkillLevel: governing?.level ?? null,
    penalty: best?.penalty ?? -6,
    quickShotBonus: best ? best.penalty + 6 : 0,
    quickShotLabel: best ? "Quick-Shot (" + (candidates.find(option => option.value === specialty)?.label ?? specialty) + ")" : null,
    quickShotEntry: best?.entry ?? null
  };
}

export function validateRangedRapidStrikeSplit(shots1, shots2, availableRoF) {
  return Number.isInteger(shots1) && shots1 >= 1 && Number.isInteger(shots2) && shots2 >= 1 &&
    Number.isInteger(availableRoF) && shots1 + shots2 <= availableRoF;
}