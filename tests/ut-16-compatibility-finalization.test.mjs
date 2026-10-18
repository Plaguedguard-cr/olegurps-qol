import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fixture,load,shoot,catalogs,automatic,compatibility,resolver,api} from './helpers/ut-ammunition-fixture.mjs';
import {PARTISAN_NEEDLER,ICE_GUN,UT_EXCLUDED_LP_SHOTGUNS,UT_ICE_HOMING,UT_COMPATIBILITY_REVISION,utCompatibilityDecision} from '../scripts/ut-compatibility-policy.js';
import {lpAdmission,LP_PROFILES} from '../scripts/tools/ut-liquid-propellant.js';
import {etcAdmission} from '../scripts/tools/ut-etc.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import {UT_HOMING_CANDIDATES} from '../scripts/tools/ut-sefop.js';
import {UT_EXTENDED_SOURCE} from '../scripts/tools/ut-extended-source.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {ammoTypeKey,projectAmmoInventory} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';

const swarm25=['WdUnAFzFvv59Smhhk','WgqAB3QGTUZrgtdES','WSv_Zh3pW3Tl-tCf5','WPa4KUGJ6449MaPL9'];
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
const configure=async(v,variant)=>{const s=v.state();s.weapons.find(w=>w.id===v.carrier.id).executionRequest={variant,modeId:v.carrier.standaloneModeId};await v.service.saveState(s);};
const ready=async(v,variantId,parameters={})=>{
  const base=v.candidates().find(t=>!t.recipe&&!t.unavailable),p=automatic.prepare({modeId:v.carrier.standaloneModeId,base,variantId,parameters});
  assert.equal(p.state,'complete',p.reasons);await v.transaction('save-recipe',{type:p.type});return p;
};
async function injectOldMagazine(v,type){
  const s=v.state(),w=s.weapons.find(w=>w.id===v.carrier.id),mag=w.ammunitionInventory.magazines[0];
  w.ammunitionInventory.stocks.push({key:type.key,type,rounds:3});Object.assign(mag,{ammoKey:type.key,rounds:2});projectAmmoInventory(w);
  await v.actor.setFlag('world','gurpsAmmoManager',s);return mag.id;
}
function oldType(v,variantId,parameters={}){
  const base=v.candidates().find(t=>!t.recipe&&!t.unavailable),type={...base,recipe:{version:1,variantId,customId:'old-unverified',parameters}};
  type.key=ammoTypeKey(type);return type;
}

test('all 2484 original keys remain unique, exactly 11 source decisions change and all 16 decisions are final',async()=>{
  assert.deepEqual(matrix.summary,{modes:34,mainModes:28,configurations:36,candidates:69,pairs:2484,confirmed:320,conditional:506,undetermined:5,incompatible:1653,available:821,blocked:5});
  assert.equal(new Set(matrix.rows.map(r=>r.configurationId+':'+r.candidateId)).size,2484);
  assert.equal(createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(matrix.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'),contract.sourceStatusDigestBeforeUAW);
  assert.equal(matrix.source.compatibilityRevision,UT_COMPATIBILITY_REVISION);
  assert.equal(matrix.source.compatibilityStatusDigest,createHash('sha256').update(JSON.stringify(matrix.rows.map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'));
  assert.deepEqual(matrix.rows.filter(r=>r.status==='undetermined').map(r=>r.modeId).sort(),[...UT_EXCLUDED_LP_SHOTGUNS].sort());
  assert.deepEqual(matrix.rows.filter(r=>r.implementation==='blocked').map(r=>r.configurationId+':'+r.candidateId).sort(),[
    'WkudgdqO3lymAYks5:etc','WOMuCBSS_c_nIstvm:liquid_propellant','W5_HQQYf_zjoG9A7J:liquid_propellant',
    'W5_HQQYf_zjoG9A7J:carbine-magazine:liquid_propellant','WmyROTLk0gs7lrYCE:storm-rifle-magazine:liquid_propellant'].sort());
  assert.deepEqual(JSON.parse(await readFile(new URL('../data/ut-weapon-ammunition-matrix.json',import.meta.url),'utf-8')),matrix);
  for(const row of matrix.rows){assert.ok(catalogs.getMode(row.modeId));assert.ok(catalogs.getAmmoFamily('ut',row.ammoFamilyId));assert.ok(matrix.candidates.some(c=>c.id===row.candidateId));}
});

for(const id of UT_EXCLUDED_LP_SHOTGUNS)test('excluded PC LP has no UI, request, old-state or direct resolver bypass '+id,async()=>{
  const v=await fixture(id),base=v.candidates().find(t=>!t.recipe&&!t.unavailable);await load(v,base);
  const row=matrix.rows.find(r=>r.modeId===id&&r.candidateId==='liquid_propellant');assert.equal(row.status,'undetermined');assert.equal(row.implementation,'excluded');assert.equal(row.implementationExcluded,true);
  assert.equal(LP_PROFILES[id],undefined);assert.equal(lpAdmission(id,catalogs,12).allowed,false);
  const before=JSON.stringify(v.state());await assert.rejects(configure(v,'lp'));assert.equal(JSON.stringify(v.state()),before);
  const ordinary=await shoot(v);assert.equal(ordinary.spent,1);
  if(etcAdmission(id,catalogs).allowed){await configure(v,'etc');assert.equal((await shoot(v)).receipt.power.spent,1);}
  const s=v.state(),w=s.weapons.find(w=>w.id===v.carrier.id);Object.assign(w,{executionVariant:'lp',lpConfigured:true,lpFuel:{capacityUnits:300,remainingUnits:300}});await v.actor.setFlag('world','gurpsAmmoManager',s);
  assert.equal(v.profile().damage.nativeSafe,false);const saved=JSON.stringify(v.state());await assert.rejects(shoot(v));assert.equal(JSON.stringify(v.state()),saved);
});

for(const id of swarm25)test('Swarm25 denied in catalog, selectors, resolver and old magazines without destroying stock '+id,async()=>{
  const v=await fixture(id),base=v.candidates().find(t=>!t.recipe&&!t.unavailable);
  assert.equal(compatibility.checkCompatibility(id,'swarm',{book:'ut',kind:'warhead',availabilityTL:12}).status,'incompatible');
  assert.notEqual(automatic.prepare({modeId:id,base,variantId:'ut_swarm',parameters:{availabilityTL:10}}).state,'complete');
  assert.ok(!v.candidates().some(t=>t.recipe?.variantId==='ut_swarm'&&!t.unavailable));
  const type=oldType(v,'ut_swarm',{availabilityTL:10,note:'Old swarm'}),mag=await injectOldMagazine(v,type),old=JSON.stringify(v.state());
  assert.equal(v.profile().damage.nativeSafe,false);await assert.rejects(shoot(v));assert.equal(JSON.stringify(v.state()),old);
  await assert.rejects(v.transaction('load',{magazineId:mag,ammoKey:type.key,amount:1}));
  await v.transaction('unload',{magazineId:mag,amount:2});assert.equal(v.weapon().ammunitionInventory.stocks.find(s=>s.key===type.key).rounds,5);
  await v.transaction('add-stock',{ammoKey:base.key,amount:1});await v.transaction('load',{magazineId:mag,ammoKey:base.key,amount:1});assert.equal((await shoot(v)).spent,1);
  const facts={sourceEdition:'Ultra-Tech 2007',modeId:id,ammoId:base.ammoId,caliberMm:25,availabilityTL:10,definition:{id:'swarm'},payload:{note:'Old'},row:{capacity:'1 square-yard swarm'}};
  assert.equal(resolveAmmunitionEffects({raw:v.attack().data,variantId:'ut_swarm',baseStatus:'compatible',constructionStatus:'compatible',facts}).nativeSafe,false);
});

for(const [size,capacity]of [[40,'1 square-yard swarm'],[64,'4 square-yard swarms'],[100,'16 square-yard swarms']])test('Swarm '+size+' retains the exact published table and all other carrier conditions',async()=>{
  assert.equal(utCompatibilityDecision('boundary-check','swarm',{caliberMm:size}),null);
  assert.equal(catalogs.getCatalog('ut').warheads.find(w=>w.id==='swarm').damage_table[size+'mm'].capacity,capacity);
  assert.equal(UT_EXTENDED_SOURCE.ut_swarm.damage_table[size+'mm'].capacity,capacity);
  for(const row of matrix.rows.filter(r=>r.candidateId==='swarm'&&matrix.modes.find(m=>m.modeId===r.modeId).caliberMm===size)){
    assert.notEqual(row.status,'incompatible');const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId};
    const p=automatic.prepare({modeId:row.modeId,base,variantId:'ut_swarm',parameters:{availabilityTL:10,note:'Swarm'}});assert.equal(p.state,'complete');assert.equal(p.facts.row.capacity,capacity);
  }
});

for(const tl of [10,11,12])for(const candidate of UT_ICE_HOMING)test('Ice Gun '+candidate+' has no TL'+tl+' or generic Homing bypass',async()=>{
  const v=await fixture(ICE_GUN),base=v.candidates().find(t=>!t.recipe),parameters={availabilityTL:tl,homingGuidance:UT_HOMING_CANDIDATES[candidate]??'infrared'};
  assert.equal(compatibility.checkCompatibility(ICE_GUN,candidate,{book:'ut',availabilityTL:tl}).status,'incompatible');
  assert.notEqual(automatic.prepare({modeId:ICE_GUN,base,variantId:'ut_homing',parameters}).state,'complete');
  const row=matrix.rows.find(r=>r.modeId===ICE_GUN&&r.candidateId===candidate);assert.equal(row.status,'incompatible');
  assert.equal(row.basis,candidate==='homing'||candidate==='homing_ir'?'user-construction-exclusion':'UT146-caliber-limit');
  assert.ok(!v.candidates().some(t=>t.recipe?.variantId==='ut_homing'&&!t.unavailable));
  const type=oldType(v,'ut_homing',parameters);await injectOldMagazine(v,type);const before=JSON.stringify(v.state());
  assert.equal(v.profile().damage.nativeSafe,false);await assert.rejects(shoot(v));assert.equal(JSON.stringify(v.state()),before);
  assert.equal(v.service.readAttackAmmunition(v.carrier.id).type.ammoId,'3mm_ice');
});

test('Ice ordinary and drugged slivers remain usable, with their original physical family',async()=>{
  const v=await fixture(ICE_GUN),base=v.candidates().find(t=>!t.recipe);await load(v,base);assert.equal((await shoot(v)).spent,1);
  const mag=v.weapon().ammunitionInventory.installedId;await v.transaction('unload',{magazineId:mag,amount:v.weapon().magazines[0]});
  const p=await ready(v,'ut_drugged_ice',{note:'Owner drug'});await load(v,p.type);const r=await shoot(v);assert.equal(r.spent,1);assert.equal(r.snapshot.ammunition.ammoId,'3mm_ice');assert.equal(r.snapshot.profile.damage.rules.doses,1);
});

test('Partisan external Drugged Dart uses stock, native dice, immutable history and an independent ordinary magazine',async()=>{
  const v=await fixture(PARTISAN_NEEDLER),base=v.candidates().find(t=>!t.recipe);assert.equal(v.weapon().capacity,140);assert.equal(v.attack().data.shots,'140(3)');
  assert.ok(catalogs.getMode(PARTISAN_NEEDLER).ammunition_profile.special_load_ids.includes('drugged_dart'));
  const p=await ready(v,'ut_drugged_dart',{note:'Player substance',savingThrow:'Manual HT',description:'Full player text'});
  assert.equal(p.origin,'user-approved-conditional');assert.equal(p.type.recipe.autoProfile.source.kind,'user-approved-conditional');assert.equal(automatic.admission(p).authority,'user-approved-conditional');
  assert.equal(p.facts.ammunitionSupply.supply,'external-prepared');assert.equal(p.facts.ammunitionSupply.foundryProduces,false);
  const mag=v.weapon().ammunitionInventory.installedId;const empty=JSON.stringify(v.state());
  await assert.rejects(v.transaction('load',{magazineId:mag,ammoKey:p.type.key,amount:1}));assert.equal(JSON.stringify(v.state()),empty);
  await load(v,p.type,4);const before=JSON.stringify(v.state());await shoot(v,1,{cancel:true});assert.equal(JSON.stringify(v.state()),before);
  await assert.rejects(v.service.executeShot({weaponId:v.carrier.id,attackId:crypto.randomUUID(),prepare:()=>{throw Error('FailedPreparation');},execute:()=>assert.fail()}),/FailedPreparation/);assert.equal(JSON.stringify(v.state()),before);
  const profile=v.profile();assert.equal(profile.damage.formula,'2d pi-');assert.equal(profile.effective.range,'75/300');assert.equal(profile.damage.rules.doses,1);
  assert.equal(withRuntimeAmmoStats(v.attack(),v.actor).data.damage,'2d pi-');assert.ok(ammunitionChatData(profile).lines.length<=3);
  const shot=await shoot(v);assert.equal(shot.spent,1);assert.equal(shot.snapshot.profile.damage.formula,'2d pi-');assert.equal(v.weapon().magazines[0],3);
  assert.match(shot.message.content,/внешний дротик/);assert.doesNotMatch(shot.message.content,/free doses|solar|литейка/);
  const historical=JSON.stringify(shot.snapshot),resources=JSON.stringify(v.state());await shoot(v,1,{attackId:shot.snapshot.attackId});assert.equal(JSON.stringify(v.state()),resources);
  const newService=new AmmoService(v.actor);await newService.loadState();assert.equal(JSON.stringify(v.weapon().ammunitionInventory),JSON.stringify(JSON.parse(resources).weapons[0].ammunitionInventory));
  await v.transaction('add-magazines',{amount:1,capacity:140});const second=v.weapon().ammunitionInventory.magazines.at(-1).id;
  await v.transaction('add-stock',{ammoKey:base.key,amount:140});await v.transaction('load',{magazineId:second,ammoKey:base.key,amount:140});await v.transaction('install',{magazineId:second});
  assert.equal(v.profile().damage.formula,'2d pi-');assert.equal(v.profile().damage.rules.doses,undefined);assert.equal(v.profile().damage.rules.ammunitionSupply,undefined);assert.equal((await shoot(v)).spent,1);
  assert.equal(v.weapon().ammunitionInventory.magazines.find(m=>m.id===mag).rounds,3);await v.transaction('install',{magazineId:mag});assert.equal(v.profile().damage.rules.doses,1);assert.equal(JSON.stringify(shot.snapshot),historical);
  assert.deepEqual(v.actor.system,v.before);
});

test('Partisan owner needs no GM and no unrelated physical ammunition is admitted',async()=>{
  const user=game.user;game.user={id:'player',isGM:false};try{
    const v=await fixture(PARTISAN_NEEDLER),p=await ready(v,'ut_drugged_dart',{note:''});await load(v,p.type,1);assert.equal((await shoot(v)).spent,1);
    for(const family of ['3mm_ice','3mm_em','10mm_clp'])assert.equal(compatibility.checkCompatibility(PARTISAN_NEEDLER,family,{book:'ut',kind:'ammo-family'}).status,'incompatible');
    const foreign=await fixture(PARTISAN_NEEDLER);foreign.actor.isOwner=false;await assert.rejects(shoot(foreign));
  }finally{game.user=user;}
});
