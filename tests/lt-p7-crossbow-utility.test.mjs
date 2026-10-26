import test from 'node:test';
import assert from 'node:assert/strict';
import {LT_CROSSBOW_UTILITY_PROFILES} from '../scripts/lt-crossbow-utility-source.js';
import {resolveLTPersonalRange} from '../scripts/tools/lt-personal.js';
import {ltPersonalProfile} from '../scripts/lt-personal-source.js';
import {p7Fixture,catalogs,compatibility} from './helpers/lt-p7-context.mjs';
import {campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
const actor={system:{attributes:{ST:{value:14}},skills:{}},getFlag:()=>undefined};
for(const p of Object.values(LT_CROSSBOW_UTILITY_PROFILES))test('LT125 '+p.name+': exact horizontal/vertical ranges and no ordinary HP damage',()=>{
 assert.ok(ltPersonalProfile(p.modeId)?.noDamage);
 const config={utilityRatedST:24,utilityOrientation:'horizontal'};
 const horizontal=resolveLTPersonalRange({actor,profile:p,configuration:config});assert.equal(horizontal.ready,true);
 const vertical=resolveLTPersonalRange({actor,profile:p,configuration:{...config,utilityOrientation:'vertical'}});assert.equal(vertical.maximum,horizontal.maximum/2);
 assert.equal(horizontal.halfDamage,null);
 assert.equal(resolveLTPersonalRange({actor,profile:p}).ready,false);
});
for(const p of Object.values(LT_CROSSBOW_UTILITY_PROFILES))for(const ammoId of p.ammoIds)test('LT125 physical resource path '+p.modeId+'/'+ammoId,async()=>{
 const f=await p7Fixture(p.modeId,{personal:{utilityRatedST:24,utilityOrientation:'horizontal'}}),t=f.type(ammoId,{utilityPrepared:true,utilityModeId:p.modeId,utilityWeaponId:f.weapon.id,cordLengthYards:100,note:'owner content'});
 assert.equal(compatibility.checkCompatibility(p.modeId,ammoId,{book:'lt',kind:'ammo-item'}).status,'compatible');
 await f.tx('save-recipe',{type:t},t);assert.equal(f.current().totalAmmo,0);
 await f.tx('add-stock',{ammoKey:t.key,amount:2},t);await f.tx('load',{magazineId:f.current().ammunitionInventory.installedId,ammoKey:t.key,amount:1},t);
 assert.equal(f.current().totalAmmo,2);const profile=f.profile();assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.damage.formula,null);assert.equal(profile.damage.components.length,0);assert.equal(profile.attackResult.effectsManual,true);
 const before=JSON.stringify(f.actor.flags);await f.shoot('cancel',async()=>({rolled:false}));assert.equal(JSON.stringify(f.actor.flags),before);
 const result=await f.shoot('one');assert.equal(result.spent,1);assert.equal(f.current().totalAmmo,1);assert.ok(result.snapshot.applicationResult);
 let called=0;await f.shoot('one',async()=>{called++;});assert.equal(called,0);assert.equal(f.current().totalAmmo,1);
 const saved=JSON.stringify(result.snapshot);f.actor.system.attributes.ST.value=1;await f.tx('lt-personal-configure',{configuration:{utilityRatedST:30,utilityOrientation:'vertical'}});assert.equal(JSON.stringify(result.snapshot),saved);
 await f.tx('lt-personal-return',{attackId:'one',ammoKey:t.key,confirmed:true});assert.equal(f.current().totalAmmo,2);await f.tx('lt-personal-return',{attackId:'one',ammoKey:t.key,confirmed:true});assert.equal(f.current().totalAmmo,2);
});
test('LT125 foreign fitted party, unprepared raw object, missing attachment or zero cord reject load before roll and preserve stock',async()=>{
 const p=Object.values(LT_CROSSBOW_UTILITY_PROFILES)[0],f=await p7Fixture(p.modeId,{personal:{utilityRatedST:14}});
 for(const change of [{utilityWeaponId:'foreign'},{utilityModeId:'foreign'},{utilityPrepared:false},{cordLengthYards:0}]){
  const t=f.type(p.ammoIds[0],{utilityPrepared:true,utilityModeId:p.modeId,utilityWeaponId:f.weapon.id,cordLengthYards:100,...change}),before=JSON.stringify(f.actor.flags);await assert.rejects(f.tx('save-recipe',{type:t},t));assert.equal(JSON.stringify(f.actor.flags),before);
 }
 const raw={source:'catalog',book:'lt',kind:'ammo-item',ammoId:p.ammoIds[0],name:'raw'};raw.key='raw';await assert.rejects(f.tx('add-stock',{ammoKey:'raw',amount:1},raw));
 assert.ok(catalogs.getMode(p.parentModeId).lt_bow_contract);assert.equal(catalogs.getMode(p.modeId).lt_bow_contract,undefined);
});
test('LT125 crossbow utility construction is TL2, distinct from the TL1 hand-thrown hook',()=>{
 const p=Object.values(LT_CROSSBOW_UTILITY_PROFILES).find(p=>p.kind==='crossbow-hook'),base={source:'catalog',book:'lt',kind:'ammo-item',ammoId:p.ammoIds[0]};
 assert.equal(campaignAmmunitionAdmission(base,catalogs,1).allowed,true);
 const prepared={...base,recipe:{version:1,variantId:'lt_personal_load',parameters:{utilityModeId:p.modeId}}};
 assert.equal(campaignAmmunitionAdmission(prepared,catalogs,1).allowed,false);assert.equal(campaignAmmunitionAdmission(prepared,catalogs,2).allowed,true);
});
test('LT125 exact fractional delivery distance reaches shared Fire Control without rounding to an SSR band',async()=>{
 const {FirePreparationApp}=await import('../scripts/tools/fire-preparation-app.js');
 const app={mode:'standalone',attack:{ammunitionLTPersonal:{kind:'crossbow-hook'}},fireState:{projectileDistance:'10.4',hitLocation:{zoneId:'torso'}},_getShotsValue:()=>1,rangeBands:[{index:0,max:15,penalty:-5}]};
 const options=FirePreparationApp.prototype.getShotOptions.call(app);
 assert.equal(options.targetDistanceOverride,10.4);
 assert.equal(FirePreparationApp.prototype.getShotOptions.call({...app,attack:{}}).targetDistanceOverride,null);
});
test('LT125 confirmed old utility definition reads current source without writing Actor or discarding explicit owner Range',async()=>{
 const p=Object.values(LT_CROSSBOW_UTILITY_PROFILES)[0],f=await p7Fixture(p.modeId,{personal:{utilityRatedST:24}}),saved=f.actor.flags['olegurps-qol'].standaloneWeapons.weapons[0];saved.modes[0].snapshot.stats.range='old source';saved.modes[0].overrides.range='10.4';
 const before=JSON.stringify(f.actor.flags),view=f.definitions.get(f.record.id);assert.equal(view.modes[0].snapshot.stats.range,'spec.');assert.equal(view.modes[0].overrides.range,'10.4');assert.equal(JSON.stringify(f.actor.flags),before);
 const type=f.type(p.ammoIds[0],{utilityPrepared:true,utilityModeId:p.modeId,utilityWeaponId:f.weapon.id,cordLengthYards:100});
 assert.equal(f.profile(undefined,{kind:'preview',type}).effective.range,'10.4');
 saved.modes[0].overrides.range='unresolved owner value';const profile=f.profile(undefined,{kind:'preview',type});assert.equal(profile.damage.nativeSafe,false);assert.equal(saved.modes[0].overrides.range,'unresolved owner value');
});
test('LT125 selector distinguishes raw hook from fitted prepared stock; obsolete foreign fit stays visible and unavailable',async()=>{
 const {ammunitionCandidates}=await import('../scripts/tools/ammo-management-app.js'),p=Object.values(LT_CROSSBOW_UTILITY_PROFILES)[1],f=await p7Fixture(p.modeId,{personal:{utilityRatedST:24}});
 const raw=ammunitionCandidates(f.actor,f.current()).find(t=>t.ammoId===p.ammoIds[0]&&!t.recipe);assert.equal(raw.requiresPreparation,true);assert.equal(raw.unavailable,true);
 const type=f.type(p.ammoIds[0],{utilityPrepared:true,utilityModeId:p.modeId,utilityWeaponId:f.weapon.id,cordLengthYards:100});await f.tx('save-recipe',{type},type);assert.equal(ammunitionCandidates(f.actor,f.current()).find(t=>t.key===type.key).unavailable,false);
 f.actor.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.stocks[0].type.recipe.parameters.utilityWeaponId='foreign';const before=JSON.stringify(f.actor.flags);assert.equal(ammunitionCandidates(f.actor,f.current()).find(t=>t.key===type.key).unavailable,true);assert.equal(JSON.stringify(f.actor.flags),before);
});
