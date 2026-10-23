import { AttackProfileResolver, createShotSnapshot } from "./attack-profile-resolver.js";
import { AmmoService } from "./ammo-service.js";
import { gaussManualConditions } from './ut-gauss.js';
import { readAmmunitionApproval } from "./ammunition-approval-service.js";
import { automaticAmmoPolicy, automaticAmmoText } from "./automatic-ammunition-localization.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { moduleText, moduleMessage } from "../localization.js";
import { captureF4Combat, tracerBonus } from "./ammunition-f4.js";
import { applyAttackOverride, parseAccuracyComponents } from "./weapon-attack-overrides.js";
import { parseWeaponBulk } from "./weapon-bulk.js";
import { attackProfilePresentation } from './weapon-profile-presentation.js';
import { readDamageDiceAddsPolicy } from './damage-dice-adds.js';

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
      diceAddsPolicy: readDamageDiceAddsPolicy(runtime.game?.user),
      approval: ammunition?.type ? readAmmunitionApproval({ actor, actorId: actor.id, weaponId,
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
  if(!attack)return attack;
  const cleanAttack = { ...attack };
  if(attack?.ammunitionSourceEdition==='Ultra-Tech 2007' && attack.path) {
    const raw=attack.path.split('.').reduce((v,k)=>v?.[k],actor);
    if(raw) {
      const restored=applyAttackOverride({...raw,path:attack.path,uuid:raw.uuid??attack.uuid,data:raw},
        state??actor.getFlag?.('world','gurpsAmmoManager')??{});
      const accuracy=parseAccuracyComponents(restored.acc),bulkMetadata=restored.bulkMetadata??parseWeaponBulk(restored.bulk);
      Object.assign(cleanAttack,{data:restored.data,level:restored.level,rof:restored.rof,rcl:restored.rcl,...accuracy,
        scopeBonus:restored.scopeBonus??accuracy.scopeBonus,
        bulk:bulkMetadata?.numericBulk??null,bulkMetadata});
    }
  }
  // An overlay may itself be the previous window value. Re-read the owned definition before applying this magazine.
  const source=attack?.standaloneRef ? readStandaloneAttack(actor,attack.standaloneRef.weaponId,attack.standaloneRef.modeId) : null;
  if(source)for(const key of ['data','acc','scopeBonus','bulk','bulkMetadata','rof','rcl','platformRules','ammunitionRange','weaponBondSetting']) {
    if(Object.hasOwn(source,key))cleanAttack[key]=source[key];else delete cleanAttack[key];
  }
  delete cleanAttack.ammunitionFuzeTracer;
  if(!attack?.platformRules)delete cleanAttack.ammunitionRange;
  delete cleanAttack.ammunitionManualCycling;
  delete cleanAttack.ammunitionHitBonus;
  delete cleanAttack.ammunitionFluid;
  delete cleanAttack.ammunitionHEProximity;
  delete cleanAttack.ammunitionReadinessReason;
  delete cleanAttack.ammunitionDisplay;
  try {
    const profile = resolveRuntimeAttackProfile({ actor, attack:cleanAttack, state });
    const ammunitionDisplay=attackProfilePresentation(profile);
    if(profile.damage.rules.fluid&&!profile.damage.nativeSafe)return {...cleanAttack,ammunitionDisplay,ammunitionReadinessReason:profile.damage.reason};
    if(['ut-exotic-beam','ut-sonic-neural'].includes(profile.weaponConfiguration?.variant)&&!profile.damage.nativeSafe)return {...cleanAttack,ammunitionDisplay,ammunitionReadinessReason:profile.damage.reason};
    if(profile.weaponConfiguration?.variant==='beam'&&!profile.damage.nativeSafe)return {...cleanAttack,ammunitionDisplay,ammunitionReadinessReason:profile.damage.reason};
    const catalogs=globalThis.OleGURPSQOL?.catalogs,mode=catalogs?.getMode(profile.binding?.confirmed?.modeId);
    const familyId=profile.ammunition.familyId??mode?.ammunition_profile?.primary_ammo_family_id;
    const book=profile.ammunition.book??cleanAttack.standaloneRef?.source?.source?.toLowerCase()??
      (familyId?catalogs?.getEquipmentForMode(profile.binding?.confirmed?.modeId)?.source?.toLowerCase():null);
    ammunitionDisplay.physicalFamily=mode?.caliber_hint??catalogs?.getAmmoFamily(book,familyId)?.name??null;
    if (['UTLPConfigurationInvalid', 'UTETCConfigurationInvalid', 'AlternateLoadBallisticsRequired', 'UTPowerAccountingRequired', 'UTMotorPowerRequired', 'UTIndependentFeedsRequired', 'UTHostParametersRequired',
      'UTPaintPowerRequired','UTPayloadRequired','UTPayloadInvalid','UTVariantUnavailable','UTOriginalProfileRequired','UTRangeRequired','UTShotshellOriginalRequired'].includes(profile.damage.reason))return {...cleanAttack,
      ammunitionReadinessReason:profile.damage.reason,
      ammunitionDisplay,
      ...(profile.damage.rules.manualCyclingRequired?{rof:'1',data:{...cleanAttack.data,rof:'1'}}:{}),
      ammunitionConditions:[{id:'AlternateLoadBallisticsRequired',text:attackProfileError(profile.damage.reason)}]};
    if (profile.damage.nativeSafe) {
      const changes = profile.damage.effectiveChanges ?? {};
      return { ...cleanAttack, ammunitionDisplay, ammunitionProjectileKind: profile.effective.ammunitionProjectileKind ?? null,
        ...(profile.damage.rules.electrolaser?{electrolaser:profile.damage.rules.electrolaser}:{}),
        ammunitionHitBonus:profile.damage.rules.fluid?0:profile.damage.rules.attackBonus??0,
        ...(profile.damage.rules.fluid?{ammunitionFluid:{...profile.damage.rules.fluid,vortex:profile.damage.components.some(c=>c.role==="linked")}}:{}),
        ...(profile.damage.rules.heProximity?{ammunitionHEProximity:profile.damage.rules.heProximity}:{}),
        ...(profile.ammunition.book==='ut'?{ammunitionSourceEdition:'Ultra-Tech 2007'}:{}),
        ...(profile.context?.platform ? {platformRules:profile.context.platform}:{}),
        ammunitionManualCycling: profile.damage.rules.manualCyclingRequired === true,
        ...(profile.damage.rules.ballisticRange && !profile.damage.rules.htSourceProfile ? { ammunitionRange: profile.damage.rules.ballisticRange } : {}),
        ...(profile.damage.rules.projectiles ? { ammunitionB409Eligible: profile.damage.rules.projectiles.b409Eligible } : {}),
        ...(profile.environmentCapability ? { ammunitionEnvironment: profile.environmentCapability } : {}),
        ammunitionConditions: [...gaussManualConditions(profile.binding?.confirmed?.modeId), ...(profile.weaponReliability?[{id:'WeaponReliability',...profile.weaponReliability}]:[]), ...(profile.weaponConfiguration?.hearingModifier===-3?[{id:'lp-sound',text:moduleText('OleGURPS.LP.Sound')}]:[]), ...profile.damage.support?.manual ?? [], ...profile.context?.barrel?.manual ?? [],
          ...(profile.context?.platform?.instruction?[{id:'SpecializedPlatform',text:profile.context.platform.instruction}]:[])],
        ...(profile.damage.rules.fuzeTracer ? { ammunitionFuzeTracer: {
          definition: profile.ammunition.recipe.autoProfile.definition, mechanics: profile.damage.rules.fuzeTracer.mechanics } } : {}),
        ...(changes.acc !== undefined ? {
        acc: profile.damage.effectiveChanges.acc, scopeBonus: profile.damage.effectiveChanges.scopeBonus } : {}),
        ...(changes.rof !== undefined ? { rof: changes.rof } : {}),
        ...(changes.rcl !== undefined ? { rcl: changes.rcl } : {}),
        ...(changes.st !== undefined ? { st: changes.st } : {}),
        ...(profile.damage.rules.requiredStrength ? { ammunitionRequiredStrength: profile.damage.rules.requiredStrength } : {}),
        data: { ...cleanAttack.data, ...changes, damage: profile.damage.rules.resistanceEffect?profile.effective.damage:profile.damage.formula } };
    }
    return {...cleanAttack,ammunitionDisplay};
  } catch { /* Inventory review remains owned by the normal AmmoService flow. */ }
  return {...cleanAttack,ammunitionDisplay:attackProfilePresentation(null)};
}
