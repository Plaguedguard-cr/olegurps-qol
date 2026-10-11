import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
import { reviewedNativePlusPBaseline } from "../ht-native-charge-profiles.js";
import { publishedDamageComponents } from "./explosive-attack-profiles.js";

export const FUZE_TRACER_VARIANTS = Object.freeze({
  ht_airburst: "Airburst", ht_incendiary: "I", ht_self_destruct: "SD", ht_tracer: "T"
});
export const isFuzeTracerVariant = id => Object.hasOwn(FUZE_TRACER_VARIANTS, id);
export const nativeAirburstAlreadyIncluded = ammo => ["Shrapnel", "Beehive", "ABF"].includes(ammo?.warhead_type);
const copy = value => structuredClone(value);
const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
const inc = formula => /\binc\b/i.test(formula);
const parseFuzeDamage = formula => {
  const text = String(formula ?? "");
  const parsed = publishedDamageComponents(text.replace(/\s+inc$/i, ""));
  return parsed ? { ...parsed, main: parsed.main + (inc(text) ? " inc" : "") } : null;
};
const distance = context => context?.shotgun?.physicalDistance ?? context?.physicalDistance;
const halfDamage = range => {
  const m = String(range ?? "").replaceAll(",", "").match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  return m && Number(m[1]) > 0 && Number(m[2]) >= Number(m[1]) ? Number(m[1]) : null;
};
export const sourceFuzeTracerVariant = (catalogs, modeId, ammo) =>
  reviewedNativePlusPBaseline(catalogs?.getMode(modeId), ammo)?.construction === "aphci_tracer" ? "ht_tracer" : null;

/** Exact source identity only. A bore, weapon name or world policy is not a design. */
export function sourceFuzeTracerDefinition(catalogs, modeId, ammo, variantId) {
  if (!isFuzeTracerVariant(variantId) || !ammo?.weapon_mode_ids?.includes(modeId)) return null;
  if (variantId === "ht_airburst" && nativeAirburstAlreadyIncluded(ammo)) return null;
  const mode = catalogs.getMode(modeId), equipment = catalogs.getEquipmentForMode(modeId);
  const direct = ammo.fuze_tracer_profiles?.[variantId];
  if (direct?.verified === true && direct.source?.kind === "reference" && direct.modeId === modeId &&
      direct.equipmentId === equipment?.equipment_id && direct.ammoId === ammo.id &&
      direct.baseDamage === mode?.raw_calc?.damage && (!direct.sourceRange || direct.sourceRange === mode?.stats?.range)) return copy(direct);
  const native = reviewedNativePlusPBaseline(mode, ammo);
  if (native?.construction !== "aphci_tracer" || !["ht_incendiary", "ht_tracer"].includes(variantId)) return null;
  const option = catalogs.getVariant("ht", variantId);
  return { version: 1, variantId, modeId, ammoId: ammo.id, equipmentId: equipment.equipment_id,
    verified: true, nativePreserved: true, independentIncendiary: true,
    source: { kind: "reference", note: native.source + "; " + option.source_ref + "; native APHCI-T" },
    availabilityTL: 7, projectileClasses: ["source_confirmed_aphc", "bullet"],
    evidence: Object.fromEntries(option.eligibility_v1.explicit_evidence_required.map(key =>
      [key, { value: true, source: native.source + "; confirmed APHCI-T construction" }])),
    baseDamage: native.nativeDamage, sourceRange: mode.stats.range,
    sourceCost: ammo.book_cost_weight_verified ? ammo.cost_per_shot_usd : null };
}

/** Validate a sourced construction separately from numerical rules and catalogue status. */
export function reviewFuzeTracerDefinition(option, originalFacts, definition) {
  const facts = copy(originalFacts ?? {}), fail = reason => ({ status: "unresolved", reason, facts });
  if (!isFuzeTracerVariant(option?.id) || definition?.variantId !== option.id || definition.verified !== true ||
      !["reference", "gm"].includes(definition.source?.kind) || !definition.source?.note?.trim() ||
      !parseFuzeDamage(definition.baseDamage)) return fail("P6ConstructionMissing");
  if (!Number.isInteger(definition.availabilityTL) || definition.availabilityTL < option.min_tl) return fail("P6TLRequired");
  if (facts.availabilityTL != null && facts.availabilityTL !== definition.availabilityTL) return fail("P6SourceConflict");
  facts.availabilityTL = definition.availabilityTL;
  for (const [key, field] of [["munitionClasses", "munitionClasses"], ["projectileClasses", "projectileClasses"]]) {
    const claimed = definition[key] ?? [], known = facts[field];
    if (known?.complete && claimed.length && !claimed.some(v => known.values.includes(v))) return fail("P6SourceConflict");
    facts[field] = { values: [...new Set([...(known?.values ?? []), ...claimed])], complete: known?.complete || claimed.length > 0 };
  }
  facts.evidence ??= {};
  for (const key of option.eligibility_v1.explicit_evidence_required) {
    if (facts.evidence[key]?.value === false && facts.evidence[key].source) return fail("P6SourceConflict");
    const proof = definition.evidence?.[key];
    if (proof?.value !== true || !proof.source?.trim()) return fail("P6ConstructionMissing");
    facts.evidence[key] = copy(proof);
  }
  if (option.id === "ht_airburst") {
    const forbidden = option.eligibility_v1.conditions.forbidden_classes;
    if (facts.classes?.values?.some(v => forbidden.includes(v)) ||
        definition.nativeAirburstClasses?.some(v => forbidden.includes(v)) ||
        facts.nativeEffects?.[option.eligibility_v1.overlap_guard] === true) return fail("P6NativeAirburstAlready");
    if (definition.airburstAlreadyIncluded !== false || !Number.isInteger(definition.fuseTL) ||
        definition.fuseTL < 5 || definition.fuseTL > 8 || !definition.fuseSource?.trim()) return fail("P6FuseConditionsMissing");
    facts.classes ??= { values: [], complete: false };
    facts.classes.exclusions = [...(facts.classes.exclusions ?? []), ...forbidden.map(value => ({ value, source: definition.fuseSource }))];
    facts.nativeEffects ??= {};
    facts.nativeEffects[option.eligibility_v1.overlap_guard] = false;
  }
  if (["ht_airburst", "ht_self_destruct"].includes(option.id) && !/\bex\b/.test(definition.baseDamage)) return fail("P6PayloadMissing");
  if (["ht_incendiary", "ht_tracer"].includes(option.id) && !/\bpi(?:\+\+|\+|-)?(?:\s+inc)?$/.test(definition.baseDamage)) return fail("P6PayloadMissing");
  if (option.id === "ht_tracer" && halfDamage(definition.sourceRange) === null) return fail("P6RangeMissing");
  if (definition.nativePreserved && !inc(definition.baseDamage)) return fail("P6SourceConflict");
  if (definition.independentIncendiary === true && !inc(definition.baseDamage)) return fail("P6SourceConflict");
  if (definition.selfDestructDistanceYards != null && (!positive(definition.selfDestructDistanceYards) ||
      !definition.selfDestructDistanceSource?.trim())) return fail("P6FuseConditionsMissing");
  if (evaluateHTOptionEligibility(option, facts).status !== "compatible") return fail("P6ConstructionMissing");
  facts.fuzeTracerDefinition = copy(definition); facts.fuzeTracerOption = copy(option);
  return { status: "resolved", reason: null, facts };
}

export function airburstAttackBonus(definition, mechanics, target) {
  if (definition?.variantId !== "ht_airburst" || definition.airburstAlreadyIncluded !== false) return 0;
  if ([5, 6].includes(definition.fuseTL)) return target === "area" ? mechanics.tl5_6_area_attack_to_hit_bonus : target === "air" ? mechanics.tl5_6_air_target_to_hit_bonus : 0;
  return [7, 8].includes(definition.fuseTL) && target === "area" ? mechanics.tl7_8_area_attack_to_hit_bonus : 0;
}

/** One shared effect path: immutable source, one journal, no Rolls/Actor writes/geometry. */
export function selfDestructDistanceReached(definition, actualPath) {
  return positive(definition.selfDestructDistanceYards) && Number.isFinite(actualPath) ? actualPath >= definition.selfDestructDistanceYards : null;
}
export function resolveFuzeTracerEffects({ raw, variantId, baseStatus, constructionStatus, facts = {}, previousTransformations = [], context = {} }) {
  const formula = String(raw?.damage ?? ""), transformations = [];
  const result = { status: "resolved", rawFormula: formula, formula, variantId, transformations, components: [],
    nativeSafe: true, reason: null, rules: {}, support: { status: "GM-MEDIATED", automatic: ["damage-profile", "shot-snapshot"], manual: [], missing: [] } };
  const fail = reason => ({ ...result, status: "unresolved", nativeSafe: false, reason, formula,
    support: { ...result.support, status: "UNDETERMINED", missing: [reason] } });
  if (baseStatus !== "compatible" || !["compatible", "gm-approved", "world-policy"].includes(constructionStatus)) return fail("P6ConstructionMissing");
  if (previousTransformations.some(t => (t.effectId === variantId || t.effectId?.startsWith(variantId + ":")) && t.applied)) return fail("already-applied-use-original-profile");
  const review = reviewFuzeTracerDefinition(facts.fuzeTracerOption, facts, facts.fuzeTracerDefinition);
  if (review.status !== "resolved") return fail(review.reason);
  const d = review.facts.fuzeTracerDefinition, o = review.facts.fuzeTracerOption, parsed = parseFuzeDamage(formula);
  if (formula !== d.baseDamage || !parsed || d.sourceRange && raw.range !== d.sourceRange) return fail("P6SourceConflict");
  result.formula = parsed.main;
  const physicalDistance = distance(context), withinHalfDamage = Number.isFinite(physicalDistance) && physicalDistance >= 0
    ? physicalDistance <= halfDamage(d.sourceRange) : null;
  if (variantId === "ht_incendiary" || variantId === "ht_tracer" && withinHalfDamage === true) {
    if (!inc(result.formula)) result.formula += " inc";
  }
  // A pre-existing I component remains valid beyond the tracer's burn distance.
  if (variantId === "ht_tracer" && inc(result.formula) && !d.independentIncendiary && withinHalfDamage === false)
    result.formula = result.formula.replace(/\s+inc\b/i, "");
  if (variantId === "ht_tracer" && !d.independentIncendiary && withinHalfDamage === null && context.kind)
    return fail("P6DistanceMissing");
  transformations.push({ source: o.source_ref, effectId: variantId, field: "damage", from: formula, to: result.formula,
    applied: result.formula !== parsed.main, order: 1, reason: inc(parsed.main) ? "native-inc-preserved" : "source-confirmed-component" });
  result.components = [{ role: "kinetic", status: "resolved", formula: result.formula },
    ...(parsed.fragmentation ? [{ role: "fragmentation", relation: "fragmentation", status: "resolved", formula: parsed.fragmentation, manualConditions: true }] : [])];
  const conditions = { variantId, mechanics: copy(o.mechanics), source: copy(d.source), chatHint: o.chat_hint_ru,
    nativePreserved: !!d.nativePreserved, independentIncendiary: !!d.independentIncendiary,
    physicalDistance: Number.isFinite(physicalDistance) ? physicalDistance : null, automaticApplication: false };
  if (variantId === "ht_airburst") {
    Object.assign(conditions, { fuseTL: d.fuseTL, target: context.airburstTarget ?? "point", bonus: airburstAttackBonus(d, o.mechanics, context.airburstTarget) });
    transformations.push({ source: o.source_ref, effectId: variantId + ":attack-bonus", field: "attackBonus",
      from: 0, to: conditions.bonus, applied: conditions.bonus !== 0, order: transformations.length + 1, reason: "source-confirmed-fuse-and-target" });
    result.support.automatic.push("conditional-attack-bonus", "miss-scatter-arithmetic");
    result.support.manual.push("airburst-position-and-geometry");
  }
  if (variantId === "ht_incendiary") result.support.manual.push("ignition-adjudication");
  if (variantId === "ht_self_destruct") {
    Object.assign(conditions, { selfDestructDistanceYards: d.selfDestructDistanceYards ?? null,
      selfDestructDistanceSource: d.selfDestructDistanceSource ?? null,
      distanceReached: selfDestructDistanceReached(d, physicalDistance) });
    result.support.manual.push(d.selfDestructDistanceYards == null ? "self-destruct-distance-unconfirmed" : "self-destruct-flight-and-detonation");
  }
  if (variantId === "ht_tracer") {
    Object.assign(conditions, { halfDamageRange: halfDamage(d.sourceRange), withinHalfDamage, revealsShooter: true,
      nextTurnBonus: { value: o.mechanics.skill_bonus, applied: false, trigger: o.mechanics.bonus_trigger,
        minimumBurstShots: null, reason: "no-source-threshold-or-correlated-next-shooter-turn" } });
    result.support.manual.push("next-turn-tracer-bonus", "shooter-position-visibility");
  }
  result.rules.fuzeTracer = conditions;
  result.rules.costApplication = d.nativePreserved ? "included-in-source-cartridge-price" : "source-confirmed-component";
  if (Number.isFinite(d.sourceCost)) result.rules.costPerShot = d.nativePreserved ? d.sourceCost : d.sourceCost * o.mechanics.cost_multiplier;
  return result;
}

/** Events belong to this completed attack, not the latest magazine or spectator. */
export function fuzeTracerShotEvents(profile, outcome) {
  const rule = profile?.damage?.rules?.fuzeTracer;
  if (!rule || !outcome) return null;
  const event = { variantId: rule.variantId, physicalShots: profile.context?.physicalShots ?? null,
    physicalDistance: rule.physicalDistance, failure: outcome.failure === true, margin: Number.isFinite(outcome.margin) ? outcome.margin : null };
  if (rule.variantId === "ht_airburst") event.scatterYards = outcome.failure === true && outcome.margin < 0 &&
    ["area", "air"].includes(rule.target) ? outcome.margin ** 2 : null;
  if (rule.variantId === "ht_self_destruct") { event.selfDestructDistanceYards = rule.selfDestructDistanceYards; event.distanceReached = rule.distanceReached; }
  if (rule.variantId === "ht_tracer") { event.revealsShooter = true; event.nextTurnBonusApplied = false; }
  return event;
}
