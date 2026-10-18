import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { PREPARED_AMMUNITION_PROFILES } from "../scripts/tools/prepared-ammunition-profiles.js";
import { automaticAmmoMessages, automaticAmmoText, loadAutomaticAmmoTranslations, registerAutomaticAmmoPolicy, automaticAmmoPolicy } from "../scripts/tools/automatic-ammunition-localization.js";
import { recipeEditorHTML } from "../scripts/tools/ammunition-recipe-editor.js";
import { readAmmunitionApproval, getAmmunitionApproval, setAmmunitionApproval, recipeFingerprint } from "../scripts/tools/ammunition-approval-service.js";
import { AttackProfileResolver, createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { applyInventoryOperation, ammoTypeKey } from "../scripts/tools/ammo-inventory.js";
import { isMultishotVariant } from "../scripts/tools/multishot-ammunition.js";
import { isEnvironmentVariant } from "../scripts/tools/environment-ammunition.js";
import { isFuzeTracerVariant } from "../scripts/tools/fuze-tracer-ammunition.js";

globalThis.foundry = {utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game = {user:{id:"gm",isGM:true},i18n:{lang:"ru",localize:key=>key},settings:{get:()=>"permissive"}};
const { availableAmmoTypes, AmmoManagementApp, ammoManagementHTML } = await import("../scripts/tools/ammo-management-app.js");
const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async([book,d])=>
  [book,JSON.parse(await fs.readFile(new URL("../data/catalogs/"+d.filename,import.meta.url),"utf8"))])));
const catalogs = new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>
  data[Object.entries(CATALOG_DEFINITIONS).find(([,d])=>url.endsWith(d.filename))[0]]})});
await catalogs.load();
const compatibility = new AmmunitionCompatibilityService(catalogs);
const automatic = new AutomaticAmmunitionProfileService({catalogs,compatibility});
const ak = "W27s4Lm8QlkKVKUPn", barrett = "W4EbC4v3uPyORRhTC";
const base = id=>({source:"catalog",book:"ht",kind:"ammo-item",ammoId:id,name:catalogs.getAmmoItem("ht",id).name});
const browning=base("ht_50_browning_12_7x99mm");
const prepare=(service=automatic,options={})=>service.prepare({modeId:barrett,base:browning,variantId:"ht_aphex",...options});
function api(modeId=barrett) {return {catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,
  weaponCatalogBindings:{analyzeMode:()=>({status:"confirmed",binding:{modeId,confirmed:true}})}};}
function profile(type, {policy="permissive",approval=null,service=automatic,raw={name:"M82",damage:"6dx2 pi+"}}={}) {
  return new AttackProfileResolver({catalogs,compatibility,automaticProfiles:service}).resolve({actorId:"actor",weaponId:"weapon",
    attack:raw,rawAttack:raw,binding:{status:"confirmed",binding:{modeId:barrett,confirmed:true}},
    ammunition:{type,kind:"physical-magazine",magazineId:"mag",ammoKey:type.key,available:20,total:40},profilePolicy:policy,approval});
}

test("four-catalog audit is read-only and distinguishes complete data from unknown rules",()=>{
  const before=JSON.stringify(data),r=automatic.audit();
  // The original source links still enumerate .42 against LeMat's central 18G barrel.
  // The approved physical identity review rejects exactly those two old APEX/APHEX pairs.
  const rejected = [];
  for (const ammo of catalogs.getCatalog("ht").ammo_items) for (const modeId of ammo.weapon_mode_ids)
    for (const variantId of ["ht_apex", "ht_aphex"]) {
      const result = automatic.prepare({ modeId, base: { ...ammo, ammoId: ammo.id, book: "ht", kind: "ammo-item" }, variantId });
      if (result.state === "incompatible") rejected.push([modeId, ammo.id, variantId]);
    }
  assert.deepEqual(rejected, [["WdzSSShGT_yv4ctOi", "ht_42_caplock_lemat", "ht_apex"], ["WdzSSShGT_yv4ctOi", "ht_42_caplock_lemat", "ht_aphex"]]);
  assert.equal(compatibility.checkCompatibility("WdzSSShGT_yv4ctOi", "ht_42_caplock_lemat", { book: "ht", kind: "ammo-item" }).status, "incompatible");
  assert.deepEqual(r.ht,{combinations:1022,complete:10,incomplete:1010,incompatible:2,rules:{undetermined:1020,incompatible:2}});
  // UT-DATA transcribed two previously absent UT142 weapons; the imported GCS stays intact.
  assert.equal(data.weapons.equipment.length,1152);
  assert.equal(r.catalogs.weapons.equipment,1154);assert.equal(r.catalogs.lt.items,134);
  const equipment=catalogs.getCatalog("weapons").equipment;
  const sourceIds=new Set(data.weapons.equipment.map(e=>e.equipment_id));
  const additions=equipment.filter(e=>!sourceIds.has(e.equipment_id));
  assert.deepEqual(additions.map(e=>e.equipment_id).sort(),
    ["eUT2007GaussNeedler3mm","eUT2007GaussPDW4mm"].sort());
  assert.equal(new Set(equipment.map(e=>e.equipment_id)).size,equipment.length);
  const modeIds=equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id));
  assert.equal(new Set(modeIds).size,modeIds.length);
  for(const [eid,mid,name,family] of [
    ["eUT2007GaussNeedler3mm","WUT2007GaussNeedler3mm","Gauss Needler, 3mm","3mm_em"],
    ["eUT2007GaussPDW4mm","WUT2007GaussPDW4mm","Gauss PDW, 4mm","4mm_em"]]) {
    const item=additions.find(e=>e.equipment_id===eid),mode=catalogs.getMode(mid);
    assert.equal(equipment.filter(e=>e.name===name).length,1);
    assert.equal(item.name,name);assert.equal(item.source,"UT");assert.equal(item.reference,"UT142");
    assert.deepEqual(item.modes.map(m=>m.weapon_mode_id),[mid]);
    assert.equal(mode.ammunition_profile.primary_ammo_family_id,family);
    assert.equal(mode.ut_source_data.origin,"module-owned-source-transcription");
    assert.equal(mode.ut_source_data.revision,"ut-2007-1");
    assert.deepEqual(mode.ut_source_data.sources,["Ultra-Tech141","Ultra-Tech142","Ultra-Tech143"]);
    assert.equal(mode.ut_source_data.readiness,"definition-only");
    assert.equal(mode.ut_source_data.power_accounting_required,true);
    const aphex=compatibility.checkCompatibility(mid,"aphex",{book:"ut",kind:"warhead"});
    assert.equal(aphex.status,"undetermined");
    assert.ok(aphex.reasons.some(reason=>reason.code==="UT_VARIANT_NOT_IMPLEMENTED"));
  }
  assert.equal(r.catalogs.ht.items,263);assert.equal(r.catalogs.ut.families,36);assert.equal(r.catalogs.ut.aphexTableRows,7);
  assert.deepEqual(Object.fromEntries(Object.entries(r.ut).filter(([k])=>k!=="reasons")),
    {combinations:87,compatible:52,undetermined:10,incompatible:25,sourceRowsMatched:52,automaticProfiles:0});
  // Two new definitions and two explicit UT141/143 source conflicts stay unresolved;
  // neither change creates an additional compatible APHEX pair.
  for(const mid of ["WJstukbcBFPxQFtJE","WbvkCgoaLuWViWyKK"]) {
    const result=compatibility.checkCompatibility(mid,"aphex",{book:"ut",kind:"warhead"});
    assert.equal(result.status,"undetermined");
    assert.ok(result.reasons.some(reason=>reason.code==="UT_SOURCE_CONFLICT"));
  }
  assert.equal(r.catalogs.weapons.candidates,667);assert.equal(r.catalogs.weapons.payloadTemplates,122);
  assert.equal(r.catalogs.lt.projectileOptions,38);assert.equal(r.catalogs.ut.warheads,37);
  assert.ok(Object.values(r.catalogs).every(c=>c.structuredProfiles===0));assert.equal(JSON.stringify(data),before);
  assert.ok(Object.isFrozen(r));
});
for(const variantId of ["ht_apex","ht_aphex"])test("missing library inputs for AK "+variantId+" remain incomplete instead of inventing masses",()=>{
  const withoutLibrary=new AutomaticAmmunitionProfileService({catalogs,compatibility,library:[]});
  const r=withoutLibrary.prepare({modeId:ak,base:base("ht_7_62x39mm"),variantId});
  assert.equal(r.state,"incomplete");assert.equal(r.rulesStatus,"undetermined");assert.equal(r.type,null);
  assert.deepEqual(r.missing,["projectileMassG","explosiveMassG","ref","fragmentMassG","referenceMassG","referenceDice","referenceSource","source"]);
  assert.equal(automatic.admission(r,{policy:"permissive"}).allowed,false);
});
for(const [variantId,charge,kinetic,explosion] of [
  ["ht_apex",0.316,"4d-1(2) pi-","1d-2 cr ex"],
  ["ht_aphex",0.6,"5d+1(2) pi-","1d-1 cr ex"]
])test("approved 7.62x39mm "+variantId+" calculates all components without editing or claiming catalog confirmation",()=>{
  const r=automatic.prepare({modeId:ak,base:base("ht_7_62x39mm"),variantId});
  assert.equal(r.state,"complete");assert.equal(r.origin,"calculated");assert.equal(r.rulesStatus,"undetermined");
  assert.equal(r.type.recipe.autoProfile.revision,1);assert.equal(r.model.fragmentation.version,"olegurps-fragments-v1");
  assert.deepEqual(Object.fromEntries(["projectileMassG","explosiveMassG","ref","fragmentMassG","referenceMassG","referenceDice","q"].map(k=>[k,r.model.parameters[k]])),
    {projectileMassG:7.9,explosiveMassG:charge,ref:1.4,fragmentMassG:2,referenceMassG:146,referenceDice:2,q:1});
  assert.equal(r.model.explosion.rawDice,12*Math.sqrt(charge/453.59237*1.4));
  assert.equal(r.model.fragmentation.rawDice,2*Math.sqrt(2/146));
  assert.equal(r.model.explosion.formula,explosion);assert.equal(r.model.fragmentation.formula,"1d-3 cut");
  const resolver=new AttackProfileResolver({catalogs,compatibility});
  const input={actorId:"actor",weaponId:"weapon",rawAttack:{name:"Any actor label",damage:"5d+1 pi"},
    binding:{status:"confirmed",binding:{confirmed:true,modeId:ak}},ammunition:{type:r.type,kind:"physical-magazine",ammoKey:r.type.key,available:5,total:10}};
  const resolved=resolver.resolve({...input,profilePolicy:"permissive"});
  assert.equal(resolved.damage.formula,kinetic);assert.equal(resolved.damage.nativeSafe,true);
  assert.equal(resolved.construction.status,"undetermined");assert.equal(resolved.construction.authority,"user-defined");
  assert.equal(resolver.resolve({...input,profilePolicy:"strict"}).damage.nativeSafe,true);
  assert.equal(resolved.damage.components.some(c=>c.role==="incendiary"&&c.status==="manual"),variantId==="ht_aphex");
  assert.equal(automatic.prepare({modeId:barrett,base:browning,variantId}).origin==="calculated",false);
  const actor={id:"actor"},weapon={id:"weapon",name:"AK",totalAmmo:0,attackRef:{path:"system.ranged.0"},ammunitionInventory:{version:1,installedId:null,stocks:[],magazines:[]}};
  const types=availableAmmoTypes(actor,weapon,api(ak),"ru"),type=types.find(t=>t.key===r.type.key);
  assert.equal(type.unavailable,false);const options={allowedTypes:types,makeId:()=>variantId};
  applyInventoryOperation(weapon,"add-stock",{ammoKey:type.key,amount:10},options);
  applyInventoryOperation(weapon,"add-magazines",{capacity:30,amount:1},options);
  applyInventoryOperation(weapon,"load",{ammoKey:type.key,magazineId:variantId,amount:5},options);
  assert.equal(weapon.ammunitionInventory.stocks[0].rounds,5);assert.equal(weapon.ammunitionInventory.magazines[0].rounds,5);
  for(const lang of ["ru","en"]){
    const displayed=availableAmmoTypes(actor,weapon,api(ak),lang);
    assert.equal(displayed.find(t=>!t.recipe).label,"7.62x39mm \u2014 \u0411\u0430\u0437\u043e\u0432\u044b\u0439");
    for(const choice of displayed.filter(t=>t.recipe))assert.equal(choice.label,
      isMultishotVariant(choice.recipe.variantId) ? "7.62x39mm "+automaticAmmoText("P3"+choice.recipe.variantId,lang) :
      isEnvironmentVariant(choice.recipe.variantId) ? "7.62x39mm "+automaticAmmoText("P5"+choice.recipe.variantId,lang) :
      isFuzeTracerVariant(choice.recipe.variantId) ? "7.62x39mm "+automaticAmmoText("P6"+choice.recipe.variantId,lang) :
      ["ht_light_case","ht_caseless","ht_consumable_case"].includes(choice.recipe.variantId) ? "7.62x39mm "+automaticAmmoText("P7"+choice.recipe.variantId,lang) :
      ["ht_match_handloaded","ht_silent"].includes(choice.recipe.variantId) ? "7.62x39mm "+automaticAmmoText("P1"+choice.recipe.variantId,lang) : choice.name);
    assert.equal(displayed.find(t=>t.key===type.key).unavailable,false);
  }
});
test("published source is scoped to reviewed modes and carries no fabricated numerical masses",()=>{
  const r=prepare();assert.equal(r.state,"complete");assert.equal(r.origin,"reference");
  assert.equal(r.model.explosion.formula,"1d-2 cr ex");assert.equal(r.model.fragmentation.formula,"1d-2 cut");
  assert.deepEqual(r.model.parameters,{});assert.equal(r.facts.caliberMm,12.7);
  assert.equal(prepare(automatic,{modeId:"WdNlv4XvVH5vNfQoh"}).state,"incomplete");
  assert.equal(prepare().type.key,r.type.key);assert.equal(prepare(automatic,{savedType:JSON.parse(JSON.stringify(r.type))}).state,"complete");
});
test("legacy admission policy does not gate complete profiles; prohibitions remain technical",()=>{
  const published=prepare();assert.deepEqual(automatic.admission(published,{policy:"strict"}),{allowed:true,authority:"reference"});
  const r=automatic.prepare({modeId:ak,base:base("ht_7_62x39mm"),variantId:"ht_aphex"});
  assert.equal(automatic.admission(r,{policy:"strict"}).allowed,true);
  assert.deepEqual(automatic.admission(r,{policy:"permissive"}),{allowed:true,authority:"user-defined"});
  assert.equal(automatic.admission({...r,rulesStatus:"compatible"},{policy:"strict"}).allowed,true);
  assert.equal(automatic.admission(r,{policy:"permissive",approval:{active:false}}).allowed,true);
  assert.equal(automatic.admission({...r,rulesStatus:"incompatible"},{policy:"permissive",approval:{active:true}}).allowed,false);
  const prohibited=new AutomaticAmmunitionProfileService({catalogs,compatibility:{checkCompatibility:(_m,id)=>({status:id===browning.ammoId?"compatible":"incompatible"})}});
  assert.equal(prepare(prohibited).state,"incompatible");
});
test("legacy policy value is preserved while admission no longer depends on it",()=>{
  let registered;registerAutomaticAmmoPolicy({game:{settings:{register(scope,key,options){registered={scope,key,options};}}}});
  assert.equal(registered.scope,"olegurps-qol");assert.equal(registered.key,"preparedAmmoPolicy");
  assert.equal(registered.options.default,"permissive");assert.equal(registered.options.scope,"world");
  assert.equal(registered.options.name,automaticAmmoMessages.ru.PolicyName);
  assert.deepEqual(registered.options.choices,{strict:automaticAmmoMessages.ru.Strict,permissive:automaticAmmoMessages.ru.Permissive});
  for(const saved of ["permissive","strict"]){const runtime={game:{settings:{get:()=>saved}}};
    assert.equal(automaticAmmoPolicy(runtime),saved);
    const calculated=automatic.prepare({modeId:ak,base:base("ht_7_62x39mm"),variantId:"ht_aphex"});
    assert.equal(automatic.admission(calculated,{policy:automaticAmmoPolicy(runtime)}).allowed,true);
    assert.equal(automatic.admission(prepare(),{policy:automaticAmmoPolicy(runtime)}).allowed,true);}
});
test("legacy approvals preserved, owner decisions persisted without a world permission gate",async()=>{
  let saved={unrelated:{keep:true}},local={};const actor={id:"actor",isOwner:true,getFlag:()=>local,setFlag:async(_s,_k,v)=>{local=structuredClone(v);}},weapon={id:"weapon",attackRef:{path:"system.ranged.0"}},type=prepare().type;
  const runtime={game:{user:{id:"gm",isGM:true},settings:{get:()=>saved,set:async(_s,_k,v)=>{saved=structuredClone(v);}}},OleGURPSQOL:api()};
  await setAmmunitionApproval({actor,weapon,type,active:true},runtime);const scope={actor,actorId:actor.id,weaponId:weapon.id,modeId:barrett,type};
  const granted=getAmmunitionApproval(scope,runtime);assert.equal(profile(type,{policy:"strict",approval:granted}).damage.nativeSafe,true);
  const original=JSON.stringify(saved);automatic.audit();assert.equal(JSON.stringify(saved),original);
  await setAmmunitionApproval({actor,weapon,type,active:false},runtime);
  assert.equal(getAmmunitionApproval(scope,runtime),null);assert.equal(saved.unrelated.keep,true);
  assert.equal(profile(type,{approval:readAmmunitionApproval(scope,runtime)}).damage.nativeSafe,true);
  // A foreign approval cannot veto source-confirmed admission or a complete owner-defined profile.
  assert.equal(profile(type,{policy:"strict",approval:{...granted,fingerprint:"other recipe"}}).damage.nativeSafe,true);
  const calculated=automatic.prepare({modeId:ak,base:base("ht_7_62x39mm"),variantId:"ht_aphex"});
  assert.equal(automatic.admission(calculated,{policy:"strict"}).allowed,true);
  const foreignFingerprint=new AttackProfileResolver({catalogs,compatibility}).resolve({actorId:actor.id,weaponId:weapon.id,
    rawAttack:{name:"AK",damage:"5d+1 pi"},binding:{status:"confirmed",binding:{confirmed:true,modeId:ak}},
    ammunition:{type:calculated.type},profilePolicy:"strict",approval:{...granted,modeId:ak,ammoId:calculated.type.ammoId,
      recipeId:calculated.type.recipe.customId,fingerprint:"other recipe"}});
  assert.equal(foreignFingerprint.damage.nativeSafe,true);
});
test("prepared profile uses existing kinetic transformations and immutable separate components",()=>{
  const type=prepare().type,p=profile(type),snapshot=createShotSnapshot(p,{attackId:"attack",messageId:"message"});
  assert.equal(p.raw.damage,"6dx2 pi+");assert.equal(p.damage.formula,"6dx2(2) pi");assert.equal(p.damage.nativeSafe,true);
  assert.equal(p.construction.status,"undetermined");assert.equal(p.construction.authority,"reference");
  assert.deepEqual(p.damage.components.slice(0,3).map(c=>c.formula),["6dx2(2) pi","1d-2 cr ex","1d-2 cut"]);
  assert.equal(p.damage.components.at(-1).automaticRoll,false);assert.ok(Object.isFrozen(snapshot.profile.damage.model));
  assert.equal(profile(type,{raw:{name:"M82",damage:"6dx2(2) pi"}}).damage.nativeSafe,false);
  assert.equal(profile(type,{raw:{name:"M82",damage:"6dx2 pi+",followUp:true}}).damage.nativeSafe,false);
});
test("source priority and complete numerical calculation use verified explicit data only",()=>{
  const inputs={projectileMassG:100,explosiveMassG:2,ref:1,fragmentMassG:50,referenceMassG:100,referenceDice:2,
    source:{kind:"reference",note:"Isolated synthetic fixture"},referenceSource:"Explicit fixture calibration",q:1};
  const wrapped=new Proxy(catalogs,{get(target,key){if(key==="getAmmoItem")return(book,id)=>({...target.getAmmoItem(book,id),
    explosive_parameters:{ht_apex:inputs},explosive_profiles:{ht_aphex:{...PREPARED_AMMUNITION_PROFILES[0],id:"direct",explosion:"2d cr ex"}}});
    return typeof target[key]==="function"?target[key].bind(target):target[key];}});
  const service=new AutomaticAmmunitionProfileService({catalogs:wrapped,compatibility});
  assert.equal(prepare(service).type.recipe.autoProfile.id,"direct");
  const calculated=prepare(service,{variantId:"ht_apex"});
  // The reviewed exact family now supplies caliber; names and projectile mass still cannot.
  assert.equal(calculated.state,"complete");assert.equal(calculated.facts.caliberMm,12.7);
  const noCaliber = new Proxy(compatibility,{get(target,key){if(key==="checkCompatibility")return(...args)=>{
    const result=structuredClone(target.checkCompatibility(...args));if(result.eligibility)delete result.eligibility.facts.caliberMm;return result;};
    return typeof target[key]==="function"?target[key].bind(target):target[key];}});
  const missing=prepare(new AutomaticAmmunitionProfileService({catalogs:wrapped,compatibility:noCaliber}),{variantId:"ht_apex"});
  assert.equal(missing.state,"incomplete");assert.deepEqual(missing.missing,["caliberMm"]);
  const withFacts=new AutomaticAmmunitionProfileService({catalogs:wrapped,compatibility,library:[{id:"explicit-calculated",revision:1,
    verified:true,book:"ht",ammoId:browning.ammoId,variantId:"ht_apex",method:"calculated",origin:"calculated",
    parameters:inputs,source:inputs.source,facts:{caliberMm:12.7}}]});
  const r=prepare(withFacts,{variantId:"ht_apex"});assert.equal(r.state,"complete");assert.equal(r.origin,"calculated");
  assert.equal(r.model.explosion.formula,"1d-1 cr ex");assert.equal(r.model.fragmentation.formula,"1d cut");
  const invalid={...inputs,explosiveMassG:5};
  const rejected=new AutomaticAmmunitionProfileService({catalogs,compatibility,library:[{...withFacts.library[0],parameters:invalid}]});
  assert.equal(prepare(rejected,{variantId:"ht_apex"}).state,"incomplete");
});
test("library revisions have distinct stocks and preserve loaded old versions and historical shots",()=>{
  const old=prepare().type,p=profile(old),shot=createShotSnapshot(p,{attackId:"old",messageId:"old-message"});
  const next={...PREPARED_AMMUNITION_PROFILES[0],revision:2,explosion:"1d-1 cr ex"};
  const service=new AutomaticAmmunitionProfileService({catalogs,compatibility,library:[...PREPARED_AMMUNITION_PROFILES,next]});
  const newer=prepare(service).type;assert.notEqual(old.key,newer.key);
  assert.equal(prepare(service,{savedType:old}).type.key,old.key);
  const weapon={id:"weapon",ammunitionInventory:{version:1,installedId:"mag",stocks:[{key:old.key,type:old,rounds:10}],
    magazines:[{id:"mag",weaponId:"weapon",capacity:30,rounds:4,ammoKey:old.key}]}};
  const magazines=JSON.stringify(weapon.ammunitionInventory.magazines),saved=JSON.stringify(shot);
  applyInventoryOperation(weapon,"add-stock",{ammoKey:newer.key,amount:5},{allowedTypes:[newer]});
  assert.equal(JSON.stringify(weapon.ammunitionInventory.magazines),magazines);assert.equal(weapon.ammunitionInventory.stocks.length,2);
  assert.equal(JSON.stringify(shot),saved);assert.equal(profile(old,{service}).damage.components[1].formula,"1d-2 cr ex");
  const tampered=structuredClone(old);tampered.recipe.autoProfile.model.explosion.formula="99d cr ex";
  assert.equal(profile(tampered).damage.nativeSafe,false);assert.equal(profile(JSON.parse(JSON.stringify(old))).damage.nativeSafe,true);
});
test("base, AP/APHC/HP and unrelated ammunition completely hide the special editor",()=>{
  for(const variantId of [null,"ht_ap","ht_aphc","ht_hollow_point","other"]){const type={...browning,...(variantId?{recipe:{version:1,variantId}}:{})};
    assert.equal(recipeEditorHTML({recipe:{variantId:"ht_apex",parameters:{projectileMassG:999}},recipeOpen:true},type,"ru"),"");}
});
test("APEX/APHEX settings are specific, collapsed and editable by owners",()=>{
  for(const variantId of ["ht_apex","ht_aphex"]){const type={...browning,recipe:{version:1,variantId,parameters:{projectileMassG:100}}};
    const html=recipeEditorHTML({recipe:{variantId:variantId==="ht_apex"?"ht_aphex":"ht_apex",parameters:{projectileMassG:999}}},type,"ru");
    assert.ok(html.includes('value="100"'));assert.ok(!html.includes('value="999"'));
    assert.match(html, /<details data-recipe-editor >/);
    assert.ok(!html.includes('name="recipe-variant" disabled'));assert.ok(!html.includes('<select data-recipe-field name="recipe-variant"'));
  }
  game.user.isGM=false;
  try{const ready=prepare();const html=recipeEditorHTML({}, {...ready.type,preparation:{...ready,admission:{allowed:true}}},"ru");
    assert.ok(html.includes("1d-2 cr ex"));assert.match(html,/data-recipe-editor/);
    assert.doesNotMatch(recipeEditorHTML({canEdit:false}, {...ready.type,preparation:{...ready,admission:{allowed:true}}},"ru"),/recipe-projectileMassG|data-recipe-editor|recipe-ref|recipe-q/);
  }finally{game.user.isGM=true;}
});
test("ammo selection clears draft and expansion without inventory or Actor writes",async()=>{
  globalThis.OleGURPSQOL=api(ak);const actor={id:"actor"},weapon={id:"weapon",attackRef:{path:"system.ranged.0"},ammunitionInventory:{stocks:[]}};
  const types=availableAmmoTypes(actor,weapon,api(ak),"ru"),apex=types.find(t=>t.recipe?.variantId==="ht_apex"),aphex=types.find(t=>t.recipe?.variantId==="ht_aphex");
  const app=Object.create(AmmoManagementApp.prototype);Object.assign(app,{actor,weapon,ui:{ammoKey:apex.key,recipeOpen:true,
    recipe:{variantId:"ht_apex",parameters:{projectileMassG:999}}},_captureInputs(){},async refresh(){}});
  const before=JSON.stringify(weapon);await app._onChange({target:{name:"inventoryAmmo",value:aphex.key}});
  assert.equal(app.ui.recipe.variantId,"ht_aphex");assert.equal(app.ui.recipe.parameters.explosiveMassG,0.6);
  assert.equal(app.ui.recipe.parameters.projectileMassG,7.9);assert.equal(app.ui.recipeOpen,false);
  assert.equal(JSON.stringify(weapon),before);assert.equal(actor.system,undefined);
});
test("ready profiles can add stock and load with no manual fields; incomplete remains selectable but cannot load",()=>{
  const actor={id:"actor"},weapon={id:"weapon",name:"M82",totalAmmo:0,attackRef:{path:"system.ranged.0"},ammunitionInventory:{version:1,installedId:null,stocks:[],magazines:[]}};
  const types=availableAmmoTypes(actor,weapon,api(),"ru"),type=types.find(t=>t.recipe?.variantId==="ht_aphex");
  assert.equal(type.unavailable,false);const options={allowedTypes:types,makeId:()=>"mag"};
  applyInventoryOperation(weapon,"add-stock",{ammoKey:type.key,amount:10},options);applyInventoryOperation(weapon,"add-magazines",{capacity:30,amount:1},options);
  applyInventoryOperation(weapon,"load",{ammoKey:type.key,magazineId:"mag",amount:3},options);
  assert.equal(weapon.ammunitionInventory.stocks[0].rounds,7);assert.equal(weapon.ammunitionInventory.magazines[0].rounds,3);
  const missing=types.find(t=>t.recipe?.variantId==="ht_apex"),html=ammoManagementHTML(weapon,{ammoKey:missing.key,language:"ru"},types);
  const option=html.match(new RegExp('<option value="'+missing.key+'"[^>]*>'))[0];assert.ok(!option.includes("disabled"));
  assert.match(html,/data-inventory-action="add-stock" disabled/);
});
test("new policy, states and missing inputs have actual RU/EN translation loading",async()=>{
  for(const lang of ["ru","en"]){const entries={};const runtime={location:{},fetch:async()=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"))}),
    game:{i18n:{lang,translations:entries,localize:key=>entries[key]??key}},foundry:{utils:{setProperty(o,k,v){o[k]=v;}}}};
    await loadAutomaticAmmoTranslations(runtime);
    assert.deepEqual(entries,{});
    for(const [key,value]of Object.entries(automaticAmmoMessages.ru))assert.equal(automaticAmmoText(key,lang),value);
    assert.equal(runtime.game.i18n.lang,lang);assert.ok(automaticAmmoText("Missing",lang,{fields:"REF"}).includes("REF"));
  }
});
