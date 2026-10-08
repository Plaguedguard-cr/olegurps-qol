import { getFireSkillPreview } from "./fire-skill-preview.js";

export const TRADEMARK_MOVE_FLAG = "trademarkMoves";

function entries(tree, seen = new Set()) {
  if (!tree || typeof tree !== "object" || seen.has(tree)) return [];
  seen.add(tree);
  return Object.values(tree).flatMap(entry => entry && typeof entry === "object"
    ? [entry, ...entries(entry.contains, seen), ...entries(entry.collapsed, seen)] : []);
}

export function hasTrademarkMovePerk(actor) {
  return entries(actor?.system?.ads).some(entry => /^Trademark Move(?:\s*\([^)]*\))?$/iu
    .test(String(entry?.name ?? "").trim()));
}

export function normalizeTrademarkMoveStep(raw = {}) {
  return {
    weaponId: String(raw.weaponId ?? ""),
    attackRef: raw.attackRef && typeof raw.attackRef === "object" ? {
      path: String(raw.attackRef.path ?? ""), uuid: String(raw.attackRef.uuid ?? ""),
      name: String(raw.attackRef.name ?? ""), mode: String(raw.attackRef.mode ?? "")
    } : null,
    shots: Number(raw.shots), rofMode: raw.rofMode == null ? null : Number(raw.rofMode),
    governingSpecialty: String(raw.governingSpecialty ?? ""),
    bodyplanId: String(raw.bodyplanId ?? "humanoid"),
    hitLocationId: String(raw.hitLocationId ?? "silhouette"),
    hitRegionId: raw.hitRegionId ? String(raw.hitRegionId) : null,
    aimSeconds: Number(raw.aimSeconds ?? 0), braced: raw.braced === true,
    laserSight: raw.laserSight === true, moveAndAttack: raw.moveAndAttack === true,
    rangedRapidStrike: raw.rangedRapidStrike === true,
    allOutAttack: raw.allOutAttack === true && raw.moveAndAttack !== true
  };
}

export function normalizeTrademarkMove(raw) {
  if (!raw || !Array.isArray(raw.steps)) return null;
  return { version: 1, steps: raw.steps.map(normalizeTrademarkMoveStep) };
}

export function applyTrademarkMoveBonus(shotOptions) {
  return { ...shotOptions, effectiveSkill: shotOptions.effectiveSkill + 1, trademarkMoveBonus: 1 };
}

export function getTrademarkMoveSkillPreview({ attack, values, rangeBands, targetingService,
  targetedAttackContext, calculateSkillDetails } = {}) {
  const details = calculateSkillDetails?.(attack, values, rangeBands, targetingService, targetedAttackContext);
  const baseSkill = Number(details?.baseSkill ?? attack?.level);
  if (!details || !Number.isFinite(baseSkill)) return null;
  const modifiers = [...details.modifiers, { label: "Trademark Move", value: 1 }];
  const totalModifiers = modifiers.reduce((total, entry) => total + Number(entry.value || 0), 0);
  const effectiveSkill = applyTrademarkMoveBonus({ effectiveSkill: details.effectiveSkill }).effectiveSkill;
  const chance = getFireSkillPreview(effectiveSkill);
  return { baseSkill, modifiers, totalModifiers, effectiveSkill,
    successChance: chance.chance, probability: chance.probability };
}

export function getTrademarkHitLocationOptions(service, selected = {}) {
  if (!service) return [];
  const selectedValue = String(selected.hitLocationId ?? "") + "::" + String(selected.hitRegionId ?? "");
  const options = [
    ...service.zones.filter(zone => zone.available).map(zone => service.getSelection(zone.id, null)),
    ...service.regions.filter(region => !(["foot", "hand", "arm", "leg"].includes(region.zoneId) &&
      ["left", "right"].includes(region.side)))
      .map(region => service.getSelection(region.zoneId, region.id))
  ].filter(Boolean);
  const byLabel = new Map();
  for (const option of options) {
    const key = option.zoneId + "::" + option.label;
    const value = option.zoneId + "::" + (option.regionId ?? "");
    if (!byLabel.has(key) || value === selectedValue) byLabel.set(key, option);
  }
  return [...byLabel.values()];
}

export function getTrademarkHitLocationValue(options, selected = {}) {
  const desired = String(selected.hitLocationId ?? "silhouette") + "::" + String(selected.hitRegionId ?? "");
  const value = option => option.zoneId + "::" + (option.regionId ?? "");
  if (options.some(option => value(option) === desired)) return desired;
  const zone = options.find(option => option.zoneId === selected.hitLocationId && !option.regionId);
  return zone ? value(zone) : "silhouette::";
}