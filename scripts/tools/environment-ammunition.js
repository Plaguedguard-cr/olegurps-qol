import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
import { publishedDamageComponents } from "./explosive-attack-profiles.js";

export const ENVIRONMENT_VARIANTS = Object.freeze({
  ht_poison: "Poison", ht_illumination: "Illumination", ht_signal_flare: "Signal flare",
  ht_smoke: "Smoke", ht_colored_smoke: "Colored smoke", ht_hot_smoke: "Hot smoke",
  ht_prism_smoke: "Prism smoke", ht_em_smoke: "EM smoke", ht_tear_gas: "Tear gas",
  ht_tear_gas_vomit: "Tear gas with vomiting agent", ht_liquid: "Liquid",
  ht_poison_gas: "Poison gas", ht_white_phosphorus: "WP"
});
export const isEnvironmentVariant = id => Object.hasOwn(ENVIRONMENT_VARIANTS, id);
export const sourceEnvironmentVariant = ammo => ["WP smoke", "WP"].includes(ammo?.warhead_type) ? "ht_white_phosphorus" : null;
const copy = value => structuredClone(value);
const positive = value => Number.isFinite(value) && value > 0;
const chemical = id => ["ht_poison", "ht_liquid", "ht_poison_gas", "ht_tear_gas", "ht_tear_gas_vomit"].includes(id);

/** A numerical rule is not evidence that a cartridge has this payload. */
export function reviewEnvironmentDefinition(option, originalFacts, definition) {
  const facts = copy(originalFacts ?? {}), fail = reason => ({ status: "unresolved", reason, facts });
  if (!isEnvironmentVariant(option?.id) || definition?.variantId !== option.id || definition.verified !== true ||
      !["reference", "gm", "user"].includes(definition.source?.kind) || !definition.source?.note?.trim()) return fail("P5ConstructionMissing");
  if (!Number.isInteger(definition.availabilityTL) || definition.availabilityTL < option.min_tl) return fail("P5TLRequired");
  if (facts.caliberMm != null && definition.caliberMm !== facts.caliberMm ||
      !definition.nativePreserved && facts.availabilityTL != null && facts.availabilityTL !== definition.availabilityTL)
    return fail("P5SourceConflict");
  facts.caliberMm ??= definition.caliberMm;
  facts.availabilityTL = definition.availabilityTL;
  for (const [key, field] of [["platforms", "weaponPlatforms"], ["munitionClasses", "munitionClasses"], ["projectileClasses", "projectileClasses"]]) {
    const claimed = definition[key] ?? [], known = facts[field];
    if (known?.complete && claimed.length && !claimed.some(value => known.values.includes(value))) return fail("P5SourceConflict");
    facts[field] = { values: [...new Set([...(known?.values ?? []), ...claimed])], complete: known?.complete || claimed.length > 0 };
  }
  facts.evidence ??= {};
  for (const key of option.eligibility_v1.explicit_evidence_required) {
    if (facts.evidence[key]?.value === false && facts.evidence[key].source) return fail("P5SourceConflict");
    const proof = definition.evidence?.[key];
    if (proof?.value !== true || !proof.source?.trim()) return fail("P5ConstructionMissing");
    facts.evidence[key] = copy(proof);
  }
  if (chemical(option.id) && (!definition.filler?.id || !definition.filler?.name ||
      !definition.filler?.source?.trim() || definition.filler?.effect?.verified !== true ||
      !definition.filler?.effect?.description?.trim() || !definition.filler?.doseUnit?.trim() || !positive(definition.filler?.dose))) return fail("P5FillerMissing");
  if (option.id === "ht_poison" && !["blood", "contact"].includes(definition.filler.route)) return fail("P5FillerMissing");
  if (option.id === "ht_liquid" && !(positive(definition.muzzleVelocityFps) && definition.muzzleVelocityFps < 500)) return fail("P5VelocityRequired");
  if (option.id === "ht_poison") {
    facts.baseVariantId = definition.baseVariantId;
    facts.muzzleVelocityFps = definition.muzzleVelocityFps;
  }
  const evaluation = evaluateHTOptionEligibility(option, facts);
  // Native source formulas are preserved, never transformed or applied a second time.
  if (evaluation.checks.some(check => check.status !== "confirmed" &&
      !(definition.nativePreserved === true && check.field === "overlap_guard"))) return fail("P5ConstructionMissing");
  if (definition.nativePreserved && (!publishedDamageComponents(definition.nativeDamage) ||
      !definition.components?.length || definition.components[0].role !== "kinetic")) return fail("P5PayloadMissing");
  const components = definition.components ?? [];
  const roles = { kinetic: "primary", "follow-up": "follow_up", linked: "linked", fragmentation: "fragmentation" };
  if (new Set(components.map(c => c.role)).size !== components.length || components.some(c =>
      !roles[c.role] || c.relation !== roles[c.role] || !publishedDamageComponents(c.formula) || publishedDamageComponents(c.formula).fragmentation))
    return fail("P5PayloadMissing");
  if (["ht_poison_gas", "ht_white_phosphorus"].includes(option.id) && !definition.nativePreserved &&
      !components.some(c => c.role === "follow-up" && c.formula.endsWith(option.id === "ht_poison_gas" ? " cr ex" : " burn ex"))) return fail("P5PayloadMissing");
  facts.environmentDefinition = copy(definition);
  facts.environmentOption = copy(option);
  return { status: "resolved", reason: null, facts };
}

/** Only exact, already bound source munitions; no name, Actor or bore matching. */
export function sourceEnvironmentDefinition(catalogs, modeId, ammo, variantId) {
  const equipment = catalogs.getEquipmentForMode(modeId), mode = catalogs.getMode(modeId);
  if (!isEnvironmentVariant(variantId) || !ammo?.weapon_mode_ids?.includes(modeId)) return null;
  const explicit = ammo.environment_profiles?.[variantId];
  if (explicit?.verified && explicit.source?.kind === "reference" && explicit.modeId === modeId &&
      explicit.equipmentId === equipment?.equipment_id) return copy(explicit);
  if (sourceEnvironmentVariant(ammo) !== variantId || ammo.source_evidence_level !== "book_explicit" ||
      ammo.ammunition_construction !== "complete_munition" || ammo.source_weapon_equipment_id !== equipment?.equipment_id) return null;
  // HT172: WP fragments inflict burning damage. Preserve the old catalog spelling only as provenance.
  const parsed = publishedDamageComponents(ammo.attack_override.damage.replace(/\[1d\(0\.2\) cut\]/, '[1d(0.2) burn]'), {fragmentType:"burn"});
  if (!parsed || !parsed.main.endsWith(" burn ex") || !parsed.fragmentation) return null;
  // Source-native 35mm WP is explicitly identified by the catalog's confirmed projectile, not a bore guess.
  const source = { ht_specific_hafla_dm34_35mm_wp: {caliber:35,damage:'1d-2 burn ex [1d(0.2) cut]',
      cloud:{radiusYards:7,durationSeconds:60,source:'HT142'},readyManeuvers:2},
    ht_specific_hydra_70mm_wp: {caliber:70,damage:'5d [1d(0.2)] burn ex',cloud:{radiusYards:19,durationSeconds:300}} }[ammo.id];
  if (!source || ammo.attack_override.damage !== source.damage) return null;
  return { version: 1, variantId, verified: true, nativePreserved: true,
    source: { kind: "reference", note: ammo.table_ref + "; " + catalogs.getVariant("ht", variantId).source_ref },
    availabilityTL: Number(equipment.tech_level), caliberMm: source.caliber, munitionClasses: ["purpose_built_wp_shell"],
    evidence: { source_confirmed_wp_shell: { value: true, source: ammo.table_ref } },
    nativeDamage: parsed.main + " [" + parsed.fragmentation + "]", sourcePayloadDamage: ammo.attack_override.damage,
    sourceRawDamage: mode.raw_calc.damage,
    sourceRange: ammo.rocket_contract?.range_source ?? mode.stats.range, sourceCloud: source.cloud ?? null,
    ...(source.readyManeuvers?{preparation:{readyManeuvers:source.readyManeuvers,source:'HT142',automaticApplication:false}}:{}),
    sourceCost: ammo.book_cost_weight_verified ? ammo.cost_per_shot_usd : null,
    components: [{ role: "kinetic", relation: "primary", formula: parsed.main },
      { role: "fragmentation", relation: "fragmentation", formula: parsed.fragmentation }]
  };
}

/** Known numbers only. Environmental/chemical application stays with native tools and GM. */
export function resolveEnvironmentEffects({ raw, variantId, baseStatus, constructionStatus, facts = {}, previousTransformations = [] }, tools) {
  const formula = String(raw?.damage ?? ""), transformations = [];
  const result = { status: "resolved", rawFormula: formula, formula, variantId, transformations, components: [],
    nativeSafe: true, reason: null, rules: {}, support: { status: "GM-MEDIATED", automatic: [], manual: [], missing: [] } };
  const fail = reason => ({ ...result, status: "unresolved", nativeSafe: false, formula, reason,
    support: { ...result.support, status: "UNDETERMINED", missing: [reason] } });
  if (baseStatus !== "compatible" || !["compatible", "user-defined", "gm-approved", "world-policy"].includes(constructionStatus)) return fail("P5ConstructionMissing");
  if (previousTransformations.some(t => t.effectId === variantId && t.applied)) return fail("already-applied-use-original-profile");
  const review = reviewEnvironmentDefinition(facts.environmentOption, facts, facts.environmentDefinition);
  if (review.status !== "resolved") return fail(review.reason);
  const d = review.facts.environmentDefinition, o = review.facts.environmentOption, m = o.mechanics;
  const record = (field, from, to, applied) => transformations.push({ source: o.source_ref, effectId: variantId,
    field, from, to, applied, order: transformations.length + 1, reason: applied ? "source-confirmed-payload" : "native-source-preserved" });
  if (d.nativePreserved) {
    if (formula !== (d.sourceRawDamage ?? d.nativeDamage)) return fail("P5SourceConflict");
    const parsed = publishedDamageComponents(d.nativeDamage);
    if (d.components[0].formula !== parsed.main || d.components.find(c => c.role === "fragmentation")?.formula !== parsed.fragmentation) return fail("P5SourceConflict");
    result.formula = d.components[0].formula;
    if (d.sourceRange) result.effectiveChanges = { range: d.sourceRange };
    record("damage", formula, result.formula, formula !== d.nativeDamage);
  } else if (variantId === "ht_poison") {
    const hp = tools.hollowPoint({ raw, facts: review.facts });
    if (!hp.nativeSafe) return fail(hp.reason);
    result.formula = hp.formula; result.transformations.push(...hp.transformations);
    result.rules.hollowPoint = copy(hp.rules);
    record("damage", formula, result.formula, true);
  } else if (variantId === "ht_liquid" || m.armor_divisor) {
    const crushing = / cr$/.test(formula) && tools.parseKineticDamage(formula.replace(/ cr$/, " pi"));
    const parsed = tools.parseKineticDamage(formula) ?? (crushing ? { ...crushing, type: "cr" } : null);
    if (!parsed || parsed.divisor !== 1 || parsed.suffix) return fail("P5BaselineMissing");
    result.formula = (m.damage_multiplier ? tools.htDamageDice(parsed.dice, parsed.adds, parsed.multiplier, m.damage_multiplier) : parsed.diceText) +
      "(" + m.armor_divisor + ")" + parsed.minimum + " " + (m.damage_type ?? parsed.type);
    if (m.range_multiplier) {
      const range = tools.parseDamageRange(raw.range);
      if (!range) return fail("P5BaselineMissing");
      result.effectiveChanges = { range: Math.round(range.halfDamage * m.range_multiplier) + "/" + Math.round(range.maximum * m.range_multiplier) };
    }
    record("damage", formula, result.formula, true);
  }
  result.components = [{ role: "kinetic", status: "resolved", formula: result.formula },
    ...(d.components ?? []).filter(c => c.role !== "kinetic").map(c => ({ ...copy(c), status: "resolved", manualConditions: true,
      internalOnPenetration: c.relation === "follow_up" }))];
  if (!transformations.length) record("damage", formula, result.formula, false);
  if (!d.nativePreserved && d.components?.some(c => c.role === "kinetic" && c.formula !== result.formula)) return fail("P5SourceConflict");
  result.rules = { ...result.rules, environment: { mechanics: copy(m), source: copy(d.source),
    filler: copy(d.filler ?? null), sourceCloud: copy(d.sourceCloud ?? null), preparation:copy(d.preparation??null), chatHint: o.chat_hint_ru ?? null, nativePreserved: !!d.nativePreserved,
    automaticApplication: false }, componentOrder: result.components.map(c => c.role) };
  result.support.automatic = ["damage-profile", ...(result.effectiveChanges ? ["range"] : []), "shot-snapshot"];
  if (Number.isFinite(d.sourceCost)) {
    if (variantId === "ht_poison" && !Number.isFinite(d.filler.cost)) return fail("P5FillerMissing");
    result.rules.costPerShot = d.nativePreserved ? d.sourceCost : variantId === "ht_poison" ? d.sourceCost + d.filler.cost : m.cost_multiplier ? d.sourceCost * m.cost_multiplier : null;
  }
  result.rules.costApplication = d.nativePreserved ? "included-in-source-cartridge-price" : "source-confirmed-payload";
  return result;
}

export function environmentalVisibility(variantId, { penalty, pathYards } = {}) {
  if (["ht_illumination", "ht_signal_flare"].includes(variantId)) return Number.isFinite(penalty) ? Math.max(penalty, variantId === "ht_illumination" ? -3 : -5) : null;
  if (["ht_tear_gas", "ht_tear_gas_vomit"].includes(variantId)) return Number.isFinite(pathYards) && pathYards >= 0 ? Math.max(-10, -3 * pathYards) : null;
  return ({ ht_smoke: -10, ht_colored_smoke: -7, ht_hot_smoke: -10, ht_prism_smoke: -10, ht_em_smoke: -10 })[variantId] ?? null;
}
export function gasConsequenceDuration({ exposureMinutes, marginOfFailure, vomiting = false }) {
  return Number.isFinite(exposureMinutes) && exposureMinutes >= 0 && positive(marginOfFailure) ? exposureMinutes + marginOfFailure * (vomiting ? 5 : 1) : null;
}
export function smokeBuildSeconds(radiusYards) { return Number.isFinite(radiusYards) && radiusYards >= 0 ? radiusYards / 5 : null; }

/** Contact/exposure arithmetic only. Never performs Rolls, schedules damage or creates effects. */
export function environmentalContactSchedule(variantId, elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return null;
  if (["ht_illumination", "ht_signal_flare"].includes(variantId)) return { formula: "1d burn", intervalSeconds: 1,
    maximumSeconds: 10, intervals: Math.min(10, Math.floor(elapsedSeconds)), automaticApplication: false };
  if (variantId === "ht_white_phosphorus") return { formula: "1d(0.2) burn", intervalSeconds: 10,
    maximumSeconds: 60, intervals: Math.min(6, Math.floor(elapsedSeconds / 10)), removalRoll: "DX", automaticApplication: false };
  return null;
}
