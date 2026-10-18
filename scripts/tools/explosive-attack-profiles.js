import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";

export const EXPLOSIVE_VARIANTS = Object.freeze({ht_le:"LE",ht_saple:"SAPLE",ht_apex:"APEX",ht_he:"HE",ht_saphe:"SAPHE",ht_saphec:"SAPHEC",ht_aphex:"APHEX",ht_efp:"EFP",ht_heat:"HEAT",ht_hedp:"HEDP",ht_hesh:"HESH",ht_ms_heat:"MS-HEAT",ht_thermobaric:"Thermobaric"});
export const isExplosiveVariant = id => Object.hasOwn(EXPLOSIVE_VARIANTS,id);
const copy = value => structuredClone(value);
const positive = n => Number.isFinite(n) && n>0;
// HT150 explicitly publishes this TL5 HE rocket. Preserve that named load;
// the generic HE availability rule still applies to all other constructions.
const publishedTLException = (option, d) => option?.id === "ht_he" &&
 d?.nativePreserved === true && d.source?.kind === "reference" &&
 d.ammoId === "ht_specific_hale_9pr_he" && d.modeId === "Wx13jpOUxRC_YeDo6" &&
 d.availabilityTL === 5 && d.weaponTL === 5 && d.sourceRawDamage === "6dx2 cr ex [3d cut]" &&
 d.components?.length === 2 && d.components[0].formula === "6dx2 cr ex" && d.components[1].formula === "3d cut";
// Exact named projectile diameters in the source-specific HT records. Launcher bore is not warhead diameter.
const diameters = Object.freeze({ht_specific_ss11_heat:164,ht_specific_pzf3_110mm_heat:110,ht_specific_milan_103_heat:103,ht_specific_at4_84mm_heat:84,
 ht_specific_pf30_150mm_heat:150,ht_specific_m72a2_66mm_heat:66,ht_specific_tow_bgm71a_heat:127,ht_specific_rpoa_93mm_thermobaric:93,
 ht_specific_rpg2_82mm_heat:82,ht_specific_rpg7_85mm_heat:85,ht_specific_malyutka_m_heat:125,ht_specific_m20_89mm_heat:89,
 ht_specific_armbrust_67mm_heat:67,ht_specific_dragon_127_heat:127,ht_specific_javelin_fgm148a_mseat:127,
 ht_specific_rpg7_93mm_heat:93,ht_specific_rpg7_105mm_msheat:105,ht_specific_rpg7_93mm_thermobaric:93,
 ht_specific_pzf3_110mm_tandem:110,ht_specific_hydra_70mm_hedp:70});
const nativeTypes={HE:"ht_he","HE-AB":"ht_he",HEAT:"ht_heat",HEDP:"ht_hedp","MS-HEAT":"ht_ms_heat",thermobaric:"ht_thermobaric"};
export const sourceExplosiveVariant = ammo => nativeTypes[ammo?.warhead_type] ?? null;

/** Parse scalar published GGA components, never infer a blast or fragment yield. */
export function publishedDamageComponents(text,{fragmentType=null}={}) {
 const s=String(text??"").trim().replaceAll("\u00d7","x"), fragments=[...s.matchAll(/\[([^\]]+)\]/g)];
 if(fragments.length>1)return null;
 let main=s.replace(/\s*\[[^\]]+\]/g,"").trim(),fragmentation=null;
 const scalar=/^\d+d(?:6)?(?:[+-]\d+)?(?:x\d+)?(?:\(\d+(?:\.\d+)?\))? (?:pi\+\+|pi\+|pi-|pi|cr(?: ex)?|cut|imp|burn(?: ex)?)$/;
 if(!scalar.test(main))return null;
 if(fragments.length){let f=fragments[0][1].trim();if(/^\d+d(?:6)?(?:[+-]\d+)?(?:x\d+)?(?:\(\d+(?:\.\d+)?\))?$/.test(f)&&["cut","burn"].includes(fragmentType))f+=" "+fragmentType;if(!/ (?:cut|burn|cr|imp|pi\+\+|pi\+|pi-|pi)$/.test(f))return null; if(!scalar.test(f))return null;fragmentation=f;}
 return {main,fragmentation};
}

/** Review a complete explicit design. Input facts remain unchanged. */
export function reviewExplosiveDefinition(option,originalFacts,definition) {
 const facts=copy(originalFacts??{}),fail=reason=>({status:"unresolved",reason,facts});
 if(!isExplosiveVariant(option?.id)||definition?.verified!==true||!definition.source?.note?.trim()||
    !["reference","gm","user"].includes(definition.source.kind))return fail("P4ConstructionMissing");
 const nativeTL = publishedTLException(option, definition);
 if(!Number.isInteger(definition.availabilityTL)||definition.availabilityTL<option.min_tl&&!nativeTL)return fail("P4TLRequired");
 if(facts.caliberMm!=null&&definition.caliberMm!=null&&facts.caliberMm!==definition.caliberMm)return fail("P4SourceConflict");
 if(!definition.nativePreserved&&facts.availabilityTL!=null&&facts.availabilityTL!==definition.availabilityTL)return fail("P4SourceConflict");
 facts.caliberMm??=definition.caliberMm;facts.availabilityTL=definition.availabilityTL;
 // The declared design is evidence, not permission to contradict known exclusions/platforms.
 const claimed=definition.platforms??[];
 if(facts.weaponPlatforms?.complete&&!claimed.some(p=>facts.weaponPlatforms.values.includes(p))&&option.eligibility_v1.conditions.weapon_platforms_any)return fail("P4PlatformRequired");
 facts.weaponPlatforms={values:[...new Set([...(facts.weaponPlatforms?.values??[]),...claimed])],complete:true};
 facts.munitionClasses={values:[...new Set([...(facts.munitionClasses?.values??[]),...(definition.munitionClasses??[])])],complete:true};
 facts.evidence??={};for(const key of option.eligibility_v1.explicit_evidence_required){if(facts.evidence[key]?.value===false&&facts.evidence[key].source)return fail("P4SourceConflict");facts.evidence[key]={value:true,source:definition.source.note};}
 const evaluation=evaluateHTOptionEligibility(option,facts);
 if(evaluation.checks.some(c=>c.status!=="confirmed"&&!(definition.nativePreserved===true&&c.field==="overlap_guard")&&
    !(nativeTL&&c.field==="min_tl")))return fail("P4ConstructionMissing");
 const components=definition.components;
 if(!Array.isArray(components)||!components.length||components[0].role!=="kinetic"||components.some(c=>!publishedDamageComponents(c.formula)||publishedDamageComponents(c.formula).fragmentation))return fail("P4PayloadMissing");
 if(new Set(components.map(c=>c.role)).size!==components.length)return fail("P4SourceConflict");
 const relations={kinetic:["primary","linked-blast-primary"],linked:["linked","linked-effect"],"follow-up":["follow_up"],"main-charge":["follow_up"],fragmentation:["fragmentation"]};
 if(components.some(c=>!relations[c.role]?.includes(c.relation)))return fail("P4SourceConflict");
 if(components.some(c=>c.role==="fragmentation"&&!/ cut$/.test(c.formula)))return fail("P4SourceConflict");
 const roles=components.map(c=>c.role),follow=option.mechanics.secondary.includes("follow_up");
 if(!roles.includes(follow?"follow-up":"linked")&&!( !follow&&components[0].relation==="linked-blast-primary"))return fail("P4PayloadMissing");
 if(option.mechanics.secondary.includes("fragmentation")&&!option.mechanics.limited_fragmentation&&!roles.includes("fragmentation"))return fail("P4PayloadMissing");
 if(option.id==="ht_ms_heat"&&!roles.includes("main-charge"))return fail("P4PayloadMissing");
 facts.explosiveDefinition=copy(definition);facts.explosiveOption=copy(option);
 return {status:"resolved",reason:null,facts};
}

/** Use only already explicitly bound book rounds; no name/bore matching or variant cloning. */
export function sourceExplosiveDefinition(catalogs,modeId,ammo,variantId) {
 const option=catalogs.getVariant("ht",variantId),mode=catalogs.getMode(modeId),equipment=catalogs.getEquipmentForMode(modeId);
 if(!option||!mode||ammo?.source_evidence_level!=="book_explicit"||!(ammo.source_specific_payload||ammo.ammunition_construction==="complete_munition")||
    nativeTypes[ammo.warhead_type]!==variantId||!ammo.weapon_mode_ids.includes(modeId)||
    ammo.source_weapon_equipment_id!==equipment?.equipment_id||ammo.alternate_model_not_selectable_as_base_ammunition||
    !ammo.attack_override?.damage)return null;
 const fragmentOptions={fragmentType:option.mechanics.secondary.includes("fragmentation")?"cut":null};
 const parsed=publishedDamageComponents(ammo.attack_override.damage,fragmentOptions);if(!parsed)return null;
 const components=[{role:"kinetic",formula:parsed.main,relation:"primary",sourceModeId:modeId}],add=(role,formula,relation,sourceModeId=null)=>components.push({role,formula,relation,sourceModeId});
 if(parsed.fragmentation)add("fragmentation",parsed.fragmentation,"fragmentation");
 for(const secondary of ammo.attack_override.secondary_effects??[]){const p=publishedDamageComponents(secondary.damage,fragmentOptions);if(!p)return null;
  add(secondary.relation==="follow_up"?"main-charge":"linked",p.main,secondary.relation);
  if(p.fragmentation){if(components.some(c=>c.role==="fragmentation"))return null;add("fragmentation",p.fragmentation,"fragmentation");}}
 // Alternate rounds have their own explicit components: do not inherit the base rocket's linked effect.
 if(!(ammo.attack_override.secondary_effects??[]).length)for(const id of ammo.native_linked_mode_ids??[]){const m=catalogs.getMode(id);
  if(!m||catalogs.getEquipmentForMode(id)?.equipment_id!==equipment.equipment_id||!["linked-effect","follow-up"].includes(m.role))return null;
  const p=publishedDamageComponents(m.raw_calc.damage);if(!p)return null;add(m.role==="follow-up"?"main-charge":"linked",p.main,m.role==="follow-up"?"follow_up":"linked",id);
  if(p.fragmentation){if(components.some(c=>c.role==="fragmentation"))return null;add("fragmentation",p.fragmentation,"fragmentation",id);}}
 // Javelin's second stage is a separately published native mode, not enumerated in native_linked_mode_ids.
 if(variantId==="ht_ms_heat"&&!components.some(c=>c.role==="main-charge")){
  const stages=equipment.modes.filter(m=>m.role==="follow-up");if(stages.length!==1)return null;const p=publishedDamageComponents(stages[0].raw_calc.damage);if(!p||p.fragmentation)return null;add("main-charge",p.main,"follow_up",stages[0].weapon_mode_id);}
 if(!components.some(c=>c.role==="linked")&&["ht_he","ht_thermobaric"].includes(variantId))components[0].relation="linked-blast-primary";
 const order={kinetic:0,"main-charge":1,linked:2,"follow-up":2,fragmentation:3};
 components.sort((a,b)=>order[a.role]-order[b.role]);
 const minTL=option.min_tl,weaponTL=Number(equipment.tech_level);
 if(!Number.isInteger(weaponTL))return null;
 // Explicit alternate named later warheads are published as later-TL designs, never limited by old launcher TL.
 const alternate=(ammo.rocket_contract?.traits??[]).includes("explicit_alternate_only");
 const availabilityTL=alternate?Math.max(weaponTL,minTL):weaponTL;
 return {version:1,verified:true,nativePreserved:true,source:{kind:"reference",note:ammo.source_ref_raw+"; explicit named HT round "+ammo.id},
  ammoId:ammo.id,modeId,caliberMm:diameters[ammo.id],availabilityTL,weaponTL,
  tlBasis:alternate?"published named alternate; HT variant minimum, not launcher manufacturing TL":"published source-native weapon/round",
  platforms:variantId==="ht_heat"?[ammo.rocket_contract?.delivery_type==="guided_missile"?"missile_launcher":"rocket_launcher"]:[],
  munitionClasses:copy(option.eligibility_v1.conditions.munition_classes_any),components,
  sourceRawDamage:mode.raw_calc.damage,sourceRange:ammo.rocket_contract?.range_source??null,
  sourceCost:typeof ammo.cost_per_shot_usd==="number"?ammo.cost_per_shot_usd:null};
}

export function resolveCompositeExplosiveEffects({raw,variantId,baseStatus,constructionStatus,facts,previousTransformations=[]},{htDamageDice,parseKineticDamage}) {
 const formula=String(raw?.damage??""),components=[],transformations=[],result={status:"unresolved",nativeSafe:false,rawFormula:formula,formula,variantId,components,transformations,reason:null,rules:{},support:{status:"UNDETERMINED",automatic:[],manual:[]}};
 const fail=reason=>({...result,reason});
 if(baseStatus!=="compatible"||!["compatible","user-defined","reference","gm-approved","world-policy"].includes(constructionStatus))return fail("P4ConstructionMissing");
 const review=reviewExplosiveDefinition(facts.explosiveOption,facts,facts.explosiveDefinition);if(review.status!=="resolved")return fail(review.reason);
 const d=review.facts.explosiveDefinition,o=review.facts.explosiveOption,m=o.mechanics;
 if(previousTransformations.some(t=>t.applied&&t.effectId===variantId))return fail("already-applied-use-original-profile");
 if(d.nativePreserved){if(d.sourceRawDamage!==formula)return fail("P4SourceConflict");}
 else if(raw.linked||raw.followUp||raw.followup||raw.components?.length||Object.values(facts.nativeEffects??{}).some(x=>x===true))return fail("native-components-or-effects-already-present");
 components.push(...copy(d.components).map((c,index)=>({...c,status:"resolved",order:index+1,manualConditions:c.role!=="kinetic"||c.relation==="linked-blast-primary",source:copy(d.source),internalOnPenetration:c.relation==="follow_up"&&variantId!=="ht_ms_heat"})));
 if(!d.nativePreserved){const p=parseKineticDamage(formula);if(!p||p.divisor!==1||p.suffix)return fail("unsupported-or-compound-native-damage");
  let type=m.damage_type??p.type;if(m.piercing_shift_down_if_caliber_lt_mm&&review.facts.caliberMm<m.piercing_shift_down_if_caliber_lt_mm){const order=["pi-","pi","pi+","pi++"];type=order[Math.max(0,order.indexOf(type)-1)];}
  const damage=(m.damage_multiplier?htDamageDice(p.dice,p.adds,p.multiplier,m.damage_multiplier):p.diceText)+(m.armor_divisor?"("+m.armor_divisor+")":"")+" "+type;
  if(components[0].formula!==damage)return fail("P4SourceConflict");}
 result.formula=components[0].formula;
 transformations.push({effectId:variantId,source:d.source.note,from:formula,to:result.formula,applied:!d.nativePreserved,order:1,reason:d.nativePreserved?"published-selected-components-no-second-transformation":"validated-original-source"});
 const manual=[{id:"P4LinkedFollowUp"}];if(components.some(c=>c.role==="fragmentation"))manual.push({id:"P4Fragmentation"});
 if(variantId==="ht_saple"&&d.availabilityTL<=6)manual.push({id:"P4SAPLEReliability",tl:d.availabilityTL,threshold:d.availabilityTL-2});
 if(variantId==="ht_hesh")manual.push({id:"P4HESH"});
 if(variantId==="ht_ms_heat")manual.push({id:"P4Tandem"});
 if(variantId==="ht_thermobaric")manual.push({id:"P4Thermobaric"});
 Object.assign(result,{status:"resolved",nativeSafe:true,reason:null,support:{status:"GM-MEDIATED",automatic:["published-component-formulas","component-armor-divisors","physical-resource-count","immutable-snapshot"],manual}});
 result.rules={costMultiplier:m.cost_multiplier,costApplication:d.nativePreserved?"included-in-published-round-price":"construction-multiplier",nativeComponentsPreserved:d.nativePreserved,
  ...(Number.isFinite(d.sourceCost)?{costPerShot:d.sourceCost*(d.nativePreserved?1:m.cost_multiplier)}:{}),
  componentOrder:components.map(c=>c.role),sapleReliability:variantId==="ht_saple"&&d.availabilityTL<=6?{die:"1d6",successAtMost:d.availabilityTL-2,automatic:false}:null,
  ...(variantId==="ht_thermobaric"?{explosionFalloff:{distanceDivisor:2,automaticApplication:false}}:{}),
  ...(variantId==="ht_hesh"?{spall:{maximumBlastFraction:.1,armorFraction:.01,roundArmor:"ceil",laminatedException:true,automaticApplication:false}}:{}),
  ...(variantId==="ht_ms_heat"?{tandem:{separateStages:true,automaticERA:false,cumulativeWithoutERA:true}}:{})};
 if(d.sourceRange)result.effectiveChanges={range:d.sourceRange};
 return result;
}

// Pure HT170 arithmetic; callers must use native Apply Damage, never an Actor update.
export function heshSpall({maximumBlast,dr,laminated}) {
 if(!Number.isFinite(maximumBlast)||maximumBlast<0||!Number.isFinite(dr)||dr<0||typeof laminated!=="boolean")return {status:"unresolved",reason:"P4ArmorMissing"};
 if(laminated)return {status:"excluded",damage:0,effectiveDR:Math.ceil(dr/100)};
 // HT170 explicitly rounds both spall damage and effective DR up.
 return {status:"resolved",damage:Math.ceil(maximumBlast/10),effectiveDR:Math.ceil(dr/100),automaticApplication:false};
}
export function thermobaricDamage({damage,distanceYards}) {
 if(!Number.isFinite(damage)||damage<0||!positive(distanceYards))return {status:"unresolved",reason:"P4DistanceMissing"};
 return {status:"resolved",damage:Math.floor(damage/(2*distanceYards)),divisor:2*distanceYards,automaticApplication:false};
}
export function tandemDamage({precursor,main,reactiveArmor}) {
 if(!Number.isFinite(precursor)||precursor<0||!Number.isFinite(main)||main<0||typeof reactiveArmor!=="boolean")return {status:"unresolved",reason:"P4ArmorMissing"};
 if(reactiveArmor)return {status:"manual",reason:"P4ERARequired",stages:[precursor,main]};
 return {status:"resolved",damage:precursor+main,armorDivisor:10,automaticApplication:false,stages:[precursor,main]};
}
