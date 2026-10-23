import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture,catalogs,compatibility} from './helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES} from '../scripts/ut-physical-ranged-source.js';
import {readWeaponBattery} from '../scripts/tools/weapon-power.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=[
 ['W3frf9fpZ88nsGZgZ','2d(10) imp inc','1','50/200',4,100,'3','-1','B',2,'Pistol'],
 ['WjwsSLtRhcz7RDQ3v','3d(10) imp inc','5','500/1,500',20,500,'7\u2020','-2','C',1,'Submachine Gun'],
 ['WeWDVUcj3u60GEyCq','4d(10) imp inc','10','2,000/6,000',20,1000,'8\u2020','-3','C',1,'Rifle'],
 ['W8jY2Gu52B-HxBKPY','8d(10) imp inc','11','4,000/12,000',3,1000,'9\u2020','-4','C',2,'Rifle'],
 ['WzBIC0pLImzKfM4Q2','8d(10) imp inc','10','4,000/12,000',100,4000,'11\u2020','-5','D',1,'Light Machine Gun'],
 ['WsRUP0bIp6--JRDZE','6dx15(10) imp inc','15','10,000/30,000',20,2000,'34M','-10',null,0,'Cannon']
];
for(const [id,damage,acc,range,rof,shots,st,bulk,cell,cells,skill] of rows){
 test(id+': individual UT143 profile and exact physical family',async()=>{
  const f=await fixture(id),m=catalogs.getMode(id),p=UT_PHYSICAL_RANGED_PROFILES[id];
  assert.equal(catalogs.getEquipmentForMode(id).equipment_id,p.equipmentId);assert.equal(catalogs.getEquipmentForMode(id).tech_level,'11^');
  assert.equal(m.raw_calc.damage,damage);assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);assert.equal(m.stats.rate_of_fire,String(rof));
  assert.equal(m.stats.strength,st);assert.equal(m.stats.bulk,bulk);assert.equal(m.stats.recoil,'1');assert.equal(m.governing_skill.skill.specialization,skill);
  assert.ok(m.defaults.some(d=>d.type==='dx'&&d.modifier===-4));assert.equal(m.defaults.at(-1).modifier,cell?-2:-4);
  assert.equal(f.weapon().capacity,shots);assert.equal(f.weapon().totalAmmo,0);assert.equal(f.power()?.cellSize??null,cell);assert.equal(f.power()?.cells??0,cells);
  const choices=f.candidates().filter(c=>!c.unavailable);assert.equal(choices.length,1);assert.equal(choices[0].ammoId,p.familyId);
  const other=p.familyId==='grav_needler_round'?'grav_railgun_round':'grav_needler_round';assert.equal(compatibility.checkCompatibility(id,other,{book:'ut',kind:'ammo-family'}).status,'incompatible');
  await assert.rejects(()=>f.shoot());
 });
 test(id+': empty/missing power/partial/full burst and atomic failure',async()=>{
  const f=await fixture(id);await f.load(undefined,rof);if(cell){await assert.rejects(()=>f.shoot());await f.battery();}
  const before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
  await assert.rejects(()=>f.shoot(rof+1));assert.deepEqual(f.state(),before);
  const shot=await f.shoot(rof);assert.equal(shot.receipt.spent,rof);assert.equal(f.weapon().totalAmmo,0);assert.equal(shot.profile.damage.formula,damage);
  assert.equal(shot.profile.damage.components.length,1);assert.equal(shot.receipt.power?.spent??0,cell?rof:0);
  if(cell)assert.equal(readWeaponBattery(f.weapon()).charge,shots-rof);await assert.rejects(()=>f.shoot());
  assert.equal(shot.snapshot.profile.damage.rules.physicalRanged.modeId,id);assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
 });
 test(id+': concurrent duplicate, OWNER, stale state, history and zero battery',async()=>{
  const f=await fixture(id);await f.load(undefined,2);if(cell)await f.battery(true);
  const old=f.state(),attackId=crypto.randomUUID();const results=await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(f.weapon().totalAmmo,1);
  const history=JSON.stringify(results[0].snapshot);await f.service.saveState(old);await f.service.loadState();assert.equal(f.weapon().totalAmmo,1);assert.equal(JSON.stringify(results[0].snapshot),history);
  if(cell){const state=f.state();state.weapons[0].gravBattery.charge=0;await f.actor.setFlag('world','gurpsAmmoManager',state);await assert.rejects(()=>f.shoot());assert.equal(f.weapon().totalAmmo,1);await f.battery();}
  await f.shoot();assert.equal(f.weapon().totalAmmo,0);f.actor.isOwner=false;await assert.rejects(()=>f.shoot());await assert.rejects(()=>f.tx('add-stock',{ammoKey:f.candidates()[0].key,amount:1}));
 });
 test(id+': foreign rounds, recipes and unsupported execution cannot bypass service',async()=>{
  const f=await fixture(id),type=f.candidates().find(c=>!c.unavailable);
  for(const bad of [{...type,ammoId:'4mm_em'},{...type,source:'user'},{...type,recipe:{variantId:'ut_homing'}}])await assert.rejects(()=>f.tx('add-stock',{type:bad,ammoKey:bad.key,amount:1}));
  await f.load(type,1);if(cell)await f.battery();
  for(const variant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=variant;await f.actor.setFlag('world','gurpsAmmoManager',state);await assert.rejects(()=>f.shoot());}
 });
}
