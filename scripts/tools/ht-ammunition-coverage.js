import { AttackProfileResolver } from "./attack-profile-resolver.js";
import { AutomaticAmmunitionProfileService, isExplosiveRecipe } from "./automatic-ammunition-profiles.js";
import { FIRST_STAGE_VARIANTS } from "./ammunition-recipes.js";
import { ammoTypeKey } from "./ammo-inventory.js";
import { isAutomaticReferenceRecipe } from "./ht-kinetic-rules.js";
import { currentHTPairAmmo } from "../ht-physical-ammunition-evidence.js";
import { SEALED_PLATFORM_UNITS } from "./ammunition-resource-contract.js";

const collections = { cartridge_upgrades: "cartridge-upgrade", projectile_options: "projectile-option",
  projectile_upgrades: "projectile-upgrade", case_construction_options: "case-option" };
export function htCoverageCategory(id) {
  if (["ht_ap", "ht_aphc", "ht_apds", "ht_apfsds", "ht_apdu", "ht_apdsdu", "ht_apfsdsdu", "ht_sapfsds"].includes(id)) return "armor-piercing";
  if (["ht_hollow_point", "ht_frangible"].includes(id)) return "expanding";
  if (["ht_le", "ht_saple", "ht_apex", "ht_he", "ht_saphe", "ht_saphec", "ht_aphex", "ht_efp", "ht_heat", "ht_hedp", "ht_hesh", "ht_ms_heat", "ht_thermobaric", "ht_shrapnel", "ht_beehive", "ht_abf"].includes(id)) return "explosive-fragmentation";
  if (["ht_plus_p", "ht_match_grade", "ht_match_handloaded", "ht_subsonic_pistol", "ht_subsonic_rifle", "ht_rifled_slug", "ht_solid"].includes(id)) return "kinetic-and-ballistic";
  if (["ht_baton", "ht_beanbag", "ht_underwater_dart", "ht_silent", "ht_caseless", "ht_consumable_case", "ht_light_case", "ht_canister", "ht_shotshell", "ht_buck_and_ball", "ht_duplex", "ht_triplex", "ht_multi_flechette", "ht_rubber_shot"].includes(id)) return "nonstandard-platforms";
  return "incendiary-and-special";
}
/** Native linked mode/ammo pairs only; categories never add item/family/option inventories together. */
export function auditHTCoverage({ catalogs, compatibility, policy = "permissive", includeIdentities = false }) {
  const ht = catalogs.getCatalog("ht"), automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
  const resolver = new AttackProfileResolver({ catalogs, compatibility, automaticProfiles: automatic });
  const variants = Object.entries(collections).flatMap(([collection, kind]) => ht[collection].map(v=>({ ...v, kind })));
  const report = { inventory: { items: ht.ammo_items.length, families: ht.ammo_families.length,
    projectileOptions: ht.projectile_options.length, eligibilityOptions: variants.length }, policy, nativePairs: 0,
    ordinary: { total: 0, ready: 0, unconfirmed: 0 }, categories: {}, variants: {}, familiesReady: {}, unavailableReasons: {}, directedHT178: {} };
  if (includeIdentities) report.readyIdentities = [];
  for (const v of variants) report.variants[v.id] = { category: htCoverageCategory(v.id), total: 0, ready: 0,
    compatible: 0, undetermined: 0, incompatible: 0, baseConfirmed: 0, nativePreservedSourceOverrides: 0,
    effectIntegration: FIRST_STAGE_VARIANTS.includes(v.id) ? "implemented" : "deferred",
    support: { AUTOMATED: 0, "GM-MEDIATED": 0, PARTIAL: 0, UNDETERMINED: 0 },
    preparedComplete: 0, approvalRequiredUnderStrictPolicy: 0, missingInputs: {}, reasons: {} };
  for (const original of ht.ammo_items) for (const modeId of original.weapon_mode_ids) {
    const ammo = currentHTPairAmmo(catalogs, modeId, original.id);
    const mode = catalogs.getMode(modeId), base = compatibility.checkCompatibility(modeId, ammo.id, { book: "ht", kind: "ammo-item" });
    report.nativePairs++; report.ordinary.total++;
    report.ordinary[base.status === "compatible" ? "ready" : "unconfirmed"]++;
    const raw = { name: catalogs.getEquipmentForMode(modeId).name, damage: mode.raw_calc.damage,
      acc: mode.stats.accuracy, range: mode.stats.range, rof: mode.stats.rate_of_fire, rcl: mode.stats.recoil, st: mode.stats.strength };
    for (const v of variants) {
      const group = report.variants[v.id]; group.total++;
      if (base.status === "compatible") group.baseConfirmed++;
      const rules = compatibility.checkCompatibility(modeId, v.id, { book: "ht", kind: v.kind, ammoItemId: ammo.id });
      group[rules.status]++;
      let type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: ammo.id, name: ammo.name,
        recipe: { version: 1, variantId: v.id } };
      let prepared = null;
      if (isExplosiveRecipe(type) || isAutomaticReferenceRecipe(type)) {
        prepared = automatic.prepare({ modeId, base: type, variantId: v.id });
        type = prepared.type ?? type;
        if (prepared.state === "complete") {
          group.preparedComplete++;
          if (!automatic.admission(prepared, { policy: "strict" }).allowed) group.approvalRequiredUnderStrictPolicy++;
        } else if (base.status === "compatible" && rules.status !== "incompatible") {
          for (const field of prepared.missing) group.missingInputs[field] = (group.missingInputs[field] ?? 0) + 1;
        }
      }
      type.key ??= ammoTypeKey(type);
      const profile = resolver.resolve({ actorId: "coverage", weaponId: "coverage", rawAttack: raw,
        binding: { status: "confirmed", binding: { confirmed: true, modeId } }, ammunition: { type, ammoKey: type.key }, profilePolicy: policy });
      // Generic overlap guards prohibit applying HEAT twice, not firing a published native HEAT round.
      // Keep the generic status, but account separately for exact, unchanged source payloads.
      const nativePreserved = prepared?.nativePreserved === true && prepared.referenceConfirmed === true &&
        profile.damage.nativeSafe && rules.status === "incompatible" &&
        rules.reasons.filter(r => r.code === "ELIGIBILITY_PROHIBITION").every(r => r.message.startsWith("overlap_guard:") ||
          prepared.facts?.multishotDefinition?.referenceVerified && prepared.facts.multishotDefinition.publishedPlatformException &&
          r.message.startsWith("weapon_platforms_any:"));
      const ready = !SEALED_PLATFORM_UNITS[modeId] && FIRST_STAGE_VARIANTS.includes(v.id) && base.status === "compatible" &&
        (rules.status !== "incompatible" || nativePreserved) && profile.damage.nativeSafe;
      if (ready && nativePreserved) group.nativePreservedSourceOverrides++;
      if (ready) {
        if (includeIdentities) report.readyIdentities.push({ modeId, ammoId: ammo.id, variantId: v.id });
        group.support[profile.damage.support?.status ?? "AUTOMATED"]++;
        group.ready++; report.familiesReady[ammo.ammo_family_id] ??= [];
        if (!report.familiesReady[ammo.ammo_family_id].includes(v.id)) report.familiesReady[ammo.ammo_family_id].push(v.id);
      } else {
        if (rules.status !== "incompatible") group.support[profile.damage.support?.status === "PARTIAL" ? "PARTIAL" : "UNDETERMINED"]++;
        const reason = rules.status === "incompatible" ? "explicit-incompatibility" :
          !FIRST_STAGE_VARIANTS.includes(v.id) ? "effect-not-integrated" :
          prepared?.state === "incomplete" && prepared.missing.length ? "explosive-parameters-missing" : profile.damage.reason ?? "missing-inputs-or-evidence";
        group.reasons[reason] = (group.reasons[reason] ?? 0) + 1;
        report.unavailableReasons[reason] = (report.unavailableReasons[reason] ?? 0) + 1;
      }
    }
  }
  for (const [id, v] of Object.entries(report.variants)) {
    v.potential = v.total - v.incompatible + v.nativePreservedSourceOverrides; v.incomplete = v.potential - v.ready;
    report.categories[v.category] ??= { variants: [], total: 0, ready: 0, compatible: 0, undetermined: 0, incompatible: 0, nativePreservedSourceOverrides: 0 };
    const c = report.categories[v.category]; c.variants.push(id);
    for (const key of ["total", "ready", "compatible", "undetermined", "incompatible", "nativePreservedSourceOverrides"]) c[key] += v[key];
  }
  for (const category of Object.values(report.categories)) {
    category.potential = category.total - category.incompatible + category.nativePreservedSourceOverrides;
    category.incomplete = category.potential - category.ready;
    category.percent = category.potential ? category.ready / category.potential * 100 : 0;
  }
  for (const rule of ht.interchangeability_rules) for (const pair of rule.explicit_direction_v1?.mode_pair_assessments ?? []) {
    const result = compatibility.checkCompatibility(pair.mode_id, pair.target_ammo_item_id, { book: "ht", kind: "ammo-item" });
    report.directedHT178[result.status] = (report.directedHT178[result.status] ?? 0) + 1;
  }
  report.special = { total: Object.values(report.variants).reduce((n,v)=>n+v.total,0), ready: Object.values(report.variants).reduce((n,v)=>n+v.ready,0) };
  report.special.genericIncompatible = Object.values(report.variants).reduce((n,v)=>n+v.incompatible,0);
  report.special.nativePreservedSourceOverrides = Object.values(report.variants).reduce((n,v)=>n+v.nativePreservedSourceOverrides,0);
  report.special.incompatible = report.special.genericIncompatible - report.special.nativePreservedSourceOverrides;
  report.special.potential = report.special.total - report.special.incompatible;
  report.special.incomplete = report.special.potential - report.special.ready;
  report.special.percent = report.special.potential ? report.special.ready / report.special.potential * 100 : 0;
  return report;
}
