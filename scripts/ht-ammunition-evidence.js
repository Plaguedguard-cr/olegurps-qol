import { HT_KINETIC_FAMILY_FACTS, HT_REVIEWED_PLATFORMS, HT_RIFLE_CARTRIDGE_IDS } from "./ht-kinetic-family-data.js";
import { applyHTSpecialEvidence, applyHTSubsonicExclusions } from "./ht-special-ammunition-evidence.js";
import { HT_12G_CASE_CONSTRUCTIONS, reviewedShotshellConstruction } from "./ht-shotshell-source-data.js";
import { reviewedNativePlusPBaseline } from "./ht-native-charge-profiles.js";
// Reviewed source facts: exact catalog families plus class rules, never a caliber-based chamber join.
export const AK47_MODE_ID = "W27s4Lm8QlkKVKUPn";
export const AK47_AMMO_ID = "ht_7_62x39mm";
export function applyReviewedHTEvidence(facts, mode, ammo, selectedVariants = []) {
  applyHTSubsonicExclusions(facts, mode, ammo, selectedVariants);
  applyHTClassEvidence(facts, mode, ammo, selectedVariants);
  if (mode?.weapon_mode_id !== AK47_MODE_ID || ammo?.id !== AK47_AMMO_ID ||
      !ammo.weapon_mode_ids?.includes(AK47_MODE_ID) || ammo.ammunition_class !== "small_arms_cartridge" ||
      ammo.ammunition_construction !== "fixed_cased" || mode.stats?.damage?.type !== "pi" ||
      mode.mechanism?.confidence !== "high" || mode.mechanism.action_system !== "automatic") return;
  facts.caliberMm = 7.62;
  facts.muzzleVelocityFps = 2536; // Reviewed Barnaul HP123 value; used only by the HP expansion rule.
  facts.projectileClasses = { values: ["solid", "fmj", "kinetic_bullet"], complete: true };
  facts.weaponPlatforms = { values: ["rifle"], complete: true };
  // Contemporary source-backed constructions, independent of the Actor's weapon or skill TL.
  facts.availabilityTL ??= 8;
  const apSource = "HT 114, 120, 166-167; ATS Ammo 2025 p15 (7.62x39 AP lead/steel core): https://atsammo.mk/wp-content/uploads/2025/04/Catalog-ATS-Ammo-2025-compressed.pdf";
  facts.evidence.hardened_ap_construction_available = { value: true, source: apSource };
  facts.evidence.hardcore_penetrator_construction_available = { value: true,
    source: apSource + "; HT167 APHC small-arms steel core in a lighter projectile body" };
  facts.evidence.expanding_bullet_suitable_for_this_cartridge = { value: true,
    source: "HT166-167; Barnaul 7.62x39 HP123/SP125, AK47 application: https://www.barnaulammo.com/rifle-ammo/barnaul-762x39.php" };
  facts.nativeEffects["do-not-duplicate-native-follow-up"] ??= false;
  facts.provenance.push({ source: "reviewed-ak47-constructions-v1", modeId: AK47_MODE_ID,
    ammoItemId: AK47_AMMO_ID, references: [apSource, facts.evidence.expanding_bullet_suitable_for_this_cartridge.source] });
  // No explosive-shell or APEX/APHEX evidence is asserted by these sources.
}

function applyHTClassEvidence(facts, mode, ammo, selectedVariants) {
  const family = HT_KINETIC_FAMILY_FACTS[ammo?.id];
  const baseline = family && ammo.ammunition_class === "small_arms_cartridge" && ammo.ammunition_construction === "fixed_cased" &&
    mode?.role === "attack" && !mode.hidden && mode.combat_type === "ranged" && mode.weapon_family === "firearm" &&
    mode.ht_ammo_resolution?.status === "exact_chambering" && ammo.weapon_mode_ids?.includes(mode.weapon_mode_id) &&
    !ammo.native_linked_mode_ids?.length && !mode.resolution_flags?.length &&
    /^\d+(?:\.\d+)?d(?:[+-]\d+){0,2}(?:x\d+)? (pi-|pi|pi\+|pi\+\+)$/.test(mode.raw_calc?.damage ?? "");
  if (!baseline) {
    // HT165 is a charge rule, independent of the kinetic-projectile family gate.
    // Restrict this review to native, simple powder small arms: no rocket,
    // electrical, linked/explosive component or pre-existing armor-divisor inference.
    const plusP = selectedVariants.some(v => v?.id === "ht_plus_p");
    const powderSmallArm = ["firearm", "gunner"].includes(mode?.weapon_family) &&
      ["small_arms_cartridge", "shotgun_shell", "separate_powder_and_shot"].includes(ammo?.ammunition_class) &&
      ["fixed_cased", "powder_and_shot"].includes(ammo?.ammunition_construction);
    const native = mode?.role === "attack" && !mode.hidden && mode.combat_type === "ranged" &&
      ["exact_chambering", "source_verified_existing_round"].includes(mode.ht_ammo_resolution?.status) &&
      ammo?.weapon_mode_ids?.includes(mode.weapon_mode_id) && !ammo.native_linked_mode_ids?.length && !mode.resolution_flags?.length;
    const simple = /^\d+(?:\.\d+)?d(?:[+-]\d+){0,2}(?:x\d+)? (pi-|pi|pi\+|pi\+\+)$/.test(mode?.raw_calc?.damage ?? "");
    const nativeCharge = plusP && reviewedNativePlusPBaseline(mode, ammo);
    if (plusP && powderSmallArm && native && (simple || nativeCharge)) {
      applyHTSpecialEvidence(facts, mode, ammo, selectedVariants);
      if (nativeCharge) {
        facts.nativeChargeBaseline = nativeCharge;
        facts.provenance.push({ source: nativeCharge.source, modeId: mode.weapon_mode_id, ammoItemId: ammo.id,
          construction: nativeCharge.construction, projectileEffectsIncluded: true, review: "user-verified-HT-native-charge-v1" });
      }
      // Native ! explicitly denotes a full-auto mode even when the descriptive mechanism is less certain.
      if (/^\d+!$/.test(mode.stats?.rate_of_fire ?? "")) facts.weaponActions = { values: ["automatic"], complete: true };
      else if (mode.mechanism?.confidence === "high") {
        if (mode.mechanism.fire_capabilities?.includes("automatic-fire"))
          facts.weaponActions = { values: ["automatic"], complete: true };
        else if (mode.mechanism.action_system === "hybrid-pump-self-loading")
          facts.weaponActions = { values: ["manual", "self_loading"], complete: true };
      }
      facts.provenance.push({ source: "reviewed-ht165-powder-small-arms-v1", ammoItemId: ammo.id,
        modeId: mode.weapon_mode_id, references: ["HT165-166; HT79; B409"], platformSafety: "undetermined" });
      const caseConstruction = reviewedShotshellConstruction(ammo);
      if (caseConstruction) {
        facts.caseConstruction = structuredClone(caseConstruction);
      }
      if (HT_12G_CASE_CONSTRUCTIONS[ammo.id] && !caseConstruction)
        facts.plusPBaselineUnresolved = true;
    }
    return;
  }
  facts.caliberMm ??= family.caliberMm;
  facts.projectileClasses = { values: ["solid", "fmj", "kinetic_bullet"], complete: false };
  const evidence = (id, source) => { facts.evidence[id] ??= { value: true, source }; };
  evidence("hardened_ap_construction_available", "HT167: AP available for small arms; HT166 neutral solid baseline; reviewed exact family");
  evidence("hardcore_penetrator_construction_available", "HT167: APHC available for small arms; HT166 neutral solid baseline; reviewed exact family");
  evidence("expanding_bullet_suitable_for_this_cartridge", "HT166-167: expanding rifle/pistol bullets; HT174 constructible hollow-point; reviewed exact family");
  const spec = mode.governing_skill?.status === "resolved" ? mode.governing_skill.skill?.specialization : null;
  if (spec === "Rifle") facts.weaponPlatforms.values.push("rifle");
  if (["Machine Gun", "Light Machine Gun"].includes(spec)) facts.weaponPlatforms.values.push("machine_gun");
  const reviewedPlatform = HT_REVIEWED_PLATFORMS[mode.weapon_mode_id];
  if (reviewedPlatform) facts.weaponPlatforms.values.push(reviewedPlatform);
  if (HT_RIFLE_CARTRIDGE_IDS.includes(ammo.id) && facts.weaponPlatforms.values.some(v=>["rifle", "machine_gun"].includes(v))) {
    facts.classes.exclusions = [{ value: "pistol_cartridge", source: "HT110-127,176-177 reviewed rifle/MG family" }];
    evidence("apds_round_for_this_chamber_confirmed", "HT167: APDS permitted for rifle/MG chamberings; HT110-127,176-177 exact reviewed non-pistol cartridge family + source platform");
  }
  if (facts.weaponPlatforms.values.includes("rifle") && family.caliberMm <= 10)
    evidence("flechette_load_design_confirmed", "HT168: SAPFSDS for small-arm rifles up to 10 mm; experimental construction permitted by the general class rule");
  if (reviewedPlatform === "anti_materiel_rifle" && ammo.id === "ht_50_browning_12_7x99mm")
    evidence("apfsds_round_for_this_chamber_confirmed", "HT167: .50 Browning experimental APFSDS for anti-materiel rifles; HT118-119 confirmed AMR role");
  // This describes the available contemporary construction, never the Actor's or weapon's TL.
  if (selectedVariants.some(v=>["ht_ap", "ht_aphc", "ht_hollow_point", "ht_apds", "ht_apfsds", "ht_sapfsds"].includes(v?.id))) facts.availabilityTL ??= 8;
  facts.provenance.push({ source: "reviewed-ht-kinetic-families-v1", ammoItemId: ammo.id, modeId: mode.weapon_mode_id,
    references: ["HT161-163,166-168,174,176-177"], constructionAvailabilityTL: facts.availabilityTL ?? null });
  applyHTSpecialEvidence(facts, mode, ammo, selectedVariants);
}
