import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { calculateExplosiveRecipe } from "../scripts/tools/explosive-ammunition-model.js";
import { basicDamageDice } from "../scripts/tools/basic-damage-dice.js";
import { setAmmunitionApproval, getAmmunitionApproval, approvalKey } from "../scripts/tools/ammunition-approval-service.js";
import { assessAmmunitionRecipe } from "../scripts/tools/ammunition-recipes.js";
import { AttackProfileResolver } from "../scripts/tools/attack-profile-resolver.js";
import { ammoTypeKey, applyInventoryOperation } from "../scripts/tools/ammo-inventory.js";
import { fragmentHitCount } from "../scripts/tools/explosion-fragmentation.js";
import { recipeEditorHTML, recipePreviewHTML } from "../scripts/tools/ammunition-recipe-editor.js";
import { explosiveMessages, explosiveText, loadExplosiveTranslations } from "../scripts/tools/explosive-ammunition-localization.js";

const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([book, def]) =>
  [book, JSON.parse(await fs.readFile(new URL("../data/catalogs/" + def.filename, import.meta.url), "utf8"))])));
const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ok:true,json:async()=>
  data[Object.entries(CATALOG_DEFINITIONS).find(([,def])=>url.endsWith(def.filename))[0]]}) });
await catalogs.load();
const compatibility = new AmmunitionCompatibilityService(catalogs), modeId = "W27s4Lm8QlkKVKUPn";
const parameters = () => ({projectileMassG:8,explosiveMassG:0.3,ref:1.4,fragmentMassG:6,
  referenceMassG:146,referenceDice:2,referenceSource:"GM provisional M406/HT reference, 146g calibration estimate, not measured fragment mass",
  q:1,source:{kind:"gm",note:"Explicit conditional test design"}});
const typeFor = (variantId="ht_apex",id="recipe-A") => {
  const type={source:"catalog",book:"ht",kind:"ammo-item",ammoId:"ht_7_62x39mm",name:"7.62x39mm "+variantId,
    recipe:{version:1,variantId,customId:id,parameters:parameters()}};
  type.key=ammoTypeKey(type);return type;
};
function approvalFixture() {
  let saved={};
  let local={};const actor={id:"actor-A",isOwner:true,getFlag:()=>local,setFlag:async(_s,_k,v)=>{local=structuredClone(v);}},weapon={id:"weapon-A",attackRef:{path:"system.ranged.0"}};
  const runtime={game:{user:{id:"gm",isGM:true},settings:{get:()=>saved,set:async(_module,_key,value)=>{saved=structuredClone(value);}}},
    OleGURPSQOL:{catalogs,ammunitionCompatibility:compatibility,weaponCatalogBindings:{analyzeMode:()=>({status:"confirmed",binding:{modeId,confirmed:true}})}}};
  return {actor,weapon,runtime,scope:type=>({actor,actorId:actor.id,weaponId:weapon.id,modeId,type})};
}
for(const id of ["ht_apex","ht_aphex"])test(id+" AK rifle remains undetermined, not forbidden by platform or caliber",()=>{
  const r=compatibility.checkCompatibility(modeId,id,{book:"ht",kind:"projectile-option",ammoItemId:"ht_7_62x39mm"});
  assert.equal(r.status,"undetermined");assert.ok(!r.eligibility.checks.some(c=>c.status==="incompatible"));
});
test("owner decisions are scoped, never change catalog status and forbid foreign Actor writes",async()=>{
  const f=approvalFixture(),type=typeFor();
  await setAmmunitionApproval({...f,type,active:true},f.runtime);
  const approval=getAmmunitionApproval(f.scope(type),f.runtime),r=assessAmmunitionRecipe(compatibility,modeId,type,approval);
  assert.equal(r.construction.status,"undetermined");assert.equal(r.authority,"user-defined");assert.equal(r.applicationAllowed,true);
  assert.equal(getAmmunitionApproval({...f.scope(type),weaponId:"weapon-B"},f.runtime),null);
  assert.equal(getAmmunitionApproval({...f.scope(type),actorId:"actor-B"},f.runtime),null);
  const edited=structuredClone(type);edited.recipe.parameters.ref=2;
  assert.equal(getAmmunitionApproval(f.scope(edited),f.runtime),null);
  assert.equal(assessAmmunitionRecipe(compatibility,modeId,edited,approval).applicationAllowed,true);
  await setAmmunitionApproval({...f,type,active:false},f.runtime);
  assert.equal(getAmmunitionApproval(f.scope(type),f.runtime),null);
  f.runtime.game.user.isGM=false;
  await setAmmunitionApproval({...f,type,active:true},f.runtime);
  f.actor.isOwner=false;
  await assert.rejects(setAmmunitionApproval({...f,type,active:true},f.runtime),/Permission/);
});
test("GM approval cannot bypass genuine prohibitions or UT loads",async()=>{
  const f=approvalFixture(),type=typeFor();
  f.runtime.OleGURPSQOL.ammunitionCompatibility={checkCompatibility:(_mode,id)=>({status:id===type.ammoId?"compatible":"incompatible"})};
  await assert.rejects(setAmmunitionApproval({...f,type,active:true},f.runtime),/Prohibition/);
  type.book="ut";await assert.rejects(setAmmunitionApproval({...f,type,active:true},f.runtime),/Scope/);
});
test("B415 uses grams to pounds, REF, and exact square root",()=>{
  const p=parameters();p.projectileMassG=1000;p.explosiveMassG=453.59237;p.fragmentMassG=100;p.ref=1;
  const r=calculateExplosiveRecipe("ht_aphex",p);
  assert.equal(r.explosion.rawDice,12);assert.equal(r.explosion.formula,"12d cr ex");
  p.ref=4;assert.equal(calculateExplosiveRecipe("ht_aphex",p).explosion.rawDice,24);
});
test("Basic sub-die bands and nearest whole dice retain existing falling rules",()=>{
  for(const [n,s] of [[0,"0"],[0.01,"1d-3"],[0.25,"1d-3"],[0.25001,"1d-2"],[0.5,"1d-2"],[0.50001,"1d-1"],[0.99,"1d-1"],[1.49,"1d"],[1.5,"2d"],[12.5,"13d"]])assert.equal(basicDamageDice(n),s);
  for(const value of [NaN,Infinity,-1])assert.throws(()=>basicDamageDice(value));
});
test("APEX strict less-than-five-percent constraint never becomes APHEX's default",()=>{
  const p=parameters();p.explosiveMassG=0.4;
  assert.equal(calculateExplosiveRecipe("ht_apex",p).explosion.status,"unresolved");
  assert.equal(calculateExplosiveRecipe("ht_aphex",p).explosion.status,"resolved");
  delete p.explosiveMassG;const r=calculateExplosiveRecipe("ht_aphex",p);
  assert.equal(r.explosion.formula,null);assert.equal(r.status,"unresolved");
});
test("fragment model uses explicit calibration and neutral Q, never a caliber/percentage substitute",()=>{
  const p=parameters(),r=calculateExplosiveRecipe("ht_apex",p);
  assert.equal(r.fragmentation.rawDice,2*Math.sqrt(6/146));assert.equal(r.fragmentation.formula,"1d-2 cut");
  p.q=4;assert.equal(calculateExplosiveRecipe("ht_apex",p).fragmentation.rawDice,r.fragmentation.rawDice*2);
  delete p.fragmentMassG;assert.equal(calculateExplosiveRecipe("ht_apex",p).fragmentation.formula,null);
  p.fragmentMassG=6;delete p.q;assert.equal(calculateExplosiveRecipe("ht_apex",p).fragmentation.neutralQAssumption,true);
});
test("missing, nonfinite and physically impossible masses remain explicit unresolved",()=>{
  for(const [key,value] of [["ref",0],["ref",Infinity],["q",-1],["fragmentMassG",8],["explosiveMassG",8],["referenceMassG",0],["projectileMassG",-1],["referenceDice",NaN],["referenceSource",""]]){
    const p=parameters();p[key]=value;const r=calculateExplosiveRecipe("ht_apex",p);assert.equal(r.status,"unresolved",key);assert.ok(r.reasons.length,key);
  }
  const p=parameters();p.q=100;assert.ok(calculateExplosiveRecipe("ht_apex",p).warnings.length);
});
for(const [id,expected] of [["ht_apex","4d-1(2) pi-"],["ht_aphex","5d+1(2) pi-"]])test(id+" approved immutable profile has independent native components",async()=>{
  const f=approvalFixture(),type=typeFor(id);await setAmmunitionApproval({...f,type,active:true},f.runtime);
  const resolver=new AttackProfileResolver({catalogs,compatibility}),raw={name:"AK",damage:"5d+1 pi"};
  const p=resolver.resolve({actorId:f.actor.id,weaponId:f.weapon.id,attack:raw,binding:{status:"confirmed",binding:{modeId,confirmed:true}},
    ammunition:{type,kind:"physical-magazine",magazineId:"mag",ammoKey:type.key},approval:getAmmunitionApproval(f.scope(type),f.runtime)});
  assert.equal(p.construction.status,"undetermined");assert.equal(p.construction.authority,"user-defined");assert.equal(p.damage.nativeSafe,true);
  assert.equal(p.effective.damage,expected);assert.equal(p.damage.components[1].formula,"1d-2 cr ex");assert.equal(p.damage.components[2].formula,"1d-2 cut");
  assert.equal(p.raw.damage,"5d+1 pi");assert.ok(Object.isFrozen(p.damage.model.parameters));
  type.recipe.parameters.explosiveMassG=1;assert.equal(p.damage.model.parameters.explosiveMassG,0.3);
  const other=resolver.resolve({actorId:f.actor.id,weaponId:"weapon-other",attack:raw,binding:{status:"confirmed",binding:{modeId,confirmed:true}},ammunition:{type},approval:getAmmunitionApproval(f.scope(typeFor(id)),f.runtime)});
  assert.equal(other.damage.nativeSafe,id==="ht_aphex"); // A valid owner recipe needs no approval; invalid APEX mass remains blocked.
});
test("custom stock identity separates parameter revisions without touching old loaded magazines",()=>{
  const a=typeFor(),b=typeFor("ht_apex","recipe-B"),weapon={id:"weapon",ammunitionInventory:{version:1,stocks:[{key:a.key,type:a,rounds:5}],magazines:[{id:"mag",weaponId:"weapon",capacity:30,rounds:4,ammoKey:a.key}],installedId:"mag"}};
  b.recipe.parameters.ref=2;const before=structuredClone(weapon.ammunitionInventory.magazines);
  assert.notEqual(a.key,b.key);applyInventoryOperation(weapon,"save-recipe",{type:b});
  assert.deepEqual(weapon.ammunitionInventory.magazines,before);assert.equal(weapon.ammunitionInventory.stocks[0].rounds,5);
});
test("Follow-up OFF exactly preserves existing fragment attack success, failure and radius behavior",()=>{
  for(const [total,skill,inRange,expected] of [[10,15,true,2],[17,25,true,0],[18,15,true,0],[3,1,true,1],[8,15,false,0],[13,12,true,0]])
    assert.equal(fragmentHitCount({total,skill,inRange}),expected);
});
test("Follow-up replaces first-hit slot once, retains additional hits and guarantees one on a miss",()=>{
  for(const [total,skill,inRange,expected] of [[10,15,true,2],[6,15,true,4],[17,25,true,1],[18,15,true,1],[8,15,false,1],[13,12,true,1]])
    assert.equal(fragmentHitCount({total,skill,inRange,followUp:true}),expected);
});
test("compact recipe editor has explicit inputs, neutral Q, house-model warning and synchronized RU/EN keys",async()=>{
  const before=globalThis.game;globalThis.game={user:{isGM:true}};
  try{
    for(const language of ["ru","en"]){
      const html=recipeEditorHTML({recipe:{variantId:"ht_apex",parameters:parameters()},recipeOpen:true},typeFor(),language);
      for(const key of ["ProjectileMass","ExplosiveMass","FragmentMass","ReferenceSource","NeutralQ","ModelNotice","Save"])
        assert.ok(html.includes(explosiveMessages.ru[key]),key);
      const bundle=JSON.parse(await fs.readFile(new URL("../lang/"+language+".json",import.meta.url),"utf8"));
      for(const [key,value] of Object.entries(explosiveMessages[language]))assert.equal(bundle["OleGURPS.ExplosiveAmmo."+key],value);
      assert.match(recipePreviewHTML("ht_apex",parameters(),language),/1d-2 cr ex/);
      const incomplete = recipePreviewHTML("ht_apex", {}, language);
      assert.ok(incomplete.includes(explosiveMessages.ru.Unresolved));
      assert.doesNotMatch(incomplete, /unresolved/);
      assert.doesNotMatch(html,/value="146"[^>]*data-default/);
    }
    globalThis.game.user.isGM=false;assert.equal(recipeEditorHTML({},null,"ru"),"");
  }finally{globalThis.game=before;}
});
test("real translation loader installs new RU/EN keys without changing language or old texts",async()=>{
  for(const language of ["ru","en"]){const entries={};const runtime={location:{},fetch:async()=>({ok:true,json:async()=>
    JSON.parse(await fs.readFile(new URL("../lang/"+language+".json",import.meta.url),"utf8"))}),
    game:{i18n:{lang:language,translations:entries,localize:key=>entries[key]??key}},
    foundry:{utils:{setProperty(object,key,value){object[key]=value;}}}};
    await loadExplosiveTranslations(runtime);assert.equal(runtime.game.i18n.lang,language);
    assert.deepEqual(entries,{});
    assert.equal(explosiveText("Editor",runtime,language),explosiveMessages.ru.Editor);
    assert.equal(entries["OleGURPS.Ammo.Title"],undefined);
  }
});
