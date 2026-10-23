import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture,catalogs} from './helpers/gauss-context.mjs';
import {missileSourceTL} from '../scripts/ut-physical-ranged-source.js';
import {campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=[['WInB0nYjRLMJm5Ha-','6dx3 pi++',1,500,4000,64],['WuZRkhqwMzX3gyVWL','6dx5 pi++',1,750,6000,64],['WHv4EWlz3Tg6-cvQn','6dx3 pi++',6,500,4000,64],['W7v0_whpuR9MtD4tH','6dx5 pi++',6,750,6000,64],['WpvG7-bGWCtwNOPFf','6dx30 pi++',1,2000,10000,100],['WNK4gk21iQ4le2Lxr','6dx50 pi++',1,3000,15000,100]];
const normal=f=>f.candidates().find(t=>!t.unavailable&&!t.recipe);
for(const[id,damage,capacity,half,max,mm]of rows){
 test(id+': separate TL identity, exact family, empty launcher and one physical rocket',async()=>{
  const f=await fixture(id),m=catalogs.getMode(id),type=normal(f);assert.equal(m.raw_calc.damage,damage);assert.equal(m.stats.rate_of_fire,'1');assert.equal(f.weapon().capacity,1);assert.equal(f.weapon().ammunitionInventory.magazines.length,capacity);assert.equal(f.weapon().totalAmmo,0);assert.equal(f.power(),null);
  assert.equal(type.projectileTL,missileSourceTL(id));assert.ok(type.key.endsWith(':projectile-tl:'+missileSourceTL(id)));assert.equal(type.physical.costPerShot,mm===64?110:440);assert.equal(type.physical.weightPerShotLb,mm===64?2:25);
  await assert.rejects(()=>f.shoot());await f.load(type,1);const shot=await f.shoot();assert.equal(shot.receipt.spent,1);assert.equal(f.weapon().totalAmmo,0);assert.equal(shot.profile.damage.formula,damage);assert.equal(shot.snapshot.profile.ammunition.projectileTL,missileSourceTL(id));
  assert.equal(shot.profile.damage.rules.backblast.formula,mm===64?'2d burn':'4d burn');assert.equal(shot.profile.damage.rules.backblast.coneYards,mm===64?2:3);assert.equal(shot.profile.damage.components.find(c=>c.role==='backblast').relation,'auxiliary');assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
 });
 test(id+': all five source-valid sensors use manual Homing without free accuracy or hit',async()=>{
  const f=await fixture(id);
  for(const guidance of ['infrared','multispectralPassive','multispectralAntiradiation','multispectralActive','multiscanner']){
   const type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_homing'&&t.recipe.parameters.homingGuidance===guidance&&!t.recipe.parameters.reactionless);
   assert.ok(type,guidance);await f.load(type,1);const shot=await f.shoot(),h=shot.profile.damage.rules.manualHoming;assert.equal(h.guidance,guidance);assert.equal(h.aimSkill,'Artillery (Guided Missile)');assert.equal(shot.rollData.manualProjectileHit,true);assert.equal(shot.profile.effective.acc,3);assert.equal(shot.receipt.spent,1);assert.equal(shot.profile.damage.rules.ballisticRange.halfDamage,null);assert.equal(shot.profile.damage.rules.ballisticRange.speedYardsPerSecond,half);
   assert.equal(shot.profile.damage.rules.costPerShot,(mm===64?100:400)*(guidance==='infrared'?4:10)+(mm===64?10:40));
  }
 });
 test(id+': Reactionless has TL11, max x5 once, unchanged half/speed, separate body price and no backblast',async()=>{
  const f=await fixture(id),choices=f.candidates(),type=choices.find(t=>!t.unavailable&&t.recipe?.variantId==='ut_reactionless');assert.ok(type);
  assert.equal(campaignAmmunitionAdmission(type,catalogs,10,id).allowed,false);assert.equal(campaignAmmunitionAdmission(type,catalogs,11,id).allowed,true);
  await f.load(type,1);const shot=await f.shoot();assert.equal(shot.profile.effective.range,half+'/'+max*5);assert.equal(shot.profile.damage.formula,damage);assert.equal(shot.profile.damage.rules.backblast,undefined);assert.equal(shot.profile.damage.components.some(c=>c.role==='backblast'),false);assert.equal(shot.profile.damage.rules.costPerShot,(mm===64?200+10:800+40));
  const guided=choices.find(t=>!t.unavailable&&t.recipe?.variantId==='ut_homing'&&t.recipe.parameters.reactionless&&t.recipe.parameters.homingGuidance==='infrared');assert.ok(guided);await f.load(guided,1);const second=await f.shoot();assert.equal(second.profile.effective.range,half+'/'+max*5);assert.equal(second.profile.damage.rules.ballisticRange.speedYardsPerSecond,half);assert.equal(second.profile.damage.rules.costPerShot,(mm===64?100:400)*8+(mm===64?10:40));assert.equal(second.profile.damage.rules.backblast,undefined);
 });
 test(id+': ready warhead components, historical preservation, cancel, duplicate/concurrent, OWNER and TL admission',async()=>{
  const f=await fixture(id),type=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_he'&&!t.recipe.parameters.fuze);assert.ok(type);await f.load(type,2);const state=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),state);
  const attackId=crypto.randomUUID(),shots=await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(f.weapon().totalAmmo,1);assert.ok(shots[0].profile.damage.components.some(c=>c.role==='follow-up'));const frozen=JSON.stringify(shots[0].snapshot);await f.service.loadState();assert.equal(JSON.stringify(shots[0].snapshot),frozen);
  const bad={...normal(f),projectileTL:missileSourceTL(id)===9?10:9};await assert.rejects(()=>f.tx('add-stock',{type:bad,ammoKey:bad.key,amount:1}));f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
}
