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
    ammunition = null, context = {}, approval = null, profilePolicy = "strict" }) {
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
    const barrel = lematBarrel(confirmedBinding?.modeId);
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
    if (assessment?.approval) Object.assign(construction, { authorization: assessment.approval, authority: "gm-approved" });
    if (automatic) Object.assign(construction, { authority: assessment.authority, profileOrigin: automatic.origin,
      profileState: automatic.state, admission: structuredClone(admission) });
    if (identity.recipe && construction.status === "incompatible") compatibility.status = "incompatible";
    const effective = { ...raw };
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
    const damage = resolveAmmunitionEffects({ raw: manualLoad ? {...raw, damage:manualLoad.damage, range:manualLoad.range} : caseOnly ? raw : published?.raw ?? raw, variantId: identity.recipe?.variantId,
      baseStatus: assessment?.base?.status ?? compatibility.status, constructionStatus: automatic && (automatic.state !== "complete" || !admission?.allowed) ? "undetermined" : automatic?.referenceConfirmed && admission?.allowed ? "compatible" : assessment?.authority === "world-policy" ? "world-policy" : assessment?.approval ? "gm-approved" : construction.status === "native-preserved" ? "compatible" : construction.status,
      facts: { ...assessment?.facts, ...(automatic?.state === "complete" && !Number.isFinite(assessment?.facts?.caliberMm) ? automatic.facts : {}),
        ...(["ht_apex","ht_aphex"].includes(identity.recipe?.variantId) && record?.book_cost_weight_verified && Number.isFinite(record.cost_per_shot_usd) ?
          { baseCostPerShot: record.cost_per_shot_usd } : {}),
        ...(scopedApproval?.active && identity.recipe?.variantId === "ht_plus_p" ? { plusPDecision: scopedApproval.plusPDecision } : {}) },
      explosiveParameters: identity.recipe?.customId && !identity.recipe.autoProfile ? identity.recipe.parameters : null,
      preparedExplosiveModel: automatic?.state === "complete" ? automatic.model : null,
      context: { ...context, actorId, weaponId, modeId: confirmedBinding?.modeId, ammoId: identity.ammoId } });
    // Non-automatic old recipes/approvals must not become a bypass for new platform combinations.
    if (identity.recipe?.variantId === "ht_plus_p") {
      const legacy = hasLegacyPlusPAdmission(this.catalogs, confirmedBinding?.modeId, identity.ammoId);
      const rating = assessment?.facts?.evidence?.weapon_pressure_rating_verified;
      const verified = rating?.value === true && !!rating.source;
      damage.rules.pressureAdmission = { legacyPolicyAdmission: legacy, ratingVerified: verified,
        ratingSource: verified ? rating.source : null,
        basis: verified ? "verified-pressure-rating" : legacy ? "preserved-legacy-policy" : "pressure-proof-required" };
      if (!legacy && !verified) {
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
    const gyrojet=compatibility.status==='compatible'&&gyrojetRangeRule(confirmedBinding?.modeId,identity.ammoId,raw.damage,
      context.shotgun?.physicalDistance??context.physicalDistance);
    if(gyrojet){
      damage.rules.gyrojetRange=gyrojet;
      // HT101 gives no physical minimum range. Below one yard only the damage rule is unresolved.
      damage.rules.ballisticRange={minimum:null,maximum:1000,halfDamage:null,source:gyrojet.source};
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
    transformations.push(...damage.transformations.map(entry => ({ ...entry, order: transformations.length + entry.order })));
    return immutableCopy({ version: SHOT_PROFILE_VERSION, actorId, weaponId,
      mode: { uuid: attack?.uuid ?? null, path: attack?.path ?? null,
        ...(attack?.standaloneRef ? { standaloneRef: structuredClone(attack.standaloneRef) } : {}),
        name: attack?.name ?? raw.name ?? null, mode: attack?.mode ?? raw.mode ?? null },
      raw, overrides, effective, ...(environmentCapability ? { environmentCapability } : {}), bulkMetadata: {
        source: parseWeaponBulk(raw.bulk),
        effective: parseWeaponBulk(effective.bulk),
        capability: attack?.sourceBulkMetadata ?? attack?.bulkMetadata ?? parseWeaponBulk(raw.bulk)
      }, ammunition: identity,
      resource: ammunition ? { kind: ammunition.kind, magazineId: ammunition.magazineId,
        legacyIndex: ammunition.legacyIndex ?? null, available: ammunition.available,
        total: ammunition.total, ammoKey: ammunition.ammoKey } : { kind: "unmanaged", magazineId: null },
      binding: { status: confirmedBinding ? "confirmed" : binding?.status ?? "undetermined",
        confirmed: confirmedBinding }, compatibility, construction, damage,
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
