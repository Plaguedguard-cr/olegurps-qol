import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { ammoTypeKey } from './ammo-inventory.js';
import { recipeFingerprint } from './ammunition-approval-service.js';

export function bindDUDecision(type,decision) {
  const result=structuredClone(type);
  result.recipe.parameters={duDecision:{...structuredClone(decision),origin:'user'}};
  result.recipe.customId='auto:'+recipeFingerprint({recipe:result.recipe.autoProfile})+':du:'+recipeFingerprint({recipe:result.recipe.parameters});
  result.key=ammoTypeKey(result);return result;
}

// Mirrors the reviewed HT169 eligibility contract for the pure numeric resolver.
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const DU_OPTIONS = freeze(Object.fromEntries([
  ["ht_apdu", ["autocannon", "source_verified_other_platform"], "du_penetrator_round_design_confirmed"],
  ["ht_apdsdu", ["autocannon", "source_verified_other_platform"], "apdsdu_round_design_confirmed"],
  ["ht_apfsdsdu", ["tank_gun", "autocannon"], "apfsdsdu_round_design_confirmed"]
].map(([id, platforms, evidence]) => [id, { id, min_tl: 8, eligibility_v1: { contract: "ht-option-eligibility-v1",
  conditions: { weapon_platforms_any: platforms, ...(id === "ht_apfsdsdu" ? { minimum_caliber_mm: 10 } : {}) },
  explicit_evidence_required: [evidence] } }])));

/** A scoped GM attestation supplies missing design facts, never a catalog permission. */
export function reviewDUConstruction(option, originalFacts, decision = null) {
  const facts = structuredClone(originalFacts ?? {});
  const invalid = reason => ({ status: "undetermined", facts, reason });
  if (!isDUVariant(option?.id)) return invalid("DUConfirmationRequired");
  if (decision) {
    if (decision.designConfirmed !== true || !decision.source?.trim?.() ||
        !option.eligibility_v1.conditions.weapon_platforms_any.includes(decision.platform)) return invalid("DUConfirmationRequired");
    const platforms = facts.weaponPlatforms;
    if (platforms?.values?.length && !platforms.values.includes(decision.platform) &&
        decision.platform !== "source_verified_other_platform") return invalid("DUPlatformConflict");
    if (Number.isFinite(facts.caliberMm) && decision.caliberMm != null && decision.caliberMm !== facts.caliberMm)
      return invalid("DUIdentityConflict");
    if (Number.isInteger(facts.availabilityTL) && decision.availabilityTL != null && decision.availabilityTL !== facts.availabilityTL)
      return invalid("DUIdentityConflict");
    facts.caliberMm ??= decision.caliberMm;
    facts.availabilityTL ??= decision.availabilityTL;
    if (!Number.isFinite(facts.caliberMm) || facts.caliberMm <= 0 || !Number.isInteger(facts.availabilityTL))
      return invalid("DUConfirmationRequired");
    facts.weaponPlatforms = { values: [...new Set([...(platforms?.values ?? []), decision.platform])], complete: true };
    const requirement = option.eligibility_v1.explicit_evidence_required[0];
    // A negative source finding cannot be overridden by an attestation.
    if (facts.evidence?.[requirement]?.value === false) return invalid("DUIdentityConflict");
    facts.evidence ??= {};
    facts.evidence[requirement] ??= { value: true, source: decision.source.trim(), authority: "individual-user" };
    facts.provenance ??= [];
    facts.provenance.push({ source: decision.source.trim(), authority: "individual-user", design: requirement,
      platform: decision.platform, caliberMm: facts.caliberMm, availabilityTL: facts.availabilityTL });
  }
  const result = evaluateHTOptionEligibility(option, facts);
  return { ...result, facts, reason: result.status === "compatible" && Number.isFinite(facts.caliberMm) && facts.caliberMm > 0 && Number.isInteger(facts.availabilityTL)
    ? null : "DUConfirmationRequired" };
}

/** Eligibility for a GM ignition ruling; never generates damage or applies a status. */
export function evaluateDUIgnition({ armorDR, flexible, penetratingDamage, nativeIncendiary = false } = {}) {
  if (nativeIncendiary) return { status: "native-effect-preserved", applyAutomatically: false };
  if (!Number.isFinite(armorDR) || typeof flexible !== "boolean" || !Number.isFinite(penetratingDamage))
    return { status: "undetermined", applyAutomatically: false };
  return { status: armorDR >= 10 && !flexible && penetratingDamage > 0 ? "eligible-for-GM-ruling" : "condition-not-met",
    applyAutomatically: false };
}
