import {HT_TEAR_SPRAY_MODE,chemicalOptions,chemicalEditorHTML,attachBiochemicalEffect} from './biochemical-integration.js';
import {fluidProfile} from '../ut-fluid-source.js';
import {fluidCandidates} from './ut-fluid.js';
import {gyrocShotshellExcluded,GYROC_SHOTSHELL_REASON} from './gyroc-policy.js';
import {physicalRangedProfile,physicalRangedType,missileSourceTL} from '../ut-physical-ranged-source.js';
import {utFixedFeed,plbRecipeAllowed} from './ut-physical-feeds.js';
import {plasmaGunProfile,plasmaCartridge} from '../ut-plasma-gun-source.js';
import { AmmoService } from "./ammo-service.js";
import { isAmmunitionHistoryOnlyUpdate } from './weapon-assistant-app.js';
import { stormMagazineOptions } from './ut-storm-feeds.js';
import { baseAmmunition, escapeWeaponHTML as escape } from "./weapon-configuration.js";
import { ammoTypeKey, isArchivedAmmoType, magazineFill, validateInventory } from "./ammo-inventory.js";
import { ammoText as t, ammoWindowText, ammoDisplayName } from "./ammo-management-localization.js";
import { FIRST_STAGE_VARIANTS, assessAmmunitionRecipe, variantAbbreviation } from "./ammunition-recipes.js";
import { readAmmunitionApproval, setAmmunitionApproval } from "./ammunition-approval-service.js";
import { AutomaticAmmunitionProfileService, isExplosiveRecipe, missingExplosiveInputs } from "./automatic-ammunition-profiles.js";
import { automaticAmmoPolicy, automaticAmmoText } from "./automatic-ammunition-localization.js";
import { calculateExplosiveRecipe } from "./explosive-ammunition-model.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { recipeEditorHTML, recipePreviewHTML, captureRecipeInputs } from "./ammunition-recipe-editor.js";
import { handloadEditorHTML, createRegisteredHandload } from "./handload-registration.js";
import { ammunitionResourceContract, SEALED_PLATFORM_UNITS } from "./ammunition-resource-contract.js";
import { f4Text } from "./ammunition-f4-localization.js";
import { isAutomaticReferenceRecipe, HT_AUTOMATIC_SPECIAL_RULES } from "./ht-kinetic-rules.js";
import { resolveAmmunitionEffects } from "./ammunition-effects.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { ammoEffectText } from "./gga-damage-compatibility.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { bindDUDecision } from './du-ammunition.js';
import { isMultishotVariant, bindMultishotDefinition, sourceMultishotVariant } from "./multishot-ammunition.js";
import { isExplosiveVariant, sourceExplosiveVariant } from "./explosive-attack-profiles.js";
import { isEnvironmentVariant, sourceEnvironmentVariant } from "./environment-ammunition.js";
import { isFuzeTracerVariant } from "./fuze-tracer-ammunition.js";
import { isCaseVariant, sourceCaseVariant, inventoryPhysicalTotals } from "./case-technology.js";
import { publishedLoadBaseline,alternateLoadNeedsBallistics } from "../ht-published-loads.js";
import { selectedLoadBallistics } from "./ammunition-ballistics.js";
import { ammunitionChoiceGroup, choiceGroupsHTML } from "./ammunition-choices.js";
import { UT_CONVENTIONAL_RULES, UT_CONVENTIONAL_READY_MODES as UT_CONVENTIONAL_MODES, UT_KINETIC_MODES, reviewUTConventional, utConventionalReadiness } from "./ut-conventional-ammunition.js";
import { UT_EXTENDED_RULES, isUTExtendedVariant, reviewUTExtended } from './ut-extended-ammunition.js';
import { UT_SPECIAL_MODES, UT_SPECIAL_RULES, isUTSpecialVariant, reviewUTSpecial, utSpecialReadiness, utPayloadEditorHTML } from './ut-special-ammunition.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { moduleText } from "../localization.js";
import { UT_HOMING_GUIDANCE } from './ut-sefop.js';
import { campaignAmmunitionAdmission, readCampaignTL } from './ammunition-tech-level.js';
import { applyAttackOverride } from "./weapon-attack-overrides.js";
import { magazinePolicy } from './magazine-policy.js';
import { htPreGaussProfile, htLiquidRecipe, validHTLiquidRecipe } from '../ht-pre-gauss-profiles.js';
import { htSupplyProfiles, readHTSupply } from './weapon-resources.js';

const windows = new Map();
export function ammunitionCandidates(actor, weapon, api = globalThis.OleGURPSQOL, language = globalThis.game?.i18n?.lang ?? "en") {
  const t = name => ammoWindowText(name, language);
  const inventory = weapon.ammunitionInventory;
  const standalone = weapon.standaloneWeaponId ? readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId) : null;
  const analysis = standalone ? standaloneCatalogBinding(standalone, api?.catalogs) : api?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
  const modeId = analysis?.status === "confirmed" ? analysis.binding?.modeId : null;
  if(modeId===HT_TEAR_SPRAY_MODE)return readCampaignTL(actor)!=null&&readCampaignTL(actor)<7?[]:[{source:'catalog',book:'ht',kind:'chemical-dose',ammoId:'tear',key:'ht:chemical-dose:tear',name:'Tear Gas Spray \u2014 \u0437\u0430\u0440\u044f\u0434',label:'Tear Gas Spray \u2014 \u0437\u0430\u0440\u044f\u0434'}];
  if(fluidProfile(modeId))return fluidCandidates(modeId,readCampaignTL(actor));
  const rawAttack = standalone?.data ?? weapon.attackRef?.path?.split(".").reduce((value, key) => value?.[key], actor);
  const utRawAttack=rawAttack && applyAttackOverride({...rawAttack,path:weapon.attackRef?.path,uuid:rawAttack.uuid??weapon.attackRef?.uuid,data:rawAttack},
    actor.getFlag?.('world','gurpsAmmoManager')??{});
  const rawFor = (type, variantId) => isCaseVariant(variantId) ? rawAttack :
    publishedLoadBaseline(modeId, type.ammoId, rawAttack, variantId)?.raw ?? rawAttack;
  const automatic = api?.automaticAmmunitionProfiles ?? new AutomaticAmmunitionProfileService({ catalogs: api?.catalogs, compatibility: api?.ammunitionCompatibility });
  const types = baseAmmunition(api?.ammunitionCompatibility, modeId, api?.catalogs, weapon.ammunitionBinding)
    .map(entry => {
      const type = { key: ammoTypeKey(entry), source: "catalog", name: entry.record.name,
        book: entry.book, kind: entry.kind, ammoId: entry.ammoId };
      if(missileSourceTL(modeId)){type.projectileTL=missileSourceTL(modeId);type.key=ammoTypeKey(type);}
      type.name = ammoDisplayName(type, language);
      type.label = type.name + " — Базовый";
      if (SEALED_PLATFORM_UNITS[modeId]?.ammoId === type.ammoId && type.kind === "ammo-item") {
        type.sealedPlatformModeId = modeId;
        type.key = ammoTypeKey(type);
      }
      if (entry.record.book_cost_weight_verified) type.physical = { weightPerShotLb: entry.record.weight_per_shot_lb, costPerShot: entry.record.cost_per_shot_usd };
      const nativeCase = type.book === "ht" && sourceCaseVariant(api?.catalogs, modeId, entry.record);
      if (nativeCase) {
        const prepared = automatic.prepare({ modeId, base: type, variantId: nativeCase });
        type.unavailable = prepared.state !== "complete";
        type.reason = automaticAmmoText(prepared.reasons?.[0] ?? "Ready", language);
      }
      const nativeVariant = type.book === "ht" && (sourceExplosiveVariant(entry.record) ?? sourceEnvironmentVariant(entry.record) ?? sourceMultishotVariant(entry.record));
      if (nativeVariant) {
        const prepared = automatic.prepare({ modeId, base: type, variantId: nativeVariant });
        type.unavailable = prepared.state !== "complete";
        type.reason = explosiveText(prepared.reasons?.[0] ?? "P4Conditions", {}, language);
      }
      return type;
    });
  for (const base of [...types]) if (base.book === 'ut' && base.kind === 'ammo-family' && UT_KINETIC_MODES[modeId]) {
    const record=api.catalogs.getAmmoFamily('ut',base.ammoId);
    base.sourceEdition='Ultra-Tech 2007';
    base.physical={weightPerShotLb:record.wps_lb,costPerShot:record.cps_usd,legalityClass:record.lc};
    for(const variantId of Object.keys(UT_CONVENTIONAL_RULES)) {
      const prepared=automatic.prepare({modeId,base,variantId});
      if(!prepared.type)continue;
      const approval=readAmmunitionApproval({actor,actorId:actor.id,weaponId:weapon.id,modeId,type:prepared.type});
      const admission=automatic.admission(prepared,{policy:automaticAmmoPolicy(),approval});
      const effect=resolveAmmunitionEffects({raw:utRawAttack,variantId,baseStatus:prepared.baseStatus,
        constructionStatus:prepared.rulesStatus,facts:prepared.facts});
      const type={...structuredClone(prepared.type),label:prepared.type.name,
        preparation:{...structuredClone(prepared),type:undefined,admission},unavailable:!effect.nativeSafe||!admission.allowed,
        reason:effect.nativeSafe?'':moduleText('OleGURPS.AttackProfile.'+effect.reason)};
      if(effect.nativeSafe)type.physical={weightPerShotLb:effect.rules.weightPerShotLb,costPerShot:effect.rules.costPerShot,legalityClass:effect.rules.legalityClass};
      types.push(type);
    }
  }
  for(const base of [...types])if(base.book==='ut'&&base.kind==='ammo-family'&&!base.recipe&&(UT_SPECIAL_MODES[modeId]||UT_CONVENTIONAL_MODES[modeId]||gaussProfile(modeId)||['gyroc','missile','plb'].includes(physicalRangedProfile(modeId)?.group))) {
    const record=api.catalogs.getAmmoFamily('ut',base.ammoId);
    base.physical={weightPerShotLb:record?.wps_lb??null,costPerShot:record?.cps_usd??null};
    for(const variantId of Object.keys(UT_SPECIAL_RULES)) {
      const prepared=automatic.prepare({modeId,base,variantId});
      if(!prepared.type)continue;
      const approval=readAmmunitionApproval({actor,actorId:actor.id,weaponId:weapon.id,modeId,type:prepared.type});
      const admission=automatic.admission(prepared,{policy:automaticAmmoPolicy(),approval});
      const effect=resolveAmmunitionEffects({raw:utRawAttack,variantId,baseStatus:prepared.baseStatus,constructionStatus:prepared.rulesStatus,facts:prepared.facts});
      types.push({...structuredClone(prepared.type),label:prepared.type.name,
        preparation:{...structuredClone(prepared),type:undefined,admission},unavailable:!admission.allowed||!effect.nativeSafe,
        reason:moduleText('OleGURPS.AttackProfile.'+(!effect.nativeSafe?effect.reason:'UTManualEffect')),
        physical:{weightPerShotLb:effect.rules.weightPerShotLb??null,costPerShot:effect.rules.costPerShot??null}});
    }
  }
  for(const base of [...types])if(base.book==='ut'&&base.kind==='ammo-family'&&!base.recipe) {
    for(const [variantId,rule] of Object.entries(UT_EXTENDED_RULES)) {
      // Distinct published technology improvements remain distinct physical recipes.
      for(const availabilityTL of [9,10,11,12].filter(tl=>tl>=rule.minTL)) {
        for(const selection of variantId==='ut_homing'?Object.keys(UT_HOMING_GUIDANCE).map(homingGuidance=>({homingGuidance})):
          variantId==='ut_he'?[{}, {fuze:'proximity'}]:[{}]){
        const prepared=automatic.prepare({modeId,base,variantId,parameters:{availabilityTL,...selection}});
        if(!prepared.type)continue;
        const effect=resolveAmmunitionEffects({raw:utRawAttack,variantId,baseStatus:prepared.baseStatus,constructionStatus:prepared.rulesStatus,facts:prepared.facts});
        types.push({...structuredClone(prepared.type),label:prepared.type.name,unavailable:!effect.nativeSafe,
          preparation:{...structuredClone(prepared),type:undefined,admission:automatic.admission(prepared)},
          reason:moduleText('OleGURPS.AttackProfile.'+(effect.nativeSafe?'UTManualEffect':effect.reason)),
          physical:{weightPerShotLb:effect.rules.weightPerShotLb??null,costPerShot:effect.rules.costPerShot??null}});
        }
      }
    }
  }
  for (const base of [...types]) if (base.book === "ht" && base.kind === "ammo-item" && !htPreGaussProfile(modeId)) {
    const relation=api?.ammunitionCompatibility?.checkCompatibility?.(modeId,base.ammoId,{book:base.book,kind:base.kind});
    base.substitution = relation?.relation?.type === 'directed-ht178' && !api?.catalogs?.getMode?.(modeId)?.ht_ammo_item_ids?.includes(base.ammoId);
    if (base.substitution) base.label=base.name+' — Заменяющий';
    if(alternateLoadNeedsBallistics(api?.catalogs,modeId,base.ammoId,relation)){
      base.ballisticsRequired=true;
      base.ballistics=selectedLoadBallistics({state:actor.getFlag?.('world','gurpsAmmoManager'),weaponId:weapon.id,modeId,type:base,catalogs:api?.catalogs,compatibility:relation});
      base.unavailable=!base.ballistics;base.reason=base.ballistics?'Характеристики введены владельцем; книга их не подтверждает.':'Введите Damage и Range заменяющего патрона для этого оружия.';continue;
    }
    for (const variantId of FIRST_STAGE_VARIANTS) {
      const variant = api?.catalogs?.getVariant?.("ht", variantId);
      if (!variant?.is_selectable) continue;
      let type = { ...base, recipe: { version: 1, variantId },
        name: base.name + " " + variantAbbreviation(variantId) };
      if (isExplosiveRecipe(type) || isAutomaticReferenceRecipe(type)) {
        let prepared = automatic.prepare({ modeId, base, variantId });
        if (prepared.type) type = { ...type, ...structuredClone(prepared.type) };
        const approval = readAmmunitionApproval({ actor, actorId: actor.id, weaponId: weapon.id, modeId, type });
        if (isDUVariant(variantId) || isMultishotVariant(variantId)) prepared = automatic.prepare({ modeId, base, variantId, savedType: type, approval });
        const admission = automatic.admission(prepared, { policy: automaticAmmoPolicy(), approval });
        type.preparation = { ...structuredClone(prepared), type: undefined, admission };
        type.unavailable = !admission.allowed; type.key = ammoTypeKey(type); type.status = prepared.rulesStatus;
        const effect = rawAttack && isAutomaticReferenceRecipe(type) ? resolveAmmunitionEffects({ raw: rawFor(type, variantId), variantId,
          baseStatus: prepared.baseStatus, constructionStatus: admission.allowed && ["reference","user-approved-conditional"].includes(admission.authority) ? "compatible" : admission.allowed ? admission.authority : prepared.rulesStatus,
          facts: { ...prepared.facts, ...(approval ? { plusPDecision: approval.plusPDecision } : {}) },
          context: { actorId: actor.id, weaponId: weapon.id, modeId, ammoId: base.ammoId } }) : null;
        if (effect && !effect.nativeSafe) type.unavailable = true;
        if (effect?.nativeSafe) type.physical = { weightPerShotLb: effect.rules.weightPerShotLb ?? base.physical?.weightPerShotLb,
          costPerShot: effect.rules.costPerShot ?? base.physical?.costPerShot };
        else delete type.physical;
        if (HT_AUTOMATIC_SPECIAL_RULES[variantId]) {
          type.support = effect?.support?.status ?? (type.unavailable ? "UNDETERMINED" : "AUTOMATED");
          if (type.unavailable && ["AUTOMATED", "GM-MEDIATED"].includes(type.support)) type.support = "UNDETERMINED";
          type.plusPDecision = approval?.plusPDecision ?? null;
        }
        type.label = type.name;
        type.reason = automaticAmmoText(prepared.reasons?.includes("plus-p-case-construction-unverified") ? "plus-p-case-construction-unverified" : HT_AUTOMATIC_SPECIAL_RULES[variantId] && type.unavailable ?
          variantId === "ht_plus_p" ? prepared.state === "complete" ? "ApprovalRequired" : "SpecialEvidenceRequired" : "SpecialEvidenceRequired" : prepared.state === "complete" ?
          admission.allowed ? admission.authority === "world-policy" ? "PolicyAllowed" : "Ready" : admission.authority === "revoked" ? "Revoked" : "ApprovalRequired" : "Incomplete", language);
        if (variantId === "ht_plus_p" && effect?.reason) type.reason = ammoEffectText(effect.reason, {}, { game: { i18n: { lang: language } } });
        if (variantId === "ht_plus_p" && prepared.facts?.nativeChargeBaseline?.construction === "underwater_dart" &&
            admission.authority === "approval-required") type.reason = automaticAmmoText("plus-p-individual-dart-required", language);
        if (variantId === "ht_plus_p" && prepared.reasons?.[0]?.startsWith("plus-p-") && prepared.state !== "complete")
          type.reason = automaticAmmoText(prepared.reasons[0], language);
        if (variantId === "ht_plus_p" && admission.authority === "pressure-proof-required")
          type.reason = automaticAmmoText("P1PressureProofRequired", language);
        if (isDUVariant(variantId)) {
          type.duDecision = type.recipe.parameters?.duDecision ?? approval?.duDecision ?? null;
          type.reason = (approval?.active === false ? ["Revoked"] : prepared.reasons?.length ? prepared.reasons : ["DUIncendiaryGM"])
            .map(key => automaticAmmoText(key, language)).join(" ");
        }
        if (isMultishotVariant(variantId)) {
          type.multishotDecision = approval?.multishotDecision ?? null; type.reviewRaw = structuredClone(rawAttack ?? {});
          type.reason = effect?.reason ? ammoEffectText(effect.reason, {}, { game: { i18n: { lang: language } } }) :
            automaticAmmoText(prepared.reasons?.[0] ?? (admission.authority === "revoked" ? "Revoked" : "Ready"), language);
          type.label = base.name+" "+automaticAmmoText("P3"+variantId,language);
        }
        if (isExplosiveVariant(variantId) && !["ht_apex","ht_aphex"].includes(variantId)) {
          type.reason=explosiveText(effect?.reason??prepared.reasons?.[0]??"P4Conditions",{},language);
        }
        if (isEnvironmentVariant(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P5" + variantId, language);
          type.reason = automaticAmmoText(effect?.reason ?? prepared.reasons?.[0] ?? "Ready", language);
        }
        if (isFuzeTracerVariant(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P6" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : effect?.reason ?? prepared.reasons?.[0] ?? "P6Manual" + variantId, language);
        }
        if (["ht_match_handloaded", "ht_silent"].includes(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P1" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? effect?.reason ?? "Ready", language);
        }
        if (isCaseVariant(variantId)) {
          type.label = variantId === "ht_light_case" && prepared.nativePreserved ? base.name : base.name + " " + automaticAmmoText("P7" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? effect?.reason ?? "Ready", language);
        }
        types.push(type); continue;
      }
      const assessment = assessAmmunitionRecipe(api?.ammunitionCompatibility, modeId, type);
      type.key = ammoTypeKey(type);
      type.unavailable = assessment.base?.status !== "compatible" || assessment.construction?.status !== "compatible";
      if (rawAttack && !type.unavailable && !resolveAmmunitionEffects({ raw: rawFor(type, variantId), variantId,
          baseStatus: assessment.base.status, constructionStatus: assessment.construction.status, facts: assessment.facts }).nativeSafe) type.unavailable = true;
      type.status = assessment.construction?.status ?? "undetermined";
      const explanation = t(type.status === "incompatible" ? "ConstructionIncompatible" : "ConstructionUnconfirmed");
      type.label = type.name;
      type.reason = type.unavailable ? explanation : "";
      types.push(type);
    }
  }
  for (const stock of inventory?.stocks ?? []) if (stock.type.recipe?.customId && stock.type.source === "catalog") {
    if(htLiquidRecipe(stock.type)) {
      const allowed=validHTLiquidRecipe(stock.type)&&htPreGaussProfile(modeId)?.kind==='squirt'&&
        api?.ammunitionCompatibility?.checkCompatibility(modeId,stock.type.ammoId,{book:'ht',kind:'ammo-item'}).status==='compatible';
      types.push({...stock.type,label:stock.type.name,unavailable:!allowed});continue;
    }
    const approval = readAmmunitionApproval({ actor, actorId: actor.id, weaponId: weapon.id, modeId, type: stock.type });
    if (stock.type.recipe.autoProfile) {
      const prepared = automatic.prepare({ modeId, base: { ...stock.type, name: api?.catalogs?.getAmmoItem(stock.type.book, stock.type.ammoId)?.name },
        variantId: stock.type.recipe.variantId, savedType: stock.type, approval });
      const admission = automatic.admission(prepared, { policy: automaticAmmoPolicy(), approval });
      const result = { ...stock.type, unavailable: !admission.allowed,
        preparation: { ...structuredClone(prepared), type: undefined, admission },
        label: stock.type.name,
        reason: automaticAmmoText(prepared.state === "complete" ? admission.allowed ? "Ready" : admission.authority === "revoked" ? "Revoked" : "ApprovalRequired" : "Incomplete", language) };
      if(stock.type.book==='ut' && prepared.state!=='complete' && !isUTSpecialVariant(stock.type.recipe.variantId)) {
        result.historical=true;result.label=stock.type.name+' — сохранённые остатки';
        result.reason=moduleText('OleGURPS.AttackProfile.UTOriginalProfileRequired');
      }
      const savedEffect = rawAttack && isAutomaticReferenceRecipe(stock.type) ? resolveAmmunitionEffects({ raw: rawFor(stock.type, stock.type.recipe.variantId), variantId: stock.type.recipe.variantId,
          baseStatus: prepared.baseStatus, constructionStatus: admission.allowed && ["reference","user-approved-conditional"].includes(admission.authority) ? "compatible" : admission.allowed ? admission.authority : prepared.rulesStatus,
          facts: { ...prepared.facts, ...(approval ? { plusPDecision: approval.plusPDecision } : {}) },
          context: { actorId: actor.id, weaponId: weapon.id, modeId, ammoId: stock.type.ammoId } }) : null;
      if (savedEffect && !savedEffect.nativeSafe) result.unavailable = true;
      const savedRecord = api?.catalogs?.getAmmoItem(stock.type.book, stock.type.ammoId);
      if (savedEffect?.nativeSafe) result.physical = { weightPerShotLb: savedEffect.rules.weightPerShotLb ?? (savedRecord?.book_cost_weight_verified ? savedRecord.weight_per_shot_lb : null),
        costPerShot: savedEffect.rules.costPerShot ?? (savedRecord?.book_cost_weight_verified ? savedRecord.cost_per_shot_usd : null) };
      else delete result.physical;
      if (isCaseVariant(stock.type.recipe.variantId)) {
        result.label = stock.type.recipe.variantId === "ht_light_case" && prepared.nativePreserved ? ammoDisplayName({ source: "catalog", book: "ht", kind: "ammo-item", ammoId: stock.type.ammoId, name: savedRecord?.name ?? stock.type.name }, language) :
          (savedRecord?.name ?? stock.type.name) + " " + automaticAmmoText("P7" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? savedEffect?.reason ?? "Ready", language);
      }
      result.plusPDecision = approval?.plusPDecision ?? null;
      if (stock.type.recipe.variantId === "ht_plus_p" && admission.authority === "pressure-proof-required")
        result.reason = automaticAmmoText("P1PressureProofRequired", language);
      if (["ht_match_handloaded", "ht_silent"].includes(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P1" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? savedEffect?.reason ?? "Ready", language);
      }
      if (isEnvironmentVariant(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P5" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(savedEffect?.reason ?? prepared.reasons?.[0] ?? "Ready", language);
      }
      if (isFuzeTracerVariant(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P6" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(savedEffect?.reason ?? prepared.reasons?.[0] ?? "P6Manual" + stock.type.recipe.variantId, language);
      }
      if (isExplosiveVariant(stock.type.recipe.variantId) && !["ht_apex","ht_aphex"].includes(stock.type.recipe.variantId)) {
        result.reason=explosiveText(savedEffect?.reason??prepared.reasons?.[0]??"P4Conditions",{},language);
      }
      if (isMultishotVariant(stock.type.recipe.variantId)) {
        result.multishotDecision = approval?.multishotDecision ?? stock.type.recipe.parameters?.multishotDefinition;
        result.reviewRaw = structuredClone(rawAttack ?? {});
        result.reason = savedEffect?.reason ? ammoEffectText(savedEffect.reason, {}, { game: { i18n: { lang: language } } }) :
          automaticAmmoText(prepared.reasons?.[0] ?? (admission.authority === "revoked" ? "Revoked" : "Ready"), language);
        result.label = (api?.catalogs?.getAmmoItem("ht",stock.type.ammoId)?.name ?? stock.type.name)+" "+automaticAmmoText("P3"+stock.type.recipe.variantId,language);
      }
      if (isDUVariant(stock.type.recipe.variantId)) {
        result.duDecision = stock.type.recipe.parameters?.duDecision ?? approval?.duDecision ?? null;
        result.reason = (approval?.active === false ? ["Revoked"] : prepared.reasons?.length ? prepared.reasons : ["DUIncendiaryGM"])
          .map(key => automaticAmmoText(key, language)).join(" ");
      }
      const index = types.findIndex(t=>t.key === stock.key);
      if (index >= 0) types[index] = result; else types.push(result);
      continue;
    }
    const assessment = assessAmmunitionRecipe(api?.ammunitionCompatibility, modeId, stock.type, approval);
    const authority = assessment.authority === "gm-approved" ? "GMApproved" : assessment.authority === "reference" ? "ReferenceConfirmed" :
      assessment.construction?.status === "incompatible" || assessment.base?.status === "incompatible" ? "Incompatible" : "Unknown";
    const model = isExplosiveRecipe(stock.type) ? calculateExplosiveRecipe(stock.type.recipe.variantId, stock.type.recipe.parameters ?? {}) : null;
    types.push({ ...stock.type, unavailable: assessment.base?.status !== "compatible" || !assessment.applicationAllowed || model?.status === "unresolved",
      ...(model ? { preparation: { state: model.status === "resolved" ? "complete" : "incomplete", origin: "gm", model,
        missing: missingExplosiveInputs(stock.type.recipe.parameters ?? {}), reasons: model.reasons,
        admission: { allowed: assessment.applicationAllowed, authority: assessment.authority } } } : {}),
      label: stock.type.name, reason: explosiveText(authority, {}, language), authority: assessment.authority });
  }
  // Keep legacy labels as legacy identities; never infer a catalog cartridge from free text.
  for (const stock of inventory?.stocks ?? []) if (stock.type.source === "legacy" &&
      (stock.rounds || inventory.magazines.some(m=>m.rounds && m.ammoKey===stock.key)))
    types.push({ ...stock.type, historical:true, unavailable:true,
      label: (stock.type.name || "Неизвестное прежнее название") + " — сохранённые остатки",
      reason:"У этого сохранённого типа нет подтверждённой каталожной идентичности. Остатки можно разрядить и удалить из свободного запаса." });
  // A saved family/item identity may be hidden by presentation dedup. Keep it when the service still confirms it.
  const compatible = api?.ammunitionCompatibility?.getCompatibleAmmunition(modeId)?.ammunition ?? [];
  for (const stock of inventory?.stocks ?? []) if (stock.type.source === "catalog" && !types.some(type => type.key === stock.key) &&
      compatible.some(entry => entry.status === "compatible" && ammoTypeKey(entry) === stock.key))
    types.push({ ...stock.type, label: stock.type.name });
  if(physicalRangedProfile(modeId)?.group==='missile')for(const base of [...types].filter(t=>t.recipe&&UT_EXTENDED_RULES[t.recipe.variantId]&&t.recipe.parameters.availabilityTL>=11&&!t.recipe.parameters.reactionless)){
    const prepared=automatic.prepare({modeId,base,variantId:base.recipe.variantId,parameters:{...base.recipe.parameters,reactionless:true}});
    if(!prepared.type||types.some(t=>t.key===prepared.type.key))continue;
    const effect=resolveAmmunitionEffects({raw:utRawAttack,variantId:base.recipe.variantId,baseStatus:prepared.baseStatus,constructionStatus:prepared.rulesStatus,facts:prepared.facts});
    types.push({...structuredClone(prepared.type),label:prepared.type.name,unavailable:!effect.nativeSafe,reason:effect.reason,
      preparation:{...structuredClone(prepared),type:undefined,admission:automatic.admission(prepared)},physical:{weightPerShotLb:effect.rules.weightPerShotLb??null,costPerShot:effect.rules.costPerShot??null}});
  }
  for (const type of types) {
    if(physicalRangedProfile(modeId)?.group==='plb'&&!plbRecipeAllowed(modeId,type)){
      type.unavailable=true;type.reason='Гранатная боевая часть отложена; используйте совместимый кинетический заряд.';
    }
    if(physicalRangedProfile(modeId)?.group==='gyroc'&&type.ammoId==='15mm_micromissile'&&!['ut_homing','ut_sefop'].includes(type.recipe?.variantId)){
      type.unavailable=true;type.reason='Micromissile: выберите конкретную систему Homing (UT144–146).';
    }
    if(plasmaGunProfile(modeId)&&!plasmaCartridge(modeId,type)){type.unavailable=true;type.reason='Plasma Power Cartridge: UT127,133';}
    if(physicalRangedProfile(modeId)?.group==='grav'){
      type.unavailable=!physicalRangedType(modeId,type);
      if(type.unavailable)type.reason='UT143: размер grav-снаряда не задан; совместимость специальных зарядов не подтверждена.';
    }
    if(type.book==='ut'&&!plasmaGunProfile(modeId)&&physicalRangedProfile(modeId)?.group!=='grav') {
      const review=isUTExtendedVariant(type.recipe?.variantId)?reviewUTExtended(api?.catalogs,api?.ammunitionCompatibility,modeId,type,type.recipe.variantId,type.recipe.parameters):
        isUTSpecialVariant(type.recipe?.variantId)||UT_SPECIAL_MODES[modeId]&&!type.recipe?reviewUTSpecial(api?.catalogs,api?.ammunitionCompatibility,modeId,type,type.recipe?.variantId):reviewUTConventional(api?.catalogs,api?.ammunitionCompatibility,modeId,type);
      const reason=utSpecialReadiness(modeId)??utConventionalReadiness(modeId,utRawAttack) ?? (review.status!=='compatible'?'UTPlatformDeferred':null);
      if(reason){type.unavailable=true;type.platformBlocked=!!(utSpecialReadiness(modeId)??utConventionalReadiness(modeId,utRawAttack));type.reason=moduleText('OleGURPS.AttackProfile.'+reason);}
    }
    if(type.source==='catalog') {
      const relation=api?.ammunitionCompatibility?.checkCompatibility?.(modeId,type.ammoId,{book:type.book,kind:type.kind});
      if(relation?.status==='compatible' && relation.relation?.type==='directed-ht178' &&
          !api?.catalogs?.getMode?.(modeId)?.ht_ammo_item_ids?.includes(type.ammoId)) {
        type.substitution=true;
        if(!type.recipe)type.label=type.name+' — Заменяющий';
        if(alternateLoadNeedsBallistics(api?.catalogs,modeId,type.ammoId,relation)) {
          type.ballisticsRequired=true;
          type.ballistics=selectedLoadBallistics({state:actor.getFlag?.('world','gurpsAmmoManager'),weaponId:weapon.id,modeId,type,catalogs:api?.catalogs,compatibility:relation});
          if(!type.ballistics){type.unavailable=true;type.reason='Введите Damage и Range заменяющего патрона для этого оружия.';}
        }
      }
    }
    if (SEALED_PLATFORM_UNITS[modeId] && (type.recipe || type.sealedPlatformModeId !== modeId ||
        type.ammoId !== SEALED_PLATFORM_UNITS[modeId].ammoId)) {
      type.unavailable = true; type.reason = t("SealedResourceReview");
    }
    if (modeId === LEMAT.shotModeId && (type.source !== "catalog" || type.ammoId !== LEMAT.shotAmmoId)) {
      type.unavailable = true; type.reason = automaticAmmoText("LeMatIdentityReview", language);
    }
    const display = ammoDisplayName(type, language);
    if (display !== type.name && !isCaseVariant(type.recipe?.variantId)) type.label = display + (!type.recipe ? " — " + (type.substitution ? "Заменяющий" : "Базовый") : "");
  }
  const chemicalBases=types.filter(t=>!t.unavailable&&['ut','ht'].includes(t.book)&&t.recipe&&!t.recipe.parameters?.chemicalId&&chemicalOptions(t).length);
  for(const base of chemicalBases)for(const f of chemicalOptions(base)){
    const prepared=automatic.prepare({modeId,base,variantId:base.recipe.variantId,parameters:{...base.recipe.parameters,chemicalId:f.id}});
    if(prepared.state==='complete')types.push({...structuredClone(prepared.type),label:prepared.type.name,physical:{...base.physical,costPerShot:attachBiochemicalEffect({rules:{}},prepared.type).rules.costPerShot??null}});
  }
  const campaignTL = readCampaignTL(actor);
  for(const type of types)if(gyrocShotshellExcluded(type)){type.unavailable=true;type.reason=GYROC_SHOTSHELL_REASON;}
  return types.filter(type => {
    const admitted = campaignAmmunitionAdmission(type, api?.catalogs, campaignTL, modeId);
    if (admitted.allowed) return true;
    const stock = inventory?.stocks?.find(s => s.key === type.key);
    if (!stock) return false;
    type.inventoryOnly = true;
    type.label = type.name + ' — ' + moduleText('OleGURPS.Ammo.CampaignTLExisting');
    return true;
  });
}

export function availableAmmoTypes(...args) {
  return ammunitionCandidates(...args).filter(type => ammunitionChoiceGroup(type) !== 'hidden');
}

export function displayedAmmoTypes(actor, weapon, api, language = globalThis.game?.i18n?.lang ?? "en") {
  const t = name => ammoWindowText(name, language);
  const types = availableAmmoTypes(actor, weapon, api, language);
  for (const stock of weapon.ammunitionInventory?.stocks ?? []) if (!types.some(type => type.key === stock.key) &&
      (stock.rounds > 0 || weapon.ammunitionInventory.magazines.some(m=>m.rounds > 0 && m.ammoKey === stock.key))) {
    types.push({ ...stock.type, label: (stock.type.name || "Неизвестное прежнее название") + " — сохранённые остатки",
      historical:true, unavailable:true, reason:"Идентичность или конструкция этого сохранённого типа больше не подтверждается. Можно разрядить магазин и удалить остатки из свободного запаса; новое снаряжение закрыто." });
  }
  const standalone = weapon.standaloneWeaponId ? readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId) : null;
  const analysis = standalone ? standaloneCatalogBinding(standalone, api?.catalogs ?? globalThis.OleGURPSQOL?.catalogs) :
    (api ?? globalThis.OleGURPSQOL)?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
  if (analysis?.binding?.modeId === LEMAT.shotModeId) for (const type of types)
    if (type.source !== "catalog" || type.ammoId !== LEMAT.shotAmmoId) {
      type.unavailable = true; type.reason = automaticAmmoText("LeMatIdentityReview", language);
    }
  return [...new Map(types.map(type=>[type.key,type])).values()];
}

export function plusPApprovalHTML(option, language) {
  if (option?.recipe?.variantId !== "ht_plus_p") return "";
  const t = name => automaticAmmoText(name, language), decision = option.plusPDecision ?? {};
  return `<details data-plus-p-approval><summary>${escape(t("PlusPDecision"))}</summary><p>${escape(t("PlusPReliabilityGM"))}</p>` +
    (option.preparation?.state === "complete" ?
      `<label>${escape(t("PlusPMalf"))}<input name="plusP-malf" type="number" step="1" max="0" value="${escape(decision.malfModifier ?? "")}"></label>
      <label>${escape(t("PlusPRoF"))}<input name="plusP-rof" type="number" step="1" min="1" value="${escape(decision.rof ?? "")}"></label>
      <label><input name="plusP-loading" type="checkbox" ${decision.loadingCheckPassed ? "checked" : ""}>${escape(t("PlusPLoading"))}</label>
      <label><input name="plusP-pressure" type="checkbox" ${decision.pressureSuitable ? "checked" : ""}>${escape(t("PlayerPressure"))}</label>
      <div class="gam-inventory-actions"><button type="button" data-inventory-action="save-ammo-decision">${escape(t("PlusPAllow"))}</button>
      </div>` : `<p>${escape(option.reason ?? "")}</p>`) + `</details>`;
}
export function duApprovalHTML(option, language) {
  const id = option?.recipe?.variantId;
  if (!isDUVariant(id)) return "";
  const t = name => automaticAmmoText(name, language), decision = option.duDecision ?? {}, facts = option.preparation?.facts ?? {};
  const platforms = id === "ht_apfsdsdu" ? ["tank_gun", "autocannon"] : ["autocannon", "source_verified_other_platform"];
  const platform = decision.platform ?? facts.weaponPlatforms?.values?.find(p => platforms.includes(p)) ?? "";
  return `<details data-du-approval><summary>${escape(t("DUDecision"))}</summary><p>${escape(t("DUIncendiaryGM"))}</p>` +
    (option.recipe.autoProfile ?
      `<div class="gam-inventory-du-fields"><label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="du-design" type="checkbox" ${decision.designConfirmed ? "checked" : ""}>${escape(t("DUDesign"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUPlatform"))}<select name="du-platform"><option value="">${escape(t("DUPlatformChoose"))}</option>${platforms.map(p => `<option value="${p}" ${p === platform ? "selected" : ""}>${escape(t({ tank_gun: "DUTankGun", autocannon: "DUAutocannon", source_verified_other_platform: "DUOtherPlatform" }[p]))}</option>`).join("")}</select></label>
      <label>${escape(t("DUCaliber"))}<input name="du-caliber" type="number" min="0.01" step="any" value="${escape(facts.caliberMm ?? decision.caliberMm ?? "")}" ${Number.isFinite(facts.caliberMm) ? "readonly" : ""}></label>
      <label>${escape(t("DUAvailabilityTL"))}<input name="du-tl" type="number" min="8" step="1" value="${escape(facts.availabilityTL ?? decision.availabilityTL ?? "")}" ${Number.isInteger(facts.availabilityTL) ? "readonly" : ""}></label>
      <label class="gam-inventory-du-wide">${escape(t("DUSource"))}<input name="du-source" type="text" value="${escape(decision.source ?? "")}"></label>
      <div class="gam-inventory-actions gam-inventory-du-wide"><button type="button" data-inventory-action="save-ammo-decision">${escape(t("DUAllow"))}</button></div></div>` : `<p>${escape(option.reason ?? "")}</p>`) + `</details>`;
}
export function multishotApprovalHTML(option, language) {
  const id=option?.recipe?.variantId;
  if (!isMultishotVariant(id)) return "";
  const t=name=>automaticAmmoText(name,language), f=option.preparation?.facts ?? {}, d=option.multishotDecision ?? {}, o=f.multishotOption;
  if (!o) return `<p class="hint">${escape(option.reason ?? t("MultishotEvidenceRequired"))}</p>`;
  const number=(name,key,value,readonly=false)=>`<label>${escape(t(key))}<input name="p3-${name}" type="number" step="any" value="${escape(value ?? "")}" ${readonly?"readonly":""}></label>`;
  const many=["ht_shotshell","ht_canister","ht_multi_flechette","ht_rubber_shot","ht_buck_and_ball"].includes(id);
  const slug=["ht_rifled_slug","ht_baton","ht_beanbag"].includes(id);
  const special=["ht_shrapnel","ht_beehive","ht_abf"].includes(id);
  return `<details data-multishot-approval><summary>${escape(t("MultishotDecision"))}</summary><p>${escape(t("MultishotEvidenceRequired"))}</p>`+
    `<div class="gam-inventory-du-fields">
      <label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-design" type="checkbox" ${d.designConfirmed?"checked":""}>${escape(t("MultishotDesign"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUPlatform"))}<select name="p3-platform"><option value="">${escape(t("DUPlatformChoose"))}</option>${(o.eligibility_v1.conditions.weapon_platforms_any ?? []).map(p=>`<option value="${p}" ${d.platform===p?"selected":""}>${escape(t("P3Platform"+p))}</option>`).join("")}</select></label>
      ${number("caliber","DUCaliber",f.caliberMm ?? d.caliberMm,Number.isFinite(f.caliberMm))}${number("tl","MultishotTL",f.availabilityTL ?? d.availabilityTL,Number.isInteger(f.availabilityTL))}
      ${many?number("count","MultishotCount",d.count)+ (id!=="ht_buck_and_ball"?number("diameter","MultishotDiameter",d.elementMm):""):""}
      ${id==="ht_shotshell"?`<label>${escape(t("MultishotShotSize"))}<select name="p3-size">${["buckshot","birdshot","smallshot"].map(s=>`<option value="${s}" ${d.shotSize===s?"selected":""}>${escape(t("P3Size"+s))}</option>`).join("")}</select></label>`:""}
      ${id==="ht_canister"?`<label>${escape(t("MultishotElementType"))}<select name="p3-type"><option value="pi+">pi+</option><option value="pi++" ${d.elementType==="pi++"?"selected":""}>pi++</option></select></label>`:""}
      ${slug?`<label>${escape(t("MultishotBaseline"))}<select name="p3-baseline"><option value="buckshot">${escape(t("P3Sizebuckshot"))}</option><option value="slug" ${d.baselineKind==="slug"?"selected":""}>${escape(t("P3ht_rifled_slug"))}</option>${id!=="ht_rifled_slug"?`<option value="solid" ${d.baselineKind==="solid"?"selected":""}>${escape(t("MultishotSolidBaseline"))}</option>`:""}</select></label>${number("rcl","MultishotSlugRcl",d.slugRcl)}`:""}
      ${special?number("burst","MultishotBurstDistance",d.burstDistance):""}
      ${many&&id!=="ht_buck_and_ball"&&id!=="ht_shotshell"?`<label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-b409" type="checkbox" ${d.b409Applicable?"checked":""}>${escape(t("MultishotB409"))}</label>`:""}
      <label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-native" type="checkbox" ${d.nativeVariant===id?"checked":""}>${escape(t("MultishotNative"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUSource"))}<input name="p3-source" type="text" value="${escape(d.source ?? "")}"></label>
      <div class="gam-inventory-actions gam-inventory-du-wide"><button type="button" data-inventory-action="save-ammo-decision">${escape(t("DUAllow"))}</button></div></div>`+`</details>`;
}
export function ammoManagementHTML(weapon, ui, types) {
  const profile=htPreGaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
  const liquid=['flame','squirt'].includes(profile?.kind);
  const t = name => weapon?.standaloneModeId==='W073XWePe7F0ZsLMX'&&name==='Magazine'?'Одноразовое устройство':liquid&&name==='Magazine'?'Резервуар':liquid&&name==='Capacity'?
    profile.kind==='flame'?'Ёмкость, подготовленных струй':'Ёмкость, пинт':ammoWindowText(name, ui.language ?? globalThis.game?.i18n?.lang ?? "en");
  if (!weapon) return `<p role="status">${escape(t("WeaponMissing"))}</p>`;
  const inventory = weapon.ammunitionInventory;
  const magazineLimit=magazinePolicy(weapon).limit;
  const remainingMagazines=Math.max(0,magazineLimit-(inventory?.magazines?.length??0));
  if (weapon.ammunitionReview || !validateInventory(inventory, weapon.id))
    return `<div class="gam-ammo-inventory"><h3>${escape(weapon.name)}</h3><p role="status">${escape(t("Review"))}</p></div>`;
  const magazine = inventory.magazines.find(entry => entry.id === ui.magazineId);
  const stock = inventory.stocks.find(entry => entry.key === ui.ammoKey);
  const option = types.find(entry => entry.key === ui.ammoKey);
  const resource = ammunitionResourceContract(option);
  const stormOptions=stormMagazineOptions(weapon);
  const physical = inventoryPhysicalTotals(inventory, types).find(row => row.key === ui.ammoKey);
  const economics = physical && (physical.weightLb != null || physical.costUsd != null) ? `<div class="gam-inventory-line" data-ammo-physical><span>${escape(automaticAmmoText("P7AmmunitionMass", ui.language))}: ${physical.weightLb == null ? "—" : Number(physical.weightLb.toFixed(6)) + " lb"}</span><span>${escape(automaticAmmoText("P7AmmunitionCost", ui.language))}: ${physical.costUsd == null ? "—" : "$" + Number(physical.costUsd.toFixed(6))}</span></div>` : "";
  const fill = magazineFill(magazine?.rounds ?? 0, magazine?.capacity ?? 0);
  const ammunition = inventory.stocks.find(entry => entry.key === magazine?.ammoKey)?.type;
  const name = ammoDisplayName(ammunition, ui.language ?? globalThis.game?.i18n?.lang ?? "en");
  const installed = magazine?.id === inventory.installedId;
  const compartment=utFixedFeed(weapon);
  const button = (action, text, disabled = false) => `<button type="button" data-inventory-action="${action}" ${disabled ? "disabled" : ""}>${escape(t(text))}</button>`;
  const detail = magazine ? `<div class="gam-inventory-detail" data-magazine-detail>
    <div class="gam-inventory-parameters">
      <strong>${escape(compartment?.label??t("Magazine"))} №${inventory.magazines.indexOf(magazine) + 1}</strong>
      <span>${escape(t("Capacity"))}: ${escape(magazine.sourceFeed?.loadedCapacity===magazine.capacity ? magazine.sourceFeed.magazineCapacity+' + '+magazine.sourceFeed.chamberCapacity : magazine.capacity)}</span>
      <p>${escape(t("Ammo"))}: ${escape(name || t("Empty"))}</p>
    </div>
    <div class="gam-inventory-controls">
    <div class="gam-inventory-line"><span>${installed ? escape(t("Installed")) : ""}</span><strong>${magazine.rounds}/${magazine.capacity}</strong></div>
    <div class="gam-inventory-bar" role="progressbar" aria-label="${escape(t("Magazine"))}" aria-valuemin="0" aria-valuemax="${magazine.capacity}" aria-valuenow="${magazine.rounds}"><span style="width:${fill.percent}%;background:hsl(${fill.hue} 78% 43%)"></span></div>
    <label>${escape(t("Quantity"))}<input type="number" name="magazineQuantity" min="1" step="1" value="${ui.magazineQuantity ?? resource?.capacity ?? Math.max(1, Math.min(magazine.capacity - magazine.rounds, stock?.rounds ?? 0))}"></label>
    <div class="gam-inventory-actions">${button("load", "Load", !option || option.unavailable || magazine.sealedUsed || magazine.rounds >= magazine.capacity)}${button("unload", "Unload", !magazine.rounds)}${button("unload-all", "UnloadAll", !magazine.rounds)}${compartment?'':button("delete-magazine", "Delete")}</div>
    </div>
  </div>` : `<p class="hint">${escape(t("NoMagazine"))}</p>`;
  return `<div class="standard-form gam-ammo-inventory">
    <h3 title="${escape(weapon.name)}">${escape(weapon.name)}</h3>
    ${weapon.standaloneModeId==='WIijXG9uGZ52T0eW2'?`<div data-splat-salvo><label>Залп Splat (сейчас ${weapon.splatSalvo??30})<input type="number" name="splatSalvo" min="1" max="30" step="1" value="${weapon.splatSalvo??30}"></label><label><input type="checkbox" name="splatReady">Выполнена Ready для изменения залпа (UT136).</label><button type="button" data-inventory-action="splat-salvo">Установить залп после Ready</button></div>`:''}
    ${profile?.kind==='flame'?`<p class="hint">Один заряд — табличная струя ${profile.seconds} с с подготовленным зажиганием. Заправка, давление и безопасная подготовка — вручную. ${escape(profile.source)}</p>`:''}
    ${weapon?.standaloneModeId==='WjKzQQPbrfR6qChS8'?'<p class="hint">Зажигание LPO-50: 4×S. Наличие и состояние батарей учитываются вручную: HT180 не задаёт ресурс на комплект.</p>':''}
    ${htSupplyProfiles(weapon).map(p=>{const s=readHTSupply(weapon,p);return `<div class="gam-inventory-line" data-ht-supply="${p.id}"><span>${escape(p.label)}: ${p.manual?s?.remaining?'подключено':'не подключено':s?s.remaining+'/'+p.capacity:'не установлен'}</span><button type="button" data-inventory-action="replace-ht-supply" data-resource-id="${p.id}">${p.manual?s?.remaining?'Отключить':'Подтвердить подключение':'Установить новый ресурс'}</button></div>`;}).join('')}
    <label>${escape(t("Ammo"))}<select name="inventoryAmmo"><option value="">${escape(t("NoAmmo"))}</option>${choiceGroupsHTML(types,ui.ammoKey,escape)}</select></label>
    ${profile?.kind==='squirt'&&option?(()=>{const p=ui.htLiquidDrafts?.[ui.ammoKey]??option.recipe?.parameters??{note:'Вода',savingThrow:'',description:''};return `<details data-ht-liquid><summary>Содержимое жидкости</summary><p class="hint">Эффект применяется вручную. Едкие жидкости повреждают пластик и не подходят. HT180</p>${['note','savingThrow','description'].map((k,i)=>`<label>${['Note / жидкость','Спасбросок','Краткое описание'][i]}<textarea name="ht-liquid-${k}" rows="2">${escape(p[k]??'')}</textarea></label>`).join('')}<button type="button" data-inventory-action="save-ht-liquid">Сохранить партию</button><button type="button" data-inventory-action="new-ht-liquid">Новая отдельная партия</button></details>`;})():''}
    ${option?.substitution ? '<strong class="gam-substitution" data-ammo-origin>Заменяющий</strong>' : ''}
    ${option?.ballisticsRequired ? `<details data-load-ballistics ${(ui.ballisticsOpen ?? !option.ballistics) ? 'open' : ''}><summary>Характеристики заменяющего патрона</summary><fieldset><p class="hint">Введите значения для этого оружия. Они сохраняются как решение владельца, а не данные книги. Если характеристики определяет ведущий, согласуйте их с ним.</p>${['damage','range'].map(field=>{const value=ui.ballisticsDraft?.[field]??option.ballistics?.[field]??'';return `<label>${field==='damage'?'Damage':'Range'}<input name="load-${field}" value="${escape(value)}" required aria-invalid="${!value}" class="${!value?'gam-required-missing':''}" placeholder="Требуется ввод"></label>`;}).join('')}<button type="button" data-inventory-action="save-load-ballistics">Сохранить характеристики</button></fieldset></details>` : ''}
    <div class="gam-inventory-line"><strong>${escape(t("Loose"))}: ${stock?.rounds ?? 0}</strong><span>${escape(t("Total"))}: ${weapon.totalAmmo}</span></div>
    ${economics}
    ${resource ? `<p class="hint" data-ammo-resource>${escape(t(resource.capacity === 5 ? "SealedClusterHint" : "DisposableTubeHint"))}</p>` : ""}
    <p class="hint">${escape(t("Scope"))}</p>
    ${option?.reason && option.unavailable ? `<p class="hint" data-ammo-identity-review>${escape(option.reason)}</p>` : ""}
    ${types.some(type => type.ammoId === LEMAT.shotAmmoId) ? `<p class="hint" data-charge-economics>${escape(automaticAmmoText("LeMatEconomicsUnknown", ui.language))}</p>` : ""}
    <label>${escape(t("Quantity"))}<div class="gam-inventory-stock"><input type="number" name="stockQuantity" min="1" step="1" value="${ui.stockQuantity ?? resource?.capacity ?? 1}">${button("add-stock", "Add", !option || option.unavailable)}${button("remove-stock", "Remove", !stock?.rounds)}</div></label>
    ${recipeEditorHTML(ui, option, ui.language ?? "ru")}
    ${option?.book==='ht'&&chemicalOptions(option).length?`<details data-biochemical-payload><summary>\u0425\u0438\u043c\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0441\u043e\u0441\u0442\u0430\u0432</summary>${chemicalEditorHTML(option,ui.utPayloadDraft,escape,{campaignTL:ui.campaignTL})}<button type="button" data-inventory-action="save-biochemical-batch">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0443\u044e \u043f\u0430\u0440\u0442\u0438\u044e</button></details>`:''}
    ${utPayloadEditorHTML(option,ui.utPayloadDraft,escape,{open:ui.utPayloadOpen,campaignTL:ui.campaignTL,
      homingWarheads:types.filter(t=>t.book==='ut'&&t.recipe&&!t.unavailable&&!['ut_homing','ut_sefop','ut_shotshell'].includes(t.recipe.variantId)&&
        (t.recipe.parameters?.availabilityTL==null||t.recipe.parameters.availabilityTL===(ui.utPayloadDraft??option?.recipe?.parameters)?.availabilityTL))})}
    ${stock?.type.recipe?.customId?`<button type="button" data-inventory-action="delete-recipe">${escape(moduleText('OleGURPS.Ammo.DeleteRecipe'))}</button>`:''}
    ${handloadEditorHTML(option)}
    ${plusPApprovalHTML(option, ui.language ?? "ru")}
    ${duApprovalHTML(option, ui.language ?? "ru")}
    ${multishotApprovalHTML(option, ui.language ?? "ru")}
    <hr>
    <label><span class="gam-inventory-line"><strong>${escape(compartment?(compartment.selectionOnly?'Каморы':'Стволы'):t("Magazines"))}</strong><span>${escape(t("Total"))}: ${inventory.magazines.length}</span></span>
      <select name="inventoryMagazine">${inventory.magazines.length ? inventory.magazines.map((entry, index) => `<option value="${escape(entry.id)}" ${entry.id === ui.magazineId ? "selected" : ""}>№${index + 1} · ${entry.capacity} · ${entry.rounds}/${entry.capacity}${entry.id === inventory.installedId ? " · " + escape(t("Installed")) : ""}</option>`).join("") : `<option value="">${escape(t("NoMagazine"))}</option>`}</select></label>
    ${detail}
    <details ${ui.addOpen ? "open" : ""} data-add-magazines><summary>${escape(t("AddMagazines"))}</summary><div class="gam-inventory-add">
      <label>${escape(t("Capacity"))}${stormOptions?`<select name="newCapacity">${stormOptions.map(p=>`<option value="${p.capacity}" ${Number(ui.newCapacity)===p.capacity?'selected':''}>${escape(moduleText('OleGURPS.ETC.'+p.label))}</option>`).join('')}</select>`:`<input type="number" name="newCapacity" min="1" max="${ui.capacityLimit ?? lematBarrel(weapon.standaloneModeId)?.capacity ?? 100000}" step="1" value="${ui.newCapacity ?? resource?.capacity ?? ui.capacityLimit ?? lematBarrel(weapon.standaloneModeId)?.capacity ?? 30}">`}</label>
      <label>${escape(t("MagazineCount"))}<input type="number" name="newCount" min="1" max="${Math.max(1,remainingMagazines)}" ${remainingMagazines?'':'disabled'} step="1" value="${ui.newCount ?? 1}"></label>${button("add-magazines", "Add",!remainingMagazines)}
      <small data-magazine-limit>${escape(moduleText('OleGURPS.Ammo.MagazineLimitCount',{count:inventory.magazines.length,limit:magazineLimit}))}</small>
    </div></details>
    <p class="hint" data-inventory-status role="status">${escape(ui.message ?? "")}</p>
  </div>`;
}

export class AmmoManagementApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { classes: ["olegurps-qol"], tag: "section",
    position: { width: 720, height: "auto" }, window: { resizable: false } };
  constructor({ actor, weaponId, onUpdate, language = "ru" }, options = {}) {
    super({ ...options, id: `olegurps-ammo-inventory-${actor.id}-${weaponId}`, window: { title: ammoWindowText("Title", language), ...options.window } });
    this.actor = actor; this.weaponId = weaponId; this.service = new AmmoService(actor); this.onUpdate = onUpdate;
    this.ui = { language, canEdit: actor.isOwner===true || globalThis.game?.user?.isGM===true }; this.busy = false; this._hook = null; this._closed = false;
    this._change = event => this._onChange(event);
    this._click = event => this._onClick(event);
    this._input = event => {
      if(event.target.closest?.('[data-ut-payload]')){this._captureInputs();return;}
      if(['load-damage','load-range'].includes(event.target.name)){
        event.target.classList.toggle('gam-required-missing',!event.target.value.trim());
        event.target.setAttribute('aria-invalid',String(!event.target.value.trim()));return;
      }
      if (!event.target.matches("[data-recipe-field]")) return;
      this._captureInputs();
      const target = this.element.querySelector("[data-recipe-preview]");
      if (target) target.outerHTML = recipePreviewHTML(this.ui.recipe.variantId, this.ui.recipe.parameters, this.ui.language);
    };
  }
  render(options={}) {
    if(this.rendered&&!this.busy)this._captureInputs();
    return super.render(options);
  }
  async _prepareContext() {
    this.ui.campaignTL = readCampaignTL(this.actor);
    const state = await this.service.loadState();
    this.weapon = state.weapons.find(entry => entry.id === this.weaponId);
    const modeId = this.weapon?.standaloneModeId ?? globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor, this.weapon?.attackRef?.path)?.binding?.modeId;
    this.ui.capacityLimit = magazinePolicy(this.weapon).capacity??lematBarrel(modeId)?.capacity;
    const inventory = this.weapon?.ammunitionInventory;
    const types = this.weapon ? displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language) : [];
    // One fresh list per context. Input capture only needs the defaults of the
    // already displayed physical recipe; service operations still revalidate.
    this._displayedTypes = new Map(types.map(type => [type.key, type]));
    if (!types.some(type => type.key === this.ui.ammoKey)) {
      const current=inventory?.magazines.find(m=>m.id===inventory.installedId)?.ammoKey;
      this.ui.ammoKey=types.find(type=>type.key===current)?.key??types[0]?.key??"";
      this._restorePayloadDraft(this.ui.ammoKey);
    }
    if (!inventory?.magazines.some(entry => entry.id === this.ui.magazineId))
      this.ui.magazineId = inventory?.installedId ?? inventory?.magazines[0]?.id ?? "";
    return { weapon: this.weapon, types };
  }
  async _renderHTML(context) { return ammoManagementHTML(context.weapon, this.ui, context.types); }
  _replaceHTML(html, content) { content.innerHTML = html; }
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.element.dataset.inventoryListeners) {
      this.element.addEventListener("change", this._change);
      this.element.addEventListener("click", this._click);
      this.element.addEventListener("input", this._input);
      this.element.addEventListener("toggle",event=>{
        if(event.target.isConnected&&event.target.matches?.('[data-ut-payload]'))this._captureInputs();
      },true);
      this.element.dataset.inventoryListeners = "true";
    }
    if (this._hook === null) this._hook = Hooks.on("updateActor", (actor, changes) => {
      if (actor.id !== this.actor.id || this._closed) return;
      if (isAmmunitionHistoryOnlyUpdate(changes)) return;
      if (this.busy) this._pendingUpdate = true;
      else this.refresh().catch(error => console.error("OleGURPS ammunition refresh", error));
    });
    if (this._approvalHook == null) this._approvalHook = Hooks.on("updateSetting", setting => {
      if (!["olegurps-qol.ammunitionApprovals", "olegurps-qol.preparedAmmoPolicy"].includes(setting.key) || this._closed) return;
      if (this.busy) this._pendingUpdate = true;
      else this.refresh().catch(error => console.error("OleGURPS approval refresh", error));
    });
  }
  async refresh({ capture = true } = {}) {
    if (this._closed) return;
    if (capture) this._captureInputs();
    const context = await this._prepareContext();
    if (this._closed) return;
    const root = this.element?.querySelector(".window-content");
    if(capture)this._captureInputs();
    if (root) this._replaceHTML(await this._renderHTML(context), root);
  }
  _restorePayloadDraft(key) {
    const saved=this._utPayloadDrafts?.get(key);
    this.ui.utPayloadDraft=saved?structuredClone(saved.parameters):null;
    this.ui.utPayloadOpen=saved?.open??false;
  }
  _captureInputs() {
    const root = this.element;
    if(root?.querySelector('[data-ht-liquid]')) {
      this.ui.htLiquidDrafts??={};this.ui.htLiquidDrafts[this.ui.ammoKey]=Object.fromEntries(
        ['note','savingThrow','description'].map(k=>[k,root.querySelector(`[name="ht-liquid-${k}"]`)?.value??'']));
    }
    const payload=root?.querySelector('[data-ut-payload]');
    if(payload) {
      const key=payload.dataset?.ammoKey||this.ui.ammoKey;
      const selected=this._displayedTypes ? this._displayedTypes.get(key) :
        displayedAmmoTypes(this.actor,this.weapon,undefined,this.ui.language).find(t=>t.key===key);
      const current=key===this.ui.ammoKey;
      const prior=(current?this.ui.utPayloadDraft:this._utPayloadDrafts?.get(key)?.parameters)??selected?.recipe?.parameters??{};
      const radiusText=root.querySelector('[name="ut-radius"]')?.value.trim(),yards=radiusText?Number(radiusText):null;
      const parameters={...prior,chemicalId:root.querySelector('[name="ut-chemicalId"]')?.value??prior.chemicalId,note:root.querySelector('[name="ut-note"]')?.value??'',
        savingThrow:root.querySelector('[name="ut-saving-throw"]')?.value??'',description:root.querySelector('[name="ut-description"]')?.value??'',
        radius:prior.radius?{...prior.radius,yards,...(yards!==prior.radius.yards?{origin:'manual',source:'owner-entered'}:{})}:null};
      for(const field of ['availabilityTL','durationSeconds']) {
        const input=root.querySelector(`[name="ut-${field}"]`);if(input)parameters[field]=Number(input.value);
      }
      for(const field of ['setting','atmosphere','sefopGuidance','sefopMode','sefopAspect','homingGuidance','warheadVariant','fuze']) {
        const input=root.querySelector(`[name="ut-${field}"]`);if(input)parameters[field]=input.value;
      }
      if(parameters.warheadVariant==='')parameters.warheadVariant=null;
      const open=payload.open===true;
      (this._utPayloadDrafts??=new Map()).set(key,{parameters:structuredClone(parameters),open});
      if(current){this.ui.utPayloadDraft=parameters;this.ui.utPayloadOpen=open;}
    }
    captureRecipeInputs(root, this.ui);
    const ballistics = root?.querySelector('[data-load-ballistics]');
    if (ballistics) {
      this.ui.ballisticsDraft=Object.fromEntries(['damage','range'].map(field=>[field,root.querySelector(`[name="load-${field}"]`)?.value??'']));
      this.ui.ballisticsOpen = ballistics.open;
    }
    for (const [name, key] of [["stockQuantity", "stockQuantity"], ["magazineQuantity", "magazineQuantity"], ["newCapacity", "newCapacity"], ["newCount", "newCount"]]) {
      const input = root?.querySelector(`[name="${name}"]`);
      if (input) this.ui[key] = input.value === "" ? "" : Number(input.value);
    }
    this.ui.addOpen = root?.querySelector("[data-add-magazines]")?.open ?? this.ui.addOpen;
  }
  async _onChange(event) {
    this._captureInputs();
    if (event.target.name === "inventoryAmmo") {
      this.ui.ammoKey = event.target.value; this.ui.magazineQuantity = undefined;
      this.ui.ballisticsDraft = null;
      this._restorePayloadDraft(this.ui.ammoKey);
      this.ui.ballisticsOpen = undefined;
      const selected = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
      this.ui.recipe = structuredClone(selected?.recipe ?? null);
      this.ui.recipeOpen = false;
      await this.refresh({ capture: false });
    }
    else if (event.target.name === "inventoryMagazine") { this.ui.magazineId = event.target.value; this.ui.magazineQuantity = undefined; await this.refreshMagazine(); }
    else if(this.ui.utPayloadDraft?.homingGuidance&&['ut-availabilityTL','ut-homingGuidance','ut-warheadVariant'].includes(event.target.name))await this.refresh({capture:false});
  }
  async refreshMagazine() {
    const context = await this._prepareContext();
    if (this._closed) return;
    const template = document.createElement("template");
    template.innerHTML = await this._renderHTML(context);
    const current = this.element?.querySelector("[data-magazine-detail]");
    const next = template.content.querySelector("[data-magazine-detail]");
    if (current && next) current.replaceWith(next);
    else await this.refresh({ capture: false });
  }
  async _onClick(event) {
    const button = event.target.closest("[data-inventory-action]");
    if (!button) return;
    event.preventDefault(); this._captureInputs();
    const operation = button.dataset.inventoryAction;
    if(operation==='replace-ht-supply') {
      if(this.busy)return;this.busy=true;
      try {
        const p=htSupplyProfiles(this.weapon).find(p=>p.id===button.dataset.resourceId);if(!p)throw Error('Ресурс недоступен.');
        const saved=this.weapon.htSupplies?.[p.id]??null,connected=!(p.manual&&saved?.remaining);
        const yes=await foundry.applications.api.DialogV2.confirm({window:{title:p.label},
          content:`<p>${escape(p.manual?(connected?'Подтвердить наличие и подключение компрессора, шланга и внешнего питания?':'Отключить внешнее питание?'):'Установить новый полный ресурс: '+p.label+' ('+p.capacity+')?')}</p>`,
          yes:{label:'Да'},no:{label:'Нет'},rejectClose:false});
        if(yes)await this.onUpdate?.(await this.service.replaceHTSupply(this.weaponId,{resourceId:p.id,requestId:crypto.randomUUID(),expected:structuredClone(saved),connected}));
      }catch(error){this.ui.message=error.message;ui.notifications.error(error.message);}
      finally{this.busy=false;await this.refresh({capture:false});}return;
    }
    if(['save-ht-liquid','new-ht-liquid'].includes(operation)) {
      if(this.busy)return;this.busy=true;
      try {
        const selected=displayedAmmoTypes(this.actor,this.weapon,undefined,this.ui.language).find(t=>t.key===this.ui.ammoKey);
        if(htPreGaussProfile(this.weapon.standaloneModeId)?.kind!=='squirt'||selected?.ammoId!=='olegurps_ht_squirt_liquid')throw Error('Жидкость недоступна этому оружию.');
        const existing=operation==='save-ht-liquid'&&htLiquidRecipe(selected),parameters=this.ui.htLiquidDrafts?.[this.ui.ammoKey]??{note:'',savingThrow:'',description:''};
        const type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:selected.ammoId,name:parameters.note?'Жидкость — '+parameters.note:'Жидкость',
          recipe:{version:1,variantId:'ht_squirt_liquid',customId:existing?selected.recipe.customId:crypto.randomUUID(),parameters}};
        type.key=ammoTypeKey(type);
        const state=await this.service.inventoryTransaction(this.weaponId,existing?'edit-recipe':'save-recipe',{type,...(existing?{ammoKey:selected.key}:{})});
        this.ui.ammoKey=type.key;await this.onUpdate?.(state);
      }catch(error){this.ui.message=error.message;ui.notifications.error(error.message);}
      finally{this.busy=false;await this.refresh({capture:false});}return;
    }
    if(['save-ut-payload','create-ut-batch','save-biochemical-batch'].includes(operation)) {
      if(this.busy)return;
      this.busy=true;
      try {
        const api=globalThis.OleGURPSQOL,option=displayedAmmoTypes(this.actor,this.weapon,api,this.ui.language).find(t=>t.key===this.ui.ammoKey);
        const modeId=this.weapon.standaloneModeId??api.weaponCatalogBindings?.analyzeMode(this.actor,this.weapon.attackRef?.path)?.binding?.modeId;
        const stock=this.weapon.ammunitionInventory.stocks.find(s=>s.key===option?.key);
        const parameters={...(this.ui.utPayloadDraft??option?.recipe?.parameters),...(operation==='save-biochemical-batch'?{chemicalId:this.element.querySelector('[name="ut-chemicalId"]')?.value}:{}),batchId:operation==='create-ut-batch'?crypto.randomUUID():stock?.type.recipe.parameters.batchId??crypto.randomUUID()};
        const prepared=api.automaticAmmunitionProfiles.prepare({modeId,base:option,variantId:option?.recipe?.variantId,parameters});
        if(prepared.state!=='complete')throw Error(prepared.reasons?.[0]??'UTPayloadRequired');
        const type=structuredClone(prepared.type);
        if(stock&&operation==='save-ut-payload')await this.service.inventoryTransaction(this.weaponId,'edit-recipe',{type,ammoKey:stock.key});
        else if(!this.weapon.ammunitionInventory.stocks.some(s=>s.key===type.key))await this.service.inventoryTransaction(this.weaponId,'save-recipe',{type});
        this._utPayloadDrafts?.delete(option.key);this._utPayloadDrafts?.delete(type.key);
        this.ui.ammoKey=type.key;this.ui.utPayloadDraft=null;this.ui.message='';
        await this.onUpdate?.(await this.service.loadState());
      }catch(error){this.ui.message=ammoWindowText(error.message,this.ui.language);ui.notifications.error(this.ui.message);}
      finally{this.busy=false;await this.refresh({capture:false});}
      return;
    }
    if (operation === 'save-load-ballistics') {
      if (this.busy) return;
      this.busy=true;
      try {
        const option=displayedAmmoTypes(this.actor,this.weapon,undefined,this.ui.language).find(t=>t.key===this.ui.ammoKey);
        const modeId=this.weapon.standaloneModeId??globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor,this.weapon.attackRef?.path)?.binding?.modeId;
        const state=await this.service.saveLoadBallistics(this.weaponId,modeId,option,this.ui.ballisticsDraft);
        this.ui.ballisticsOpen=false;
        this.ui.message='Характеристики сохранены.';await this.onUpdate?.(state);
      } catch(error) {this.ui.message=ammoWindowText(error.message,this.ui.language);ui.notifications.error(this.ui.message);}
      finally {this.busy=false;await this.refresh({capture:false});}
      return;
    }
    if (operation === "register-handload") {
      if (this.busy || this.actor.isOwner !== true && !game.user?.isGM) return;
      this.busy = true;
      try {
        const api = globalThis.OleGURPSQOL;
        const option = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
        const standalone = this.weapon.standaloneWeaponId ? readStandaloneAttack(this.actor, this.weapon.standaloneWeaponId, this.weapon.standaloneModeId) : null;
        const binding = standalone ? standaloneCatalogBinding(standalone, api.catalogs) : api.weaponCatalogBindings.analyzeMode(this.actor, this.weapon.attackRef?.path);
        if (binding?.status !== "confirmed") throw Error(f4Text("BatchBlocked"));
        const modeId = binding.binding.modeId, variant = api.catalogs.getVariant("ht", "ht_match_handloaded");
        const base = api.ammunitionCompatibility.checkCompatibility(modeId, option?.ammoId, {book:"ht",kind:"ammo-item"});
        if (base?.status !== "compatible") throw Error(f4Text("BatchBlocked"));
        const review = api.ammunitionCompatibility.checkCompatibility(modeId, "ht_match_handloaded", {book:"ht",kind:"cartridge-upgrade",ammoItemId:option.ammoId});
        const input = Object.fromEntries(["batch","source","armoury","iqGuns"].map(k=>[k,this.element.querySelector(`[name="handload-${k}"]`)?.value??""]));
        input.confirmed = this.element.querySelector('[name="handload-confirmed"]')?.checked === true;
        const batchTL=this.element.querySelector('[name="handload-tl"]')?.value.trim();
        input.availabilityTL=batchTL?Number(batchTL):null;
        const type = createRegisteredHandload({actor:this.actor,weapon:this.weapon,type:option,modeId,facts:review.eligibility?.facts,option:variant,input});
        const existing=this.weapon.ammunitionInventory.stocks.find(s=>s.key===option?.key&&s.type.recipe?.autoProfile?.handloadDefinition);
        await this.service.inventoryTransaction(this.weaponId,existing?'edit-recipe':'save-recipe',{type,...(existing?{ammoKey:existing.key}:{})});
        this.ui.ammoKey = type.key;this.ui.message = f4Text("SavedBatch");
        await this.onUpdate?.(await this.service.loadState());
      } catch (error) { this.ui.message = f4Text("BatchBlocked"); ui.notifications.error(this.ui.message); }
      finally { this.busy = false;await this.refresh({capture:false}); }
      return;
    }
    if (["save-custom-recipe", "save-ammo-decision"].includes(operation)) {
      if (this.busy || this.actor.isOwner !== true && !game.user?.isGM) return;
      this.busy = true;
      let type;
      try {
        const option = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
        type = option;
        const previousStock=this.weapon.ammunitionInventory.stocks.find(s=>s.key===option?.key);
        if (operation === "save-custom-recipe") {
          if (option?.book !== "ht" || option.kind !== "ammo-item") throw Error("ApprovalScopeRequired");
          const base = globalThis.OleGURPSQOL.catalogs.getAmmoItem("ht", option.ammoId), draft = this.ui.recipe;
          type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: option.ammoId,
            name: base.name + " " + variantAbbreviation(draft.variantId) + (draft.label ? " · " + draft.label : ""),
            recipe: { version: 1, variantId: draft.variantId, customId: previousStock&&!previousStock.type.recipe.autoProfile?previousStock.type.recipe.customId:crypto.randomUUID(),
              label: draft.label, parameters: {...structuredClone(draft.parameters),source:{kind:'user',note:draft.parameters?.source?.note||'Пользовательская расчётная модель'}} } };
          type.key = ammoTypeKey(type);
        }
        const numericDecision = name => { const value = this.element.querySelector(`[name="plusP-${name}"]`)?.value.trim();
          return value ? Number(value) : null; };
        let multishotDecision=null;
        if (isMultishotVariant(type?.recipe?.variantId)) {
          const val=name=>this.element.querySelector(`[name="p3-${name}"]`)?.value;
          const num=name=>val(name)?.trim() ? Number(val(name)) : undefined;
          const raw=option.reviewRaw ?? {}, id=type.recipe.variantId;
          multishotDecision={ designConfirmed:this.element.querySelector('[name="p3-design"]')?.checked===true,
            platform:val("platform"),source:val("source"),caliberMm:num("caliber"),availabilityTL:num("tl"),
            ...(num("count")!=null?{count:num("count")}:{}),...(num("diameter")!=null?{elementMm:num("diameter")}:{}),
            ...(val("size")?{shotSize:val("size")}:{}),...(val("type")?{elementType:val("type")}:{}),
            ...(val("baseline")?{baselineKind:val("baseline"),slugRcl:num("rcl")}:{}),
            ...(num("burst")!=null?{burstDistance:num("burst")}:{}),
            ...(this.element.querySelector('[name="p3-b409"]')?.checked?{b409Applicable:true}:{}),
            ...(this.element.querySelector('[name="p3-native"]')?.checked?{nativeVariant:id,nativeDamage:raw.damage,nativeRange:raw.range,nativeRoF:raw.rof,nativeRcl:raw.rcl}:{}) };
          type=bindMultishotDefinition(type,multishotDecision);
        }
        let duDecision=null;
        if(isDUVariant(type.recipe?.variantId)) {
          duDecision={designConfirmed:this.element.querySelector('[name="du-design"]')?.checked===true,
            platform:this.element.querySelector('[name="du-platform"]')?.value,source:this.element.querySelector('[name="du-source"]')?.value,
            caliberMm:Number(this.element.querySelector('[name="du-caliber"]')?.value),availabilityTL:Number(this.element.querySelector('[name="du-tl"]')?.value)};
          type=bindDUDecision(type,duDecision);
        }
        if(operation!=='save-custom-recipe')await setAmmunitionApproval({ actor: this.actor, weapon: this.weapon, type, active: true,
          ...(multishotDecision?{multishotDecision}:{}),
          ...(duDecision?{duDecision}:{}),
          ...(type.recipe?.variantId === "ht_plus_p" ? { plusPDecision: { malfModifier: numericDecision("malf"),
            pressureSuitable:this.element.querySelector('[name="plusP-pressure"]')?.checked===true,
            rof: numericDecision("rof"), loadingCheckPassed: this.element.querySelector('[name="plusP-loading"]')?.checked === true } } : {}) });
        if(previousStock&&(operation==='save-custom-recipe'&&!previousStock.type.recipe.autoProfile||multishotDecision||duDecision))
          await this.service.inventoryTransaction(this.weaponId,'edit-recipe',{type,ammoKey:previousStock.key});
        else if((operation==='save-custom-recipe'||multishotDecision||duDecision)&&!this.weapon.ammunitionInventory.stocks.some(s=>s.key===type.key))
          await this.service.inventoryTransaction(this.weaponId,'save-recipe',{type});
        this.ui.ammoKey = type.key; this.ui.message = "";
        await this.onUpdate?.(await this.service.loadState());
      } catch (error) {
        this.ui.message = (isDUVariant(type?.recipe?.variantId) && error.message.startsWith("DU") || error.message.startsWith("Multishot")) ? automaticAmmoText(error.message, this.ui.language) : explosiveText(error.message, {}, this.ui.language);
        ui.notifications.error(this.ui.message);
      } finally { this.busy = false; await this.refresh({ capture: false }); }
      return;
    }
    if(operation==='splat-salvo'){
      await this._operate('splat-salvo',{amount:Number(this.element.querySelector('[name=splatSalvo]')?.value),readyConfirmed:this.element.querySelector('[name=splatReady]')?.checked===true,expectedSalvo:this.weapon.splatSalvo??30});return;
    }
    const entry = this.weapon?.ammunitionInventory?.magazines.find(item => item.id === this.ui.magazineId);
    await this._operate(operation === "unload-all" ? "unload" : operation, {
      magazineId: this.ui.magazineId, ammoKey: this.ui.ammoKey,
      amount: operation === "add-magazines" ? this.ui.newCount ?? 1 :
        operation.endsWith("stock") ? this.ui.stockQuantity ?? 1 : operation === "unload-all" ? entry?.rounds : this.ui.magazineQuantity,
      capacity: this.ui.newCapacity ?? this.ui.capacityLimit ?? 30 });
  }
  async _operate(operation, args) {
    if (this.busy || this._closed) return;
    this.busy = true;
    this.element?.setAttribute?.('aria-busy','true');
    const busyButtons=[...this.element?.querySelectorAll?.('[data-inventory-action]')??[]];
    const disabled=busyButtons.map(b=>b.disabled);busyButtons.forEach(b=>b.disabled=true);
    const status=this.element?.querySelector('[data-inventory-status]');
    if(status)status.textContent=ammoWindowText(operation==='load'?'Loading':operation==='unload'?'Unloading':'Saving',this.ui.language);
    try {
      const state = await this.service.inventoryTransaction(this.weaponId, operation, args,
        { allowedTypes: weapon => availableAmmoTypes(this.actor, weapon, undefined, this.ui.language) });
      if (operation === "add-magazines") this.ui.magazineId = state.weapons.find(entry => entry.id === this.weaponId).ammunitionInventory.magazines.at(-args.amount).id;
      this.ui.message = "";
      await this.onUpdate?.(state);
    } catch (error) { this.ui.message = ammoWindowText(error.message, this.ui.language); ui.notifications.error(this.ui.message); }
    finally { this.busy = false; this._pendingUpdate = false; this.element?.removeAttribute?.('aria-busy');
      busyButtons.forEach((b,i)=>{if(b.isConnected)b.disabled=disabled[i];});
      this.ui.magazineQuantity = undefined; await this.refresh({ capture: false }); }
  }
  async close(options = {}) {
    this._closed = true;
    this._displayedTypes = null;
    if (this._hook !== null) { Hooks.off("updateActor", this._hook); this._hook = null; }
    if (this._approvalHook != null) { Hooks.off("updateSetting", this._approvalHook); this._approvalHook = null; }
    this.element?.removeEventListener("change", this._change);
    this.element?.removeEventListener("click", this._click);
    this.element?.removeEventListener("input", this._input);
    windows.delete(`${this.actor.id}:${this.weaponId}`);
    return super.close(options);
  }
}

export async function openAmmoManagement({ actor, weaponId, onUpdate, language = "ru" }) {
  const key = `${actor.id}:${weaponId}`;
  const existing = windows.get(key);
  if (existing?.rendered) { existing.bringToFront(); return existing; }
  if (actor.isOwner === false && !globalThis.game?.user?.isGM) throw new Error(t("Permission"));
  const service = new AmmoService(actor);
  const state = await service.inventoryTransaction(weaponId, "initialize");
  await onUpdate?.(state);
  const app = new AmmoManagementApp({ actor, weaponId, onUpdate, language });
  windows.set(key, app);
  try { await app.render({ force: true }); app.setPosition({width:app.options.position.width}); return app; }
  catch (error) { await app.close(); throw error; }
}
