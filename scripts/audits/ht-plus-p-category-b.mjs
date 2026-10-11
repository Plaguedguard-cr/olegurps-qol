import { AutomaticAmmunitionProfileService } from "../tools/automatic-ammunition-profiles.js";
import { AttackProfileResolver } from "../tools/attack-profile-resolver.js";
import { parseWeaponBulk } from "../tools/weapon-bulk.js";
import { currentHTPairAmmo } from "../ht-physical-ammunition-evidence.js";

/** Exactly 511 +P pairs; the saved blocker report supplies the historical B boundary. No writes. */
export function auditPlusPCategoryB({ catalogs, compatibility, baseline }) {
  const automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
  const resolver = new AttackProfileResolver({ catalogs, compatibility, automaticProfiles: automatic });
  const before = new Map(baseline.rows.map(r => [r.modeId + "/" + r.ammoItemId, r]));
  const all = [], rows = [];
  for (const historicalAmmo of catalogs.getCatalog("ht").ammo_items) for (const modeId of historicalAmmo.weapon_mode_ids) {
    const ammo = currentHTPairAmmo(catalogs, modeId, historicalAmmo.id);
    const mode = catalogs.getMode(modeId), equipment = catalogs.getEquipmentForMode(modeId);
    const base = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: ammo.id, name: ammo.name };
    const raw = { name: equipment.name, damage: mode.raw_calc.damage, range: mode.stats.range, st: mode.stats.strength,
      acc: mode.stats.accuracy, rof: mode.stats.rate_of_fire, rcl: mode.stats.recoil, bulk: mode.stats.bulk };
    const binding = { status: "confirmed", binding: { confirmed: true, modeId } };
    const prepared = automatic.prepare({ modeId, base, variantId: "ht_plus_p" });
    const type = prepared.type ?? { ...base, recipe: { version: 1, variantId: "ht_plus_p" } };
    const input = { actorId: "audit", weaponId: "weapon", rawAttack: raw, binding, ammunition: { type }, profilePolicy: "permissive" };
    const profile = resolver.resolve(input);
    const rules = compatibility.checkCompatibility(modeId, "ht_plus_p", { book: "ht", kind: "cartridge-upgrade", ammoItemId: ammo.id });
    const previous = before.get(modeId + "/" + historicalAmmo.id);
    all.push({ modeId, ammoId: ammo.id, ...(ammo.id !== historicalAmmo.id ? { historicalAmmoId: historicalAmmo.id } : {}), ready: profile.damage.nativeSafe, previousCategory: previous?.primaryCategory ?? null,
      reason: profile.damage.reason, rulesStatus: rules.status });
    if (previous?.primaryCategory !== "B") continue;
    // Read-only simulation of the existing explicit GM loading confirmation, not a world approval write.
    const approval = { active: true, actorId: "audit", weaponId: "weapon", modeId, ammoId: ammo.id,
      variantId: "ht_plus_p", recipeId: type.recipe.customId, fingerprint: JSON.stringify({}), plusPDecision: { loadingCheckPassed: true } };
    // Reuse the production fingerprint; do not forge official catalog compatibility.
    approval.fingerprint = fingerprint(type);
    const confirmed = resolver.resolve({ ...input, approval });
    const standaloneOnly = [];
    if (raw.acc === null || !Number.isFinite(Number(String(raw.acc).split("+")[0]))) standaloneOnly.push("Acc");
    if (!parseWeaponBulk(raw.bulk)) standaloneOnly.push("Bulk");
    rows.push({ modeId, equipmentId: equipment.equipment_id, name: equipment.name, ammoId: ammo.id,
      source: equipment.reference, raw, officialStatus: rules.status, preparation: prepared.state,
      numericReady: prepared.state === "complete", runtimeReadyWithoutLoadingConfirmation: profile.damage.nativeSafe,
      runtimeReadyAfterScopedGMConfirmation: confirmed.damage.nativeSafe,
      reason: prepared.reasons[0] ?? profile.damage.reason ?? null,
      loadingCheckRequired: ammo.ammunition_construction === "powder_and_shot",
      standaloneOnly, effective: confirmed.damage.nativeSafe ? confirmed.effective : null,
      support: confirmed.damage.support?.status ?? "UNDETERMINED",
      gm: { platformSafety: "world-policy-or-individual-GM; never official-compatible", Malf: "manual-GM",
        RoF: "individual-GM-or-native", B409: "native-GGA-calculator-explicit-GM-selection" } });
  }
  return { version: 1, scope: "511 +P pairs, 106 historical B rows only", full32704AuditRun: false,
    examined: all.length, previousReady: baseline.ready, readyWithoutLoadingConfirmation: all.filter(r => r.ready).length,
    newNumericProfiles: rows.filter(r => r.numericReady).length, newReadyWithoutLoadingConfirmation: rows.filter(r => r.runtimeReadyWithoutLoadingConfirmation).length,
    readyAfterRequiredGMConfirmations: baseline.ready + rows.filter(r => r.runtimeReadyAfterScopedGMConfirmation).length,
    incompleteB: rows.filter(r => !r.numericReady).length, loadingChecks: rows.filter(r => r.loadingCheckRequired).length,
    standaloneOnlyBlockedPairs: rows.filter(r => r.numericReady && r.standaloneOnly.length).length,
    unchangedClosed: Object.fromEntries(["E", "F", "G"].map(k => [k, {
      count: all.filter(r => r.previousCategory === k).length,
      opened: all.filter(r => r.previousCategory === k && r.ready).length }])), rows, all };
}
import { recipeFingerprint as fingerprint } from "../tools/ammunition-approval-service.js";
