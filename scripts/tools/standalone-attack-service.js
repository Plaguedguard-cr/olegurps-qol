import {HT_TEAR_SPRAY_MODE} from './biochemical-integration.js';
import {ltPersonalProfile} from '../lt-personal-source.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import {ltArtillerySkill} from './lt-artillery.js';
import {sonicShuriken,sonicShurikenStats} from '../ut-sonic-shuriken-source.js';
import {nextElevenProfile,displacerProfile,ladarProfile,ladarRange} from '../ut-next-eleven-source.js';
import {fluidProfile} from '../ut-fluid-source.js';
import {plasmaGunProfile} from '../ut-plasma-gun-source.js';
import {fixedFeedAvailable} from './ut-physical-feeds.js';
import {physicalRangedProfile} from '../ut-physical-ranged-source.js';
import { exoticBeamProfile, exoticBeamWeapon, exoticBeamReason } from '../ut-exotic-beam-source.js';
import { standaloneModeStats, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { resolveStandaloneSkill, standaloneSkillDescription } from "./standalone-skill-service.js";
import { parseWeaponBulk, sourceWeaponHandling } from "./weapon-bulk.js";
import {specializedPlatform,configuredPlatform,platformRange} from '../ht-specialized-platforms.js';
import { requiresUTPowerAccounting } from "../ut-source-data.js";
import { beamWeapon, beamProfile } from '../ut-beam-source.js';
import { htLaserProfile, htLaserWeapon } from '../ht-laser-source.js';
import { utDazzlerProfile, utDazzlerWeapon, utDazzlerFormula } from '../ut-dazzler-source.js';
import { electrolaserProfile, electrolaserWeapon, electrolaserUnits } from '../ut-electrolaser-source.js';
import { microwaveProfile, microwaveFormula } from '../ut-microwave-source.js';
import { ppbProfile, ppbWeapon, ppbUnits } from '../ut-plasma-particle-source.js';
import { sonicNeuralProfile, sonicNeuralFormula, sonicNeuralReason, sonicNeuralWeapon, isSonic, neuralDesign } from '../ut-sonic-neural-source.js';
import { readWeaponBattery } from './weapon-power.js';
import {laserAvailableShots} from '../ut-laser-modifications.js';
import { moduleText } from "../localization.js";
import { utConventionalReadiness } from "./ut-conventional-ammunition.js";
import { utSpecialReadiness } from './ut-special-ammunition.js';
import { uawFeed, uawWeaponView } from './ut-uaw.js';
import { stormFeed } from './ut-storm-feeds.js';
import { weaponResourceReason as weaponPowerReason } from './weapon-resources.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';

/** A module-owned attack value, not an Actor attack, Item or GGA lookup path. Read fresh for each calculation. */
export function readStandaloneAttack(actor, weaponId, modeId = null) {
  try { return readStandaloneAttackValue(actor,weaponId,modeId); }
  catch(error) {
    console.error('OleGURPS QOL | Недоступная запись атаки',{actorId:actor?.id,weaponId,modeId,error});
    let record;try{record=new StandaloneWeaponService(actor).get(weaponId);}catch{}
    const uuid='olegurps:'+weaponId+':'+(modeId??'invalid');
    const reason='Запись оружия неполна или повреждена. Проверьте режим и требуемый навык в настройках; остальные атаки доступны.';
    return {uuid,key:'uuid:'+uuid,path:'',name:record?.name??'Оружие',label:record?.name??'Оружие',
      data:{name:record?.name??'Оружие',level:null},level:null,
      standaloneRef:{weaponId,modeId,combatType:record?.type??'ranged',source:record?.source},
      readinessReason:reason,skillDescription:reason,diagnosticCode:'StandaloneRecordInvalid'};
  }
}
function readStandaloneAttackValue(actor, weaponId, modeId = null) {
  const record = new StandaloneWeaponService(actor).get(weaponId);
  const mode = modeId ? record?.modes.find(m => m.modeId === modeId) : record?.modes[0];
  if (!record || !mode) return null;
  const stats = { ...standaloneModeStats(mode.snapshot), ...mode.overrides };
  const weaponHandling = sourceWeaponHandling(mode.snapshot, mode.overrides?.bulkState, mode.overrides?.bulk ?? null);
  if(weaponHandling?.rclNotApplicable)stats.rcl=null;
  if(weaponHandling?.bulkMetadata)stats.bulk=String(weaponHandling.bulkMetadata.numericBulk);
  if(sonicShuriken(mode.modeId))Object.assign(stats,sonicShurikenStats(actor,stats));
  if(mode.modeId==='WUTSmartShuriken'){stats.damage='spec. (robot)';stats.rof='1';stats.rcl='1';}
  const next=nextElevenProfile(mode.modeId),ladar=ladarProfile(mode.modeId),sensor=ladar&&ladarRange(ladar,mode.overrides);
  if(sensor)stats.range=`${sensor.half}/${sensor.maximum}`;
  // UT137's dash shares the complete UAW's Bulk; never substitute another gun's Damage/Rcl.
  if(uawFeed(mode.modeId)?.id==='shotgun'&&(!stats.bulk||stats.bulk==='-'))
    stats.bulk=record.modes.find(m=>uawFeed(m.modeId)?.id==='main')?.overrides?.bulk??
      record.modes.find(m=>uawFeed(m.modeId)?.id==='main')?.snapshot?.stats?.bulk??'-3';
  const configured=configuredPlatform(specializedPlatform(mode.snapshot,record.source.source),mode.overrides);
  if(configured.bulk!==undefined)stats.bulk=configured.bulk;
  const platformRules=configured.platform;
  const ammunitionRange=platformRange(platformRules,stats.range);
  if(platformRules?.manualGuidance){stats.rof='1';stats.range=String(ammunitionRange?.maximum??stats.range);}
  const bulkMetadata = weaponHandling?.bulkMetadata ?? parseWeaponBulk(stats.bulk);
  const ammoState=actor.getFlag('world', 'gurpsAmmoManager');
  const carrier = uawWeaponView(ammoState,ammoState?.weapons?.find(w =>
    w.standaloneWeaponId === record.id && w.standaloneModeId === mode.modeId));
  const skillRecord=sensor?{...record,equipmentSnapshot:{...record.equipmentSnapshot,tech_level:String(sensor.tl)}}:sonicNeuralWeapon(carrier)?.family==='neural'?{...record,equipmentSnapshot:{...record.equipmentSnapshot,tech_level:neuralDesign(carrier).tl+'^'}}:record;
  const skill = ltArtillerySkill(actor,carrier)??resolveStandaloneSkill({ actor, record:skillRecord, mode });
  const data = { ...stats, name: record.name, mode: mode.snapshot.usage ?? "", level: skill.level };
  if(displacerProfile(mode.modeId)||ladar)data.isBeamWeapon=true;
  const physical=physicalRangedProfile(mode.modeId);
  if(physical?.group==='plb'){
    data.sourceRateOfFire=stats.rof;
    data.rof=String(mode.modeId==='WIijXG9uGZ52T0eW2'?carrier?.splatSalvo??30:physical.rof);
  }
  if(plasmaGunProfile(mode.modeId)||exoticBeamProfile(mode.modeId)||sonicNeuralProfile(mode.modeId)||beamProfile(mode.modeId)||htLaserProfile(mode.modeId)||utDazzlerProfile(mode.modeId)||electrolaserProfile(mode.modeId)||microwaveProfile(mode.modeId)||ppbProfile(mode.modeId))data.isBeamWeapon=true;
  // Catalog defense values are modifiers, GGA attack values are complete defense levels.
  if (record.type === "melee" && skill.resolved) for (const field of ["parry", "block"]) {
    const match = String(stats[field] ?? "").match(/^([+-]?\d+)([A-Za-z]*)$/);
    if (match) data[field] = String(3 + Math.floor(skill.level / 2) + Number(match[1])) + match[2];
  }
  const uuid = "olegurps:" + record.id + ":" + mode.modeId;
  const reference = { weaponId: record.id, modeId: mode.modeId, revision: record.revision, combatType: record.type,
    source: structuredClone(record.source), governingSkill: skill };
  let unsupportedDamage = false;
  if (stats.damage && typeof globalThis.GURPS?.parselink === "function") {
    try { const action = globalThis.GURPS.parselink(stats.damage)?.action;
      unsupportedDamage = !["damage", "deriveddamage"].includes(action?.type) || !!action?.next;
    } catch { unsupportedDamage = true; }
  }
  const htProfile=record.source.source==='HT'&&htPreGaussProfile(mode.modeId);
  if(htLaserProfile(mode.modeId)&&stats.damage===`HT${htLaserProfile(mode.modeId).modifier} aff`)unsupportedDamage=false;
  if(utDazzlerProfile(mode.modeId)&&stats.damage===utDazzlerFormula(utDazzlerProfile(mode.modeId)))unsupportedDamage=false;
  if(microwaveProfile(mode.modeId)&&stats.damage===microwaveFormula(microwaveProfile(mode.modeId)))unsupportedDamage=false;
  if(exoticBeamProfile(mode.modeId)&&String(stats.damage).replace(/\s/g,'').replaceAll('×','x')===exoticBeamProfile(mode.modeId).damage.replace(/\s/g,''))unsupportedDamage=false;
  if(sonicNeuralProfile(mode.modeId)&&String(stats.damage).replace(/\s/g,'')===sonicNeuralFormula(sonicNeuralProfile(mode.modeId)).replace(/\s/g,''))unsupportedDamage=false;
  if(electrolaserProfile(mode.modeId)&&new RegExp('^HT'+electrolaserProfile(mode.modeId).modifier+'(?: \\(2\\))? aff$').test(stats.damage))unsupportedDamage=false;
  if(fluidProfile(mode.modeId)||mode.modeId===HT_TEAR_SPRAY_MODE)unsupportedDamage=false;
  const personal=ltPersonalProfile(mode.modeId);if(personal?.noDamage)unsupportedDamage=false;
  if(displacerProfile(mode.modeId)||ladar||mode.modeId==='WUTSmartShuriken')unsupportedDamage=false;
  if(htProfile&&['squirt','net','signal'].includes(htProfile.kind)&&/^(?:Spec\.?|Special)$/i.test(stats.damage))unsupportedDamage=false;
  const feed=stormFeed(carrier,carrier?.ammunitionInventory?.magazines.find(m=>m.id===carrier.ammunitionInventory.installedId));
  if(feed&&carrier.executionVariant!=='lp')data.shots=feed.sourceShots;
  const utReason = utSpecialReadiness(mode.modeId)??utConventionalReadiness(mode.modeId, stats);
  const deferred=ltDeferredExecutionReason(mode.modeId);
  const reason = deferred ?? (sonicShuriken(mode.modeId)&&stats.damage==='thr(3) cut' ? 'Не заданы текущие ST и базовый thr персонажа в GGA.' : requiresUTPowerAccounting(mode.modeId) ? moduleText("OleGURPS.AttackProfile.UTPowerAccountingRequired") : utReason ? moduleText('OleGURPS.AttackProfile.'+utReason) : configured.reason ?? (weaponHandling?.jetDeferred ? "Для этого режима LT ещё не реализованы контракт Jet и расход топлива." : null) ?? platformRules?.blockedReason ?? (!skill.resolved ? skill.reason : skill.level < 3 ? "Уровень навыка ниже 3: атака недоступна." : !stats.damage ? "В режиме не указан Damage." :
    unsupportedDamage ? "Этот Damage не поддерживается штатным адаптером. Укажите одну распознаваемую GGA формулу урона." :
    record.type === "ranged" && (!personal||personal.procedure==='ranged') && (!platformRules?.rofJet && !/\d/.test(String(stats.rof ?? "")) || !platformRules?.rclNotApplicable && !weaponHandling?.rclNotApplicable && !/^[1-9]\d*(?:\s*\/\s*[1-9]\d*)?$/.test(String(stats.rcl ?? "")) ||
    !platformRules?.accNotApplicable && (stats.acc === null || !Number.isFinite(Number(String(stats.acc).split("+")[0]))) || !platformRules?.bulkNotApplicable && !bulkMetadata) ?
      "В режиме не хватает RoF, Rcl, Acc или Bulk. Заполните отсутствующие параметры в настройках." :
    record.type === "melee" && !stats.reach ? "В режиме не указан Reach." : null));
  return { ...data, path: "", uuid, key: "uuid:" + uuid, label: data.mode ? record.name + " — " + data.mode : record.name,
    acc: platformRules?.accNotApplicable || stats.acc === null ? null : Number(String(stats.acc).split("+")[0]),
    scopeBonus: Number(String(stats.acc ?? "").split("+")[1]) || 0,
    bulk: bulkMetadata?.numericBulk ?? null, bulkMetadata, ...(weaponHandling?{weaponHandling}:{}), data, sourceDamage: stats.damage,
    standaloneRef: reference, governingSkillBinding: { kind: "standalone", weaponId: record.id, modeId: mode.modeId },
    ...(record.settings?.ltBow?{ltBowConfiguration:record.settings.ltBow,ltBowOverrides:mode.overrides}:{}),
    ...(personal?{ltPersonalOverrides:mode.overrides,ltProcedure:personal.procedure,sourceCombatType:mode.snapshot.combat_type}:{}),
    ...(ltEarlyProfile(mode.modeId)?{ltEarlyOverrides:{...(ltEarlyProfile(mode.modeId).kind==='flame'?{damage:stats.damage,range:stats.range}:{}),...mode.overrides}}:{}),
    ...(typeof record.settings?.weaponBond==='boolean'?{weaponBondSetting:record.settings.weaponBond}:{}),
    ...(record.source.source==='LT'&&record.type==='ranged'&&record.settings?.weaponBondPerkConfirmed===true?{weaponBondPerkConfirmed:true}:{}),
    ...(platformRules?{platformRules,ammunitionRange,
      ammunitionConditions:platformRules.instruction?[{id:'SpecializedPlatform',text:platformRules.instruction}]:[]}:{}),
    ...(electrolaserProfile(mode.modeId)?{preparationReadinessReason:weaponPowerReason({...carrier,electrolaserMode:'standard'},1,mode.modeId)??reason}:{}),
    ...(next?{nextElevenConfiguration:mode.overrides}:{}),
    skillDescription: standaloneSkillDescription(skill), readinessReason: (ladar&&!sensor?'Выберите источниковый носитель или TL сенсора в настройках.':null) ?? exoticBeamReason(carrier) ?? (!isSonic(sonicNeuralWeapon(carrier))?sonicNeuralReason(carrier):null) ?? weaponPowerReason(carrier, 1, mode.modeId) ?? reason };
}
export function listStandaloneAttacks(actor, type) {
  return new StandaloneWeaponService(actor).list(type).flatMap(record =>
    (Array.isArray(record.modes) && record.modes.length ? record.modes : [null]).map((mode, index) => {
      try {
        const attack = readStandaloneAttack(actor, record.id, mode?.modeId);
        if (attack) return attack;
        throw new Error("StandaloneModeMissing");
      } catch (error) {
        console.error("OleGURPS QOL | Недоступная запись атаки", { actorId: actor?.id,
          weaponId: record.id, modeId: mode?.modeId, error });
        const uuid = "olegurps:" + record.id + ":" + (mode?.modeId ?? "invalid-" + index);
        const reason = "Запись оружия неполна или повреждена. Проверьте режим и требуемый навык в настройках; остальные атаки доступны.";
        return { uuid, key: "uuid:" + uuid, path: "", name: record.name, label: record.name,
          data: { name: record.name, level: null }, level: null,
          standaloneRef: { weaponId: record.id, modeId: mode?.modeId ?? null, combatType: type },
          readinessReason: reason, skillDescription: reason, diagnosticCode: "StandaloneRecordInvalid" };
      }
    }));
}
export function standaloneCatalogBinding(attack, catalogs) {
  const ref = attack?.standaloneRef;
  if (!ref) return null;
  const mode = catalogs?.getMode(ref.modeId);
  const equipment = catalogs?.getEquipment(ref.source?.equipmentId);
  const hash = catalogs?.getCatalog("weapons")?.sources?.find(s => s.code === ref.source?.source)?.sha256;
  return hash === ref.source?.sourceHash && equipment?.modes?.some(m => m.weapon_mode_id === mode?.weapon_mode_id) ?
    { status: "confirmed", binding: { confirmed: true, modeId: ref.modeId,
      equipmentId: ref.source.equipmentId, source: "standalone-catalog-identity" } } : { status: "unavailable" };
}
export function standaloneAvailableRounds(weapon) {
  if(sonicShuriken(weapon))return !weapon.sonicThrownId&&(readWeaponBattery(weapon)?.charge??0)>0?1:0;
  const fixed=fixedFeedAvailable(weapon);if(fixed!==null)return fixed;
  if(exoticBeamWeapon(weapon))return readWeaponBattery(weapon)?.charge??0;
  if(sonicNeuralWeapon(weapon))return readWeaponBattery(weapon)?.charge??0;
  if(ppbWeapon(weapon))return Math.floor((readWeaponBattery(weapon)?.charge??0)/ppbUnits(weapon));
  if(electrolaserWeapon(weapon))return Math.floor((readWeaponBattery(weapon)?.charge??0)/electrolaserUnits(weapon));
  if(beamWeapon(weapon))return laserAvailableShots(weapon,readWeaponBattery(weapon)?.charge??0);
  if(htLaserWeapon(weapon)||utDazzlerWeapon(weapon))return readWeaponBattery(weapon)?.charge??0;
  return weapon?.standaloneWeaponId && weapon.ammoUnconfigured && !weapon.ammunitionInventory && !weapon.magazines?.length
    ? Infinity : weapon?.magazines?.[weapon.loadedIndex] ?? 0;
}
import {ltDeferredExecutionReason} from '../lt-ranged-execution-policy.js';
