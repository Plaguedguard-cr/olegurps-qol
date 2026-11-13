// Hand-delivery profiles only. The catalogs remain the source for charge tables.
import {chemicalOptions,attachBiochemicalEffect} from './biochemical-integration.js';
import {UT_SWARM_TYPES,utSwarmType} from '../ut-swarm-source.js';
import {UT_LIQUID_DOSES} from '../ut-errata.js';
import {grenText as t} from './grenade-localization.js';
import {UT_BODY_NAMES,utWarheadName,utChemicalName,utSwarmName} from './ut-nomenclature.js';

const copy=value=>structuredClone(value);
export const UT_GRENADE_BODIES=Object.freeze([
  {id:'thimble25',name:'Thimble Grenade',size:25,weight:.06,cost:2.5},
  {id:'mini40',name:'Mini Hand Grenade',size:40,weight:.25,cost:10},
  {id:'saucer40',name:'Saucer Grenade',size:40,weight:.5,cost:40,saucer:true},
  {id:'hand64',name:'Hand Grenade',size:64,weight:1,cost:40}
].map(Object.freeze));
export const UT_THROWABLE_PAYLOADS=Object.freeze(['biochemical_aerosol','biochemical_liquid','flare','he','hec','tangler','thermobaric','emp','expendable_jammer','strobe','warbler','swarm','mininuke','micro_antimatter','force','plasma','implosion','psi_bomb','message_psi_bomb','terror_psi_bomb','stasis','vortex']);
export const utBodyLabel=body=>UT_BODY_NAMES[body.id]??body.name;
export const utPayloadLabel=payload=>utWarheadName(payload.id??payload)??payload.name??String(payload);
export function utGrenadePayloads(catalogs,bodyId,tl){
  const body=UT_GRENADE_BODIES.find(b=>b.id===bodyId);
  if(!body||!Number.isInteger(tl)||tl<9||tl>12)return [];
  return UT_THROWABLE_PAYLOADS.map(id=>catalogs?.getVariant('ut',id)).filter(p=>{
    if(!p||tl<p.min_tl)return false;
    const c=p.compatibility??{},minimum=c.min_size_mm_by_tl?.[tl]??c.min_size_mm??0;
    if(body.size<minimum||c.max_size_exclusive_mm!=null&&body.size>=c.max_size_exclusive_mm)return false;
    const row=p.damage_table?.[body.size+'mm'];
    return ['mininuke','micro_antimatter'].includes(p.id)?minimum>0&&!!p.damage_table:
      !!row&&(row.official_radius!==false||p.id==='expendable_jammer'&&body.size===25&&row.radius_yards===25);
  });
}
const delivery=id=>id==='biochemical_aerosol'?'aerosol':id==='biochemical_liquid'?'liquid':null;
export function utGrenadeChoices(payloadId,tl){
  const d=delivery(payloadId);
  if(d)return chemicalOptions({recipe:{variantId:'ut_'+payloadId}}).filter(f=>f.tl<=Number(tl));
  if(payloadId==='swarm')return Object.values(UT_SWARM_TYPES).filter(s=>s.tl<=Number(tl));
  return [];
}
export function normalizeUTGrenadeSelection(value,catalogs){
  const result=copy(value),p=utGrenadePayloads(catalogs,result.bodyId,Number(result.tl)).find(p=>p.id===result.payloadId);
  if(!p)result.payloadId='';
  const id=result.payloadId;
  if(!delivery(id)||!utGrenadeChoices(id,result.tl).some(f=>f.id===result.chemicalId))result.chemicalId='';
  if(id!=='swarm'||!utGrenadeChoices(id,result.tl).some(s=>s.id===result.swarmType))result.swarmType='';
  if(!['mininuke','micro_antimatter'].includes(id)||!Object.hasOwn(p?.damage_table??{},result.setting??''))result.setting='';
  if(id!=='message_psi_bomb')result.message='';
  if(id!=='stasis'){result.durationValue='';result.durationUnit='minutes';}
  if(!delivery(id)&&id!=='swarm')result.payloadNote='';
  return result;
}
function scalar(text){
  const m=/^(\d+d(?:[+-]\d+)?(?:[x×]\d+)?)(?:\((\d+(?:\.\d+)?)\))? (cr|burn|cut|tox)(.*)$/.exec(String(text??'').replace(/,/g,''));
  return m?{formula:m[1].replace('×','x'),divisor:Number(m[2]??1),type:m[3],modifiers:m[4].trim()}:null;
}
function addPerDie(text){
  const m=/^(\d+)d([+-]\d+)?(?:[x×](\d+))?(.*)$/.exec(text);if(!m)throw Error(t('InvalidFormula'));
  const adds=Number(m[2]??0)+Number(m[1]);return m[1]+'d'+(adds?(adds>0?'+':'')+adds:'')+(m[3]?'x'+m[3]:'')+m[4];
}
function duration(selection){
  const factors={minutes:60n,hours:3600n,days:86400n,years:31557600n},value=Number(selection.durationValue),unit=selection.durationUnit;
  if(!Number.isSafeInteger(value)||value<1||!Object.hasOwn(factors,unit))throw Error(t('ChooseDuration'));
  const seconds=BigInt(value)*factors[unit];if(seconds<300n||seconds>1000000000n*factors.years)throw Error(t('ChooseDuration'));
  return {value,unit,seconds:seconds<=BigInt(Number.MAX_SAFE_INTEGER)?Number(seconds):String(seconds),source:'UT159/193'};
}
export function resolveUTGrenade(selection,catalogs){
  const body=UT_GRENADE_BODIES.find(b=>b.id===selection?.bodyId),payload=utGrenadePayloads(catalogs,body?.id,selection?.tl).find(p=>p.id===selection?.payloadId);
  if(!payload)throw Error(t('ChooseUTCombination'));
  const id=payload.id,tl=selection.tl,setting=selection.setting??'',specialSetting=['mininuke','micro_antimatter'].includes(id);
  if(specialSetting&&!Object.hasOwn(payload.damage_table,setting))throw Error(t('ChooseSetting'));
  const parameters=copy(payload.damage_table[specialSetting?setting:body.size+'mm']);
  if(id==='biochemical_liquid')parameters.doses=UT_LIQUID_DOSES[body.size]??parameters.doses;
  let primary=parameters.explosion??parameters.primary??parameters.damage??parameters.linked??'';
  if(tl>=10&&['he','hec','thermobaric'].includes(id))primary=addPerDie(primary);
  const empBlast=id==='emp'?primary.match(/(\d+d(?:[+-]\d+)?) cr ex$/)?.[0]:null;
  const blast=scalar(empBlast??primary),fragments=scalar(parameters.fragmentation),effect={version:1,family:id,components:[],rules:[],source:payload.source_ref,manualConsequences:true};
  let radius=parameters.radius_yards??parameters.illumination_radius_yards??null,cost=body.cost*(payload.economics?.cost_multiplier??1),extraReady=0,extraName='';
  const add=(text,falloff='triple-distance',key='primary')=>{const c=scalar(text);if(!c)throw Error(t('InvalidFormula'));effect.components.push({...c,key,falloff,nativeSafe:!(c.type==='tox'&&c.modifiers.includes('rad')),radiation:c.modifiers.includes('rad'),nativeModifier:id==='implosion'&&c.type==='cr'?'nkb':c.modifiers.includes('dkb')?'dkb':c.modifiers.includes('sur')?'sur':''});};
  if(['he','hec','thermobaric','plasma','force'].includes(id))add(primary,id==='thermobaric'?'double-distance':'triple-distance');
  if(id==='emp'&&empBlast)add(empBlast);
  if(id==='mininuke'){add(primary);add(parameters.linked,'distance','linked');effect.setting=setting;extraReady=1;effect.rules.push(t('RuleMininuke'));}
  if(id==='micro_antimatter'){
    add(primary,'distance');add(parameters.linked,'distance-squared','linked');effect.setting=setting;
    const micrograms=Number(setting.replace('ug','')),price={10:2500,11:25,12:5}[tl];
    effect.antimatter={micrograms,costPerMicrogram:price,source:'UT88/156–157'};cost+=micrograms*price;effect.rules.push(t('RuleAntimatter'));
  }
  if(id==='implosion'){add(parameters.primary);add(parameters.linked,'distance','linked');effect.knockback='inward';effect.rules.push(t('RuleImplosion'));}
  if(specialSetting)extraName=setting.replace('kt',' kt').replace('ug',' µg');
  if(id==='force'){effect.knockback='outward';effect.rules.push(t('RuleForce'));}
  if(id==='thermobaric')effect.rules.push(t('RuleThermobaric'));
  if(delivery(id)){
    const chemical=utGrenadeChoices(id,tl).find(f=>f.id===selection.chemicalId);if(!chemical)throw Error(t('ChooseSubstance'));
    const rules=attachBiochemicalEffect({rules:{payload:{radius:{yards:radius}},doses:parameters.doses}},
      {recipe:{variantId:'ut_'+id,parameters:{chemicalId:chemical.id}}}).rules;
    effect.chemical=copy(rules.chemical);effect.resistanceEffect=copy(rules.resistanceEffect??null);radius=effect.chemical.radius;
    effect.chemical.superscience=chemical.superscience===true;
    effect.chemical.lc=chemical.lc??null;
    effect.chemical.cloud=id==='biochemical_aerosol'?{stillAirSeconds:300,windDuration:'300 / wind mph (at least 1 mph)',manual:true,source:'UT153/159'}:{persistent:true,ends:'cleanup or evaporation',manual:true,source:'UT153'};
    if((chemical.id==='mea'||chemical.baseId?.startsWith('dominator'))&&!String(selection.payloadNote??'').trim())throw Error(t('ChoosePayloadNote'));
    effect.chemical.payloadNote=String(selection.payloadNote??'');effect.kind='chemical';extraName=utChemicalName(chemical.id);
    effect.rules.push(chemical.brief,chemical.protection,t(id==='biochemical_liquid'?'RuleLiquid':'RuleAerosol'));
    effect.costPerDose=chemical.cost;effect.fillerCost=chemical.cost==null?null:chemical.cost*parameters.doses;
    cost=effect.fillerCost==null?null:cost+effect.fillerCost;
  }
  if(id==='swarm'){
    const swarm=utSwarmType(selection.swarmType);if(!swarm||swarm.tl>tl)throw Error(t('ChooseSwarm'));
    if(swarm.id==='cannibal'&&!String(selection.payloadNote??'').trim())throw Error(t('ChoosePayloadNote'));
    effect.kind='swarm';effect.swarm={...copy(swarm),count:body.size===40?1:4,areaPerSwarm:1,note:String(selection.payloadNote??''),standardPowerHours:{10:12,11:72,12:120}[tl],durationSeconds:swarm.id==='disassembler'?30:null,powerConfiguration:'manual',source:swarm.source+'; UT35–37/156'};
    const prices={cannibal:15000,devourer:8000,disassembler:10000,gremlin:2000,sentry:5000,stinger:1500,terminator:1500};
    effect.swarm.costPerSquareYard=swarm.costPerSquareYard??prices[swarm.id];cost+=effect.swarm.costPerSquareYard*effect.swarm.count;
    effect.rules.push(swarm.brief,t('RuleSwarm'));extraName=utSwarmName(swarm.id);radius=null;
  }
  if(['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(id)){
    effect.kind=id==='terror_psi_bomb'?'fright':'affliction';effect.attribute=id==='terror_psi_bomb'?'Fright Check':'Will';effect.modifier=id==='message_psi_bomb'?-2:-5;
    if(id==='message_psi_bomb'){const message=String(selection.message??'').trim();if(!message||message.length>2000)throw Error(t('ChooseMessage'));effect.message=message;}
    effect.rules.push(t(id==='psi_bomb'?'RulePsi':id==='message_psi_bomb'?'RuleMessage':'RuleTerror'));
  }
  if(id==='stasis'){effect.kind='procedure';effect.duration=duration(selection);effect.rules.push(t('RuleStasis'));}
  if(id==='vortex'){effect.kind='procedure';effect.rules.push(t('RuleVortex'));}
  if(['emp','strobe','warbler','flare','tangler','expendable_jammer'].includes(id)){effect.kind=id==='emp'||id==='strobe'||id==='warbler'||id==='flare'?'affliction':'procedure';effect.rules.push(t('Rule_'+id));}
  effect.kind??=effect.components.length?'components':'procedure';
  const effects=copy(payload.combat_effect?.hint?.details_ru??[]);
  if(effect.chemical||effect.swarm)for(let i=effects.length-1;i>=0;i--)if(/(?:конкретн|газ|веществ|вид роботов).*Notes/i.test(effects[i]))effects.splice(i,1);
  if(['he','hec'].includes(id))effects.splice(0,effects.length,t('RuleHE'));
  const projectRadius=id==='expendable_jammer'&&body.size===25;
  if(id==='expendable_jammer'){const index=effects.findIndex(e=>e.includes('Радиус 25 мм'));if(index>=0)effects.splice(index,1);}
  if(projectRadius)effects.push(t('RuleJammer25'));
  effects.push(...effect.rules);
  if(body.saucer)effects.push(t('RuleSaucer'));
  effect.radius=radius;effect.parameters=copy(parameters);effect.cost=cost;effect.lc=effect.chemical?.lc??effect.swarm?.lc??payload.economics?.lc??null;
  const summary=effect.components.length?effect.components.map(c=>c.formula+' '+c.type+' '+c.modifiers).join(' + '):
    effect.chemical?extraName+' · '+parameters.doses+' '+t('Doses'):effect.swarm?extraName+' · '+effect.swarm.count+' × 1 '+t('SquareYard'):
    effect.duration?utPayloadLabel(payload)+' · '+effect.duration.value+' '+t(effect.duration.unit):parameters.resist?parameters.resist:primary==='spec.'?utPayloadLabel(payload):primary;
  const specified=delivery(id)?effect.chemical.id:id==='swarm'?effect.swarm.id:specialSetting?setting:'';
  return {id:'ut:'+body.id+':'+id+':'+tl+(specified?':'+specified:''),name:utBodyLabel(body)+' / '+utPayloadLabel(payload)+(extraName?' / '+extraName:''),book:'UT',tl,superscience:payload.superscience===true||effect.chemical?.superscience===true,
    bodyId:body.id,payloadId:id,diameter:body.size,weight:body.weight,cost,lc:effect.lc,saucer:!!body.saucer,requiredST:body.saucer?5:null,ready:1,configurationReady:extraReady,
    source:'UT146–147; '+payload.source_ref,blast:blast&&/\bex\b/.test(blast.modifiers)?blast:null,fragments,primary:summary||null,parameters,effects,radius,payloadEffect:effect,
    ...(projectRadius?{radiusProvenance:{kind:'project-approved',source:'OleGURPS QOL',yards:25,bookTable:'UT157',official:false}}:{}),
    fuse:{modes:['time','smart-time','command','impact','anti-tamper'],delays:[2],start:'release',maxDelay:1209600},specialBlast:!['he','hec','plasma','emp'].includes(id)};
}
