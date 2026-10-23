import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture,catalogs} from './helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES} from '../scripts/ut-physical-ranged-source.js';
import {applyGyrojetDamageResult} from '../scripts/tools/gyrojet-range.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
const rows=Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='gyroc');
const normal=f=>f.candidates().find(t=>!t.unavailable&&!t.recipe&&t.ammoId==='15mm_gyroc');
for(const p of rows){
 test(p.modeId+': exact source, empty feed, physical round and no invented motor battery',async()=>{
  const f=await fixture(p.modeId,{profileContext:{physicalDistance:11}}),m=catalogs.getMode(p.modeId);assert.equal(m.raw_calc.damage,'6d pi++');assert.equal(m.stats.rate_of_fire,String(p.rof));assert.equal(f.weapon().totalAmmo,0);assert.equal(f.power(),null);assert.ok(normal(f));await assert.rejects(()=>f.shoot());
  const type=normal(f);assert.equal(type.physical.weightPerShotLb,0.1);assert.equal(type.physical.costPerShot,5);
  await f.load(type,1);const shot=await f.shoot();assert.equal(shot.receipt.spent,1);assert.equal(shot.profile.damage.formula,'6d pi++');assert.ok(ammunitionChatData(shot.profile).lines.length<=3);assert.equal(shot.receipt.power,undefined);
  if(p.modeId==='WqtpFn_3ogNM9oiHv')assert.deepEqual(shot.profile.damage.rules.manualMotor,{cell:'B',minutes:15,source:'UT144'});
 });
 for(const [distance,divisor]of [[1,3],[2,3],[3,2],[10,2],[11,1]])test(p.modeId+': native result division at '+distance+' yd and snapshot',async()=>{
  const context={physicalDistance:distance},f=await fixture(p.modeId,{profileContext:context});await f.load(normal(f),1);const shot=await f.shoot(),rule=shot.snapshot.profile.damage.rules.gyrojetRange;
  assert.equal(rule.damageDivisor,divisor);assert.equal(rule.distanceYards,distance);assert.equal(applyGyrojetDamageResult({damage:23},rule).damage,Math.floor(23/divisor));assert.equal(applyGyrojetDamageResult({damage:23},rule,'linked').damage,23);
  context.physicalDistance=100;assert.equal(shot.snapshot.profile.damage.rules.gyrojetRange.damageDivisor,divisor);assert.ok(rule.resultFormula.includes(divisor>1?'floor':'6d'));
 });
 test(p.modeId+': explicit micromissile sensor, physical stock, no automatic hit or Acc bonus',async()=>{
  const f=await fixture(p.modeId,{profileContext:{physicalDistance:11}}),micro=f.candidates().find(t=>t.ammoId==='15mm_micromissile'&&t.recipe?.variantId==='ut_homing'&&t.recipe.parameters.availabilityTL===9&&!t.unavailable);
  assert.ok(micro);assert.equal(micro.physical.weightPerShotLb,0.1);assert.equal(micro.physical.costPerShot,50);await f.load(micro,1);const shot=await f.shoot();assert.equal(shot.receipt.spent,1);assert.equal(shot.profile.damage.rules.manualHoming.aimSkill,'Artillery (Guided Missile)');assert.equal(shot.profile.effective.acc,Number(String(f.attack().data.acc).split('+')[0]));assert.equal(shot.rollData.manualProjectileHit,true);
  const frozen=JSON.stringify(shot.snapshot);await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await f.service.loadState();assert.equal(f.weapon().totalAmmo,0);assert.equal(JSON.stringify(shot.snapshot),frozen);
 });
}
test('Gyroc Pistol: four different physical chambers; selecting and spending preserves the other three',async()=>{
 const f=await fixture('W7iIk_4lnXIP5JOOu',{profileContext:{physicalDistance:11}}),choices=f.candidates(),types=[normal(f),...['ut_aphc','ut_apep'].map(v=>choices.find(t=>!t.unavailable&&t.recipe?.variantId===v)),choices.find(t=>!t.unavailable&&t.ammoId==='15mm_micromissile'&&t.recipe?.variantId==='ut_homing')],ids=f.weapon().ammunitionInventory.magazines.map(m=>m.id);
 assert.equal(ids.length,4);for(let n=0;n<4;n++){await f.tx('add-stock',{ammoKey:types[n].key,amount:1});await f.tx('load',{magazineId:ids[n],ammoKey:types[n].key,amount:1});}
 await f.tx('install',{magazineId:ids[2]});const before=f.weapon().ammunitionInventory.magazines;const shot=await f.shoot();assert.equal(shot.receipt.feedPlan[0].index,2);assert.equal(shot.profile.ammunition.recipe.variantId,'ut_apep');
 for(let n=0;n<4;n++)assert.equal(f.weapon().ammunitionInventory.magazines[n].rounds,n===2?0:before[n].rounds);
 await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:1}));await assert.rejects(()=>f.tx('delete-magazine',{magazineId:ids[0]}));
 const saved=f.state();await f.service.loadState();assert.deepEqual(f.state(),saved);
});
test('Underbarrel Gyroc: requires host Bulk -3 through -6, ST and sights; host is not modified',async()=>{
 const f=await fixture('WX57fdTm6ELTN3VdA',{host:false,profileContext:{physicalDistance:11}});await f.load(normal(f),1);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
 const valid=await fixture('WX57fdTm6ELTN3VdA',{profileContext:{physicalDistance:11}});assert.equal(valid.attack().data.bulk,'-5');assert.equal(valid.attack().data.st,'10');assert.equal(valid.attack().data.acc,'7+2');
});
test('Gyroc: atomic duplicate/concurrent attack, OWNER and independent special warhead damage',async()=>{
 const f=await fixture('WnaTVcm1lDzdUBdwA',{profileContext:{physicalDistance:1}});await f.load(normal(f),2);const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(f.weapon().totalAmmo,1);f.actor.isOwner=false;await assert.rejects(()=>f.shoot());f.actor.isOwner=true;
 const he=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_he'&&!t.recipe.parameters.fuze);await f.tx('unload',{magazineId:f.weapon().ammunitionInventory.installedId,amount:1});await f.load(he,1);const shot=await f.shoot();assert.equal(shot.profile.damage.rules.gyrojetRange.damageDivisor,3);assert.ok(shot.profile.damage.components.some(c=>c.role==='follow-up'));
 for(const component of shot.profile.damage.components.filter(c=>c.role!=='kinetic'))assert.equal(applyGyrojetDamageResult({damage:23},shot.profile.damage.rules.gyrojetRange,component.role).damage,23);
});
