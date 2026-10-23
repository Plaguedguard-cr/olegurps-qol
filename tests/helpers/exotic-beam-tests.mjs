import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,inventory} from './exotic-beam-context.mjs';
import {EXOTIC_BEAM_PROFILES} from '../../scripts/ut-exotic-beam-source.js';
import {readWeaponBattery,batteryExpectation} from '../../scripts/tools/weapon-power.js';
import {AmmoService} from '../../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft} from '../../scripts/tools/standalone-weapon-service.js';
import {confirmBatteryReplacement} from '../../scripts/tools/battery-replacement-dialog.js';
import {ammunitionChatData} from '../../scripts/tools/ammunition-chat-summary.js';
export function sourceFamilyTests(family){
 for(const p of Object.values(EXOTIC_BEAM_PROFILES).filter(p=>p.family===family)){
  test(p.name+': exact individual table identity, skill, complete power set and damage modifiers',async()=>{
   const r=inventory.records.find(r=>r.equipmentId===p.equipmentId),s=r.source.tableRows[0].fields,m=catalogs.getMode(p.modeId),f=await fixture(p.modeId);
   assert.equal(r.utName,p.name);assert.equal(r.modeIds[0],p.modeId);assert.equal(catalogs.getEquipmentForMode(p.modeId).tech_level,p.tl);
   assert.equal(m.raw_calc.damage.replace(/\s/g,''),p.damage.replace(/\s/g,''));assert.equal(s.Damage.replaceAll('¥','x').replace(/\s/g,''),p.damage.replace(family==='graviton'?' nkb':'','').replace(/\s/g,''));
   for(const [a,b] of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[a],s[b]);
   assert.equal(p.weightLb,Number(s.Weight.split('/')[0].replaceAll(',','')));assert.equal(p.cost,Number(s.Cost.replace(/[$,]/g,'')));assert.equal(p.lc,Number(s.LC));
   assert.equal(m.governing_skill.skill.name,family==='ghost'?'Artillery':p.specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,p.specialty);
   assert.equal(f.attack().level,family==='ghost'?13:14);assert.equal(f.attack().readinessReason,null);
   assert.equal(f.power().cells,p.cells);assert.equal(f.power().cellSize,p.cellSize);assert.equal(readWeaponBattery(f.weapon()).capacity,p.shots);
   assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.profile().damage.nativeSafe,true);
   assert.equal(f.profile().damage.formula,p.damage.replace('(∞)','(-1)'));
  });
  test(p.name+': prepared native attack, finite burst, frozen history and concise description',async()=>{
   const f=await fixture(p.modeId),shot=await f.shoot(p.rof);assert.equal(shot.rolled,true);assert.equal(shot.receipt.power.spent,p.rof);assert.equal(shot.receipt.magazineId,null);
   assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-p.rof);assert.equal(shot.snapshot.profile.damage.formula,f.profile().damage.formula);
   assert.match(shot.rollData.followon,/D:/);const saved=JSON.stringify(shot.snapshot);
   await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();assert.equal(JSON.stringify(shot.snapshot),saved);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-p.rof);
   const chat=ammunitionChatData(shot.profile);assert.ok(chat.lines.length<=3);assert.doesNotMatch(chat.lines.join(' '),/батаре|патрон|Basic Set|реализац/);
  });
  test(p.name+': replacement cancellation/NR, stale save, last pulse, zero and missing state',async()=>{
   const f=await fixture(p.modeId),before=f.state();assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async()=>false}}),null);assert.deepEqual(f.state(),before);
   await f.battery(true);const stale=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),stale);await f.shoot();await f.service.saveState(stale);assert.equal(readWeaponBattery(f.weapon()).charge,2*p.shots-1);
   await f.service.spendWeaponCharge(f.weapon().id,2*p.shots-2);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
   const state=f.state();delete state.weapons[0].exoticBeamBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());await f.battery();
   const expectedBattery=batteryExpectation(f.weapon()),requestId=crypto.randomUUID();await f.service.replaceBattery(f.weapon().id,{requestId,expectedBattery});await f.shoot();await f.service.replaceBattery(f.weapon().id,{requestId,expectedBattery});assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
  });
  test(p.name+': queue idempotency, resource limits, ownership and rejected physical/ETC/LP modes',async()=>{
   const f=await fixture(p.modeId),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
   await assert.rejects(()=>f.shoot(p.rof+1));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:5}));
   for(const executionVariant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
   f.actor.isOwner=false;await assert.rejects(()=>f.shoot());await assert.rejects(()=>f.battery());
  });
 }
}
