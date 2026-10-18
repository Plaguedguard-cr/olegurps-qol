import { htDamageDice, parseKineticDamage, parseDamageRange } from './kinetic-damage-math.js';
import { parseCampaignTL } from './tech-level.js';
import { moduleText } from '../localization.js';

export const lpText = key => moduleText('OleGURPS.LP.' + key);
// Individually checked UT137-138, 2007. N excludes the chamber; the computed LP
// capacities are the UT139 conversion with the user's B9 rounding decision.
const rows = [
  ['WngbnzWRwLntvaRbR','7_5mm_clp',18,1,3,240,137],
  ['WlqvLkGz-INk0A-_o','7_5mm_clp',30,1,3,450,137],
  ['W9chB7ydzOWTAxQP0','10mm_clp',20,1,3,540,137],
  ['WIAo1otMCstnbi4Dv','15mm_clp',9,1,3,870,137],
  ['W5_0Tkbdr1S4b4Hlv','10mm_clp',30,1,3,750,137],
  ['WoLIvHFqsiusWgmXF','5_7mm_cl',100,1,5,1000,137],
  ['WFc8O-LgWxenUseNy','7mm_cl',50,1,3,1600,137],
  ['W30vD5BH3t_VdkWUZ','10mm_cl',50,1,3,1800,137],
  ['W3Ggl5bTeg_44b_rU','10mm_clr',12,1,3,2700,137],
  ['WeFF7cHxefAAGmowq','7mm_cl',10,1,3,800,137],
  ['WlstnlxI_Mm-2UJf0','15mm_cl',10,0,3,8000,137],
  ['WdUnAFzFvv59Smhhk','25mm_cl',8,1,3,8000,137],
  ['WgqAB3QGTUZrgtdES','25mm_cl',34,0,5,17000,138],
  ['WYYJ_58OEKOTk38wi','5_7mm_cl',200,0,5,2400,137],
  ['W6-C_sQqk0Ak_c-8_','7mm_cl',400,0,5,14000,138],
  ['W6bX3WBkGZdZfoeMu','15mm_cl',50,0,5,34000,138],
  ['WmyROTLk0gs7lrYCE','10mm_clr',60,0,5,11000,138],
  ['WtM51JNSpOUIy3Eo1','10mm_clp',40,1,3,2100,137]
];
export const LP_PROFILES = Object.freeze(Object.assign(Object.create(null),Object.fromEntries(rows.map(([modeId,familyId,baseNominal,chamber,reload,basePrice,page]) => {
  const nominalCapacity = Math.floor(baseNominal * 1.5), capacity = 3 * nominalCapacity;
  return [modeId,Object.freeze({modeId,familyId,baseNominal,chamber,reload,basePrice,nominalCapacity,capacity,
    capacityUnits:capacity*4,minimumTL:9,source:'UT139',feedSource:'UT'+page,stateKey:'lpFuel',
    baseShots:baseNominal+(chamber?'+'+chamber:'')+'('+reload+')',
    shots:nominalCapacity+(chamber?'+'+chamber:'')+'('+reload+')'})];
}))));
export const LP_FIRE_MODES = Object.freeze({
  standard:Object.freeze({units:4,rangeFactor:1,label:'Standard'}),
  boosted:Object.freeze({units:6,rangeFactor:1.3,label:'Boosted'}),
  'low-velocity':Object.freeze({units:1,rangeFactor:0.5,label:'LowVelocity',hearingModifier:-3})
});
export const lpProfile = (weapon,modeId=null) => weapon?.executionVariant==='lp' ?
  LP_PROFILES[modeId??weapon.standaloneModeId??weapon.catalogModeId]??null : null;
export const lpFireMode = weapon => weapon?.lpFireMode ?? 'standard';
export function lpBlocker(modeId,configurationId=modeId) {
  if(configurationId?.endsWith(':storm-rifle-magazine'))return lpText('AlternativeFeed');
  if(LP_PROFILES[modeId])return null;
  return lpText(modeId==='WOMuCBSS_c_nIstvm'?'Tank':modeId==='W5_HQQYf_zjoG9A7J'?'LSW':
    ['W8mzf5YoC9fFjAhO2','WwK7xKN4sLQXIuQ64','Wap9nUEQPwuDkUEUp','WkudgdqO3lymAYks5','WRvS5pz3LMCzqQyiZ'].includes(modeId)?'Shotgun':'Unsupported');
}
export function lpAdmission(modeId,catalogs,campaignTL=null) {
  const profile=LP_PROFILES[modeId],mode=catalogs?.getMode(modeId);
  if(!profile||catalogs?.getEquipmentForMode(modeId)?.source!=='UT'||
    mode?.ammunition_profile?.primary_ammo_family_id!==profile.familyId)return {allowed:false,reason:lpBlocker(modeId)??lpText('Unsupported')};
  const limit=parseCampaignTL(campaignTL);
  return {allowed:limit===null||limit>=9,requiredTL:9,profile,reason:limit!==null&&limit<9?lpText('TL'):null};
}
export const newLPFuel = profile => ({capacityUnits:profile.capacityUnits,remainingUnits:profile.capacityUnits});
export function readLPFuel(weapon,profile=lpProfile(weapon)) {
  const fuel=weapon?.lpFuel;
  return profile&&fuel?.capacityUnits===profile.capacityUnits&&Number.isSafeInteger(fuel.remainingUnits)&&
    fuel.remainingUnits>=0&&fuel.remainingUnits<=fuel.capacityUnits ? fuel : null;
}
export function lpFuelReason(weapon,amount=1,modeId=null,fireMode=lpFireMode(weapon)) {
  if(weapon?.executionVariant!=='lp')return null;
  const profile=lpProfile(weapon,modeId),mode=Object.hasOwn(LP_FIRE_MODES,fireMode)?LP_FIRE_MODES[fireMode]:null;
  if(!profile)return lpBlocker(modeId??weapon.standaloneModeId??weapon.catalogModeId);
  if(!mode)return lpText('Invalid');
  const fuel=readLPFuel(weapon,profile);
  return !fuel?lpText('Missing'):fuel.remainingUnits===0?lpText('Empty'):
    !Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(amount*mode.units)||amount*mode.units>fuel.remainingUnits?lpText('Insufficient'):null;
}
export function lpBallistics(raw,modeId,fireMode='standard',{boostPiercingDamage=true}={}) {
  const profile=LP_PROFILES[modeId],mode=(Object.hasOwn(LP_FIRE_MODES,fireMode)?LP_FIRE_MODES[fireMode]:null),p=parseKineticDamage(raw?.damage),range=parseDamageRange(raw?.range);
  if(!profile||!mode||!p||!range||raw.linked||raw.followup||raw.followUp||raw.components?.length)throw Error(lpText('Original'));
  let dice=p.diceText;
  if(fireMode==='boosted'&&boostPiercingDamage) {
    const adds=p.adds+p.dice;
    dice=p.dice*p.multiplier>12?htDamageDice(p.dice,adds,p.multiplier):
      p.dice+'d'+(adds?adds>0?'+'+adds:adds:'')+(p.multiplier!==1?'x'+p.multiplier:'');
  } else if(fireMode==='low-velocity')dice=htDamageDice(p.dice,p.adds,p.multiplier,0.5);
  return {...raw,damage:dice+(p.divisor!==1?'('+p.divisor+')':'')+p.minimum+' '+p.type+p.suffix,
    range:fireMode==='standard'?raw.range:Math.round(range.halfDamage*mode.rangeFactor)+'/'+Math.round(range.maximum*mode.rangeFactor),
    halfd:Math.round(range.halfDamage*mode.rangeFactor),shots:profile.shots};
}
export function applyLPExecutionRequest(weapon,current,request,catalogs,campaignTL) {
  const admission=lpAdmission(request.modeId,catalogs,campaignTL);
  if(!admission.allowed)throw Error(admission.reason);
  if(weapon.standaloneModeId&&weapon.standaloneModeId!==request.modeId)throw Error(lpText('Unsupported'));
  weapon.catalogModeId=request.modeId;
  if(!current?.lpConfigured&&current?.executionVariant!=='lp'&&!Object.hasOwn(weapon,'lpFuel'))weapon.lpFuel=newLPFuel(admission.profile);
  weapon.lpConfigured=true;weapon.lpFireMode??='standard';weapon.executionVariant='lp';
}
// Resize only source-sized/previously converted feed objects. Never clamp rounds,
// change batches, or treat the alternate Storm Rifle feed as an LP feed.
export function adaptLPFeed(weapon,current) {
  const p=LP_PROFILES[weapon.standaloneModeId??weapon.catalogModeId];
  if(!p||!weapon.lpConfigured&&weapon.executionVariant!=='lp'&&current?.executionVariant!=='lp')return;
  const capacity=(weapon.executionVariant==='lp'?p.nominalCapacity:p.baseNominal)+p.chamber;
  for(const magazine of weapon.ammunitionInventory?.magazines??[]) {
    if(magazine.capacity===p.baseNominal+p.chamber||magazine.capacity===p.nominalCapacity+p.chamber||magazine.lpFeedAdapted) {
      magazine.capacity=Math.max(capacity,magazine.rounds);magazine.lpFeedAdapted=true;
      magazine.sourceFeed={...magazine.sourceFeed,source:p.feedSource+';UT139',sourceShots:weapon.executionVariant==='lp'?p.shots:p.baseShots,
        magazineCapacity:capacity-p.chamber,chamberCapacity:p.chamber,loadedCapacity:capacity};
    }
  }
}
export function lpFeedReason(weapon,ammunition) {
  if(weapon?.executionVariant!=='lp'||(weapon.standaloneModeId??weapon.catalogModeId)!=='WmyROTLk0gs7lrYCE')return null;
  const magazine=weapon.ammunitionInventory?.magazines.find(m=>m.id===ammunition?.magazineId);
  return magazine&&(!magazine.lpFeedAdapted&&magazine.capacity!==90||magazine.sourceFeed?.feed==='storm-rifle-magazine')?lpText('AlternativeFeed'):null;
}
