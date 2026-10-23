import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture,catalogs} from './helpers/gauss-context.mjs';
import {UT_FLUID_PROFILES} from '../scripts/ut-fluid-source.js';
import {FLUID_FILLERS,fluidCompatibility,fluidTypeAllowed} from '../scripts/tools/ut-fluid.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {resistanceEffect,visionResistanceModifier} from '../scripts/tools/resistance-roll.js';
async function fixture(id,context={}){
 const f=await gaussFixture(id,{profileContext:context});
 if(UT_FLUID_PROFILES[id].underbarrel){const d=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.record});for(const [k,v]of Object.entries({hostBulk:'-5',st:'10',acc:'7+2'}))d.setOverride(id,k,v);await f.definitions.save(d);await f.service.loadState();}
 return f;
}
for(const p of Object.values(UT_FLUID_PROFILES)){
 for(const filler of Object.values(FLUID_FILLERS))test(p.name+' × '+filler.name+': individual stock/load/shot/history contract',async()=>{
  const f=await fixture(p.modeId),candidate=f.candidates().find(t=>t.ammoId===filler.id);
  if(!fluidCompatibility(p.modeId,filler.id).allowed){assert.equal(candidate,undefined);return;}
  assert.ok(candidate);await f.load(candidate,1);const shot=await f.shoot();assert.equal(shot.spent,1);assert.equal(f.weapon().totalAmmo,0);assert.equal(shot.snapshot.ammunition.ammoId,filler.id);assert.equal(shot.snapshot.profile.damage.rules.fluid.route,filler.route);assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
 });
 test(p.name+': source, load, consume, persisted stock, immutable history and no free reload',async()=>{
  const context={fluidDoses:p.maxDoses,fluidBounces:p.vortex?2:0};const f=await fixture(p.modeId,context);
  assert.equal(f.weapon().capacity,p.capacity);assert.equal(f.attack().readinessReason,null);assert.equal(f.weapon().totalAmmo,0);await assert.rejects(()=>f.shoot());
  await f.load(f.candidates().find(t=>t.ammoId==='riot'),p.capacity);const shot=await f.shoot();assert.equal(shot.spent,p.maxDoses);assert.equal(f.weapon().totalAmmo,p.capacity-p.maxDoses);
  assert.equal(shot.profile.effective.range,p.range.split('/').map(n=>Number(n)*(p.vortex?0.8:1)).join('/'));
  assert.equal(shot.profile.damage.components.length,p.vortex?1:0);if(p.vortex)assert.equal(shot.profile.damage.components[0].formula,'1d-3 cr dkb');
  assert.ok(ammunitionChatData(shot.profile).lines.length<=3);assert.ok(!shot.message.content.includes('<details open'));if(!p.vortex)assert.ok(!shot.message.content.includes('D:'));
  const history=JSON.stringify(shot.snapshot),saved=f.state();await f.service.loadState();assert.deepEqual(f.state(),saved);assert.equal(JSON.stringify(shot.snapshot),history);
  await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:p.capacity}));await assert.rejects(()=>f.tx('load',{magazineId:f.weapon().ammunitionInventory.installedId,ammoKey:f.candidates()[0].key,amount:1}));
  const r=resistanceEffect(shot.profile.damage.rules.resistanceEffect);assert.ok(r);assert.equal(r.modifier,-4);assert.equal(visionResistanceModifier(r,{exposed:true,protected:false,immune:false}).applies,true);assert.equal(visionResistanceModifier(r,{exposed:true,protected:true,immune:false}).applies,true); // User decision: exposure/protection does not gate the resistance roll.
  f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
 test(p.name+': filler matrix, direct service rejects forged types',async()=>{
  const f=await fixture(p.modeId);
  for(const filler of Object.values(FLUID_FILLERS)){
   const type={source:'catalog',book:'ut',kind:'fluid-filler',ammoId:filler.id,key:'ut:fluid-filler:'+filler.id};
   const allowed=fluidCompatibility(p.modeId,filler.id).allowed;
   assert.equal(fluidTypeAllowed(p.modeId,type),allowed);assert.equal(f.candidates().some(t=>t.ammoId===filler.id),allowed);
   if(!allowed)await assert.rejects(()=>f.tx('add-stock',{ammoKey:type.key,type,amount:1}));
  }
  await assert.rejects(()=>f.tx('add-stock',{type:{key:'forged',source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_gyroc'},ammoKey:'forged',amount:1}));
 });
}
test('Pocket Aerosol cannot be refilled after firing, even with fresh doses',async()=>{
 const f=await fixture('W8SYi-R8B4aFolQUw');const t=f.candidates()[0];await f.load(t,1);await f.shoot();await f.tx('add-stock',{ammoKey:t.key,amount:1});await assert.rejects(()=>f.tx('load',{ammoKey:t.key,amount:1,magazineId:f.weapon().ammunitionInventory.installedId}));assert.equal(f.weapon().fluidSpent,true);
});
test('Spray Can dose limits, cancel and duplicate attack consume exactly once',async()=>{
 const c={fluidDoses:4},f=await fixture('WpAt6DyOnZkKbNfJr',c);await f.load(f.candidates()[0],10);await assert.rejects(()=>f.shoot());c.fluidDoses=3;
 await f.shoot(1,{cancel:true});assert.equal(f.weapon().totalAmmo,10);const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(f.weapon().totalAmmo,7);
 const original=f.profile();await assert.rejects(()=>f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:{...original,damage:{...original.damage,rules:{...original.damage.rules,fluid:{...original.damage.rules.fluid,doses:1}}}}}),execute:async()=>({rolled:true})}));assert.equal(f.weapon().totalAmmo,7);
});
test('Underbarrel requires actual host; vortex liquids restricted; campaign TL applied',async()=>{
 const f=await gaussFixture('WVP2b1TCXvqHt6azn');await f.load(f.candidates()[0],1);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
 const g=await fixture('WbujzAgEOegkakUSr');assert.equal(g.candidates().some(t=>t.ammoId==='firefoam'),false);assert.equal(fluidCompatibility('WUGCA3bH9obniRWDA','firefoam').allowed,true);
 await g.actor.setFlag('olegurps-qol','campaignTL',9);assert.equal(g.candidates().some(t=>t.ammoId==='paralysis'),false);assert.equal(g.candidates().some(t=>t.ammoId==='riot'),true);
});
