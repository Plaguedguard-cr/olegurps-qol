import { calculateExplosiveRecipe } from "./explosive-ammunition-model.js";
import { isExplosiveVariant, resolveCompositeExplosiveEffects } from "./explosive-attack-profiles.js";
import { HT_AUTOMATIC_KINETIC_RULES, HT_AUTOMATIC_SPECIAL_RULES } from "./ht-kinetic-rules.js";
import { HT_NATIVE_PLUS_P_BASELINES } from "../ht-native-charge-profiles.js";
import { reviewDUConstruction } from "./du-ammunition.js";
import { DU_OPTIONS } from "./du-ammunition.js";
import { isMultishotVariant, resolveMultishotEffects } from "./multishot-ammunition.js";
import { isEnvironmentVariant, resolveEnvironmentEffects } from "./environment-ammunition.js";
import { isFuzeTracerVariant, resolveFuzeTracerEffects } from "./fuze-tracer-ammunition.js";
import { handloadCondition, silentCondition } from "./cartridge-load-conditions.js";
import { isCaseVariant, resolveCaseEffects } from "./case-technology.js";
import { isUTConventionalVariant, resolveUTConventionalEffects } from "./ut-conventional-ammunition.js";
import { isUTSpecialVariant, resolveUTSpecialEffects } from './ut-special-ammunition.js';
import { isUTExtendedVariant, resolveUTExtendedEffects } from './ut-extended-ammunition.js';
const piercing = ["pi-", "pi", "pi+", "pi++"];
const rules = { ...HT_AUTOMATIC_KINETIC_RULES, ...HT_AUTOMATIC_SPECIAL_RULES,
  ht_ap: { factor: 0.7, divisor: 2, shift: -1, costFactor: 1.5, source: "HT 166-167" },
  ht_aphc: { factor: 1, divisor: 2, shift: -1, costFactor: 2, source: "HT 167" },
  ht_hollow_point: { factor: 1, divisor: 0.5, shift: 1, costFactor: 1, source: "HT 166-167" },
  ht_apex: { factor: 0.7, divisor: 2, shift: -1, costFactor: 3, explosive: true, source: "HT 166, 169" },
  ht_aphex: { factor: 1, divisor: 2, shift: -1, costFactor: 4, explosive: true, incendiary: true, source: "HT 170" }
};

import { htDamageDice, parseKineticDamage, parseDamageRange } from './kinetic-damage-math.js';
export { htDamageDice, parseKineticDamage, parseDamageRange } from './kinetic-damage-math.js';

export function scaleRequiredStrength(value, factor = 1.1) {
  const match = String(value ?? "").match(/^(\d+)(\s*[\u2020\u2021RBM]*\s*)$/);
  return match && Number(match[1]) > 0 ? String(Math.round(Number(match[1]) * factor + 1e-10)) + match[2] : null;
}

/** Input is always raw GGA data. No state writes or Rolls, even for secondary effects. */
export function resolveAmmunitionEffects({ raw, variantId = null, baseStatus = "undetermined",
  constructionStatus = "undetermined", facts = {}, previousTransformations = [], secondary = null, explosiveParameters = null, preparedExplosiveModel = null, context = {} } = {}) {
  if (isUTExtendedVariant(variantId)) return resolveUTExtendedEffects({raw,variantId,baseStatus,constructionStatus,facts,previousTransformations}, {parseKineticDamage,parseDamageRange,resolveEffects:resolveAmmunitionEffects});
  if (isUTConventionalVariant(variantId)) return resolveUTConventionalEffects({ raw, variantId, baseStatus, constructionStatus, facts, previousTransformations, context }, { parseKineticDamage, parseDamageRange, htDamageDice });
  if (isUTSpecialVariant(variantId)) return resolveUTSpecialEffects({raw,variantId,baseStatus,constructionStatus,facts,previousTransformations});
  if (isCaseVariant(variantId)) return resolveCaseEffects({ raw, variantId, baseStatus, constructionStatus, facts, previousTransformations, context });
  if (isFuzeTracerVariant(variantId)) return resolveFuzeTracerEffects({ raw, variantId, baseStatus, constructionStatus, facts, previousTransformations, context });
  if (isEnvironmentVariant(variantId)) return resolveEnvironmentEffects({ raw, variantId, baseStatus, constructionStatus, facts, previousTransformations },
    { htDamageDice, parseKineticDamage, parseDamageRange, hollowPoint: ({ raw, facts }) => resolveAmmunitionEffects({ raw, facts, variantId: "ht_hollow_point", baseStatus, constructionStatus }) });
  if (isMultishotVariant(variantId)) return resolveMultishotEffects({ raw, variantId, baseStatus, constructionStatus, facts, previousTransformations },
    { htDamageDice, parseKineticDamage, parseDamageRange });
  if (isExplosiveVariant(variantId) && (facts.explosiveDefinition || !["ht_apex","ht_aphex"].includes(variantId)))
    return resolveCompositeExplosiveEffects({raw,variantId,baseStatus,constructionStatus,facts,previousTransformations},{htDamageDice,parseKineticDamage});
  const formula = String(raw?.damage ?? ""), transformations = [], components = [];
  const result = { status: "resolved", rawFormula: formula, formula, variantId, transformations, components,
    nativeSafe: true, reason: null, rules: {} };
  const rule = rules[variantId];
  const journal = (effectId, from, to, applied, reason) => transformations.push({ source: rule?.source ?? "GGA",
    effectId, from, to, order: transformations.length + 1, applied, reason });
  const unresolved = reason => {
    result.status = "unresolved"; result.nativeSafe = false; result.reason = reason; result.formula = formula;
    if (["FULL", "AUTOMATED", "GM-MEDIATED"].includes(result.support?.status)) {
      result.support.status = "UNDETERMINED"; result.support.missing.push(reason);
    }
    journal(variantId ?? "ammunition", formula, formula, false, reason); return result;
  };
  if (!variantId) { components.push({ role: "kinetic", status: "resolved", formula }); return result; }
  if (!rule) return unresolved("unsupported-construction");
  if (previousTransformations.some(entry => entry.effectId === variantId && entry.applied))
    return unresolved("already-applied-use-original-profile");
  if (baseStatus !== "compatible" || !["compatible", "user-defined", "gm-approved", "world-policy"].includes(constructionStatus)) return unresolved("unconfirmed-compatibility");
  // imp is admitted only for this source-backed native charge, never for generic AP/HP transformations.
  const impProof = facts.nativeChargeBaseline;
  const impBaseline = impProof && HT_NATIVE_PLUS_P_BASELINES[impProof.modeId];
  const nativeImp = variantId === "ht_plus_p" && impBaseline?.construction === "underwater_dart" &&
    formula.trim() === impBaseline.nativeDamage && impProof.ammoId === impBaseline.ammoId;
  const parsed = parseKineticDamage(formula) ?? (nativeImp ? { ...parseKineticDamage(formula.replace(/ imp$/, " pi")), type: "imp" } : null);
  if (!parsed) return unresolved("unsupported-or-compound-native-damage");
  const proof = facts.nativeChargeBaseline;
  const reviewed = proof && HT_NATIVE_PLUS_P_BASELINES[proof.modeId];
  const nativeCharge = variantId === "ht_plus_p" && reviewed && proof.ammoId === reviewed.ammoId &&
    proof.nativeDamage === reviewed.nativeDamage && formula.trim() === reviewed.nativeDamage &&
    proof.construction === reviewed.construction && proof.source === reviewed.source && proof.projectileEffectsIncluded === true;
  if (nativeImp && !nativeCharge) return unresolved("native-armor-divisor-needs-explicit-provenance");
  // Accuracy-only Match leaves a source-confirmed HP/AP/APHC projectile untouched.
  if (parsed.divisor !== 1 && !nativeCharge && !rule.accuracyFactor) return unresolved("native-armor-divisor-needs-explicit-provenance");
  if (nativeCharge && reviewed.construction === "underwater_dart" && !["user-defined","gm-approved"].includes(constructionStatus))
    return unresolved("plus-p-individual-dart-required");
  if (nativeCharge && reviewed.individualGMRequired && !["user-defined","gm-approved"].includes(constructionStatus))
    return unresolved("plus-p-individual-handload-required");
  if (raw?.linked || raw?.followUp || raw?.followup || raw?.components?.length || raw?.ammunitionEffects?.length ||
      Object.values(facts.nativeEffects ?? {}).some(present => present === true))
    return unresolved("native-components-or-effects-already-present");
  if (rule.depletedUranium && parsed.suffix) return unresolved("native-components-or-effects-already-present");
  if (rule.depletedUranium) {
    const review = reviewDUConstruction(DU_OPTIONS[variantId], facts);
    if (review.status !== "compatible" || review.reason) return unresolved("DUConfirmationRequired");
  }
  if (rule.costFactor) {
    result.rules.costMultiplier = rule.costFactor;
    if (typeof facts.baseCostPerShot === "number" && Number.isFinite(facts.baseCostPerShot))
      result.rules.costPerShot = facts.baseCostPerShot * rule.costFactor;
  }
  if (rule.depletedUranium) {
    result.support = { status: "GM-MEDIATED", automatic: ["kinetic-damage", "armor-divisor", "piercing", "range", "cost-multiplier"],
      manual: [{ id: "DUIncendiary", application: "manual-GM-after-penetration", source: "HT169" }], missing: [] };
    result.rules.incendiary = { application: "manual-GM-after-penetration", source: "HT169", minimumOriginalArmorDR: 10,
      flexibleArmorAllowed: false, requiresPenetration: true, automaticDamage: false, nativeEffectReapplication: false };
    journal(variantId + ":incendiary", null, result.rules.incendiary, false, "no-native-correlated-armor-and-penetration-event");
  }
  if (HT_AUTOMATIC_SPECIAL_RULES[variantId]) {
    result.support = { status: "AUTOMATED", automatic: [], manual: [], missing: [] };
    result.rules.costMultiplier = rule.costFactor;
    if (typeof facts.baseCostPerShot === "number" && Number.isFinite(facts.baseCostPerShot))
      result.rules.costPerShot = facts.baseCostPerShot * rule.costFactor;
    if (variantId === "ht_match_handloaded") {
      const reason = handloadCondition(facts, context);
      if (reason) return unresolved(reason);
      result.rules.handloadedBatch = structuredClone(facts.handloadDefinition);
      if (facts.handloadDefinition.nativeAccuracyIncluded === true) {
        result.rules.accuracyCondition = "already-in-source-profile";
        journal(variantId, raw.acc, raw.acc, false, "native-personal-match-preserved");
        components.push({ role: "kinetic", status: "resolved", formula });
        return result;
      }
    }
    if (variantId === "ht_silent") {
      const reason = silentCondition(facts, context), d = facts.silentDefinition;
      if (reason) return unresolved(reason);
      if (formula !== d.baseDamage || raw.range !== d.sourceRange) return unresolved("P1SilentEvidenceMissing");
      result.rules.silent = { source: d.source, captivePiston: true, hearingTableDistanceYards: rule.hearingTableDistanceYards,
        application: "manual-GM-Hearing-table", universalHearingModifier: null };
      result.support = { status: "GM-MEDIATED", automatic: ["source-profile-preserved", "cost-multiplier"],
        manual: [{ id: "SilentHearingTable", distanceYards: rule.hearingTableDistanceYards, application: "manual-GM" }], missing: [] };
      if (d.nativeCostIncluded === true) {
        result.rules.costApplication = "included-in-source-cartridge-price";
        if (Number.isFinite(facts.baseCostPerShot)) result.rules.costPerShot = facts.baseCostPerShot;
      }
      journal(variantId, formula, formula, false, "source-confirmed-captive-piston-profile-preserved");
      components.push({ role: "kinetic", status: "resolved", formula });
      return result;
    }
    if (rule.accuracyFactor) {
      const acc = String(raw?.acc ?? "").match(/^(\d+)(?:\+(\d+))?$/);
      if (!acc) return unresolved("native-accuracy-unresolved");
      const base = Number(acc[1]), scope = Number(raw?.scopeBonus ?? acc[2] ?? 0);
      if (!Number.isFinite(scope) || scope < 0) return unresolved("native-scope-unresolved");
      const adjusted = Math.min(Math.floor(base * rule.accuracyFactor), base + rule.accuracyBonusCap);
      result.effectiveChanges = { acc: adjusted, scopeBonus: scope };
      result.rules.accuracyCondition = "existing-Aim-pipeline-only";
      result.support.automatic = ["base-accuracy-on-aim", "cost-multiplier"];
      journal(variantId + ":accuracy", base, adjusted, adjusted !== base,
        variantId === "ht_match_handloaded" ? "HT174-floor-cap-two-individual-weapon-scope-preserved" : "HT165-floor-cap-one-scope-preserved");
      journal(variantId, base, adjusted, true, "validated-construction-on-immutable-source");
      components.push({ role: "kinetic", status: "resolved", formula });
      return result;
    }
    if (rule.hearing) {
      const expected = variantId === "ht_subsonic_pistol" ? "pistol" : "rifle-or-pdw";
      if (facts.evidence?.original_load_supersonic?.value !== true || !facts.evidence.original_load_supersonic.source ||
          (expected === "pistol" ? facts.cartridgeClass !== "pistol" : !["rifle", "pdw"].includes(facts.cartridgeClass)))
        return unresolved("subsonic-original-speed-or-cartridge-class-unresolved");
      result.rules.hearing = { modifier: rule.hearing, application: "manual-GM", target: "hearing-shot",
        suppressor: "separate-existing-effect-not-reapplied" };
      result.support.manual.push({ id: "Hearing", modifier: rule.hearing, application: "manual-GM" });
      result.support.status = "GM-MEDIATED";
      journal(variantId + ":hearing", 0, rule.hearing, false, "manual-GM-hearing-not-a-shooter-modifier");
    }
    if (variantId === "ht_frangible") {
      result.rules.zeroDRTreatedAs = 1;
      result.rules.overpenetration = { prohibitedWhenTargetHasDR: true, source: "HT167; B408", application: "manual-GM",
        ordinaryArmorPenetration: "preserved" };
      result.support.manual.push({ id: "ObjectWithoutDR", dr: 1, application: "manual-GM" },
        { id: "NoOverpenetrationWithDR", source: "B408", application: "manual-GM" });
      result.support.status = "GM-MEDIATED";
      journal(variantId + ":zero-DR", 0, 1, false, "native-GGA-with-armor-divisor-enabled-otherwise-manual-GM");
      journal(variantId + ":overpenetration", "B408", "no-overpenetration-when-target-has-DR", false, "manual-GM-no-automatic-transfer-interception");
    }
  }
  if (rule.shift < 0 && !Number.isFinite(facts.caliberMm)) return unresolved("numeric-caliber-unresolved");
  if (rule.rangeFactor) {
    const range = parseDamageRange(raw?.range);
    if (!range) return unresolved(/^\d+(?:\.\d+)?$/.test(String(raw?.range ?? "").trim().replaceAll(",", ""))
      ? "native-range-components-missing" : "native-range-unresolved");
    const adjusted = Math.round(range.halfDamage * rule.rangeFactor) + "/" + Math.round(range.maximum * rule.rangeFactor);
    result.effectiveChanges = { range: adjusted };
    if (raw?.halfd != null && raw.halfd !== "") {
      const half = Number(String(raw.halfd).replaceAll(",", ""));
      if (!Number.isFinite(half) || half !== range.halfDamage) return unresolved("native-range-unresolved");
      result.effectiveChanges.halfd = Math.round(half * rule.rangeFactor);
    }
    journal(variantId + ":range", raw.range, adjusted, true, "source-backed-range-factor");
  }
  const typeIndex = piercing.indexOf(parsed.type);
  if (rule.strengthFactor) {
    const st = scaleRequiredStrength(raw?.st, rule.strengthFactor);
    if (!st) return unresolved("native-required-strength-unresolved");
    result.effectiveChanges = { ...result.effectiveChanges, st };
    result.formula = htDamageDice(parsed.dice, parsed.adds, parsed.multiplier, rule.factor) +
      (parsed.divisor !== 1 ? "(" + parsed.divisor + ")" : "") + parsed.minimum + " " + parsed.type + parsed.suffix;
    result.support.status = "GM-MEDIATED";
    result.support.automatic = ["damage", "range", "required-ST", "cost-multiplier"];
    result.rules.pressure = { ratingVerified: facts.evidence?.weapon_pressure_rating_verified?.value === true &&
      !!facts.evidence.weapon_pressure_rating_verified.source,
      weaponTL: facts.weaponTL ?? null, weaponQuality: facts.weaponQuality ?? null,
      possibleMalfPenalty: facts.weaponTL >= 5 && facts.weaponTL <= 6 ||
        facts.weaponTL >= 7 && facts.weaponTL <= 8 && facts.weaponQuality === "cheap" ? -1 : null,
      automaticActionConsequences: facts.weaponActions?.values?.some(v => ["automatic", "self_loading"].includes(v)) ? "unresolved-Malf-and-RoF" : null,
      rofChange: facts.plusPDecision?.rof ?? null, application: "manual-GM", decision: structuredClone(facts.plusPDecision ?? null) };
    const malf = facts.plusPDecision?.malfModifier ?? result.rules.pressure.possibleMalfPenalty;
    result.support.manual.push({ id: "PlusPReliability", modifier: malf, application: "manual-GM" });
    if (nativeCharge) {
      result.rules.nativeProjectile = { ...proof, application: "already-in-native-profile-preserved" };
      journal(variantId + ":native-projectile", { divisor: parsed.divisor, type: parsed.type, suffix: parsed.suffix },
        { divisor: parsed.divisor, type: parsed.type, suffix: parsed.suffix }, false, "source-backed-native-projectile-preserved-not-reapplied");
      if (reviewed.construction === "hollow_point") {
        result.rules.zeroDRTreatedAs = 1;
        result.rules.expansion = "native-HP-optional-GM-low-velocity-check";
        result.support.manual.push({ id: "ObjectWithoutDR", dr: 1, application: "manual-GM" },
          { id: "NativeHPExpansion", application: "optional-GM", source: reviewed.source });
      }
      if (reviewed.originalSubsonic) {
        result.rules.acoustics = { plusPVelocity: "undetermined", suppressor: "existing-weapon-property-preserved", application: "manual-GM" };
        result.support.manual.push({ id: "PlusPSubsonicUnverified", application: "manual-GM" });
      }
    }
    if (result.rules.pressure.automaticActionConsequences) result.support.manual.push({ id: "PlusPAutomaticRoF", application: "manual-GM" });
    if (facts.plusPDecision?.rof != null) {
      // A GM decision changes physical shots, preserving pellets and native !/# notation.
      const originalRoF = String(raw?.rof ?? "").trim();
      const multiple = originalRoF.match(/^\d+(\s*[xX\u00d7*]\s*\d+)$/u);
      const suffix = originalRoF.match(/^\d+([!#])$/u);
      result.effectiveChanges.rof = String(facts.plusPDecision.rof) + (multiple?.[1] ?? suffix?.[1] ?? "");
    }
    if (/[\u2021RBM]/.test(st)) result.support.manual.push({ id: "MinimumSTSupport", st, application: "manual-GM-existing-support-rules" });
    result.rules.requiredStrength = { value: Number.parseInt(st), suffix: st.replace(/^\d+/, ""),
      application: /[\u2021RBM]/.test(st) ? "manual-GM-existing-support-rules" : "existing-fire-skill-channels" };
    if (facts.munitionClasses?.values?.includes("powder_and_shot")) result.rules.loadingCheck = {
      application: "manual-GM-before-loading", skills: ["Armoury (Small Arms)", "IQ-based Guns-2"], perShot: false };
    if (result.rules.loadingCheck && facts.plusPDecision?.loadingCheckPassed !== true) return unresolved("plus-p-loading-check-required");
    journal(variantId + ":required-ST", raw.st, st, true, "HT165-nearest-integer-operating-suffix-preserved");
    journal(variantId + ":Malf", raw.malf ?? null, malf, false, "manual-GM-native-reliability-not-overridden");
    journal(variantId, formula, result.formula, true, "HT166-from-immutable-source-no-physical-pressure-input");
    components.push({ role: "kinetic", status: "resolved", formula: result.formula });
    return result;
  }
  if (rule.hearing) {
    const dice = rule.factor === 1 ? parsed.diceText : htDamageDice(parsed.dice, parsed.adds, parsed.multiplier, rule.factor);
    const changed = rule.factor === 1 ? formula : dice + parsed.minimum + " " + parsed.type + parsed.suffix;
    result.formula = changed;
    result.support.automatic = ["damage", "range", "cost-multiplier"];
    journal(variantId, formula, changed, true, "HT165-cartridge-class-not-weapon-class");
    components.push({ role: "kinetic", status: "resolved", formula: changed });
    return result;
  }
  const shift = rule.shift > 0 || facts.caliberMm < (rule.caliberThreshold ?? 20) ? rule.shift : 0;
  const type = rule.damageType ?? (rule.piercingMap && facts.caliberMm < rule.caliberThreshold
    ? rule.piercingMap[parsed.type] ?? parsed.type : piercing[Math.max(0, Math.min(3, typeIndex + shift))]);
  const dice = rule.factor === 1 ? parsed.diceText : htDamageDice(parsed.dice, parsed.adds, parsed.multiplier, rule.factor);
  const kinetic = dice + "(" + rule.divisor + ")" + parsed.minimum + " " + type + parsed.suffix;
  journal(variantId + ":dice", parsed.diceText, dice, rule.factor !== 1, rule.factor === 1 ? "damage-dice-preserved" : "HT166-fractional-dice-bands");
  journal(variantId + ":divisor", parsed.divisor, rule.divisor, true, "replace-neutral-divisor");
  journal(variantId + ":piercing", parsed.type, type, type !== parsed.type,
    rule.damageType ? "construction-forces-piercing-type" : shift ? "piercing-step-with-cap" : "caliber-at-least-" + (rule.caliberThreshold ?? 20) + "mm");
  journal(variantId, formula, kinetic, true, "validated-construction-on-immutable-GGA-source");
  components.push({ role: "kinetic", status: "resolved", formula: kinetic });
  result.formula = kinetic;
  if (variantId === "ht_frangible") result.support.automatic = ["damage-divisor", "piercing", "range", "cost-multiplier"];
  if (variantId === "ht_hollow_point") {
    result.rules.zeroDRTreatedAs = 1; // Native GGA divisor <1 processing already implements this.
    result.rules.expansion = "normal-high-velocity";
    if (!(facts.muzzleVelocityFps >= 1400)) result.rules.expansion = "low-velocity-condition-unresolved";
    result.rules.malfunctionPenalty = facts.availabilityTL >= 5 && facts.availabilityTL <= 7 &&
      facts.weaponActions?.values?.some(action => ["automatic", "self_loading"].includes(action)) ? -1 : 0;
    // GGA has no per-shot Malf override. Refuse a silent partial application when this rule is required.
    if (result.rules.malfunctionPenalty || result.rules.expansion !== "normal-high-velocity")
      return unresolved("HP-conditional-rule-requires-native-support");
  }
  if (rule.explosive) {
    if (explosiveParameters || preparedExplosiveModel) {
      const model = preparedExplosiveModel ? structuredClone(preparedExplosiveModel) : calculateExplosiveRecipe(variantId, explosiveParameters);
      result.model = model;
      components.push({ role: "follow-up", ...model.explosion, manualConditions: true, internalOnPenetration: true,
        requires: "GM-selects-Follow-Up-penetration-and-Apply-Damage-options" });
      components.push({ role: "fragmentation", ...model.fragmentation, manualConditions: true, hits: 1 });
      if (rule.incendiary) components.push({ role: "incendiary", status: "manual", source: rule.source,
        requires: "B433-ignition-conditions", automaticRoll: false });
      result.nativeSafe = model.status === "resolved";
      result.status = model.status; result.reason = model.reasons[0] ?? null;
      journal(variantId + ":secondary-model", structuredClone(explosiveParameters), model,
        model.status === "resolved", model.status === "resolved" ? "separate-native-rolls-GM-resolves-conditions" : result.reason);
      return result;
    }
    const known = secondary?.source && secondary.explosion && secondary.fragmentation;
    components.push({ role: "follow-up", damageType: "cr", explosion: true, internalOnPenetration: true,
      status: known ? "resolved" : "unresolved", formula: known ? secondary.explosion : null, source: secondary?.source ?? rule.source,
      requires: "resolve-carrier-penetration-then-B414-B415-explosion" });
    components.push({ role: "fragmentation", damageType: "cut", status: known ? "resolved" : "unresolved",
      formula: known ? secondary.fragmentation : null, requires: "separate-fragment-hit-resolution" });
    if (rule.incendiary) components.push({ role: "incendiary", status: "manual", source: rule.source,
      requires: "B433-ignition-conditions", automaticRoll: false });
    // GGA ordinary Damage cannot express conditional Follow-Up/fragmentation as a single safe native transfer.
    // Keep the proposed kinetic calculation, but do not roll a partial explosive recipe.
    result.nativeSafe = false; result.status = "unresolved";
    result.reason = known ? "native-follow-up-adapter-unavailable" : "published-explosion-and-fragmentation-missing";
    journal(variantId + ":native-transfer", kinetic, formula, false, result.reason);
  }
  return result;
}
