import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, context, api } from "./fixtures/ht-special-context.mjs";
import { LEMAT, LEMAT_SHOT_CHARGE, lematBarrel } from "../scripts/ht-physical-ammunition-evidence.js";
import { projectHTPreGaussMode } from '../scripts/ht-pre-gauss-profiles.js';
import { standaloneAmmoCarriers } from "../scripts/tools/standalone-weapon-service.js";
import {printedAccuracyZero,expectedPrintedFields} from './fixtures/ht-printed-statistics.mjs';
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { applyInventoryOperation, ammoTypeKey } from "../scripts/tools/ammo-inventory.js";
import { resolveMultipleProjectileFire } from "../scripts/tools/fire-service.js";
import { recipeFingerprint, setAmmunitionApproval, readAmmunitionApproval } from "../scripts/tools/ammunition-approval-service.js";
import { displayedAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { automaticAmmoMessages, automaticAmmoText, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { ammunitionConditionTexts } from "../scripts/tools/damage-shot-link.js";
const shot=context(LEMAT.shotModeId),rev=context(LEMAT.revolverModeId),prepared=automatic.prepare({modeId:LEMAT.shotModeId,base:shot.base,variantId:"ht_plus_p"});
const approval={active:true,actorId:"actor",weaponId:"shot",modeId:LEMAT.shotModeId,ammoId:LEMAT.shotAmmoId,
  variantId:"ht_plus_p",recipeId:prepared.type.recipe.customId,fingerprint:recipeFingerprint(prepared.type),plusPDecision:{loadingCheckPassed:true}};
const resolve=(type=prepared.type,a=approval)=>resolver.resolve({actorId:"actor",weaponId:"shot",rawAttack:{...shot.raw,bulk:"-3"},
  binding:shot.binding,ammunition:{type},approval:a,profilePolicy:"permissive"});
test("runtime correction preserves source catalogs and .42 economics while removing central reverse link",()=>{
  for(const [modeId,acc] of [[LEMAT.revolverModeId,"2"],[LEMAT.shotModeId,"1"]]){
    const source=catalogs.getCatalog("weapons").equipment.flatMap(e=>e.modes).find(m=>m.weapon_mode_id===modeId);
    assert.equal(source.stats.accuracy,acc);assert.equal(catalogs.getMode(modeId).stats.accuracy,acc);
    assert.equal(catalogs.getMode(modeId).sourceStatisticsCorrection,undefined);
  }
  assert.equal(resolver.resolve({rawAttack:rev.raw,binding:rev.binding,ammunition:{type:rev.base}}).effective.acc,"2");
  const raw=catalogs.getCatalog("ht").ammo_items.find(a=>a.id===LEMAT.revolverAmmoId);
  assert.ok(raw.weapon_mode_ids.includes(LEMAT.shotModeId));assert.equal(raw.cost_per_shot_usd,0.2);assert.equal(raw.weight_per_shot_lb,0.018);
  assert.deepEqual(catalogs.getAmmoItem("ht",raw.id).weapon_mode_ids,[LEMAT.revolverModeId]);
  assert.equal(catalogs.getAmmoItem("ht",raw.id).cost_per_shot_usd,0.2);
  assert.ok(!catalogs.getCatalog("ht").ammo_items.some(a=>a.id===LEMAT.shotAmmoId));
  assert.equal(LEMAT_SHOT_CHARGE.provenance.officialTableRow,false);assert.equal(LEMAT_SHOT_CHARGE.provenance.version,1);
  const family=catalogs.getAmmoFamily("ht",LEMAT_SHOT_CHARGE.ammo_family_id);
  assert.deepEqual(family.ammo_item_ids,[LEMAT.shotAmmoId]);assert.equal(family.provenance.officialTableRow,false);
});
test("revolver .42 and central 18G are bidirectionally exclusive, including family bypass",()=>{
  assert.equal(compatibility.checkCompatibility(LEMAT.revolverModeId,LEMAT.revolverAmmoId).status,"compatible");
  assert.equal(compatibility.checkCompatibility(LEMAT.shotModeId,LEMAT.shotAmmoId).status,"compatible");
  assert.equal(compatibility.checkCompatibility(LEMAT.shotModeId,LEMAT.revolverAmmoId).status,"incompatible");
  assert.equal(compatibility.checkCompatibility(LEMAT.revolverModeId,LEMAT.shotAmmoId).status,"incompatible");
  const family=catalogs.getAmmoItem("ht",LEMAT.revolverAmmoId).ammo_family_id;
  assert.equal(compatibility.checkCompatibility(LEMAT.shotModeId,family,{book:"ht",kind:"ammo-family"}).status,"incompatible");
});
test("ordinary shot preserves damage, 11 projectiles, divisor, ST and independent identity without requiring economics",()=>{
  const p=resolve(shot.base,null);assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,"1d(0.5) pi-");
  assert.equal(p.effective.rof,"1x11");assert.equal(p.effective.rcl,"1");assert.equal(p.effective.range,"30/600");
  assert.equal(p.effective.ammunitionProjectileKind,"shot");assert.equal(p.effective.acc,"1");
  assert.equal(p.context.barrel.capacity,1);assert.equal(p.ammunition.ammoId,LEMAT.shotAmmoId);
  assert.equal(LEMAT_SHOT_CHARGE.cost_per_shot_usd,null);assert.equal(LEMAT_SHOT_CHARGE.weight_per_shot_lb,null);
  assert.equal(p.damage.rules.costPerShot,undefined);
});
test("+P preserves 1d(0.5) pi-, transforms both ranges/ST once, no fake price",()=>{
  const p=resolve();assert.equal(prepared.state,"complete");assert.equal(prepared.rulesStatus,"undetermined");
  assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,"1d(0.5) pi-");assert.equal(p.effective.range,"33/660");assert.equal(p.effective.st,"12");
  assert.equal(p.effective.rof,"1x11");assert.equal(p.effective.acc,"1");assert.equal(p.effective.rcl,"1");assert.equal(p.effective.bulk,"-3");
  assert.equal(p.damage.rules.costMultiplier,1.5);assert.equal(p.damage.rules.costPerShot,undefined);
  assert.equal(p.damage.transformations.filter(t=>t.effectId==="ht_plus_p"&&t.applied).length,1);
  assert.equal(p.damage.rules.loadingCheck.perShot,false);
});
test("LeMat B409 is strictly below current 10% half-D and counts 11 pellets as one charge",()=>{
  for(const [halfDamageRange,boundary] of [[30,3],[33,3.3]])for(const [distance,close] of [[boundary-0.001,true],[boundary,false]]){
    const p=resolveMultipleProjectileFire({rof:"1x11",physicalShots:1,physicalDistance:distance,halfDamageRange});
    assert.equal(p.extremelyClose,close);assert.equal(p.effectiveRoF,close?1:11);assert.equal(p.closeDamageMultiplier,close?5:null);
  }
});
test("OWNER +P needs a scoped loading check, not GM approval or world writes; pressure and ownership remain enforced",async()=>{
  assert.equal(automatic.admission(prepared,{policy:"permissive"}).allowed,true);
  assert.equal(automatic.admission(prepared,{policy:"strict"}).allowed,true);
  assert.equal(resolve(prepared.type,null).damage.reason,"plus-p-loading-check-required");
  assert.equal(resolve(prepared.type,{...approval,plusPDecision:{loadingCheckPassed:false}}).damage.reason,"plus-p-loading-check-required");
  assert.equal(resolve(prepared.type,{...approval,weaponId:"revolver"}).damage.nativeSafe,false);
  const f=fixture(),weapon=f.state().weapons[1],runtime=ownerRuntime(f.actor);
  f.actor.binding=shot.binding;
  const inventoryBefore=JSON.stringify(f.state());
  const saved=await setAmmunitionApproval({actor:f.actor,weapon,type:prepared.type,active:true,plusPDecision:{loadingCheckPassed:true}},runtime);
  assert.equal(saved.origin,"user");assert.equal(saved.userId,"owner");assert.equal(saved.plusPDecision.loadingConfirmation.perShot,false);
  assert.deepEqual(readAmmunitionApproval({actor:f.actor,actorId:f.actor.id,weaponId:weapon.id,modeId:LEMAT.shotModeId,type:prepared.type},runtime),saved);
  assert.equal(resolve(prepared.type,saved).damage.nativeSafe,true);
  assert.equal(resolve(prepared.type,{...saved,actorId:"foreign"}).damage.nativeSafe,false);
  assert.equal(resolve(prepared.type,{...saved,fingerprint:"other-recipe"}).damage.nativeSafe,false);
  await assert.rejects(setAmmunitionApproval({actor:{...f.actor,isOwner:false},weapon,type:prepared.type,active:true},runtime),/Permission/);
  await assert.rejects(setAmmunitionApproval({actor:f.actor,weapon,type:prepared.type,active:true,plusPDecision:{rof:0}},runtime),/ApprovalScopeRequired/);
  assert.equal(JSON.stringify(f.state()),inventoryBefore);assert.deepEqual(f.writes,[["olegurps-qol","ammunitionDecisions"]]);
  const pressure=structuredClone(prepared);pressure.facts.legacyPlusPAdmission=false;
  delete pressure.facts.evidence.weapon_pressure_rating_verified;
  assert.equal(automatic.admission(pressure,{approval:saved}).allowed,false);
  const ownPressure={...saved,plusPDecision:{...saved.plusPDecision,pressureSuitable:true}};
  assert.equal(automatic.admission(pressure,{approval:ownPressure}).allowed,true);
  pressure.facts.evidence.weapon_pressure_rating_verified={value:false,source:"confirmed-pressure-prohibition"};
  assert.equal(automatic.admission(pressure,{approval:ownPressure}).allowed,false);
});
const definition={id:"lemat",name:"LeMat",source:{equipmentId:LEMAT.equipmentId},resourceLinks:{ammoWeaponId:"lemat"},
  modes:[LEMAT.revolverModeId,LEMAT.shotModeId].map(modeId=>({modeId}))};
test("one instance owns distinct 9 and 1 carriers without retagging old stock or IDs",()=>{
  const old={id:"saved",standaloneWeaponId:"lemat",standaloneModeId:LEMAT.shotModeId,ammunitionInventory:{stocks:[{id:"old",type:{...rev.base,recipe:{version:1,customId:"user"}},rounds:4}],magazines:[{id:"old-mag",rounds:1}]}},before=JSON.stringify(old);
  const carriers=standaloneAmmoCarriers(definition,[old]);assert.equal(carriers.length,2);assert.equal(new Set(carriers.map(c=>c.id)).size,2);
  assert.equal(carriers.find(c=>c.id==="saved").standaloneModeId,LEMAT.shotModeId);
  assert.equal(JSON.stringify(carriers.find(c=>c.id==="saved").ammunitionInventory),JSON.stringify(old.ammunitionInventory));assert.equal(JSON.stringify(old),before);
  assert.deepEqual(carriers.map(c=>c.physicalResource.capacity).sort(),[1,9]);
  assert.deepEqual(standaloneAmmoCarriers(definition,carriers),carriers);
});
function ownerRuntime(actor){return {OleGURPSQOL:api,game:{user:{id:"owner",isGM:false},actors:new Map([[actor.id,actor]]),settings:{get:()=>null,
  set:async()=>{throw Error("WorldSettingWriteForbidden");},register:()=>{throw Error("WorldSettingRegistrationForbidden");}}}};}
function fixture(){let state={weapons:[{id:"rev",standaloneModeId:LEMAT.revolverModeId},{id:"shot",standaloneModeId:LEMAT.shotModeId}].map(w=>({...w,ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}}))};
  const flags={},writes=[];
  const actor={id:"actor",isOwner:true,getFlag:(s,k)=>s==="world"&&k==="gurpsAmmoManager"?state:structuredClone(flags[s]?.[k]),
    setFlag:async(s,k,v)=>{writes.push([s,k]);if(s==="world"&&k==="gurpsAmmoManager")state=structuredClone(v);else{flags[s]??={};flags[s][k]=structuredClone(v);}}};
  const types=[rev.base,shot.base].map(t=>({...t,key:ammoTypeKey(t)}));
  for(let i=0;i<2;i++){const w=state.weapons[i];applyInventoryOperation(w,"add-stock",{ammoKey:types[i].key,amount:10},{allowedTypes:types});applyInventoryOperation(w,"add-magazines",{capacity:i?1:9,amount:1},{makeId:()=>"m"+i});applyInventoryOperation(w,"load",{magazineId:"m"+i,ammoKey:types[i].key,amount:i?1:9},{allowedTypes:types});applyInventoryOperation(w,"install",{magazineId:"m"+i});}
  return {actor,service:new AmmoService(actor),types,writes,state:()=>state};}
test("each barrel spends one physical charge, duplicate attack is idempotent and other feed unchanged",async()=>{
  const f=fixture(),other=JSON.stringify(f.state().weapons[0]);
  const input={weaponId:"shot",attackId:"shot-barrel",prepare:({ammunition})=>({profile:resolve(ammunition.type,null),amount:1}),execute:async()=>({rolled:true,message:{id:"message"}})};
  const r=await f.service.executeShot(input);assert.equal(r.spent,1);assert.equal(f.state().weapons[1].totalAmmo,9);assert.equal(JSON.stringify(f.state().weapons[0]),other);
  assert.equal((await f.service.executeShot(input)).duplicate,true);assert.equal(f.state().weapons[1].totalAmmo,9);
  const before=JSON.stringify(f.state().weapons[1]);await f.service.executeShot({weaponId:"rev",attackId:"rev-barrel",prepare:({ammunition})=>({amount:1,profile:resolver.resolve({actorId:"actor",weaponId:"rev",rawAttack:rev.raw,binding:rev.binding,ammunition})}),execute:async()=>({rolled:true,message:{id:"r"}})});
  assert.equal(f.state().weapons[0].totalAmmo,9);assert.equal(JSON.stringify(f.state().weapons[1]),before);
});
test("service blocks wrong identities/capacities even with caller-provided permissive type list",async()=>{
  const f=fixture();for(const [weaponId,type] of [["shot",f.types[0]],["rev",f.types[1]]])await assert.rejects(f.service.inventoryTransaction(weaponId,"add-stock",{ammoKey:type.key,amount:1},{allowedTypes:f.types}),/TypeUnavailable/);
  const before=JSON.stringify(f.state());
  await assert.rejects(f.service.inventoryTransaction("shot","add-magazines",{capacity:1,amount:1}),/FixedFeedLimit/);
  await assert.rejects(f.service.inventoryTransaction("shot","add-magazines",{capacity:2,amount:1}),/FixedFeedLimit/);
  await assert.rejects(f.service.inventoryTransaction("rev","add-magazines",{capacity:10,amount:1}),/CapacityExceeded/);
  assert.equal(JSON.stringify(f.state()),before);
  // Without an existing fixed carrier, its own capacity check is reachable.
  const empty=fixture();empty.state().weapons[1].ammunitionInventory={version:1,stocks:[],magazines:[],installedId:null};
  await assert.rejects(empty.service.inventoryTransaction("shot","add-magazines",{capacity:2,amount:1}),/CapacityExceeded/);
  await assert.rejects(f.service.inventoryTransaction("shot","add-stock",{ammoKey:prepared.type.key,amount:1},{allowedTypes:[prepared.type]}),/TypeUnavailable/);
  f.actor.binding=shot.binding;
  await setAmmunitionApproval({actor:f.actor,weapon:f.state().weapons[1],type:prepared.type,active:true,plusPDecision:{loadingCheckPassed:true}},ownerRuntime(f.actor));
  await f.service.inventoryTransaction("shot","add-stock",{ammoKey:prepared.type.key,amount:1},{allowedTypes:[prepared.type]});
  assert.equal(f.state().weapons[1].ammunitionInventory.stocks.find(s=>s.key===prepared.type.key).rounds,1);
});
test("old incorrect recipe is retained, visibly review-required, cannot fire; unload safely returns its original type",()=>{
  const type={...rev.base,key:ammoTypeKey(rev.base),recipe:{version:1,variantId:"ht_plus_p",customId:"old"}},copy=JSON.stringify(type);
  const p=resolve(type,null);assert.equal(p.compatibility.status,"incompatible");assert.equal(p.ammunition.status,"unresolved");assert.equal(JSON.stringify(type),copy);
  const actor={id:"actor",binding:shot.binding,system:{ranged:{mode:shot.raw}}},weapon={id:"shot",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{version:1,stocks:[{key:type.key,type,rounds:0}],magazines:[{id:"old",weaponId:"shot",capacity:1,rounds:1,ammoKey:type.key}],installedId:"old"}};
  for(const lang of ["ru","en"]){const types=displayedAmmoTypes(actor,weapon,api,lang),old=types.find(t=>t.key===type.key);assert.equal(old.unavailable,true);assert.equal(old.reason,automaticAmmoMessages.ru.LeMatIdentityReview);assert.match(ammoManagementHTML(weapon,{language:lang,ammoKey:type.key},types),/data-ammo-identity-review/);}
  applyInventoryOperation(weapon,"unload",{magazineId:"old",amount:1});assert.equal(weapon.ammunitionInventory.stocks[0].rounds,1);assert.equal(weapon.ammunitionInventory.stocks[0].type.ammoId,LEMAT.revolverAmmoId);
});
test("old snapshot does not re-resolve identity, barrel, approval or Damage after reload",()=>{
  const old=createShotSnapshot(resolve(),{attackId:"old",messageId:"msg",spent:1}),text=JSON.stringify(old);
  resolve(shot.base,null);resolve(prepared.type,{...approval,active:false});assert.equal(JSON.stringify(old),text);assert.equal(JSON.parse(text).profile.damage.formula,"1d(0.5) pi-");
  assert.equal(JSON.parse(text).profile.context.barrel.manual[0].id,"BarrelSwitchReady");assert.ok(Object.isFrozen(old.profile.context.barrel));
});
test("new Ready, economics and identity messages resolve RU/EN from actual locale files",async()=>{
  for(const lang of["ru","en"]){const data=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    for(const key of ["BarrelSwitchReadyGM","LeMatEconomicsUnknown","LeMatIdentityReview"])assert.equal(data["OleGURPS.AutomaticAmmo."+key],automaticAmmoMessages[lang][key]);
    assert.deepEqual(ammunitionConditionTexts(lematBarrel(LEMAT.shotModeId).manual,lang),[automaticAmmoMessages.ru.BarrelSwitchReadyGM]);}
});
test("other 510 native +P pairs retain identities and weapon source records",()=>{
  const reviewedIdentities={
    W82oDY970UdeqLXTF:['ht_5_56x45mm_nato','ht_223_remington','HT117/119'],
    Wkvf5salwlKpkRx_c:['ht_5_56x45mm_nato','ht_223_remington','HT117/119'],
    WGJgRQusTscOtoLC9:['ht_5_56x45mm_nato','ht_223_remington','HT117/119'],
    WOAL2ladqiRbTuvRU:['ht_17_5mm_flintlock_mle_1777','ht_specific_mas_an_xiii_17_1_flintlock','HT90/91']};
  const names={ht_87x94mmr_hotchkiss:'37x94mmR Hotchkiss',ht_25_59mmb:'25x59mmB',ht_2_2_25:'2-inch (51mm)',
    ht_56_50_spencer_14x22mmr:'.56-50 Spencer (13x29mmR)',ht_700_nitro_express_17_8x80mmr:'.700 Nitro Express (17.8x89mmR)'};
  const modes=new Map(catalogs.getCatalog("weapons").equipment.flatMap(e=>e.modes.map(m=>[m.weapon_mode_id,m])));let count=0;
  for(const ammo of catalogs.getCatalog("ht").ammo_items)for(const modeId of ammo.weapon_mode_ids){if(modeId===LEMAT.shotModeId)continue;
    count++;const effectiveMode=structuredClone(catalogs.getMode(modeId));
    if(reviewedIdentities[modeId]){
      const [original,value,source]=reviewedIdentities[modeId];
      assert.deepEqual(modes.get(modeId).ht_ammo_item_ids,[original]);
      assert.deepEqual(effectiveMode.ht_ammo_item_ids,[value]);assert.deepEqual(effectiveMode.ht_ammo_family_ids,[]);
      assert.deepEqual(effectiveMode.sourceIdentityCorrection,{version:1,source,original,value});
      effectiveMode.ht_ammo_item_ids=[original];delete effectiveMode.ht_ammo_family_ids;delete effectiveMode.sourceIdentityCorrection;
    }
    if(modeId==='WwlfY-FYthqkLvByK') { // Zip-Gun HT92 (not LeMat HT94): printed Acc 0.
      assert.equal(effectiveMode.ammunitionIdentityPolicy.authority,'user-approved-project-policy');
      assert.equal(effectiveMode.weaponReliability.malf,12);
      for(const key of ['caliber_hint','ht_ammo_resolution','ht_ammo_review'])effectiveMode[key]=structuredClone(modes.get(modeId)[key]);
      delete effectiveMode.ht_ammo_family_ids;delete effectiveMode.ammunitionIdentityPolicy;delete effectiveMode.weaponReliability;
      assert.equal(modes.get(modeId).stats.accuracy,null);assert.equal(effectiveMode.stats.accuracy,'0');
      assert.deepEqual(effectiveMode.sourceStatisticsCorrection,{version:1,source:'HT92',fields:[{field:'accuracy',original:null,value:'0'}]});
      const c=context(modeId),p=resolver.resolve({rawAttack:c.raw,binding:c.binding});
      assert.equal(p.effective.acc,'0');
      effectiveMode.stats.accuracy=null;delete effectiveMode.sourceStatisticsCorrection;
    }
    if(modeId==='Wx13jpOUxRC_YeDo6') { // HT150: effective Acc 0; imported null remains protected.
      assert.equal(modes.get(modeId).stats.accuracy,null);assert.equal(effectiveMode.stats.accuracy,'0');
      assert.deepEqual(effectiveMode.sourceStatisticsCorrection,{version:1,source:'HT150',field:'accuracy',original:null,value:'0'});
      effectiveMode.stats.accuracy=null;delete effectiveMode.sourceStatisticsCorrection;
    }
    if(printedAccuracyZero[modeId]) {
      const fields=expectedPrintedFields(modeId);
      for(const [field,value]of Object.entries(fields)) {
        assert.equal(modes.get(modeId).stats[field],null);assert.equal(effectiveMode.stats[field],value);
        effectiveMode.stats[field]=null;
      }
      assert.deepEqual(effectiveMode.sourceStatisticsCorrection,{version:1,source:printedAccuracyZero[modeId],
        fields:Object.entries(fields).map(([field,value])=>({field,original:null,value}))});
      delete effectiveMode.sourceStatisticsCorrection;
    }
    if(modeId==='WaIDKb3cN40p-9pJu') {
      const changes=[];
      for(const [index,rule]of effectiveMode.defaults.entries())if(rule.type==='skill'&&rule.name==='Guns'&&
        ['Rifle','Musket','Shotgun','Light Machine Gun','Submachine Gun'].includes(rule.specialization)) {
        assert.equal(rule.modifier,-4);rule.modifier=-2;changes.push({index,original:-2,value:-4});
      }
      assert.equal(changes.length,5);
      assert.deepEqual(effectiveMode.sourceDefaultsCorrection,{version:1,source:'HT98',changes});delete effectiveMode.sourceDefaultsCorrection;
    }
    if(modeId==='WGZlqJxbZOxd6FR4h'){
      assert.equal(effectiveMode.raw_calc.damage,'1d-3(0.5) cr');assert.equal(effectiveMode.stats.damage.base,'1d-3');
      assert.deepEqual(effectiveMode.sourceDamageCorrection,{version:1,source:'HT88, baton table; HT89, paint/pepper described separately',original:'2d-3(0.5) cr',value:'1d-3(0.5) cr'});
      effectiveMode.raw_calc.damage='2d-3(0.5) cr';effectiveMode.stats.damage.base='2d-3';delete effectiveMode.sourceDamageCorrection;
    }
    assert.deepEqual(effectiveMode,projectHTPreGaussMode(modes.get(modeId),catalogs.getEquipmentForMode(modeId)));const projected=catalogs.getAmmoItem("ht",ammo.id);
    assert.equal(projected.id,ammo.id);
    const reviewed=Object.entries(reviewedIdentities),removed=new Set(reviewed.filter(([,r])=>r[0]===ammo.id).map(([id])=>id));
    if(ammo.id===LEMAT.revolverAmmoId)removed.add(LEMAT.shotModeId);
    const added=reviewed.filter(([,r])=>r[1]===ammo.id).map(([id])=>id);
    assert.deepEqual(projected.weapon_mode_ids,[...new Set([...ammo.weapon_mode_ids.filter(id=>!removed.has(id)),...added])]);
    const restored={...projected,weapon_mode_ids:[]};
    if(ammo.id==='ht_specific_hydra_laser_guided_70mm'){
      assert.equal(ammo.attack_override,null);
      assert.deepEqual(projected.attack_override,{damage:'7dx3 cr ex [3d+2 cut]',secondary_effects:[],selected_variant_only:true,range:'300/10,500',acc:'4'});
      assert.deepEqual(projected.guidancePackage,{warheadAmmoId:'ht_specific_hydra_mk66_he',source:'HT150: MK66 HE with laser guidance package; independent warhead and guidance',acc:4,manualGuidance:true});
      restored.attack_override=null;delete restored.guidancePackage;
    }
    if(names[ammo.id]){assert.equal(projected.name,names[ammo.id]);assert.equal(projected.sourceLabelCorrection.original,ammo.name);
      assert.equal(projected.sourceLabelCorrection.version,1);restored.name=ammo.name;delete restored.sourceLabelCorrection;}
    assert.deepEqual(restored,{...ammo,weapon_mode_ids:[]});}
  assert.equal(count,510);
});
test("charge editor defaults to the actual barrel capacity without invented mass/price inputs",()=>{
  const w={id:"shot",standaloneModeId:LEMAT.shotModeId,ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
  const html=ammoManagementHTML(w,{language:"ru"},[{...shot.base,key:ammoTypeKey(shot.base)}]);
  assert.match(html,/name="newCapacity" min="1" max="1" step="1" value="1"/);assert.match(html,/data-charge-economics/);
  assert.ok(!/value="0"[^>]*data-(cost|weight)/.test(html));
});
test("cached older translations still load actual new LeMat keys in RU/EN without changing user language",async()=>{
  for(const lang of["ru","en"]){const translations={"OleGURPS.AutomaticAmmo.ShotgunCloseGM":"already cached"};let fetched=0;
    const runtime={location:{},fetch:async()=>{fetched++;return {ok:true,json:async()=>JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"))};},
      foundry:{utils:{setProperty:(o,k,v)=>{o[k]=v;}}},game:{i18n:{lang,translations,localize:k=>translations[k]??k}}};
    await loadAutomaticAmmoTranslations(runtime);assert.equal(fetched,0);assert.equal(runtime.game.i18n.lang,lang);
    assert.deepEqual(translations,{"OleGURPS.AutomaticAmmo.ShotgunCloseGM":"already cached"});
    assert.equal(automaticAmmoText("LeMatIdentityReview",lang),automaticAmmoMessages.ru.LeMatIdentityReview);
  }
});
