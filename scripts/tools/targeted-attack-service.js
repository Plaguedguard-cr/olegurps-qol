const aliasKey = value => String(value ?? "")
  .normalize("NFKC").trim().toLowerCase()
  .replace(/[ё]/g, "е").replace(/[‐‑‒–—−]/g, "-")
  .replace(/[._]/g, " ").replace(/\s+/g, " ");

const TARGET_ALIASES = new Map();
const SPECIALTY_ALIASES = new Map();
function registerAliases(map, canonical, aliases) {
  for (const alias of [canonical, ...aliases]) map.set(aliasKey(alias), canonical);
}
registerAliases(TARGET_ALIASES, "face", ["Face", "Лицо"]);
registerAliases(TARGET_ALIASES, "vitals", ["Vitals", "Vital Organs", "ЖВО", "Жизненно важные органы", "Жизненноважные органы"]);
registerAliases(TARGET_ALIASES, "eye", ["Eye", "Eyes", "Глаз", "Глаза"]);
registerAliases(TARGET_ALIASES, "skull", ["Skull", "Череп"]);
registerAliases(TARGET_ALIASES, "neck", ["Neck", "Шея"]);
registerAliases(TARGET_ALIASES, "arm", ["Arm", "Arms", "Рука", "Руки"]);
registerAliases(TARGET_ALIASES, "hand", ["Hand", "Hands", "Кисть", "Кисти"]);
registerAliases(TARGET_ALIASES, "leg", ["Leg", "Legs", "Нога", "Ноги"]);
registerAliases(TARGET_ALIASES, "foot", ["Foot", "Feet", "Forefoot", "Front Foot", "Hind Foot", "Hoof", "Hooves", "Ступня", "Ступни", "Стопа", "Стопы", "Переднее копыто", "Заднее копыто", "Копыто", "Копыта"]);
registerAliases(TARGET_ALIASES, "groin", ["Groin", "Пах"]);
registerAliases(TARGET_ALIASES, "torso", ["Torso", "Торс"]);
registerAliases(TARGET_ALIASES, "human-torso", ["Human Torso", "Humanoid Torso", "Человеческий торс"]);
registerAliases(TARGET_ALIASES, "animal-torso", ["Animal Torso", "Horse Torso", "Конский торс", "Животный торс"]);
registerAliases(TARGET_ALIASES, "extremity", ["Extremity", "Extremities", "Конечность", "Конечности"]);
registerAliases(TARGET_ALIASES, "tail", ["Tail", "Хвост"]);
registerAliases(TARGET_ALIASES, "wing", ["Wing", "Wings", "Крыло", "Крылья"]);
registerAliases(TARGET_ALIASES, "wing-right", ["Right Wing", "Правое крыло"]);
registerAliases(TARGET_ALIASES, "wing-left", ["Left Wing", "Левое крыло"]);
registerAliases(TARGET_ALIASES, "foreleg", ["Foreleg", "Fore Leg", "Передняя нога", "Передние ноги"]);
registerAliases(TARGET_ALIASES, "mid-leg", ["Mid Leg", "Middle Leg", "Midleg", "Средняя нога", "Средние ноги"]);
registerAliases(TARGET_ALIASES, "foreleg-right", ["Right Foreleg", "Right Fore Leg", "Правая передняя нога"]);
registerAliases(TARGET_ALIASES, "foreleg-left", ["Left Foreleg", "Left Fore Leg", "Левая передняя нога"]);
registerAliases(TARGET_ALIASES, "hindleg", ["Hind Leg", "Hindleg", "Задняя нога", "Задние ноги"]);
registerAliases(TARGET_ALIASES, "hind-leg", ["Hind Leg", "Hindleg", "Задняя нога", "Задние ноги"]);
registerAliases(TARGET_ALIASES, "hindleg-right", ["Right Hind Leg", "Right Hindleg", "Правая задняя нога"]);
registerAliases(TARGET_ALIASES, "hindleg-left", ["Left Hind Leg", "Left Hindleg", "Левая задняя нога"]);
registerAliases(TARGET_ALIASES, "foot-right", ["Right Foot", "Правая ступня", "Правая стопа"]);
registerAliases(TARGET_ALIASES, "foot-left", ["Left Foot", "Левая ступня", "Левая стопа"]);
registerAliases(SPECIALTY_ALIASES, "pistol", ["Pistol", "Пистолет"]);
registerAliases(SPECIALTY_ALIASES, "rifle", ["Rifle", "Винтовка"]);
registerAliases(SPECIALTY_ALIASES, "shotgun", ["Shotgun", "Дробовик"]);
registerAliases(SPECIALTY_ALIASES, "smg", ["SMG", "Submachine Gun", "Submachinegun", "ПП", "Пистолет-пулемёт", "Пистолет пулемёт"]);

export function normalizeTargetedAttackLocation(value) {
  if (value && typeof value === "object") {
    for (const key of ["id", "key", "name", "label", "location", "target"]) {
      const normalized = normalizeTargetedAttackLocation(value[key]);
      if (normalized) return normalized;
    }
    return null;
  }
  const exact = TARGET_ALIASES.get(aliasKey(value));
  if (exact) return exact;
  const matches = [...new Set(String(value ?? "").split(/\s*[/,;:]\s*/u)
    .map(part => TARGET_ALIASES.get(aliasKey(part))).filter(Boolean))];
  return matches.length === 1 ? matches[0] : null;
}
export function normalizeGunsSpecialty(value) {
  if (value && typeof value === "object") {
    for (const key of ["specialty", "specialization", "name", "originalName", "skillName", "label"]) {
      const normalized = normalizeGunsSpecialty(value[key]);
      if (normalized) return normalized;
    }
    return null;
  }
  return SPECIALTY_ALIASES.get(aliasKey(value)) ?? null;
}
function normalizeGunsFamily(value) {
  return aliasKey(value).replace(/\s*\/\s*tl\s*\d+\s*$/i, "").replace(/\s+tl\s*\d+\s*$/i, "").trim();
}
function parseGunsSkillString(value) {
  const text = String(value ?? "").normalize("NFKC").trim();
  const match = text.match(/^(.+?)(?:\s*\/\s*TL\s*\d+)?\s*\(([^()]*)\)\s*$/iu);
  if (!match || normalizeGunsFamily(match[1]) !== "guns") return null;
  const specialty = normalizeGunsSpecialty(match[2]);
  return specialty ? { specialty, label: match[2].trim(), text } : null;
}
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
function firstCanonicalValue(values, normalizer) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstCanonicalValue(value, normalizer);
      if (nested) return nested;
      continue;
    }
    const normalized = normalizer(value);
    if (normalized) return normalized;
  }
  return null;
}
export function specialtyFromPrerequisite(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = specialtyFromPrerequisite(entry);
      if (parsed) return parsed;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const key of ["specialty", "specialization", "name", "skillName", "default", "prerequisite"]) {
      const parsed = specialtyFromPrerequisite(value[key]);
      if (parsed) return parsed;
    }
    return null;
  }
  return parseGunsSkillString(value)?.specialty ?? normalizeGunsSpecialty(value);
}
function unwrapParenthesizedGroups(value) {
  const groups = [];
  const text = String(value ?? "");
  let depth = 0;
  let start = -1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "(") {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (text[index] === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) groups.push(text.slice(start, index).trim());
    }
  }
  return groups;
}
export function parseTargetedAttackName(value) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!/^(?:targeted\s+attack|ta|прицельная\s+атака)(?=\s|\(|$)/iu.test(text)) return null;
  const groups = unwrapParenthesizedGroups(text);
  let target = null;
  let specialty = null;
  for (const group of groups) {
    target ??= normalizeTargetedAttackLocation(group);
    specialty ??= parseGunsSkillString(group)?.specialty ?? normalizeGunsSpecialty(group);
    if (!specialty) specialty = firstCanonicalValue(unwrapParenthesizedGroups(group), normalizeGunsSpecialty);
    if (!target || !specialty) {
      for (const part of group.split(/\s*[/,;:]\s*/u)) {
        target ??= normalizeTargetedAttackLocation(part);
        specialty ??= normalizeGunsSpecialty(part);
      }
    }
  }
  return target && specialty ? { target, specialty } : null;
}
function parseTechnique(entry) {
  const structuredTarget = firstCanonicalValue([
    entry?.targetLocation, entry?.targetlocation, entry?.hitLocation, entry?.hitlocation,
    entry?.techniqueTarget, entry?.target, entry?.location
  ], normalizeTargetedAttackLocation);
  const structuredSpecialty = firstCanonicalValue([
    entry?.governingSpecialty, entry?.weaponSpecialty, entry?.specialty, entry?.specialization
  ], normalizeGunsSpecialty) ?? specialtyFromPrerequisite([
    entry?.governingSkill, entry?.governingSkillName, entry?.skill, entry?.skillName,
    entry?.default, entry?.defaults, entry?.prerequisite, entry?.prereq
  ]);
  const fallback = (!structuredTarget || !structuredSpecialty) ? parseTargetedAttackName(entry?.name ?? entry?.originalName) : null;
  const target = structuredTarget ?? fallback?.target ?? null;
  const specialty = structuredSpecialty ?? fallback?.specialty ?? null;
  if (!target || !specialty) return null;
  return { entry, target, specialty, relativeLevel: relativeLevel(entry), level: finiteLevel(entry),
    source: structuredTarget && structuredSpecialty ? "structured" : "name-fallback" };
}
function skillIdentityValues(skill) {
  return [skill?.uuid, skill?.id, skill?._id, skill?.itemid, skill?.itemId]
    .filter(value => value !== null && value !== undefined && String(value).trim() !== "").map(String);
}
export function collectGunsSkills(actor) {
  const result = [];
  for (const entry of flattenEntries(actor?.system?.skills)) {
    const parsed = parseGunsSkillString(entry?.name) ?? parseGunsSkillString(entry?.originalName);
    if (!parsed) continue;
    result.push({ entry, specialty: parsed.specialty, label: parsed.label, level: finiteLevel(entry), identities: skillIdentityValues(entry) });
  }
  return result;
}
function collectTechniques(actor) {
  return flattenEntries(actor?.system?.skills)
    .filter(entry => aliasKey(entry?.type) === "technique" || /^(?:targeted\s+attack|ta|прицельная\s+атака)(?=\s|\(|$)/iu.test(String(entry?.name ?? "")))
    .map(parseTechnique).filter(Boolean);
}
function collectValues(source, keys) {
  return keys.map(key => source?.[key]).filter(value => value !== null && value !== undefined && value !== "");
}
export function explicitAttackSpecialties(attack, gunsSkills) {
  const sources = [attack, attack?.data].filter(Boolean);
  const idKeys = ["skilluuid", "skillUuid", "skillid", "skillId", "governingSkillUuid", "governingSkillId",
    "defaultSkillUuid", "defaultSkillId", "parentuuid"];
  const nameKeys = ["governingSkill", "governingSkillName", "skill", "skillName", "default", "defaults",
    "defaultSkill", "defaultSkillName", "prerequisite", "prereq"];
  const matches = new Set();
  for (const source of sources) {
    for (const id of collectValues(source, idKeys).flat(Infinity)) {
      for (const skill of gunsSkills) if (skill.identities.includes(String(id))) matches.add(skill.specialty);
    }
    for (const value of collectValues(source, nameKeys).flat(Infinity)) {
      const specialty = specialtyFromPrerequisite(value);
      if (specialty && gunsSkills.some(skill => skill.specialty === specialty)) matches.add(specialty);
    }
  }
  return [...matches];
}
export function clampTargetedAttackModifier(basePenalty, techniqueModifier) {
  const base = Math.trunc(Number(basePenalty));
  const technique = Math.trunc(Number(techniqueModifier));
  if (!Number.isFinite(base) || !Number.isFinite(technique) || base >= 0) return null;
  const bestAllowed = -Math.floor(Math.abs(base) / 2);
  const effective = Math.min(bestAllowed, Math.max(base, technique));
  return effective > base ? effective : null;
}
export function createTargetedAttackContext({ actor, attack, mode = "weapon" } = {}) {
  const gunsSkills = collectGunsSkills(actor);
  const techniques = collectTechniques(actor);
  const explicit = explicitAttackSpecialties(attack, gunsSkills);
  const actorSpecialties = [...new Set(gunsSkills.map(skill => skill.specialty))];
  const candidateSpecialties = explicit.length > 0 ? explicit : actorSpecialties;
  const automaticSpecialty = candidateSpecialties.length === 1 ? candidateSpecialties[0] : null;
  const enabled = mode === "weapon" && techniques.length > 0 && gunsSkills.length > 0;
  const requiresSelection = enabled && !automaticSpecialty && candidateSpecialties.length > 1;
  const labels = new Map();
  for (const skill of gunsSkills) if (!labels.has(skill.specialty)) labels.set(skill.specialty, skill.label);
  const specialtyOptions = candidateSpecialties.map(value => ({ value, label: labels.get(value) ?? value }));
  return {
    enabled,
    automaticSpecialty: enabled ? automaticSpecialty : null,
    requiresSelection,
    specialtyOptions: enabled ? specialtyOptions : [],
    techniques,
    resolve({ specialty, governingSkill, target, basePenalty } = {}) {
      if (!enabled) return null;
      const canonicalSpecialty = governingSkill
        ? (governingSkill.family === "guns" ? governingSkill.specialty : null)
        : normalizeGunsSpecialty(specialty) ?? automaticSpecialty;
      const targetValues = Array.isArray(target) ? target : [target];
      const canonicalTargets = [...new Set(targetValues.map(normalizeTargetedAttackLocation).filter(Boolean))];
      if (!canonicalSpecialty || canonicalTargets.length === 0) return null;
      const matchingSkills = gunsSkills.filter(skill =>
        skill.specialty === canonicalSpecialty && Number.isFinite(skill.level));
      const governing = governingSkill ?? (matchingSkills.length === 1 ? matchingSkills[0] : null);
      if (!governing) return null;
      let best = null;
      for (const technique of techniques) {
        if (technique.specialty !== canonicalSpecialty || !canonicalTargets.includes(technique.target)) continue;
        const modifier = Number.isFinite(technique.relativeLevel) ? technique.relativeLevel
          : (Number.isFinite(technique.level) ? technique.level - governing.level : null);
        if (!Number.isFinite(modifier)) continue;
        const effectivePenalty = clampTargetedAttackModifier(basePenalty, modifier);
        if (effectivePenalty === null || (best && best.effectivePenalty >= effectivePenalty)) continue;
        best = { target: technique.target, specialty: canonicalSpecialty, basePenalty: Math.trunc(Number(basePenalty)),
          techniqueModifier: modifier, effectivePenalty, techniqueLevel: technique.level,
          governingSkillLevel: governing.level, source: technique.source, entry: technique.entry };
      }
      return best;
    }
  };
}

const meleeIdentity = value => aliasKey(value)
  .replace(/\s*\/\s*tl\s*\d+\s*$/iu, "")
  .replace(/\s+tl\s*\d+\s*$/iu, "")
  .trim();

const MELEE_SKILL_FAMILIES = new Set([
  "axe/mace",
  "broadsword",
  "cloak",
  "flail",
  "force sword",
  "force whip",
  "garrote",
  "jitte/sai",
  "knife",
  "kusari",
  "lance",
  "main-gauche",
  "monowire whip",
  "net",
  "parry missile weapons",
  "polearm",
  "rapier",
  "saber",
  "shield",
  "shortsword",
  "smallsword",
  "spear",
  "staff",
  "tonfa",
  "two-handed axe/mace",
  "two-handed flail",
  "two-handed sword",
  "whip",
  "boxing",
  "brawling",
  "judo",
  "karate",
  "sumo wrestling",
  "wrestling"
].map(aliasKey));

function meleeSkillFamily(value) {
  return aliasKey(value)
    .replace(/\s*\([^()]*\)\s*$/u, "")
    .replace(/\s*\/\s*tl\s*\d+\s*$/iu, "")
    .trim();
}
function collectMeleeGoverningSkills(actor) {
  const skills = [];
  const seen = new Set();
  const dx = Number(actor?.system?.attributes?.DX?.value);
  skills.push({
    key: "attribute:DX",
    name: "DX",
    label: "DX",
    level: Number.isFinite(dx) ? Math.trunc(dx) : null,
    entry: actor?.system?.attributes?.DX ?? null,
    identities: ["attribute:DX"]
  });
  seen.add("attribute:DX");
  for (const entry of flattenEntries(actor?.system?.skills)) {
    if (aliasKey(entry?.type) === "technique" || /^(?:targeted\s+attack|ta|прицельная\s+атака)(?=\s|\(|$)/iu.test(String(entry?.name ?? ""))) continue;
    const name = String(entry?.name ?? entry?.originalName ?? "").normalize("NFKC").trim();
    const level = finiteLevel(entry);
    if (!name || !Number.isFinite(level) || !MELEE_SKILL_FAMILIES.has(meleeSkillFamily(name))) continue;
    const identities = skillIdentityValues(entry);
    const key = identities[0] ? "id:" + identities[0] : "name:" + encodeURIComponent(meleeIdentity(name));
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({ key, name, label: name, level, entry, identities });
  }
  return skills;
}

function flattenMeleeValues(value, result = []) {
  if (Array.isArray(value)) {
    for (const entry of value) flattenMeleeValues(entry, result);
  } else if (value && typeof value === "object") {
    for (const key of ["name", "skillName", "governingSkill", "default", "prerequisite"]) {
      if (value[key] !== undefined) flattenMeleeValues(value[key], result);
    }
  } else if (value !== null && value !== undefined && String(value).trim()) {
    result.push(String(value).trim());
  }
  return result;
}

function explicitMeleeSkills(attack, skills) {
  const sources = [attack, attack?.data].filter(Boolean);
  const idKeys = ["skilluuid", "skillUuid", "skillid", "skillId", "governingSkillUuid", "governingSkillId", "defaultSkillUuid", "defaultSkillId", "parentuuid"];
  const nameKeys = ["governingSkill", "governingSkillName", "skill", "skillName", "default", "defaults", "defaultSkill", "defaultSkillName", "prerequisite", "prereq"];
  const matches = new Set();
  for (const source of sources) {
    for (const id of collectValues(source, idKeys).flat(Infinity)) {
      for (const skill of skills) if (skill.identities.includes(String(id))) matches.add(skill.key);
    }
    for (const value of collectValues(source, nameKeys)) {
      for (const name of flattenMeleeValues(value)) {
        const normalized = meleeIdentity(name);
        for (const skill of skills) if (meleeIdentity(skill.name) === normalized) matches.add(skill.key);
      }
    }
    const otf = String(source?.otf ?? "");
    const otfMatch = otf.match(/(?:^|\[)S:\s*["']?([^"'\]]+)/iu);
    if (otfMatch) {
      const normalized = meleeIdentity(otfMatch[1]);
      for (const skill of skills) if (meleeIdentity(skill.name) === normalized) matches.add(skill.key);
    }
  }
  return [...matches];
}

export function parseMeleeTargetedAttackName(value) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!/^(?:targeted\s+attack|ta|прицельная\s+атака)(?=\s|\(|$)/iu.test(text)) return null;
  const groups = unwrapParenthesizedGroups(text);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const parts = groups[groupIndex].split(/\s*\/\s*/u);
    const targets = parts.map(normalizeTargetedAttackLocation);
    const canonicalTargets = [...new Set(targets.filter(Boolean))];
    if (canonicalTargets.length !== 1) continue;
    const descriptor = parts.filter((part, index) => !targets[index]).join(" / ").trim();
    if (!descriptor) continue;
    return {
      target: canonicalTargets[0],
      descriptor,
      qualifiers: groups.filter((_, index) => index !== groupIndex)
    };
  }
  return null;
}

function collectMeleeTechniques(actor) {
  const techniques = [];
  for (const entry of flattenEntries(actor?.system?.skills)) {
    if (aliasKey(entry?.type) !== "technique" && !/^(?:targeted\s+attack|ta|прицельная\s+атака)(?=\s|\(|$)/iu.test(String(entry?.name ?? ""))) continue;
    const named = parseMeleeTargetedAttackName(entry?.name ?? entry?.originalName);
    const target = firstCanonicalValue([
      entry?.targetLocation, entry?.targetlocation, entry?.hitLocation, entry?.hitlocation,
      entry?.techniqueTarget, entry?.target, entry?.location
    ], normalizeTargetedAttackLocation) ?? named?.target ?? null;
    const descriptor = String(entry?.attackVariant ?? entry?.attackName ?? entry?.weaponMode ?? named?.descriptor ?? "").trim();
    const governingSkill = String(entry?.governingSkill ?? entry?.governingSkillName ?? entry?.skillName ??
      named?.qualifiers?.at(-1) ?? "").trim();
    if (!target || !descriptor) continue;
    techniques.push({
      entry,
      target,
      descriptor,
      governingSkill,
      relativeLevel: relativeLevel(entry),
      level: finiteLevel(entry),
      source: named ? "name-fallback" : "structured"
    });
  }
  return techniques;
}

const meleeMatchIdentity = value => meleeIdentity(value)
  .replace(/[()[\]{}]/gu, " ")
  .replace(/\s*[/\\-]\s*/gu, " ")
  .replace(/\s+/gu, " ")
  .trim();

function meleeTechniqueMatches(technique, skill, attack) {
  const descriptor = meleeMatchIdentity(technique.descriptor);
  const skillName = meleeMatchIdentity(skill.name);
  const attackName = meleeMatchIdentity(attack?.name);
  const mode = meleeMatchIdentity(attack?.mode);
  const governingSkill = meleeMatchIdentity(technique.governingSkill);
  if (governingSkill && governingSkill !== skillName) return false;
  const variants = new Set([skillName, attackName].filter(Boolean));
  if (mode) {
    variants.add((skillName + " " + mode).trim());
    variants.add((attackName + " " + mode).trim());
  }
  return variants.has(descriptor);
}

export function createMeleeTargetedAttackContext({ actor, attack } = {}) {
  const skills = collectMeleeGoverningSkills(actor);
  const techniques = collectMeleeTechniques(actor);
  const candidates = skills;
  const automaticSpecialty = null;
  return {
    enabled: techniques.length > 0 && skills.length > 0,
    automaticSpecialty,
    requiresSelection: !automaticSpecialty && candidates.length > 1,
    specialtyOptions: candidates.map(skill => ({ value: skill.key, label: skill.label, level: skill.level })),
    getSkillLevel(specialty) {
      const level = skills.find(skill => skill.key === String(specialty ?? ""))?.level;
      return Number.isFinite(level) ? Math.trunc(level) : null;
    },
    techniques,
    resolve({ specialty, target, basePenalty } = {}) {
      const key = automaticSpecialty ?? String(specialty ?? "");
      const governing = skills.find(skill => skill.key === key);
      const targetValues = Array.isArray(target) ? target : [target];
      const targets = [...new Set(targetValues.map(normalizeTargetedAttackLocation).filter(Boolean))];
      if (!governing || targets.length === 0) return null;
      let best = null;
      for (const technique of techniques) {
        if (!targets.includes(technique.target) || !meleeTechniqueMatches(technique, governing, attack)) continue;
        const modifier = Number.isFinite(technique.relativeLevel) ? technique.relativeLevel
          : (Number.isFinite(technique.level) ? technique.level - governing.level : null);
        if (!Number.isFinite(modifier)) continue;
        const effectivePenalty = clampTargetedAttackModifier(basePenalty, modifier);
        if (effectivePenalty === null || (best && best.effectivePenalty >= effectivePenalty)) continue;
        best = {
          target: technique.target,
          specialty: governing.key,
          governingSkill: governing.name,
          attackVariant: technique.descriptor,
          basePenalty: Math.trunc(Number(basePenalty)),
          techniqueModifier: modifier,
          effectivePenalty,
          techniqueLevel: technique.level,
          governingSkillLevel: governing.level,
          source: technique.source,
          entry: technique.entry
        };
      }
      return best;
    }
  };
}
