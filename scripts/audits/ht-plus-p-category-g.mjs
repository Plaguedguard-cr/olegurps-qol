import { auditPlusPCategoryB } from "./ht-plus-p-category-b.mjs";
import { AutomaticAmmunitionProfileService } from "../tools/automatic-ammunition-profiles.js";
import { AttackProfileResolver } from "../tools/attack-profile-resolver.js";
import { recipeFingerprint } from "../tools/ammunition-approval-service.js";
import { currentHTPairAmmo } from "../ht-physical-ammunition-evidence.js";

/** Read-only recount of exactly 511 +P pairs. No general HT audit or resource migration. */
export function auditPlusPCategoryG({ catalogs, compatibility, historical, before }) {
  const current = auditPlusPCategoryB({ catalogs, compatibility, baseline: historical });
  const automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
  const resolver = new AttackProfileResolver({ catalogs, compatibility, automaticProfiles: automatic });
  const rows = historical.rows.filter(r => r.primaryCategory === "G").map(old => {
    const mode = catalogs.getMode(old.modeId), ammo = currentHTPairAmmo(catalogs, old.modeId, old.ammoItemId);
    const base = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: ammo.id, name: ammo.name };
    const prepared = automatic.prepare({ modeId: old.modeId, base, variantId: "ht_plus_p" });
    const raw = { name: catalogs.getEquipmentForMode(old.modeId).name, damage: mode.raw_calc.damage,
      range: mode.stats.range, st: mode.stats.strength, acc: mode.stats.accuracy,
      rof: mode.stats.rate_of_fire, rcl: mode.stats.recoil, bulk: mode.stats.bulk };
    const type = prepared.type ?? { ...base, recipe: { version: 1, variantId: "ht_plus_p" } };
    const approval = { active: true, actorId: "audit", weaponId: "weapon", modeId: old.modeId,
      ammoId: ammo.id, variantId: "ht_plus_p", recipeId: type.recipe.customId, fingerprint: recipeFingerprint(type),
      ...(ammo.ammunition_construction === "powder_and_shot" ? { plusPDecision: { loadingCheckPassed: true } } : {}) };
    const input = { actorId: "audit", weaponId: "weapon", rawAttack: raw,
      binding: { status: "confirmed", binding: { confirmed: true, modeId: old.modeId } },
      ammunition: { type }, profilePolicy: "permissive" };
    const world = resolver.resolve(input), gm = resolver.resolve({ ...input, approval });
    return { modeId: old.modeId, ammoId: ammo.id, name: raw.name, native: raw,
      officialStatus: prepared.rulesStatus, numericalProfileComplete: prepared.state === "complete",
      nativeGGAProfileSafeAfterGM: gm.damage.nativeSafe, worldPolicyReady: world.damage.nativeSafe,
      individualGMRequired: !!prepared.facts?.nativeChargeBaseline?.individualGMRequired,
      manualGMConditions: gm.damage.support?.manual ?? [],
      incompleteReason: prepared.state !== "complete" ? prepared.reasons[0] : null,
      effective: gm.damage.nativeSafe ? gm.effective : null,
      provenance: prepared.facts?.nativeChargeBaseline ?? null };
  });
  const key = r => r.modeId + "/" + (r.ammoId ?? r.ammoItemId);
  const previousReady = before.all.filter(r => r.ready), now = new Map(current.all.map(r => [key(r), r]));
  const excluded = historical.rows.filter(r => ["E", "F"].includes(r.primaryCategory));
  return { version: 1, scope: "511 +P pairs; 11 historical G cases", full32704AuditRun: false,
    examined: current.examined, previousWorldReady: previousReady.length,
    existingReadyPreserved: previousReady.every(r => now.get(key(r))?.ready),
    existing27LoadingConfirmationsPreserved: before.loadingChecks === 27 && current.loadingChecks === 27 &&
      before.rows.every(old => current.rows.some(r => key(r) === key(old) &&
        r.numericReady === old.numericReady && r.runtimeReadyAfterScopedGMConfirmation === old.runtimeReadyAfterScopedGMConfirmation)),
    excludedEFStillClosed: excluded.every(r => !now.get(key(r))?.ready), E: 12, F: 98,
    numericalG: rows.filter(r => r.numericalProfileComplete).length,
    nativeGGAReadyAfterGM: rows.filter(r => r.nativeGGAProfileSafeAfterGM).length,
    individualGMG: rows.filter(r => r.individualGMRequired).length,
    incompleteG: rows.filter(r => !r.numericalProfileComplete).length,
    worldPolicyReady: current.readyWithoutLoadingConfirmation,
    loadingGMRequired: current.loadingChecks,
    // Legacy field name: count pending manual G rows only; APS/KPV are already ready.
    potentialAfterAllRequiredGMDecisions: current.readyWithoutLoadingConfirmation + current.loadingChecks +
      rows.filter(r => r.individualGMRequired && !r.worldPolicyReady && r.nativeGGAProfileSafeAfterGM).length,
    officialStatuses: Object.fromEntries([...new Set(current.all.map(r => r.rulesStatus))].map(s =>
      [s, current.all.filter(r => r.rulesStatus === s).length])), rows };
}
