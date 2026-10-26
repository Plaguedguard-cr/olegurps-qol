import {UT_PHYSICAL_RANGED_PROFILES} from '../ut-physical-ranged-source.js';
import {ltBowReadiness} from './lt-bow.js';
import {ltPersonalProfile} from '../lt-personal-source.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import {ltEarlyReadiness,ltEarlyShotPlan} from './lt-early-firearms.js';
import {sonicShuriken,SONIC_SHURIKEN} from '../ut-sonic-shuriken-source.js';
import {DISPLACERS,LADARS,nextElevenProfile} from '../ut-next-eleven-source.js';
import { EXOTIC_BEAM_PROFILES, exoticBeamProfile, exoticBeamWeapon, exoticBeamConfiguration, exoticBeamReason } from '../ut-exotic-beam-source.js';
import { moduleText } from '../localization.js';
import { ETC_PROFILES, etcBlocker, etcText } from './ut-etc.js';
import { magazineFill } from './ammo-inventory.js';
import { uawWeaponView } from './ut-uaw.js';
import { GAUSS_PROFILES, gaussProfile } from '../ut-gauss-source.js';
import { gaussUnits, gaussSpeed } from './ut-gauss.js';
import { BEAM_PROFILES, beamProfile } from '../ut-beam-source.js';
import { HT_LASER_PROFILES, htLaserProfile } from '../ht-laser-source.js';
import { UT_DAZZLER_PROFILES, utDazzlerProfile } from '../ut-dazzler-source.js';
import { MICROWAVE_PROFILES, microwaveProfile } from '../ut-microwave-source.js';
import { SONIC_NEURAL_PROFILES, sonicNeuralProfile, sonicNeuralWeapon, sonicNeuralConfiguration, sonicNeuralReason } from '../ut-sonic-neural-source.js';
import { PPB_PROFILES, ppbProfile, ppbWeapon, ppbUnits, ppbConfiguration, validPPBConfiguration } from '../ut-plasma-particle-source.js';
import { ELECTROLASER_PROFILES, electrolaserProfile, electrolaserWeapon, electrolaserUnits, electrolaserConfiguration, validElectrolaserConfiguration } from '../ut-electrolaser-source.js';
import {laserShotUnits,laserConfiguration,laserAvailableModes,laserFaceOrEyes} from '../ut-laser-modifications.js';

// Reviewed weapon profiles, not capacities inferred from a cell's size.
// New weapon families must supply their own source-checked resource profile.
export const WEAPON_POWER_PROFILES = Object.freeze({
  [SONIC_SHURIKEN.modeId]:Object.freeze({id:'sonic-shuriken',cellSize:'A',cells:1,capacity:1,chargePerPhysicalShot:1,stateKey:'sonicShurikenBattery',source:'UT166',accounting:'complete-cell-per-throw'}),
  ...Object.fromEntries(Object.values(DISPLACERS).map(p=>[p.modeId,Object.freeze({id:'displacer:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:8,chargePerPhysicalShot:1,stateKey:'displacerBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set',label:p.cells+' '+p.cellSize+(p.cellSize==='D'?'p':'')+' cell'})])),
  ...Object.fromEntries(Object.values(LADARS).filter(p=>p.cellSize).map(p=>[p.modeId,Object.freeze({id:'military-ladar:'+p.modeId,cellSize:p.cellSize,cells:1,capacity:480,chargePerPhysicalShot:0,stateKey:'sensorBattery',completeSet:true,sensorTime:true,source:'UT64',accounting:'manual-operating-minutes-no-impulse-cost',label:p.cellSize+' cell · мин.'})])),
  ...Object.fromEntries(Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='grav'&&p.cellSize).map(p=>[p.modeId,Object.freeze({
    id:'ut-grav:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'gravBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set'})])),
  ...Object.fromEntries(Object.values(EXOTIC_BEAM_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ut-exotic-beam:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'exoticBeamBattery',completeSet:true,...(p.cosmic?{cosmic:true,label:'Cosmic '+(p.cells>1?p.cells:'')+p.cellSize+(['E','F'].includes(p.cellSize)?'p':'')+' cell'}:{}),source:p.source,accounting:'published-shots-per-complete-source-set',
    ...(!p.cosmic&&['D','E','F'].includes(p.cellSize)?{label:(p.cells>1?p.cells:'')+p.cellSize+'p — выносной комплект'}:{})})])),
  ...Object.fromEntries(Object.values(SONIC_NEURAL_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ut-sonic-neural:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'sonicNeuralBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set',
    ...(p.cellSize==='D'?{label:'Dp — D cell (выносная)'}:{})})])),
  ...Object.fromEntries(Object.values(PPB_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ut-plasma-particle:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'plasmaParticleBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set',
    ...(['D','E','F'].includes(p.cellSize)?{label:(p.cells>1?p.cells:'')+p.cellSize+'p — выносной комплект'}:{})})])),
  ...Object.fromEntries(Object.values(MICROWAVE_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'ut-microwave:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'microwaveBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set',
    ...(p.cellSize==='D'?{label:'Dp — D cell (выносная)'}:{})})])),
  ...Object.fromEntries(Object.values(ELECTROLASER_PROFILES).map(p=>[p.modeId,Object.freeze({
    id:'electrolaser:'+p.modeId,cellSize:p.cellSize,cells:p.cells,capacity:p.shots,chargePerPhysicalShot:1,
    stateKey:'electrolaserBattery',completeSet:true,source:p.source,accounting:'published-shots-per-complete-source-set',
    ...(p.backpack?{label:'Dp — D cell (выносная)'}:{})})])),
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
  Number.isSafeInteger(profile.chargePerPhysicalShot) && (profile.chargePerPhysicalShot > 0 || profile.sensorTime===true&&profile.chargePerPhysicalShot===0) &&
  typeof profile.stateKey === 'string' && !!profile.stateKey;

export function newWeaponBattery(profile, nonRechargeable = false) {
  if (!validProfile(profile) || typeof nonRechargeable !== 'boolean') throw Error(batteryText('Invalid'));
  if(profile.standard==='HT13'){
    if(nonRechargeable)throw Error('Удвоение ёмкости UT не применяется к батареям HT.');
    return {type:profile.cellSize,standard:'HT13',capacity:profile.capacity,charge:profile.capacity};
  }
  if((profile.cosmic||profile.oneShot||profile.chemical)&&nonRechargeable)throw Error('Для этого источника Non-Rechargeable не применяется.');
  const capacity = profile.capacity * (nonRechargeable ? 2 : 1);
  return {type:profile.cellSize,...(profile.cosmic?{standard:'cosmic'}:{}),nonRechargeable,capacity,charge:capacity,
    ...(profile.completeSet?{cells:profile.cells}:{}),
    ...(profile.oneShot?{sealedUsed:false}:{}),
    ...(profile.unitsPerStandardShot?{cells:profile.cells,unitsPerStandardShot:profile.unitsPerStandardShot}:{})};
}
export function readWeaponBattery(weapon, profile = weaponPowerProfile(weapon)) {
  if (!validProfile(profile)) return null;
  const b = weapon?.[profile.stateKey];
  if(profile.standard==='HT13')return b?.standard==='HT13'&&b.type===profile.cellSize&&b.capacity===profile.capacity&&
    !Object.hasOwn(b,'nonRechargeable')&&Number.isSafeInteger(b.charge)&&b.charge>=0&&b.charge<=b.capacity?b:null;
  if(profile.cosmic&&(b?.standard!=='cosmic'||b.nonRechargeable!==false))return null;
  if (!b || Object.hasOwn(b,'nonRechargeable') && typeof b.nonRechargeable !== 'boolean') return null;
  if(profile.completeSet&&(b.cells!==profile.cells||
    (profile.chemical||profile.oneShot)&&b.nonRechargeable!==false||
    profile.oneShot&&(typeof b.sealedUsed!=='boolean'||b.sealedUsed&&b.charge!==0)))return null;
  if(profile.unitsPerStandardShot&&(b.cells!==profile.cells||b.unitsPerStandardShot!==profile.unitsPerStandardShot))return null;
  const capacity = profile.capacity * (b.nonRechargeable === true ? 2 : 1);
  const exactCharge=profile.stateKey.startsWith('beam')?Number.isFinite(b.charge)&&Math.abs(b.charge*10-Math.round(b.charge*10))<1e-8:Number.isSafeInteger(b.charge);
  return b.type === profile.cellSize && b.capacity === capacity && exactCharge && b.charge >= 0 && b.charge <= capacity ? b : null;
}
// Capture the whole saved battery, including an absent or damaged old state.
// Comparison happens after entering the Actor resource queue.
export const batteryExpectation = (weapon, profile = weaponPowerProfile(weapon)) =>
  structuredClone(profile ? weapon?.[profile.stateKey] ?? null : null);
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])) : value;
export const sameBattery = (a, b) => JSON.stringify(ordered(a ?? null)) === JSON.stringify(ordered(b ?? null));

export function weaponPowerReason(weapon, amount = 1, modeId = null) {
  if(sonicShuriken(weapon)&&weapon.sonicThrownId)return 'Сюрикен брошен. Сначала подтвердите ручной подбор в окне «Патроны».';
  const profile=weaponPowerProfile(weapon,modeId);
  if (!profile) return weapon?.executionVariant==='etc' ? etcBlocker(modeId??weapon.standaloneModeId??weapon.catalogModeId) : null;
  const b=readWeaponBattery(weapon,profile),cost=weaponPowerCost(weapon,amount,profile);
  const exactCost=beamProfile(modeId??weapon?.standaloneModeId??weapon?.catalogModeId)?Number.isSafeInteger(Math.round(cost*10))&&Number.isFinite(cost)&&cost>=0:Number.isSafeInteger(cost);
  const key=!b?'Missing':b.charge===0?'Empty':!Number.isSafeInteger(amount)||amount<1||!exactCost||Math.round(cost*10)>Math.round(b.charge*10)?'Insufficient':null;
  if(sonicShuriken(weapon)&&(key||amount!==1))return key==='Missing'?'Установите A cell через «Заменить батарею».':'A cell разряжена или запрошено больше одного броска.';
  if(profile.sensorTime&&key)return key==='Missing'?'Установите батарею сенсора через «Заменить батарею».':'Время работы батареи сенсора исчерпано.';
  if(nextElevenProfile(modeId??weapon?.standaloneModeId??weapon?.catalogModeId)?.radius&&key)return key==='Missing'?'Установите штатный комплект Displacer через «Заменить батарею».':'Недостаточно энергии Displacer для выстрела.';
  if(profile.standard==='HT13'&&key)return key==='Missing'?'Установите штатную батарею HT через «Заменить батарею».':'Недостаточно заряда батареи HT для выбранной очереди.';
  if(profile.stateKey==='gravBattery'&&key)return key==='Missing'?'Установите штатный комплект батарей Grav через «Заменить батарею».':'Недостаточно энергии Grav для выбранной очереди.';
  if(profile.cosmic&&key)return key==='Missing'?'Установите полный комплект Cosmic Cells через «Заменить батарею».':'Недостаточно импульсов Cosmic Cells для выбранной очереди.';
  if(profile.completeSet&&key)return profile.oneShot?'Кристалл использован или его заряд не подтверждён; нужен новый экземпляр.':
    profile.chemical?(key==='Missing'?'Установите новый полный химический источник через кнопку замены.':'Недостаточно химического топлива для выбранной очереди.'):
    key==='Missing'?'Установите штатный комплект батарей через «Заменить батарею».':microwaveProfile(modeId??weapon?.standaloneModeId??weapon?.catalogModeId)?
      'Недостаточно энергии Microwave для выстрела.':ppbProfile(modeId??weapon?.standaloneModeId??weapon?.catalogModeId)?
        'Недостаточно энергии для выбранной очереди.':sonicNeuralWeapon(weapon)?'Недостаточно энергии для выбранной очереди.':'Недостаточно энергии лазера для выбранной очереди.';
  if(profile.unitsPerStandardShot&&key)return key==='Missing'?'Установите штатную батарею EM через «Заменить батарею».':
    key==='Empty'?'Батарея EM разряжена.':'Недостаточно энергии EM для выбранной скорости и очереди.';
  return key ? profile.id==='ut-paint-carbine' ? moduleText('OleGURPS.PaintBattery.'+key) :
    moduleText('OleGURPS.ETC.'+key,{cell:profile.cellSize}) : null;
}
export const weaponPowerCost = (weapon,amount,profile=weaponPowerProfile(weapon)) =>
  sonicShuriken(weapon)?amount*(readWeaponBattery(weapon,profile)?.capacity??1):
  ppbWeapon(weapon)?amount*ppbUnits(weapon):
  beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId)?amount*laserShotUnits(weapon)/10:
    amount*(electrolaserWeapon(weapon)?electrolaserUnits(weapon):profile?.unitsPerStandardShot?(gaussUnits(weapon)??NaN):profile?.chargePerPhysicalShot??1);
// Opening Fire Control may select Standard with the last charge. Shot validation
// still uses the saved mode and its full cost inside the Actor queue.
export function weaponPreparationView(weapon){
  if(ppbWeapon(weapon)?.family==='blaster')return {...weapon,blasterHotshot:false};
  if(electrolaserWeapon(weapon))return {...weapon,electrolaserMode:'standard'};
  if(!beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId))return weapon;
  const modes=laserAvailableModes(weapon),cheapest=modes.reduce((a,b)=>laserShotUnits({...weapon,laserMode:a})<=laserShotUnits({...weapon,laserMode:b})?a:b,modes[0]);
  return {...weapon,laserMode:cheapest};
}
export function weaponPreparationReason(weapon,attack){
  if(ltEarlyProfile(weapon))return ltEarlyReadiness(weapon)??attack?.ammunitionReadinessReason??attack?.readinessReason??null;
  if(ltPersonalProfile(weapon)&&attack?.ammunitionReadinessReason)return attack.ammunitionReadinessReason;
  const bowReason=ltBowReadiness(weapon,attack);if(bowReason)return bowReason;
  if(ppbWeapon(weapon))return weaponPowerReason(weaponPreparationView(weapon))??(attack?.readinessReason===weaponPowerReason(weapon)?null:attack?.readinessReason??null);
  if(beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId)){
    return weaponPowerReason(weaponPreparationView(weapon))??attack?.preparationReadinessReason??
      (attack?.readinessReason===weaponPowerReason(weapon)?null:attack?.readinessReason??null);
  }
  if(!electrolaserWeapon(weapon))return weaponPowerReason(weapon)??attack?.readinessReason??null;
  return weaponPowerReason({...weapon,electrolaserMode:'standard'})??attack?.preparationReadinessReason??
    (attack?.readinessReason===weaponPowerReason(weapon)?null:attack?.readinessReason??null);
}
export function weaponPowerEvidence(weapon, amount, spent = amount, profile = weaponPowerProfile(weapon)) {
  const b=readWeaponBattery(weapon,profile);
  const cost=weaponPowerCost(weapon,spent,profile);
  return b?{type:b.type,capacity:b.capacity,before:b.charge,after:beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId)?(Math.round(b.charge*10)-Math.round(cost*10))/10:b.charge-cost,spent:cost,physicalShots:amount,
    ...(beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId)&&weapon.laserModifications?{
      fireMode:laserConfiguration(weapon).mode,beforeUnits:Math.round(b.charge*10),afterUnits:Math.round(b.charge*10)-Math.round(cost*10),spentUnits:Math.round(cost*10),unitsPerStandardShot:10}:{}),
    ...(electrolaserWeapon(weapon)?{fireMode:electrolaserConfiguration(weapon).mode,unitsPerShot:electrolaserUnits(weapon)}:{}),
    ...(profile.completeSet?{cells:profile.cells,oneShot:!!profile.oneShot,chemical:!!profile.chemical}:{}),
    ...(profile.unitsPerStandardShot?{cells:profile.cells,unitsPerStandardShot:4,unitsPerShot:gaussUnits(weapon),speed:gaussSpeed(weapon)}:{}),
    source:(b.nonRechargeable?'UT19;':'')+profile.source,accounting:profile.accounting,
    ...(profile.nominalCapacity?{nominalCapacity:profile.nominalCapacity,feedSource:profile.feedSource}:{}),
    ...(Object.hasOwn(b,'nonRechargeable')?{nonRechargeable:b.nonRechargeable}:{}),
    ...(b.replacementId?{replacementId:b.replacementId}:{})}:null;
}
export function validateWeaponExecution(weapon, profile) {
  const modeId=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId;
  const deferred=ltDeferredExecutionReason(modeId??weapon?.standaloneModeId??weapon?.catalogModeId);if(deferred)throw Error(deferred);
  if(ltEarlyProfile(modeId)){
    const reason=ltEarlyReadiness(weapon,modeId);if(!weapon||reason||!profile.damage?.nativeSafe||!profile.resource?.ltEarlyCharges||JSON.stringify(profile.resource.ltEarlyCharges)!==JSON.stringify(ltEarlyShotPlan(weapon)))throw Error(reason??'Подготовленный физический состав LT не подтверждён для этого выстрела.');
  }
  if(nextElevenProfile(modeId)&&modeId!=='WUTSmartShuriken'&&(!weapon||!profile.damage?.nativeSafe||profile.damage.rules?.nextEleven?.modeId!==modeId||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Нужен действующий источниковый профиль устройства, без ETC/LP.');
  if(exoticBeamProfile(modeId)){
    const saved=profile.damage?.rules?.exoticBeam,c=exoticBeamConfiguration(weapon);
    if(!weapon||exoticBeamReason(weapon)||!profile.damage?.nativeSafe||saved?.modeId!==modeId||
      !sameBattery(c,Object.fromEntries(Object.keys(c).map(k=>[k,saved[k]])))||
      ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId))
      throw Error('Конфигурация энергетического оружия изменилась. Подготовьте атаку заново.');
  }
  if(sonicNeuralProfile(modeId)){
    const saved=profile.damage?.rules?.sonicNeural,c=sonicNeuralConfiguration(weapon);
    if(!weapon||sonicNeuralReason(weapon)||!profile.damage?.nativeSafe||saved?.modeId!==modeId||
      !sameBattery(c,Object.fromEntries(Object.keys(c).map(k=>[k,saved[k]])))||
      ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId))
      throw Error('Конфигурация Sonic/Neural изменилась. Подготовьте атаку заново.');
  }
  if(ppbProfile(modeId)){
    const saved=profile.damage?.rules?.plasmaParticle,config=ppbConfiguration(weapon);
    if(!weapon||!profile.damage?.nativeSafe||saved?.modeId!==modeId||!validPPBConfiguration(weapon)||
      ppbProfile(modeId).family==='blaster'&&!sameBattery(config,Object.fromEntries(Object.keys(config).map(k=>[k,saved[k]])))||
      ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId))
      throw Error('Энергетический профиль изменился. Подготовьте атаку заново.');
  }
  if(microwaveProfile(modeId)&&(!weapon||!profile.damage?.nativeSafe||profile.damage.rules?.utMicrowave!==modeId||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Конфигурация Microwave изменилась. Подготовьте атаку заново.');
  if(beamProfile(modeId)){
    const current=laserConfiguration(weapon),saved=profile.damage?.rules?.laserModifications;
    if((weapon.laserModifications||weapon.laserMode||weapon.laserEnvironment||saved)&&!sameBattery(current,saved))throw Error('Лазерная конфигурация изменилась. Подготовьте атаку заново.');
    if(current.mode==='dazzle'&&!laserFaceOrEyes(profile.context?.hitLocation))throw Error('Dazzle: выберите лицо или глаза цели. UT113.');
  }
  if(electrolaserProfile(modeId)&&(!weapon||!validElectrolaserConfiguration(weapon)||!profile.damage?.nativeSafe||
    profile.damage.rules?.electrolaser?.modeId!==modeId||!sameBattery(electrolaserConfiguration(weapon),
      Object.fromEntries(Object.keys(electrolaserConfiguration(weapon)).map(k=>[k,profile.damage.rules.electrolaser[k]])))||
    ![undefined,'ordinary'].includes(weapon.executionVariant)||modeId!==(weapon.standaloneModeId??weapon.catalogModeId)))
    throw Error('Конфигурация электролазера изменилась. Подготовьте атаку заново.');
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
import {ltDeferredExecutionReason} from '../lt-ranged-execution-policy.js';
