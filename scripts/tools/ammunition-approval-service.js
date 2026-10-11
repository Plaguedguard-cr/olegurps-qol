const MODULE = "olegurps-qol", SETTING = "ammunitionApprovals";
import { htVariantKind } from "./ht-kinetic-rules.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { reviewDUConstruction } from "./du-ammunition.js";
import { isMultishotVariant, reviewMultishotConstruction, multishotDefinitionKey } from "./multishot-ammunition.js";
let writes = Promise.resolve();
export function registerAmmunitionApprovals(runtime = globalThis) {
  runtime.game.settings.register(MODULE, SETTING, { scope: "world", config: false, type: Object, default: {} });
}
const stable = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(stable) :
  Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const recipeFingerprint = type => JSON.stringify(stable({ book: type.book, kind: type.kind,
  ammoId: type.ammoId, recipe: type.recipe }));
export const approvalKey = ({ actorId, weaponId, modeId, type }) =>
  JSON.stringify([actorId, weaponId, modeId, type.book, type.ammoId, type.recipe?.customId]);
export function readAmmunitionApproval(scope, runtime = globalThis) {
  let saved;
  try { saved = runtime.game?.settings?.get(MODULE, SETTING)?.[approvalKey(scope)]; } catch { return null; }
  return typeof saved?.active === "boolean" && saved.fingerprint === recipeFingerprint(scope.type) &&
    saved.variantId === scope.type.recipe?.variantId ? structuredClone(saved) : null;
}
export function getAmmunitionApproval(scope, runtime = globalThis) {
  const saved = readAmmunitionApproval(scope, runtime);
  return saved?.active === true ? saved : null;
}
export function setAmmunitionApproval({ actor, weapon, type, active, plusPDecision = null, duDecision = null, multishotDecision = null }, runtime = globalThis) {
  if (!runtime.game?.user?.isGM) return Promise.reject(Error("Permission"));
  const next = writes.catch(() => {}).then(async () => {
    const api = runtime.OleGURPSQOL;
    const binding = weapon.standaloneWeaponId ? standaloneCatalogBinding(
      readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId), api?.catalogs) :
      api?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
    if (binding?.status !== "confirmed" || !binding.binding?.confirmed || !type.recipe?.customId ||
        type.book !== "ht" || type.kind !== "ammo-item" ||
        !(["ht_apex", "ht_aphex", "ht_plus_p"].includes(type.recipe.variantId) || isDUVariant(type.recipe.variantId) || isMultishotVariant(type.recipe.variantId))) throw Error("ApprovalScopeRequired");
    const modeId = binding.binding.modeId, base = api.ammunitionCompatibility.checkCompatibility(modeId, type.ammoId, { book: type.book, kind: type.kind });
    const construction = api.ammunitionCompatibility.checkCompatibility(modeId, type.recipe.variantId, { book: "ht", kind: htVariantKind(type.recipe.variantId), ammoItemId: type.ammoId });
    const multishot = isMultishotVariant(type.recipe.variantId) ? reviewMultishotConstruction(api.catalogs.getVariant("ht", type.recipe.variantId),
      construction.eligibility?.facts, multishotDecision) : null;
    if (active && multishot && multishotDefinitionKey(type.recipe.parameters?.multishotDefinition)!==multishotDefinitionKey(multishotDecision)) throw Error("MultishotSourceConflict");
    if (active && multishot && (multishot.status !== "compatible" || multishot.reason)) throw Error(multishot.reason ?? "MultishotEvidenceRequired");
    if (active && (base.status !== "compatible" || construction.status === "incompatible" && !multishot?.nativePreserved)) throw Error("ApprovalCannotOverrideProhibition");
    if (active && isDUVariant(type.recipe.variantId)) {
      const review = reviewDUConstruction(api.catalogs.getVariant("ht", type.recipe.variantId), construction.eligibility?.facts, duDecision);
      if (review.status !== "compatible" || review.reason) throw Error(review.reason ?? "DUConfirmationRequired");
    }
    const record = api.catalogs.getAmmoItem("ht", type.ammoId), familyId = record?.ammo_family_id;
    if (!familyId) throw Error("ApprovalScopeRequired");
    if (plusPDecision && (type.recipe.variantId !== "ht_plus_p" ||
        plusPDecision.malfModifier != null && (!Number.isInteger(plusPDecision.malfModifier) || plusPDecision.malfModifier > 0) ||
        plusPDecision.rof != null && (!Number.isInteger(plusPDecision.rof) || plusPDecision.rof < 1))) throw Error("ApprovalScopeRequired");
    const scope = { actorId: actor.id, weaponId: weapon.id, modeId, type }, key = approvalKey(scope);
    const saved = structuredClone(runtime.game.settings.get(MODULE, SETTING) ?? {});
    saved[key] = { version: 1, active: !!active, actorId: actor.id, weaponId: weapon.id, modeId,
      familyId, ammoId: type.ammoId, variantId: type.recipe.variantId, recipeId: type.recipe.customId,
      fingerprint: recipeFingerprint(type), gmId: runtime.game.user.id,
      ...(isMultishotVariant(type.recipe.variantId) ? { multishotDecision: active ? structuredClone(multishotDecision) : null } : {}),
      ...(isDUVariant(type.recipe.variantId) ? { duDecision: active ? structuredClone(duDecision) : null } : {}),
      ...(type.recipe.variantId === "ht_plus_p" ? { plusPDecision: plusPDecision ? {
        malfModifier: plusPDecision.malfModifier ?? null, rof: plusPDecision.rof ?? null,
        loadingCheckPassed: plusPDecision.loadingCheckPassed === true,
        ...(active && plusPDecision.loadingCheckPassed === true ? { loadingConfirmation: {
          id: globalThis.crypto.randomUUID(), gmId: runtime.game.user.id,
          scope: key, fingerprint: recipeFingerprint(type), perShot: false } } : {}) } : null } : {}) };
    await runtime.game.settings.set(MODULE, SETTING, saved);
    return structuredClone(saved[key]);
  });
  writes = next; return next;
}
