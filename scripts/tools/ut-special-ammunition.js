import {CHEMICAL_SUBSTANCES,chemicalAllowed} from './biochemical-catalog.js';
import {UT_SWARM_TYPES,utSwarmType} from '../ut-swarm-source.js';
import {chemicalEditorHTML} from './biochemical-integration.js';
import { utBriefInstructions } from './ammunition-chat-summary.js';
import { UT_CONVENTIONAL_MODES, UT_CONVENTIONAL_RULES } from './ut-conventional-ammunition.js';
import { moduleText } from '../localization.js';
import { UT_ADDITIONAL_FAMILIES } from './ut-ammunition-scope.js';
import { UT_EXTENDED_SOURCE } from './ut-extended-source.js';
import { UT_LIQUID_DOSES } from '../ut-errata.js';
import { PARTISAN_NEEDLER, PARTISAN_EXTERNAL_DART } from '../ut-compatibility-policy.js';
import { UT_SEFOP_GUIDANCE, UT_HOMING_SOURCE, reviewHoming } from './ut-sefop.js';
import { GAUSS_FAMILIES } from '../ut-gauss-source.js';
import {UT_GYROC_FAMILIES,UT_MISSILE_FAMILIES,UT_PLB_FAMILIES,physicalFamilyMatches,missileSourceTL} from '../ut-physical-ranged-source.js';
// Ultra-Tech 4e, Version 1.0 (2007), printed pp. 139-140, 153, 155, 159-162.
// Source identities only; a substance name is neither compatibility nor effect evidence.
export const UT_SPECIAL_MODES = Object.freeze({
  WRsVDXjeX3ABpRPVp:'3mm_n', WfcQvWVcsBWPUShFm:'3mm_n', WGRshSOWjRXli8vBQ:'3mm_n', WTVT6tvGqOqE1N6e6:'3mm_n',
  W5Xb6neoqVfdlbqiS:'15mm_air', Wg_f0E5hqv6o1C0Uj:'15mm_air', 'WSv_Zh3pW3Tl-tCf5':'25mm_t', WPa4KUGJ6449MaPL9:'25mm_t',
  'WPP4GGv21sVx2-CHg':'3mm_ice'
});
export const UT_SPECIAL_RULES = Object.freeze({
  ut_drugged_dart:{id:'drugged_dart',kind:'special-load',label:'Игла с препаратом',note:true,source:'Ultra-Tech 2007, pp. 139, 161'},
  ut_drugged_ice:{id:'drugged_ice_sliver',kind:'special-load',label:'Ледяная игла с препаратом',note:true,source:'Ultra-Tech 2007, p. 140'},
  ut_paint:{id:'paint_pellet',kind:'special-load',label:'Краска',note:true,source:'Ultra-Tech 2007, p. 139'},
  ut_solid_slug:{id:'solid_slug_25mm_tangler_gun',kind:'special-load',label:'Твёрдая пуля',source:'Ultra-Tech 2007, p. 139'},
  ut_tangler:{id:'tangler',kind:'warhead',label:'Tangler',instructionOnly:true,source:'Ultra-Tech 2007, p. 155'},
  ut_biochemical_aerosol:{id:'biochemical_aerosol',kind:'warhead',label:'Biochemical Aerosol',note:true,instructionOnly:true,source:'Ultra-Tech 2007, pp. 153, 159-160'},
  ut_biochemical_liquid:{id:'biochemical_liquid',kind:'warhead',label:'Biochemical Liquid',note:true,instructionOnly:true,source:'Ultra-Tech 2007, pp. 153, 160-161'}
});
export const isUTSpecialVariant = id => Object.hasOwn(UT_SPECIAL_RULES,id??'');
// Paint Carbine energy is checked against its saved resource at attack time.
// Empty batteries do not prohibit stocking or loading physical ammunition.
export const utSpecialReadiness = () => null;
const text=(key,data={})=>moduleText('OleGURPS.UTPayload.'+key,data);
export function utPayloadEditorHTML(option,draft,escape,{open=false,campaignTL=null,homingWarheads=[]}={}) {
  const guided=option?.recipe?.variantId==='ut_homing';
  const definition=UT_EXTENDED_SOURCE[option?.recipe?.variantId]??(guided?UT_HOMING_SOURCE:null);
  const rule=UT_SPECIAL_RULES[option?.recipe?.variantId]??(definition?{note:true}:null);
  if(!rule?.note&&!option?.recipe?.parameters?.radius)return '';
  const p=draft??option.recipe.parameters, radius=p?.radius;
  const charge=guided?(Object.hasOwn(UT_EXTENDED_SOURCE,p.warheadVariant??'')?UT_EXTENDED_SOURCE[p.warheadVariant]:null):definition;
  const swarm=charge?.id==='swarm',swarmType=swarm?utSwarmType(p.swarmType):null;
  const substance = ['ut_paint','ut_drugged_dart','ut_drugged_ice','ut_biochemical_aerosol','ut_biochemical_liquid']
    .includes(guided ? p.warheadVariant : option.recipe.variantId);
  const caliber = option.recipe?.autoProfile?.facts?.caliberMm;
  const levels = definition ? [9,10,11,12].filter(tl => tl >= definition.min_tl &&
    (campaignTL == null || tl <= campaignTL || option.inventoryOnly && tl === p.availabilityTL) &&
    (caliber == null || caliber >= (charge?.compatibility.min_size_mm_by_tl?.[tl] ?? charge?.compatibility.min_size_mm ?? 0)) &&
    (!charge||tl>=charge.min_tl) && (!guided||reviewHoming({caliberMm:caliber,availabilityTL:tl,guidance:p.homingGuidance}))) : [];
  const sensors = Object.keys(UT_SEFOP_GUIDANCE).filter(id => {
    const minimum=UT_SEFOP_GUIDANCE[id].minSizeByTL[p.availabilityTL];
    return minimum != null && (caliber == null || caliber >= minimum);
  });
  return `<details data-ut-payload data-ammo-key="${escape(option.key??'')}" ${open?'open':''}><summary>${escape(text('Content'))}</summary><div class="gam-payload-fields">`+
    chemicalEditorHTML({...option,recipe:{...option.recipe,parameters:p}},p,escape,{campaignTL})+
    `<label>${escape(text(substance ? 'Note' : 'PlainNote'))}<input type="text" name="ut-note" maxlength="500" value="${escape(p?.note??'')}"></label>`+
    (swarm?`<label>${escape(text('SwarmType'))}<select name="ut-swarmType"><option value="" ${!p.swarmType?'selected':''}>${escape(text('SwarmUnspecified'))}</option>`+
      Object.values(UT_SWARM_TYPES).map(s=>`<option value="${s.id}" ${p.swarmType===s.id?'selected':''} ${s.tl>p.availabilityTL?'disabled':''}>${escape(s.name)} (TL${s.tl})</option>`).join('')+'</select></label>'+
      (swarmType?`<p class="hint" data-ut-swarm-rule>${escape(swarmType.brief+' '+text('SwarmManual')+' '+swarmType.source+'.')}</p>`:''):'')+
    (definition?`<label>${escape(text('AvailabilityTL'))}<select name="ut-availabilityTL">`+
      (guided&&!levels.includes(p.availabilityTL)?`<option value="${escape(p.availabilityTL)}" selected disabled>TL${escape(p.availabilityTL)} — ${escape(text('HomingInvalidChoice'))}</option>`:'')+
      levels.map(tl=>`<option value="${tl}" ${p.availabilityTL===tl?'selected':''}>TL${tl}${definition.superscience?'^':''}</option>`).join('')+'</select></label>':'')+
    (guided?`<label>${escape(text('HomingSensor'))}<select name="ut-homingGuidance">`+
      (!sensors.includes(p.homingGuidance)?`<option value="${escape(p.homingGuidance)}" selected disabled>${escape(text('HomingInvalidChoice'))}</option>`:'')+
      sensors.map(value=>`<option value="${value}" ${p.homingGuidance===value?'selected':''}>${escape(text('SEFOPSensor_'+value))}${UT_SEFOP_GUIDANCE[value].superscience?'^':''}</option>`).join('')+`</select></label>`+
      `<label>${escape(text('HomingCharge'))}<select name="ut-warheadVariant"><option value="" ${!p.warheadVariant?'selected':''}>${escape(text('HomingInert'))}</option>`+
      (p.warheadVariant&&!homingWarheads.some(t=>t.recipe.variantId===p.warheadVariant)?`<option value="${escape(p.warheadVariant)}" selected disabled>${escape(UT_EXTENDED_SOURCE[p.warheadVariant]?.name??UT_SPECIAL_RULES[p.warheadVariant]?.label??UT_CONVENTIONAL_RULES[p.warheadVariant]?.label??p.warheadVariant)} — ${escape(text('HomingInvalidChoice'))}</option>`:'')+
      [...new Map(homingWarheads.map(t=>[t.recipe.variantId,t])).values()].map(t=>`<option value="${escape(t.recipe.variantId)}" ${p.warheadVariant===t.recipe.variantId?'selected':''}>${escape(UT_EXTENDED_SOURCE[t.recipe.variantId]?.name??UT_SPECIAL_RULES[t.recipe.variantId]?.label??UT_CONVENTIONAL_RULES[t.recipe.variantId]?.label??t.name)}</option>`).join('')+`</select></label>`:'')+
    (charge&&['mininuke','micro_antimatter'].includes(charge.id)?`<label>${escape(text('Setting'))}<select name="ut-setting">${Object.keys(charge.damage_table).map(value=>`<option value="${value}" ${p.setting===value?'selected':''}>${value}</option>`).join('')}</select></label>`:'')+
    (charge?.id==='he'?`<label>${escape(text('HEFuze'))}<select name="ut-fuze">${['impact','proximity'].map(value=>`<option value="${value}" ${(p.fuze??'impact')===value?'selected':''}>${value==='impact'?'Impact':'Proximity'}</option>`).join('')}</select></label>`:'')+
    (charge?.id==='stasis'?`<label>${escape(text('DurationSeconds'))}<input name="ut-durationSeconds" type="number" min="300" step="1" value="${escape(p.durationSeconds??300)}"></label>`:'')+
    (charge?.id==='thermobaric'?`<label>${escape(text('Atmosphere'))}<select name="ut-atmosphere">${['normal','very-thin','trace','vacuum'].map(value=>`<option value="${value}" ${p.atmosphere===value?'selected':''}>${escape(text('Atmosphere_'+value))}</option>`).join('')}</select></label>`:'')+
    (definition?.id==='sefop'?`<label>${escape(text('SEFOPGuidance'))}<select name="ut-sefopGuidance">${sensors.map(value=>`<option value="${value}" ${p.sefopGuidance===value?'selected':''}>${escape(text('SEFOPSensor_'+value))}</option>`).join('')}</select></label>`+
      `<label>${escape(text('SEFOPMode'))}<select name="ut-sefopMode">${['sefop',...(p.availabilityTL>=10?['aphex']:[])].map(value=>`<option value="${value}" ${p.sefopMode===value?'selected':''}>${escape(text('SEFOPMode_'+value))}</option>`).join('')}</select></label>`+
      `<label>${escape(text('SEFOPAspect'))}<select name="ut-sefopAspect">${['top','side'].map(value=>`<option value="${value}" ${p.sefopAspect===value?'selected':''}>${escape(text('SEFOPAspect_'+value))}</option>`).join('')}</select></label>`:'')+
    `<div class="gam-payload-short-fields">`+
    (radius?`<label>${escape(text('Radius'))}<input name="ut-radius" type="number" min="0.001" max="100000" step="any" value="${escape(radius.yards??'')}"></label>`:'')+
    `<label>${escape(text('SavingThrow'))}<input type="text" name="ut-saving-throw" maxlength="500" value="${escape(p?.savingThrow??'')}"></label></div>`+
    `<label>${escape(text('Description'))}<textarea name="ut-description" rows="3" maxlength="5000">${escape(p?.description??'')}</textarea></label>`+
    `<button type="button" data-inventory-action="save-ut-payload">${escape(text('SaveBatch'))}</button>`+
    `<button type="button" data-inventory-action="create-ut-batch">${escape(text('NewBatch'))}</button></div></details>`;
}
export { ammunitionChatHTML as utPayloadChatHTML } from './ammunition-chat-summary.js';
export const UT_ALL_FAMILIES = Object.freeze({...UT_CONVENTIONAL_MODES,...UT_SPECIAL_MODES,...UT_ADDITIONAL_FAMILIES});
export const UT_RUNTIME_FAMILIES=Object.freeze({...UT_ALL_FAMILIES,...GAUSS_FAMILIES,...UT_GYROC_FAMILIES,...UT_MISSILE_FAMILIES,...UT_PLB_FAMILIES});
const families = UT_RUNTIME_FAMILIES;
const aerosol = {10:[null,1],15:[1,3],18.5:[1.5,5],25:[2,10],40:[4,40],64:[7,150],100:[10,300]};
const liquid = {15:[1,1],18.5:[1.5,2],25:[2,4],40:[4,16],64:[9,UT_LIQUID_DOSES[64]],100:[18,UT_LIQUID_DOSES[100]]};
export function reviewUTSpecial(catalogs,compatibility,modeId,base,variantId=null) {
  const rule=UT_SPECIAL_RULES[variantId],family=physicalFamilyMatches(modeId,base?.ammoId)?base.ammoId:families[modeId];
  const linked=compatibility?.checkCompatibility(modeId,base?.ammoId,{book:base?.book,kind:base?.kind});
  const record=catalogs?.getAmmoFamily('ut',family),mode=catalogs?.getMode(modeId);
  const verified=catalogs?.getCatalog('weapons')?.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1')&&
    catalogs?.getCatalog('ut')?.compatibility_pointer_source_sha256==='cc4d4286bce5eba3936081da60d77a62dee781630c0803cb73fa982fc7723933';
  const fail=(reason='UTVariantUnavailable',construction=null)=>({status:construction?.status??'undetermined',base:linked,construction,reason,facts:null});
  if(!verified||base?.source!=='catalog'||base.book!=='ut'||base.kind!=='ammo-family'||base.ammoId!==family||
    !(mode?.ammunition_profile?.primary_ammo_family_id===family||physicalFamilyMatches(modeId,family))||!record||linked?.status!=='compatible')return fail();
  if(variantId&&!rule)return fail();
  const construction=rule?compatibility.checkCompatibility(modeId,rule.id,{book:'ut',kind:rule.kind,availabilityTL:record.tl}):linked;
  if(construction.status!=='compatible')return fail('UTVariantUnavailable',construction);
  // Numeric table rows are mandatory; no interpolation between published warhead sizes.
  const row=variantId==='ut_biochemical_aerosol'?aerosol[record.caliber_mm]:variantId==='ut_biochemical_liquid'?liquid[record.caliber_mm]:null;
  if(rule?.instructionOnly&&variantId!=='ut_tangler'&&!row)return fail('UTRadiusSourceRequired');
  if(variantId==='ut_tangler'&&![25,40,64,100].includes(record.caliber_mm))return fail();
  return {status:'compatible',base:linked,construction,reason:null,facts:{sourceEdition:'Ultra-Tech 2007',modeId,ammoId:family,
    ...(modeId===PARTISAN_NEEDLER&&variantId==='ut_drugged_dart'?{ammunitionSupply:PARTISAN_EXTERNAL_DART}:{}),
    chemicalDelivery:variantId==='ut_biochemical_aerosol'?'aerosol':variantId==='ut_biochemical_liquid'?'liquid':['ut_drugged_dart','ut_drugged_ice'].includes(variantId)?'injection':null,
    caliberMm:record.caliber_mm,availabilityTL:record.tl,baseCostPerShot:record.cps_usd,weightPerShotLb:record.wps_lb,...(record.missile_economics?{missileEconomics:record.missile_economics,projectileTL:missileSourceTL(modeId)}:{}),
    doses:row?.[1]??(['ut_drugged_dart','ut_drugged_ice'].includes(variantId)?1:null),radius:row?.[0]!=null?{applicable:true,yards:row[0],units:'yards',origin:'reference',
      effectKind:variantId==='ut_biochemical_aerosol'?'cloud':'area',source:'Ultra-Tech 2007, p. 153'}:null,
    ...(variantId==='ut_tangler'&&[40,64].includes(record.caliber_mm)?{tanglerST:record.caliber_mm===40?24:36,tanglerLayer:2,
      ...(record.caliber_mm===64?{radius:{applicable:true,yards:1,units:'yards',origin:'reference',effectKind:'area',source:'UT155'}}:{})}:{}),
    ...(variantId==='ut_tangler'&&record.caliber_mm===100?{tanglerST:60,tanglerLayer:3,radius:{applicable:true,yards:1,units:'yards',origin:'reference',effectKind:'area',source:'Ultra-Tech 2007, p. 155'}}:{}),
    faceOnly:variantId==='ut_biochemical_aerosol'&&record.caliber_mm===10}};
}
export function utPayloadParameters(review, input={}) {
  if(!review.facts)throw Error('UTVariantUnavailable');
  const note=typeof input.note==='string'?input.note.trim():'';
  if(note.length>500)throw Error('UTPayloadInvalid');
  if(input.chemicalId!=null&&input.chemicalId!==''&&!chemicalAllowed(CHEMICAL_SUBSTANCES[input.chemicalId],review.facts.chemicalDelivery))throw Error('UTPayloadInvalid');
  const published=review.facts.radius;
  let radius=published?{...published}:null;
  if(input.radius!=null){
    if(!published||input.radius.units!=='yards'||input.radius.origin!=null&&!['manual','reference'].includes(input.radius.origin)||
      input.radius.yards!==null&&(!Number.isFinite(input.radius.yards)||input.radius.yards<=0||input.radius.yards>100000))throw Error('UTPayloadInvalid');
    if(input.radius.origin==='manual'||input.radius.yards!==published.yards)radius={...published,yards:input.radius.yards,origin:'manual',source:'owner-entered'};
  }
  if(input.batchId!=null&&!/^[A-Za-z0-9_-]{1,80}$/.test(input.batchId))throw Error('UTPayloadInvalid');
  for(const [key,limit]of [['savingThrow',500],['description',5000]])
    if(input[key]!=null&&(typeof input[key]!=='string'||input[key].length>limit))throw Error('UTPayloadInvalid');
  const swarm=review.facts.definition?.id==='swarm'||review.facts.warheadVariant==='ut_swarm';
  if(swarm&&input.swarmType!=null&&input.swarmType!==''&&
    (!utSwarmType(input.swarmType)||utSwarmType(input.swarmType).tl>review.facts.availabilityTL))throw Error('UTPayloadInvalid');
  // Omit empty new fields so legacy recipe identities remain byte-for-byte stable.
  return {note,radius,...(input.chemicalId?{chemicalId:input.chemicalId}:{}),...(input.batchId?{batchId:input.batchId}:{}),
    ...(input.savingThrow?.trim()?{savingThrow:input.savingThrow}:{}),...(input.description?.trim()?{description:input.description}:{}),
    ...(swarm&&input.swarmType?{swarmType:input.swarmType}:{})};
}
export function resolveUTSpecialEffects({raw,variantId,baseStatus,constructionStatus,facts={},previousTransformations=[]}) {
  const rule=UT_SPECIAL_RULES[variantId],formula=String(raw?.damage??'');
  const fail=reason=>({status:'unresolved',nativeSafe:false,formula,rawFormula:formula,reason,transformations:[],components:[],rules:{}});
  if(!rule||facts.sourceEdition!=='Ultra-Tech 2007'||!(families[facts.modeId]===facts.ammoId||physicalFamilyMatches(facts.modeId,facts.ammoId))||baseStatus!=='compatible'||
    constructionStatus!=='compatible'||!facts.payload)return fail('UTPayloadRequired');
  if(previousTransformations.some(t=>t.applied&&t.effectId===variantId)||raw?.linked||raw?.followup||raw?.followUp||raw?.components?.length)
    return fail('UTOriginalProfileRequired');
  const instructions=utBriefInstructions(variantId,{...facts,payload:facts.payload,source:rule.source});
  const resolvedFormula=rule.instructionOnly?null:formula;
  return {status:'resolved',nativeSafe:true,formula:resolvedFormula,rawFormula:formula,variantId,reason:null,
    ...(rule.instructionOnly?{effectiveChanges:{damage:null}}:{}),
    transformations:[{effectId:variantId,source:rule.source,field:'damage',from:formula,to:resolvedFormula,applied:true,order:1}],
    components:rule.instructionOnly?[]:[{role:'kinetic',status:'resolved',formula}],
    rules:{sourceEdition:'Ultra-Tech 2007',instructionOnly:!!rule.instructionOnly,payload:structuredClone(facts.payload),instructions,
      ...(variantId==='ut_tangler'&&[40,64].includes(facts.caliberMm)?{tangler:{st:facts.tanglerST,additionalLayer:facts.tanglerLayer,dr:Math.floor(facts.tanglerST/3)}}:{}),
      ...(facts.ammunitionSupply?{ammunitionSupply:structuredClone(facts.ammunitionSupply)}:{}),
      faceOnly:!!facts.faceOnly,doses:facts.doses,weightPerShotLb:facts.weightPerShotLb,
      costPerShot:variantId.includes('biochemical')||variantId.includes('drugged')?null:Number.isFinite(facts.baseCostPerShot)?facts.baseCostPerShot*(variantId==='ut_tangler'?2:1):null,
      fillerCostUnknown:variantId.includes('biochemical')||variantId.includes('drugged'),legalityClass:variantId==='ut_tangler'?4:null}};
}
