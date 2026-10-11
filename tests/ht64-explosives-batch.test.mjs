import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {catalogs,compatibility,automatic,resolver,api,context} from "./fixtures/ht-special-context.mjs";
import {EXPLOSIVE_VARIANTS,publishedDamageComponents,reviewExplosiveDefinition,heshSpall,thermobaricDamage,tandemDamage} from "../scripts/tools/explosive-attack-profiles.js";
import {resolveAmmunitionEffects,htDamageDice} from "../scripts/tools/ammunition-effects.js";
import {availableAmmoTypes} from "../scripts/tools/ammo-management-app.js";
import {recipeEditorHTML} from "../scripts/tools/ammunition-recipe-editor.js";
import {explosiveMessages,loadExplosiveTranslations} from "../scripts/tools/explosive-ammunition-localization.js";
import {createShotSnapshot} from "../scripts/tools/attack-profile-resolver.js";
import {shotDamageComponents,shotAmmunitionConditions} from "../scripts/tools/damage-shot-link.js";
import {AmmoService} from "../scripts/tools/ammo-service.js";
import {applyInventoryOperation} from "../scripts/tools/ammo-inventory.js";

const source="isolated numeric GM contract; not factory ammunition";
function numerical(id,overrides={}) {
 const o=catalogs.getVariant("ht",id),m=o.mechanics,caliberMm=m.min_caliber_mm??12.7;
 const type=m.damage_type??(m.piercing_shift_down_if_caliber_lt_mm&&caliberMm<20?"pi":"pi+");
 const formula=(m.damage_multiplier?htDamageDice(4,0,1,m.damage_multiplier):"4d")+(m.armor_divisor?"("+m.armor_divisor+")":"")+" "+type;
 const components=[{role:"kinetic",relation:"primary",formula},{role:m.secondary.includes('follow_up')?'follow-up':'linked',relation:m.secondary.includes('follow_up')?'follow_up':'linked',formula:"8d cr ex"}];
 if(m.secondary.includes('fragmentation')&&!m.limited_fragmentation)components.push({role:"fragmentation",relation:"fragmentation",formula:"2d cut"});
 if(id==="ht_ms_heat")components.splice(1,0,{role:"main-charge",relation:"follow_up",formula:"6d(10) cr ex"});
 const d={verified:true,nativePreserved:false,source:{kind:"gm",note:source},availabilityTL:o.min_tl,caliberMm,platforms:o.eligibility_v1.conditions.weapon_platforms_any??[],munitionClasses:o.eligibility_v1.conditions.munition_classes_any,sourceCost:3,components,...overrides};
 const f={evidence:{},nativeEffects:{[o.eligibility_v1.overlap_guard]:false},weaponPlatforms:{values:d.platforms,complete:true},munitionClasses:{values:d.munitionClasses,complete:true},caliberMm,provenance:[],combinationConflicts:[]};
 const r=reviewExplosiveDefinition(o,f,d);
 return {o,d,f,r,effect:resolveAmmunitionEffects({raw:{damage:"4d pi+"},variantId:id,baseStatus:"compatible",constructionStatus:"gm-approved",facts:r.facts})};
}
test("P4 contains exactly the thirteen audited IDs without changing the other packages",async()=>{
 const a=JSON.parse(await fs.readFile(new URL('../docs/audit/ht64-independent-audit.json',import.meta.url),'utf8'));
 assert.deepEqual(a.records.filter(x=>x.implementationGroup==='P4_explosives').map(x=>x.variantId).sort(),Object.keys(EXPLOSIVE_VARIANTS).sort());
});
for(const id of Object.keys(EXPLOSIVE_VARIANTS))test(id+" numerical contract, TL/caliber, exact payload and no invented construction",()=>{
 const s=numerical(id);assert.equal(s.r.status,'resolved');assert.equal(s.effect.nativeSafe,true);assert.equal(s.effect.formula,s.d.components[0].formula);
 assert.equal(s.effect.rules.costPerShot,3*s.o.mechanics.cost_multiplier);assert.equal(s.effect.support.status,'GM-MEDIATED');
 assert.equal(reviewExplosiveDefinition(s.o,s.f,null).status,'unresolved');
 assert.equal(reviewExplosiveDefinition(s.o,{...s.f,nativeEffects:{}},s.d).status,'unresolved');
 assert.equal(numerical(id,{availabilityTL:s.o.min_tl-1}).r.status,'unresolved');
 assert.equal(numerical(id,{source:{kind:'gm',note:''}}).r.status,'unresolved');
 assert.equal(numerical(id,{components:[s.d.components[0]]}).r.status,'unresolved');
 const denied={...s.f,evidence:{[s.o.eligibility_v1.explicit_evidence_required[0]]:{value:false,source:'confirmed prohibition'}}};
 assert.equal(reviewExplosiveDefinition(s.o,denied,s.d).status,'unresolved');
 if(s.o.mechanics.min_caliber_mm)assert.equal(reviewExplosiveDefinition(s.o,{...s.f,caliberMm:s.o.mechanics.min_caliber_mm-.01},{...s.d,caliberMm:s.o.mechanics.min_caliber_mm-.01}).status,'unresolved');
 if(s.o.eligibility_v1.conditions.weapon_platforms_any)assert.equal(reviewExplosiveDefinition(s.o,{...s.f,weaponPlatforms:{values:['laser'],complete:true}},s.d).status,'unresolved');
 const repeat=resolveAmmunitionEffects({raw:{damage:'4d pi+'},variantId:id,baseStatus:'compatible',constructionStatus:'gm-approved',facts:s.r.facts,previousTransformations:[{effectId:id,applied:true}]});assert.equal(repeat.nativeSafe,false);
});
const pairs=[['W-eXi2wwaUlJ18L9n','ht_specific_katyusha_m13_he','ht_he'],['W61HbVOrJ-DAQGkHW','ht_specific_rpg7_85mm_heat','ht_heat'],['WjD-b9M0j2HJAcxyy','ht_specific_hydra_70mm_hedp','ht_hedp'],['W61HbVOrJ-DAQGkHW','ht_specific_rpg7_105mm_msheat','ht_ms_heat'],['WVY4ygmbFY_RiJbQz','ht_specific_rpoa_93mm_thermobaric','ht_thermobaric']];
function published(mid,aid,id){const m=catalogs.getMode(mid),base={source:'catalog',book:'ht',kind:'ammo-item',ammoId:aid,name:catalogs.getAmmoItem('ht',aid).name},p=automatic.prepare({modeId:mid,base,variantId:id});
 const raw={damage:m.raw_calc.damage,rof:m.stats.rate_of_fire,range:m.stats.range,acc:m.stats.accuracy,rcl:m.stats.recoil};
 const binding={status:'confirmed',binding:{confirmed:true,modeId:mid}};return {p,raw,binding,base,profile:resolver.resolve({actorId:'a',weaponId:'w',rawAttack:raw,binding,ammunition:{type:p.type},profilePolicy:'strict'})};}
for(const [mid,aid,id] of pairs)test(id+" actual published round is available under strict policy with immutable native components",()=>{
 const s=published(mid,aid,id);assert.equal(s.p.state,'complete');assert.equal(automatic.admission(s.p,{policy:'strict'}).authority,'reference');assert.equal(s.profile.damage.nativeSafe,true);
 assert.equal(s.profile.damage.transformations.filter(t=>t.applied).length,0);
 assert.equal(s.profile.damage.components.filter(c=>c.role==='kinetic').length,1);
 const changed=resolver.resolve({actorId:'a',weaponId:'w',rawAttack:{...s.raw,damage:'1d pi'},binding:s.binding,ammunition:{type:s.p.type},profilePolicy:'strict'});assert.equal(changed.damage.nativeSafe,false);
 assert.equal(automatic.admission(s.p,{policy:'strict',approval:{active:false}}).allowed,false);
 const actor={id:'a',binding:s.binding,system:{ranged:{mode:s.raw}}},weapon={id:'w',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
 const type=availableAmmoTypes(actor,weapon,api,'ru').find(x=>x.key===s.p.type.key);assert.equal(type.unavailable,false);
 const html=recipeEditorHTML({},type,'ru');assert.ok(html.includes('data-published-explosive'));assert.ok(!html.includes('recipe-projectileMassG'));assert.ok(!/<details[^>]*\bopen/.test(html));
});
test("base selections of published complete rounds use their own composite payload without rewriting stocks",()=>{
 for(const pair of pairs){const s=published(...pair),before=JSON.stringify(s.base);
  const profile=resolver.resolve({actorId:'a',weaponId:'w',rawAttack:s.raw,binding:s.binding,ammunition:{type:s.base},profilePolicy:'strict'});
  assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.ammunition.recipe.variantId,pair[2]);
  assert.deepEqual(profile.damage.components,s.profile.damage.components);assert.equal(JSON.stringify(s.base),before);
 }
 const c=context('WjD-b9M0j2HJAcxyy'),type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:'ht_specific_hydra_laser_guided_70mm',name:'Published but payload absent'};
 const p=resolver.resolve({actorId:'a',weaponId:'w',rawAttack:c.raw,binding:c.binding,ammunition:{type},profilePolicy:'permissive'});
 assert.equal(p.damage.nativeSafe,false);assert.equal(type.recipe,undefined);
});
test("HEDP owns a separate linked blast and fragments; tandem never inherits the base rocket blast",()=>{
 const h=published(...pairs[2]).profile.damage;assert.deepEqual(h.components.map(x=>x.formula),['6dx3(10) cr ex','5dx4 cr ex','3d+2 cut']);
 const t=published(...pairs[3]).profile.damage;assert.deepEqual(t.components.map(x=>x.formula),['6dx2(10) cr ex','6dx7(10) cr ex','6dx3 cr ex']);assert.equal(t.components[1].relation,'follow_up');assert.equal(t.components[1].internalOnPenetration,false);assert.equal(t.components[2].internalOnPenetration,false);
 assert.equal(t.components.some(x=>x.formula==='7dx2 cr ex'),false);
});
test("published .50 APHEX needs no extra GM approval; prior house recipes retain their identity and policy",()=>{
 const mid='W4EbC4v3uPyORRhTC',base=context(mid).base,p=automatic.prepare({modeId:mid,base,variantId:'ht_aphex'});
 assert.equal(automatic.admission(p,{policy:'strict'}).authority,'reference');
 const c=context('W27s4Lm8QlkKVKUPn'),house=automatic.prepare({modeId:'W27s4Lm8QlkKVKUPn',base:c.base,variantId:'ht_apex'});assert.equal(automatic.admission(house,{policy:'strict'}).allowed,false);
 assert.equal(house.type.recipe.autoProfile.id,'olegurps-7-62x39mm-ht_apex-house');assert.equal(house.type.recipe.autoProfile.revision,1);
});
test("unsupported named alternates and ordinary bullets cannot turn into arbitrary explosive loads",()=>{
 const c=context('W27s4Lm8QlkKVKUPn');for(const id of Object.keys(EXPLOSIVE_VARIANTS).filter(x=>!['ht_apex','ht_aphex'].includes(x))){const p=automatic.prepare({modeId:'W27s4Lm8QlkKVKUPn',base:c.base,variantId:id});assert.equal(p.state,'incomplete');assert.equal(automatic.admission(p,{policy:'permissive'}).allowed,false);}
 const p=automatic.prepare({modeId:'WjD-b9M0j2HJAcxyy',base:{book:'ht',kind:'ammo-item',ammoId:'ht_specific_hydra_laser_guided_70mm'},variantId:'ht_he'});assert.equal(p.state,'incomplete');
 assert.equal(publishedDamageComponents('8d cr ex [2d]'),null);assert.equal(publishedDamageComponents('8d [2d] cr ex',{fragmentType:'cut'}).fragmentation,'2d cut');
});
test("HESH requires known DR and laminated armor; no unsupported armor assumption",()=>{
 assert.deepEqual(heshSpall({maximumBlast:120,dr:151,laminated:false}),{status:'resolved',damage:12,effectiveDR:2,automaticApplication:false});
 assert.equal(heshSpall({maximumBlast:120,dr:151,laminated:true}).status,'excluded');assert.equal(heshSpall({maximumBlast:120,dr:151}).status,'unresolved');
 assert.equal(heshSpall({maximumBlast:120,dr:0,laminated:false}).effectiveDR,0);
});
test("legacy APEX APHEX prices use verified base cost without changing their saved recipe identities",()=>{
 for(const [id,factor]of [['ht_apex',3],['ht_aphex',4]]){
  const c=context('W27s4Lm8QlkKVKUPn'),p=automatic.prepare({modeId:c.binding.binding.modeId,base:c.base,variantId:id}),saved=JSON.stringify(p.type.recipe);
  const r=resolver.resolve({actorId:'a',weaponId:'w',rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},profilePolicy:'permissive'});
  assert.equal(r.damage.rules.costMultiplier,factor);assert.equal(r.damage.rules.costPerShot,.6*factor);assert.equal(JSON.stringify(p.type.recipe),saved);
  const d=resolveAmmunitionEffects({raw:c.raw,variantId:id,baseStatus:'compatible',constructionStatus:'compatible',facts:{caliberMm:7.62},preparedExplosiveModel:p.model});
  assert.equal(d.rules.costPerShot,undefined);
 }
});
test("SAPLE preserves TL5-6 natural 1d reliability as an explicit GM condition",()=>{
 for(const tl of [5,6,7]){const s=numerical('ht_saple',{availabilityTL:tl});assert.equal(s.effect.rules.sapleReliability?.successAtMost??null,tl<7?tl-2:null);assert.equal(s.effect.support.manual.some(x=>x.id==='P4SAPLEReliability'),tl<7);}
});
test("unknown cost, contradictory payload relations and known TL cannot be silently resolved",()=>{
 const s=numerical('ht_heat',{sourceCost:null});assert.equal(s.effect.rules.costPerShot,undefined);
 assert.equal(reviewExplosiveDefinition(s.o,{...s.f,availabilityTL:s.d.availabilityTL-1},s.d).status,'unresolved');
 const bad=structuredClone(s.d);bad.components[1].relation='follow_up';
 assert.equal(reviewExplosiveDefinition(s.o,s.f,bad).status,'unresolved');
 const p=published(...pairs[3]).p,html=recipeEditorHTML({}, {...p.type,preparation:p},'ru');
 assert.ok(html.includes('\u041f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0437\u0430\u0440\u044f\u0434: 6dx2(10)'));
});
test("thermobaric falloff uses two distances and cannot assume contact distance; ERA needs explicit data",()=>{
 assert.equal(thermobaricDamage({damage:120,distanceYards:3}).damage,20);assert.equal(thermobaricDamage({damage:120,distanceYards:0}).status,'unresolved');
 assert.equal(tandemDamage({precursor:20,main:80,reactiveArmor:false}).damage,100);assert.equal(tandemDamage({precursor:20,main:80,reactiveArmor:true}).status,'manual');assert.equal(tandemDamage({precursor:20,main:80}).status,'unresolved');
});
test("component buttons use the completed snapshot, maintain privacy, and survive serialization",()=>{
 const s=published(...pairs[3]),shot=createShotSnapshot(s.profile,{attackId:'attack',spent:1,messageId:'m',resourceTiming:'after-attack'});
 const m={id:'m',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:JSON.parse(JSON.stringify(shot))}}};
 assert.deepEqual(shotDamageComponents(m).map(x=>x.role),['main-charge','linked']);assert.ok(shotAmmunitionConditions(m).some(x=>x.includes('реактивной')));
 assert.deepEqual(shotDamageComponents({...m,isContentVisible:false}),[]);assert.deepEqual(shotDamageComponents({...m,visible:false}),[]);
 assert.equal(JSON.stringify(shot.profile.damage.components),JSON.stringify(s.profile.damage.components));
});
test("one composite shot spends one physical round, repeat Damage and execution do not spend again",async()=>{
 const s=published(...pairs[2]);let state={weapons:[{id:'w',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}}]};
 const w=state.weapons[0],type=s.p.type;applyInventoryOperation(w,'add-stock',{ammoKey:type.key,amount:4},{allowedTypes:[type]});applyInventoryOperation(w,'add-magazines',{amount:1,capacity:3},{makeId:()=> 'mag'});applyInventoryOperation(w,'load',{magazineId:'mag',ammoKey:type.key,amount:3},{allowedTypes:[type]});applyInventoryOperation(w,'install',{magazineId:'mag'});
 const actor={id:'a',isOwner:true,getFlag:()=>structuredClone(state),setFlag:async(_s,_k,value)=>{state=structuredClone(value)}};
 const op={weaponId:'w',attackId:'unique',prepare:()=>({profile:s.profile,amount:1}),execute:async()=>({rolled:true,message:{id:'m',setFlag:async()=>{}}})};
 await new AmmoService(actor).executeShot(op);await new AmmoService(actor).executeShot(op);assert.equal(state.weapons[0].ammunitionInventory.magazines[0].rounds,2);
});
test("new P4 RU EN translations load through the loader and every option has a localized label",async()=>{
 for(const lang of ['ru','en']){let fetched=0;const json=JSON.parse(await fs.readFile(new URL('../lang/'+lang+'.json',import.meta.url),'utf8')),i18n={lang,translations:{},localize:k=>['Editor','P4Components'].some(n=>k==='OleGURPS.ExplosiveAmmo.'+n)?'cached older feature':k};await loadExplosiveTranslations({location:{},fetch:async()=>{fetched++;return {ok:true,json:async()=>json};},game:{i18n},foundry:{utils:{setProperty:(o,k,v)=>o[k]=v}}});assert.equal(fetched,1);
  for(const [k,v]of Object.entries(explosiveMessages[lang]).filter(([k])=>k.startsWith('P4')))assert.equal(i18n.translations['OleGURPS.ExplosiveAmmo.'+k],v);
  for(const id of Object.keys(EXPLOSIVE_VARIANTS))assert.ok(explosiveMessages[lang]['P4'+id]);}
});
test("the previous narrow plus P diagnosis remains intact without running auditHTCoverage",async()=>{
 const d=JSON.parse(await fs.readFile(new URL('../docs/audit/ht64-multishot-plus-p-diagnostic.json',import.meta.url),'utf8'));assert.equal(d.oldReadyPreserved,284);assert.equal(d.worldReady,370);assert.equal(d.delta,86);assert.deepEqual(d.lost,[]);
});
