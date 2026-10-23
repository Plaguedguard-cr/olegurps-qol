import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,sourceRows,nativeHarness} from './helpers/sonic-neural-context.mjs';
import {SONIC_NEURAL_PROFILES,sonicNeuralConfiguration,screamerHearingResult,screamerDamageLines} from '../scripts/ut-sonic-neural-source.js';
import {readWeaponBattery,batteryExpectation,validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome,rollResistance} from '../scripts/tools/resistance-roll.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
const rows=sourceRows.filter(r=>r.implementationGroup==='sonic'),scope='olegurps-qol';
test('A: exactly twelve individual Sonic IDs and published table/skill/defaults',()=>{
 assert.equal(rows.length,12);
 for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id],m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id),s=r.source.tableRows[0].fields;
  assert.equal(e.name,r.utName);assert.equal(p.equipmentId,r.equipmentId);assert.equal(e.tech_level,r.source.originalTL);
  for(const[a,b]of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[a],s[b],r.utName+' '+a);
  assert.equal(m.raw_calc.damage.replace(/\s/g,''),s.Damage.replace(/\s/g,''));assert.equal(p.acc,Number(s.Acc));assert.equal(p.rof,Number(s.RoF));assert.equal(p.shots,parseInt(s.Shots));
  assert.equal(p.weightLb,Number(s.Weight.split('/')[0]));assert.equal(p.cellSize,s.Weight.split('/')[1].replace(/[\dp]/g,''));assert.equal(p.cells,Number(s.Weight.split('/')[1].match(/^\d+/)?.[0]??1));
  assert.equal(p.cost,Number(s.Cost.replace(/[$,]/g,'')));assert.equal(p.lc,Number(s.LC));
  assert.equal(m.governing_skill.skill.name,p.specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,p.specialty);
  assert.ok(m.defaults.some(d=>d.type==='dx'&&d.modifier===-4));assert.ok(m.defaults.some(d=>d.type==='skill'&&d.specialization===null&&d.modifier===-4));
  if(['Pistol','Rifle'].includes(p.specialty))assert.ok(m.defaults.some(d=>d.name==='Guns'&&d.specialization===p.specialty&&d.modifier===-4));
 }
});
for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id];
 test(p.name+': native attack, complete battery set, exact burst spend, concise saved card',async()=>{
  const f=await fixture(id),before=readWeaponBattery(f.weapon()),shot=await f.shoot(p.rof===10?7:1),n=p.rof===10?7:1;
  assert.equal(before.capacity,p.shots);assert.equal(before.cells,p.cells);assert.equal(before.type,p.cellSize);assert.equal(shot.receipt.power.spent,n);assert.equal(shot.receipt.power.physicalShots,n);
  assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-n);assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);
  assert.equal(shot.profile.damage.nativeSafe,true);assert.equal(f.attack().data.isBeamWeapon,true);assert.equal(!!f.attack().platformRules?.hitLocationNotApplicable,p.coneWidth>0);
  if(p.family==='screamer'){assert.equal(shot.profile.damage.formula,p.modifier+'d cor');assert.equal(messageResistanceEffect(shot.message),null);assert.match(shot.rollData.followon,/D:/);}
  else {assert.equal(shot.profile.damage.formula,null);assert.deepEqual(shot.profile.damage.components,[]);assert.equal(shot.rollData.followon,'');assert.equal(messageResistanceEffect(shot.message).modifier,p.modifier);}
  const data=ammunitionChatData(shot.profile);assert.ok(data.lines.length<=3);assert.ok(data.lines.join(' ').length<550);assert.doesNotMatch(data.lines.join(' '),/батаре|патрон|реализац|Basic Set/);
  const old=JSON.stringify(shot.snapshot),state=f.state();messageResistanceEffect(shot.message);assert.equal(JSON.stringify(shot.snapshot),old);assert.deepEqual(f.state(),state);
 });
 test(p.name+': NR, cancel, Save/reload and stale form preserve power/history',async()=>{
  const f=await fixture(id);await f.battery(true);const stale=f.state(),shot=await f.shoot();
  await f.service.saveState(stale);await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();
  assert.equal(readWeaponBattery(f.weapon()).charge,2*p.shots-1);assert.equal(shot.receipt.power.nonRechargeable,true);
  const before=f.state();assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async o=>{assert.equal(o.modal,false);assert.doesNotMatch(o.content,/checked/);return false;}}}),null);assert.deepEqual(f.state(),before);
 });
 test(p.name+': depleted/missing power, oversized burst, OWNER and unsupported physical/ETC/LP paths',async()=>{
  const f=await fixture(id);await assert.rejects(()=>f.shoot(p.rof+1));const before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
  await f.service.spendWeaponCharge(f.weapon().id,p.shots);await assert.rejects(()=>f.shoot());
  const state=f.state();delete state.weapons[0].sonicNeuralBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());await f.battery();
  await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:2}));
  for(const executionVariant of ['etc','lp']){const s=f.state();s.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',s);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
  const s=f.state();delete s.weapons[0].executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',s);f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
 test(p.name+': duplicate/concurrent shots and battery confirmation idempotence',async()=>{
  const f=await fixture(id),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
  const args={requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(f.weapon())};await f.service.replaceBattery(f.weapon().id,args);await f.shoot();await f.service.replaceBattery(f.weapon().id,args);
  assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{...args,requestId:crypto.randomUUID()}));
 });
 test(p.name+': pressure cap, vacuum, underwater design and stale shot config',async()=>{
  const f=await fixture(id),old=f.profile();await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicPressure:3});assert.equal(f.profile().effective.range,p.halfRange*2+'/'+p.maximum*2);
  assert.throws(()=>validateWeaponExecution(f.weapon(),old));await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicPressure:0.5});assert.equal(f.profile().effective.range,p.halfRange/2+'/'+p.maximum/2);
  await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicEnvironment:'vacuum'});assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
  await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicPhysicalContact:true});assert.equal(f.profile().damage.nativeSafe,p.family!=='nauseator');
  await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicEnvironment:'air',sonicPressure:0.01});assert.equal(f.profile().damage.nativeSafe,p.family!=='nauseator');
  if(p.family!=='nauseator')assert.equal(f.profile().effective.range,'C');
  if(p.family!=='nauseator')assert.equal(f.profile().effective.range,'C');else await assert.rejects(()=>f.shoot());
  await f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicEnvironment:'water'});assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
  if(p.family!=='nauseator'){await f.hardware({sonicUnderwater:true});assert.equal(f.profile().effective.range,p.halfRange*2+'/'+p.maximum*2);assert.equal(f.profile().damage.nativeSafe,true);}
  await assert.rejects(()=>f.service.setSonicNeuralConfiguration(f.weapon().id,{sonicPressure:-1}));
 });
}
test('Nauseator: Protected Hearing, no hearing, DR ignored and failure 4/5 outcomes',async()=>{
 const f=await fixture('W-_cDjyLwIO0mQQq9'),shot=await f.shoot(),e=messageResistanceEffect(shot.message),c={distance:'beyond',canHear:true,protectedHearing:true,dr:999};
 assert.equal(visionResistanceModifier(e,c).modifier,5);assert.equal(visionResistanceModifier(e,{...c,canHear:false}).applies,false);
 const n={finaltarget:8,rtotal:12,margin:-4,failure:true,isCritSuccess:false,isCritFailure:false};assert.match(resistanceOutcome(e,n).consequence,/Hard of Hearing.*Moderate Pain.*4 мин/);
 assert.match(resistanceOutcome(e,{...n,margin:-5}).consequence,/Deafness.*retching.*Bad Smell.*очищения/);assert.doesNotMatch(resistanceOutcome(e,{...n,margin:-5}).consequence,/Unconscious/);
 const h=nativeHarness({conditions:{...c,canHear:false}}),before=f.state();assert.equal((await rollResistance(shot.message,h.rt)).immune,true);assert.equal(h.calls.length,0);assert.deepEqual(f.state(),before);
});
test('Stunner: DR floors, deaf unaffected, limb consequence and repeated independent native HT',async()=>{
 const f=await fixture('WZTCZw_ytxYRxZU1c'),shot=await f.shoot(10),e=messageResistanceEffect(shot.message);
 for(const dr of [0,4,5,9,10,29])assert.equal(visionResistanceModifier(e,{distance:'beyond',dr,limb:true,canHear:false}).modifier,-8+3+Math.floor(dr/5));
 const before=f.state(),saved=JSON.stringify(shot.snapshot),h=nativeHarness({conditions:{distance:'within',dr:9,limb:true}});
 for(let i=0;i<3;i++){const r=await rollResistance(shot.message,h.rt);assert.match(r.consequence,/Недееспособность/);assert.doesNotMatch(r.consequence,/Unconscious/);}
 assert.equal(h.calls.length,3);assert.equal(h.hooks.size,0);assert.deepEqual(f.state(),before);assert.equal(JSON.stringify(shot.snapshot),saved);
});
test('Screamer: exact strict hearing thresholds compare actual injury and native rolled damage',()=>{
 for(const [injury,result]of [[6,null],[6.01,'Hard of Hearing'],[8,'Hard of Hearing'],[8.01,'Deafness']])assert.equal(screamerHearingResult(injury,12),result);
 assert.equal(screamerHearingResult(10,null),null);assert.match(screamerDamageLines([{damage:17}],12)[0],/17 cor.*6.*8/);assert.deepEqual(screamerDamageLines([{roll:{total:99}}],12),[]);
});
