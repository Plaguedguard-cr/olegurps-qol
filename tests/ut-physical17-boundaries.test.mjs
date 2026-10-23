import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture} from './helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES} from '../scripts/ut-physical-ranged-source.js';
test('Instruction-only missile payload retains an independent native backblast component without primary HP Damage',async()=>{
 const f=await fixture('WInB0nYjRLMJm5Ha-'),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_biochemical_aerosol');await f.load(type,1);const shot=await f.shoot();assert.equal(shot.profile.damage.formula,null);assert.equal(shot.profile.damage.rules.instructionOnly,true);assert.deepEqual(shot.profile.damage.components.map(c=>[c.role,c.formula]),[['backblast','2d burn']]);assert.equal(shot.receipt.spent,1);
});
test('Reviewed Gyroc/Missile/Splat launchers reuse concrete SEFOP guidance; independent warhead is not acceleration-divided',async()=>{
 for(const p of Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>['gyroc','missile'].includes(p.group)||p.modeId==='WIijXG9uGZ52T0eW2')){
  const f=await fixture(p.modeId,{profileContext:{physicalDistance:1}}),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_sefop');assert.ok(type,p.modeId);
  if(p.modeId==='WIijXG9uGZ52T0eW2')await f.tx('splat-salvo',{amount:1,expectedSalvo:30,readyConfirmed:true});await f.load(type,1);const shot=await f.shoot();assert.ok(shot.profile.damage.rules.manualSEFOP);assert.equal(shot.profile.damage.rules.gyrojetRange,undefined);assert.equal(shot.receipt.spent,1);
 }
});
test('Missile prices: separate body/warhead and unknown biochemical filler remain distinct',async()=>{
 const f=await fixture('WInB0nYjRLMJm5Ha-');
 for(const [variant,cost]of [['ut_aphc',120],['ut_apds',150],['ut_tangler',120],['ut_biochemical_aerosol',null]]){
  const type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId===variant);assert.ok(type,variant);await f.load(type,1);const shot=await f.shoot();assert.equal(shot.profile.damage.rules.costPerShot,cost);
 }
});
test('Gyroc Shotshell keeps the physical RoF limit through the service',async()=>{
 const f=await fixture('WnaTVcm1lDzdUBdwA',{profileContext:{physicalDistance:11}}),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_shotshell');assert.ok(type);await f.load(type,6);await assert.rejects(()=>f.shoot(4));assert.equal(f.weapon().totalAmmo,6);const shot=await f.shoot(3);assert.equal(shot.receipt.spent,3);assert.equal(shot.profile.damage.rules.projectiles.count,9);
});
test('Mortar64 Shotshell divides source 6dx2 by four; 30 shells remain 30 physical charges',async()=>{
 const f=await fixture('WYpXdcsWIyhNVC6x3'),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_shotshell');assert.ok(type);await f.load(type,5);const shot=await f.shoot(5);assert.equal(shot.profile.damage.formula,'3d pi');assert.equal(shot.receipt.spent,5);assert.equal(shot.profile.damage.rules.projectiles.count,9);assert.equal(shot.profile.effective.range,'180/1500');
});
test('Reactionless is a kinetic recipe without invented follow-up components, and MLAWS has six separate tubes',async()=>{
 const f=await fixture('WHv4EWlz3Tg6-cvQn'),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_reactionless');assert.equal(f.weapon().ammunitionInventory.magazines.length,6);assert.ok(f.weapon().ammunitionInventory.magazines.every(m=>m.capacity===1));await f.load(type,1);const shot=await f.shoot();assert.equal(shot.profile.damage.components.length,1);assert.deepEqual(shot.profile.damage.rules.componentOrder,['kinetic']);assert.equal(shot.profile.damage.rules.backblast,undefined);
});
