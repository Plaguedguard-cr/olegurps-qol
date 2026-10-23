import test from 'node:test';import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {PPB_PROFILES,ppbControlsHTML} from '../scripts/ut-plasma-particle-source.js';
import {readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=[
 ['W-w21iY_LC7DcmrtD',12,'8d','C',2,33,'5','400/1,200','6','-3','Pistol'],
 ['WaykgDTdZ7NZfsjqj',12,'4d','B',1,13,'3','130/500','3','-1','Pistol'],
 ['WV4sqUZiMo8K7YQOy',12,'6d','C',1,40,'5','300/900','4','-2','Pistol'],
 ['WKUu44u13uBHnO79e',12,'8dx2','D',1,20,'10+4','1,200/3,600','10†','-6','Rifle'],
 ['W2D1rKuYLdhcnEQdy',12,'10d','C',2,17,'10+1','500/1,500','5†','-3','Rifle'],
 ['W_KVzEIX8c2mMp_JO',12,'6dx2','C',2,10,'10+2','700/2,100','7†','-4','Rifle'],
 ['WjT3O3uGpTMzQTtAW',11,'8dx10','F',1,20,'15','40,000/120,000','160M','-10','Beams'],
 ['WbP6X1nJMRhfgpZ3l',12,'8dx20','F',1,20,'15','120,000/360,000','160M','-10','Beams'],
 ['WL6F0evt279747bG7',12,'6dx4','E',1,60,'15','2,800/8,400','18M','-8','Beams']
];
for(const[id,tl,dice,cell,cells,n,acc,range,st,bulk,specialty]of rows){
 const p=PPB_PROFILES[id],formula=dice+'(3) cr ex rad sur';
 test(p.name+' TL'+tl+': UT124 source stats, independent model, complete battery and native components',async()=>{
  const f=await gaussFixture(id),m=catalogs.getMode(id);assert.equal(catalogs.getEquipmentForMode(id).tech_level,String(tl));
  assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);assert.equal(m.stats.strength,st);assert.equal(m.stats.bulk,bulk);
  assert.equal(m.stats.shots,n+(['D','E','F'].includes(cell)?'(5)':'(3)'));assert.equal(m.stats.recoil,'1');assert.equal(m.governing_skill.skill.specialization,specialty);
  assert.equal(f.profile().damage.formula,formula);assert.equal(f.attack().readinessReason,null);assert.equal(f.weapon().ammunitionInventory,undefined);
  assert.deepEqual(readWeaponBattery(f.weapon()),{type:cell,cells,capacity:n,charge:n,nonRechargeable:false});
  const rules=f.profile().damage.rules.plasmaParticle;assert.equal(rules.radiation,true);assert.equal(rules.surge,true);assert.equal(rules.explosive,true);
  assert.equal(rules.environment,undefined);assert.equal(ppbControlsHTML(f.weapon(),String),'');
 });
 test(p.name+' TL'+tl+': real prepared path, burst charge, historical radiation/surge/ex and concise prose',async()=>{
  const f=await gaussFixture(id),amount=Number(catalogs.getMode(id).stats.rate_of_fire),r=await f.shoot(amount);
  assert.equal(r.receipt.power.spent,amount);assert.equal(r.snapshot.profile.damage.formula,formula);assert.match(r.rollData.followon,/D:/);
  assert.equal(r.snapshot.profile.damage.components.length,1);assert.equal(r.snapshot.profile.damage.rules.plasmaParticle.radiation,true);
  const before=f.state(),saved=JSON.stringify(r.snapshot);f.profile();assert.equal(JSON.stringify(r.snapshot),saved);assert.deepEqual(f.state(),before);
  const lines=ammunitionChatData(r.profile).lines;assert.ok(lines.length<=3);assert.ok(lines.join(' ').length<500);assert.doesNotMatch(lines.join(' '),/атмосфер|давлен|вакуум|сред[аы]|перегрев|патрон/i);
 });
 test(p.name+' TL'+tl+': NR, cancel, final charge, duplicate and empty source',async()=>{
  const f=await gaussFixture(id),original=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),original);
  await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).charge,n*2);await f.service.spendWeaponCharge(f.weapon().id,n*2-1);
  const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
 });
 test(p.name+' TL'+tl+': Save/reload and stale replacement preserve energy and history',async()=>{
  const f=await gaussFixture(id),args={requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(f.weapon())};await f.service.replaceBattery(f.weapon().id,args);await f.shoot();
  await f.service.replaceBattery(f.weapon().id,args);assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
  await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
  await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{...args,requestId:crypto.randomUUID()}));
 });
 test(p.name+' TL'+tl+': no ammunition magazines, environment/Omni/Hotshot or owner bypass',async()=>{
  const f=await gaussFixture(id);await assert.rejects(()=>f.tx('add-magazines',{capacity:10,amount:1}));
  for(const changes of [{blasterEnvironment:'vacuum'},{blasterMode:'stun'},{blasterHotshot:true}])await assert.rejects(()=>f.service.setBlasterConfiguration(f.weapon().id,changes));
  const state=f.state();state.weapons[0].omniBlasterRequest=true;await assert.rejects(()=>f.service.saveState(state));
  f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
}
