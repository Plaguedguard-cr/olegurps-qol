import { utBriefInstructions } from './ammunition-chat-summary.js';
import { UT_EXTENDED_SOURCE } from './ut-extended-source.js';
import { UT_RUNTIME_FAMILIES as UT_ALL_FAMILIES, reviewUTSpecial, utPayloadParameters } from './ut-special-ammunition.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { reviewSEFOP, reviewHoming, UT_HOMING_SOURCE } from './ut-sefop.js';
import { isUTConventionalVariant, reviewUTConventional } from './ut-conventional-ammunition.js';
import { isUTSpecialVariant } from './ut-special-ammunition.js';
import { HE_PROXIMITY } from './ut-he-proximity.js';
import { UT_SWARM_MINIMUM_MM, ICE_GUN } from '../ut-compatibility-policy.js';
// Extend the existing recipe/profile/component pipeline. No rolls, resource writes or target effects.
export const UT_EXTENDED_RULES = Object.freeze(Object.fromEntries(Object.entries({...UT_EXTENDED_SOURCE,ut_homing:UT_HOMING_SOURCE}).map(([key,r])=>
  [key,Object.freeze({id:r.id,kind:'warhead',label:r.name,note:true,source:r.source_ref,minTL:r.min_tl})])));
export const isUTExtendedVariant = id => Object.hasOwn(UT_EXTENDED_RULES,id??'');
export function reviewUTExtended(catalogs,compatibility,modeId,base,variantId,input={}) {
  const source=UT_EXTENDED_SOURCE[variantId]??(variantId==='ut_homing'?UT_HOMING_SOURCE:null);
  const carrier=reviewUTSpecial(catalogs,compatibility,modeId,base);
  const fail=(reason='UTVariantUnavailable',status='undetermined')=>({status,base:carrier.base,reason,facts:null});
  if(variantId==='ut_homing'&&(modeId===ICE_GUN||base.ammoId==='3mm_ice'))return fail('UTIceHomingExcluded','incompatible');
  if(!source||carrier.status!=='compatible'||base.ammoId==='3mm_ice')return fail();
  if(variantId==='ut_he'&&!['impact','proximity'].includes(input.fuze??'impact'))return fail('UTPayloadInvalid');
  const availabilityTL=input.availabilityTL??source.min_tl;
  if(!Number.isInteger(availabilityTL)||availabilityTL<source.min_tl||availabilityTL>12)return fail('UTAvailabilityRequired');
  const mode=catalogs.getMode(modeId),family=catalogs.getAmmoFamily('ut',base.ammoId),c=source.compatibility;
  const caliber=family.caliber_mm;
  if(variantId==='ut_homing'){
    if(Number.isInteger(family.tl)&&availabilityTL<family.tl)return fail('UTAvailabilityRequired');
    const homing=reviewHoming({caliberMm:caliber,availabilityTL,guidance:input.homingGuidance??'infrared'});
    if(!homing)return fail('UTHomingInvalid');
    const warheadVariant=input.warheadVariant===''?null:input.warheadVariant??null;
    if(warheadVariant!==null&&typeof warheadVariant!=='string')return fail('UTHomingChargeRequired');
    // SEFOP has its own already reviewed construction. A shotshell's individual pellet dimensions
    // are not established by the outer cartridge diameter and cannot prove a sensor fits.
    if(['ut_homing','ut_sefop','ut_shotshell'].includes(warheadVariant))return fail('UTHomingChargeRequired');
    const warhead=warheadVariant ? isUTConventionalVariant(warheadVariant)?reviewUTConventional(catalogs,compatibility,modeId,base,warheadVariant):
      isUTSpecialVariant(warheadVariant)?reviewUTSpecial(catalogs,compatibility,modeId,base,warheadVariant):
      Object.hasOwn(UT_EXTENDED_SOURCE,warheadVariant)?reviewUTExtended(catalogs,compatibility,modeId,base,warheadVariant,input):null : carrier;
    if(!warhead||warhead.status!=='compatible')return fail(warhead?.reason??'UTHomingChargeRequired',warhead?.status);
    return {status:'compatible',base:carrier.base,construction:warhead.construction??carrier.base,reason:null,
      facts:{...warhead.facts,availabilityTL,definition:{id:'homing',source:'UT146'},homing,warheadVariant}};
  }
  if(source.id==='swarm'&&caliber<UT_SWARM_MINIMUM_MM)return fail('UTSwarmMinimum40','incompatible');
  const minimum=c.min_size_mm_by_tl?.[availabilityTL]??c.min_size_mm;
  if(minimum!=null&&caliber<minimum||c.max_size_exclusive_mm!=null&&caliber>=c.max_size_exclusive_mm)return fail('UTVariantUnavailable','incompatible');
  if(c.base_damage_types_any&&!c.base_damage_types_any.includes(mode.stats?.damage?.type))return fail('UTVariantUnavailable','incompatible');
  let construction=compatibility.checkCompatibility(modeId,source.id,{book:'ut',kind:'warhead',availabilityTL});
  const sefop=source.id==='sefop'?reviewSEFOP({caliberMm:caliber,availabilityTL,input}):null;
  if(source.id==='sefop'){
    if(!sefop)return fail('UTSEFOPInvalid');
    // UT135/146 explicitly allow a sized guided round in these reviewed guns. The concrete recipe
    // supplies its sensor; the catalog's generic unguided carrier default is not that construction.
    if(['undetermined','incompatible'].includes(construction.status)&&construction.reasons?.length&&
      mode.ammunition_profile.supports_exotic_warheads===true&&mode.ammunition_profile.platform_tags.includes('gun')&&
      construction.reasons.every(r=>['HOMING_UNCONFIRMED','HOMING_REQUIRED'].includes(r.code)))
      construction={...construction,status:'compatible',manualSEFOP:sefop};
  }
  const jammer25=source.id==='expendable_jammer'&&caliber===25;
  if(construction.status!=='compatible'&&!jammer25)return fail('UTVariantUnavailable',construction.status);
  let row=source.damage_table?.[mode.ammunition_profile.warhead_class];
  if(sefop?.mode==='aphex')row=UT_EXTENDED_SOURCE.ut_aphex.damage_table?.[mode.ammunition_profile.warhead_class];
  const setting=input.setting??(source.id==='mininuke'?'0.01kt':source.id==='micro_antimatter'?'0.1ug':null);
  if(['mininuke','micro_antimatter'].includes(source.id))row=source.damage_table[setting];
  if(source.damage_table&&!row&&!jammer25)return fail('UTWarheadTableRequired');
  const radiusValue=jammer25?25:row?.radius_yards??row?.illumination_radius_yards;
  const radius=radiusValue!=null?{applicable:true,yards:radiusValue,units:'yards',origin:jammer25?'manual':'reference',
    source:jammer25?'owner-entered':source.source_ref,
    effectKind:source.id==='flare'?'illumination':'area'}:null;
  return {status:'compatible',base:carrier.base,construction,reason:null,facts:{...carrier.facts,
    availabilityTL,definition:{id:source.id,source:source.source_ref},row:structuredClone(row??{}),radius,setting,...(sefop?{sefop}:{}),
    sourceConditions:[...(source.superscience?['superscience']:[]),...(availabilityTL>9?['TL'+availabilityTL]:[])]}};
}
export function utExtendedParameters(review,input={}) {
  const payload=utPayloadParameters(review,input),id=review.facts.definition.id;
  const result={...payload,availabilityTL:review.facts.availabilityTL};
  if(id==='homing')Object.assign(result,{homingGuidance:review.facts.homing.guidance,warheadVariant:review.facts.warheadVariant});
  if(id==='sefop')Object.assign(result,{sefopGuidance:review.facts.sefop.guidance,sefopMode:review.facts.sefop.mode,sefopAspect:review.facts.sefop.aspect});
  // Omit the historical Impact default to preserve existing recipe identities.
  if(id==='he'&&input.fuze==='proximity')result.fuze='proximity';
  if(review.facts.setting)result.setting=review.facts.setting;
  if(id==='stasis'){
    const durationSeconds=input.durationSeconds??300;
    if(!Number.isSafeInteger(durationSeconds)||durationSeconds<300||durationSeconds>31557600000000000)throw Error('UTPayloadInvalid');
    result.durationSeconds=durationSeconds;
  }
  if(id==='thermobaric'){
    result.atmosphere=input.atmosphere??'normal';
    if(!['normal','very-thin','trace','vacuum'].includes(result.atmosphere))throw Error('UTPayloadInvalid');
  }
  return result;
}
const normalized=s=>s?.replaceAll('\u00d7','x').replaceAll(',','');
// +1 per die applies inside a multiplier, without estimating means or borrowing HT dice bands.
export function utAddPerDie(formula,enabled) {
  const text=normalized(formula),m=text?.match(/^(\d+)d([+-]\d+)?(x\d+)?(.*)$/);
  if(!m)throw Error('UTWarheadTableRequired');
  const adds=Number(m[2]??0)+(enabled?Number(m[1]):0);
  return m[1]+'d'+(adds?adds>0?'+'+adds:String(adds):'')+(m[3]??'')+m[4];
}
export function resolveUTExtendedEffects({raw,variantId,baseStatus,constructionStatus,facts={},previousTransformations=[]},
    {parseKineticDamage,parseDamageRange,resolveEffects}) {
  if(variantId==='ut_homing'){
    const invalid=()=>({status:'unresolved',nativeSafe:false,rawFormula:raw?.damage,formula:raw?.damage,variantId,
      reason:'UTHomingInvalid',components:[],transformations:[],rules:{}});
    const h=reviewHoming({caliberMm:facts.caliberMm,availabilityTL:facts.availabilityTL,guidance:facts.payload?.homingGuidance});
    if(!h||JSON.stringify(h)!==JSON.stringify(facts.homing)||baseStatus!=='compatible'||constructionStatus!=='compatible'||
      facts.sourceEdition!=='Ultra-Tech 2007'||UT_ALL_FAMILIES[facts.modeId]!==facts.ammoId||facts.ammoId==='3mm_ice'||
      ['ut_homing','ut_sefop','ut_shotshell'].includes(facts.warheadVariant)||!facts.payload)return invalid();
    const w=facts.warhead;
    if(facts.warheadVariant&&(!w||w.variantId!==facts.warheadVariant))return invalid();
    const effect=resolveEffects({raw,variantId:w?.variantId??null,baseStatus,constructionStatus,
      facts:w?.facts??{},previousTransformations});
    if(!effect.nativeSafe)return effect;
    const chargeBrief=w?utBriefInstructions(w.variantId,{...w.facts,payload:w.facts.payload,rules:effect.rules,source:w.source}):[];
    const chargeSource=chargeBrief.filter(line=>/^(UT|HT)\d/.test(line)).join('; ')||w?.source;
    const rules={...effect.rules,sourceEdition:'Ultra-Tech 2007',manualHoming:{...h,
      halfDamageIsSpeed:true,projectileSpeedYardsPerSecond:parseDamageRange(effect.effectiveChanges?.range??raw?.range)?.halfDamage??null},
      availabilityTL:facts.availabilityTL,payload:structuredClone(facts.payload),physicalShotsPerAttack:1,
      weightPerShotLb:effect.rules.weightPerShotLb??facts.weightPerShotLb,guidanceCostFactor:1+h.guidanceSurcharge,
      warheadCostPerShot:effect.rules.costPerShot??facts.baseCostPerShot,
      costPerShot:w?null:facts.baseCostPerShot*(1+h.guidanceSurcharge),
      componentOrder:effect.rules.componentOrder??effect.components.map(c=>c.role),
      ammunitionSource:['UT146',chargeSource].filter(Boolean).join('; '),
      warheadBrief:chargeBrief.filter(line=>!/^(UT|HT)\d/.test(line))};
    rules.instructions=utBriefInstructions(variantId,{...facts,payload:facts.payload,rules,source:rules.ammunitionSource});
    return {...effect,variantId,rules};
  }
  const source=UT_EXTENDED_SOURCE[variantId],original=String(raw?.damage??'');
  const fail=reason=>({status:'unresolved',nativeSafe:false,rawFormula:original,formula:original,variantId,reason,components:[],transformations:[],rules:{}});
  if(!source||facts.sourceEdition!=='Ultra-Tech 2007'||UT_ALL_FAMILIES[facts.modeId]!==facts.ammoId||
      baseStatus!=='compatible'||constructionStatus!=='compatible'||!facts.payload||facts.definition?.id!==source.id)return fail('UTVariantUnavailable');
  if(source.id==='swarm'&&(!Number.isFinite(facts.caliberMm)||facts.caliberMm<UT_SWARM_MINIMUM_MM))return fail('UTSwarmMinimum40');
  if(raw.linked||raw.followup||raw.followUp||raw.components?.length||previousTransformations.some(t=>t.applied&&t.effectId===variantId))return fail('UTOriginalProfileRequired');
  const p=parseKineticDamage(original),range=parseDamageRange(raw.range),row=facts.row??{},tl=facts.availabilityTL;
  const sefop=source.id==='sefop'?reviewSEFOP({caliberMm:facts.caliberMm,availabilityTL:tl,input:facts.payload}):null;
  if(source.id==='sefop'&&(!sefop||JSON.stringify(sefop)!==JSON.stringify(facts.sefop)))return fail('UTSEFOPInvalid');
  const id=sefop?.mode==='aphex'?'aphex':source.id;
  if(!p||(p.divisor!==1&&!gaussProfile(facts.modeId))||p.suffix)return fail('UTOriginalProfileRequired');
  const components=[],instructions=[];
  const rules={sourceEdition:'Ultra-Tech 2007',utWarhead:true,payload:structuredClone(facts.payload),instructions,
    availabilityTL:tl,sourceConditions:facts.sourceConditions,physicalShotsPerAttack:1,
    weightPerShotLb:facts.weightPerShotLb,costMultiplier:source.economics.cost_multiplier,
    costPerShot:Number.isFinite(source.economics.cost_multiplier)?facts.baseCostPerShot*source.economics.cost_multiplier:null,
    legalityClass:source.economics.lc,componentOrder:[],instructionOnly:false};
  const changes={ammunitionProjectileKind:'slug'};
  if(sefop){
    rules.manualSEFOP={...sefop};
    // UT publishes the warhead and sensor prices separately, not a combined construction price.
    rules.warheadCostPerShot=Number.isFinite(facts.baseCostPerShot)?facts.baseCostPerShot*5:null;
    rules.guidanceCostFactor=1+sefop.guidanceSurcharge;
    rules.costPerShot=null;
    rules.costSource='UT146,154-155';
  }
  const add=(role,formula,relation='primary')=>{if(formula)components.push({role,formula:normalized(formula),relation,status:'resolved',source:source.source_ref,
    ...(relation==='follow_up'?{internalOnPenetration:true}:{})});};
  const piercing=(divisor,type=p.type)=>p.diceText+(divisor!==1?'('+divisor+')':'')+' '+type;
  if(id==='sefop') {
    add('kinetic',utAddPerDie(row.damage,tl>=10));
  } else if(id==='he'&&facts.payload.fuze==='proximity') {
    if(tl<9||facts.caliberMm<10||!row.fragmentation)return fail('UTVariantUnavailable');
    add('fragmentation',row.fragmentation,'fragmentation');
    rules.heProximity={...HE_PROXIMITY};rules.attackBonus=4;rules.primaryDamageRole='fragmentation';
  } else if(id==='aphex'||id==='he'||id==='hec') {
    add('kinetic',piercing(id==='aphex'?2:id==='hec'&&gaussProfile(facts.modeId)?1:0.5));
    add(id==='hec'?'linked':'follow-up',utAddPerDie(row.followup??row.explosion??row.linked,tl>=10),id==='hec'?'linked':'follow_up');
    add('fragmentation',row.fragmentation,'fragmentation');
  } else if(id==='shaped_charge'||id==='hemp') {
    add('kinetic',utAddPerDie(row.primary,tl>=(id==='hemp'?11:10)));
    add('linked',row.linked,'linked');add('fragmentation',row.fragmentation,'fragmentation');
  } else if(id==='aphd') {
    const types=['pi-','pi','pi+','pi++'],type=types[Math.max(0,types.indexOf(p.type)-(facts.caliberMm<20?1:0))];
    add('kinetic',piercing(5,type));if(!range)return fail('UTRangeRequired');
    changes.range=range.halfDamage*2+'/'+range.maximum*2;
  } else if(id==='memory_baton') {
    add('kinetic',piercing(0.25,'cr dkb'));if(!range)return fail('UTRangeRequired');
    changes.range=range.halfDamage/5+'/'+range.maximum/5;
  } else if(id==='monochain') {
    add('kinetic',piercing(1));if(!range)return fail('UTRangeRequired');
    changes.range=range.halfDamage/2+'/'+range.maximum/2;rules.resultDivisors={kinetic:2};rules.attackBonus=1;
    // The visible primary defaults to the weapon type; the location-dependent component is a separate alternative.
    add('main-charge',piercing(10,'cut'),'alternative');rules.resultDivisors['main-charge']=2;
  } else if(id==='burrow_darts') {
    add('kinetic',piercing(0.5));
  } else if(id==='stingray') {
    add('kinetic',piercing(0.25));add('linked',row.linked,'linked');rules.resultDivisors={kinetic:2};
  } else if(id==='thermobaric') {
    add('kinetic',utAddPerDie(row.damage,tl>=10));
    const divisor=facts.payload.atmosphere==='very-thin'?2:['trace','vacuum'].includes(facts.payload.atmosphere)?4:1;
    rules.resultDivisors={kinetic:divisor};
  } else if(id==='plasma'||id==='force') {
    add('kinetic',row.damage);
  } else if(id==='mininuke'||id==='micro_antimatter'||id==='implosion') {
    add('kinetic',row.primary);add('linked',row.linked,'linked');
    rules.setting=facts.setting;
    if(id==='micro_antimatter'){
      const micrograms={'0.1ug':0.1,'1ug':1,'10ug':10}[facts.setting],pricePerMicrogram={10:2500,11:25,12:5}[tl];
      rules.fillerCost= micrograms*pricePerMicrogram;
      rules.costPerShot=facts.baseCostPerShot*10+rules.fillerCost;
      rules.costSource='Ultra-Tech 2007, pp. 88, 157';
    }
    rules.manualComponentApplication=true;
  } else if(id==='flare') {
    add('kinetic','1d burn');
  } else if(id==='emp') {
    add('kinetic',row.damage.match(/\d+d(?:[+-]\d+)? cr ex/)?.[0]);
  } else {
    rules.instructionOnly=true;
  }
  instructions.push(...utBriefInstructions(variantId,{...facts,payload:facts.payload,source:source.source_ref,rules}));
  if(changes.range){const r=parseDamageRange(changes.range);changes.halfd=r?.halfDamage;}
  rules.componentOrder=components.map(c=>c.role);
  const formula=components.find(c=>c.role===(rules.primaryDamageRole??'kinetic'))?.formula??null;
  if(rules.instructionOnly)changes.damage=null;
  return {status:'resolved',nativeSafe:true,rawFormula:original,formula,variantId,reason:null,components,rules,effectiveChanges:changes,
    transformations:[{effectId:variantId,source:source.source_ref,field:'damage',from:original,to:formula,applied:true,order:1}]};
}

// Reuse GGA's completed roll; never approximate fractional dice or spend another round.
export function applyUTDamageResult(payload,rules,role='kinetic') {
  const divisor=rules?.resultDivisors?.[role];
  if(![2,4].includes(divisor)||payload.olegurpsUTDivision)return payload;
  if(!Number.isFinite(payload.damage))throw Error('Урон GGA не содержит численного результата.');
  const damage=Math.floor(payload.damage/divisor);
  return {...payload,damage,olegurpsUTDivision:{divisor,original:payload.damage},
    explainLineTwo:`Урон UT: ${payload.damage} ÷ ${divisor} = ${damage}.`,hasExplanation:true};
}
