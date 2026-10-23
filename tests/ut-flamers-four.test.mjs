import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {PPB_PROFILES} from '../scripts/ut-plasma-particle-source.js';
import {readWeaponBattery} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=[
 ['WaryGiX2EbvCktDl7','Assault Flamer','5d burn','C',2,28,'6','50/150','5†','-3','Projector'],
 ['WOEDlzH2pTKr_0bqR','Hand Flamer','4d burn','C',2,56,'3','30/90','6','-2','Projector'],
 ['WLnTn3lWWz9setbCw','Heavy Flamer','8d burn','D',1,35,'6','130/390','10†','-5','Projector'],
 ['Wg-QGifndN0vSPBj3','Semi-Portable Flamer','6dx3 burn','E',1,100,'12','150/450','18M','-8','Beams']
];
for(const[id,name,damage,cell,cells,n,acc,range,st,bulk,specialty]of rows){
 test(name+': individually verified UT127 characteristics and ordinary burn',async()=>{
  const f=await gaussFixture(id),m=catalogs.getMode(id);assert.equal(catalogs.getEquipmentForMode(id).name,name);
  assert.equal(m.raw_calc.damage,damage);assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);assert.equal(m.stats.strength,st);
  assert.equal(m.stats.bulk,bulk);assert.equal(m.stats.rate_of_fire,'1');assert.equal(m.stats.recoil,'1');assert.equal(m.stats.shots,n+(cell==='C'?'(3)':'(5)'));
  assert.equal(m.governing_skill.skill.specialization,specialty);assert.equal(m.governing_skill.skill.name,specialty==='Beams'?'Gunner':'Beam Weapons');
  assert.deepEqual(readWeaponBattery(f.weapon()),{type:cell,cells,nonRechargeable:false,capacity:n,charge:n});
  assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.attack().readinessReason,null);
  assert.equal(f.profile().damage.formula,damage);assert.doesNotMatch(f.profile().damage.formula,/tbb|ex|\(/);
 });
 test(name+': native attack, one cell charge, concise instructions and saved Damage',async()=>{
  const f=await gaussFixture(id),r=await f.shoot();assert.equal(r.rolled,true);assert.equal(r.receipt.power.spent,1);
  assert.equal(r.snapshot.profile.damage.formula,damage);assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
  assert.match(r.rollData.followon,/D:/);assert.equal(r.profile.damage.rules.resistanceEffect,undefined);
  const lines=ammunitionChatData(r.profile).lines;assert.ok(lines.length<=3);assert.ok(lines.join(' ').length<500);
  assert.doesNotMatch(lines.join(' '),/патрон|батаре|атмосфер|перегрев/i);
 });
 test(name+': last charge, empty and missing source, cancel and duplicate shot',async()=>{
  const f=await gaussFixture(id),before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
  await f.service.spendWeaponCharge(f.weapon().id,n-1);const attackId=crypto.randomUUID();
  await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
  const state=f.state();delete state.weapons[0].plasmaParticleBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);
  await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());
 });
 test(name+': full-set NR, ownership, save and reload never refill',async()=>{
  const f=await gaussFixture(id);await f.battery(true);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,n*2-1);
  await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();
  assert.equal(readWeaponBattery(f.weapon()).charge,n*2-1);f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
 test(name+': no physical magazines or ETC/LP bypass',async()=>{
  const f=await gaussFixture(id);await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:10}));
  for(const executionVariant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',state);
   assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
 });
}
