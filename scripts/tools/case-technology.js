import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
import { reviewedShotshellConstruction } from "../ht-shotshell-source-data.js";

export const CASE_VARIANTS = Object.freeze({ ht_light_case: "Light Cased", ht_caseless: "Caseless", ht_consumable_case: "Consumable Case" });
export const isCaseVariant = id => Object.hasOwn(CASE_VARIANTS, id);
const copy = value => structuredClone(value);
const positive = n => typeof n === "number" && Number.isFinite(n) && n > 0;
const requirement = id => ({ ht_light_case: "light_case_compatible_with_pressure_and_manufacture",
  ht_caseless: "weapon_explicitly_designed_for_caseless_ammo", ht_consumable_case: "weapon_explicitly_designed_for_consumable_case" })[id];
// Reviewed physical products, not a caliber/name heuristic. Source identities and mechanisms must agree.
const native = Object.freeze({
  ht_4_73x33mm_dynamit_nobel: { modeId: "W2D6hUo_3AxfdzWRL", equipmentId: "ewOywAc8dYtL1p2We", variantId: "ht_caseless", caseType: "caseless", construction: "caseless",
    index: 107, sourceEquipmentId: "e7eMcGWFDTu3cdeDR", action: "automatic", weight: .011, cost: .5, footnote: "[5] caseless", tl: 8,
    source: "HT119 G11 telescoped caseless round, rotating breech and top magazine; HT120; HT164-165; HT176 [5]" },
  ht_5_7x26mm_usel: { modeId: "WO9XZem8u8ze77NNs", equipmentId: "e2zaYDc0KRelgx-IJ", variantId: "ht_caseless", caseType: "caseless", construction: "caseless",
    index: 109, sourceEquipmentId: "eMs1EohGuT_pAY6I8", action: "bolt-action", weight: .011, cost: .4, footnote: "[5] caseless", tl: 8,
    source: "HT119-121 VEC91 electrically ignited Usel caseless cartridge and box magazine, native HP; HT164-165; HT176 [5]" },
  ht_15_43x54mm_dreyse: { modeId: "W4x4K44HSiDnu5oLc", equipmentId: "eyHxDzmpP7NueYEoE", variantId: "ht_consumable_case", caseType: "consumable", construction: "consumable_cased",
    index: 169, sourceEquipmentId: "eA1p93HWU-UgVOkum", action: "bolt-action", weight: .085, cost: .4, footnote: "[8] consumable", tl: 5,
    source: "HT108 Dreyse M.1841 needle ignition, single paper cartridge loaded into breech; HT120; HT164; HT177 [8]" }
});

export function sourceCaseDefinition(catalogs, modeId, ammo, variantId) {
  if (!isCaseVariant(variantId) || !ammo?.weapon_mode_ids?.includes(modeId)) return null;
  const mode = catalogs?.getMode(modeId), equipment = catalogs?.getEquipmentForMode(modeId);
  if (!mode || !equipment || mode.hidden || mode.role !== "attack" || !mode.ht_ammo_item_ids?.includes(ammo.id)) return null;
  const direct = ammo.case_profiles?.[variantId];
  if (direct?.verified === true && direct.source?.kind === "reference" && direct.modeId === modeId && direct.ammoId === ammo.id &&
      direct.equipmentId === equipment.equipment_id && direct.baseDamage === mode.raw_calc.damage && direct.sourceRange === mode.stats.range)
    return { ...copy(direct), sourceWeightPerShotLb: ammo.weight_per_shot_lb, sourceCostPerShot: ammo.cost_per_shot_usd };
  const row = native[ammo.id], light = reviewedShotshellConstruction(ammo);
  if (variantId === "ht_light_case" && light?.caseConstruction === "light_cased") {
    return { version: 1, variantId, modeId, equipmentId: equipment.equipment_id, ammoId: ammo.id, verified: true,
      nativePreserved: true, caseType: "light_cased", availabilityTL: 5, shotshellAvailability: true,
      chamberId: ammo.id, feedId: modeId + ":source-feed", chamberVerified: true, feedVerified: true,
      source: { kind: "reference", note: light.source + "; exact bidirectional chamber link" },
      baseDamage: mode.raw_calc.damage, sourceRange: mode.stats.range,
      sourceWeightPerShotLb: ammo.weight_per_shot_lb, sourceCostPerShot: ammo.cost_per_shot_usd,
      evidence: { [requirement(variantId)]: { value: true, source: light.source } } };
  }
  if (!row || row.variantId !== variantId || row.modeId !== modeId || row.equipmentId !== equipment.equipment_id ||
      ammo.gcs_index !== row.index || ammo.source_equipment_id !== row.sourceEquipmentId || ammo.ammunition_construction !== row.construction ||
      ammo.book_cost_weight_verified !== true || ammo.weight_per_shot_lb !== row.weight || ammo.cost_per_shot_usd !== row.cost ||
      ammo.book_footnote !== row.footnote || mode.mechanism?.confidence !== "high" || mode.mechanism.action_system !== row.action) return null;
  return { version: 1, variantId, modeId, equipmentId: row.equipmentId, ammoId: ammo.id, verified: true,
    nativePreserved: true, caseType: row.caseType, availabilityTL: row.tl,
    chamberId: ammo.id, feedId: modeId + ":source-feed", chamberVerified: true, feedVerified: true,
    source: { kind: "reference", note: row.source }, baseDamage: mode.raw_calc.damage, sourceRange: mode.stats.range,
    sourceWeightPerShotLb: ammo.weight_per_shot_lb, sourceCostPerShot: ammo.cost_per_shot_usd,
    evidence: { [requirement(variantId)]: { value: true, source: row.source } } };
}
export function sourceCaseVariant(catalogs, modeId, ammo) {
  // A physical case identity cannot disappear just because its design proof is missing.
  if (ammo?.ammunition_construction === "caseless") return "ht_caseless";
  if (["consumable_cased", "semi_consumable_cased"].includes(ammo?.ammunition_construction)) return "ht_consumable_case";
  return Object.keys(CASE_VARIANTS).find(id => sourceCaseDefinition(catalogs, modeId, ammo, id)?.nativePreserved) ?? null;
}

/** Independent checks for physical construction, exact chamber/feed and numerical completeness. */
export function reviewCaseDefinition(option, originalFacts, definition, ammo) {
  const facts = copy(originalFacts ?? {}), fail = reason => ({ status: "unresolved", reason, facts });
  const d = definition, id = option?.id;
  if (!isCaseVariant(id) || d?.version !== 1 || d.variantId !== id || d.verified !== true || d.source?.kind !== "reference" || !d.source.note?.trim()) return fail("P7ConstructionMissing");
  if (!d.modeId || !d.ammoId || !d.equipmentId || d.chamberVerified !== true || d.feedVerified !== true ||
      !d.chamberId?.trim() || !d.feedId?.trim()) return fail("P7ChamberFeedMissing");
  const caseTypes = { ht_light_case: ["light_cased"], ht_caseless: ["caseless"], ht_consumable_case: ["consumable", "semi_consumable"] }[id];
  if (!caseTypes.includes(d.caseType) || (id === "ht_caseless" && ammo?.ammunition_construction !== "caseless") ||
      (id === "ht_consumable_case" && !["consumable_cased", "semi_consumable_cased"].includes(ammo?.ammunition_construction)) ||
      (id === "ht_light_case" && ammo?.ammunition_construction !== "fixed_cased")) return fail("P7SourceConflict");
  if (!Number.isInteger(d.availabilityTL) || d.availabilityTL < (d.shotshellAvailability && id === "ht_light_case" ? 5 : option.min_tl)) return fail("P7ConstructionMissing");
  if (d.shotshellAvailability && ammo?.ammunition_class !== "shotgun_shell") return fail("P7SourceConflict");
  if (facts.availabilityTL != null && facts.availabilityTL !== d.availabilityTL) return fail("P7SourceConflict");
  facts.availabilityTL = d.availabilityTL;
  facts.evidence ??= {};
  const key = requirement(id), proof = d.evidence?.[key];
  if (facts.evidence[key]?.value === false && facts.evidence[key].source) return fail("P7SourceConflict");
  if (proof?.value !== true || !proof.source?.trim()) return fail("P7ConstructionMissing");
  facts.evidence[key] = copy(proof);
  if (id === "ht_consumable_case") {
    const platform = d.nativePreserved && native[ammo?.id]?.modeId === d.modeId ? "purpose_built_consumable_case_rifle" : d.weaponPlatform;
    if (!["purpose_built_consumable_case_rifle", "purpose_built_consumable_case_cannon"].includes(platform)) return fail("P7ConstructionMissing");
    facts.weaponPlatforms = { values: [...new Set([...(facts.weaponPlatforms?.values ?? []), platform])], complete: true };
    facts.caseTypes = { values: [d.caseType], complete: true };
  }
  // HT164's specific shotshell branch does not change the protected catalog's broad min_tl.
  const evaluated = evaluateHTOptionEligibility(d.shotshellAvailability && id === "ht_light_case" ? { ...option, min_tl: 5 } : option, facts);
  if (evaluated.checks.some(c => c.status !== "confirmed" && !(d.shotshellAvailability && c.field === "min_tl"))) return fail("P7ConstructionMissing");
  if (!ammo?.book_cost_weight_verified || !positive(ammo.weight_per_shot_lb) || !positive(ammo.cost_per_shot_usd)) return fail("P7EconomicsMissing");
  if (d.sourceWeightPerShotLb !== ammo.weight_per_shot_lb || d.sourceCostPerShot !== ammo.cost_per_shot_usd) return fail("P7SourceConflict");
  facts.caseDefinition = copy(d); facts.caseOption = copy(option);
  facts.baseWeightPerShotLb = ammo.weight_per_shot_lb; facts.baseCostPerShot = ammo.cost_per_shot_usd;
  return { status: "resolved", reason: null, facts };
}

export function resolveCaseEffects({ raw, variantId, baseStatus, constructionStatus, facts = {}, previousTransformations = [], context = {} }) {
  const formula = String(raw?.damage ?? ""), d = facts.caseDefinition;
  const result = { status: "unresolved", nativeSafe: false, formula, rawFormula: formula, variantId, reason: "P7ConstructionMissing", transformations: [], components: [], rules: {} };
  if (baseStatus !== "compatible" || constructionStatus !== "compatible") return result;
  const ammo = { id: d?.ammoId, ammunition_construction: variantId === "ht_light_case" ? "fixed_cased" : variantId === "ht_caseless" ? "caseless" : d?.caseType === "semi_consumable" ? "semi_consumable_cased" : "consumable_cased",
    ammunition_class: facts.munitionClasses?.values?.includes("shotgun_shotshell") ? "shotgun_shell" : "small_arms_cartridge",
    book_cost_weight_verified: true, weight_per_shot_lb: facts.baseWeightPerShotLb, cost_per_shot_usd: facts.baseCostPerShot };
  const review = reviewCaseDefinition(facts.caseOption, facts, d, ammo);
  if (review.status !== "resolved") { result.reason = review.reason; return result; }
  if ((context.modeId && context.modeId !== d.modeId) || (context.ammoId && context.ammoId !== d.ammoId) ||
      formula !== d.baseDamage || raw.range !== d.sourceRange) { result.reason = "P7SourceConflict"; return result; }
  if (previousTransformations.some(e => e.effectId === variantId && e.applied)) { result.reason = "already-applied-use-original-profile"; return result; }
  const changed = variantId === "ht_light_case" && !d.nativePreserved;
  const weightFactor = changed ? facts.caseOption.mechanics.wps_multiplier : 1, costFactor = changed ? facts.caseOption.mechanics.cost_multiplier : 1;
  if (!positive(weightFactor) || !positive(costFactor)) { result.reason = "P7EconomicsMissing"; return result; }
  result.rules.caseTechnology = { ...copy(d), weightPerShotLb: facts.baseWeightPerShotLb * weightFactor,
    costPerShot: facts.baseCostPerShot * costFactor, weightMultiplier: weightFactor, costMultiplier: costFactor,
    application: changed ? "source-rule" : "included-in-source-cartridge", physicalRoundsPerShot: 1 };
  result.rules.costPerShot = result.rules.caseTechnology.costPerShot;
  result.rules.weightPerShotLb = result.rules.caseTechnology.weightPerShotLb;
  result.transformations.push({ effectId: variantId, source: d.source.note, order: 1, applied: changed,
    from: { weightPerShotLb: facts.baseWeightPerShotLb, costPerShot: facts.baseCostPerShot },
    to: { weightPerShotLb: result.rules.weightPerShotLb, costPerShot: result.rules.costPerShot }, reason: result.rules.caseTechnology.application });
  result.status = "resolved"; result.nativeSafe = true; result.reason = null;
  result.components.push({ role: "kinetic", status: "resolved", formula });
  return result;
}

/** Read-only ammunition-only totals. Includes rounds in magazines once, excludes unknown cases/containers. */
export function inventoryPhysicalTotals(inventory, types) {
  return (inventory?.stocks ?? []).map(stock => {
    const type = types.find(t => t.key === stock.key), economics = type?.physical;
    const loaded = (inventory.magazines ?? []).filter(m => m.ammoKey === stock.key).reduce((sum, m) => sum + m.rounds, 0);
    const rounds = stock.rounds + loaded;
    return { key: stock.key, loose: stock.rounds, loaded, rounds,
      weightLb: positive(economics?.weightPerShotLb) ? rounds * economics.weightPerShotLb : null,
      costUsd: positive(economics?.costPerShot) ? rounds * economics.costPerShot : null };
  });
}
