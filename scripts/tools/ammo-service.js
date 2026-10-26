import {copyAmmoResources,writeAmmoResources,persistShotSnapshot,findPendingShot,reserveShotId,cancelShotId} from './shot-history-storage.js';
import {ltBowProfile,ltBowUnits,ltBowCapacity,readLTBowConfiguration} from '../lt-bow-source.js';
import {ltBowDamage,ltBowRecipeAssessment} from './lt-bow.js';
import {ltPersonalProfile,ltPersonalConfiguration} from '../lt-personal-source.js';
import {ltPersonalDamage,ltPersonalRecipeAssessment} from './lt-personal.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import {runLTFlameCheck} from './lt-flame-check.js';
import {applyLTEarlyOperation,initializeLTEarlyCarrier,ltEarlyAmmunition,ltEarlyReadiness,ltEarlyShotPlan,ltEarlyTypeAssessment,ltEarlyDamage,consumeLTEarlyShot} from './lt-early-firearms.js';
import {normalizeDamageDiceAdds} from './damage-dice-adds.js';
import {duckFootContextError} from './lt-duck-foot.js';
import {HT_TEAR_SPRAY_MODE,htTearSprayType,htTearSprayDamage,biochemicalDelivery} from './biochemical-integration.js';
import {CHEMICAL_SUBSTANCES,chemicalAllowed} from './biochemical-catalog.js';
import {readStandaloneAttack} from './standalone-attack-service.js';
import {fluidProfile} from '../ut-fluid-source.js';
import {fluidTypeAllowed,fluidDamage} from './ut-fluid.js';
import {gyrocShotshellExcluded,GYROC_SHOTSHELL_REASON} from './gyroc-policy.js';
import {physicalRangedProfile,physicalRangedType,physicalFamilyMatches,missileSourceTL,gravDamage} from '../ut-physical-ranged-source.js';
import {utFixedFeed,fixedFeedAvailable,fixedFeedPlan,plbRecipeAllowed} from './ut-physical-feeds.js';
import {plasmaGunProfile,plasmaCartridge,plasmaGunDamage} from '../ut-plasma-gun-source.js';
import { exoticBeamProfile, exoticBeamWeapon, exoticBeamConfiguration, exoticBeamReason } from '../ut-exotic-beam-source.js';
import {nextElevenProfile,nextElevenDamage,displacerProfile} from '../ut-next-eleven-source.js';
import {robotAmmunitionAllowed} from './ut-robot-ammunition.js';
import { uawGroup, uawFeed, activeUAWCarrier, uawExecutionOwner, uawWeaponView, uawPowerOwner } from './ut-uaw.js';
import { assertMagazineAddition, magazinePolicy } from './magazine-policy.js';
import { validateProximityShot } from './ut-he-proximity.js';
import { HT_PROJECT_WEAPON_POLICIES } from '../ht-source-corrections.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { beamProfile } from '../ut-beam-source.js';
import { htLaserProfile } from '../ht-laser-source.js';
import { utDazzlerProfile } from '../ut-dazzler-source.js';
import { microwaveProfile } from '../ut-microwave-source.js';
import { sonicNeuralProfile, sonicNeuralWeapon, sonicNeuralConfiguration, sonicNeuralReason, neuralDesign } from '../ut-sonic-neural-source.js';
import { ppbProfile, ppbWeapon, ppbConfiguration, validPPBConfiguration } from '../ut-plasma-particle-source.js';
import { electrolaserProfile, electrolaserWeapon, validElectrolaserConfiguration } from '../ut-electrolaser-source.js';
import {validateLaserModifications,laserConfiguration,laserAvailableModes,laserMode} from '../ut-laser-modifications.js';
import { resourceOnlyWeapon } from './weapon-resources.js';
import {sonicShuriken} from '../ut-sonic-shuriken-source.js';
import {sonicShurikenDamage,sonicPayloadValid} from './ut-sonic-shuriken.js';
import { gaussSpeed, GAUSS_SPEEDS } from './ut-gauss.js';
import { weaponPowerCost } from './weapon-power.js';
import { weaponPowerProfile, newWeaponBattery, batteryExpectation, sameBattery, batteryText,
  readWeaponBattery, weaponPowerReason, weaponPowerEvidence, validateWeaponExecution } from './weapon-power.js';
import { applyExecutionRequest } from './ut-etc.js';
import { adaptStormFeeds, stormFeed, stormMagazineOptions, isStorm } from './ut-storm-feeds.js';
import { lpProfile, lpAdmission, lpFireMode, LP_FIRE_MODES, LP_PROFILES, lpText, newLPFuel, readLPFuel, adaptLPFeed, lpFeedReason } from './ut-liquid-propellant.js';
import { weaponResourceProfile, weaponResourceReason, weaponResourceEvidence, consumeWeaponResource,
  readWeaponResource, sameWeaponResource, validateWeaponResources } from './weapon-resources.js';
import { normalizeAttackOverrides,getAttackOverride } from "./weapon-attack-overrides.js";
import { resolveRangedGoverningSkill, bindingForGoverningSkill,
  getRangedGoverningAttackKey } from "./ranged-governing-skill-service.js";
import { migrateAmmoInventory, projectAmmoInventory, validateInventory, installedMagazine,
  applyInventoryOperation, whole, inventoryTotal, initializeInstalledMagazine, ammoTypeKey as ammoTypeKeyForLoad } from "./ammo-inventory.js";
import { actorResourceWrites as inventoryWrites, withActorResourceWrite } from "./actor-resource-writes.js";
import { immutableCopy, createShotSnapshot } from "./attack-profile-resolver.js";
import { StandaloneWeaponService, standaloneAmmoCarriers } from "./standalone-weapon-service.js";
import { lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { readAmmunitionApproval } from "./ammunition-approval-service.js";
import { validateResourceShot } from "./ammunition-resource-contract.js";
import { validateLTPhysicalAmmunition, validateLTWeaponAmmunition } from './ammunition-resource-contract.js';
import { ballisticsKey, validateLoadBallistics } from "./ammunition-ballistics.js";
import { alternateLoadNeedsBallistics } from "../ht-published-loads.js";
import { UT_CONVENTIONAL_READY_MODES as UT_CONVENTIONAL_MODES, UT_CONVENTIONAL_DEFERRED, utConventionalReadiness } from "./ut-conventional-ammunition.js";
import { UT_SPECIAL_MODES, isUTSpecialVariant, utSpecialReadiness } from './ut-special-ammunition.js';
import { isUTExtendedVariant } from './ut-extended-ammunition.js';
import { FIRST_STAGE_VARIANTS } from './ammunition-recipes.js';
import { htPreGaussProfile, htLiquidRecipe, validHTLiquidRecipe } from '../ht-pre-gauss-profiles.js';
import { htSupplyProfiles, readHTSupply, htSupplyEvidence, consumeHTSupplies } from './weapon-resources.js';
import { campaignAmmunitionAdmission, readCampaignTL, requiredAmmunitionTL } from './ammunition-tech-level.js';

const FLAG_SCOPE = "world";
const FLAG_KEY = "gurpsAmmoManager";
function validateGaussType(weapon,type,api=globalThis.OleGURPSQOL) {
  const p=gaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId);if(!p)return;
  if(type?.source!=='catalog'||type.book!=='ut'||type.kind!=='ammo-family'||type.ammoId!==p.familyId||
    api?.ammunitionCompatibility?.checkCompatibility(p.modeId,type.ammoId,{book:'ut',kind:'ammo-family'}).status!=='compatible')throw Error('TypeUnavailable');
  if(type.recipe&&api?.automaticAmmunitionProfiles?.prepare({modeId:p.modeId,base:type,variantId:type.recipe.variantId,savedType:type}).state!=='complete')
    throw Error('TypeUnavailable');
}
function validatePhysicalType(weapon,type,api=globalThis.OleGURPSQOL){
  if(type?.robot&&!robotAmmunitionAllowed(weapon?.standaloneModeId??weapon?.catalogModeId,type))throw Error('Неподтверждённая пара robot / launcher / warhead.');
  if((weapon?.standaloneModeId??weapon?.catalogModeId)===HT_TEAR_SPRAY_MODE&&!htTearSprayType(type))throw Error('TypeUnavailable');
  if(type?.recipe?.parameters?.chemicalId&&!chemicalAllowed(CHEMICAL_SUBSTANCES[type.recipe.parameters.chemicalId],biochemicalDelivery(type)))throw Error('TypeUnavailable');
  if(gyrocShotshellExcluded(type))throw Error(GYROC_SHOTSHELL_REASON);
  const fluidId=weapon?.standaloneModeId??weapon?.catalogModeId;
  if(fluidProfile(fluidId)&&!fluidTypeAllowed(fluidId,type))throw Error('TypeUnavailable');
  const modeId=weapon?.standaloneModeId??weapon?.catalogModeId,p=physicalRangedProfile(modeId);if(!['gyroc','missile','plb'].includes(p?.group))return;
  if(type?.source!=='catalog'||type.book!=='ut'||type.kind!=='ammo-family'||!physicalFamilyMatches(modeId,type.ammoId)||
    type.ammoId==='15mm_micromissile'&&!['ut_homing','ut_sefop'].includes(type.recipe?.variantId))throw Error('TypeUnavailable');
  if(p.group==='missile'&&type.projectileTL!==missileSourceTL(modeId))throw Error('TypeUnavailable');
  if(p.group==='plb'&&!plbRecipeAllowed(modeId,type))throw Error('Гранатная боевая часть отложена; используйте совместимый кинетический заряд.');
  if(type.recipe&&api?.automaticAmmunitionProfiles?.prepare({modeId,base:type,variantId:type.recipe.variantId,savedType:type}).state!=='complete')throw Error('TypeUnavailable');
}
const STATE_VERSION = 10;
const shotExecutions = new WeakMap();
function magazineCountOwner(state,weapon){
  if(!weapon.standaloneWeaponId)return weapon;
  const own=state.weapons.filter(w=>w.standaloneWeaponId===weapon.standaloneWeaponId&&
    (!uawFeed(weapon.standaloneModeId)||w.standaloneModeId===weapon.standaloneModeId));
  return {...weapon,ammunitionInventory:{magazines:own.flatMap(w=>w.ammunitionInventory?.magazines??w.magazines??[])}};
}

// Read-only: in particular, do not migrate, repair or infer a cartridge from ammoType.
export function readAttackAmmunition(weapon) {
  if (!weapon) return null;
  if(resourceOnlyWeapon(weapon))return null;
  if (weapon.ammunitionReview) throw new Error("Review");
  if(ltEarlyProfile(weapon)&&weapon.ammunitionInventory){if(!validateInventory(weapon.ammunitionInventory,weapon.id))throw Error('Review');return immutableCopy(ltEarlyAmmunition(weapon));}
  const inventory = weapon.ammunitionInventory;
  if (inventory) {
    if (!validateInventory(inventory, weapon.id)) throw new Error("Review");
    const magazine = installedMagazine(weapon);
    return immutableCopy({ kind: "physical-magazine", magazineId: magazine?.id ?? null,
      available: fixedFeedAvailable(weapon)??magazine?.rounds??0, total: inventoryTotal(inventory), ammoKey: magazine?.ammoKey ?? null,
      type: inventory.stocks.find(stock => stock.key === magazine?.ammoKey)?.type ?? null });
  }
  if (weapon.ammoUnconfigured && !weapon.magazines?.length) return null;
  const index = weapon.loadedIndex;
  if (!Number.isInteger(index) || !whole(weapon.magazines?.[index]) || !whole(weapon.totalAmmo)) throw new Error("Review");
  return immutableCopy({ kind: "legacy", magazineId: null, legacyIndex: index,
    available: weapon.magazines[index], total: weapon.totalAmmo, ammoKey: null,
    type: { source: "legacy", name: weapon.ammoType ?? null } });
}

const clone = value => foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
const randomId = () => foundry?.utils?.randomID?.(16) ?? crypto.randomUUID();
const parseNumber = (value, fallback = 0) => {
  const text = String(value ?? "").trim().replace(",", ".");
  if (text === "") return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
};
const clampInteger = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Math.min(maximum, Math.max(minimum, Math.trunc(parseNumber(value, minimum))));

export class AmmoService {
  constructor(actor) {
    this.actor = actor;
  }

  sumMagazines(weapon) {
    return Array.isArray(weapon.magazines) ? weapon.magazines.reduce((sum, rounds) => sum + (whole(rounds) ? rounds : 0), 0) : 0;
  }

  looseAmmo(weapon) {
    return Math.max(0, weapon.totalAmmo - this.sumMagazines(weapon));
  }

  defaultChatSettings() {
    return {
      mode: "all",
      events: { fire: true, spend: false, reload: false, topUp: false, unload: false, stock: false },
      fireFields: {
        ammoType: true,
        shots: true,
        hits: true,
        loadedMagazine: true,
        totalAmmo: true
      }
    };
  }

  normalizeChatSettings(raw) {
    const defaults = this.defaultChatSettings();
    const settings = raw && typeof raw === "object" ? clone(raw) : {};
    settings.mode = ["all", "self"].includes(settings.mode) ? settings.mode : defaults.mode;
    settings.events = settings.events && typeof settings.events === "object" ? settings.events : {};
    settings.fireFields =
      settings.fireFields && typeof settings.fireFields === "object" ? settings.fireFields : {};
    for (const key of Object.keys(defaults.events)) {
      if (typeof settings.events[key] !== "boolean") settings.events[key] = defaults.events[key];
    }
    for (const key of Object.keys(defaults.fireFields)) {
      if (typeof settings.fireFields[key] !== "boolean") {
        settings.fireFields[key] = defaults.fireFields[key];
      }
    }
    return settings;
  }

  defaultState() {
    return { version: STATE_VERSION, chatSettings: this.defaultChatSettings(),
      attackOverrides: {}, governingSkills: {}, weapons: [] };
  }

  normalizeWeaponShape(weapon) {
    weapon.id ||= randomId();
    if (weapon.ammunitionReview) return weapon;
    if (weapon.ammunitionInventory) {
      if (!projectAmmoInventory(weapon)) weapon.ammunitionReview = { reason: "INVENTORY_INVALID" };
      return weapon;
    }
    weapon.weaponBond = weapon.weaponBond === true;
    weapon.name = String(weapon.name ?? "Оружие");
    weapon.attackRef ||= {};
    if (weapon.ammoUnconfigured === true && Array.isArray(weapon.magazines) && weapon.magazines.length === 0) {
      // A configuration-only weapon has no invented magazine or ammunition. Old records use the existing path below.
      weapon.ammoType = String(weapon.ammoType ?? "").trim();
      weapon.capacity = 0;
      weapon.loadedIndex = -1;
      weapon.totalAmmo = clampInteger(weapon.totalAmmo, 0);
      return weapon;
    }
    weapon.ammoType =
      String(weapon.ammoType ?? weapon.ammoRef?.name ?? "Патроны").trim() || "Патроны";
    weapon.capacity = clampInteger(weapon.capacity, 1, 100000);
    weapon.magazines = Array.isArray(weapon.magazines)
      ? weapon.magazines.map(value => clampInteger(value, 0, weapon.capacity))
      : [0];
    if (weapon.magazines.length === 0) weapon.magazines.push(0);
    weapon.loadedIndex = clampInteger(weapon.loadedIndex, 0, weapon.magazines.length - 1);
    const allocated = this.sumMagazines(weapon);
    const storedTotal = parseNumber(weapon.totalAmmo, Number.NaN);
    weapon.totalAmmo = Number.isFinite(storedTotal) ? clampInteger(storedTotal, 0) : allocated;
    const governingSpecialty = String(weapon.governingSpecialty ?? "").trim();
    if (governingSpecialty) weapon.governingSpecialty = governingSpecialty;
    else delete weapon.governingSpecialty;
    delete weapon.ammoRef;
    return weapon;
  }

  async loadState({ queued = false, includeHistory = true } = {}) {
    if (!queued) return withActorResourceWrite(this.actor, () => this.loadState({ queued: true, includeHistory }));
    const saved = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
    const state = saved && typeof saved === "object" ? (includeHistory?clone(saved):copyAmmoResources(saved,clone)) : this.defaultState();
    state.version = STATE_VERSION;
    state.chatSettings = this.normalizeChatSettings(state.chatSettings);
    state.attackOverrides = normalizeAttackOverrides(state.attackOverrides);
    state.governingSkills = state.governingSkills && typeof state.governingSkills === "object" &&
      !Array.isArray(state.governingSkills) ? state.governingSkills : {};
    delete state.chatReports;
    state.weapons = Array.isArray(state.weapons) ? state.weapons : [];
    let carrierChanged = false;
    for (const record of new StandaloneWeaponService(this.actor).list().filter(r=>r.type==="ranged"||r.modes.some(m=>m.modeId===HT_TEAR_SPRAY_MODE))) {
      const current = state.weapons.filter(w => w.standaloneWeaponId === record.id);
      const carriers = standaloneAmmoCarriers(record, current);
      for (const carrier of carriers) {
        const old = state.weapons.find(w => w.id === carrier.id);
        if(old&&sonicShuriken(carrier)&&old.sonicChemical!==carrier.sonicChemical)carrierChanged=true;
        if (old) Object.assign(old, carrier); else { state.weapons.push(carrier); carrierChanged = true; }
      }
    }
    let selectionChanged = false;
    state.weapons.forEach(weapon => {
      adaptStormFeeds(weapon);
      selectionChanged = initializeInstalledMagazine(weapon) || selectionChanged;
      // Inspect complete legacy records before normalization can clamp or repair away evidence.
      if (!weapon.ammunitionInventory && Object.hasOwn(weapon, "totalAmmo")) {
        const probe = clone(weapon);
        const result = migrateAmmoInventory(probe);
        if (!result.valid) weapon.ammunitionReview = probe.ammunitionReview;
      }
      this.normalizeWeaponShape(weapon);
    });
    let migrated = false;
    for (const [key, binding] of Object.entries(state.governingSkills)) {
      if (binding && typeof binding === "object" && !binding.key && !binding.name) {
        delete state.governingSkills[key];
      }
    }
    for (const weapon of state.weapons) {
      if (weapon.standaloneWeaponId) continue;
      const key = getRangedGoverningAttackKey(weapon.attackRef);
      if (!key) continue;
      const existing = state.governingSkills[key];
      if (existing) {
        const current = resolveRangedGoverningSkill({ actor: this.actor, binding: existing });
        if (current && (existing.key !== current.key || existing.name !== current.name)) {
          state.governingSkills[key] = bindingForGoverningSkill(current);
          migrated = true;
        }
        continue;
      }
      const skill = resolveRangedGoverningSkill({ actor: this.actor,
        legacySpecialty: weapon.governingSpecialty, allowAutomatic: !weapon.governingSpecialty });
      if (!skill) continue;
      state.governingSkills[key] = bindingForGoverningSkill(skill);
      migrated = true;
    }
    if ((migrated || selectionChanged || carrierChanged) && (this.actor.isOwner !== false || globalThis.game?.user?.isGM))
      await writeAmmoResources(this.actor,state,{copy:clone});
    return state;
  }

  async saveState(state, { preserveSprayingSessions = true, inventoryWrite = false, queued = false, receipt = null } = {}) {
    if (!inventoryWrite && !queued) return withActorResourceWrite(this.actor, () =>
      this.saveState(state, { preserveSprayingSessions, inventoryWrite, queued: true, receipt }));
    const persisted = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
    const definitions = new StandaloneWeaponService(this.actor).list();
    const removed = (state.weapons ?? []).filter(w => w.standaloneWeaponId && !definitions.some(d => d.id === w.standaloneWeaponId));
    // A closed/deleted definition cannot be resurrected by an old configuration window.
    state.weapons = (state.weapons ?? []).filter(w => !w.standaloneWeaponId || definitions.some(d => d.id === w.standaloneWeaponId));
    for (const field of ["attackOverrides", "governingSkills"]) for (const [key, binding] of Object.entries(state[field] ?? {})) {
      if (removed.some(w => key.startsWith(`uuid:olegurps:${w.standaloneWeaponId}:`)) ||
          binding?.kind === "standalone" && !definitions.some(d => d.id === binding.weaponId)) delete state[field][key];
    }
    if (!inventoryWrite && persisted?.ammunitionBallistics) state.ammunitionBallistics = clone(persisted.ammunitionBallistics);
    if(!inventoryWrite&&persisted?.uawActiveFeeds)state.uawActiveFeeds=clone(persisted.uawActiveFeeds);
    if(!inventoryWrite){
      const requests=new Map();
      for(const weapon of [...state.weapons])if(uawGroup(weapon)&&weapon.executionRequest){
        const group=uawGroup(weapon),request=weapon.executionRequest;
        if(request.variant==='lp'&&request.modeId!=='WtM51JNSpOUIy3Eo1')throw Error(lpText('Shotgun'));
        if(!state.weapons.some(w=>uawGroup(w)===group&&uawFeed(w.standaloneModeId)?.id==='main')){
          const definition=definitions.find(d=>d.id===group);
          if(definition)for(const carrier of standaloneAmmoCarriers(definition,state.weapons.filter(w=>uawGroup(w)===group)))
            if(!state.weapons.some(w=>w.id===carrier.id))state.weapons.push(carrier);
        }
        const owner=uawExecutionOwner(state,weapon);
        if(uawFeed(owner?.standaloneModeId)?.id!=='main')throw Error('UTETCConfigurationInvalid');
        const shared={...request,modeId:owner.standaloneModeId};
        if(requests.has(group)&&JSON.stringify(requests.get(group).request)!==JSON.stringify(shared))throw Error('UTETCConfigurationInvalid');
        requests.set(group,{owner,request:shared});delete weapon.executionRequest;
      }
      for(const {owner,request}of requests.values())owner.executionRequest=request;
    }
    // Configuration and session writers may hold an older snapshot. Resource writes use their own queue.
    for (const weapon of state.weapons ?? []) {
      const current = persisted?.weapons?.find(entry => entry.id === weapon.id);
      const priorExecution=current?.executionVariant;
      if(!inventoryWrite&&current)for(const key of ['sonicShurikenBattery','sonicThrownId','sonicPayload','sonicOperationId','sonicChemical','displacerBattery','sensorBattery','exoticBeamBattery','psionicSettings','psionicMode','kineticStun','sonicNeuralBattery','neuralSettings','neuralMode','sonicEnvironment','sonicPressure','sonicUnderwater','sonicPhysicalContact','plasmaParticleBattery','omniBlaster','blasterMode','blasterEnvironment','blasterHotshot']){
        if(Object.hasOwn(current,key))weapon[key]=clone(current[key]);else delete weapon[key];
      }
      if(!inventoryWrite&&weapon.omniBlasterRequest!==undefined){
        if(this.actor.isOwner===false&&!globalThis.game?.user?.isGM)throw Error('Permission');
        if(ppbWeapon(weapon)?.family!=='blaster'||typeof weapon.omniBlasterRequest!=='boolean')throw Error('Некорректная установка Omni-Blaster.');
        weapon.omniBlaster=weapon.omniBlasterRequest;if(!weapon.omniBlaster)weapon.blasterMode='normal';
      }
      delete weapon.omniBlasterRequest;
      if(!inventoryWrite&&weapon.sonicNeuralHardwareRequest!==undefined){
        if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
        const p=sonicNeuralWeapon(weapon),request=weapon.sonicNeuralHardwareRequest;
        if(!p||!request||p.family==='mindripper'||Object.keys(request).some(k=>!['neuralSettings','sonicUnderwater'].includes(k))||
          p.family==='neural'&&Object.hasOwn(request,'sonicUnderwater')||p.family!=='neural'&&Object.hasOwn(request,'neuralSettings')||
          p.family==='nauseator'&&Object.hasOwn(request,'sonicUnderwater'))throw Error('Некорректная конструкция Sonic/Neural.');
        const next={...weapon,...clone(request)};
        if(p.family==='neural'){
          const design=neuralDesign(next),tl=readCampaignTL(this.actor);
          const newlyInstalled=design.settings.some(s=>!current?.neuralSettings?.includes(s));
          if(!design.settings.length||newlyInstalled&&tl!==null&&tl!==undefined&&design.tl>tl)throw Error('Выберите настройки Neural, доступные при ТУ кампании.');
          if(!design.settings.includes(next.neuralMode))next.neuralMode=design.settings[0];
        }else if(typeof next.sonicUnderwater!=='boolean')throw Error('Некорректная конструкция Sonic.');
        Object.assign(weapon,request,...(p.family==='neural'?[{neuralMode:next.neuralMode}]:[]));
      }
      delete weapon.sonicNeuralHardwareRequest;
      if(!inventoryWrite&&weapon.exoticBeamHardwareRequest!==undefined){
        if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
        const request=weapon.exoticBeamHardwareRequest;
        if(exoticBeamWeapon(weapon)?.family!=='psionic'||!request||Object.keys(request).length!==1||!Array.isArray(request.psionicSettings))throw Error('Некорректная конструкция Psionic.');
        const mode=request.psionicSettings.includes(weapon.psionicMode)?weapon.psionicMode:request.psionicSettings[0];
        exoticBeamConfiguration({...weapon,...request,psionicMode:mode});
        weapon.psionicSettings=clone(request.psionicSettings);weapon.psionicMode=mode;
      }
      delete weapon.exoticBeamHardwareRequest;
      if (!inventoryWrite) {
        if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw Error('Permission');
        const request=weapon.executionRequest;
        // Stale unrelated configuration saves cannot switch ETC off or restore charge.
        for (const key of ['executionVariant','etcConfigured','etcBattery','paintBattery','lpConfigured','lpFuel','lpFireMode','gaussBattery','gaussSpeed','beamBattery','beamChemical','beamCrystal','htLaserBattery','dazzlerBattery','electrolaserBattery','electrolaserMode','electrolaserEnvironment','electrolaserVisibilityDR','laserModifications','laserMode','laserEnvironment']) {
          if(current){if(Object.hasOwn(current,key))weapon[key]=clone(current[key]);else delete weapon[key];}
        }
        if(['etc','lp'].includes(current?.executionVariant)&&!request&&current.catalogModeId)weapon.catalogModeId=current.catalogModeId;
        if(!current&&['etc','lp'].includes(weapon.executionVariant)&&!request)throw Error('UTETCConfigurationInvalid');
        if (request) applyExecutionRequest(weapon,current,request,globalThis.OleGURPSQOL?.catalogs,readCampaignTL(this.actor));
        if(weapon.gaussSpeedRequest!==undefined) {
          if(!gaussProfile(weapon.standaloneModeId??weapon.catalogModeId)||!Object.hasOwn(GAUSS_SPEEDS,weapon.gaussSpeedRequest))throw Error('Некорректная скорость EM.');
          weapon.gaussSpeed=weapon.gaussSpeedRequest;
        }
        if(weapon.laserModificationRequest!==undefined){
          weapon.laserModifications=validateLaserModifications(weapon.standaloneModeId??weapon.catalogModeId,weapon.laserModificationRequest);
          if(!laserAvailableModes(weapon).includes(laserMode(weapon)))weapon.laserMode=laserAvailableModes(weapon)[0];
          laserConfiguration(weapon);
        }
      }
      delete weapon.executionRequest;
      delete weapon.gaussSpeedRequest;
      delete weapon.laserModificationRequest;
      if (!inventoryWrite && current?.ammunitionInventory) weapon.ammunitionInventory = clone(current.ammunitionInventory);
      adaptLPFeed(weapon,{executionVariant:priorExecution});
      adaptStormFeeds(weapon);
      initializeInstalledMagazine(weapon);
      if (weapon.ammunitionInventory) projectAmmoInventory(weapon);
      const priorOwner=current?magazineCountOwner(persisted,current):null;
      const priorIds=new Set(priorOwner?.ammunitionInventory?.magazines?.map(m=>m.id)??[]);
      const added=weapon.ammunitionInventory?.magazines?.some(m=>!priorIds.has(m.id))||
        !weapon.ammunitionInventory&&(weapon.magazines?.length??0)>(current?.magazines?.length??0);
      const owner=magazineCountOwner(state,weapon);
      if(added&&(owner.ammunitionInventory?.magazines?.length??owner.magazines?.length??0)>magazinePolicy(weapon).limit)
        throw Error(magazinePolicy(weapon).fixed?'FixedFeedLimit':'MagazineLimit');
    }
    if (preserveSprayingSessions) {
      const current = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
      const sessions = current?.sprayingFireSessions;
      if (sessions && Object.keys(sessions).length) state.sprayingFireSessions = clone(sessions);
      else delete state.sprayingFireSessions;
    }
    for (const [key, session] of Object.entries(state.sprayingFireSessions ?? {}))
      if (removed.some(w => w.id === session.weaponKey)) delete state.sprayingFireSessions[key];
    await writeAmmoResources(this.actor,state,{receipt,copy:clone});
  }

  // Serialize deletion with magazine/stock operations so a pending inventory write
  // cannot add rounds between the resource check and removal of the carrier.
  async removeStandaloneWeapon(weaponId) {
      const state = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
      const service = new StandaloneWeaponService(this.actor);
      const weapon = state.weapons.find(w => w.id === weaponId);
      const recordId = weapon?.standaloneWeaponId ?? service.list("ranged").find(w =>
        w.resourceLinks.ammoWeaponId === weaponId)?.id;
      if (!recordId && !weapon) return state;
      if (!recordId) throw new Error("WeaponMissing");
      await service.remove(recordId);
      return copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
  }

  async consumeLoadedRounds(state, weapon, amount, { sessionKey = null, expectedResource = null } = {}) {
    if (!whole(amount, 1)) return false;
    const persisted = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY)?.weapons?.find(entry => entry.id === weapon.id);
    // A Fire Control window can predate the inventory window's first migration.
    if (!weapon.ammunitionInventory && persisted?.ammunitionInventory) {
      Object.assign(weapon, clone(persisted));
      projectAmmoInventory(weapon);
    }
    if (weapon.ammunitionReview) return false;
    if (weapon.ammunitionInventory) {
      const magazine = installedMagazine(weapon);
      if (!magazine || amount > magazine.rounds) return false;
      let result;
      try { result = await this.inventoryTransaction(weapon.id, "consume", { magazineId: magazine.id, amount, sessionKey, expectedResource }); }
      catch (error) {
        if (["InsufficientRounds", "MagazineNotInstalled", "MagazineMissing", "WeaponMissing", "Review"].includes(error.message)) return false;
        throw error;
      }
      const updated = result.weapons.find(entry => entry.id === weapon.id);
      Object.assign(weapon, updated);
      Object.assign(state, result);
      return amount;
    }
    const previous = inventoryWrites.get(this.actor) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw new Error("Permission");
      const current = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY),clone);
      const actualWeapon = current?.weapons?.find(entry => entry.id === weapon.id);
      if (!actualWeapon) return false;
      const actual = readAttackAmmunition(actualWeapon);
      if (!actual || actual.kind !== "legacy" || actual.legacyIndex !== (expectedResource?.legacyIndex ?? weapon.loadedIndex) ||
          amount > Math.min(actual.available, actual.total)) return false;
      const session = current.sprayingFireSessions?.[sessionKey];
      if (sessionKey && (!session || session.ammoConsumed)) return false;
      const resourceView=uawWeaponView(current,actualWeapon),powerOwner=uawPowerOwner(current,actualWeapon);
      if(session?.ammunitionProfile)validateWeaponResources(resourceView,session.ammunitionProfile,actual);
      if (sessionKey && weaponResourceProfile(resourceView)) {
        const reason = weaponResourceReason(resourceView, amount);
        if (reason) throw Error(reason);
        const resourceProfile=weaponResourceProfile(resourceView);
        session[resourceProfile.receiptKey+'Receipt'] = weaponResourceEvidence(powerOwner, amount,amount,resourceProfile);
        consumeWeaponResource(powerOwner,amount,resourceProfile);
      }
      actualWeapon.magazines[actual.legacyIndex] -= amount;
      actualWeapon.totalAmmo -= amount;
      if (session) session.ammoConsumed = true;
      await this.saveState(current, { inventoryWrite: true, preserveSprayingSessions: !sessionKey });
      Object.assign(weapon, actualWeapon);
      Object.assign(state, current);
      return amount;
    });
    inventoryWrites.set(this.actor, next);
    return next;
  }

  repairWeaponAmmo(weapon) {
    if (weapon.ammunitionInventory || weapon.ammunitionReview) return 0;
    let deficit = Math.max(0, this.sumMagazines(weapon) - weapon.totalAmmo);
    let removed = 0;
    if (deficit <= 0) return removed;
    for (let index = weapon.magazines.length - 1; index >= 0 && deficit > 0; index--) {
      if (index === weapon.loadedIndex) continue;
      const amount = Math.min(deficit, weapon.magazines[index]);
      weapon.magazines[index] -= amount;
      deficit -= amount;
      removed += amount;
    }
    if (deficit > 0) {
      const index = weapon.loadedIndex;
      const amount = Math.min(deficit, weapon.magazines[index]);
      weapon.magazines[index] -= amount;
      removed += amount;
    }
    return removed;
  }

  async repairState(state, showWarning = true) {
    const repaired = [];
    let changed = false;
    for (const weapon of state.weapons) {
      this.normalizeWeaponShape(weapon);
      const removed = this.repairWeaponAmmo(weapon);
      if (removed > 0) {
        changed = true;
        repaired.push(`${weapon.name}: -${removed}`);
      }
    }
    if (changed) {
      await this.saveState(state);
      if (showWarning) {
        ui.notifications.warn(
          "Общий боезапас был меньше суммы патронов в магазинах. " +
          `Магазины скорректированы: ${repaired.join(", ")}.`
        );
      }
    }
    return changed;
  }

  saveLoadBallistics(weaponId, modeId, type, input, api = globalThis.OleGURPSQOL) {
    return withActorResourceWrite(this.actor, async () => {
      if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw Error("Permission");
      const state = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
      const weapon = state.weapons.find(w => w.id === weaponId);
      const actualMode = weapon?.standaloneModeId ?? api?.weaponCatalogBindings?.analyzeMode(this.actor, weapon?.attackRef?.path)?.binding?.modeId;
      const compatibility = api?.ammunitionCompatibility?.checkCompatibility(modeId, type?.ammoId, {book:type?.book, kind:type?.kind});
      if (!weapon || actualMode !== modeId || type?.source !== "catalog" || type.key !== ammoTypeKeyForLoad(type) ||
          !alternateLoadNeedsBallistics(api?.catalogs, modeId, type.ammoId, compatibility)) throw Error("TypeUnavailable");
      const values = validateLoadBallistics(input);
      state.ammunitionBallistics ??= {};
      state.ammunitionBallistics[ballisticsKey(weaponId, modeId, type.key)] = { ...values, weaponId, modeId,
        ammoId:type.ammoId, ammoKey:type.key, source:"owner-entered", approvedByBook:false };
      await this.saveState(state, {inventoryWrite:true});
      return state;
    });
  }

  inventoryTransaction(weaponId, operation, args = {}, options = {}) {
    const previous = inventoryWrites.get(this.actor) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw new Error("Permission");
      const state = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
      const weapon = state.weapons.find(entry => entry.id === weaponId);
      if (!weapon) throw new Error("WeaponMissing");
      const before = JSON.stringify(weapon);
      const earlyMode=weapon.standaloneModeId??globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor,weapon.attackRef?.path)?.binding?.modeId;
      if(ltEarlyProfile(earlyMode)){
        weapon.catalogModeId=earlyMode;
        const proposed=args.type??weapon.ammunitionInventory?.stocks.find(s=>s.key===args.ammoKey)?.type;
        if(['load','lt-early-component'].includes(operation)&&proposed&&!campaignAmmunitionAdmission(proposed,globalThis.OleGURPSQOL?.catalogs,readCampaignTL(this.actor),earlyMode).allowed)throw Error('CampaignTLUnavailable');
        const earlyResult=await applyLTEarlyOperation(weapon,operation,args,{catalogs:globalThis.OleGURPSQOL?.catalogs,actor:this.actor,runCheck:request=>runLTFlameCheck(this.actor,request)});
        if(earlyResult?.cancelled)return state;
        if(earlyResult){
          if(!projectAmmoInventory(weapon))throw Error('Review');
          await writeAmmoResources(this.actor,state,{copy:clone});return state;
        }
      }
      if(operation==='lt-personal-configure'){
        if(!ltPersonalProfile(weapon))throw Error('Это не персональный режим LT-P3.');
        const configuration=ltPersonalConfiguration({...weapon,ltPersonal:args.configuration});
        if(configuration.ropeLengthYards!==null&&(!Number.isFinite(configuration.ropeLengthYards)||configuration.ropeLengthYards<=0))throw Error('Длина верёвки должна быть положительным числом.');
        weapon.ltPersonal=configuration;await writeAmmoResources(this.actor,state,{copy:clone});return state;
      }
      if(operation==='lt-personal-return'){
        if(!ltPersonalProfile(weapon)?.recoverable||typeof args.attackId!=='string'||!args.attackId||args.confirmed!==true)throw Error('Подтвердите возвращение конкретного готового предмета.');
        const entry=weapon.ltObjects?.[args.attackId];if(!entry)return {duplicate:true,state};
        if(args.ammoKey!==entry.ammoKey)throw Error('Партия возвращаемого предмета изменилась.');
        let type=clone(entry.type),key=entry.ammoKey,stock=weapon.ammunitionInventory.stocks.find(s=>s.key===key);
        if(stock&&JSON.stringify(stock.type.recipe??null)!==JSON.stringify(type.recipe??null)){
          type={...type,recipe:{version:1,variantId:'lt_personal_load',customId:'lt-return-'+args.attackId,parameters:clone(type.recipe?.parameters??{})}};
          key=ammoTypeKeyForLoad(type);type.key=key;stock=weapon.ammunitionInventory.stocks.find(s=>s.key===key);
        }
        if(!stock){stock={key,type,rounds:0};weapon.ammunitionInventory.stocks.push(stock);}
        stock.rounds+=1;delete weapon.ltObjects[args.attackId];projectAmmoInventory(weapon);
        await writeAmmoResources(this.actor,state,{copy:clone});return state;
      }
      if(sonicShuriken(weapon)&&operation==='initialize')return state;
      if(resourceOnlyWeapon(weapon))throw Error('Лазер не использует физические патроны и магазины.');
      initializeInstalledMagazine(weapon);
      const modeId = weapon.standaloneModeId ?? globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor, weapon.attackRef?.path)?.binding?.modeId;
      if(modeId)weapon.catalogModeId=modeId;else delete weapon.catalogModeId;
      if(ltBowProfile(modeId))weapon.ltBow=clone(readLTBowConfiguration(this.actor,weapon));
      const htSource=htPreGaussProfile(modeId);
      const sourceFluid=fluidProfile(modeId);
      if(sourceFluid&&operation==='load'){
        const m=weapon.ammunitionInventory.magazines.find(m=>m.id===args.magazineId);
        if(weapon.fluidSpent||!m||m.rounds+args.amount>sourceFluid.capacity)throw Error('CapacityExceeded');
      }
      const sourcePhysical=physicalRangedProfile(modeId);
      if(operation==='load'&&sourcePhysical&&sourcePhysical.group!=='grav'){
        const m=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId),capacity=utFixedFeed(weapon)?.capacity??sourcePhysical.shots;
        if(m&&m.rounds+args.amount>capacity)throw Error('CapacityExceeded');
      }
      if(operation==='splat-salvo'){
        if(modeId!=='WIijXG9uGZ52T0eW2'||!whole(args.amount,1)||args.amount>30||args.readyConfirmed!==true)throw Error('Для изменения залпа Splat выполните Ready и подтвердите его.');
        const old=weapon.splatSalvo??30;if(old!==args.expectedSalvo&&old!==args.amount)throw Error('Размер залпа уже изменён; откройте окно заново.');
        if(old===args.amount)return state;weapon.splatSalvo=args.amount;await this.saveState(state,{inventoryWrite:true});return state;
      }
      if(utFixedFeed(weapon)&&['add-magazines','delete-magazine','eject'].includes(operation))throw Error('FixedFeedLimit');
      if(operation==='install'){const m=weapon.ammunitionInventory.magazines.find(m=>m.id===args.magazineId);if(m?.rounds)validatePhysicalType(weapon,weapon.ammunitionInventory.stocks.find(s=>s.key===m.ammoKey)?.type);}
      const gravSource=physicalRangedProfile(modeId);
      if(operation==='load'&&gravSource?.group==='grav'){
        const m=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId);
        if(m&&m.rounds+args.amount>gravSource.shots)throw Error('CapacityExceeded');
      }
      const plasmaSource=plasmaGunProfile(modeId);
      if(plasmaSource){
        if(operation==='add-magazines'&&args.capacity!==plasmaSource.shots)throw Error('CapacityExceeded');
        const magazine=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId);
        if(operation==='load'&&magazine&&magazine.rounds+args.amount>plasmaSource.shots)throw Error('CapacityExceeded');
      }
      const emSource=gaussProfile(modeId);
      if(operation==='load'&&emSource){const m=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId);if(m&&m.rounds+args.amount>emSource.feedCapacity)throw Error('CapacityExceeded');}
      if(operation==='load'&&htSource){const m=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId);if(m&&m.rounds+args.amount>htSource.capacity)throw Error('CapacityExceeded');}
      const lp=LP_PROFILES[modeId];
      if(isStorm(weapon)){
        adaptStormFeeds(weapon);
        if(operation==='add-magazines'&&!stormMagazineOptions(weapon).some(p=>p.capacity===args.capacity))throw Error('CapacityExceeded');
        const magazine=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId),feed=stormFeed(weapon,magazine);
        if(operation==='load'&&feed&&!(weapon.executionVariant==='lp'&&feed.feed==='primary-belt')&&magazine.rounds+args.amount>feed.loadedCapacity)throw Error('CapacityExceeded');
      }
      if(lp&&(weapon.lpConfigured||weapon.executionVariant==='lp')) {
        const limit=(weapon.executionVariant==='lp'?lp.nominalCapacity:lp.baseNominal)+lp.chamber;
        if(operation==='add-magazines'&&args.capacity!==limit&&!isStorm(weapon))throw Error('CapacityExceeded');
        const magazine=weapon.ammunitionInventory?.magazines.find(m=>m.id===args.magazineId);
        if(operation==='load'&&magazine&&magazine.rounds+args.amount>limit)throw Error('CapacityExceeded');
        if(weapon.executionVariant==='lp'&&['load','install'].includes(operation)) {
          const reason=lpFeedReason(weapon,{magazineId:args.magazineId});if(reason)throw Error(reason);
        }
      }
      if(operation==='add-magazines')assertMagazineAddition(magazineCountOwner(state,weapon),args.amount);
      const barrel = lematBarrel(modeId);
      // Returning rounds and changing empty containers do not admit a new cartridge.
      const needsAdmission = ["add-stock", "load", "save-recipe", "edit-recipe"].includes(operation);
      const catalogs = globalThis.OleGURPSQOL?.catalogs;
      const existingType = weapon.ammunitionInventory?.stocks.find(s => s.key === args.ammoKey)?.type;
      const proposed = args.type ?? existingType ?? (typeof options.allowedTypes === 'function' ? options.allowedTypes(weapon) : options.allowedTypes)?.find(t => t.key === args.ammoKey);
      if(needsAdmission)validateGaussType(weapon,proposed);
      if(needsAdmission)validatePhysicalType(weapon,proposed);
      if (needsAdmission) {
        const ltType = ['load', 'add-stock'].includes(operation) ? existingType ??
          (typeof options.allowedTypes === 'function' ? options.allowedTypes(weapon) : options.allowedTypes)?.find(t => t.key === args.ammoKey) : proposed;
        validateLTPhysicalAmmunition(modeId, ltType,undefined,weapon.ltBow);
        if(ltEarlyProfile(modeId)&&(ltType?.recipe||ltEarlyProfile(modeId).kind==='flame')&&!ltEarlyTypeAssessment({modeId,type:ltType,catalogs,weapon})?.applicationAllowed)
          throw Error('Состав / подгонка подготовленной партии LT не подтверждены.');
        if(ltPersonalProfile(modeId)&&(ltType?.recipe||ltPersonalProfile(modeId).kind.startsWith('crossbow-'))&&!ltPersonalRecipeAssessment({modeId,type:ltType,weapon,catalogs:globalThis.OleGURPSQOL?.catalogs,compatibility:globalThis.OleGURPSQOL?.ammunitionCompatibility})?.applicationAllowed)
          throw Error('Рецепт LT не соответствует конкретному физическому предмету.');
        if(ltBowProfile(modeId)&&ltType?.recipe&&!ltBowRecipeAssessment({modeId,type:ltType,compatibility:globalThis.OleGURPSQOL?.ammunitionCompatibility,configuration:weapon.ltBow})?.applicationAllowed)
          throw Error('Модификация не подтверждена для этого снаряда LT.');
      }
      if (operation === 'install') {
        const magazine = weapon.ammunitionInventory?.magazines.find(m => m.id === args.magazineId);
        if (magazine?.rounds) validateLTPhysicalAmmunition(modeId,
          weapon.ammunitionInventory.stocks.find(s => s.key === magazine.ammoKey)?.type,undefined,weapon.ltBow);
      }
      if(needsAdmission&&physicalRangedProfile(modeId)?.group==='grav'&&!physicalRangedType(modeId,proposed))throw Error('TypeUnavailable');
      if(needsAdmission&&plasmaGunProfile(modeId)&&!plasmaCartridge(modeId,proposed))throw Error('TypeUnavailable');
      const preservesExisting = operation === 'edit-recipe' && existingType &&
        requiredAmmunitionTL(existingType, catalogs) === requiredAmmunitionTL(proposed, catalogs) &&
        existingType.recipe?.parameters?.availabilityTL === proposed?.recipe?.parameters?.availabilityTL;
      if (['add-stock','save-recipe','edit-recipe'].includes(operation) && !preservesExisting &&
          !campaignAmmunitionAdmission(proposed, catalogs, readCampaignTL(this.actor), modeId).allowed)
        throw Error('CampaignTLUnavailable');
      if (needsAdmission && UT_CONVENTIONAL_DEFERRED[modeId]) throw new Error(UT_CONVENTIONAL_DEFERRED[modeId]);
      if(needsAdmission&&utSpecialReadiness(modeId))throw Error(utSpecialReadiness(modeId));
      if(operation==='edit-recipe'&&!ltEarlyTypeAssessment({modeId,type:args.type,catalogs:globalThis.OleGURPSQOL?.catalogs,weapon})?.applicationAllowed&&!ltPersonalRecipeAssessment({modeId,type:args.type,catalogs:globalThis.OleGURPSQOL?.catalogs,compatibility:globalThis.OleGURPSQOL?.ammunitionCompatibility})?.applicationAllowed&&!ltBowRecipeAssessment({modeId,type:args.type,compatibility:globalThis.OleGURPSQOL?.ammunitionCompatibility,configuration:weapon.ltBow})?.applicationAllowed&&!validHTLiquidRecipe(args.type)&&!isUTSpecialVariant(args.type?.recipe?.variantId)&&!isUTExtendedVariant(args.type?.recipe?.variantId)&&!FIRST_STAGE_VARIANTS.includes(args.type?.recipe?.variantId))throw Error('InvalidRecipe');
      if(needsAdmission&&htLiquidRecipe(proposed)&&(!validHTLiquidRecipe(proposed)||htPreGaussProfile(modeId)?.kind!=='squirt'))throw Error('InvalidRecipe');
      if(['save-recipe','edit-recipe'].includes(operation)&&(isUTSpecialVariant(args.type?.recipe?.variantId)||isUTExtendedVariant(args.type?.recipe?.variantId))) {
        const prepared=globalThis.OleGURPSQOL?.automaticAmmunitionProfiles?.prepare({modeId,base:args.type,variantId:args.type.recipe.variantId,savedType:args.type});
        if(prepared?.state!=='complete')throw Error('UTPayloadRequired');
      }
      const allowedTypes = needsAdmission && typeof options.allowedTypes === "function" ? options.allowedTypes(weapon) :
        needsAdmission ? options.allowedTypes : [];
      if (barrel && ["add-stock", "load", "save-recipe"].includes(operation)) {
        const type = args.type ?? allowedTypes?.find(t => t.key === args.ammoKey);
        if (type?.source !== "catalog" || type.book !== "ht" || type.ammoId !== barrel.ammoId) throw new Error("TypeUnavailable");
        if (type.recipe?.variantId === "ht_plus_p") {
          const approval = readAmmunitionApproval({ actor:this.actor, actorId: this.actor.id, weaponId, modeId, type });
          if (!approval?.plusPDecision?.loadingCheckPassed) throw new Error("TypeUnavailable");
        }
      }
      if (barrel && operation === "add-magazines" && args.capacity > barrel.capacity) throw new Error("CapacityExceeded");
      if (barrel && operation === "load") {
        const magazine = weapon.ammunitionInventory?.magazines.find(m => m.id === args.magazineId);
        if (magazine && magazine.rounds + args.amount > barrel.capacity) throw new Error("CapacityExceeded");
      }
      const result = migrateAmmoInventory(weapon);
      if (operation !== "initialize") {
        if (!result.valid) throw new Error("Review");
        if (operation === "consume" && args.expectedResource) {
          const actual = readAttackAmmunition(weapon);
          if (actual.magazineId !== args.expectedResource.magazineId || actual.ammoKey !== args.expectedResource.ammoKey)
            throw new Error("MagazineNotInstalled");
        }
        if (operation === "consume" && args.sessionKey) {
          const session = state.sprayingFireSessions?.[args.sessionKey];
          if (!session || session.ammoConsumed) throw new Error("InsufficientRounds");
          const resourceView=uawWeaponView(state,weapon),powerOwner=uawPowerOwner(state,weapon);
          if(session.ammunitionProfile)validateWeaponResources(resourceView,session.ammunitionProfile,readAttackAmmunition(weapon));
          if (weaponResourceProfile(resourceView)) {
            const reason = weaponResourceReason(resourceView, args.amount);
            if (reason) throw Error(reason);
            const resourceProfile=weaponResourceProfile(resourceView);
            session[resourceProfile.receiptKey+'Receipt'] = weaponResourceEvidence(powerOwner, args.amount,args.amount,resourceProfile);
            consumeWeaponResource(powerOwner,args.amount,resourceProfile);
          }
          session.ammoConsumed = true;
        }
        if(operation==='consume'&&htSupplyProfiles(weapon).length)consumeHTSupplies(weapon,htSupplyEvidence(weapon,args.amount));
        if(operation==='load'&&ltBowProfile(modeId)){
          const magazine=weapon.ammunitionInventory.magazines.find(m=>m.id===args.magazineId);
          if(magazine){magazine.capacity=ltBowCapacity(modeId,weapon.ltBow);weapon.capacity=magazine.capacity;}
        }
        if(operation==='load'&&ltPersonalProfile(modeId)){
          const magazine=weapon.ammunitionInventory.magazines.find(m=>m.id===args.magazineId);if(magazine){magazine.capacity=1;weapon.capacity=1;}
        }
        applyInventoryOperation(weapon, operation, args, { ...options,
          allowedTypes });
        const group=uawGroup(weapon);
        if(group&&operation==='install'){
          state.uawActiveFeeds??={};state.uawActiveFeeds[group]=weapon.id;
        }
      }
      if (validateInventory(weapon.ammunitionInventory, weapon.id)) projectAmmoInventory(weapon);
      state.version = STATE_VERSION;
      if (operation === "initialize" && before === JSON.stringify(weapon)) return state;
      await this.saveState(state, { inventoryWrite: true, preserveSprayingSessions: !args.sessionKey });
      return state;
    });
    inventoryWrites.set(this.actor, next);
    return next;
  }

  transferMagazine(fromWeaponId,toWeaponId,magazineId,{allowedTypes=[]}={}) {
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner===false&&!globalThis.game?.user?.isGM)throw Error('Permission');
      if(fromWeaponId===toWeaponId)throw Error('MagazineTransferUnavailable');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const from=state.weapons.find(w=>w.id===fromWeaponId),to=state.weapons.find(w=>w.id===toWeaponId);
      if(!from||!to)throw Error('WeaponMissing');
      if(!migrateAmmoInventory(from).valid||!migrateAmmoInventory(to).valid)throw Error('Review');
      assertMagazineAddition(magazineCountOwner(state,to),1);
      if(magazinePolicy(from).fixed||magazinePolicy(to).fixed)throw Error('FixedFeedLimit');
      const magazine=from.ammunitionInventory.magazines.find(m=>m.id===magazineId);
      if(!magazine)throw Error('MagazineMissing');
      if(ltEarlyProfile(from)||ltEarlyProfile(to)){
        if(ltEarlyProfile(from)?.kind!=='puckle'||ltEarlyProfile(to)?.kind!=='puckle')throw Error('FixedFeedLimit');
        if(magazine.rounds)throw Error('Перед переносом разрядите цилиндр: его заряды подогнаны к исходному экземпляру Puckle.');
        magazine.ltEarlyPlace=Math.max(-1,...to.ammunitionInventory.magazines.map(m=>m.ltEarlyPlace??-1))+1;
      }
      if(magazinePolicy(to).capacity!==null&&magazine.capacity!==magazinePolicy(to).capacity)throw Error('CapacityExceeded');
      if(uawFeed(from.standaloneModeId)?.familyId!==uawFeed(to.standaloneModeId)?.familyId&&
        (uawFeed(from.standaloneModeId)||uawFeed(to.standaloneModeId)))throw Error('TypeUnavailable');
      if(magazine.rounds){
        const source=from.ammunitionInventory.stocks.find(s=>s.key===magazine.ammoKey);
        validateGaussType(to,source?.type);
        validatePhysicalType(to,source?.type);
        validateLTPhysicalAmmunition(to.standaloneModeId ?? globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor, to.attackRef?.path)?.binding?.modeId, source?.type);
        const grav=physicalRangedProfile(to.standaloneModeId??to.catalogModeId);
        if(grav?.group==='grav'&&!physicalRangedType(grav.modeId,source?.type))throw Error('TypeUnavailable');
        const plasma=plasmaGunProfile(to.standaloneModeId??to.catalogModeId);if(plasma&&!plasmaCartridge(plasma.modeId,source?.type))throw Error('TypeUnavailable');
        const types=typeof allowedTypes==='function'?allowedTypes(to):allowedTypes;
        if(!source||!types.some(t=>t.key===source.key&&!t.unavailable))throw Error('TypeUnavailable');
        if(!to.ammunitionInventory.stocks.some(s=>s.key===source.key))to.ammunitionInventory.stocks.push({...clone(source),rounds:0});
      }
      from.ammunitionInventory.magazines=from.ammunitionInventory.magazines.filter(m=>m.id!==magazineId);
      if(from.ammunitionInventory.installedId===magazineId)from.ammunitionInventory.installedId=null;
      to.ammunitionInventory.magazines.push({...magazine,weaponId:to.id});
      for(const w of [from,to]){
        if(!validateInventory(w.ammunitionInventory,w.id))throw Error('Review');
        initializeInstalledMagazine(w);projectAmmoInventory(w);
      }
      await this.saveState(state,{inventoryWrite:true});return state;
    });
  }

  readAttackAmmunition(weaponId) {
    const weapon = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY)?.weapons?.find(entry => entry.id === weaponId);
    return readAttackAmmunition(weapon);
  }

  spendPaintCharge(weaponId, amount) {
    return this.spendWeaponCharge(weaponId,amount);
  }

  setLaserConfiguration(weaponId,changes){
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      if(!changes||!Object.keys(changes).length||Object.keys(changes).some(k=>!['laserMode','laserEnvironment'].includes(k)))throw Error('Некорректные параметры лазера.');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone),weapon=state.weapons.find(w=>w.id===weaponId);
      if(!weapon)throw Error('Оружие не найдено.');
      const next={...weapon,...structuredClone(changes)};laserConfiguration(next);
      if(Object.entries(changes).every(([k,v])=>JSON.stringify(weapon[k])===JSON.stringify(v)))return structuredClone(weapon);
      Object.assign(weapon,structuredClone(changes));await writeAmmoResources(this.actor,state,{copy:clone});return structuredClone(weapon);
    });
  }
  setElectrolaserConfiguration(weaponId, changes) {
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      if(!changes||!Object.keys(changes).length||Object.keys(changes).some(k=>!['electrolaserMode','electrolaserEnvironment','electrolaserVisibilityDR'].includes(k)))throw Error('Некорректные условия электролазера.');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone),weapon=state.weapons.find(w=>w.id===weaponId);
      if(!electrolaserWeapon(weapon)||!validElectrolaserConfiguration({...weapon,...changes})||
        Object.values(changes).some(v=>v===undefined||v===null))throw Error('Некорректные условия электролазера.');
      if(Object.entries(changes).every(([k,v])=>weapon[k]===v))return state;
      Object.assign(weapon,changes);await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }
  setExoticBeamConfiguration(weaponId,changes){
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone),weapon=state.weapons.find(w=>w.id===weaponId),p=exoticBeamWeapon(weapon);
      const key=p?.family==='psionic'?'psionicMode':p?.family==='force'?'kineticStun':null;
      if(!key||!changes||Object.keys(changes).length!==1||!Object.hasOwn(changes,key)||exoticBeamReason({...weapon,...changes}))throw Error('Некорректная настройка энергетического оружия.');
      if(weapon[key]===changes[key])return state;
      Object.assign(weapon,changes);await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }
  setSonicNeuralConfiguration(weaponId,changes){
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone),weapon=state.weapons.find(w=>w.id===weaponId),p=sonicNeuralWeapon(weapon);
      const keys=p?.family==='neural'?['neuralMode']:['sonicEnvironment','sonicPressure','sonicPhysicalContact'];
      if(!p||p.family==='mindripper'||!changes||!Object.keys(changes).length||Object.keys(changes).some(k=>!keys.includes(k)))throw Error('Некорректные условия Sonic/Neural.');
      const next={...weapon,...changes},c=sonicNeuralConfiguration(next);
      // Unsupported environments can be selected and corrected in Fire Control; attacks remain blocked.
      if(p.family==='neural'?!c.settings.includes(c.mode):!['air','vacuum','water'].includes(c.environment)||typeof c.pressure!=='number'||!Number.isFinite(c.pressure)||c.pressure<0||c.pressure>1000||typeof c.physicalContact!=='boolean')
        throw Error('Некорректные условия Sonic/Neural.');
      if(Object.entries(changes).every(([k,v])=>weapon[k]===v))return state;
      Object.assign(weapon,changes);await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }
  setBlasterConfiguration(weaponId,changes){
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone),weapon=state.weapons.find(w=>w.id===weaponId);
      if(ppbWeapon(weapon)?.family!=='blaster'||!changes||!Object.keys(changes).length||
        Object.keys(changes).some(k=>!['blasterMode','blasterEnvironment','blasterHotshot'].includes(k))||!validPPBConfiguration({...weapon,...changes}))
        throw Error('Недопустимые условия Blaster; Stun требует установленного Omni-Blaster.');
      Object.assign(weapon,changes);await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  setLPFireMode(weaponId, fireMode) {
    return withActorResourceWrite(this.actor, async () => {
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons.find(w=>w.id===weaponId);
      if(!lpProfile(weapon)||!Object.hasOwn(LP_FIRE_MODES,fireMode))throw Error(lpText('Invalid'));
      if(lpFireMode(weapon)===fireMode)return state;
      weapon.lpFireMode=fireMode;
      await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  setGaussSpeed(weaponId, speed) {
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons.find(w=>w.id===weaponId);
      if(!gaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId)||!Object.hasOwn(GAUSS_SPEEDS,speed))throw Error('Некорректная скорость EM.');
      if(gaussSpeed(weapon)===speed)return state;
      weapon.gaussSpeed=speed;await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  spendLPFuel(weaponId, amount) {
    return withActorResourceWrite(this.actor, async () => {
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons.find(w=>w.id===weaponId),fuel=readLPFuel(weapon);
      const units=typeof amount==='number'?amount*4:NaN;
      if(!fuel||!Number.isSafeInteger(units)||units<=0||units>fuel.remainingUnits)throw Error(lpText('Invalid'));
      fuel.remainingUnits-=units;
      await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  replaceLPFuel(weaponId, options={}) {
    return withActorResourceWrite(this.actor, async () => {
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons.find(w=>w.id===weaponId),profile=lpProfile(weapon);
      const {requestId,expectedFuel}=options;
      if(!profile||typeof requestId!=='string'||!requestId.trim()||requestId.length>100||
        !Object.hasOwn(options,'expectedFuel'))throw Error(lpText('Invalid'));
      if(weapon.lpFuel?.replacementId===requestId)return state;
      if(!sameWeaponResource(weapon.lpFuel,expectedFuel))throw Error(lpText('Stale'));
      weapon.lpFuel={...newLPFuel(profile),replacementId:requestId};weapon.lpConfigured=true;
      await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }
  spendWeaponCharge(weaponId, amount) {
    return withActorResourceWrite(this.actor, async () => {
      if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw Error('Permission');
      const state = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
      const weapon = uawPowerOwner(state,state.weapons.find(w => w.id === weaponId));
      const profile=weaponPowerProfile(weapon);
      if (!profile) throw Error('WeaponMissing');
      const spendView=ppbWeapon(weapon)?{...weapon,blasterHotshot:false}:weapon;
      if(profile.sensorTime){
        const b=readWeaponBattery(weapon,profile);
        if(!b||!whole(amount,1)||amount>b.charge)throw Error('Недостаточно минут сенсорного питания.');
        b.charge-=amount;await this.saveState(state,{inventoryWrite:true});return state;
      }
      const reason = weaponPowerReason(spendView, amount);
      if (reason) throw Error(reason);
      consumeWeaponResource(spendView,amount,{...profile,kind:'power'});
      await this.saveState(state, {inventoryWrite:true});
      return state;
    });
  }

  // Explicit replacement only. Share the attack/inventory queue and reread live
  // state; do not normalize inventory or rewrite any other weapon field.
  replaceBattery(weaponId, options = {}) {
    return withActorResourceWrite(this.actor, async () => {
      if (this.actor.isOwner !== true && !globalThis.game?.user?.isGM) throw Error('Permission');
      const state = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? this.defaultState(),clone);
      const weapon = uawPowerOwner(state,state.weapons?.find(w=>w.id===weaponId)), profile = weaponPowerProfile(weapon);
      if (!profile) throw Error(batteryText('NoProfile'));
      if(profile.oneShot)throw Error('Использованный кристалл не перезаряжается. Нужен новый экземпляр.');
      const {requestId, nonRechargeable = false, expectedBattery} = options;
      if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 100 ||
          typeof nonRechargeable !== 'boolean' || !Object.hasOwn(options,'expectedBattery'))
        throw Error(batteryText('Invalid'));
      if (weapon[profile.stateKey]?.replacementId === requestId) {
        if (profile.standard==='HT13'?nonRechargeable:weapon[profile.stateKey].nonRechargeable !== nonRechargeable) throw Error(batteryText('Invalid'));
        return state;
      }
      if (!sameBattery(batteryExpectation(weapon,profile), expectedBattery)) throw Error(batteryText('Stale'));
      weapon[profile.stateKey] = {...newWeaponBattery(profile,nonRechargeable),replacementId:requestId};
      await writeAmmoResources(this.actor,state,{copy:clone});
      return state;
    });
  }

  sonicResourceOperation(weaponId,{operation,requestId,expectedThrownId,expectedPayload,chemicalId,note=''}={}) {
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons.find(w=>w.id===weaponId);
      if(!sonicShuriken(weapon)||!['return','payload'].includes(operation)||typeof requestId!=='string'||!requestId||requestId.length>100||expectedThrownId===undefined||expectedPayload===undefined)throw Error('Некорректная операция Sonic Shuriken.');
      if(weapon.sonicOperationId===requestId)return state;
      if(!sameBattery(weapon.sonicThrownId??null,expectedThrownId)||!sameBattery(weapon.sonicPayload??null,expectedPayload))throw Error('Состояние сюрикена изменилось. Откройте окно заново.');
      if(operation==='return'){
        if(!weapon.sonicThrownId)throw Error('Этот сюрикен уже в наличии.');
        weapon.sonicThrownId=null;
      }else{
        const payload={chemicalId,note,doses:2,loadId:requestId},chemical=CHEMICAL_SUBSTANCES[chemicalId];
        const campaignTL=readCampaignTL(this.actor);
        if(weapon.sonicThrownId||weapon.sonicPayload||weapon.sonicChemical!=='enabled'||!sonicPayloadValid(payload)||
          chemical&&Number.isInteger(campaignTL)&&chemical.tl>campaignTL)throw Error('Нужны свободный сюрикен с химической конструкцией и две допустимые дозы.');
        weapon.sonicPayload=payload;
      }
      weapon.sonicOperationId=requestId;await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  replaceHTSupply(weaponId,{resourceId,requestId,expected,connected=true}={}) {
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor.isOwner!==true)throw Error('Permission');
      const state=copyAmmoResources(this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState(),clone);
      const weapon=state.weapons?.find(w=>w.id===weaponId),p=htSupplyProfiles(weapon).find(p=>p.id===resourceId);
      if(!p||expected===undefined||typeof requestId!=='string'||!requestId||requestId.length>100||typeof connected!=='boolean')throw Error('Некорректный ресурс Nail Gun.');
      const prior=weapon.htSupplies?.[p.id]??null;
      if(prior?.replacementId===requestId)return state;
      if(!sameBattery(prior,expected))throw Error('Ресурс уже изменён. Откройте окно заново.');
      weapon.htSupplies??={};weapon.htSupplies[p.id]={capacity:p.capacity,remaining:p.manual&&!connected?0:p.capacity,replacementId:requestId};
      await writeAmmoResources(this.actor,state,{copy:clone});return state;
    });
  }

  // Same queue as install/load/unload. Resolve, native execution and resource commit use one magazine.
  // A caller-supplied ID identifies an execution, not a request to roll it again.
  executeShot({ weaponId, attackId, prepare, execute, resourceTiming = "after-attack", deferConsumption = false, sessionKey = null }) {
    if (!attackId) return Promise.reject(new Error("AttackIdRequired"));
    let executions = shotExecutions.get(this.actor);
    if (!executions) { executions = new Map(); shotExecutions.set(this.actor, executions); }
    if (executions.has(attackId)) return executions.get(attackId);
    const previous = inventoryWrites.get(this.actor) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (this.actor.isOwner === false && !globalThis.game?.user?.isGM) throw new Error("Permission");
      const persisted=this.actor.getFlag(FLAG_SCOPE,FLAG_KEY)??this.defaultState();
      if(Object.hasOwn(persisted.shotReceipts??{},attackId)){
        if(persisted.shotReceipts[attackId].status==='pending')throw Error('IncompleteShotAccounting');
        return {duplicate:true,receipt:immutableCopy(persisted.shotReceipts[attackId]),state:copyAmmoResources(persisted,clone)};
      }
      if(findPendingShot(this.actor.id,attackId))throw new Error("IncompleteShotAccounting");
      const state=copyAmmoResources(persisted,clone);
      const weapon = state.weapons.find(entry => entry.id === weaponId);
      if (!weapon) throw new Error("WeaponMissing");
      const ammunition = readAttackAmmunition(weapon);
      if(ltBowProfile(weapon))weapon.ltBow=clone(readLTBowConfiguration(this.actor,weapon));
      validateLTWeaponAmmunition(this.actor, weapon);
      if(ltEarlyProfile(weapon)?.kind==='flame'){const reason=ltEarlyReadiness(weapon);if(reason)throw Error(reason);}
      if(ammunition?.type?.recipe?.parameters?.chemicalId&&!chemicalAllowed(CHEMICAL_SUBSTANCES[ammunition.type.recipe.parameters.chemicalId],biochemicalDelivery(ammunition.type)))throw Error('TypeUnavailable');
      const prepared = await prepare({ state, weapon, ammunition });
      if (!prepared) return { rolled: false };
      let { profile } = prepared;
      const { amount } = prepared;
      const uaw=uawGroup(weapon);
      if(uaw&&activeUAWCarrier(state,weapon)?.id!==weapon.id)throw Error('UAWInactiveFeed');
      if(uaw&&(profile.weaponId!==weapon.id||
        (profile.binding?.confirmed?.modeId??profile.mode?.standaloneRef?.modeId)!==weapon.standaloneModeId||
        profile.ammunition?.ammoId!==uawFeed(weapon.standaloneModeId).familyId))throw Error('TypeUnavailable');
      validateProximityShot(profile);
      const utModeId=profile.binding?.confirmed?.modeId ?? profile.mode?.standaloneRef?.modeId;
      if(sonicShuriken(weapon)){
        const actual=readStandaloneAttack(this.actor,weapon.standaloneWeaponId,weapon.standaloneModeId);
        const expected=sonicShurikenDamage(actual?.data??{},weapon);
        if(!sonicShuriken(utModeId)||profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||amount!==1||deferConsumption||ammunition||
          !expected.nativeSafe||!profile.damage?.nativeSafe||!sameBattery(expected.rules,profile.damage.rules)||profile.damage.formula!==expected.formula||
          profile.effective.range!==actual?.data.range||![undefined,'ordinary'].includes(weapon.executionVariant))throw Error('Профиль Sonic Shuriken изменился. Подготовьте бросок заново.');
      }
      if((weapon.standaloneModeId??weapon.catalogModeId)===HT_TEAR_SPRAY_MODE){
        validatePhysicalType(weapon,ammunition?.type);
        const expected=htTearSprayDamage(profile.raw,ammunition?.type);
        if(utModeId!==HT_TEAR_SPRAY_MODE||!profile.damage?.nativeSafe||!profile.damage.rules.htTearSpray||JSON.stringify(expected.rules.chemical)!==JSON.stringify(profile.damage.rules.chemical)||profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||amount!==1||deferConsumption)throw Error('TypeUnavailable');
      }
      const fluid=fluidProfile(weapon.standaloneModeId??weapon.catalogModeId);
      if(fluid){
        const actualAttack=weapon.standaloneWeaponId?readStandaloneAttack(this.actor,weapon.standaloneWeaponId,fluid.modeId):null;
        const expected=fluidDamage(actualAttack?.data??profile.raw,fluid.modeId,weapon,ammunition?.type,profile.context,actualAttack);
        if(utModeId!==fluid.modeId||profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||!whole(amount,1)||amount!==1||deferConsumption||ammunition?.kind!=='physical-magazine'||!expected.nativeSafe||!profile.damage?.nativeSafe||JSON.stringify(expected.rules.fluid)!==JSON.stringify(profile.damage.rules.fluid)||profile.damage.formula!==expected.formula||profile.effective.range!==expected.effectiveChanges.range||profile.damage.rules.attackBonus!==0)throw Error('TypeUnavailable');
      }
      const plasmaSource=plasmaGunProfile(weapon.standaloneModeId??weapon.catalogModeId)??plasmaGunProfile(utModeId);
      if(plasmaSource){
        const expected=plasmaGunDamage(profile.raw,utModeId,weapon,ammunition?.type);
        if(utModeId!==plasmaSource.modeId||profile.weaponId!==weapon.id||!whole(amount,1)||amount>Math.min(plasmaSource.rof,Number(profile.effective.rof))||deferConsumption||
          ammunition?.kind!=='physical-magazine'||!ammunition.magazineId||!expected.nativeSafe||!profile.damage?.nativeSafe||
          profile.damage.formula!==expected.formula||profile.damage.rules?.plasmaGun?.modeId!==plasmaSource.modeId||profile.damage.rules.plasmaGun.hot!==expected.rules.plasmaGun.hot||profile.damage.rules.plasmaGun.cartridgeId!==expected.rules.plasmaGun.cartridgeId)
          throw Error('TypeUnavailable');
      }
      const em=gaussProfile(utModeId);
      const physical=physicalRangedProfile(weapon.standaloneModeId??weapon.catalogModeId);
      if(['gyroc','missile','plb'].includes(physical?.group)){
        validatePhysicalType(weapon,ammunition?.type);
        const limit=Math.min(physical.rof,Number(profile.damage?.rules?.projectiles?.physicalShotsMax??profile.effective.rof));
        if(utModeId!==physical.modeId||profile.weaponId!==weapon.id||!profile.damage?.nativeSafe||profile.damage.rules?.physicalRanged?.modeId!==physical.modeId||
          ![undefined,'ordinary'].includes(weapon.executionVariant)||!whole(amount,1)||!whole(limit,1)||amount>limit||deferConsumption||
          ammunition?.kind!=='physical-magazine'||!ammunition.magazineId)throw Error('TypeUnavailable');
        if(utModeId==='WIijXG9uGZ52T0eW2'&&amount!==(weapon.splatSalvo??30))throw Error('Измените залп Splat через Ready в окне «Патроны».');
      }
      const grav=physicalRangedProfile(weapon.standaloneModeId??weapon.catalogModeId);
      if(grav?.group==='grav'){
        const expected=gravDamage(profile.raw,utModeId,weapon,ammunition?.type);
        if(utModeId!==grav.modeId||profile.weaponId!==weapon.id||!expected?.nativeSafe||!profile.damage?.nativeSafe||
          profile.damage.formula!==expected.formula||profile.damage.rules?.physicalRanged?.modeId!==grav.modeId||
          !whole(amount,1)||amount>Math.min(grav.rof,Number(profile.effective.rof))||deferConsumption||ammunition?.kind!=='physical-magazine'||!ammunition.magazineId)
          throw Error('TypeUnavailable');
      }
      const beam=beamProfile(utModeId);
      if(nextElevenProfile(utModeId)&&utModeId!=='WUTSmartShuriken'){
        const attack=readStandaloneAttack(this.actor,weapon.standaloneWeaponId,utModeId);
        const expected=nextElevenDamage(attack?.data,utModeId,attack?.nextElevenConfiguration);
        if(!expected?.nativeSafe||!profile.damage?.nativeSafe||amount!==1||deferConsumption||ammunition||!resourceOnlyWeapon(weapon)||
          profile.weaponId!==weapon.id||JSON.stringify(profile.damage.rules.nextEleven)!==JSON.stringify(expected.rules.nextEleven)||
          profile.effective.range!==expected.effectiveChanges.range||profile.damage.formula!==null||profile.damage.components.length)
          throw Error('Профиль устройства изменился или атака не подтверждена источником.');
        if(displacerProfile(utModeId)&&(!Number.isFinite(profile.context?.areaPoint?.x)||!Number.isFinite(profile.context?.areaPoint?.y)||
          profile.context.areaPoint.sceneId!==globalThis.canvas?.scene?.id||!Number.isFinite(profile.context.physicalDistance)||profile.context.physicalDistance<0||profile.context.physicalDistance>displacerProfile(utModeId).range))
          throw Error('Выберите точку области Displacer на текущей сцене в пределах дальности.');
      }
      if(ppbProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Number(profile.effective.rof)||
        !profile.damage?.nativeSafe||profile.damage.rules?.plasmaParticle?.modeId!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Нужны штатный энергетический профиль, допустимый RoF и готовый источник.');
      if(electrolaserProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Number(profile.effective.rof)||
        !profile.damage?.nativeSafe||profile.damage.rules?.electrolaser?.modeId!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Электролазеру нужны штатный профиль, питание и допустимый RoF.');
      if(microwaveProfile(utModeId)&&(amount!==1||deferConsumption||Number(profile.effective.rof)!==1||
        !profile.damage?.nativeSafe||profile.damage.rules?.utMicrowave!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Один Microwave-конус требует одного импульса и штатного профиля сопротивления.');
      if(exoticBeamProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Math.min(exoticBeamProfile(utModeId).rof,Number(profile.effective.rof))||
        !profile.damage?.nativeSafe||profile.damage.rules?.exoticBeam?.modeId!==utModeId||!resourceOnlyWeapon(weapon)||ammunition||exoticBeamReason(weapon)))
        throw Error('Некорректная атака энергетического оружия.');
      if(sonicNeuralProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Math.min(sonicNeuralProfile(utModeId).rof,Number(profile.effective.rof))||
        !profile.damage?.nativeSafe||profile.damage.rules?.sonicNeural?.modeId!==utModeId||!resourceOnlyWeapon(weapon)||ammunition||sonicNeuralReason(weapon)))
        throw Error('Для Sonic/Neural нужны подтверждённый профиль, настройка, источник и допустимая очередь.');
      if(utDazzlerProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Number(profile.effective.rof)||
        !profile.damage?.nativeSafe||profile.damage.rules?.utDazzler!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Dazzler требует штатное питание, профиль сопротивления и допустимый RoF.');
      if(htLaserProfile(utModeId)&&(!whole(amount,1)||deferConsumption||amount>Number(profile.effective.rof)||
        !profile.damage?.nativeSafe||profile.damage.rules?.htLaser!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Лазеру HT нужны штатное питание и профиль сопротивления.');
      if(beam&&(!whole(amount,1)||deferConsumption||!profile.damage?.nativeSafe||
        amount>Number(profile.effective.rof)||profile.damage.rules?.beam?.modeId!==utModeId||!resourceOnlyWeapon(weapon)||ammunition))
        throw Error('Для лазера нужны готовый профиль и подтверждённый источник; отложенный расход не разрешён.');
      if(em&&(!profile.damage?.nativeSafe||profile.ammunition?.ammoId!==em.familyId||
        ammunition?.kind!=='physical-magazine'||!ammunition.magazineId))throw Error('EM требует совместимого физического снаряда и готового профиля.');
      if(HT_PROJECT_WEAPON_POLICIES[utModeId]?.physicalCartridgeRequired&&
        (ammunition?.kind!=='physical-magazine'||!ammunition.magazineId))throw Error('MagazineNotInstalled');
      const htProfile=htPreGaussProfile(utModeId);
      if(htProfile&&(!profile.damage?.nativeSafe||profile.damage.rules?.htSourceProfile!==utModeId))throw Error('Для этого режима нужен подтверждённый физический заряд HT.');
      if(htProfile&&(amount!==1||deferConsumption))throw Error('Для этого режима используется одна обычная атака; специальные очереди не применяются.');
      const ltBow=ltBowProfile(weapon.standaloneModeId??weapon.catalogModeId);
      const early=ltEarlyProfile(weapon),earlyPlan=early?ltEarlyShotPlan(weapon):null;
      if(early){
        if(early.kind==='duck'){
          const distance=profile.context?.physicalDistance;if(!Number.isFinite(distance)||distance<0)throw Error('Укажите точную дистанцию Duck’s Foot.');
          if(profile.context?.physicalShots!==undefined&&profile.context.physicalShots!==1||profile.context?.effectiveRoF!==undefined&&profile.context.effectiveRoF!==(distance>2?1:4))throw Error('Duck’s Foot: неверное число независимых выстрелов / попаданий.');
          if(distance>2){const error=duckFootContextError(profile.context);if(error)throw Error(error);}
        }
        const reason=ltEarlyReadiness(weapon);if(reason)throw Error(reason);
        const nativeEarly=weapon.attackRef?.path?.split('.').reduce((v,k)=>v?.[k],this.actor);
        const actual=weapon.standaloneWeaponId?readStandaloneAttack(this.actor,weapon.standaloneWeaponId,early.modeId):{...nativeEarly,data:nativeEarly,path:weapon.attackRef?.path};
        if(early.kind==='flame')actual.ltEarlyOverrides={...actual.ltEarlyOverrides,...Object.fromEntries(Object.entries(getAttackOverride(state,actual)??{}).filter(([key])=>['bulk'].includes(key)))};
        const expected=ltEarlyDamage({modeId:early.modeId,actor:this.actor,raw:actual?.data??profile.raw,attack:actual??{},weapon,type:ammunition?.type,catalogs:globalThis.OleGURPSQOL?.catalogs,context:profile.context});
        if(early.kind==='flame'&&(profile.context?.physicalShots!==undefined&&profile.context.physicalShots!==1||profile.context?.effectiveRoF!==undefined&&profile.context.effectiveRoF!==1))throw Error('Одна атака огнемётной системы использует одну секунду Jet или один заряд Blowpipe.');
        if(amount!==1||deferConsumption||!expected.nativeSafe||!profile.damage?.nativeSafe||profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||utModeId!==early.modeId||
          profile.damage.formula!==(profile.diceAdds?.enabled&&profile.diceAdds.eligible?normalizeDamageDiceAdds(expected.formula):expected.formula)||JSON.stringify(profile.damage.rules.ltEarly)!==JSON.stringify(expected.rules.ltEarly)||!earlyPlan?.length||earlyPlan.some(s=>!s.charge))throw Error('Подготовленный профиль / состав заряда LT изменился. Откройте атаку заново.');
        profile=immutableCopy({...profile,resource:{...profile.resource,ltEarlyCharges:earlyPlan,...(early.kind==='flame'?{ltFlame:{chargeId:earlyPlan[0].charge.id,secondsSpent:earlyPlan[0].secondsSpent,physicalUnitsSpent:earlyPlan[0].spent,before:earlyPlan[0].charge.flame.remaining,after:earlyPlan[0].charge.flame.remaining-1}}:{})}});
      }
      const personal=ltPersonalProfile(weapon);
      if(personal){
        const native=weapon.attackRef?.path?.split('.').reduce((v,k)=>v?.[k],this.actor);
        const actual=weapon.standaloneWeaponId?readStandaloneAttack(this.actor,weapon.standaloneWeaponId,personal.modeId):{...native,data:native};
        const expected=ltPersonalDamage({actor:this.actor,attack:actual??{},raw:actual?.data??profile.raw,modeId:personal.modeId,weapon,type:ammunition?.type,
          catalogs:globalThis.OleGURPSQOL?.catalogs,compatibility:globalThis.OleGURPSQOL?.ammunitionCompatibility,context:profile.context});
        if(amount!==1||deferConsumption||profile.context?.physicalShots!==undefined&&profile.context.physicalShots!==1||profile.context?.effectiveRoF!==undefined&&profile.context.effectiveRoF!==1||ammunition?.kind!=='physical-magazine'||!ammunition.magazineId||!expected.nativeSafe||!profile.damage?.nativeSafe||
          profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||utModeId!==personal.modeId||profile.damage.formula!==expected.formula||
          JSON.stringify(profile.damage.rules.ltPersonal)!==JSON.stringify(expected.rules.ltPersonal)||JSON.stringify(profile.damage.rules.attackResult)!==JSON.stringify(expected.rules.attackResult))
          throw Error('Профиль персональной атаки LT изменился. Подготовьте применение заново.');
      }
      if(ltBow){
        const actual=readStandaloneAttack(this.actor,weapon.standaloneWeaponId,ltBow.modeId);
        const expected=ltBowDamage({raw:actual?.data??profile.raw,modeId:ltBow.modeId,configuration:actual?.ltBowConfiguration??weapon.ltBow,
          actor:this.actor,type:ammunition?.type,catalogs:globalThis.OleGURPSQOL?.catalogs,context:profile.context,sourceStats:actual?.ltBowOverrides});
        if(amount!==1||deferConsumption||ammunition?.kind!=='physical-magazine'||!expected.nativeSafe||!profile.damage?.nativeSafe||
          profile.actorId!==this.actor.id||profile.weaponId!==weapon.id||utModeId!==ltBow.modeId||profile.damage.formula!==expected.formula||
          profile.effective.range!==expected.effectiveChanges.range||profile.damage.rules.attackBonus!==expected.rules.attackBonus||
          JSON.stringify(profile.damage.rules.ltBow)!==JSON.stringify(expected.rules.ltBow))throw Error('Профиль LT изменился. Подготовьте выстрел заново.');
      }
      const unitCost=early?.kind==='duck'?4:ltBow?ltBowUnits(ltBow.modeId,weapon.ltBow):fluid?profile.damage.rules.fluid.doses:htProfile?profile.damage.rules.physicalUnitsPerAttack??1:1;
      if(ammunition?.type?.robot&&(amount!==1||deferConsumption||!profile.damage?.nativeSafe||profile.damage.rules?.robot?.id!==ammunition.type.robot.id||
        profile.actorId!==this.actor.id||profile.damage.rules.robot.selectedTL!==ammunition.type.robot.tl||profile.damage.rules.robot.launcherModeId!==utModeId||
        JSON.stringify(profile.damage.rules.robot.warhead)!==JSON.stringify({ammoId:ammunition.type.ammoId,recipe:ammunition.type.recipe??null})))throw Error('Профиль робота изменился.');
      if(htProfile&&unitCost!==(htProfile.kind==='flame'&&weapon.htJetMode==='continuous'?htProfile.continuousUnits??1:1))throw Error('Режим струи изменился. Подготовьте атаку заново.');
      const physicalAmount=amount*unitCost;
      const feedPlan=fixedFeedPlan(weapon,physicalAmount);
      if(feedPlan)profile=immutableCopy({...profile,resource:{...profile.resource,feedPlan}});
      if(htProfile&&(!ammunition||ammunition.kind!=='physical-magazine'||!ammunition.magazineId))throw Error('MagazineNotInstalled');
      const htSupplies=htSupplyEvidence(weapon,amount);
      if(htProfile||ltBow)profile=immutableCopy({...profile,resource:{...profile.resource,physicalUnits:physicalAmount,...(htProfile?{htSupplies}:{})}});
      const resourceView=uawWeaponView(state,weapon),powerOwner=uawPowerOwner(state,weapon);
      validateWeaponResources(resourceView,profile,ammunition);
      const powerProfile = weaponResourceProfile(resourceView) ?? weaponResourceProfile(resourceView,utModeId);
      if(['etc','lp'].includes(resourceView.executionVariant)&&(!ammunition||ammunition.kind==='physical-magazine'&&!ammunition.magazineId))
        throw Error('MagazineNotInstalled');
      const powerReason = weaponResourceReason(resourceView, amount, weaponResourceProfile(resourceView) ? null : utModeId);
      if (powerReason) throw Error(powerReason);
      const power = powerProfile ? weaponResourceEvidence(powerOwner, amount, deferConsumption ? 0 : amount,powerProfile) : null;
      if(power&&uaw&&resourceView.executionVariant==='etc')power.ownerWeaponId=powerOwner.id;
      if (power) {
        profile = immutableCopy({...profile, resource:{...profile.resource, [powerProfile.receiptKey]:power}});
      }
      if (!profile.damage?.nativeSafe && (UT_CONVENTIONAL_MODES[utModeId] || UT_SPECIAL_MODES[utModeId] ||
          utConventionalReadiness(utModeId,profile.raw))) throw new Error(profile.damage?.reason ?? 'UTVariantUnavailable');
      if (profile.context?.barrel && !ammunition) throw new Error("MagazineNotInstalled");
      if (profile.compatibility.status === "incompatible") throw new Error("IncompatibleAmmunition");
      if (profile.damage?.rules?.manualGuidance?.required &&
          (profile.context?.manualGuidanceConfirmed !== true || amount !== 1))
        throw Error("Подтвердите ручной учёт наведения и полёта; за пуск расходуется одна ракета.");
      if (profile.compatibility.reasons?.some(r => r.code === "HT_IDENTITY_UNVERIFIED"))
        throw new Error("HTIdentityUnverified");
      if (profile.damage?.rules?.manualCyclingRequired && amount > 1) throw new Error("AmmunitionCyclingUnconfirmed");
      if (["ht_apex", "ht_aphex"].includes(ammunition?.type?.recipe?.variantId) &&
          !profile.damage?.nativeSafe) throw new Error("IncompleteExplosiveRecipe");
      if(!profile.damage?.nativeSafe&&['GyrojetIdentityRequired','GuidanceRequired','AlternateLoadBallisticsRequired','GyrojetDistanceRequired'].includes(profile.damage?.reason))
        throw new Error(profile.damage.reason);
      if (ammunition?.type?.recipe && !profile.damage?.nativeSafe) throw new Error("IncompleteAmmunitionProfile");
      if (profile.ammunition?.recipe && !profile.damage?.nativeSafe)
        throw new Error("IncompleteAmmunitionProfile");
      if (ammunition && (!whole(physicalAmount, 1) || physicalAmount > Math.min(ammunition.available, ammunition.total)))
        throw new Error("InsufficientRounds");
      if (ammunition?.kind === "physical-magazine") validateResourceShot(weapon, ammunition.type,
        profile.binding?.confirmed?.modeId ?? profile.mode?.standaloneRef?.modeId);
      const range = profile.damage?.rules?.ballisticRange;
      const distance = profile.context?.shotgun?.physicalDistance ?? profile.context?.physicalDistance ?? profile.context?.environment?.actualDistance;
      if (range && Number.isFinite(distance) && (distance < range.minimum || distance > range.maximum))
        throw new Error("OutsideAmmunitionRange");
      const reserved=await reserveShotId(this.actor,attackId,weaponId);
      const result = await execute({...prepared, profile});
      if (!result?.rolled){if(reserved)await cancelShotId(this.actor,attackId);return { ...result, profile, spent: 0 };}
      // Configuration writers can run while GGA awaits; retain their current settings.
      const current = copyAmmoResources(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY),clone);
      const currentWeapon = current.weapons.find(entry => entry.id === weaponId);
      const latest = readAttackAmmunition(currentWeapon);
      if (JSON.stringify(latest) !== JSON.stringify(ammunition)) throw new Error("AmmunitionChangedDuringAttack");
      const currentPowerOwner=uawPowerOwner(current,currentWeapon);
      if(htProfile&&unitCost!==(htProfile.kind==='flame'&&currentWeapon.htJetMode==='continuous'?htProfile.continuousUnits??1:1))throw Error('Режим струи изменился во время атаки.');
      validateWeaponResources(uawWeaponView(current,currentWeapon),profile,latest);
      if (power && !sameWeaponResource(readWeaponResource(currentPowerOwner,powerProfile),readWeaponResource(powerOwner,powerProfile)))
        throw Error('BatteryChangedDuringAttack');
      if(htSupplies.length)consumeHTSupplies(currentWeapon,htSupplies);
      const spent = ammunition && !deferConsumption ? early?.kind==='flame'?earlyPlan[0].spent:physicalAmount : 0;
      if(fluid?.disposable)currentWeapon.fluidSpent=true;
      if (!deferConsumption && ammunition?.kind === "physical-magazine") {
        if(early){consumeLTEarlyShot(currentWeapon,earlyPlan);}
        else if(feedPlan){
          if(JSON.stringify(fixedFeedPlan(currentWeapon,physicalAmount))!==JSON.stringify(feedPlan))throw Error('AmmunitionChangedDuringAttack');
          for(const entry of feedPlan){currentWeapon.ammunitionInventory.installedId=entry.magazineId;applyInventoryOperation(currentWeapon,'consume',{magazineId:entry.magazineId,amount:entry.spent});}
          currentWeapon.ammunitionInventory.installedId=ammunition.magazineId;
        }else applyInventoryOperation(currentWeapon, "consume", { magazineId: ammunition.magazineId, amount:physicalAmount });
        projectAmmoInventory(currentWeapon);
      } else if (!deferConsumption && ammunition?.kind === "legacy") {
        currentWeapon.magazines[ammunition.legacyIndex] -= amount;
        currentWeapon.totalAmmo -= amount;
      }
      if (power && !deferConsumption) consumeWeaponResource(currentPowerOwner,amount,powerProfile);
      if(sonicShuriken(currentWeapon)){
        currentWeapon.sonicThrownId=attackId;
        currentWeapon.sonicPayload=null;
      }
      if(personal?.recoverable&&spent===1){
        currentWeapon.ltObjects??={};currentWeapon.ltObjects[attackId]={ammoKey:ammunition.ammoKey,type:clone(ammunition.type),messageId:result.message?.id??null};
      }
      const receipt = { attackId, weaponId, magazineId: ammunition?.magazineId ?? null,
        ...(reserved?{status:'committed'}:{}),
        ammoKey: ammunition?.ammoKey ?? null, spent, messageId: result.message?.id ?? null,
        ...(feedPlan?{feedPlan}:{}),
        ...(early?.kind==='flame'?{ltFlame:profile.resource.ltFlame}:{}),
        ...(earlyPlan?{ltEarlyCharges:earlyPlan,componentsDebitedAt:'load',...(early.kind==='artillery'?{physicalProjectilesSpent:earlyPlan.reduce((n,r)=>n+(r.charge?.artillery?.projectiles??1),0),stockUnitsSpent:earlyPlan.reduce((n,r)=>n+(r.charge?.stockUnits??1),0)}:{})}:{}),
        ...(power ? {[powerProfile.receiptKey]:power} : {}),
        ...(htProfile?{htSupplies,physicalUnits:physicalAmount}:{}),
        ...(resourceTiming === "suppression-activation" ? { profile } : {}) };
      if (sessionKey && current.sprayingFireSessions?.[sessionKey]) {
        const session = current.sprayingFireSessions[sessionKey];
        session.ammunitionProfile ??= profile;
        session.attackExecutions ??= [];
        session.attackExecutions.push({ attackId, messageId: result.message?.id ?? null,
          profile, allocatedShots: profile.context.physicalShots ?? 0 });
      }
      await this.saveState(current, { inventoryWrite: true, preserveSprayingSessions: !sessionKey, receipt });
      const snapshot = createShotSnapshot(profile, { attackId, spent, resourceTiming,
        resourceReceiptId: attackId, messageId: result.message?.id ?? null, outcome: result.rollData });
      if (!deferConsumption && result.message?.setFlag) {
        try { await persistShotSnapshot(result.message,snapshot); }
        catch (error) { console.error("OleGURPS QOL | Shot metadata persistence:", error); }
      }
      return { ...result, state: current, weapon: currentWeapon, profile, snapshot, receipt, spent };
    });
    inventoryWrites.set(this.actor, next);
    executions.set(attackId, next);
    // Successful executions are recoverable from saved receipts; retain only in-flight or failed IDs in memory.
    next.then(() => executions.delete(attackId), () => {});
    return next;
  }
}
