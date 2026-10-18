import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { AttackProfileResolver, createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { auditHTCoverage } from "../scripts/tools/ht-ammunition-coverage.js";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { evaluateHTOptionEligibility } from "../scripts/ht-option-eligibility.js";
import { createHash } from "node:crypto";
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:"gm",isGM:true},i18n:{lang:"ru",localize:k=>k},settings:{get:()=>"permissive"}};
const {availableAmmoTypes,ammunitionCandidates,ammoManagementHTML,openAmmoManagement}=await import("../scripts/tools/ammo-management-app.js");
const data=Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async([book,d])=>[book,
  JSON.parse(await fs.readFile(new URL("../data/catalogs/"+d.filename,import.meta.url),"utf8"))])));
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>data[Object.entries(CATALOG_DEFINITIONS).find(([,d])=>u.endsWith(d.filename))[0]]})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs),automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
const resolver=new AttackProfileResolver({catalogs,compatibility,automaticProfiles:automatic});
const aw="Wxm8TWSvu5UFTAaDn",ak="W27s4Lm8QlkKVKUPn",barrett="W4EbC4v3uPyORRhTC";
function context(modeId){const m=catalogs.getMode(modeId),ammo=catalogs.getAmmoItem("ht",m.ht_ammo_item_ids[0]);
  const raw={name:catalogs.getEquipmentForMode(modeId).name,damage:m.raw_calc.damage,range:m.stats.range,acc:m.stats.accuracy};
  const binding={status:"confirmed",binding:{confirmed:true,modeId}};
  return {raw,binding,base:{source:"catalog",book:"ht",kind:"ammo-item",ammoId:ammo.id,name:ammo.name}};}
function resolved(modeId,variantId,extra={}){const c=context(modeId),prepared=automatic.prepare({modeId,base:c.base,variantId});
  const type=prepared.type??{...c.base,recipe:{version:1,variantId}};
  return resolver.resolve({actorId:"actor",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,
    ammunition:{type,ammoKey:type.key},profilePolicy:"permissive",...extra});}
for(const [modeId,v,damage,range]of [[aw,"ht_apds","9d(2) pi-","1500/6300"],[aw,"ht_sapfsds","7d(2) pi-","1500/6300"],
  [barrett,"ht_apds","6dx3(2) pi","2550/9750"],[barrett,"ht_apfsds","6dx3(2) pi-","3400/13000"],
  [ak,"ht_sapfsds","5d+1(2) pi-","750/4650"]])test(v+" source rule on "+modeId,()=>{
  const p=resolved(modeId,v);assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,damage);
  assert.equal(p.effective.range,range);assert.equal(p.construction.status,"compatible");assert.equal(p.construction.profileOrigin,"reference");
  assert.equal(p.damage.components.length,1);assert.equal(p.raw.damage,context(modeId).raw.damage);
  assert.equal(p.ammunition.recipe.autoProfile.revision,1);assert.ok(p.damage.transformations.some(t=>t.effectId===v+":range"));
});
test("general AP/APHC family rules work across rifle, AMR and revolver without borrowing AK masses",()=>{
  for(const modeId of [aw,barrett,"W1FMPB_-58qp_bH-M"]){for(const v of ["ht_ap","ht_aphc"]){const p=resolved(modeId,v);
    assert.equal(p.damage.nativeSafe,true);assert.equal(p.construction.status,"compatible");assert.equal(p.ammunition.recipe.parameters,undefined);}}
});

test("HT167 piercing thresholds and HT168 forced type have distinct, accurate journals",()=>{
  for (const [variantId,caliberMm,type,reason] of [["ht_apds",29,"pi+","piercing-step-with-cap"],
    ["ht_apds",30,"pi++","caliber-at-least-30mm"],["ht_apfsds",39,"pi","piercing-step-with-cap"],
    ["ht_apfsds",40,"pi++","caliber-at-least-40mm"],["ht_sapfsds",7.62,"pi-","construction-forces-piercing-type"]]) {
    const result=resolveAmmunitionEffects({raw:{damage:"6d pi++",range:"100/300"},variantId,
      baseStatus:"compatible",constructionStatus:"compatible",facts:{caliberMm}});
    assert.equal(result.nativeSafe,true);assert.equal(result.formula.split(" ")[1],type);
    assert.equal(result.transformations.find(t=>t.effectId===variantId+":piercing").reason,reason);
  }
});

test("forbidden classes need explicit exclusion evidence; absence or an unsourced claim never grants APDS",()=>{
  const option=catalogs.getVariant("ht","ht_apds"),facts=structuredClone(compatibility.checkCompatibility(aw,"ht_apds").eligibility.facts);
  const check=()=>evaluateHTOptionEligibility(option,facts).checks.find(c=>c.field==="forbidden_classes").status;
  assert.equal(facts.classes.complete,false);assert.equal(check(),"confirmed");
  delete facts.classes.exclusions;assert.equal(check(),"undetermined");
  facts.classes.exclusions=[{value:"pistol_cartridge",source:""}];assert.equal(check(),"undetermined");
  facts.classes.exclusions[0].source="reviewed-class-fixture";assert.equal(check(),"confirmed");
  facts.classes.values.push("pistol_cartridge");assert.equal(check(),"incompatible");
});
test("pistol cartridges, unconfirmed identities, invalid ranges and existing divisors cannot acquire a partial overlay",()=>{
  assert.equal(compatibility.checkCompatibility("W1FMPB_-58qp_bH-M","ht_apds").status,"undetermined");
  assert.equal(resolved(ak,"ht_apds").damage.nativeSafe,true);
  assert.equal(resolved(ak,"ht_apds").damage.formula,"7d(2) pi-");
  const c=context(aw);for(const rawAttack of [{...c.raw,damage:"7d(2) pi"},{...c.raw,range:"unknown"},{...c.raw,linked:true},{...c.raw,followUp:true}])
    assert.equal(resolved(aw,"ht_apds",{rawAttack}).damage.nativeSafe,false);
  assert.equal(resolved(aw,"ht_apds",{binding:{status:"undetermined"}}).damage.nativeSafe,false);
});
test("saved recipe revision integrity rejects a forged model and preserves exact historical snapshots",()=>{
  const p=resolved(aw,"ht_apds"),shot=createShotSnapshot(p,{attackId:"before"}),before=JSON.stringify(shot);
  const type=structuredClone(p.ammunition);type.recipe.autoProfile.revision=999;type.recipe.autoProfile.model.rule.factor=99;
  assert.equal(resolved(aw,"ht_apds",{ammunition:{type}}).damage.nativeSafe,false);
  assert.equal(JSON.stringify(shot),before);assert.ok(Object.isFrozen(shot.profile.damage));
});
test("new types load without an editor, keep separate stocks and preserve contents on magazine selection",()=>{
  const c=context(aw),actor={id:"actor",system:{ranged:{mode:c.raw}}},weapon={id:"weapon",name:c.raw.name,attackRef:{path:"system.ranged.mode"},totalAmmo:0,
    ammunitionInventory:{version:1,installedId:null,stocks:[],magazines:[]}};
  const api={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,weaponCatalogBindings:{analyzeMode:()=>c.binding}};
  const types=availableAmmoTypes(actor,weapon,api,"ru");const ready=types.filter(t=>["ht_apds","ht_sapfsds"].includes(t.recipe?.variantId));
  assert.equal(ready.length,2);let index=0;for(const type of ready){assert.equal(type.unavailable,false);
    for(const language of ["ru","en"]){const html=ammoManagementHTML(weapon,{ammoKey:type.key,language},types);assert.doesNotMatch(html,/data-recipe-editor/);assert.equal(type.label,type.name);}
    const options={allowedTypes:types,makeId:()=>"m"+(index++)};applyInventoryOperation(weapon,"add-stock",{ammoKey:type.key,amount:10},options);
    applyInventoryOperation(weapon,"add-magazines",{capacity:5,amount:1},options);
    applyInventoryOperation(weapon,"load",{ammoKey:type.key,magazineId:weapon.ammunitionInventory.magazines.at(-1).id,amount:3},options);}
  const before=JSON.stringify(weapon.ammunitionInventory.stocks);applyInventoryOperation(weapon,"install",{magazineId:"m1"});
  assert.equal(JSON.stringify(weapon.ammunitionInventory.stocks),before);assert.equal(new Set(weapon.ammunitionInventory.stocks.map(s=>s.key)).size,2);
});
test("compatible but unresolved HP and already transformed attacks are blocked for new loading",()=>{
  const c=context(aw),actor={id:"actor",system:{ranged:{mode:c.raw}}},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{stocks:[]}};
  const api={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,weaponCatalogBindings:{analyzeMode:()=>c.binding}};
  const hp=ammunitionCandidates(actor,weapon,api).find(t=>t.recipe?.variantId==="ht_hollow_point");
  assert.equal(hp.unavailable,true);
  assert.ok(!availableAmmoTypes(actor,weapon,api).some(t=>t.key===hp.key));
  actor.system.ranged.mode.damage="7d(2) pi";
  assert.equal(availableAmmoTypes(actor,weapon,api).find(t=>t.recipe?.variantId==="ht_apds").unavailable,true);
});

test("ordinary owners can select ready source profiles, while nonowners cannot open or mutate inventory",async()=>{
  const previous=globalThis.game.user;globalThis.game.user={id:"player",isGM:false};
  try {
    const c=context(aw),actor={id:"actor",isOwner:true,system:{ranged:{mode:c.raw}}},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{stocks:[]}};
    const api={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,weaponCatalogBindings:{analyzeMode:()=>c.binding}};
    const types=availableAmmoTypes(actor,weapon,api,"ru"),type=types.find(t=>t.recipe?.variantId==="ht_apds");
    assert.equal(type.unavailable,false);assert.doesNotMatch(ammoManagementHTML(weapon,{ammoKey:type.key,language:"ru"},types),/data-recipe-editor/);
    actor.isOwner=false;await assert.rejects(openAmmoManagement({actor,weaponId:"weapon"}));
    await assert.rejects(new AmmoService(actor).inventoryTransaction("weapon","add-stock",{ammoKey:type.key,amount:1}),/Permission/);
  } finally {globalThis.game.user=previous;}
});
test("Fire Control previews replace range from actual GGA source exactly once without Actor writes",()=>{
  const c=context(aw),type=automatic.prepare({modeId:aw,base:c.base,variantId:"ht_apds"}).type;
  const state={weapons:[{id:"weapon",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{version:1,installedId:"mag",stocks:[{key:type.key,type,rounds:5}],
    magazines:[{id:"mag",weaponId:"weapon",capacity:10,rounds:5,ammoKey:type.key}]}}]};projectAmmoInventory(state.weapons[0]);
  const actor={id:"actor",system:{ranged:{mode:c.raw}},getFlag:()=>state};
  globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility,weaponCatalogBindings:{analyzeMode:()=>c.binding}};
  const attack={...c.raw,path:"system.ranged.mode",data:c.raw},before=JSON.stringify(actor.system);
  const once=withRuntimeAmmoStats(attack,actor,state),twice=withRuntimeAmmoStats(once,actor,state);
  assert.equal(once.data.range,"1500/6300");assert.equal(twice.data.range,once.data.range);assert.equal(JSON.stringify(actor.system),before);
});
test("an unresolved managed recipe cannot execute or consume a round",async()=>{
  const c=context(aw),type=automatic.prepare({modeId:aw,base:c.base,variantId:"ht_apds"}).type;
  const state={weapons:[{id:"weapon",ammunitionInventory:{version:1,installedId:"mag",stocks:[{key:type.key,type,rounds:5}],
    magazines:[{id:"mag",weaponId:"weapon",capacity:10,rounds:5,ammoKey:type.key}]}}]};projectAmmoInventory(state.weapons[0]);
  const actor={id:"actor",isOwner:true,getFlag:()=>state},service=new AmmoService(actor);let executed=false;
  const before=JSON.stringify(state);await assert.rejects(service.executeShot({weaponId:"weapon",attackId:"unresolved",
    prepare:()=>({profile:resolved(aw,"ht_apds",{rawAttack:{...c.raw,range:"?"}}),amount:1}),execute:()=>{executed=true;}}),/IncompleteAmmunitionProfile/);
  assert.equal(executed,false);assert.equal(JSON.stringify(state),before);
});
test("coverage is read-only, compares every native pair, and keeps unsupported/evidence/forbidden states separate",async()=>{
  const before=JSON.stringify(data),r=auditHTCoverage({catalogs,compatibility,includeIdentities:true});assert.equal(JSON.stringify(data),before);
  const history=JSON.parse(await fs.readFile(new URL('./fixtures/ht-coverage-history.json',import.meta.url),'utf8'));
  const keys=r.readyIdentities.map(row=>row.modeId+'/'+row.ammoId+'/'+row.variantId),restored=new Set(keys);
  assert.equal(restored.size,keys.length);
  for(const {key} of history.added){assert(restored.delete(key),key);}
  for(const {key} of history.removed){assert(!restored.has(key),key);restored.add(key);}
  assert.equal(restored.size,history.baseCount);
  assert.equal(createHash('sha256').update([...restored].sort().join('\n')).digest('hex'),history.baseReadyIdentitiesSha256);
  assert.equal(r.inventory.items,263);assert.equal(r.inventory.families,262);assert.equal(r.inventory.projectileOptions,51);assert.equal(r.inventory.eligibilityOptions,64);
  assert.equal(r.special.total,32704);assert.equal(r.nativePairs,511);
  assert.equal(r.special.ready,history.baseCount+history.added.length-history.removed.length);
  assert.equal(r.special.ready,keys.length);assert.equal(r.special.ready,1356);
  assert.deepEqual(Object.keys(r.familiesReady).sort(),[...history.baseFamilies,...history.addedFamilies].sort());
  assert.equal(Object.keys(r.familiesReady).length,121);
  assert.equal(r.variants.ht_apds.ready,96);
  assert.ok(r.variants.ht_apds.ready>1);assert.equal(r.variants.ht_apfsds.ready,2);assert.equal(r.variants.ht_sapfsds.ready>1,true);
  assert.equal(r.variants.ht_frangible.ready,117);assert.equal(r.variants.ht_subsonic_rifle.ready,5);assert.equal(r.variants.ht_subsonic_pistol.ready,53);
  assert.equal(r.variants.ht_match_grade.ready,6);assert.equal(r.variants.ht_plus_p.ready,368);assert.equal(r.variants.ht_he.ready,8);
  assert.equal(r.variants.ht_plus_p.compatible,0);assert.equal(r.variants.ht_plus_p.support['GM-MEDIATED'],368);
  assert.equal(r.variants.ht_white_phosphorus.ready,2);assert.equal(r.variants.ht_beehive.ready,1);
  assert.deepEqual(r.ordinary,{total:511,ready:506,unconfirmed:5});
  assert.equal(r.variants.ht_heat.nativePreservedSourceOverrides,13);
  assert.equal(r.variants.ht_ms_heat.nativePreservedSourceOverrides,1);
  assert.equal(r.variants.ht_beehive.nativePreservedSourceOverrides,1);
  assert.equal(r.variants.ht_he.nativePreservedSourceOverrides,0); // Hale's generic status stays undetermined.
  assert.equal(r.special.nativePreservedSourceOverrides,15);
  assert.equal(r.special.incompatible,r.special.genericIncompatible-15);
  assert.equal(r.special.potential,r.special.total-r.special.incompatible);
  assert.equal(r.special.percent,r.special.ready/r.special.potential*100);
  assert.equal(r.variants.ht_apds.effectIntegration,"implemented");assert.equal(r.variants.ht_he.effectIntegration,"implemented");
  assert.equal(r.variants.ht_apex.approvalRequiredUnderStrictPolicy,0);assert.ok(r.variants.ht_apex.missingInputs.explosiveMassG>0);
});
