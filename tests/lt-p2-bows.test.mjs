import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {LT_BOW_PROFILES,LT_BOW_IDS,LT_ARROW_IDS,normalizeLTBowConfiguration} from '../scripts/lt-bow-source.js';
import {resolveLTBowBase,ltBowDamage,applyLTBowDamageResult,ltBowRecipeAssessment} from '../scripts/tools/lt-bow.js';
import {StandaloneWeaponService,StandaloneWeaponDraft,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../scripts/tools/ammo-service.js';
import {basicStrengthDamage} from '../scripts/tools/gurps-strength-damage.js';
import {AutomaticAmmunitionProfileService} from '../scripts/tools/automatic-ammunition-profiles.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData,compactAmmoSource} from '../scripts/tools/ammunition-chat-summary.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
function actor(){return {id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{DX:{value:20},ST:{value:14}},skills:{bow:{name:'Bow',level:18,points:1},crossbow:{name:'Crossbow',level:18,points:1}}},
 getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
const type=id=>({key:'lt:'+id,label:id,source:'catalog',book:'lt',kind:'ammo-item',ammoId:id});
async function fixture(id,configuration={},a=actor()){
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(catalogs.getEquipmentForMode(id).equipment_id);draft.modeIds=new Set([id]);
 draft.ltBow={ratedST:LT_BOW_PROFILES[id].kind==='steel'?24:14,...configuration};
 const definitions=new StandaloneWeaponService(a,catalogs),record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);
 const state=a.getFlag('world','gurpsAmmoManager')??{weapons:[],attackOverrides:{},shotReceipts:{}};state.weapons.push(weapon);await a.setFlag('world','gurpsAmmoManager',state);
 const service=new AmmoService(a);
 const profile=(state=a.getFlag('world','gurpsAmmoManager'),ammunition=readAttackAmmunition(state.weapons.find(w=>w.id===weapon.id)))=>{
  const attack=readStandaloneAttack(a,record.id,id);return resolver.resolve({actor:a,actorId:a.id,weaponId:weapon.id,attack,state,ammunition,binding:standaloneCatalogBinding(attack,catalogs)});
 };
 const transaction=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>[t]});
 const load=async(t,n)=>{await transaction('add-stock',{ammoKey:t.key,amount:n},t);const m=weapon.ammunitionInventory.magazines[0];await transaction('load',{magazineId:m.id,ammoKey:t.key,amount:n},t);};
 const shoot=(attackId=crypto.randomUUID(),execute=async()=>({rolled:true,messageId:'native-'+attackId}))=>service.executeShot({weaponId:weapon.id,attackId,
  prepare:({state,ammunition})=>({profile:profile(state,ammunition),amount:1}),execute});
 return {actor:a,weapon,record,draft,definitions,service,profile,transaction,load,shoot};
}
test('all 18 personal LT source rows keep their own published Damage, minimum, range and nullable Rcl',()=>{
 assert.equal(Object.keys(LT_BOW_PROFILES).length,18);
 for(const p of Object.values(LT_BOW_PROFILES)){
  const m=catalogs.getMode(p.modeId);assert.ok(m);assert.equal(m.stats.damage.st,'thr',p.name);assert.equal(Number(m.stats.damage.base??0),p.bonus,p.name);assert.equal(m.stats.damage.type,p.damageType,p.name);
  assert.equal(Number(m.stats.accuracy),p.acc);assert.equal(m.stats.recoil,null);assert.ok(m.lt_bow_contract);
  const b=resolveLTBowBase({modeId:p.modeId,configuration:{ratedST:p.kind==='steel'?24:14}});
  assert.equal(b.ready,true);assert.equal(b.effectiveDamageST,p.kind==='steel'?12:14);assert.deepEqual(b.range,[p.half,p.max].map(x=>x*(p.kind==='steel'?12:14)));
 }
});
for(const p of Object.values(LT_BOW_PROFILES))test(p.name+': every individually linked physical projectile resolves through the common profile',async()=>{
 const f=await fixture(p.modeId),ids=catalogs.getMode(p.modeId).lt_ammo_item_ids;
 let confirmed=0;
 for(const id of ids){
  const c=compatibility.checkCompatibility(p.modeId,id,{book:'lt',kind:'ammo-item',ltBow:f.weapon.ltBow});
  if(c.status!=='compatible')continue;
  const t=type(id),profile=f.profile(undefined,{kind:'physical-magazine',type:t,magazineId:'test',available:10});
  assert.equal(profile.damage.nativeSafe,true,`${p.name}/${id}: ${profile.damage.reason}`);assert.equal(profile.effective.rcl,null);assert.ok(!/\bthr|\bsw/.test(profile.effective.damage));
  assert.equal(profile.damage.rules.ltBow.projectile,id);assert.equal(profile.damage.rules.projectiles.b409Eligible,false);confirmed++;
 }
 assert.ok(confirmed>0,p.name);
});
test('Rated ST is per instance, never inferred from Actor ST or minimum; temporary ST, Striking and Lifting do not change ballistic Damage',async()=>{
 const a=actor(),id=LT_BOW_IDS[0],f=await fixture(id,{ratedST:12},a),g=await fixture(id,{ratedST:18},a),t=type('lt_regular_arrow');
 const resolve=f=>f.profile(undefined,{kind:'preview',type:t});const before=resolve(f).damage.formula;
 assert.notEqual(before,resolve(g).damage.formula);
 for(const st of [1,12,50]){a.system.attributes.ST.value=st;a.system.ads={s:{name:'Striking ST',level:20},l:{name:'Lifting ST',level:9},r:{name:'Arm ST',level:4}};
  a.flags['olegurps-qol'].strengthAdjustments={modifiers:{st:3,striking:8,lifting:2,arm:1}};assert.equal(resolve(f).damage.formula,before);}
 const unknown=resolveLTBowBase({modeId:id,configuration:{}});assert.equal(unknown.ready,false);assert.equal(unknown.configuration.ratedST,null);
 assert.throws(()=>normalizeLTBowConfiguration({ratedST:10},id));assert.throws(()=>normalizeLTBowConfiguration({ratedST:12.5},id));
 const bytes=JSON.stringify(a.flags);f.definitions.load();assert.equal(JSON.stringify(a.flags),bytes);
});
test('draw strength uses Lifting and explicitly selected Arm; cranequin and legs keep source conditions; repeating conflict stays separate',()=>{
 const a=actor();a.system.ads={s:{name:'Striking ST',level:30},l:{name:'Lifting ST',level:2},r:{name:'Arm ST',level:3}};
 const draw=(id,c)=>resolveLTBowBase({actor:a,modeId:id,configuration:{ratedST:24,...c}}).drawing;
 assert.equal(draw(LT_BOW_IDS[0],{}).strength,16);assert.equal(draw(LT_BOW_IDS[0],{applyArmST:true}).strength,19);
 assert.deepEqual(draw(LT_BOW_IDS[0],{drawMethod:'two-legs',applyArmST:true}).ratio,[1.2,1.3]);assert.equal(draw(LT_BOW_IDS[0],{drawMethod:'two-legs',applyArmST:true}).arm,0);
 assert.equal(draw('Wak71wpexyuS6wOgQ',{}).ratio,3);assert.equal(draw('WwpI_P5DL8za5501B',{}).selfCocking.maximumSTFactor,1);
});
test('all arrow heads, separate linked damage, divisors and rolled Flight damage preserve the published formulas',()=>{
 const id=LT_BOW_IDS[0],cfg={ratedST:14};
 const damage=ammo=>ltBowDamage({modeId:id,configuration:cfg,type:type(ammo),catalogs,context:{physicalDistance:10}});
 assert.equal(damage('lt_bodkin_arrow').formula,'1d+2(2) pi');assert.equal(damage('lt_blunt_arrow_lt73').formula,'1d+2 cr');
 assert.equal(damage('lt_bowel_raker_arrow_lt73').effectiveChanges.range,'140/210');assert.equal(damage('lt_bowel_raker_arrow_lt73').effectiveChanges.acc,2);
 const fire=damage('lt_fire_arrow_lt73');assert.equal(fire.formula,'1d+2 imp');assert.equal(fire.rules.attackBonus,0);assert.equal(fire.components[1].formula,'1d-1 cr ex');
 assert.equal(damage('lt_fire_cage_arrow_lt73').rules.attackBonus,-2);assert.equal(damage('lt_humming_bulb_arrow_lt73').formula,'1d+2(0.5) cr');
 const flight=damage('lt_flight_arrow_lt73');assert.equal(flight.formula,'1d+2 imp');assert.equal(flight.effectiveChanges.range,'420/560');
 const result=applyLTBowDamageResult({damage:7},flight.rules);assert.equal(result.damage,3);assert.deepEqual(applyLTBowDamageResult(result,flight.rules),result);
 const atHalf=ltBowDamage({modeId:id,configuration:cfg,type:type('lt_flight_arrow_lt73'),catalogs,context:{physicalDistance:420}});
 assert.equal(applyLTBowDamageResult({damage:9},atHalf.rules).damage,4);
 const distant=ltBowDamage({modeId:id,configuration:cfg,type:type('lt_flight_arrow_lt73'),catalogs,context:{physicalDistance:421}});
 assert.equal(applyLTBowDamageResult({damage:9},distant.rules).damage,0);
});
test('Navak requires its physical guide and matching mode; neither family nor ordinary-arrow recipe bypasses it',async()=>{
 const id=LT_BOW_IDS[0],t=type('lt_arrow_guide_dart');
 const f=await fixture(id,{shotMode:'navak'});await assert.rejects(f.load(t,1));
 const g=await fixture(id,{shotMode:'navak',arrowGuideInstalled:true});await g.load(t,1);
 const p=g.profile();assert.equal(p.damage.nativeSafe,true,p.damage.reason);assert.equal(p.effective.acc,4);assert.equal(p.effective.damage,'1d+1 imp');assert.equal(p.effective.shots,'1(3)');
 assert.equal(ltBowDamage({modeId:id,configuration:{ratedST:14},type:{...t,kind:'ammo-family',ammoId:'bow_arrow_guide_dart'},catalogs}).nativeSafe,false);
 assert.equal(ltBowDamage({modeId:id,configuration:g.weapon.ltBow,type:type('lt_regular_arrow'),catalogs}).nativeSafe,false);
});
test('Panjagan and both Slurbow sizes consume exactly 5/2/5 physical projectiles; cancel, short salvo, duplicate and damage replay do not spend extra',async()=>{
 for(const [id,cfg,ammo,units]of [[LT_BOW_IDS[0],{shotMode:'panjagan5',panjaganInstalled:true},'lt_regular_arrow',5],['W11eNBa3voVFCsgWv',{},'lt_slurbow_medium_dart_lt76',2],['WFAwJH7XlIK-bIy0Q',{},'lt_slurbow_small_dart_lt76',5]]){
  const f=await fixture(id,cfg),t=type(ammo);await f.load(t,units-1);
  await assert.rejects(f.shoot());assert.equal(readAttackAmmunition(f.actor.flags.world.gurpsAmmoManager.weapons[0]).available,units-1);
  await f.load(t,1);const before=JSON.stringify(f.actor.flags),cancel=await f.shoot(undefined,async()=>({rolled:false}));assert.equal(cancel.rolled,false);assert.equal(JSON.stringify(f.actor.flags),before);
  const attackId=crypto.randomUUID(),r=await f.shoot(attackId);assert.equal(r.rolled,true);assert.equal(r.snapshot.spent,units);assert.equal(r.snapshot.profile.resource.physicalUnits,units);
  assert.equal(readAttackAmmunition(f.actor.flags.world.gurpsAmmoManager.weapons[0]).available,0);
  await f.shoot(attackId,()=>{throw Error('duplicate executed');});const frozen=JSON.stringify(r.snapshot);
  f.actor.system.attributes.ST.value=99;f.actor.flags['olegurps-qol'].standaloneWeapons.weapons[0].settings.ltBow.ratedST=30;
  assert.equal(JSON.stringify(r.snapshot),frozen);assert.equal(r.snapshot.profile.damage.rules.ltBow.ratedST,14);
 }
});
test('Slurbow wrong size and ambiguous old darts cannot be loaded; existing stock can be unloaded',async()=>{
 const f=await fixture('W11eNBa3voVFCsgWv');await assert.rejects(f.load(type('lt_slurbow_small_dart_lt76'),2));
 await assert.rejects(f.load(type('lt_slurbow_dart_lt76'),2));await assert.rejects(f.load(type('lt_throwing_dart'),2));
 const t=type('lt_slurbow_medium_dart_lt76');await f.load(t,2);await f.transaction('unload',{magazineId:f.weapon.ammunitionInventory.magazines[0].id,amount:2},t);
 assert.equal(readAttackAmmunition(f.actor.flags.world.gurpsAmmoManager.weapons[0]).available,0);
});
test('Repeating hopper holds ten, fires one, and retains published thr+1 without choosing the disputed draw limit',async()=>{
 const f=await fixture('WwpI_P5DL8za5501B',{ratedST:8}),t=type('lt_standard_crossbow_bolt');await f.load(t,10);
 assert.equal(f.profile().damage.formula,'1d-2 imp');const r=await f.shoot();assert.equal(r.snapshot.spent,1);
 assert.equal(readAttackAmmunition(f.actor.flags.world.gurpsAmmoManager.weapons[0]).available,9);
});
test('LT recipe construction is limited to confirmed heads on individually compatible personal projectiles',()=>{
 const assess=(id,ammo,variant)=>ltBowRecipeAssessment({modeId:id,type:{...type(ammo),recipe:{version:1,variantId:variant}},compatibility});
 assert.equal(assess(LT_BOW_IDS[0],'lt_regular_arrow','flight').applicationAllowed,true);
 assert.equal(assess('WHwsNi90Y4m49YOzg','lt_standard_crossbow_bolt','bodkin').applicationAllowed,true);
 assert.equal(assess('WHwsNi90Y4m49YOzg','lt_standard_crossbow_bolt','flight').applicationAllowed,false);
 assert.equal(assess('Wdn9cVYekaOlUeQnQ','lt_pistol_crossbow_dart_lt76','bodkin').applicationAllowed,false);
 assert.equal(assess('unknown','lt_regular_arrow','flight'),null);
});
test('all admitted LT-P2 physical pairs pass stock/load/attack/consume/unload and fixed-feed limits in the Actor queue',async()=>{
 let pairs=0;
 for(const p of Object.values(LT_BOW_PROFILES)){
  const f=await fixture(p.modeId),units=p.units;
  for(const id of catalogs.getMode(p.modeId).lt_ammo_item_ids){
   if(compatibility.checkCompatibility(p.modeId,id,{book:'lt',kind:'ammo-item',ltBow:f.weapon.ltBow}).status!=='compatible')continue;
   const t=type(id);await f.load(t,units);const r=await f.shoot();assert.equal(r.snapshot.spent,units,p.name+'/'+id);pairs++;
  }
  await assert.rejects(f.transaction('add-magazines',{amount:1,capacity:1}));
 }
 assert.equal(pairs,92);
 for(const id of LT_BOW_IDS){
  const navak=await fixture(id,{shotMode:'navak',arrowGuideInstalled:true});await navak.load(type('lt_arrow_guide_dart'),1);assert.equal((await navak.shoot()).snapshot.spent,1);pairs++;
  const panjagan=await fixture(id,{shotMode:'panjagan5',panjaganInstalled:true});
  for(const ammoId of Object.keys(LT_ARROW_IDS)){await panjagan.load(type(ammoId),5);assert.equal((await panjagan.shoot()).snapshot.spent,5);pairs++;}
 }
 assert.equal(pairs,170);
});
test('the common LT factory, recipe save/edit, candidates and combat all enforce the same projectile head matrix',async()=>{
 const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility}),f=await fixture(LT_BOW_IDS[0]);
 const prepared=automatic.prepare({modeId:LT_BOW_IDS[0],base:type('lt_regular_arrow'),variantId:'blunt',parameters:{note:'My full personal Note'}});
 assert.equal(prepared.state,'complete');assert.equal(automatic.admission(prepared).allowed,true);
 const t=structuredClone(prepared.type);t.recipe.customId='my-lt-batch';t.key=ammoTypeKey(t);await f.transaction('save-recipe',{type:t},t);await f.load(t,1);assert.equal(f.profile().damage.formula,'1d+2 cr');
 await f.transaction('unload',{magazineId:f.weapon.ammunitionInventory.installedId,amount:1},t);
 await f.transaction('edit-recipe',{ammoKey:t.key,type:{...t,recipe:{...t.recipe,parameters:{note:'Changed Note'}}}},t);
 const bow=await fixture('WHwsNi90Y4m49YOzg'),invalid={...type('lt_standard_crossbow_bolt'),recipe:{version:1,variantId:'flight'}};
 assert.equal(bow.profile(undefined,{kind:'preview',type:invalid}).damage.nativeSafe,false);await assert.rejects(bow.load(invalid,1));
 const {ammunitionCandidates}=await import('../scripts/tools/ammo-management-app.js');
 const navak=await fixture(LT_BOW_IDS[0],{shotMode:'navak',arrowGuideInstalled:true});assert.ok(ammunitionCandidates(navak.actor,navak.weapon).some(t=>t.ammoId==='lt_arrow_guide_dart'&&!t.unavailable));
 assert.equal(resolveLTBowBase({modeId:'WPn4rW6HE64VST_pm',configuration:{ratedST:25}}).rangeST,12);
});
test('short LT chat keeps its source and full user Note while old snapshots, shortage and foreign ownership remain protected',async()=>{
 const f=await fixture(LT_BOW_IDS[0]);await f.load(type('lt_fire_arrow_lt73'),1);const p=f.profile();
 assert.equal(compactAmmoSource('LT73-78; B277'),'LT73–78; B277');
 const chat=ammunitionChatData(p);assert.ok(chat);assert.ok(JSON.stringify(chat).includes('LT73'));
 const bytes=JSON.stringify(f.actor.flags);f.actor.isOwner=false;await assert.rejects(f.shoot(),/Permission/);assert.equal(JSON.stringify(f.actor.flags),bytes);
});
test('changed definition settings invalidate a stale carrier before new load or fire; rejected operations preserve stock',async()=>{
 const f=await fixture(LT_BOW_IDS[0],{shotMode:'navak',arrowGuideInstalled:true}),t=type('lt_arrow_guide_dart');await f.load(t,1);
 f.actor.flags['olegurps-qol'].standaloneWeapons.weapons[0].settings.ltBow.arrowGuideInstalled=false;
 const before=JSON.stringify(f.actor.flags);await assert.rejects(f.shoot());await assert.rejects(f.transaction('add-stock',{ammoKey:t.key,amount:1},t));
 assert.equal(JSON.stringify(f.actor.flags),before);
});
