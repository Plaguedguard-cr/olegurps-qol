import { moduleText } from '../localization.js';
import { ETC_PROFILES, etcBlocker, etcText } from './ut-etc.js';
import { magazineFill } from './ammo-inventory.js';
import { uawWeaponView } from './ut-uaw.js';
import { GAUSS_PROFILES, gaussProfile } from '../ut-gauss-source.js';
import { gaussUnits, gaussSpeed } from './ut-gauss.js';
import { BEAM_PROFILES, beamProfile } from '../ut-beam-source.js';
import { HT_LASER_PROFILES, htLaserProfile } from '../ht-laser-source.js';
import { UT_DAZZLER_PROFILES, utDazzlerProfile } from '../ut-dazzler-source.js';

// Reviewed weapon profiles, not capacities inferred from a cell's size.
// New weapon families must supply their own source-checked resource profile.
export const WEAPON_POWER_PROFILES = Object.freeze({
  ...Object.fromEntries(Object.values(UT_DAZZLER_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ut-dazzler:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'dazzlerBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set'})])),
  ...Object.fromEntries(Object.values(HT_LASER_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ht-laser:'+p.modeId,cellSize:p.cellSize,cells:1,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'htLaserBattery',standard:'HT13',label:'Батарея '+p.cellSize,source:p.batterySource,accounting:'HT181-published-shots'})])),
  ...Object.fromEntries(Object.values(BEAM_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'beam:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:p.oneShot?'beamCrystal':p.chemical?'beamChemical':'beamBattery',completeSet:true,
    ...(p.chemical?{label:p.modeId==='WY4jJpxSq5uG4KNl2'?'Химический бак':'Химический ранец'}:{}),
    oneShot:p.oneShot,chemical:p.chemical,source:p.source,accounting:'published-shots-per-complete-source-set'})])),
  ...Object.fromEntries(Object.values(GAUSS_PROFILES).filter(p=>!p.external).map(p=>[p.modeId,Object.freeze({
    id:'gauss:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots*4,
    standardShots:p.shots,unitsPerStandardShot:4,chargePerPhysicalShot:4,stateKey:'gaussBattery',
    source:p.source,accounting:'UT141->139:standard=4;boosted=6;low=1;UT143-shots-per-complete-cell-set'})])),
  Wg_f0E5hqv6o1C0Uj: Object.freeze({id:'ut-paint-carbine',cellSize:'B',
    capacity:500,chargePerPhysicalShot:1,stateKey:'paintBattery',
    source:'UT139-140',accounting:'module-10x50'})
});
export const weaponPowerProfile = (weapon, modeId = null) => {
  const id = modeId ?? weapon?.standaloneModeId ?? weapon?.catalogModeId;
  if (weapon?.executionVariant === 'etc') return ETC_PROFILES[id]?.cellSize?ETC_PROFILES[id]:null;
  return Object.hasOwn(WEAPON_POWER_PROFILES, id ?? '') ? WEAPON_POWER_PROFILES[id] : null;
};
export const batteryText = key => moduleText('OleGURPS.WeaponBattery.' + key);
const validProfile = profile => profile && (['AA','A','B','C','D','E','F'].includes(profile.cellSize)||
  profile.completeSet&&['chemical','integrated'].includes(profile.cellSize)||profile.standard==='HT13'&&['M','VL'].includes(profile.cellSize)) &&
  Number.isSafeInteger(profile.capacity) && profile.capacity > 0 && profile.capacity <= Number.MAX_SAFE_INTEGER / 2 &&
  Number.isSafeInteger(profile.chargePerPhysicalShot) && profile.chargePerPhysicalShot > 0 &&
  typeof profile.stateKey === 'string' && !!profile.stateKey;

export function newWeaponBattery(profile, nonRechargeable = false) {
  if (!validProfile(profile) || typeof nonRechargeable !== 'boolean') throw Error(batteryText('Invalid'));
  if(profile.standard==='HT13'){
    if(nonRechargeable)throw Error('Удвоение ёмкости UT не применяется к батареям HT.');
    return {type:profile.cellSize,standard:'HT13',capacity:profile.capacity,charge:profile.capacity};
  }
  if((profile.oneShot||profile.chemical)&&nonRechargeable)throw Error('Для этого источника Non-Rechargeable не применяется.');
  const capacity = profile.capacity * (nonRechargeable ? 2 : 1);
  return {type:profile.cellSize,nonRechargeable,capacity,charge:capacity,
    ...(profile.completeSet?{cells:profile.cells}:{}),
    ...(profile.oneShot?{sealedUsed:false}:{}),
    ...(profile.unitsPerStandardShot?{cells:profile.cells,unitsPerStandardShot:profile.unitsPerStandardShot}:{})};
}
export function readWeaponBattery(weapon, profile = weaponPowerProfile(weapon)) {
  if (!validProfile(profile)) return null;
  const b = weapon?.[profile.stateKey];
  if(profile.standard==='HT13')return b?.standard==='HT13'&&b.type===profile.cellSize&&b.capacity===profile.capacity&&
    !Object.hasOwn(b,'nonRechargeable')&&Number.isSafeInteger(b.charge)&&b.charge>=0&&b.charge<=b.capacity?b:null;
  if (!b || Object.hasOwn(b,'nonRechargeable') && typeof b.nonRechargeable !== 'boolean') return null;
  if(profile.completeSet&&(b.cells!==profile.cells||
    (profile.chemical||profile.oneShot)&&b.nonRechargeable!==false||
    profile.oneShot&&(typeof b.sealedUsed!=='boolean'||b.sealedUsed&&b.charge!==0)))return null;
  if(profile.unitsPerStandardShot&&(b.cells!==profile.cells||b.unitsPerStandardShot!==profile.unitsPerStandardShot))return null;
  const capacity = profile.capacity * (b.nonRechargeable === true ? 2 : 1);
  return b.type === profile.cellSize && b.capacity === capacity &&
    Number.isSafeInteger(b.charge) && b.charge >= 0 && b.charge <= capacity ? b : null;
}
// Capture the whole saved battery, including an absent or damaged old state.
// Comparison happens after entering the Actor resource queue.
export const batteryExpectation = (weapon, profile = weaponPowerProfile(weapon)) =>
  structuredClone(profile ? weapon?.[profile.stateKey] ?? null : null);
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])) : value;
export const sameBattery = (a, b) => JSON.stringify(ordered(a ?? null)) === JSON.stringify(ordered(b ?? null));

export function weaponPowerReason(weapon, amount = 1, modeId = null) {
  const profile=weaponPowerProfile(weapon,modeId);
  if (!profile) return weapon?.executionVariant==='etc' ? etcBlocker(modeId??weapon.standaloneModeId??weapon.catalogModeId) : null;
  const b=readWeaponBattery(weapon,profile),cost=weaponPowerCost(weapon,amount,profile);
  const key=!b?'Missing':b.charge===0?'Empty':!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(cost)||cost>b.charge?'Insufficient':null;
  if(profile.standard==='HT13'&&key)return key==='Missing'?'Установите штатную батарею HT через «Заменить батарею».':'Недостаточно заряда батареи HT для выбранной очереди.';
  if(profile.completeSet&&key)return profile.oneShot?'Кристалл использован или его заряд не подтверждён; нужен новый экземпляр.':
    profile.chemical?(key==='Missing'?'Установите новый полный химический источник через кнопку замены.':'Недостаточно химического топлива для выбранной очереди.'):
    key==='Missing'?'Установите штатный комплект батарей через «Заменить батарею».':'Недостаточно энергии лазера для выбранной очереди.';
  if(profile.unitsPerStandardShot&&key)return key==='Missing'?'Установите штатную батарею EM через «Заменить батарею».':
    key==='Empty'?'Батарея EM разряжена.':'Недостаточно энергии EM для выбранной скорости и очереди.';
  return key ? profile.id==='ut-paint-carbine' ? moduleText('OleGURPS.PaintBattery.'+key) :
    moduleText('OleGURPS.ETC.'+key,{cell:profile.cellSize}) : null;
}
export const weaponPowerCost = (weapon,amount,profile=weaponPowerProfile(weapon)) =>
  amount*(profile?.unitsPerStandardShot?(gaussUnits(weapon)??NaN):profile?.chargePerPhysicalShot??1);
export function weaponPowerEvidence(weapon, amount, spent = amount, profile = weaponPowerProfile(weapon)) {
  const b=readWeaponBattery(weapon,profile);
  const cost=weaponPowerCost(weapon,spent,profile);
  return b?{type:b.type,capacity:b.capacity,before:b.charge,after:b.charge-cost,spent:cost,physicalShots:amount,
    ...(profile.completeSet?{cells:profile.cells,oneShot:!!profile.oneShot,chemical:!!profile.chemical}:{}),
    ...(profile.unitsPerStandardShot?{cells:profile.cells,unitsPerStandardShot:4,unitsPerShot:gaussUnits(weapon),speed:gaussSpeed(weapon)}:{}),
    source:(b.nonRechargeable?'UT19;':'')+profile.source,accounting:profile.accounting,
    ...(profile.nominalCapacity?{nominalCapacity:profile.nominalCapacity,feedSource:profile.feedSource}:{}),
    ...(Object.hasOwn(b,'nonRechargeable')?{nonRechargeable:b.nonRechargeable}:{}),
    ...(b.replacementId?{replacementId:b.replacementId}:{})}:null;
}
export function validateWeaponExecution(weapon, profile) {
  const modeId=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId;
  if(utDazzlerProfile(modeId)&&(!weapon||!profile.damage?.nativeSafe||profile.damage.rules?.utDazzler!==modeId||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Конфигурация Dazzler изменилась. Подготовьте атаку заново.');
  if(htLaserProfile(modeId)&&(!weapon||!profile.damage?.nativeSafe||profile.damage.rules?.htLaser!==modeId||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Конфигурация лазера HT изменилась. Подготовьте атаку заново.');
  if(beamProfile(modeId)&&(!weapon||!profile.damage?.nativeSafe||profile.damage.rules?.beam?.modeId!==modeId||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Конфигурация лазера изменилась. Подготовьте атаку заново.');
  if(gaussProfile(modeId)&&(!weapon||profile.weaponConfiguration?.variant!=='gauss'||
    profile.weaponConfiguration.fireMode!==gaussSpeed(weapon)||!gaussUnits(weapon)||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Скорость или конфигурация EM изменилась. Подготовьте атаку заново.');
  if (weapon?.executionVariant==='etc' || profile?.weaponConfiguration?.variant==='etc') {
    const id=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId;
    if (weapon?.executionVariant!=='etc' || profile?.weaponConfiguration?.variant!=='etc' ||
      !ETC_PROFILES[id] || id!==(weapon.standaloneModeId??weapon.catalogModeId)) throw Error(etcText('Changed'));
  }
}
// Frozen snapshots authorize Damage replay, never a new expenditure of live energy.
export function validateWeaponShotPower(actor, profile, amount = 1, attack = null) {
  const modeId=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId??attack?.standaloneRef?.modeId;
  const weapons=actor?.getFlag?.('world','gurpsAmmoManager')?.weapons??[];
  const weapon=uawWeaponView({weapons},weapons.find(w=>w.id===profile?.weaponId)??weapons.find(w=>
    w.standaloneWeaponId===attack?.standaloneRef?.weaponId && w.standaloneModeId===modeId));
  validateWeaponExecution(weapon,profile);
  const reason=weaponPowerReason(weapon,amount,modeId);
  if(reason)throw Error(reason);
}
export function weaponBatteryHTML(weapon, selected, escape) {
  const profile=weaponPowerProfile(weapon);if(!profile)return '';
  const b=readWeaponBattery(weapon,profile),charge=b?.charge??0,capacity=b?.capacity??profile.capacity;
  const unit=profile.unitsPerStandardShot??1;
  const cell=profile.oneShot?'Встроенный заряд':profile.label??(profile.cells>1?profile.cells+'×':'')+profile.cellSize+' cell',label=cell+(b?.nonRechargeable?' — Non-Rechargeable':'');
  return `<button type="button" class="gam-battery ${selected?'selected':''}" data-ammo-action="select-battery" data-weapon-id="${escape(weapon.id)}" aria-pressed="${!!selected}" aria-label="${escape(label)} ${charge/unit}/${capacity/unit}" title="${escape(weaponPowerReason(weapon)??label)}">`+
    `<span class="gam-battery-text"><span>${escape(cell)}</span><span>${charge/unit}/${capacity/unit}</span></span>`+
    `<span class="gam-battery-icon" style="--gam-mag-hue:${magazineFill(charge,capacity).hue}" aria-hidden="true">${Array.from({length:10},(_,i)=>
      `<span class="gam-battery-segment ${charge>(9-i)*capacity/10?'filled':''}"></span>`).join('')}</span></button>`;
}
