import { AttackProfileResolver, createShotSnapshot } from "./attack-profile-resolver.js";
import { AmmoService } from "./ammo-service.js";
import { readAmmunitionApproval } from "./ammunition-approval-service.js";
import { automaticAmmoPolicy, automaticAmmoText } from "./automatic-ammunition-localization.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { moduleText, moduleMessage } from "../localization.js";
import { captureF4Combat, tracerBonus } from "./ammunition-f4.js";

export const newAttackId = () => globalThis.crypto.randomUUID();
const translationLoads = new Map();

// Foundry can retain an older server-side module manifest with no languages registered.
// Load only this feature's new keys; never translate existing UI text or change the language setting.
// Kept for API compatibility: Russian resources are synchronously bundled.
export async function loadAttackProfileTranslations() {}

export function resolveRuntimeAttackProfile({ actor, attack, weaponId = null, state = null,
  ammunition = undefined, context = {}, runtime = globalThis }) {
  const api = runtime.OleGURPSQOL;
  state ??= actor?.getFlag?.("world", "gurpsAmmoManager") ?? {};
  const matches = (state.weapons ?? []).filter(weapon =>
    attack?.standaloneRef?.combatType === "ranged" ?
      weapon.standaloneWeaponId === attack.standaloneRef.weaponId && weapon.standaloneModeId === attack.standaloneRef.modeId :
      attack?.uuid ? weapon.attackRef?.uuid === attack.uuid : attack?.path && weapon.attackRef?.path === attack.path);
  weaponId ??= matches.length === 1 ? matches[0].id : null;
  if (ammunition === undefined) ammunition = weaponId ? new AmmoService(actor).readAttackAmmunition(weaponId) : null;
  const rawAttack = attack?.standaloneRef?.combatType === "ranged" ?
    readStandaloneAttack(actor, attack.standaloneRef.weaponId, attack.standaloneRef.modeId)?.data :
    attack?.path?.split(".").reduce((value, key) => value?.[key], actor) ?? attack?.data ?? attack;
  let binding = standaloneCatalogBinding(attack, api?.catalogs);
  if (attack?.path && api?.weaponCatalogBindings) {
    try { binding = api.weaponCatalogBindings.analyzeMode(actor, attack.path); }
    catch { binding = { status: "undetermined" }; }
  }
  return new AttackProfileResolver({ catalogs: api?.catalogs, compatibility: api?.ammunitionCompatibility })
    .resolve({ actorId: actor?.id ?? null, weaponId, attack, rawAttack, state, binding, ammunition,
      context: { ...context, f4: { combat: captureF4Combat(actor?.id, context.tokenId, runtime),
        tracerBonus: tracerBonus(actor?.id, context.tokenId, runtime) } },
      profilePolicy: automaticAmmoPolicy(runtime),
      approval: ammunition?.type ? readAmmunitionApproval({ actorId: actor.id, weaponId,
        modeId: binding?.binding?.modeId, type: ammunition.type }, runtime) : null });
}

export function pendingShotSnapshot(profile, attackId, { resourceTiming = "external", resourceReceiptId = null } = {}) {
  return createShotSnapshot(profile, { attackId, spent: 0, resourceTiming, resourceReceiptId });
}

export function attackProfileError(code, runtime = globalThis) {
  if(['GyrojetIdentityRequired','GuidanceRequired','AlternateLoadBallisticsRequired','GyrojetDistanceRequired'].includes(code))return moduleText('OleGURPS.AmmoEffects.'+code);
  if (["IncompleteAmmunitionProfile", "ProjectileRclRequired"].includes(code)) return automaticAmmoText(code, runtime.game?.i18n?.lang);
  if (code === "IncompleteExplosiveRecipe") return explosiveText("IncompleteShot", runtime);
  const key = "OleGURPS.AttackProfile." + code;
  return moduleText(key, {}, moduleMessage(code));
}

/** Preview overlays only: resolve again from Actor.system, never from an already adjusted data clone. */
export function withRuntimeAmmoStats(attack, actor, state) {
  const cleanAttack = { ...attack };
  // An overlay may itself be the previous window value. Re-read the owned definition before applying this magazine.
  const source=attack?.standaloneRef ? readStandaloneAttack(actor,attack.standaloneRef.weaponId,attack.standaloneRef.modeId) : null;
  if(source)for(const key of ['data','acc','scopeBonus','bulk','bulkMetadata','rof','rcl','platformRules','ammunitionRange']) {
    if(Object.hasOwn(source,key))cleanAttack[key]=source[key];else delete cleanAttack[key];
  }
  delete cleanAttack.ammunitionFuzeTracer;
  if(!attack?.platformRules)delete cleanAttack.ammunitionRange;
  delete cleanAttack.ammunitionManualCycling;
  delete cleanAttack.ammunitionReadinessReason;
  try {
    const profile = resolveRuntimeAttackProfile({ actor, attack, state });
    if (profile.damage.reason==='AlternateLoadBallisticsRequired')return {...cleanAttack,
      ammunitionReadinessReason:profile.damage.reason,
      ...(profile.damage.rules.manualCyclingRequired?{rof:'1',data:{...cleanAttack.data,rof:'1'}}:{}),
      ammunitionConditions:[{id:'AlternateLoadBallisticsRequired',text:attackProfileError(profile.damage.reason)}]};
    if (profile.damage.nativeSafe) {
      const changes = profile.damage.effectiveChanges ?? {};
      return { ...cleanAttack, ammunitionProjectileKind: profile.effective.ammunitionProjectileKind ?? null,
        ...(profile.context?.platform ? {platformRules:profile.context.platform}:{}),
        ammunitionManualCycling: profile.damage.rules.manualCyclingRequired === true,
        ...(profile.damage.rules.ballisticRange ? { ammunitionRange: profile.damage.rules.ballisticRange } : {}),
        ...(profile.damage.rules.projectiles ? { ammunitionB409Eligible: profile.damage.rules.projectiles.b409Eligible } : {}),
        ...(profile.environmentCapability ? { ammunitionEnvironment: profile.environmentCapability } : {}),
        ammunitionConditions: [...profile.damage.support?.manual ?? [], ...profile.context?.barrel?.manual ?? [],
          ...(profile.context?.platform?.instruction?[{id:'SpecializedPlatform',text:profile.context.platform.instruction}]:[])],
        ...(profile.damage.rules.fuzeTracer ? { ammunitionFuzeTracer: {
          definition: profile.ammunition.recipe.autoProfile.definition, mechanics: profile.damage.rules.fuzeTracer.mechanics } } : {}),
        ...(changes.acc !== undefined ? {
        acc: profile.damage.effectiveChanges.acc, scopeBonus: profile.damage.effectiveChanges.scopeBonus } : {}),
        ...(changes.rof !== undefined ? { rof: changes.rof } : {}),
        ...(changes.rcl !== undefined ? { rcl: changes.rcl } : {}),
        ...(changes.st !== undefined ? { st: changes.st } : {}),
        ...(profile.damage.rules.requiredStrength ? { ammunitionRequiredStrength: profile.damage.rules.requiredStrength } : {}),
        data: { ...cleanAttack.data, ...changes } };
    }
  } catch { /* Inventory review remains owned by the normal AmmoService flow. */ }
  return source || Object.hasOwn(attack ?? {}, "ammunitionFuzeTracer") || Object.hasOwn(attack ?? {}, "ammunitionRange") ? cleanAttack : attack;
}
