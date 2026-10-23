// Ultra-Tech 4e, Version 1.0 (2007), printed pp. 135-139, 152, 154.
// Explicit source identities, never a caliber/name join. No Actor or catalog writes.
import { UT_ADDITIONAL_FAMILIES, UT_AIR_KINETIC_FAMILIES } from './ut-ammunition-scope.js';
import { UAW_FEEDS } from './ut-uaw.js';
import { etcBallistics } from './ut-etc.js';
import { GAUSS_FAMILIES, gaussProfile } from '../ut-gauss-source.js';
import {UT_GYROC_FAMILIES,UT_MISSILE_FAMILIES,UT_PLB_FAMILIES,physicalFamilyMatches,physicalRangedProfile,missileSourceTL} from '../ut-physical-ranged-source.js';
export const UT_CONVENTIONAL_MODES = Object.freeze({
  WngbnzWRwLntvaRbR:'7_5mm_clp', 'WlqvLkGz-INk0A-_o':'7_5mm_clp',
  W9chB7ydzOWTAxQP0:'10mm_clp', WIAo1otMCstnbi4Dv:'15mm_clp',
  W5_0Tkbdr1S4b4Hlv:'10mm_clp', WoLIvHFqsiusWgmXF:'5_7mm_cl',
  'WFc8O-LgWxenUseNy':'7mm_cl', W30vD5BH3t_VdkWUZ:'10mm_cl',
  W3Ggl5bTeg_44b_rU:'10mm_clr', WeFF7cHxefAAGmowq:'7mm_cl',
  'WlstnlxI_Mm-2UJf0':'15mm_cl', WdUnAFzFvv59Smhhk:'25mm_cl',
  W5_HQQYf_zjoG9A7J:'7mm_cl', WgqAB3QGTUZrgtdES:'25mm_cl',
  WOMuCBSS_c_nIstvm:'100mm_cl', W8mzf5YoC9fFjAhO2:'18_5mm_pc',
  WwK7xKN4sLQXIuQ64:'18_5mm_pc', Wap9nUEQPwuDkUEUp:'18_5mm_pc',
  WkudgdqO3lymAYks5:'18_5mm_pc'
});
export const UT_CONVENTIONAL_DEFERRED = Object.freeze({});
// UT136; user decision 2026-10-15. Audit metadata only, no energy resource or UI requirement.
export const UT_MANUAL_MOTOR_POWER = Object.freeze({
  WYYJ_58OEKOTk38wi:{familyId:'5_7mm_cl',cell:'B',shots:19500},
  'W6-C_sQqk0Ak_c-8_':{familyId:'7mm_cl',cell:'C',minutes:15},
  WmyROTLk0gs7lrYCE:{familyId:'10mm_clr',cell:'B',minutes:15},
  W6bX3WBkGZdZfoeMu:{familyId:'15mm_cl',cell:'C',minutes:15}
});
export const UT_CONVENTIONAL_READY_MODES = Object.freeze({...UT_CONVENTIONAL_MODES,
  ...Object.fromEntries(Object.entries(UAW_FEEDS).map(([id,r])=>[id,r.familyId])),
  ...Object.fromEntries(Object.entries(UT_MANUAL_MOTOR_POWER).map(([id,r])=>[id,r.familyId]))});
export const UT_CONVENTIONAL_RULES = Object.freeze({
  ut_aphc:{id:'aphc',label:'APHC',divisor:2,shift:-1,costFactor:2,lc:2,rangeFactor:1,source:'Ultra-Tech 2007, p. 152'},
  ut_apds:{id:'apds',label:'APDS',divisor:2,shift:-1,costFactor:5,lc:1,rangeFactor:1.5,addsPerDie:1,source:'Ultra-Tech 2007, p. 152'},
  ut_apep:{id:'apep',label:'APEP',divisor:3,shift:-1,costFactor:10,lc:1,rangeFactor:2,source:'Ultra-Tech 2007, p. 152'},
  ut_hp:{id:'hp',label:'HP',divisor:0.5,shift:1,costFactor:1,lc:4,rangeFactor:1,source:'Ultra-Tech 2007, p. 154'},
  ut_shotshell:{id:'shotshell',label:'\u0414\u0440\u043e\u0431\u044c',costFactor:1,lc:4,rangeFactor:0.5,source:'Ultra-Tech 2007, p. 154'}
});
export const UT_KINETIC_MODES = Object.freeze({...UT_CONVENTIONAL_MODES,...UT_ADDITIONAL_FAMILIES,...UT_AIR_KINETIC_FAMILIES,...GAUSS_FAMILIES,...UT_GYROC_FAMILIES,...UT_MISSILE_FAMILIES,...UT_PLB_FAMILIES});
export const isUTConventionalVariant = id => Object.hasOwn(UT_CONVENTIONAL_RULES,id??'');
export function utConventionalFeed(modeId, shots) {
  if(!UT_CONVENTIONAL_READY_MODES[modeId])return null;
  return parseUTSourceFeed(shots,'Ultra-Tech 2007, pp. 137-138');
}
export function parseUTSourceFeed(shots,source) {
  const m=String(shots??'').match(/^(\d+)(?:\+(\d+))?\((\d+)(i)?\)$/);
  if(!m)return null;
  return {source,sourceShots:shots,magazineCapacity:Number(m[1]),
    chamberCapacity:Number(m[2]??0),loadedCapacity:Number(m[1])+Number(m[2]??0),
    reloadSeconds:Number(m[3]),individualReload:!!m[4],accounting:'loaded-rounds-including-chamber',
    reloadTiming:'manual-existing-Ready-actions'};
}
export function utConventionalReadiness(modeId, raw) {
  if(UT_CONVENTIONAL_DEFERRED[modeId])return UT_CONVENTIONAL_DEFERRED[modeId];
  if(modeId==='WkudgdqO3lymAYks5' && (!/^-\d+$/.test(String(raw?.bulk??'')) || Number(raw.bulk)>-3 ||
      !/^\d+[\u2020\u2021BM]*$/.test(String(raw?.st??''))))return 'UTHostParametersRequired';
  return null;
}
export function reviewUTConventional(catalogs,compatibility,modeId,base,variantId=null) {
  const rule=UT_CONVENTIONAL_RULES[variantId],family=physicalFamilyMatches(modeId,base?.ammoId)?base.ammoId:UT_KINETIC_MODES[modeId];
  const linked=compatibility?.checkCompatibility(modeId,base?.ammoId,{book:base?.book,kind:base?.kind});
  const mode=catalogs?.getMode(modeId),record=catalogs?.getAmmoFamily('ut',family);
  const sourceVerified=catalogs?.getCatalog('weapons')?.sources?.some(s=>s.code==='UT'&&
    s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1') &&
    catalogs?.getCatalog('ut')?.compatibility_pointer_source_sha256==='cc4d4286bce5eba3936081da60d77a62dee781630c0803cb73fa982fc7723933';
  if(base?.book!=='ut'||base?.kind!=='ammo-family'||!family||base.ammoId!==family||
      linked?.status!=='compatible'||!sourceVerified||!(mode?.ammunition_profile?.primary_ammo_family_id===family||physicalFamilyMatches(modeId,family))||!record||
      (!gaussProfile(modeId)?.nail&&(!Number.isFinite(record.cps_usd)||record.cps_usd<=0))||!Number.isFinite(record.wps_lb)||record.wps_lb<=0)
    return {status:'undetermined',reason:'UTPlatformDeferred',base:linked,facts:null};
  if(family==='15mm_micromissile'&&variantId==='ut_shotshell')return {status:'incompatible',reason:'UTVariantUnavailable',base:linked,facts:null};
  const construction=rule?compatibility.checkCompatibility(modeId,rule.id,{book:'ut',kind:'warhead',availabilityTL:record.tl}):linked;
  return {status:construction.status,reason:construction.status==='compatible'?null:'UTVariantUnavailable',base:linked,construction,
    facts:{sourceEdition:'Ultra-Tech 2007',modeId,ammoId:family,caliberMm:record.caliber_mm,
      baseCostPerShot:record.cps_usd,weightPerShotLb:record.wps_lb,availabilityTL:record.tl,...(record.missile_economics?{missileEconomics:record.missile_economics,projectileTL:missileSourceTL(modeId)}:{})}};
}
export function resolveUTConventionalEffects({raw,variantId,baseStatus,constructionStatus,facts={},previousTransformations=[],context={}},
    {parseKineticDamage,parseDamageRange,htDamageDice}) {
  const rule=UT_CONVENTIONAL_RULES[variantId],formula=String(raw?.damage??'');
  const result={status:'resolved',nativeSafe:true,rawFormula:formula,formula,variantId,reason:null,transformations:[],components:[],rules:{sourceEdition:'Ultra-Tech 2007'}};
  const fail=reason=>({...result,status:'unresolved',nativeSafe:false,formula,reason});
  if(!rule||facts.sourceEdition!=='Ultra-Tech 2007'||!(UT_KINETIC_MODES[facts.modeId]===facts.ammoId||physicalFamilyMatches(facts.modeId,facts.ammoId))||
      baseStatus!=='compatible'||constructionStatus!=='compatible')return fail('UTVariantUnavailable');
  if(previousTransformations.some(t=>t.applied&&t.effectId===variantId))return fail('UTOriginalProfileRequired');
  const p=parseKineticDamage(formula),single=physicalRangedProfile(facts.modeId)?.group==='gyroc'?Number(String(raw?.range).replaceAll(',','')):NaN,
    range=parseDamageRange(raw?.range)??(single>0?{halfDamage:single,maximum:single}:null);
  if(variantId==='ut_hp' && (!Number.isFinite(facts.caliberMm)||facts.caliberMm>=15))return fail('UTVariantUnavailable');
  if(!p||!Number.isSafeInteger(p.dice)||p.dice<1||!Number.isSafeInteger(p.multiplier)||p.multiplier<1||
      (p.divisor!==1&&!gaussProfile(facts.modeId))||p.suffix||raw.linked||raw.followup||raw.followUp||raw.components?.length||raw.ammunitionEffects?.length||
      (variantId!=='ut_shotshell'&&!/^\d+!?$/.test(String(raw.rof??''))))
    return fail('UTOriginalProfileRequired');
  const journal=(field,from,to)=>result.transformations.push({source:rule.source,sourceEdition:'Ultra-Tech 2007',effectId:variantId+':'+field,
    field,from,to,applied:from!==to,order:result.transformations.length+1,reason:'verified-UT-rule-on-original-profile'});
  let dice=p.diceText,type=p.type;
  if(variantId==='ut_shotshell'){
    const rof=String(raw.rof??'').match(/^(\d+)(!)?$/);
    if(p.type!=='pi++'||p.multiplier!==1&&!['gyroc','plb'].includes(physicalRangedProfile(facts.modeId)?.group)||!rof)return fail('UTShotshellOriginalRequired');
    if(p.dice%4||p.adds%4){
      // Only the verified ETC conversion of a previously divisible shotgun gets
      // HT166 fractional dice. A bare/custom 5d still fails the original guard.
      const execution=context.weaponConfiguration,base=parseKineticDamage(execution?.baseline?.damage);
      let converted=null;
      if(execution?.variant==='etc'&&execution.modeId===facts.modeId&&base?.type==='pi++'&&
        base.dice%4===0&&base.adds%4===0&&base.multiplier===1)
        try{converted=etcBallistics({...raw,...execution.baseline},facts.modeId);}catch{/* Unverified baseline remains blocked. */}
      if((converted?.damage!==formula||converted?.range!==raw.range)&&!['gyroc','plb'].includes(physicalRangedProfile(facts.modeId)?.group))return fail('UTShotshellOriginalRequired');
      dice=htDamageDice(p.dice,p.adds,p.multiplier,0.25);
    }else{
      const adds=p.adds/4;dice=p.dice/4+'d'+(adds?adds>0?'+'+adds:String(adds):'');
    }
    type='pi';
    result.effectiveChanges={rof:rof[1]+'x9'+(rof[2]??''),rcl:1,ammunitionProjectileKind:'shot'};
    result.rules.projectiles={physicalShotsMax:Number(rof[1]),count:9,kind:'shot',b409Eligible:true,source:rule.source};
    journal('rof',raw.rof,result.effectiveChanges.rof);journal('rcl',raw.rcl,1);
  }else{
    if(rule.addsPerDie){const adds=p.adds+p.dice*rule.addsPerDie;dice=p.dice+'d'+(adds?adds>0?'+'+adds:String(adds):'')+(p.multiplier!==1?'x'+p.multiplier:'');}
    if(!Number.isFinite(facts.caliberMm))return fail('UTVariantUnavailable');
    const shift=rule.shift>0?rule.shift:facts.caliberMm<20?rule.shift:0;
    type=['pi-','pi','pi+','pi++'][Math.max(0,Math.min(3,['pi-','pi','pi+','pi++'].indexOf(p.type)+shift))];
    result.effectiveChanges={ammunitionProjectileKind:'slug'};
  }
  if(rule.rangeFactor!==1){
    if(!range)return fail('UTRangeRequired');
    result.effectiveChanges.range=(range.halfDamage*rule.rangeFactor)+'/'+(range.maximum*rule.rangeFactor);
    result.effectiveChanges.halfd=range.halfDamage*rule.rangeFactor;
    journal('range',raw.range,result.effectiveChanges.range);
  }
  result.formula=dice+(rule.divisor&&rule.divisor!==1?'('+rule.divisor+')':'')+' '+type;
  result.rules.costMultiplier=rule.costFactor;result.rules.costPerShot=facts.baseCostPerShot*rule.costFactor;
  result.rules.weightPerShotLb=facts.weightPerShotLb;
  result.rules.legalityClass=rule.lc;
  journal('damage',formula,result.formula);
  result.transformations.push({effectId:variantId,source:rule.source,sourceEdition:'Ultra-Tech 2007',applied:true,order:result.transformations.length+1});
  result.components.push({role:'kinetic',status:'resolved',formula:result.formula});return result;
}
