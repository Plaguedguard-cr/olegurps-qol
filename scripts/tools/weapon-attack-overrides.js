const asText = value => String(value ?? "").trim();
const asInteger = value => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isInteger(number) ? number : null;
};

export function getAttackOverrideKey(reference = {}) {
  const uuid = asText(reference.uuid);
  if (uuid) return `uuid:${uuid}`;
  const path = asText(reference.path);
  if (path) return `path:${path}`;
  const name = asText(reference.name);
  const mode = asText(reference.mode);
  if (!name && !mode) return "";
  return `name:${encodeURIComponent(name)}|mode:${encodeURIComponent(mode)}`;
}

export function parseAccuracyComponents(value) {
  const text = asText(value);
  const match = text.match(/^(\d+(?:[.,]\d+)?)(?:\s*\+\s*(\d+(?:[.,]\d+)?))?/u);
  if (!match) return { acc: null, scopeBonus: 0 };
  const acc = Number(match[1].replace(",", "."));
  const scopeBonus = match[2] ? Number(match[2].replace(",", ".")) : 0;
  return {
    acc: Number.isFinite(acc) && acc >= 0 ? Math.trunc(acc) : null,
    scopeBonus: Number.isFinite(scopeBonus) && scopeBonus >= 0 ? Math.trunc(scopeBonus) : 0
  };
}

export function normalizeAttackOverride(value) {
  if (!value || typeof value !== "object") return null;
  const skillLevel = asInteger(value.skillLevel);
  const acc = asInteger(value.acc);
  const scopeBonus = asInteger(value.scopeBonus);
  const bulk = asInteger(value.bulk);
  const rof = asText(value.rof);
  const rcl = asText(value.rcl);
  if (skillLevel === null || skillLevel < 0 || acc === null || acc < 0 ||
      scopeBonus === null || scopeBonus < 0 || bulk === null || !rof || !rcl) return null;
  return { skillLevel, rof, acc, scopeBonus, bulk, rcl };
}

export function normalizeAttackOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    const normalized = normalizeAttackOverride(raw);
    if (key && normalized) result[key] = normalized;
  }
  return result;
}

export function getAttackOverride(state, attack) {
  const key = getAttackOverrideKey(attack);
  return key ? normalizeAttackOverride(state?.attackOverrides?.[key]) : null;
}

export function applyAttackOverride(attack, state) {
  if (!attack) return null;
  const override = getAttackOverride(state, attack);
  if (!override) return attack;
  return {
    ...attack,
    level: override.skillLevel,
    rof: override.rof,
    acc: override.acc,
    scopeBonus: override.scopeBonus,
    bulk: override.bulk,
    rcl: override.rcl,
    data: {
      ...attack.data,
      level: override.skillLevel,
      rof: override.rof,
      acc: override.acc,
      bulk: override.bulk,
      rcl: override.rcl
    }
  };
}

export function setAttackOverride(state, attack, value) {
  const key = getAttackOverrideKey(attack);
  const normalized = normalizeAttackOverride(value);
  if (!key || !normalized) return false;
  state.attackOverrides = normalizeAttackOverrides(state.attackOverrides);
  state.attackOverrides[key] = normalized;
  return true;
}

export function clearAttackOverride(state, attack) {
  const key = getAttackOverrideKey(attack);
  if (!key || !state?.attackOverrides || !Object.hasOwn(state.attackOverrides, key)) return false;
  delete state.attackOverrides[key];
  return true;
}