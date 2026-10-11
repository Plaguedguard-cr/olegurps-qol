import { readWeaponSkillTLPolicy } from "./weapon-skill-tl-policy.js";

// Catalog defaults are directed rules. Never infer defaults from similar names or recurse through them.
const clean = value => String(value ?? "").normalize("NFKC").trim();
const canonical = value => clean(value).toLowerCase().replace(/\s+/g, " ");
const specialties = { law: "light anti-armor weapon", lmg: "light machine gun", smg: "submachine gun" };
const specialty = value => specialties[canonical(value)] ?? canonical(value);
export function parseStandaloneSkill(value, specialization = null) {
  const match = clean(value).match(/^(.+?)(?:\s*\/\s*TL\s*(\d+))?\s*(?:\(([^()]*)\))?$/iu);
  return match ? { family: canonical(match[1]), specialty: specialty(specialization ?? match[3]),
    tl: match[2] === undefined ? null : Number(match[2]), name: clean(value) } : null;
}
function learnedSkills(actor) {
  const result = [];
  const visit = tree => { for (const entry of Object.values(tree ?? {})) {
    if (!entry || typeof entry !== "object") continue;
    const parsed = parseStandaloneSkill(entry.name ?? entry.originalName);
    const level = Number(entry.level ?? entry.import);
    if (parsed && canonical(entry.type) !== "technique" && Number.isFinite(level) && level > 0 &&
        (Number(entry.points) > 0 || entry.learned === true)) result.push({ ...parsed, level: Math.trunc(level), entry });
    visit(entry.contains); visit(entry.collapsed);
  } };
  visit(actor?.system?.skills);
  return result;
}
const sameSkill = (left, right) => left.family === right.family && left.specialty === right.specialty;
const technical = new Set(["guns", "beam weapons", "gunner", "artillery", "liquid projector"]);
function tlPenalty(source, target) {
  if (source.family.endsWith("!")) return 0;
  if (!technical.has(target.family)) return 0;
  if (source.tl === null || target.tl === null) return source.tl === target.tl ? 0 : null;
  const difference = target.tl - source.tl;
  if (target.family !== "artillery") return -Math.abs(difference); // DX-based technological skills, B168.
  if (difference > 0) return -5 * difference;
  return difference < 0 ? -(2 * Math.abs(difference) - 1) : 0;
}
export function resolveStandaloneSkill({ actor, record, mode, user = globalThis.game?.user } = {}) {
  const tlPolicy = readWeaponSkillTLPolicy(user);
  const snapshot = mode?.snapshot;
  const explicit = clean(mode?.overrides?.governingSkill);
  const required = explicit ? parseStandaloneSkill(explicit) :
    snapshot?.governing_skill?.status === "resolved" ? parseStandaloneSkill(
      snapshot.governing_skill.skill.name, snapshot.governing_skill.skill.specialization) : null;
  if (!required) return { resolved: false, level: null, tlPolicy, reason: "В источнике не определён требуемый навык. Укажите точный навык в настройках режима." };
  if (technical.has(required.family) && required.tl === null) {
    const tl = clean(record?.equipmentSnapshot?.tech_level);
    required.tl = /^\d+$/.test(tl) ? Number(tl) : null;
  }
  const name = explicit ? explicit.replace(/\s*\([^()]*\)\s*$/, "").replace(/\s*\/\s*TL\s*\d+\s*/iu, "") : snapshot.governing_skill.skill.name;
  const label = name +
    (required.tl === null ? "" : "/TL" + required.tl) +
    (required.specialty ? " (" + (explicit ? explicit.match(/\(([^()]*)\)/)?.[1] ?? required.specialty : snapshot.governing_skill.skill.specialization) + ")" : "");
  const learned = learnedSkills(actor);
  const exact = learned.filter(s => sameSkill(s, required) && s.tl === required.tl).sort((a,b) => b.level-a.level)[0];
  const common = { name: label, family: required.family, specialty: required.family === "guns" ?
    ({ "light anti-armor weapon": "law", "light machine gun": "lmg", "submachine gun": "smg" }[required.specialty] ?? required.specialty) : required.specialty,
    tl: required.tl, tlPolicy, key: "standalone:" + record.id + ":" + mode.modeId };
  if (exact) return { ...common, resolved: true, level: exact.level, learned: true,
    source: "learned", sourceName: exact.name, penalty: 0, entry: exact.entry, candidates: [] };
  // A manual replacement without catalog rules may use an exact learned skill only.
  const original = snapshot?.governing_skill?.skill;
  const originalIdentity = original && parseStandaloneSkill(original.name, original.specialization);
  const rules = !explicit || originalIdentity && sameSkill(originalIdentity, required) ? snapshot?.defaults ?? [] : [];
  const candidates = [];
  for (const rule of rules) {
    const modifier = Number(rule.modifier);
    if (!Number.isFinite(modifier)) continue;
    if (rule.type === "skill") {
      const from = parseStandaloneSkill(rule.name, rule.specialization);
      if (!from) continue;
      for (const skill of learned) {
        // An explicitly unspecialized catalog rule means other specialties of this same skill, never another family.
        if (skill.family !== from.family || from.specialty && skill.specialty !== from.specialty) continue;
        const standardTLPenalty = tlPenalty(skill, required);
        if (standardTLPenalty === null) continue;
        const adjustment = tlPolicy.ignoreWeaponSkillTLDifferences && skill.family === required.family ? 0 : standardTLPenalty;
        candidates.push({ level: skill.level + modifier + adjustment, sourceName: skill.name,
          sourceLevel: skill.level, penalty: modifier + adjustment, defaultPenalty: modifier,
          tlPenalty: adjustment, standardTLPenalty, rule: structuredClone(rule), source: "skill-default" });
      }
    } else if (["dx", "iq", "ht", "st", "per", "will"].includes(canonical(rule.type))) {
      const attribute = canonical(rule.type).toUpperCase();
      const raw = actor?.system?.attributes?.[attribute]?.value ?? actor?.system?.[canonical(rule.type)]?.value;
      const value = raw === null || raw === undefined || clean(raw) === "" ? NaN : Number(raw);
      if (Number.isFinite(value)) candidates.push({ level: Math.min(20, value) + modifier,
        sourceName: attribute, sourceLevel: value, penalty: modifier, rule: structuredClone(rule), source: "attribute-default" });
    }
  }
  candidates.sort((a,b) => b.level-a.level);
  return candidates.length ? { ...common, ...candidates[0], candidates, resolved: true, learned: false } :
    { ...common, resolved: false, level: null, learned: false, candidates,
      reason: "Нет точного изученного навыка или подтверждённого допустимого default (проверьте специализацию и TL)." };
}
export function standaloneSkillDescription(skill) {
  if (!skill?.resolved) return skill?.reason ?? "Навык не определён.";
  return skill.name + ": " + skill.level + (skill.learned ? " — изучен" :
    " — не изучен; default от " + skill.sourceName + " (" + (skill.penalty > 0 ? "+" : "") + skill.penalty + ")");
}
