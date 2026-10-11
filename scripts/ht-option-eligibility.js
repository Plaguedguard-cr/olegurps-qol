import { applyReviewedHTEvidence } from "./ht-ammunition-evidence.js";
import { reviewedMultishotFacts } from "./ht-shotshell-source-data.js";
// Pure predicates. Facts passed here are resolved from catalog records and reviewed primary sources.
const message = (code, detail) => ({ code, message: detail });
const numeric = n => typeof n === "number" && Number.isFinite(n);
export function evaluateHTOptionEligibility(option, facts) {
  const e = option.eligibility_v1, checks = [];
  const add = (field, status, detail) => checks.push({ field, status, detail });
  if (!e || e.contract !== "ht-option-eligibility-v1") return { status: "undetermined", checks: [], reasons: [message("MISSING_ELIGIBILITY", "Structured eligibility is unavailable.")], warnings: [], applicationAllowed: false };
  const allowed = { munition_classes_any: "munitionClasses", projectile_classes_any: "projectileClasses", weapon_actions_any: "weaponActions", weapon_platforms_any: "weaponPlatforms", case_types_any: "caseTypes" };
  for (const [key, value] of Object.entries(e.conditions)) {
    // HT170 says principally HMG/autocannon, not exclusively. UT restrictions remain separate.
    if (option.id === "ht_aphex" && key === "weapon_platforms_any") continue;
    if (allowed[key]) {
      const fact = facts[allowed[key]];
      // HT169 principally uses autocannon; its explicit other-platform permission needs design evidence.
      // Knowing that the weapon is a rifle does not establish that no such source/GM design can exist.
      const conditionalOther = ["ht_apdu", "ht_apdsdu"].includes(option.id) && key === "weapon_platforms_any" &&
        value.includes("source_verified_other_platform");
      add(key, fact?.values?.some(v => value.includes(v)) ? "confirmed" : fact?.complete && !conditionalOther ? "incompatible" : "undetermined", "Required classes: " + value.join(", "));
    } else if (key === "forbidden_classes") {
      const fact = facts.classes;
      const excluded = value.every(id => fact?.exclusions?.some(entry => entry.value === id && entry.source));
      add(key, fact?.values?.some(v => value.includes(v)) ? "incompatible" : fact?.complete || excluded ? "confirmed" : "undetermined", "Forbidden classes: " + value.join(", "));
    } else if (key === "minimum_caliber_mm" || key === "maximum_caliber_mm") {
      const n = facts.caliberMm;
      add(key, !numeric(n) ? "undetermined" : (key === "minimum_caliber_mm" ? n >= value : n <= value) ? "confirmed" : "incompatible", "Explicit numeric caliber required; bound " + value);
    } else if (key === "minimum_availability_tl") {
      add(key, !numeric(facts.availabilityTL) ? "undetermined" : facts.availabilityTL >= value ? "confirmed" : "incompatible", "Explicit ammunition availability TL required.");
    } else if (key === "requires_base_variant_id") {
      add(key, !facts.baseVariantId ? "undetermined" : facts.baseVariantId === value ? "confirmed" : "incompatible", "Required base variant: " + value);
    } else add(key, "undetermined", "Unsupported condition; no permission is inferred.");
  }
  if (numeric(option.min_tl)) {
    // HT164: broad small-arms min_tl does not prohibit source-backed late-TL5 shotgun cases.
    if (option.id === "ht_light_case" && (!facts.munitionClasses?.values?.includes("small_arms_cartridge")))
      add("min_tl", "undetermined", "Light-case availability needs the source-backed shotshell/small-arms branch; broad min_tl is not universal.");
    else add("min_tl", !numeric(facts.availabilityTL) ? "undetermined" : facts.availabilityTL >= option.min_tl ? "confirmed" : "incompatible", "Option availability TL, never native weapon/skill TL.");
  }
  for (const requirement of e.explicit_evidence_required) {
    const evidence = facts.evidence?.[requirement];
    add("explicit_evidence_required." + requirement, evidence?.value === true && evidence.source ? "confirmed" : evidence?.value === false && evidence.source ? "incompatible" : "undetermined", "Required source-backed evidence: " + requirement);
  }
  if (e.do_not_reapply_native_effects) {
    const present = facts.nativeEffects?.[e.overlap_guard];
    add("overlap_guard", present === true ? "incompatible" : present === false ? "confirmed" : "undetermined", e.overlap_guard ?? "Native effect identity is not established.");
  }
  for (const conflict of facts.combinationConflicts ?? []) add("combination", "incompatible", conflict);
  for (const missing of facts.missingContext ?? []) add("context", "undetermined", missing);
  const status = checks.some(c => c.status === "incompatible") ? "incompatible" : checks.some(c => c.status === "undetermined") ? "undetermined" : "compatible";
  return { status, checks, applicationAllowed: status === "compatible", reasons: checks.filter(c => c.status !== "confirmed").map(c => message(c.status === "incompatible" ? "ELIGIBILITY_PROHIBITION" : "ELIGIBILITY_EVIDENCE_MISSING", c.field + ": " + c.detail)), warnings: [] };
}

/** Semantic translations of explicit fields; no parsing names/caliber_hint or generic skill tags. */
export function resolveHTCatalogFacts({ mode, ammo, catalogs, availabilityTL, baseVariantId, selectedVariants = [] }) {
  const facts = { availabilityTL, baseVariantId, evidence: {}, nativeEffects: {}, combinationConflicts: [], missingContext: [],
    munitionClasses: { values: [], complete: false }, projectileClasses: { values: [], complete: false },
    weaponPlatforms: { values: [], complete: false }, weaponActions: { values: [], complete: false },
    caseTypes: { values: [], complete: false }, classes: { values: [], complete: false }, provenance: [] };
  if (!ammo) { facts.missingContext.push("Choose a uniquely linked ammo item; mode has multiple/no ammunition contexts."); ammo = {}; }
  const construction = ammo.ammunition_construction;
  if (ammo.book_cost_weight_verified && numeric(ammo.cost_per_shot_usd)) facts.baseCostPerShot = ammo.cost_per_shot_usd;
  facts.munitionClasses.values.push(ammo.ammunition_class);
  if (construction === "fixed_cased") { facts.munitionClasses.values.push("fixed_round", "cased_round"); facts.caseTypes = { values: ["cased"], complete: true }; }
  if (construction === "powder_and_shot") { facts.munitionClasses.values.push("powder_and_shot"); facts.caseTypes = { values: ["none"], complete: true }; }
  if (construction === "caseless") { facts.munitionClasses.values.push("caseless_round"); facts.caseTypes = { values: ["caseless"], complete: true }; }
  if (construction === "consumable_cased") { facts.munitionClasses.values.push("consumable_cased_round"); facts.caseTypes = { values: ["consumable", "semi_consumable"], complete: false }; }
  if (ammo.ammunition_class === "shotgun_shell") facts.munitionClasses.values.push("shotgun_shotshell");
  // Only an actual numeric field can satisfy a caliber bound, not a label or nominal bore.
  facts.caliberMm = numeric(ammo.caliber_mm) ? ammo.caliber_mm : numeric(mode.ammunition_profile?.caliber_mm) ? mode.ammunition_profile.caliber_mm : undefined;
  const m = mode.mechanism;
  const actions = { revolver: ["revolver"], "bolt-action": ["bolt_action", "manual"], "straight-pull-bolt-action": ["bolt_action", "manual"],
    "single-shot": ["single_shot", "manual"], "single-shot-breechloader": ["single_shot", "manual"], "single-shot-smoothbore": ["single_shot", "manual"],
    "single-shot-special": ["single_shot", "manual"], "break-action": ["manual"], "pump-action": ["manual"], "lever-action": ["manual"],
    automatic: ["automatic"], "self-loading": ["self_loading"] };
  if (m?.confidence === "high" && actions[m.action_system]) facts.weaponActions = { values: actions[m.action_system], complete: true };
  if (m?.confidence === "high" && (m.action_system === "automatic" || m.fire_capabilities?.includes("automatic-fire"))) facts.classes.values.push("automatic_weapon");
  if (m?.confidence === "high" && m.action_system === "revolver") facts.weaponPlatforms.values.push("revolver");
  const native = (ammo.native_linked_mode_ids ?? []).map(id => catalogs.getMode(id));
  if (native.some(m => m?.role === "linked-effect")) facts.nativeEffects["do-not-duplicate-native-linked-effects"] = true;
  if (native.some(m => m?.role === "follow-up" || m?.attack_resolution?.linked_role === "follow-up")) facts.nativeEffects["do-not-duplicate-native-follow-up"] = true;
  if (baseVariantId) {
    const base = catalogs.getVariant("ht", baseVariantId);
    if (!base || base.layer !== "projectile") facts.missingContext.push("Base variant is missing or is not a projectile layer.");
    // The proposed base is context, not proof of its construction or suitability.
  }
  const byLayer = new Map();
  for (const variant of selectedVariants) {
    if (!variant) { facts.missingContext.push("Unknown selected variant ID."); continue; }
    if (["projectile", "cartridge_upgrade", "case_construction"].includes(variant.layer)) {
      if (byLayer.has(variant.layer)) {
        const previousId = byLayer.get(variant.layer), previous = selectedVariants.find(v => v?.id === previousId);
        if (variant.eligibility_v1?.conditions.requires_base_variant_id !== previousId && previous?.eligibility_v1?.conditions.requires_base_variant_id !== variant.id)
          facts.combinationConflicts.push("Multiple mutually exclusive variants in " + variant.layer + ": " + previousId + "/" + variant.id);
      }
      byLayer.set(variant.layer, variant.id);
    }
    for (const id of variant.excludes ?? []) if (selectedVariants.some(v => v?.id === id)) facts.combinationConflicts.push("Explicit exclusion: " + variant.id + "/" + id);
  }
  facts.provenance.push({ ammoItemId: ammo.id, fields: ["ammunition_class", "ammunition_construction", "native_linked_mode_ids"], modeId: mode.weapon_mode_id, mechanismConfidence: m?.confidence ?? null });
  applyReviewedHTEvidence(facts, mode, ammo, selectedVariants);
  // A confirmed kinetic bullet is a bullet, but this does not prove a tracer component.
  if (selectedVariants.some(v => v?.id === "ht_tracer") && facts.projectileClasses.values.includes("kinetic_bullet"))
    facts.projectileClasses.values = [...new Set([...facts.projectileClasses.values, "bullet"])];
  if (selectedVariants.some(v=>["ht_duplex","ht_triplex"].includes(v?.id)) && facts.weaponPlatforms.values.includes("rifle") && facts.weaponActions.complete) {
    if (facts.weaponActions.values.includes("automatic")) facts.weaponPlatforms.values.push("automatic_rifle");
    else if (facts.weaponActions.values.includes("bolt_action")) facts.weaponPlatforms.values.push("bolt_action_rifle");
  }
  for (const variant of selectedVariants) {
    const reviewed = reviewedMultishotFacts(mode, ammo, variant?.id);
    if (reviewed) { Object.assign(facts, reviewed, { evidence: { ...facts.evidence, ...reviewed.evidence } });
      facts.provenance.push({ source: reviewed.source, modeId: mode.weapon_mode_id, ammoItemId: ammo.id }); }
  }
  const weaponTL = String(catalogs.getEquipmentForMode?.(mode.weapon_mode_id)?.tech_level ?? "");
  if (/^\d+$/.test(weaponTL)) facts.weaponTL = Number(weaponTL);
  return facts;
}
