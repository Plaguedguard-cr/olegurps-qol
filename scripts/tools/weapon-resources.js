import { exoticBeamWeapon } from '../ut-exotic-beam-source.js';
import {sonicShuriken,SONIC_SHURIKEN} from '../ut-sonic-shuriken-source.js';
import {nextElevenWeapon} from '../ut-next-eleven-source.js';
import { weaponPowerProfile, readWeaponBattery, weaponPowerReason, weaponPowerEvidence,
  validateWeaponExecution, sameBattery, weaponBatteryHTML, weaponPowerCost } from './weapon-power.js';
import { lpProfile, lpFireMode, LP_FIRE_MODES, lpFuelReason, readLPFuel, lpText, lpFeedReason } from './ut-liquid-propellant.js';
import { magazineFill } from './ammo-inventory.js';
import { uawWeaponView } from './ut-uaw.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { useSealedResource } from './ammunition-resource-contract.js';
import { validateLTWeaponAmmunition } from './ammunition-resource-contract.js';
import { beamWeapon } from '../ut-beam-source.js';
import { htLaserWeapon } from '../ht-laser-source.js';
import { utDazzlerWeapon } from '../ut-dazzler-source.js';
import { electrolaserWeapon } from '../ut-electrolaser-source.js';
import { microwaveWeapon } from '../ut-microwave-source.js';
import { ppbWeapon } from '../ut-plasma-particle-source.js';
import { sonicNeuralWeapon } from '../ut-sonic-neural-source.js';

export const resourceOnlyWeapon=weapon=>(sonicShuriken(weapon)?SONIC_SHURIKEN:null)??(nextElevenWeapon(weapon)?.id==='shuriken'?null:nextElevenWeapon(weapon))??beamWeapon(weapon)??htLaserWeapon(weapon)??utDazzlerWeapon(weapon)??electrolaserWeapon(weapon)??microwaveWeapon(weapon)??ppbWeapon(weapon)??sonicNeuralWeapon(weapon)??exoticBeamWeapon(weapon);
export function weaponResourceLabel(weapon){
  if(!resourceOnlyWeapon(weapon))return null;
  const p=weaponPowerProfile(weapon);if(!p)return null;
  const b=readWeaponBattery(weapon,p),cell=p.oneShot?'Встроенный заряд':p.label??(p.cells>1?p.cells+'×':'')+p.cellSize+' cell';
  return cell+': '+(b?.charge??0)+'/'+(b?.capacity??p.capacity);
}

export function htSupplyProfiles(weapon) {
  const p=htPreGaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
  return [...p?.supplies??[],...(p?.externalPower?[{id:'external',label:'Компрессор и внешнее питание',capacity:1,manual:true}]:[])];
}
export function readHTSupply(weapon,supply) {
  const saved=weapon?.htSupplies?.[supply.id];
  return saved&&saved.capacity===supply.capacity&&Number.isSafeInteger(saved.remaining)&&saved.remaining>=0&&saved.remaining<=saved.capacity?saved:null;
}
export function htSupplyReason(weapon,amount=1) {
  const jet=htPreGaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
  if(jet?.continuousUnits&&weapon?.htJetMode==='continuous'&&
    (weapon.magazines?.[weapon.loadedIndex]??0)<jet.continuousUnits*amount)
    return 'Для десятисекундной струи Beattie M2-2 нужны пять подготовленных зарядов в резервуаре.';
  for(const p of htSupplyProfiles(weapon)) {
    const s=readHTSupply(weapon,p);
    if(!s||s.remaining<(p.manual?1:amount))return p.manual?'Подтвердите подключение компрессора, шланга и внешнего питания в окне «Патроны».':
      p.label+': ресурс отсутствует или недостаточен. Явно установите новый ресурс в окне «Патроны».';
  }
  return null;
}
export function htSupplyEvidence(weapon,amount) {
  const reason=htSupplyReason(weapon,amount);if(reason)throw Error(reason);
  return htSupplyProfiles(weapon).map(p=>{const s=readHTSupply(weapon,p);return {id:p.id,label:p.label,capacity:p.capacity,
    before:s.remaining,after:s.remaining-(p.manual?0:amount),spent:p.manual?0:amount,
    manualEquipment:!!p.manual,source:'HT28',replacementId:s.replacementId};});
}
export function consumeHTSupplies(weapon,evidence) {
  for(const e of evidence) {
    const p=htSupplyProfiles(weapon).find(p=>p.id===e.id),s=p&&readHTSupply(weapon,p);
    if(!s||s.remaining!==e.before||s.replacementId!==e.replacementId)throw Error('Ресурс Nail Gun изменился во время атаки.');
  }
  for(const e of evidence)weapon.htSupplies[e.id].remaining=e.after;
}

// One active consumable per feed. A fuel bottle retains its own schema and
// receipt key; existing batteries and their saved evidence remain unchanged.
export function weaponResourceProfile(weapon,modeId=null) {
  const fuel=lpProfile(weapon,modeId);
  if(fuel)return {...fuel,kind:'fuel',receiptKey:'fuel'};
  const power=weaponPowerProfile(weapon,modeId);
  return power?{...power,kind:'power',receiptKey:'power'}:null;
}
export const readWeaponResource = (weapon,profile=weaponResourceProfile(weapon)) => profile?.kind==='fuel'?
  readLPFuel(weapon,profile):readWeaponBattery(weapon,profile);
export function weaponResourceReason(weapon,amount=1,modeId=null) {
  return htSupplyReason(weapon,amount)??lpFuelReason(weapon,amount,modeId)??weaponPowerReason(weapon,amount,modeId);
}
export function weaponResourceEvidence(weapon,amount,spent=amount,profile=weaponResourceProfile(weapon)) {
  if(profile?.kind!=='fuel')return weaponPowerEvidence(weapon,amount,spent,profile);
  const fuel=readLPFuel(weapon,profile),fireMode=lpFireMode(weapon),rate=LP_FIRE_MODES[fireMode]?.units;
  return fuel&&rate?{capacityUnits:fuel.capacityUnits,beforeUnits:fuel.remainingUnits,afterUnits:fuel.remainingUnits-spent*rate,
    spentUnits:spent*rate,physicalShots:amount,fireMode,unitsPerShot:rate,source:'UT139',
    nominalCapacity:profile.nominalCapacity,feedSource:profile.feedSource,
    ...(fuel.replacementId?{replacementId:fuel.replacementId}:{})}:null;
}
export function consumeWeaponResource(weapon,amount,profile=weaponResourceProfile(weapon)) {
  if(profile?.kind==='fuel')weapon.lpFuel.remainingUnits-=amount*LP_FIRE_MODES[lpFireMode(weapon)].units;
  else if(profile){
    if(profile.oneShot)useSealedResource(weapon[profile.stateKey]);
    if(beamWeapon(weapon))weapon[profile.stateKey].charge=(Math.round(weapon[profile.stateKey].charge*10)-Math.round(weaponPowerCost(weapon,amount,profile)*10))/10;
    else weapon[profile.stateKey].charge-=weaponPowerCost(weapon,amount,profile);
  }
}
export function validateWeaponResources(weapon,profile,ammunition=null) {
  validateWeaponExecution(weapon,profile);
  if(weapon?.executionVariant==='lp'||profile?.weaponConfiguration?.variant==='lp') {
    const id=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId;
    if(weapon?.executionVariant!=='lp'||profile?.weaponConfiguration?.variant!=='lp'||!lpProfile(weapon,id)||
      id!==(weapon.standaloneModeId??weapon.catalogModeId)||profile.weaponConfiguration.fireMode!==lpFireMode(weapon))throw Error(lpText('Changed'));
    const reason=lpFeedReason(weapon,ammunition);if(reason)throw Error(reason);
  }
}
export const sameWeaponResource = sameBattery;
export function validateWeaponShotResources(actor,profile,amount=1,attack=null) {
  const modeId=profile?.binding?.confirmed?.modeId??profile?.mode?.standaloneRef?.modeId??attack?.standaloneRef?.modeId;
  const weapons=actor?.getFlag?.('world','gurpsAmmoManager')?.weapons??[];
  const weapon=uawWeaponView({weapons},weapons.find(w=>w.id===profile?.weaponId)??weapons.find(w=>w.standaloneWeaponId===attack?.standaloneRef?.weaponId&&w.standaloneModeId===modeId));
  validateLTWeaponAmmunition(actor, weapon);
  validateWeaponResources(weapon,profile);
  const reason=weaponResourceReason(weapon,amount,modeId);if(reason)throw Error(reason);
}
export function weaponResourceHTML(weapon,selected,escape) {
  const profile=lpProfile(weapon);if(!profile)return weaponBatteryHTML(weapon,selected,escape);
  const fuel=readLPFuel(weapon),units=fuel?.remainingUnits??0,capacity=fuel?.capacityUnits??profile.capacityUnits;
  return `<button type="button" class="gam-battery gam-lp-fuel ${selected?'selected':''}" data-ammo-action="select-battery" data-weapon-id="${escape(weapon.id)}" aria-pressed="${!!selected}" aria-label="LP ${units/4}/${capacity/4}" title="${escape(lpFuelReason(weapon)??lpText('Fuel'))}">`+
    `<span class="gam-battery-text"><span>LP</span><span>${units/4}/${capacity/4}</span></span>`+
    `<span class="gam-fuel-bottle" aria-hidden="true"><span class="gam-fuel-liquid" style="height:${100*units/capacity}%;background:hsl(${magazineFill(units,capacity).hue} 78% 43%)"></span></span></button>`;
}
