import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture,catalogs} from './helpers/gauss-context.mjs';
import {DISINTEGRATOR_PROFILES as profiles} from '../scripts/ut-disintegrator-source.js';
import {readWeaponBattery,newWeaponBattery} from '../scripts/tools/weapon-power.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readFile} from 'node:fs/promises';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
import {exoticBeamControlsHTML} from '../scripts/ut-exotic-beam-source.js';
const inventory=JSON.parse(await readFile(new URL('../docs/audit/ut-weapons-inventory.json',import.meta.url),'utf8'));
export function familyTests(family){for(const p of Object.values(profiles).filter(p=>p.family===family)){
 test(p.name+': source identity, profile, finite Cosmic set and native burst',async()=>{
  const f=await fixture(p.modeId),m=catalogs.getMode(p.modeId);assert.equal(f.attack().readinessReason,null);assert.equal(f.profile().damage.nativeSafe,true);
  const base=inventory.records.find(r=>r.equipmentId===p.chassisEquipmentId),fields=base.source.tableRows[0].fields;
  for(const [key,field] of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[key],fields[field]);
  assert.equal(p.cost,Number(fields.Cost.replace(/[$,]/g,'')));assert.equal(p.weightLb,Number(fields.Weight.split('/')[0].replaceAll(',','')));assert.equal(p.lc,Number(fields.LC));
  assert.equal(p.cellCost,({C:1000,E:200000,F:2000000})[p.cellSize]);assert.equal(p.cellSetCost,p.cellCost*p.cells);
  assert.equal(m.raw_calc.damage.replace(/\s/g,''),p.damage.replace(/\s/g,''));assert.equal(m.governing_skill.skill.specialization,p.specialty);assert.equal(f.attack().level,14);
  assert.equal(f.power().capacity,p.shots);assert.equal(f.power().cosmic,true);assert.equal(readWeaponBattery(f.weapon()).standard,'cosmic');assert.equal(readWeaponBattery(f.weapon()).cells,p.cells);
  const display=attackProfilePresentation(f.profile());assert.ok(display.damageText.includes(p.damage));assert.match(exoticBeamControlsHTML(f.weapon(),String),/Selective Area/);
  if(family==='conversion')assert.ok(display.damageText.includes(p.followUp));
  const shot=await f.shoot(10);assert.equal(shot.receipt.power.spent,10);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-10);assert.match(shot.rollData.followon,/D:/);
  assert.equal(shot.snapshot.profile.damage.rules.exoticBeam.family,family);assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
  if(family==='conversion'){assert.equal(shot.profile.damage.components[1].formula,p.followUp);assert.doesNotMatch(p.followUp,/\(10\)/);}
 });
 test(p.name+': missing/ordinary/wrong set/NR refused; history, Save, last pulse and OWNER',async()=>{
  const f=await fixture(p.modeId),shot=await f.shoot(),saved=JSON.stringify(shot.snapshot);assert.throws(()=>newWeaponBattery(f.power(),true));
  await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
  for(const changes of [{standard:'ordinary'},{cells:p.cells+1},{charge:0},{standard:undefined}]){const st=f.state();st.weapons[0].exoticBeamBattery={...newWeaponBattery(f.power()),...changes};await f.actor.setFlag('world','gurpsAmmoManager',st);await assert.rejects(()=>f.shoot());}
  await f.battery();await f.service.spendWeaponCharge(f.weapon().id,p.shots-1);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());assert.equal(JSON.stringify(shot.snapshot),saved);
  f.actor.isOwner=false;await assert.rejects(()=>f.battery());await assert.rejects(()=>f.shoot());
 });
 test(p.name+': atomic queue, stale Save and rejection of physical cartridges and execution variants',async()=>{
  const f=await fixture(p.modeId),stale=f.state(),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
  await f.service.saveState(stale);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);await assert.rejects(()=>f.shoot(11));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:10}));
  for(const executionVariant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
 });
}}
