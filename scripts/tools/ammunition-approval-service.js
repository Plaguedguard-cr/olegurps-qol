const MODULE = "olegurps-qol", SETTING = "ammunitionApprovals";
import { htVariantKind } from "./ht-kinetic-rules.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { reviewDUConstruction } from "./du-ammunition.js";
import { isMultishotVariant, reviewMultishotConstruction, multishotDefinitionKey } from "./multishot-ammunition.js";
import { registeredHandloadFacts } from "./handload-registration.js";
import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
let writes = Promise.resolve();
const decisionPatch=(before,after)=>({...structuredClone(after),...Object.fromEntries(
  Object.keys(before).filter(key=>!Object.hasOwn(after,key)).map(key=>['-='+key,null]))});
export function canManageAmmunitionShot(resolved,runtime=globalThis) {
  const source=resolved?.source;
  if(source?.visible!==true||source?.isContentVisible!==true)return false;
  if(runtime.game?.user?.isGM)return true;
  const shot=source.getFlag?.(MODULE,'shotSnapshot')??source.flags?.[MODULE]?.shotSnapshot;
  return shot?.version===1&&shot.correlation?.attackMessageId===source.id&&JSON.stringify(shot)===JSON.stringify(resolved.shot)&&
    runtime.game?.actors?.get?.(shot.actorId)?.isOwner===true;
}
/** Hold the world approval queue throughout deletion and its compensating rollback. */
export function removeOwnedAmmunitionApprovals({ actor = null, actorId, weaponIds, modeIds }, operation, runtime = globalThis) {
  const next = writes.catch(() => {}).then(async () => {
    let saved = {};
    if (runtime.game?.settings?.get) saved = structuredClone(runtime.game.settings.get(MODULE, SETTING) ?? {});
    const cleaned = structuredClone(saved);
    for (const [key, entry] of Object.entries(saved)) {
      let identity;
      try { identity = JSON.parse(key); } catch { identity = []; }
      const matchesKey = identity[0] === actorId && weaponIds.includes(identity[1]);
      const matchesEntry = entry?.actorId === actorId && weaponIds.includes(entry.weaponId);
      if (!matchesKey && !matchesEntry) continue;
      if (!matchesKey || !matchesEntry || identity[1] !== entry.weaponId || identity[2] !== entry.modeId ||
          !modeIds.includes(entry.modeId) || identity[4] !== entry.ammoId || identity[5] !== (entry.recipeId ?? null))
        throw Error("ApprovalScopeRequired");
      delete cleaned[key];
    }
    // Players never need a world-setting write to remove their own weapon.
    const changed = JSON.stringify(cleaned) !== JSON.stringify(saved) && runtime.game?.user?.isGM === true;
    actor ??= runtime.game?.actors?.get?.(actorId);
    const local=structuredClone(actor?.getFlag?.(MODULE,'ammunitionDecisions')??{}),nextLocal=structuredClone(local);
    for(const [key,entry] of Object.entries(local))if(entry.actorId===actorId&&weaponIds.includes(entry.weaponId)&&modeIds.includes(entry.modeId))delete nextLocal[key];
    const localChanged=JSON.stringify(local)!==JSON.stringify(nextLocal);
    let localAttempted=false;
    let attempted = false;
    return operation({ commit: async () => {
      if(localChanged){
        if(actor?.isOwner!==true&&!runtime.game?.user?.isGM)throw Error('Permission');
        if(JSON.stringify(stable(actor.getFlag(MODULE,'ammunitionDecisions')??{}))!==JSON.stringify(stable(local)))throw Error('ApprovalScopeRequired');
        localAttempted=true;await actor.setFlag(MODULE,'ammunitionDecisions',decisionPatch(local,nextLocal));
      }
      if (!changed) return;
      if (JSON.stringify(stable(runtime.game.settings.get(MODULE, SETTING))) !== JSON.stringify(stable(saved)))
        throw Error("ApprovalScopeRequired");
      attempted = true;
      await runtime.game.settings.set(MODULE, SETTING, cleaned);
    }, rollback: async () => {
      if(localAttempted){
        const actual=actor.getFlag(MODULE,'ammunitionDecisions')??{};
        if(JSON.stringify(stable(actual))===JSON.stringify(stable(nextLocal)))await actor.setFlag(MODULE,'ammunitionDecisions',decisionPatch(actual,local));
        else if(JSON.stringify(stable(actual))!==JSON.stringify(stable(local)))throw Error('ApprovalScopeRequired');
      }
      if (!attempted) return;
      const current = runtime.game.settings.get(MODULE, SETTING);
      if (JSON.stringify(stable(current)) === JSON.stringify(stable(cleaned))) await runtime.game.settings.set(MODULE, SETTING, saved);
      else if (JSON.stringify(stable(current)) !== JSON.stringify(stable(saved))) throw Error("ApprovalScopeRequired");
    } });
  });
  writes = next;
  return next;
}
export function registerAmmunitionApprovals(runtime = globalThis) {
  runtime.game.settings.register(MODULE, SETTING, { scope: "world", config: false, type: Object, default: {} });
}
const stable = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(stable) :
  Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const recipeFingerprint = type => JSON.stringify(stable({ book: type.book, kind: type.kind,
  ammoId: type.ammoId, recipe: type.recipe }));
export const approvalKey = ({ actorId, weaponId, modeId, type }) =>
  JSON.stringify([actorId, weaponId, modeId, type.book, type.ammoId, type.recipe?.customId]);
// Actor document updates expand dots in object keys. Keep the legacy world key unchanged.
export const actorDecisionKey = scope => encodeURIComponent(approvalKey(scope)).replaceAll('.','%2E');
export function readAmmunitionApproval(scope, runtime = globalThis) {
  let saved;
  try {
    const actor=scope.actor??runtime.game?.actors?.get?.(scope.actorId);
    const local=actor?.getFlag?.(MODULE,'ammunitionDecisions');
    saved=local?.[actorDecisionKey(scope)]??local?.[approvalKey(scope)];
    saved??=runtime.game?.settings?.get(MODULE, SETTING)?.[approvalKey(scope)];
  } catch { return null; }
  return typeof saved?.active === "boolean" && saved.fingerprint === recipeFingerprint(scope.type) &&
    saved.variantId === scope.type.recipe?.variantId ? structuredClone(saved) : null;
}
export function getAmmunitionApproval(scope, runtime = globalThis) {
  const saved = readAmmunitionApproval(scope, runtime);
  return saved?.active === true ? saved : null;
}
export function setAmmunitionApproval({ actor, weapon, type, active, plusPDecision = null, duDecision = null, multishotDecision = null }, runtime = globalThis) {
  if (!actor || actor.isOwner!==true&&!runtime.game?.user?.isGM) return Promise.reject(Error("Permission"));
  const next = writes.catch(() => {}).then(async () => {
    if (weapon.standaloneWeaponId && !actor.getFlag("world", "gurpsAmmoManager")?.weapons?.some(w =>
      w.id === weapon.id && w.standaloneWeaponId === weapon.standaloneWeaponId)) throw Error("WeaponMissing");
    const api = runtime.OleGURPSQOL;
    const binding = weapon.standaloneWeaponId ? standaloneCatalogBinding(
      readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId), api?.catalogs) :
      api?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
    if (binding?.status !== "confirmed" || !binding.binding?.confirmed || !type.recipe?.customId ||
        type.book !== "ht" || type.kind !== "ammo-item" ||
        !(["ht_apex", "ht_aphex", "ht_plus_p", "ht_match_handloaded"].includes(type.recipe.variantId) || isDUVariant(type.recipe.variantId) || isMultishotVariant(type.recipe.variantId))) throw Error("ApprovalScopeRequired");
    const modeId = binding.binding.modeId, base = api.ammunitionCompatibility.checkCompatibility(modeId, type.ammoId, { book: type.book, kind: type.kind });
    const construction = api.ammunitionCompatibility.checkCompatibility(modeId, type.recipe.variantId, { book: "ht", kind: htVariantKind(type.recipe.variantId), ammoItemId: type.ammoId });
    if (active && type.recipe.variantId === "ht_match_handloaded") {
      const facts = registeredHandloadFacts(construction.eligibility?.facts, type.recipe.autoProfile?.handloadDefinition,
        {actorId:actor.id,weaponId:weapon.id,modeId,ammoId:type.ammoId});
      if (!facts || evaluateHTOptionEligibility(api.catalogs.getVariant("ht", "ht_match_handloaded"), facts).status !== "compatible")
        throw Error("P1HandloadChecksMissing");
    }
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
    const scope = { actorId: actor.id, weaponId: weapon.id, modeId, type }, key = actorDecisionKey(scope);
    const previous=readAmmunitionApproval({...scope,actor},runtime);
    const saved = structuredClone(actor.getFlag(MODULE,'ammunitionDecisions') ?? {});
    saved[key] = { version: 1, active: !!active, actorId: actor.id, weaponId: weapon.id, modeId,
      familyId, ammoId: type.ammoId, variantId: type.recipe.variantId, recipeId: type.recipe.customId,
      fingerprint: recipeFingerprint(type), origin:'user', userId:runtime.game.user.id,
      ...(isMultishotVariant(type.recipe.variantId) ? { multishotDecision: structuredClone(multishotDecision??previous?.multishotDecision??null) } : {}),
      ...(isDUVariant(type.recipe.variantId) ? { duDecision: structuredClone(duDecision??previous?.duDecision??null) } : {}),
      ...(type.recipe.variantId === "ht_plus_p" ? { plusPDecision: plusPDecision ? {
        origin:'user', pressureSuitable:plusPDecision.pressureSuitable===true,
        malfModifier: plusPDecision.malfModifier ?? null, rof: plusPDecision.rof ?? null,
        loadingCheckPassed: plusPDecision.loadingCheckPassed === true,
        ...(active && plusPDecision.loadingCheckPassed === true ? { loadingConfirmation: {
          id: globalThis.crypto.randomUUID(), userId: runtime.game.user.id, origin:'user',
          scope: key, fingerprint: recipeFingerprint(type), perShot: false } } : {}) } : structuredClone(previous?.plusPDecision??null) } : {}) };
    await actor.setFlag(MODULE,'ammunitionDecisions',saved);
    return structuredClone(saved[key]);
  });
  writes = next; return next;
}
