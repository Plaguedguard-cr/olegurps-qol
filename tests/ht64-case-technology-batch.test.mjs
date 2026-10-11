import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { catalogs, compatibility, automatic, resolver, context, profile, api, inventoryFixture, modes } from "./fixtures/ht-special-context.mjs";
import { CASE_VARIANTS, sourceCaseDefinition, reviewCaseDefinition, inventoryPhysicalTotals } from "../scripts/tools/case-technology.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { FIRST_STAGE_VARIANTS, assessAmmunitionRecipe } from "../scripts/tools/ammunition-recipes.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
import { ammoTypeKey, applyInventoryOperation } from "../scripts/tools/ammo-inventory.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { AttackProfileResolver } from "../scripts/tools/attack-profile-resolver.js";
import { automaticAmmoMessages, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { recipeFingerprint } from "../scripts/tools/ammunition-approval-service.js";

const pairs = [["W2D6hUo_3AxfdzWRL", "ht_caseless"], ["WO9XZem8u8ze77NNs", "ht_caseless"], ["W4x4K44HSiDnu5oLc", "ht_consumable_case"], ["Wx10NaVSr1cp1bwKv", "ht_light_case"]];
const prepare = (mid,id) => automatic.prepare({ modeId: mid, base: context(mid).base, variantId: id });
test("P7 all three case IDs use case-option and the shared recipe pipeline", () => {
  for(const id of Object.keys(CASE_VARIANTS)) { assert.ok(FIRST_STAGE_VARIANTS.includes(id)); assert.equal(catalogs.getVariant('ht',id).layer,'case_construction'); }
  assert.equal(catalogs.getVariant('ht','ht_light_case').mechanics.wps_multiplier,.7);
});
for (const [mid,id] of pairs) {
  test("P7 sourced native pair automatic in strict policy: " + mid, () => {
    const p=prepare(mid,id),c=context(mid),before=JSON.stringify(c);
    assert.equal(p.state,'complete'); assert.equal(p.rulesStatus,'undetermined'); // original catalog status remains honest
    assert.equal(p.nativePreserved,true);assert.equal(automatic.admission(p,{policy:'strict'}).authority,'reference');
    const r=profile(mid,id,{profilePolicy:'strict'});assert.equal(r.damage.nativeSafe,true); assert.equal(r.damage.formula,c.raw.damage);
    for(const k of ['acc','range','rof','rcl','st'])assert.equal(r.effective[k],c.raw[k]);
    const a=catalogs.getAmmoItem('ht',c.base.ammoId),rules=r.damage.rules;
    assert.equal(rules.weightPerShotLb,a.weight_per_shot_lb);assert.equal(rules.costPerShot,a.cost_per_shot_usd);
    assert.equal(rules.caseTechnology.weightMultiplier,1);assert.equal(rules.caseTechnology.costMultiplier,1);
    assert.equal(r.transformations.filter(t=>t.effectId===id&&t.applied).length,0);
    assert.equal(JSON.stringify(c),before);
    assert.equal(automatic.prepare({modeId:mid,base:c.base,variantId:id,savedType:JSON.parse(JSON.stringify(p.type))}).state,'complete');
    const base=resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},profilePolicy:'strict'});
    assert.equal(base.damage.nativeSafe,true);assert.deepEqual(base.damage.rules.caseTechnology,rules.caseTechnology);
  });
  test("P7 physical consumption, magazine switch, deletion and persisted snapshot: " + mid, async () => {
    const f=inventoryFixture(mid,id),sys=JSON.stringify(f.actor.system);
    const result=await f.service.executeShot({weaponId:'weapon',attackId:'p7:'+mid,prepare:f.prepare,execute:async()=>({rolled:true,message:{id:'attack'}})});
    assert.equal(result.spent,1);assert.equal(f.state().weapons[0].totalAmmo,9);
    const saved=JSON.stringify(result.snapshot);await f.service.inventoryTransaction('weapon','install',{magazineId:'m2'});
    assert.equal(f.state().weapons[0].totalAmmo,9);await f.service.inventoryTransaction('weapon','delete-magazine',{magazineId:'m1'});
    assert.equal(f.state().weapons[0].ammunitionInventory.stocks[0].rounds,9);
    const dup=await new f.service.constructor(f.actor).executeShot({weaponId:'weapon',attackId:'p7:'+mid,prepare:()=>{throw Error('RepeatDamageMustNotPrepare');}});
    assert.equal(dup.duplicate,true);assert.equal(f.state().weapons[0].totalAmmo,9);
    assert.equal(JSON.stringify(JSON.parse(saved)),saved);assert.equal(JSON.stringify(f.actor.system),sys);
  });
}

test("P7 generic Light Case complete-round WPS/cost math, identity, source guards and journal", () => {
  const mid=modes.ak,c=context(mid),a=catalogs.getAmmoItem('ht',c.base.ammoId),option=catalogs.getVariant('ht','ht_light_case');
  const d={version:1,verified:true,variantId:option.id,modeId:mid,ammoId:a.id,equipmentId:catalogs.getEquipmentForMode(mid).equipment_id,
    source:{kind:'reference',note:'NUMERICAL FIXTURE ONLY: confirmed construction'},availabilityTL:8,caseType:'light_cased',
    chamberId:a.id,feedId:'fixture-specific-feed',chamberVerified:true,feedVerified:true,baseDamage:c.raw.damage,sourceRange:c.raw.range,
    evidence:{light_case_compatible_with_pressure_and_manufacture:{value:true,source:'NUMERICAL FIXTURE ONLY'}},sourceWeightPerShotLb:a.weight_per_shot_lb,sourceCostPerShot:a.cost_per_shot_usd};
  const mock=new Proxy(catalogs,{get:(target,key)=>key==='getAmmoItem'?(book,id)=>id===a.id?{...a,case_profiles:{ht_light_case:d}}:catalogs.getAmmoItem(book,id):typeof target[key]==='function'?target[key].bind(target):target[key]});
  const service=new AutomaticAmmunitionProfileService({catalogs:mock,compatibility}),p=service.prepare({modeId:mid,base:c.base,variantId:option.id});
  assert.equal(p.state,'complete');assert.equal(service.admission(p,{policy:'strict'}).allowed,true);
  const args={raw:c.raw,variantId:option.id,baseStatus:'compatible',constructionStatus:'compatible',facts:p.facts,context:{modeId:mid,ammoId:a.id}};
  const r=resolveAmmunitionEffects(args);assert.equal(r.nativeSafe,true);assert.ok(Math.abs(r.rules.weightPerShotLb-a.weight_per_shot_lb*.7)<1e-12);
  assert.equal(r.rules.costPerShot,a.cost_per_shot_usd*2);assert.equal(r.formula,c.raw.damage);assert.equal(r.effectiveChanges,undefined);
  assert.notEqual(ammoTypeKey(p.type),ammoTypeKey(c.base));assert.equal(r.rules.caseTechnology.physicalRoundsPerShot,1);
  assert.equal(resolveAmmunitionEffects({...args,previousTransformations:r.transformations}).nativeSafe,false);
  for(const field of ['chamberVerified','feedVerified'])assert.equal(reviewCaseDefinition(option,p.facts,{...p.facts.caseDefinition,[field]:false},a).reason,'P7ChamberFeedMissing');
  assert.equal(resolveAmmunitionEffects({...args,context:{modeId:'different'}}).reason,'P7SourceConflict');
  assert.equal(resolveAmmunitionEffects({...args,raw:{...c.raw,range:'1/2'}}).nativeSafe,false);
  const changed=structuredClone(p.facts);changed.baseCostPerShot=99;assert.equal(resolveAmmunitionEffects({...args,facts:changed}).nativeSafe,false);
});

test("P7 Consumable and Semi-consumable are distinct, never Caseless or generic cannon permission", () => {
  const p=prepare('W4x4K44HSiDnu5oLc','ht_consumable_case'),a=catalogs.getAmmoItem('ht',p.type.ammoId),o=catalogs.getVariant('ht','ht_consumable_case');
  assert.equal(p.facts.caseDefinition.caseType,'consumable');assert.deepEqual(p.facts.caseTypes.values,['consumable']);
  const d={...p.facts.caseDefinition,ammoId:'synthetic-semi',caseType:'semi_consumable',nativePreserved:false,weaponPlatform:'purpose_built_consumable_case_cannon',availabilityTL:7};
  const reviewed=reviewCaseDefinition(o,{...p.facts,availabilityTL:7},d,{...a,id:'synthetic-semi',ammunition_construction:'semi_consumable_cased'});
  assert.equal(reviewed.status,'resolved');assert.deepEqual(reviewed.facts.caseTypes.values,['semi_consumable']);
  assert.equal(reviewCaseDefinition(o,p.facts,{...d,caseType:'caseless'},a).reason,'P7SourceConflict');
  assert.equal(reviewCaseDefinition(o,{...p.facts,availabilityTL:7},{...d,weaponPlatform:'cannon'},a).status,'unresolved');
});

test("P7 missing factory design proof never falls back to ordinary base ammunition", () => {
  for (const [mid] of pairs.slice(0,3)) {
    const c=context(mid),a=catalogs.getAmmoItem('ht',c.base.ammoId);
    const mock=new Proxy(catalogs,{get:(target,key)=>key==='getAmmoItem'?(book,id)=>id===a.id?{...a,weight_per_shot_lb:99}:catalogs.getAmmoItem(book,id):typeof target[key]==='function'?target[key].bind(target):target[key]});
    const service=new AutomaticAmmunitionProfileService({catalogs:mock,compatibility});
    const engine=new AttackProfileResolver({catalogs:mock,compatibility,automaticProfiles:service});
    const r=engine.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},profilePolicy:'permissive'});
    assert.equal(r.damage.nativeSafe,false);assert.equal(r.damage.reason,'P7ConstructionMissing');
    const opts=availableAmmoTypes({id:'actor',system:{ranged:{mode:c.raw}},binding:c.binding},{id:'weapon',attackRef:{path:'system.ranged.mode'}},{...api,catalogs:mock,automaticAmmunitionProfiles:service},'ru');
    assert.equal(opts.find(t=>!t.recipe&&t.ammoId===a.id).unavailable,true);
  }
});

test("P7 unknown/mismatched designs reject world policy, GM approval and unscoped handcrafted recipes", () => {
  for(const id of Object.keys(CASE_VARIANTS)) {
    const p=prepare(modes.ak,id);assert.notEqual(p.state,'complete');
    for(const policy of ['strict','permissive'])assert.equal(automatic.admission(p,{policy,approval:{active:true}}).allowed,false);
    const c=context(modes.ak),type={...c.base,recipe:{version:1,variantId:id,customId:'handcrafted'}};
    const approval={actorId:'actor',weaponId:'weapon',modeId:modes.ak,ammoId:type.ammoId,variantId:id,recipeId:'handcrafted',active:true,fingerprint:recipeFingerprint(type)};
    assert.equal(resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type},approval,profilePolicy:'permissive'}).damage.nativeSafe,false);
  }
  for(const mid of [modes.ak,'W2D6hUo_3AxfdzWRL','W4x4K44HSiDnu5oLc']) {
    const other=mid===modes.ak?'ht_4_73x33mm_dynamit_nobel':context(modes.ak).base.ammoId;
    assert.equal(compatibility.checkCompatibility(mid,other,{book:'ht',kind:'ammo-item'}).status,'incompatible');
    assert.equal(sourceCaseDefinition(catalogs,mid,catalogs.getAmmoItem('ht',other),'ht_caseless'),null);
  }
});

test("P7 12G corrected native economics remain separate; loading never changes aggregate mass/cost", () => {
  const mid='Wx10NaVSr1cp1bwKv',c=context(mid),actor={id:'actor',system:{ranged:{mode:c.raw}},binding:c.binding};
  const weapon={id:'weapon',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
  const types=availableAmmoTypes(actor,weapon,api,'ru'),ids=['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load'];
  for(const id of ids){const t=types.find(t=>t.ammoId===id&&!t.recipe);assert.equal(t.unavailable??false,false);applyInventoryOperation(weapon,'add-stock',{ammoKey:t.key,amount:10},{allowedTypes:types});}
  applyInventoryOperation(weapon,'add-magazines',{capacity:5,amount:1},{makeId:()=> 'm'});
  const before=inventoryPhysicalTotals(weapon.ammunitionInventory,types);assert.deepEqual(before.map(r=>r.weightLb),[1.1,1.3]);assert.deepEqual(before.map(r=>r.costUsd),[5,7]);
  applyInventoryOperation(weapon,'load',{magazineId:'m',ammoKey:weapon.ammunitionInventory.stocks[0].key,amount:4},{allowedTypes:types});
  const after=inventoryPhysicalTotals(weapon.ammunitionInventory,types);assert.deepEqual(after.map(r=>[r.rounds,r.weightLb,r.costUsd]),before.map(r=>[r.rounds,r.weightLb,r.costUsd]));
  assert.throws(()=>applyInventoryOperation(weapon,'load',{magazineId:'m',ammoKey:weapon.ammunitionInventory.stocks[1].key,amount:1},{allowedTypes:types}),/MixedTypes/);
  const html=ammoManagementHTML(weapon,{ammoKey:types.find(t=>t.ammoId===ids[0]&&!t.recipe).key,language:'ru'},types);assert.match(html,/data-ammo-physical/);assert.match(html,/1\.1 lb/);assert.match(html,/\$5/);
  const regularLight=types.find(t=>t.ammoId===ids[1]&&t.recipe?.variantId==='ht_light_case');assert.equal(regularLight.unavailable,true);
  const nativeType=types.find(t=>t.ammoId===ids[0]&&t.recipe?.variantId==='ht_light_case');
  applyInventoryOperation(weapon,'add-stock',{ammoKey:nativeType.key,amount:1},{allowedTypes:types});
  for(const lang of ['ru','en']) {
    const current=availableAmmoTypes(actor,weapon,api,lang).find(t=>t.key===nativeType.key);
    assert.equal(current.unavailable,false);assert.match(current.label,/12G/);assert.doesNotMatch(current.label,/Saved type|Сохранённый тип/);
  }
});

test("P7 source identities, ordinary ammo, legacy +P and other variants retain mechanics; unproved stacking is denied", () => {
  const ordinary=resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:context(modes.ak).raw,binding:context(modes.ak).binding,ammunition:{type:context(modes.ak).base}});
  assert.equal(ordinary.damage.formula,'5d+1 pi');assert.equal(ordinary.ammunition.recipe,null);
  for(const [mid,id]of [[modes.glock,'ht_plus_p'],[modes.aw,'ht_match_grade'],[modes.ak,'ht_subsonic_rifle'],[modes.ak,'ht_aphc']])assert.equal(profile(mid,id).damage.nativeSafe,true);
  const p=prepare('WO9XZem8u8ze77NNs','ht_caseless');assert.equal(profile('WO9XZem8u8ze77NNs','ht_caseless').damage.formula,'5d(0.5) pi+');
  const type=structuredClone(p.type);type.recipe.variantIds=['ht_caseless','ht_plus_p'];assert.equal(assessAmmunitionRecipe(compatibility,'WO9XZem8u8ze77NNs',type).construction.status,'incompatible');
  const shot=createShotSnapshot(profile('WO9XZem8u8ze77NNs','ht_caseless'),{attackId:'old',spent:1}),old=JSON.stringify(shot);profile(modes.ak,'ht_plus_p');assert.equal(JSON.stringify(shot),old);assert.equal(Object.isFrozen(shot.profile.damage.rules.caseTechnology),true);
  const hashes=JSON.parse(fs.readFileSync('docs/audit/ht64-case-technology-before.json','utf8'));
  for(const [path,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,path);
});

test("P7 new RU/EN strings load into actual translation map even with older cached P1/P6 keys", async () => {
  for(const lang of ['ru','en']){
    const locale=JSON.parse(fs.readFileSync('lang/'+lang+'.json','utf8'));
    const expected=Object.entries(automaticAmmoMessages[lang]).filter(([key])=>key.startsWith('P7'));
    for(const [key,value]of expected)assert.equal(locale['OleGURPS.AutomaticAmmo.'+key],value);
    const translations={}, runtime={location:{},fetch:async()=>({ok:true,json:async()=>locale}),game:{i18n:{lang,translations,localize:k=>k.includes('.P7')?k:'cached'}},foundry:{utils:{setProperty:(obj,path,value)=>{obj[path]=value;}}}};
    await loadAutomaticAmmoTranslations(runtime);for(const [key,value]of expected)assert.equal(translations['OleGURPS.AutomaticAmmo.'+key],value);
    const c=context(modes.ak),actor={id:'actor',system:{ranged:{mode:c.raw}},binding:c.binding};
    const types=availableAmmoTypes(actor,{id:'weapon',attackRef:{path:'system.ranged.mode'}},api,lang);
    for(const id of Object.keys(CASE_VARIANTS)){const t=types.find(t=>t.recipe?.variantId===id);assert.equal(t.unavailable,true);assert.ok(t.label.includes(automaticAmmoMessages[lang]['P7'+id]));assert.equal(t.reason,automaticAmmoMessages[lang].P7ConstructionMissing);}
  }
});
