import { getAttackOverrideKey } from "./weapon-attack-overrides.js";

const FLAG_SCOPE = "world";
const FLAG_KEY = "olegurpsMeleeAssistant";
const STATE_VERSION = 5;

const text = value => String(value ?? "").trim();
const integer = value => {
  const number = Number(text(value).replace(",", "."));
  return Number.isInteger(number) ? number : null;
};
const clone = value => globalThis.foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
const STORED_ATTACK_KEY_PREFIX = "key:";

function storedAttackKey(reference) {
  const key = getAttackOverrideKey(reference);
  if (!key) return "";
  return STORED_ATTACK_KEY_PREFIX + encodeURIComponent(key).replaceAll(".", "%2E");
}

function normalizeStoredAttackKey(key) {
  const source = text(key);
  if (!source) return "";
  return source.startsWith(STORED_ATTACK_KEY_PREFIX)
    ? source
    : STORED_ATTACK_KEY_PREFIX + encodeURIComponent(source).replaceAll(".", "%2E");
}

export function walkMeleeAttackTree(tree, callback, basePath = "system.melee", depth = 0) {
  if (!tree || typeof tree !== "object") return;
  for (const [key, entry] of Object.entries(tree)) {
    if (!entry || typeof entry !== "object") continue;
    const path = basePath + "." + key;
    callback(entry, path, key, depth);
    walkMeleeAttackTree(entry.contains, callback, path + ".contains", depth + 1);
    walkMeleeAttackTree(entry.collapsed, callback, path + ".collapsed", depth + 1);
  }
}

export function buildMeleeAttackReference(source, path) {
  const name = text(source?.name) || "Без названия";
  const mode = text(source?.mode);
  const level = integer(source?.level) ?? integer(source?.import) ?? 0;
  const reference = {
    path: text(path),
    uuid: text(source?.uuid),
    name,
    mode,
    label: mode ? name + " - " + mode : name,
    level: Math.max(0, level),
    damage: text(Array.isArray(source?.damage) ? source.damage.join(", ") : source?.damage),
    sourceDamage: source?.damage,
    reach: text(source?.reach),
    parry: text(source?.parry),
    block: text(source?.block),
    st: text(source?.st),
    data: source
  };
  reference.key = getAttackOverrideKey(reference);
  return reference;
}

export function collectMeleeAttacks(actor) {
  const attacks = [];
  walkMeleeAttackTree(actor?.system?.melee, (source, path) => {
    const reference = buildMeleeAttackReference(source, path);
    if (reference.key) attacks.push(reference);
  });
  return attacks;
}

export function normalizeMeleeAttackOverride(value) {
  if (!value || typeof value !== "object") return null;
  const skillLevel = integer(value.skillLevel);
  const damage = text(value.damage);
  const reach = text(value.reach);
  const parry = text(value.parry);
  if (skillLevel === null || skillLevel < 0 || skillLevel > 999 || !damage || !reach) return null;
  return { skillLevel, damage, reach, parry };
}

export function normalizeMeleeAssistantState(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const attacks = {};
  for (const [key, raw] of Object.entries(source.attacks ?? {})) {
    if (!key || !raw || typeof raw !== "object") continue;
    const governingSkill = text(raw.governingSkill);
    const rapidStrikeMastery = raw.rapidStrikeMastery === true;
    const override = normalizeMeleeAttackOverride(raw.override);
    const safeKey = normalizeStoredAttackKey(key);
    if (safeKey && (governingSkill || rapidStrikeMastery || override)) attacks[safeKey] = {
      ...(governingSkill ? { governingSkill } : {}),
      ...(rapidStrikeMastery ? { rapidStrikeMastery: true } : {}),
      ...(override ? { override } : {})
    };
  }
  const selectedAttackKey = text(source.selectedAttackKey);
  const dicePlusAdds = source.dicePlusAdds === true;
  return { version: STATE_VERSION, selectedAttackKey, dicePlusAdds, attacks };
}

export function setSelectedMeleeAttack(state, attack) {
  const key = getAttackOverrideKey(attack);
  if (!key) return false;
  state.selectedAttackKey = key;
  return true;
}

export function getMeleeAttackSettings(state, attack) {
  const key = storedAttackKey(attack);
  return key ? state?.attacks?.[key] ?? {} : {};
}

export function applyMeleeAttackOverride(attack, state) {
  if (!attack) return null;
  const override = normalizeMeleeAttackOverride(getMeleeAttackSettings(state, attack).override);
  if (!override) return attack;
  return {
    ...attack,
    level: override.skillLevel,
    damage: override.damage,
    reach: override.reach,
    parry: override.parry,
    data: {
      ...attack.data,
      level: override.skillLevel,
      import: override.skillLevel,
      damage: override.damage,
      reach: override.reach,
      parry: override.parry
    }
  };
}

export function setMeleeDicePlusAdds(state, enabled) {
  state.dicePlusAdds = enabled === true;
  return true;
}

export function setMeleeGoverningSkill(state, attack, governingSkill) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  const current = { ...(state.attacks[key] ?? {}) };
  const normalized = text(governingSkill);
  if (normalized) current.governingSkill = normalized;
  else delete current.governingSkill;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export function setMeleeRapidStrikeMastery(state, attack, enabled) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  const current = { ...(state.attacks[key] ?? {}) };
  if (enabled === true) current.rapidStrikeMastery = true;
  else delete current.rapidStrikeMastery;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export function setMeleeAttackOverride(state, attack, value) {
  const key = storedAttackKey(attack);
  const override = normalizeMeleeAttackOverride(value);
  if (!key || !override) return false;
  state.attacks ??= {};
  state.attacks[key] = { ...(state.attacks[key] ?? {}), override };
  return true;
}

export function clearMeleeAttackOverride(state, attack) {
  const key = storedAttackKey(attack);
  if (!key || !state?.attacks?.[key]?.override) return false;
  const current = { ...state.attacks[key] };
  delete current.override;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export class MeleeAssistantStateService {
  constructor(actor) {
    this.actor = actor;
  }

  async load() {
    return normalizeMeleeAssistantState(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY));
  }

  async save(state) {
    const normalized = normalizeMeleeAssistantState(clone(state));
    await this.actor.setFlag(FLAG_SCOPE, FLAG_KEY, normalized);
    return normalized;
  }
}
