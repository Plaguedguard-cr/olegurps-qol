import { standaloneModeStats, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { resolveStandaloneSkill, standaloneSkillDescription } from "./standalone-skill-service.js";
import { parseWeaponBulk } from "./weapon-bulk.js";
import {specializedPlatform,configuredPlatform,platformRange} from '../ht-specialized-platforms.js';
import { requiresUTPowerAccounting } from "../ut-source-data.js";
import { beamWeapon, beamProfile } from '../ut-beam-source.js';
import { htLaserProfile, htLaserWeapon } from '../ht-laser-source.js';
import { utDazzlerProfile, utDazzlerWeapon, utDazzlerFormula } from '../ut-dazzler-source.js';
import { readWeaponBattery } from './weapon-power.js';
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
  // UT137's dash shares the complete UAW's Bulk; never substitute another gun's Damage/Rcl.
  if(uawFeed(mode.modeId)?.id==='shotgun'&&(!stats.bulk||stats.bulk==='-'))
    stats.bulk=record.modes.find(m=>uawFeed(m.modeId)?.id==='main')?.overrides?.bulk??
      record.modes.find(m=>uawFeed(m.modeId)?.id==='main')?.snapshot?.stats?.bulk??'-3';
  const configured=configuredPlatform(specializedPlatform(mode.snapshot,record.source.source),mode.overrides);
  if(configured.bulk!==undefined)stats.bulk=configured.bulk;
  const platformRules=configured.platform;
  const ammunitionRange=platformRange(platformRules,stats.range);
  if(platformRules?.manualGuidance){stats.rof='1';stats.range=String(ammunitionRange?.maximum??stats.range);}
  const bulkMetadata = parseWeaponBulk(stats.bulk);
  const skill = resolveStandaloneSkill({ actor, record, mode });
  const data = { ...stats, name: record.name, mode: mode.snapshot.usage ?? "", level: skill.level };
  if(beamProfile(mode.modeId)||htLaserProfile(mode.modeId)||utDazzlerProfile(mode.modeId))data.isBeamWeapon=true;
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
  if(htProfile&&['squirt','net','signal'].includes(htProfile.kind)&&/^(?:Spec\.?|Special)$/i.test(stats.damage))unsupportedDamage=false;
  const ammoState=actor.getFlag('world', 'gurpsAmmoManager');
  const carrier = uawWeaponView(ammoState,ammoState?.weapons?.find(w =>
    w.standaloneWeaponId === record.id && w.standaloneModeId === mode.modeId));
  const feed=stormFeed(carrier,carrier?.ammunitionInventory?.magazines.find(m=>m.id===carrier.ammunitionInventory.installedId));
  if(feed&&carrier.executionVariant!=='lp')data.shots=feed.sourceShots;
  const utReason = utSpecialReadiness(mode.modeId)??utConventionalReadiness(mode.modeId, stats);
  const reason = requiresUTPowerAccounting(mode.modeId) ? moduleText("OleGURPS.AttackProfile.UTPowerAccountingRequired") : utReason ? moduleText('OleGURPS.AttackProfile.'+utReason) : configured.reason ?? platformRules?.blockedReason ?? (!skill.resolved ? skill.reason : skill.level < 3 ? "Уровень навыка ниже 3: атака недоступна." : !stats.damage ? "В режиме не указан Damage." :
    unsupportedDamage ? "Этот Damage не поддерживается штатным адаптером. Укажите одну распознаваемую GGA формулу урона." :
    record.type === "ranged" && (!platformRules?.rofJet && !/\d/.test(String(stats.rof ?? "")) || !platformRules?.rclNotApplicable && !/^[1-9]\d*(?:\s*\/\s*[1-9]\d*)?$/.test(String(stats.rcl ?? "")) ||
      !platformRules?.accNotApplicable && (stats.acc === null || !Number.isFinite(Number(String(stats.acc).split("+")[0]))) || !platformRules?.bulkNotApplicable && !bulkMetadata) ?
      "В режиме не хватает RoF, Rcl, Acc или Bulk. Заполните отсутствующие параметры в настройках." :
    record.type === "melee" && !stats.reach ? "В режиме не указан Reach." : null);
  return { ...data, path: "", uuid, key: "uuid:" + uuid, label: data.mode ? record.name + " — " + data.mode : record.name,
    acc: platformRules?.accNotApplicable || stats.acc === null ? null : Number(String(stats.acc).split("+")[0]),
    scopeBonus: Number(String(stats.acc ?? "").split("+")[1]) || 0,
    bulk: bulkMetadata?.numericBulk ?? null, bulkMetadata, data, sourceDamage: stats.damage,
    standaloneRef: reference, governingSkillBinding: { kind: "standalone", weaponId: record.id, modeId: mode.modeId },
    ...(typeof record.settings?.weaponBond==='boolean'?{weaponBondSetting:record.settings.weaponBond}:{}),
    ...(platformRules?{platformRules,ammunitionRange,
      ammunitionConditions:platformRules.instruction?[{id:'SpecializedPlatform',text:platformRules.instruction}]:[]}:{}),
    skillDescription: standaloneSkillDescription(skill), readinessReason: weaponPowerReason(carrier, 1, mode.modeId) ?? reason };
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
  if(beamWeapon(weapon)||htLaserWeapon(weapon)||utDazzlerWeapon(weapon))return readWeaponBattery(weapon)?.charge??0;
  return weapon?.standaloneWeaponId && weapon.ammoUnconfigured && !weapon.ammunitionInventory && !weapon.magazines?.length
    ? Infinity : weapon?.magazines?.[weapon.loadedIndex] ?? 0;
}
