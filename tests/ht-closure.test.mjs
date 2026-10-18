import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogs,compatibility,resolver,context,api,profile} from './fixtures/ht-special-context.mjs';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {standaloneConfigurationHTML} from '../scripts/tools/standalone-weapon-configuration.js';
import {availableAmmoTypes} from '../scripts/tools/ammo-management-app.js';
import {applyInventoryOperation,ammoTypeKey,inventoryTotal} from '../scripts/tools/ammo-inventory.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {gyrojetRangeRule,applyGyrojetDamageResult,GYROJET_MODE,GYROJET_AMMO} from '../scripts/tools/gyrojet-range.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {calculateHitsFromMargin} from '../scripts/tools/prepared-gga-roll.js';
import {sourceEnvironmentDefinition} from '../scripts/tools/environment-ammunition.js';
import {moduleText} from '../scripts/localization.js';
import {measureTokenDistanceYards} from '../scripts/tools/fire-control-context.js';
import {platformMotionError} from '../scripts/ht-specialized-platforms.js';

const earlier=readAuditFixture('ht-final-511-runtime-audit').rows.filter(r=>r.standaloneReadiness?.status==='BLOCKED');
export async function standaloneFixture(mid,overrides={}){
 const equipment=catalogs.getEquipmentForMode(mid),mode=catalogs.getMode(mid),skill=mode.governing_skill.skill;
 const name=skill.name+(['Guns','Artillery','Gunner'].includes(skill.name)?'/TL'+equipment.tech_level:'')+(skill.specialization?' ('+skill.specialization+')':'');
 const flags={},actor={id:'closure',isOwner:true,system:{attributes:{DX:{value:12},IQ:{value:12}},skills:{one:{name,level:16,points:1}}},
   getFlag:(s,k)=>flags[s]?.[k],setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};
 const service=new StandaloneWeaponService(actor,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
 draft.selectModel(equipment.equipment_id);draft.modeIds=new Set([mid]);for(const [key,value]of Object.entries(overrides))draft.setOverride(mid,key,value);
 const record=await service.save(draft);return {actor,flags,service,draft,record,attack:readStandaloneAttack(actor,record.id,mid)};
}
for(const row of earlier)test('each formerly blocked source link uses explicit applicability: '+row.ordinal,async()=>{
 if(row.modeId==='WwlfY-FYthqkLvByK'){
  assert.equal(catalogs.getMode(row.modeId).stats.accuracy,'0');
  const f=await standaloneFixture(row.modeId);assert.equal(f.attack.readinessReason,null);
  assert.deepEqual(catalogs.getMode(row.modeId).ht_ammo_item_ids,['ht_22_long_rifle_5_7x16mmr']);return;
 }
 const f=await standaloneFixture(row.modeId),p=f.attack.platformRules;
 if(p?.kind==='mortar'){
  assert.equal(f.attack.readinessReason,null);assert.equal(f.attack.rcl,null);assert.equal(f.attack.bulk,null);
  assert.equal(f.attack.ammunitionRange.halfDamage,null);assert.equal(f.attack.ammunitionRange.minimum,Number(catalogs.getMode(row.modeId).stats.range.split('/')[0]));
  assert.equal(calculateHitsFromMargin(1,null,3),1);assert.equal(calculateHitsFromMargin(1,null,-1),0);
 }else if(p?.kind==='host-dependent'){
  assert(f.attack.readinessReason);const set=await standaloneFixture(row.modeId,{hostBulk:'-5'});
  assert.equal(set.attack.readinessReason,null);assert.equal(set.attack.bulk,row.modeId==='WGZlqJxbZOxd6FR4h'?-7:-6);
  assert.equal(set.record.modes[0].snapshot.stats.bulk,null);
 }else if(p){assert.equal(f.attack.readinessReason,null);assert.equal(f.attack.rcl,null);assert.equal(f.attack.bulk,null);
  const c=context(row.modeId),shot=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},profilePolicy:'permissive'});
  // Revised task permits native rolls after an explicit GM decision, without automating guidance.
  assert.equal(shot.damage.nativeSafe,true);assert.equal(shot.damage.rules.manualGuidance.required,true);
  assert.equal(shot.damage.rules.manualGuidance.confirmed,false);assert.equal(shot.damage.rules.manualGuidance.automaticGuidance,false);
  assert.equal(shot.damage.rules.ballisticRange.halfDamage,null);assert.equal(shot.damage.rules.platformRange.semantics,'speed-maximum');}
 else {assert.equal(row.modeId,'WwlfY-FYthqkLvByK');assert(f.attack.readinessReason);}
});
test('Sidewinder retains its explicit terminal ABF Rcl, without inventing a launch Rcl',async()=>{
 const f=await standaloneFixture('WQymu6IvqV_kTwiqz');assert.equal(f.attack.rcl,null);
 assert.equal(f.attack.platformRules.terminalProjectileRecoil,1);assert.equal(f.attack.platformRules.terminalSource,'HT152 note 6; HT174');
});
test('nullable mortar Bulk is not treated as zero during movement or close combat',async()=>{
 const mortar=(await standaloneFixture('W9aaejQdnPrtlwB0n')).attack;
 for(const key of ['moveAndAttack','closeCombat','closeHipShooting'])assert.match(platformMotionError(mortar,{[key]:true}),/Bulk/);
 assert.equal(platformMotionError(mortar,{moveAndAttack:false}),null);
 assert.equal(platformMotionError({},{moveAndAttack:true}),null);
});
test('ordinary rifles retain required Bulk/Rcl; malformed host values do not open a mode',async()=>{
 const f=await standaloneFixture('W27s4Lm8QlkKVKUPn');const saved=f.flags['olegurps-qol'].standaloneWeapons.weapons[0];saved.modes[0].snapshot.stats.recoil=null;
 assert(readStandaloneAttack(f.actor,f.record.id).readinessReason);
 for(const hostBulk of ['0','unknown','5','-5.5'])assert((await standaloneFixture('WBg7hpnW95SX83X-c',{hostBulk})).attack.readinessReason);
});
test('FN303 source baton correction and stock/host configuration preserve source record',async()=>{
 const stock=await standaloneFixture('WGZlqJxbZOxd6FR4h',{installation:'stock'});
 assert.equal(stock.attack.readinessReason,null);assert.equal(stock.attack.bulk,-4);assert.equal(stock.attack.damage,'1d-3(0.5) cr');
 const raw=catalogs.getCatalog('weapons').equipment.find(e=>e.equipment_id==='e3iE6ManVTuN4oEVH').modes[0];assert.equal(raw.raw_calc.damage,'2d-3(0.5) cr');
 const html=standaloneConfigurationHTML(stock.draft);assert.match(html,/Исполнение FN 303/);assert.match(html,/Bulk оружия-носителя/);
 const custom=await standaloneFixture('WGZlqJxbZOxd6FR4h',{installation:'stock',bulk:'-3'});assert.equal(custom.attack.bulk,-3);
});
for(const [yards,divisor]of [[1,3],[7,3],[7.01,2],[8,2],[21,2],[21.01,1],[22,1],[1000,1]])test('Gyrojet immutable boundary '+yards,()=>{
 const c=context(GYROJET_MODE),p=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},
  context:{shotgun:{physicalDistance:yards}},profilePolicy:'permissive'});
 assert.equal(p.damage.nativeSafe,true);assert.equal(p.raw.damage,'3d pi+');assert.equal(p.damage.formula,'3d pi+');
 assert.equal(p.damage.rules.gyrojetRange.damageDivisor,divisor);assert.equal(p.damage.rules.ballisticRange.halfDamage,null);
 assert.equal(p.damage.rules.ballisticRange.minimum,null);
 const old=createShotSnapshot(p,{attackId:'shot',spent:1,messageId:'message'}),text=JSON.stringify(old);
 const rolled={damage:11,roll:{total:11}},result=applyGyrojetDamageResult(rolled,p.damage.rules.gyrojetRange);
 assert.equal(result.damage,Math.floor(11/divisor));assert.equal(rolled.damage,11);assert.strictEqual(applyGyrojetDamageResult(result,p.damage.rules.gyrojetRange),result);
 assert.equal(JSON.stringify(old),text);assert(Object.isFrozen(old.profile));assert.equal(JSON.parse(text).profile.damage.rules.gyrojetRange.distanceYards,yards);
});
test('Gyrojet unknown distance and unsupported zero do not invent damage; other cartridges/components unaffected',()=>{
 assert.equal(gyrojetRangeRule(GYROJET_MODE,GYROJET_AMMO,'3d pi+',null).status,'distance-required');
 assert.equal(gyrojetRangeRule(GYROJET_MODE,GYROJET_AMMO,'3d pi+',0).status,'below-published-range');
 assert.equal(gyrojetRangeRule('another',GYROJET_AMMO,'3d pi+',1),null);
 assert.equal(gyrojetRangeRule(GYROJET_MODE,'another','3d pi+',1),null);
 const d={damage:11};assert.strictEqual(applyGyrojetDamageResult(d,gyrojetRangeRule(GYROJET_MODE,GYROJET_AMMO,'3d pi+',1),'fragmentation'),d);
});
test('confirmed Gyrojet cannot silently use full damage for unconfirmed legacy cartridges',()=>{
 const c=context(GYROJET_MODE),type={source:'legacy',name:'Unconfirmed'};
 const p=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,ammunition:{type},context:{physicalDistance:1}});
 assert.equal(p.damage.nativeSafe,false);assert.equal(p.damage.reason,'GyrojetIdentityRequired');
 assert.equal(p.ammunition.status,'legacy');assert.equal(p.raw.damage,'3d pi+');
 const ordinary=context('W27s4Lm8QlkKVKUPn');const old=resolver.resolve({actorId:'a',rawAttack:ordinary.raw,binding:ordinary.binding,ammunition:{type}});
 assert.equal(old.damage.nativeSafe,true);
});
test('HAFLA exact profile owns HT142 cloud and two Ready; adjacent WP never inherits them',()=>{
 const p=profile('Wr3VDL3Z6SR3KCz3K','ht_white_phosphorus');assert(p.damage.nativeSafe);
 assert.deepEqual(p.damage.rules.environment.sourceCloud,{radiusYards:7,durationSeconds:60,source:'HT142'});
 assert.deepEqual(p.damage.rules.environment.preparation,{readyManeuvers:2,source:'HT142',automaticApplication:false});
 const c=context('WjD-b9M0j2HJAcxyy');const hydra=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,
  ammunition:{type:{...c.base,ammoId:'ht_specific_hydra_70mm_wp'}},profilePolicy:'permissive'});
 assert.equal(hydra.damage.rules.environment.sourceCloud.radiusYards,19);assert.equal(hydra.damage.rules.environment.preparation,null);
 const ammo=catalogs.getAmmoItem('ht','ht_specific_hafla_dm34_35mm_wp');assert.equal(sourceEnvironmentDefinition(catalogs,'WjD-b9M0j2HJAcxyy',ammo,'ht_white_phosphorus'),null);
});
const substitutes=[['WXXqZ-u9AGxWAhfph','ht_22_short_5_6x11mmr'],['W1FMPB_-58qp_bH-M','ht_38_special_9x29mmr'],
 ['WIr6tilwCeeJXBvcA','ht_44_special_10_9x29mmr'],['WQTnqCZPMYRO8JrrL','ht_20_gauge_2_5_15_56x63mmr'],['WvUFCokYczEuOg49b','ht_12_gauge_2_5_18_5x63mmr']];
for(const[mid,aid]of substitutes)test('HT178 physical permission does not invent alternate ballistics: '+aid,async()=>{
 const c=context(mid),type={...c.base,ammoId:aid,name:catalogs.getAmmoItem('ht',aid).name};type.key=ammoTypeKey(type);
 assert.equal(compatibility.checkCompatibility(mid,aid,{book:'ht',kind:'ammo-item'}).status,'compatible');
 const p=resolver.resolve({actorId:'closure',rawAttack:c.raw,binding:c.binding,ammunition:{type},profilePolicy:'permissive'});
 assert.equal(p.damage.nativeSafe,false);assert.equal(p.damage.reason,'AlternateLoadBallisticsRequired');
 const w={id:'w',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}},opts={allowedTypes:[type],makeId:()=> 'm'};
 applyInventoryOperation(w,'add-stock',{ammoKey:type.key,amount:3},opts);applyInventoryOperation(w,'add-magazines',{capacity:3,amount:1},opts);applyInventoryOperation(w,'load',{ammoKey:type.key,magazineId:'m',amount:2},opts);applyInventoryOperation(w,'install',{magazineId:'m'},opts);
 let state={weapons:[w]};const actor={id:'closure',isOwner:true,system:{ranged:{mode:c.raw}},binding:c.binding,
   getFlag:(s,k)=>s==='world'&&k==='gurpsAmmoManager'?state:undefined,
   setFlag:async(s,k,v)=>{assert.equal(s,'world');assert.equal(k,'gurpsAmmoManager');state=v;}};
 assert(availableAmmoTypes(actor,w,api).find(t=>t.ammoId===aid&&!t.recipe)?.unavailable);
 const before=JSON.stringify(state);await assert.rejects(new AmmoService(actor).executeShot({weaponId:'w',attackId:'a',prepare:()=>({profile:p,amount:1}),execute:()=>{throw Error('must not roll');}}),/AlternateLoadBallisticsRequired/);
 assert.equal(JSON.stringify(state),before);assert.equal(inventoryTotal(w.ammunitionInventory),3);
});
test('explicit old-weapon refresh preserves custom stats, resources, name and historical shot',async()=>{
 const f=await standaloneFixture('WBpX1soaGNjp-7TDQ');const record=f.flags['olegurps-qol'].standaloneWeapons.weapons[0];
 record.modes[0].snapshot.stats.accuracy=null;delete record.modes[0].snapshot.sourceStatisticsCorrection;
 record.modes[0].snapshot.stats.bulk='-3';record.modes[0].overrides.rcl='4';record.name='Personal FN';
 const carrier=standaloneAmmoCarrier(record);f.flags.world={gurpsAmmoManager:{weapons:[carrier],shotReceipts:{old:{formula:'1d pi-'}}}};
 const ammoBefore=JSON.stringify(f.flags.world),systemBefore=JSON.stringify(f.actor.system);
 const d=new StandaloneWeaponDraft({catalogs,type:'ranged',existing:f.service.get(record.id)});assert.match(standaloneConfigurationHTML(d),/Обновить данные из каталога/);
 assert(d.refreshCatalogData());const updated=await f.service.save(d);
 assert.equal(updated.name,'Personal FN');assert.equal(readStandaloneAttack(f.actor,updated.id).acc,0);
 assert.equal(readStandaloneAttack(f.actor,updated.id).bulk,-3);assert.equal(readStandaloneAttack(f.actor,updated.id).rcl,'4');
 assert.equal(JSON.stringify(f.flags.world),ammoBefore);assert.equal(JSON.stringify(f.actor.system),systemBefore);
 const unknown=structuredClone(updated);unknown.source.sourceHash='unverified';
 const blocked=new StandaloneWeaponDraft({catalogs,type:'ranged',existing:unknown});assert.equal(blocked.refreshCatalogData(),false);
 assert.equal(blocked.modelChanged,false);
});
test('new error messages remain Russian for Foundry en and ru',()=>{
 for(const lang of ['ru','en']){game.i18n.lang=lang;for(const key of ['GyrojetDistanceRequired','AlternateLoadBallisticsRequired'])assert.match(moduleText('OleGURPS.AmmoEffects.'+key),/[\u0400-\u04ff]/);}
});
test('hex target measurement uses document centers, retaining gridless and unit conversion paths',()=>{
 const source={document:{x:0,y:0,getCenterPoint:()=>({x:50,y:50})}},target={document:{x:100,y:0,getCenterPoint:()=>({x:150,y:50})}};
 const runtime={canvas:{grid:{isGridless:false,measurePath(points){assert.deepEqual(points,[{x:50,y:50},{x:150,y:50}]);return {spaces:1,distance:100};}}}};
 assert.equal(measureTokenDistanceYards(source,target,runtime),1);
 runtime.canvas.grid.isGridless=true;assert.equal(measureTokenDistanceYards(source,target,runtime),100);
 assert.equal(measureTokenDistanceYards(source,source,runtime),null);
});
