import {HT_TEAR_SPRAY_MODE,htTearSprayDamage,attachBiochemicalEffect} from './biochemical-integration.js';
import {fluidProfile} from '../ut-fluid-source.js';
import {fluidDamage} from './ut-fluid.js';
import {gyrocShotshellExcluded,GYROC_SHOTSHELL_REASON} from './gyroc-policy.js';
import {gravDamage,physicalRangedProfile,missileSourceTL} from '../ut-physical-ranged-source.js';
import {utFixedFeed,plbRecipeAllowed} from './ut-physical-feeds.js';
import {plasmaGunProfile,plasmaGunDamage} from '../ut-plasma-gun-source.js';
import { exoticBeamProfile, exoticBeamDamage } from '../ut-exotic-beam-source.js';
import { uawBarrelFacts, uawWeaponView } from './ut-uaw.js';
import { getAttackOverride } from "./weapon-attack-overrides.js";
import { assessAmmunitionRecipe } from "./ammunition-recipes.js";
import { resolveAmmunitionEffects } from "./ammunition-effects.js";
import { AutomaticAmmunitionProfileService } from "./automatic-ammunition-profiles.js";
import { recipeFingerprint } from "./ammunition-approval-service.js";
import { parseWeaponBulk } from "./weapon-bulk.js";
import { shotgunProjectileKind } from "./shotgun-ammunition.js";
import {gyrojetRangeRule,GYROJET_MODE,GYROJET_AMMO} from './gyrojet-range.js';
import {specializedPlatform,platformRange,selectedGuidancePlatform} from '../ht-specialized-platforms.js';
import { reviewedNativePlusPBaseline } from "../ht-native-charge-profiles.js";
import { resolveAttackEnvironment } from "./fire-range-service.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { sourceExplosiveVariant } from "./explosive-attack-profiles.js";
import { sourceEnvironmentVariant } from "./environment-ammunition.js";
import { fuzeTracerShotEvents, sourceFuzeTracerVariant } from "./fuze-tracer-ammunition.js";
import { hasLegacyPlusPAdmission } from "./legacy-plus-p-admission.js";
import { sourceCaseVariant } from "./case-technology.js";
import { publishedLoadBaseline,alternateLoadNeedsBallistics } from "../ht-published-loads.js";
import { selectedLoadBallistics } from "./ammunition-ballistics.js";
import { sourceMultishotVariant } from "./multishot-ammunition.js";
import { requiresUTPowerAccounting } from "../ut-source-data.js";
import { utConventionalReadiness, UT_CONVENTIONAL_READY_MODES as UT_CONVENTIONAL_MODES, reviewUTConventional } from "./ut-conventional-ammunition.js";
import { UT_SPECIAL_MODES, reviewUTSpecial, utSpecialReadiness, isUTSpecialVariant } from './ut-special-ammunition.js';
import { isUTExtendedVariant, reviewUTExtended } from './ut-extended-ammunition.js';
import { isUTConventionalVariant } from './ut-conventional-ammunition.js';
import { compactAmmoSource } from './ammunition-chat-summary.js';
import { ETC_PROFILES, etcBallistics, etcAdmission } from './ut-etc.js';
import { LP_PROFILES, LP_FIRE_MODES, lpAdmission, lpBallistics, lpFireMode } from './ut-liquid-propellant.js';
import { readDamageDiceAddsPolicy, applyDamageDiceAdds } from './damage-dice-adds.js';
import { parseKineticDamage } from './kinetic-damage-math.js';
import { stormFeed } from './ut-storm-feeds.js';
import { htSourceDamage } from '../ht-pre-gauss-profiles.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { gaussSpeed, gaussBallistics, GAUSS_SPEEDS } from './ut-gauss.js';
import { beamProfile } from '../ut-beam-source.js';
import { beamDamage } from './ut-beam.js';
import { htLaserDamage } from '../ht-laser-source.js';
import { utDazzlerDamage, utDazzlerProfile } from '../ut-dazzler-source.js';
import { electrolaserDamage, electrolaserProfile } from '../ut-electrolaser-source.js';
import { microwaveDamage, microwaveProfile } from '../ut-microwave-source.js';
import { sonicNeuralDamage, sonicNeuralProfile } from '../ut-sonic-neural-source.js';
import { ppbDamage, ppbProfile } from '../ut-plasma-particle-source.js';

export const SHOT_PROFILE_VERSION = 1;
export const SHOT_FLAG_SCOPE = "olegurps-qol";
export function immutableCopy(value) {
  const copy = structuredClone(value);
  const freeze = entry => {
    if (entry && typeof entry === "object") { Object.values(entry).forEach(freeze); Object.freeze(entry); }
    return entry;
  };
  return freeze(copy);
}

// Immutable per-shot computation, including evidenced selected-load overlays. No source writes or rolls.
export class AttackProfileResolver {
  constructor({ catalogs = null, compatibility = null, automaticProfiles = null } = {}) {
    this.catalogs = catalogs;
    this.compatibility = compatibility;
    this.automaticProfiles = automaticProfiles ?? new AutomaticAmmunitionProfileService({ catalogs, compatibility });
  }

  resolve({ actorId, weaponId = null, attack, rawAttack, state = {}, binding = null,
    ammunition = null, context = {}, approval = null, profilePolicy = "strict",
    diceAddsPolicy = readDamageDiceAddsPolicy() }) {
    const raw = structuredClone(rawAttack ?? attack?.data ?? attack ?? {});
    const overrides = getAttackOverride(state, attack);
    const type = ammunition?.type;
    const identity = { status: type?.source === "legacy" ? "legacy" : "unresolved",
      source: type?.source ?? null, book: type?.book ?? null, kind: type?.kind ?? null,
      ammoId: type?.ammoId ?? null, ammoKey: ammunition?.ammoKey ?? null,
      name: type?.name ?? null, familyId: null, recipe: type?.recipe ? structuredClone(type.recipe) : null };
    let record = null;
    if (type?.source === "catalog" && type.book && type.kind && type.ammoId) {
      const data = this.catalogs?.getCatalog(type.book);
      if (!data) identity.status = "unavailable";
      else {
        record = type.kind === "ammo-item" ? this.catalogs.getAmmoItem(type.book, type.ammoId)
          : type.kind === "ammo-family" ? this.catalogs.getAmmoFamily(type.book, type.ammoId) : null;
        if (record) {
          identity.status = "confirmed";
          identity.familyId = type.kind === "ammo-family" ? type.ammoId : record.ammo_family_id ?? null;
        }
      }
    }
    // A saved test cartridge can never be promoted by its label or by stray catalog fields.
    if (type?.source === "test") identity.status = "unresolved";
    const confirmedBinding = binding?.status === "confirmed" && binding.binding?.confirmed
      ? binding.binding : null;
    const carrier=uawWeaponView(state,state.weapons?.find(w=>w.id===weaponId));
    let convertedRaw=raw,weaponConfiguration=null,etcError=null;
    const em=gaussProfile(confirmedBinding?.modeId);
    if(em) {
      const fireMode=gaussSpeed(carrier);
      try {
        if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant))throw Error('EM не использует ETC или LP.');
        convertedRaw=gaussBallistics(raw,em.modeId,fireMode);
        weaponConfiguration={variant:'gauss',modeId:em.modeId,fireMode,source:em.source,
          unitsPerShot:GAUSS_SPEEDS[fireMode].units,unitsPerStandardShot:4,externalPower:em.external,
          hearingModifier:GAUSS_SPEEDS[fireMode].hearingModifier??0,
          baseline:{damage:raw.damage,range:raw.range},converted:{damage:convertedRaw.damage,range:convertedRaw.range}};
      }catch{etcError='Некорректный режим скорости или конфигурация EM.';}
    }
    if(carrier?.executionVariant==='etc') {
      const modeId=confirmedBinding?.modeId,profile=ETC_PROFILES[modeId];
      // Campaign limits creation; an already owned configuration survives a later TL change.
      if(!etcAdmission(modeId,this.catalogs).allowed || modeId!==(carrier.standaloneModeId??carrier.catalogModeId))
        etcError='UTETCConfigurationInvalid';
      else try {
        convertedRaw=etcBallistics(raw,modeId);
        weaponConfiguration={variant:'etc',modeId,source:'UT139',requiredTL:profile.minimumTL,
          basePrice:profile.basePrice,weaponPrice:profile.basePrice*2,priceMultiplier:2,
          cellSize:profile.cellSize,nominalCapacity:profile.nominalCapacity,feedSource:profile.feedSource,
          baseline:{damage:raw.damage,range:raw.range},converted:{damage:convertedRaw.damage,range:convertedRaw.range}};
      } catch {etcError='UTETCConfigurationInvalid';}
    }
    if(carrier?.executionVariant==='lp') {
      const modeId=confirmedBinding?.modeId,p=LP_PROFILES[modeId],fireMode=lpFireMode(carrier);
      if(!lpAdmission(modeId,this.catalogs).allowed||modeId!==(carrier.standaloneModeId??carrier.catalogModeId))etcError='UTLPConfigurationInvalid';
      else try {
        convertedRaw=lpBallistics(raw,modeId,fireMode);
        weaponConfiguration={variant:'lp',modeId,fireMode,source:'UT139',requiredTL:9,
          basePrice:p.basePrice,weaponPrice:p.basePrice*1.5,priceMultiplier:1.5,
          baseNominal:p.baseNominal,nominalCapacity:p.nominalCapacity,capacity:p.capacity,feedSource:p.feedSource,
          unitsPerShot:LP_FIRE_MODES[fireMode].units,hearingModifier:LP_FIRE_MODES[fireMode].hearingModifier??0,
          baseline:{damage:raw.damage,range:raw.range,shots:raw.shots},
          converted:{damage:convertedRaw.damage,range:convertedRaw.range,shots:convertedRaw.shots}};
      } catch {etcError='UTLPConfigurationInvalid';}
    }
    const selectedFeed=stormFeed(carrier,carrier?.ammunitionInventory?.magazines.find(m=>m.id===ammunition?.magazineId));
    if(selectedFeed){
      if(carrier.executionVariant!=='lp')convertedRaw={...convertedRaw,shots:selectedFeed.sourceShots};
      context={...context,sourceFeed:{...selectedFeed,effectiveShots:convertedRaw.shots}};
    }
    let compatibility = { status: identity.status === "unavailable" ? "unavailable" : "undetermined",
      reasons: [], relation: null };
    if (confirmedBinding && identity.status === "confirmed" && this.compatibility) {
      const result = this.compatibility.checkCompatibility(confirmedBinding.modeId, identity.ammoId,
        { book: identity.book, kind: identity.kind });
      compatibility = { status: result.status, reasons: result.reasons, relation: result.relation,
        warnings: result.warnings, capabilities: result.capabilities };
      if (result.reasons?.some(reason => ["CATALOG_UNAVAILABLE", "MODE_UNAVAILABLE"].includes(reason.code)))
        compatibility.status = "unavailable";
    } else if (binding?.status === "unavailable") compatibility.status = "unavailable";
    const barrel = lematBarrel(confirmedBinding?.modeId)??uawBarrelFacts(confirmedBinding?.modeId);
    if (barrel) context = { ...context, barrel };
    if (confirmedBinding?.modeId === LEMAT.shotModeId &&
        (identity.status !== "confirmed" || identity.ammoId !== LEMAT.shotAmmoId)) {
      compatibility = { status: "incompatible", reasons: [{ code: "PHYSICAL_IDENTITY_REVIEW_REQUIRED" }], relation: null };
      identity.status = "unresolved";
    }
    // An explicitly published complete munition retains its own payload even when selected
    // as a base stock. Derive the current shot only; never rewrite that stock or its identity.
    let resolvedType = type;
    const sourceVariant = identity.book === "ht" && !identity.recipe && (sourceExplosiveVariant(record) ?? sourceEnvironmentVariant(record) ?? sourceMultishotVariant(record) ?? sourceFuzeTracerVariant(this.catalogs, confirmedBinding?.modeId, record) ?? sourceCaseVariant(this.catalogs, confirmedBinding?.modeId, record));
    if (sourceVariant && confirmedBinding && compatibility.status === "compatible") {
      const native = this.automaticProfiles.prepare({ modeId: confirmedBinding.modeId, base: type, variantId: sourceVariant });
      if (native.state === "complete" && native.nativePreserved) {
        resolvedType = native.type;
        identity.recipe = structuredClone(native.type.recipe);
      } else {
        identity.recipe = { version: 1, variantId: sourceVariant };
        resolvedType = { ...type, recipe: identity.recipe };
      }
    }
    const scopedApproval = approval && approval.actorId === actorId && approval.weaponId === weaponId &&
      approval.modeId === confirmedBinding?.modeId && approval.recipeId === resolvedType?.recipe?.customId &&
      approval.fingerprint === recipeFingerprint(resolvedType ?? {}) ? approval : null;
    const automatic = confirmedBinding && identity.status === "confirmed" && resolvedType.recipe?.autoProfile ?
      this.automaticProfiles.prepare({ modeId: confirmedBinding.modeId, base: { ...resolvedType, name: record.name },
        variantId: resolvedType.recipe.variantId, savedType: resolvedType, approval: scopedApproval }) : null;
    const admission = automatic ? this.automaticProfiles.admission(automatic, { policy: profilePolicy, approval: scopedApproval }) : null;
    const assessment = confirmedBinding && identity.status === "confirmed"
      ? assessAmmunitionRecipe(this.compatibility, confirmedBinding.modeId, resolvedType,
        scopedApproval, admission, automatic?.facts) : null;
    const construction = identity.recipe ? structuredClone(assessment?.construction ?? { status: "undetermined" })
      : { status: compatibility.status };
    if(identity.recipe&&assessment)construction.authority=assessment.authority;
    if (assessment?.approval) Object.assign(construction, { authorization: assessment.approval, authority: "user-defined" });
    if (automatic) Object.assign(construction, { authority: assessment.authority, profileOrigin: automatic.origin,
      profileState: automatic.state, admission: structuredClone(admission) });
    if (identity.recipe && construction.status === "incompatible") compatibility.status = "incompatible";
    const effective = { ...convertedRaw };
    // Preserve existing mode overrides before computing damage from the raw GGA source.
    for (const key of ["level", "acc", "scopeBonus", "rof", "rcl", "bulk"])
      if (attack?.[key] !== undefined) effective[key] = attack[key];
    const transformations = overrides ? Object.entries(overrides).map(([field, value], index) => ({
      id: "mode-override:" + field, source: "OleGURPS.attackOverrides", field,
      effectId: "mode-override:" + field, order: index + 1, applied: true, reason: "existing-mode-override",
      from: raw[field === "skillLevel" ? "level" : field] ?? null, to: value
    })) : [];
    const published = compatibility.status === "compatible" && identity.book === "ht" ?
      publishedLoadBaseline(confirmedBinding?.modeId, identity.ammoId, raw, identity.recipe?.variantId) : null;
    const manualLoad = selectedLoadBallistics({state, weaponId, modeId:confirmedBinding?.modeId,
      type: type ? {...type, key:ammunition.ammoKey} : null, catalogs:this.catalogs, compatibility});
    const caseOnly = ["ht_light_case", "ht_caseless", "ht_consumable_case"].includes(identity.recipe?.variantId);
    const damageInput = { raw: identity.book==='ut' ? {...convertedRaw,rof:overrides?.rof??raw.rof,rcl:overrides?.rcl??raw.rcl} : manualLoad ? {...raw, damage:manualLoad.damage, range:manualLoad.range} : caseOnly ? raw : published?.raw ?? raw, variantId: identity.recipe?.variantId,
      baseStatus: assessment?.base?.status ?? compatibility.status, constructionStatus: automatic && (automatic.state !== "complete" || !admission?.allowed) ? "undetermined" : automatic?.referenceConfirmed && admission?.allowed ? "compatible" : assessment?.authority === "user-defined" ? "user-defined" : assessment?.authority === "world-policy" ? "world-policy" : assessment?.approval ? "user-defined" : construction.status === "native-preserved" ? "compatible" : construction.status,
      facts: { ...assessment?.facts, ...(automatic?.state === "complete" && !Number.isFinite(assessment?.facts?.caliberMm) ? automatic.facts : {}),
        ...(["ht_apex","ht_aphex"].includes(identity.recipe?.variantId) && record?.book_cost_weight_verified && Number.isFinite(record.cost_per_shot_usd) ?
          { baseCostPerShot: record.cost_per_shot_usd } : {}),
        ...(scopedApproval && identity.recipe?.variantId === "ht_plus_p" ? { plusPDecision: scopedApproval.plusPDecision } : {}) },
      explosiveParameters: identity.recipe?.customId && !identity.recipe.autoProfile ? identity.recipe.parameters : null,
      preparedExplosiveModel: automatic?.state === "complete" ? automatic.model : null,
      context: { ...context, actorId, weaponId, modeId: confirmedBinding?.modeId, ammoId: identity.ammoId, weaponConfiguration } };
    let damage = resolveAmmunitionEffects(damageInput);
    // UT139 Boosted adds only to piercing damage, including a selected alternative
    // that replaces the primary. Independent linked/follow-up/fragments stay intact.
    // ETC, Standard and Low Velocity keep their existing source-first order.
    const nonPiercingAlternative=component=>component.relation==='alternative' &&
      component.status==='resolved' && !parseKineticDamage(component.formula);
    if(['lp','gauss'].includes(weaponConfiguration?.variant) && weaponConfiguration.fireMode==='boosted' && damage.nativeSafe &&
      (damage.formula && !parseKineticDamage(damage.formula) || damage.components.some(nonPiercingAlternative))) {
      const unboostedRaw=(weaponConfiguration.variant==='gauss'?gaussBallistics:lpBallistics)(raw,weaponConfiguration.modeId,'boosted',{boostPiercingDamage:false});
      const unboosted=resolveAmmunitionEffects({...damageInput,raw:{...damageInput.raw,damage:unboostedRaw.damage}});
      if(!unboosted.nativeSafe)damage=unboosted;
      else if(!parseKineticDamage(damage.formula)) {
        convertedRaw=unboostedRaw;
        weaponConfiguration.converted.damage=convertedRaw.damage;
        damage=unboosted;
      } else {
        damage.components=damage.components.map(component=>{
          if(!nonPiercingAlternative(component))return component;
          const original=unboosted.components.find(c=>c.role===component.role&&c.relation===component.relation);
          if(!original||original.formula===component.formula)return component;
          damage.transformations.push({source:'UT139',effectId:'lp-boosted-piercing-only',field:'components.'+component.role,
            from:component.formula,to:original.formula,applied:true,order:damage.transformations.length+1,
            reason:'non-piercing-alternative-replaces-primary'});
          return original;
        });
      }
    }
    if(weaponConfiguration) {
      damage.rules.weaponConfiguration=weaponConfiguration;
      if(damage.nativeSafe)damage.effectiveChanges={damage:damage.formula,range:convertedRaw.range,halfd:convertedRaw.halfd,...(weaponConfiguration.variant==='lp'?{shots:convertedRaw.shots}:{}),...damage.effectiveChanges};
      transformations.push({source:'UT139',effectId:'weapon-'+weaponConfiguration.variant,field:'weapon',from:weaponConfiguration.baseline,
        to:weaponConfiguration.converted,applied:true,order:transformations.length+1,reason:'weapon-conversion-before-ammunition'});
    }
    if(etcError){damage.nativeSafe=false;damage.status='unresolved';damage.reason=etcError;}
    if(selectedFeed&&damage.nativeSafe)damage.effectiveChanges={...damage.effectiveChanges,shots:convertedRaw.shots};
    // Non-automatic old recipes/approvals must not become a bypass for new platform combinations.
    if (identity.recipe?.variantId === "ht_plus_p") {
      const legacy = hasLegacyPlusPAdmission(this.catalogs, confirmedBinding?.modeId, identity.ammoId);
      const rating = assessment?.facts?.evidence?.weapon_pressure_rating_verified;
      const verified = rating?.value === true && !!rating.source;
      damage.rules.pressureAdmission = { legacyPolicyAdmission: legacy, ratingVerified: verified,
        ratingSource: verified ? rating.source : null,
        basis: verified ? "verified-pressure-rating" : legacy ? "preserved-legacy-policy" : "pressure-proof-required" };
      const userPressure=!!scopedApproval?.plusPDecision?.pressureSuitable&&rating?.value!==false;
      damage.rules.pressureAdmission.userPressureAssumption=userPressure;
      if(userPressure&&!verified)damage.rules.pressureAdmission.basis='user-defined-pressure-assumption';
      if (!legacy && !verified && !userPressure) {
        damage.nativeSafe = false; damage.status = "unresolved"; damage.reason = "P1PressureProofRequired"; damage.formula = raw.damage;
      }
    }
    if (damage.nativeSafe && published) {
      damage.effectiveChanges = { ...published.changes, ...damage.effectiveChanges };
      if (published.publishedDamage || caseOnly) {
        damage.formula = published.publishedDamage ?? published.raw.damage;
        damage.components.find(c => c.role === "kinetic").formula = damage.formula;
      }
      damage.effectiveChanges.damage = damage.formula;
      damage.transformations.unshift({ source: published.source, effectId: "published-load-baseline", field: "load",
        from: raw, to: published.raw, applied: true, order: 0, reason: "selected-published-load-not-previous-mode-payload" });
      if (published.publishedDamage) damage.transformations.push({ source: published.source, effectId: "published-load-damage",
        from: damage.rawFormula, to: damage.formula, applied: true, order: damage.transformations.length + 1,
        reason: "explicit-published-damage-takes-precedence-over-generic-factor" });
    }
    effective.damage = damage.nativeSafe ? damage.formula : raw.damage;
    if(confirmedBinding?.modeId===GYROJET_MODE&&raw.damage==='3d pi+'&&
      (identity.status!=='confirmed'||identity.ammoId!==GYROJET_AMMO)){
      damage.nativeSafe=false;damage.status='unresolved';damage.reason='GyrojetIdentityRequired';
    }
    if(manualLoad && damage.nativeSafe){
      damage.effectiveChanges = {...damage.effectiveChanges, damage:damage.formula, range:manualLoad.range};
      damage.rules.alternateLoad = {source:'HT178', physicalCompatibility:'confirmed', ballistics:'owner-entered', ...manualLoad};
      damage.transformations.unshift({source:'owner-entered',effectId:'selected-load-ballistics',from:{damage:raw.damage,range:raw.range},
        to:manualLoad,applied:true,order:0});
    }
    if(!manualLoad && alternateLoadNeedsBallistics(this.catalogs,confirmedBinding?.modeId,identity.ammoId,compatibility)){
      damage.nativeSafe=false;damage.status='unresolved';damage.reason='AlternateLoadBallisticsRequired';
      damage.rules.alternateLoad={source:'HT178',physicalCompatibility:'confirmed',ballistics:'unresolved'};
    }
    const gyrojet=compatibility.status==='compatible'&&!damage.rules.manualSEFOP&&gyrojetRangeRule(confirmedBinding?.modeId,identity.ammoId,physicalRangedProfile(confirmedBinding?.modeId)?.group==='gyroc'?damage.formula:raw.damage,
      context.shotgun?.physicalDistance??context.physicalDistance);
    if(gyrojet){
      damage.rules.gyrojetRange=gyrojet;
      // HT101 gives no physical minimum range. Below one yard only the damage rule is unresolved.
      damage.rules.ballisticRange={minimum:null,maximum:physicalRangedProfile(confirmedBinding?.modeId)?.group==='gyroc'?Number(String(damage.effectiveChanges?.range??raw.range).replaceAll(',','').split('/').at(-1)):1000,halfDamage:null,source:gyrojet.source};
      if(gyrojet.status!=='resolved'){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='GyrojetDistanceRequired';
      }else if(gyrojet.damageDivisor>1)damage.transformations.push({source:gyrojet.source,effectId:'gyrojet-range-division',
        field:'nativeDamageResult',from:damage.formula,to:{divideBy:gyrojet.damageDivisor},applied:true,order:damage.transformations.length+1});
    }
    if (compatibility.warnings?.some(w => w.message === "feeding-and-cycling-not-proven-by-HT178")) {
      damage.rules.manualCyclingRequired = true;
      damage.effectiveChanges={...damage.effectiveChanges,rof:'1'};
    }
    if (damage.nativeSafe && damage.effectiveChanges) Object.assign(effective, damage.effectiveChanges);
    // HT launcher ranges are minimum/maximum, not half-damage/maximum.
    // The selected source round owns this meaning; never infer it from a weapon name.
    if (compatibility.status === "compatible" && record?.rocket_contract?.range_semantics === "minimum_yards_and_maximum_yards") {
      const parts = String(effective.range ?? "").replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (parts) damage.rules.ballisticRange = { minimum: Number(parts[1]), maximum: Number(parts[2]),
        halfDamage: null, source: record.table_ref ?? record.rocket_contract.source_ref ?? "HT" };
    }
    const selectedPlatform=compatibility.status==='compatible' && selectedGuidancePlatform(record,confirmedBinding?.modeId);
    const platform=selectedPlatform || specializedPlatform(this.catalogs?.getMode(confirmedBinding?.modeId),this.catalogs?.getEquipmentForMode(confirmedBinding?.modeId)?.source);
    const sourceRange=platformRange(platform,selectedPlatform?record.rocket_contract.range_source:platform?.manualGuidance?this.catalogs.getMode(confirmedBinding.modeId)?.stats.range:effective.range);
    if(sourceRange)damage.rules.ballisticRange=sourceRange;
    if(platform?.rangeSemantics==='speed-maximum' && Number.isFinite(record?.rocket_contract?.min_range_yards))
      damage.rules.ballisticRange={...sourceRange,minimum:record.rocket_contract.min_range_yards};
    if(platform)context={...context,platform:selectedPlatform||attack?.platformRules||platform};
    if(platform?.manualGuidance){
      damage.rules.manualGuidance={required:true,automaticGuidance:false,automaticFlightTime:false,
        confirmed:context.manualGuidanceConfirmed===true,source:platform.source};
      damage.rules.platformRange={semantics:platform.rangeSemantics,source:platform.source,...sourceRange};
      Object.assign(effective,{rof:'1',range:selectedPlatform?record.rocket_contract.range_source:String(sourceRange?.maximum??effective.range)});
      damage.effectiveChanges={...damage.effectiveChanges,rof:'1',range:effective.range,
        ...(selectedPlatform?{acc:record.guidancePackage.acc}:{})};
      if(selectedPlatform)effective.acc=record.guidancePackage.acc;
      if(selectedPlatform)damage.rules.guidancePackage=structuredClone(record.guidancePackage);
      if(platform.terminalProjectileRecoil)damage.rules.terminalAttack={rcl:platform.terminalProjectileRecoil,projectiles:194,source:platform.terminalSource,application:'manual-after-confirmed-impact'};
    }
    const projectileKind = shotgunProjectileKind({ record, mode: this.catalogs?.getMode(confirmedBinding?.modeId),
      identity, construction, nativeSafe: damage.nativeSafe });
    if (projectileKind && !published?.changes.ammunitionProjectileKind) effective.ammunitionProjectileKind = projectileKind;
    const native = confirmedBinding && reviewedNativePlusPBaseline(this.catalogs?.getMode(confirmedBinding.modeId), record);
    const environmentCapability = native?.construction === "underwater_dart" && raw.damage === native.nativeDamage &&
      compatibility.status === "compatible" ? native : null;
    if (environmentCapability && !identity.recipe) {
      // HT176 footnote [7] prices the dart itself; HT169 x2 is already in this native cartridge.
      damage.rules.nativeProjectile = { ...native, application: "already-in-native-profile-preserved" };
      damage.rules.costMultiplier = 2;
      damage.rules.costApplication = "included-in-source-cartridge-price";
      if (record?.book_cost_weight_verified && Number.isFinite(record.cost_per_shot_usd))
        damage.rules.costPerShot = record.cost_per_shot_usd;
    }
    if (context.environment) {
      const environment = resolveAttackEnvironment({ capability: environmentCapability,
        environment: context.environment.environment, depthFeet: context.environment.depthFeet,
        actualDistance: context.environment.actualDistance, range: effective.range,
        heightYards: context.environment.heightYards, elevationDirection: context.environment.elevationDirection });
      context = { ...context, environment };
      if (!environment || environment.error) {
        damage.nativeSafe = false; damage.status = "unresolved"; damage.reason = environment?.error ?? "EnvironmentIdentityRequired";
      }
    }
    // Physical projectile compatibility does not implement the required second resource.
    // No context flag, stock balance or GM approval can stand in for power accounting.
    const utModeId = confirmedBinding?.modeId ?? attack?.standaloneRef?.modeId;
    const cardSource = identity.book === 'ht' ?
      [this.catalogs?.getVariant?.('ht', identity.recipe?.variantId)?.source_ref,
        record?.ammunition_construction === 'complete_munition' || !identity.recipe ? record?.table_ref ?? record?.source_ref : null].filter(Boolean).join('; ') :
      identity.book === 'ut' && !identity.recipe ? (identity.ammoId === '3mm_ice' ? 'UT140' : UT_SPECIAL_MODES[utModeId] ? 'UT139' : 'UT152') : null;
    if(cardSource)damage.rules.ammunitionSource=compactAmmoSource(cardSource);
    if (identity.book==='ut' && identity.status==='confirmed' && UT_CONVENTIONAL_MODES[utModeId]===identity.ammoId) {
      identity.sourceEdition='Ultra-Tech 2007';damage.rules.sourceEdition='Ultra-Tech 2007';
      if(!identity.recipe)Object.assign(damage.rules,{costPerShot:record.cps_usd,weightPerShotLb:record.wps_lb,legalityClass:record.lc});
    }
    if (UT_CONVENTIONAL_MODES[utModeId] && (identity.status !== 'confirmed' || identity.book !== 'ut' ||
        identity.kind !== 'ammo-family' || identity.ammoId !== UT_CONVENTIONAL_MODES[utModeId] || compatibility.status !== 'compatible' ||
        reviewUTConventional(this.catalogs,this.compatibility,utModeId,type).status!=='compatible')) {
      damage.nativeSafe = false; damage.status = 'unresolved'; damage.reason = 'UTVariantUnavailable';
    }
    if(UT_SPECIAL_MODES[utModeId]) {
      const review=isUTExtendedVariant(identity.recipe?.variantId)?reviewUTExtended(this.catalogs,this.compatibility,utModeId,type,identity.recipe.variantId,identity.recipe.parameters):
        isUTConventionalVariant(identity.recipe?.variantId)?reviewUTConventional(this.catalogs,this.compatibility,utModeId,type,identity.recipe.variantId):
        reviewUTSpecial(this.catalogs,this.compatibility,utModeId,type,identity.recipe?.variantId);
      if(review.status!=='compatible'||identity.status!=='confirmed') {
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='UTVariantUnavailable';
      } else {
        identity.sourceEdition='Ultra-Tech 2007';damage.rules.sourceEdition='Ultra-Tech 2007';
        if(!identity.recipe)Object.assign(damage.rules,{costPerShot:record.cps_usd,weightPerShotLb:record.wps_lb});
      }
    }
    const utReadiness = utSpecialReadiness(utModeId)??utConventionalReadiness(utModeId, effective);
    if (utReadiness) { damage.nativeSafe = false; damage.status = 'unresolved'; damage.reason = utReadiness; }
    if (requiresUTPowerAccounting(utModeId)) {
      damage.nativeSafe = false;
      damage.status = "unresolved";
      damage.reason = "UTPowerAccountingRequired";
      damage.rules.powerAccounting = { required: true, implemented: false, source: "Ultra-Tech82-83,141-143" };
    }
    if(em) {
      const review=identity.recipe?.variantId&&isUTExtendedVariant(identity.recipe.variantId)?
        reviewUTExtended(this.catalogs,this.compatibility,utModeId,type,identity.recipe.variantId,identity.recipe.parameters):
        identity.recipe?.variantId&&isUTSpecialVariant(identity.recipe.variantId)?
          reviewUTSpecial(this.catalogs,this.compatibility,utModeId,type,identity.recipe.variantId):
          reviewUTConventional(this.catalogs,this.compatibility,utModeId,type,identity.recipe?.variantId);
      if(identity.book!=='ut'||identity.kind!=='ammo-family'||identity.ammoId!==em.familyId||
        identity.status!=='confirmed'||review.status!=='compatible') {
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='UTVariantUnavailable';
      } else {
        identity.sourceEdition='Ultra-Tech 2007';damage.rules.sourceEdition='Ultra-Tech 2007';
        damage.rules.gauss={modeId:utModeId,source:em.source,physicalFamily:em.familyId};
        damage.rules.ammunitionSource=em.nail?'UT82–83':'UT143';
        if(!identity.recipe)Object.assign(damage.rules,{costPerShot:record.cps_usd,weightPerShotLb:record.wps_lb});
      }
    }
    // Admission has finished. The shot needs the selected mechanics, not a catalog-sized rulebook copy.
    // Keep the source identity; tables/prose in record are never consumed by frozen Damage replay.
    if(construction.record)construction.record={id:construction.record.id,source_ref:construction.record.source_ref};
    const htDamage=htSourceDamage({modeId:confirmedBinding?.modeId,type,compatible:compatibility.status==='compatible',raw,weapon:carrier});
    if(htDamage){damage=htDamage;if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
      if(context.platform)context={...context,platform:{...context.platform,instruction:null}};
    }
    const exotic=exoticBeamProfile(utModeId);
    if(exotic){
      damage=exoticBeamDamage(raw,utModeId,carrier);
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Оружие использует штатные ячейки без физических патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:'exotic-beam-no-cartridges'};
      Object.assign(identity,{status:'not-required',book:'ut',kind:exotic.family,name:exotic.name,source:'catalog'});
      weaponConfiguration={variant:'ut-exotic-beam',...damage.rules.exoticBeam};
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    const sonicNeural=sonicNeuralProfile(utModeId);
    if(sonicNeural){
      damage=sonicNeuralDamage(raw,utModeId,carrier,context);
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Sonic/Neural использует штатный источник, без патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:'sonic-neural-no-cartridges'};
      Object.assign(identity,{status:'not-required',book:'ut',kind:sonicNeural.family,name:sonicNeural.name,source:'catalog'});
      weaponConfiguration={variant:'ut-sonic-neural',...damage.rules.sonicNeural};
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    const plasmaGun=plasmaGunProfile(utModeId);
    if(plasmaGun){
      damage=plasmaGunDamage(raw,utModeId,carrier,type);
      if(identity.status!=='confirmed'||compatibility.status!=='compatible'){damage.nativeSafe=false;damage.status='unresolved';}
      weaponConfiguration={variant:'plasma-gun',...damage.rules.plasmaGun};
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    const ppb=ppbProfile(utModeId);
    if(ppb){
      damage=ppbDamage(raw,utModeId,carrier);
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Оружие использует штатный источник без физических патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:'plasma-particle-no-cartridges'};
      Object.assign(identity,{status:'not-required',book:'ut',kind:ppb.family,name:ppb.name,source:'catalog'});
      weaponConfiguration={variant:'ut-plasma-particle',modeId:utModeId,...damage.rules.plasmaParticle};
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    const beam=beamProfile(utModeId);
    if(beam){
      damage=beamDamage(raw,utModeId,carrier);
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Лазер использует собственный источник, без патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:'source-beam-no-physical-ammunition'};
      Object.assign(identity,{status:'not-required',book:'ut',kind:'beam',name:beam.name,source:'catalog'});
      weaponConfiguration={variant:'beam',modeId:utModeId,source:beam.source,family:beam.family};
      if(damage.rules.laserModifications){
        weaponConfiguration.laserModifications=damage.rules.laserModifications;
        if(damage.rules.laserModifications.mode==='blinding')context={...context,platform:{...context.platform,hitLocationNotApplicable:true}};
      }
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    const microwave=microwaveProfile(utModeId),dazzler=utDazzlerProfile(utModeId),laser=htLaserDamage(raw,utModeId)??utDazzlerDamage(raw,utModeId)??microwaveDamage(raw,utModeId);
    if(laser){
      damage=laser;
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason=microwave?
          'Microwave использует собственную батарею, без патронов, ETC и LP.':'Лазер использует собственную батарею, без патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:microwave?'microwave-no-physical-ammunition':'source-ht-laser-no-cartridges'};
      Object.assign(identity,{status:'not-required',book:dazzler||microwave?'ut':'ht',kind:microwave?'microwave':'laser',name:attack?.name,source:'catalog'});
      weaponConfiguration={variant:microwave?'ut-microwave':dazzler?'ut-dazzler':'ht-laser',modeId:utModeId,source:microwave?.source??(dazzler?'UT113':'HT181')};
    }
    const electro=electrolaserProfile(utModeId);
    if(electro){
      damage=electrolaserDamage(raw,utModeId,carrier,context);
      if(electro.underbarrel&&(context.platform?.installation!=='host'||!Number.isFinite(context.platform?.hostBulk)||context.platform.hostBulk>-3)){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Укажите параметры оружия-носителя подствольного электролазера.';
      }
      if(carrier?.executionVariant&&!['ordinary'].includes(carrier.executionVariant)||ammunition){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Электролазер использует собственную батарею, без патронов, ETC и LP.';
      }
      compatibility={status:'compatible',reasons:[],relation:'electrolaser-no-physical-ammunition'};
      Object.assign(identity,{status:'not-required',book:'ut',kind:'beam',name:electro.name,source:'catalog'});
      weaponConfiguration={variant:'electrolaser',modeId:utModeId,...damage.rules.electrolaser};
    }
    if(physicalRangedProfile(utModeId)?.group==='grav'){
      damage=gravDamage(raw,utModeId,carrier,type);
      compatibility={status:damage.nativeSafe?'compatible':'incompatible',reasons:[],relation:'UT143-exact-physical-family'};
      weaponConfiguration={variant:'grav',modeId:utModeId,source:'UT143',externalPower:!physicalRangedProfile(utModeId).cellSize};
    }
    if(physicalRangedProfile(utModeId)?.group==='gyroc'){
      const p=physicalRangedProfile(utModeId);
      if(identity.status!=='confirmed'||compatibility.status!=='compatible'||![p.familyId,'15mm_micromissile'].includes(identity.ammoId)||
        ![undefined,'ordinary'].includes(carrier?.executionVariant)||identity.ammoId==='15mm_micromissile'&&!damage.rules.manualHoming&&!damage.rules.manualSEFOP||
        utModeId==='WX57fdTm6ELTN3VdA'&&attack?.platformRules?.installation!=='host'){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Gyroc: нужны совместимая ракета, подтверждённое наведение Micromissile и параметры носителя.';
      }
      damage.rules.physicalRanged={modeId:utModeId,group:'gyroc',familyId:identity.ammoId,source:p.source};
      if(utModeId==='WqtpFn_3ogNM9oiHv')damage.rules.manualMotor={cell:'B',minutes:15,source:'UT144'};
      weaponConfiguration={variant:'gyroc',modeId:utModeId,source:p.source};
    }
    if(physicalRangedProfile(utModeId)?.group==='missile'){
      const p=physicalRangedProfile(utModeId);
      if(identity.status!=='confirmed'||compatibility.status!=='compatible'||identity.ammoId!==p.familyId||type?.projectileTL!==missileSourceTL(utModeId)||![undefined,'ordinary'].includes(carrier?.executionVariant)){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='Ракетной установке нужна совместимая физическая ракета своего TL, без ETC/LP.';
      }
      identity.projectileTL=type?.projectileTL??null;
      damage.rules.physicalRanged={modeId:utModeId,group:'missile',familyId:identity.ammoId,projectileTL:type?.projectileTL??null,source:p.source};
      if(!identity.recipe){damage.rules.missileEconomics=record?.missile_economics;damage.rules.costPerShot=record?.cps_usd;damage.rules.weightPerShotLb=record?.wps_lb;}
      const range=String(effective.range).replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
      if(range)damage.rules.ballisticRange={minimum:null,maximum:Number(range[2]),halfDamage:damage.rules.manualHoming?null:Number(range[1]),...(damage.rules.manualHoming?{speedYardsPerSecond:Number(range[1])}:{}),source:'UT145-146; B413'};
      if(!damage.rules.reactionless){
        const large=p.familyId==='100mm_missile';
        damage.rules.backblast={formula:large?'4d burn':'2d burn',coneYards:large?3:2,direction:'behind',application:'manual',source:'UT145'};
        damage.components.push({role:'backblast',formula:damage.rules.backblast.formula,relation:'auxiliary',status:'resolved',source:'UT145'});
        damage.rules.componentOrder=damage.components.map(c=>c.role);
      }
      weaponConfiguration={variant:'missile-launcher',modeId:utModeId,source:p.source};
    }
    if(physicalRangedProfile(utModeId)?.group==='plb'){
      const p=physicalRangedProfile(utModeId),feed=utFixedFeed(utModeId),host=['W5BEH4zTOtg2ds7is','WATP5TU7jVQnEpqB0'].includes(utModeId);
      if(identity.status!=='confirmed'||compatibility.status!=='compatible'||identity.ammoId!==p.familyId||!plbRecipeAllowed(utModeId,type)||
        ![undefined,'ordinary'].includes(carrier?.executionVariant)||host&&attack?.platformRules?.installation!=='host'){
        damage.nativeSafe=false;damage.status='unresolved';damage.reason='PLB: нужны совместимый кинетический заряд, собственная подача и параметры носителя; гранатная часть отложена.';
      }
      damage.rules.physicalRanged={modeId:utModeId,group:'plb',familyId:identity.ammoId,source:p.source,sourceRoF:this.catalogs.getMode(utModeId).stats.rate_of_fire};
      damage.rules.plb={barrels:feed?.count??1,perBarrel:feed?.capacity??p.shots,physicalMaximum:p.rof,source:p.source,...(utModeId==='WIijXG9uGZ52T0eW2'?{selectedSalvo:carrier?.splatSalvo??30,changeRequiresReady:true}:{grenadeMechanicsDeferred:true})};
      weaponConfiguration={variant:'plb',modeId:utModeId,source:p.source};
    }
    if(fluidProfile(utModeId)){
      damage=fluidDamage(raw,utModeId,carrier,type,context,attack);
      compatibility={status:damage.nativeSafe?"compatible":"incompatible",reasons:[],relation:"UT134-fluid-filler"};
      Object.assign(identity,{status:damage.nativeSafe?"confirmed":"undetermined",book:"ut",kind:"fluid-filler",name:type?.name});
      if(damage.nativeSafe)Object.assign(effective,damage.effectiveChanges);
    }
    if(utModeId===HT_TEAR_SPRAY_MODE){damage=htTearSprayDamage(raw,type);compatibility={status:damage.nativeSafe?'compatible':'incompatible',reasons:[],relation:'HT180-source-aerosol'};Object.assign(identity,{status:damage.nativeSafe?'confirmed':'undetermined',source:'catalog',book:'ht',kind:'chemical-dose',name:type?.name});}
    damage=attachBiochemicalEffect(damage,type);
    if(gyrocShotshellExcluded(type)){damage.nativeSafe=false;damage.status="unresolved";damage.reason=GYROC_SHOTSHELL_REASON;}
    const diceAdds = applyDamageDiceAdds(damage, { policy: diceAddsPolicy,
      mode: this.catalogs?.getMode?.(confirmedBinding?.modeId),
      book: this.catalogs?.getEquipmentForMode?.(confirmedBinding?.modeId)?.source });
    if(damage.rules.gyrojetRange?.resultFormula){const r=damage.rules.gyrojetRange;r.resultFormula=r.damageDivisor>1?'floor(('+damage.formula.replace(/\s+pi.*$/,'')+')/'+r.damageDivisor+') '+damage.formula.match(/pi.*$/)[0]:damage.formula;}
    if (damage.nativeSafe) effective.damage = damage.rules.exoticBeam?damage.effectiveChanges.damage:laser?raw.damage:(damage.rules.sonicNeural||damage.rules.plasmaParticle||damage.rules.laserModifications)&&damage.rules.resistanceEffect?damage.effectiveChanges.damage:damage.formula;
    const weaponReliability=(damage.rules.plasmaParticle?.hotshot||damage.rules.plasmaGun?.hot)?{malf:14,source:'UT133'}:this.catalogs?.getMode(confirmedBinding?.modeId)?.weaponReliability;
    transformations.push(...damage.transformations.map(entry => ({ ...entry, order: transformations.length + entry.order })));
    return immutableCopy({ version: SHOT_PROFILE_VERSION, actorId, weaponId,
      mode: { uuid: attack?.uuid ?? null, path: attack?.path ?? null,
        ...(attack?.standaloneRef ? { standaloneRef: structuredClone(attack.standaloneRef) } : {}),
        name: attack?.name ?? raw.name ?? null, mode: attack?.mode ?? raw.mode ?? null },
      raw, overrides, effective, ...(weaponReliability?{weaponReliability}:{}), ...(weaponConfiguration?{weaponConfiguration}:{}), ...(environmentCapability ? { environmentCapability } : {}), bulkMetadata: {
        source: parseWeaponBulk(raw.bulk),
        effective: parseWeaponBulk(effective.bulk),
        capability: attack?.sourceBulkMetadata ?? attack?.bulkMetadata ?? parseWeaponBulk(raw.bulk)
      }, ammunition: identity,
      resource: ammunition ? { kind: ammunition.kind, magazineId: ammunition.magazineId,
        legacyIndex: ammunition.legacyIndex ?? null, available: ammunition.available,
        total: ammunition.total, ammoKey: ammunition.ammoKey } : { kind: "unmanaged", magazineId: null },
      binding: { status: confirmedBinding ? "confirmed" : binding?.status ?? "undetermined",
        confirmed: confirmedBinding }, compatibility, construction, damage, diceAdds,
      sources: { raw: attack?.standaloneRef ? "flags.olegurps-qol.standaloneWeapons" : "Actor.system.ranged", overrides: "world.gurpsAmmoManager.attackOverrides",
        ammunition: "world.gurpsAmmoManager", catalog: identity.book,
        catalogStatisticsApplied: false }, transformations, context });
  }
}

export function createShotSnapshot(profile, { attackId, spent = 0, resourceTiming = "unmanaged",
  resourceReceiptId = null, messageId = null, outcome = null } = {}) {
  if (!attackId) throw new Error("AttackIdRequired");
  return immutableCopy({ version: SHOT_PROFILE_VERSION, attackId, profile,
    actorId: profile.actorId, mode: profile.mode, magazineId: profile.resource.magazineId,
    ammunition: profile.ammunition, spent, resourceTiming, resourceReceiptId,
    ...(fuzeTracerShotEvents(profile, outcome) ? { ammunitionEvents: fuzeTracerShotEvents(profile, outcome) } : {}),
    correlation: { attackMessageId: messageId, damageMessageId: null,
      nativeDamageLink: "unlinked", reason: "GGA D:name(mode) re-reads Actor; DamageChat does not carry an originating attack ID" } });
}
