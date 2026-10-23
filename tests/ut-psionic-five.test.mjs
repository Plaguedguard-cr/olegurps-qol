import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,inventory} from './helpers/exotic-beam-context.mjs';
import {nativeHarness} from './helpers/sonic-neural-context.mjs';
import {EXOTIC_BEAM_PROFILES,PSIONIC_SETTINGS,exoticBeamConfiguration,exoticBeamControlsHTML,exoticBeamHardwareHTML} from '../scripts/ut-exotic-beam-source.js';
import {readWeaponBattery,validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {messageResistanceEffect,resistanceEffect,rollResistance,visionResistanceModifier,resistanceOutcome,afflictionTraitDefaults} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=Object.values(EXOTIC_BEAM_PROFILES).filter(p=>p.family==='psionic');
const conditions={distance:'within',mindShield:0,iqZero:false,digitalMind:false,noVitals:false,doesntBreathe:false};
for(const p of rows){
 test(p.name+': individual UT132 identity, statistics, Will and default',async()=>{
  const r=inventory.records.find(r=>r.equipmentId===p.equipmentId),s=r.source.tableRows[0].fields,m=catalogs.getMode(p.modeId),f=await fixture(p.modeId);
  assert.equal(r.utName,p.name);assert.equal(r.modeIds[0],p.modeId);assert.equal(catalogs.getEquipmentForMode(p.modeId).tech_level,p.tl);
  assert.equal(m.raw_calc.damage,p.damage);assert.equal(s.Damage,p.damage);
  for(const [a,b] of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[a],s[b]);
  assert.equal(p.weightLb,Number(s.Weight.split('/')[0]));assert.equal(p.cost,Number(s.Cost.replace(/[$,]/g,'')));assert.equal(p.lc,Number(s.LC));
  assert.equal(m.governing_skill.skill.name,p.specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,p.specialty);
  assert.equal(f.attack().level,14);assert.equal(f.attack().readinessReason,null);assert.deepEqual(exoticBeamConfiguration(f.weapon()),{settings:['eraser'],mode:'eraser'});
  assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);
 });
 test(p.name+': all installed settings, native Will, frozen history and compact descriptions',async()=>{
  const f=await fixture(p.modeId);await f.hardware(Object.keys(PSIONIC_SETTINGS));
  for(const setting of Object.keys(PSIONIC_SETTINGS)){
   await f.configure({psionicMode:setting});const shot=await f.shoot(p.rof),e=messageResistanceEffect(shot.message),saved=JSON.stringify(shot.snapshot),before=f.state();
   assert.equal(shot.receipt.power.spent,p.rof);assert.equal(e.attribute,'Will');assert.equal(e.setting,setting);assert.equal(shot.rollData.followon,'');assert.equal(shot.profile.damage.formula,null);
   const h=nativeHarness({conditions:{...conditions,distance:'beyond',mindShield:4}});h.actor.system.attributes.WILL={value:13};
   const result=await rollResistance(shot.message,h.rt);assert.equal(result.base,13);assert.equal(result.modifier,e.modifier+7);assert.equal(h.calls[0].formula,'3d6');
   assert.equal(result.message.flags['olegurps-qol'].resistanceResult.setting,setting);assert.deepEqual(f.state(),before);assert.equal(JSON.stringify(shot.snapshot),saved);
   const chat=ammunitionChatData(shot.profile);assert.ok(chat.lines.length<=3);assert.doesNotMatch(chat.lines.join(' '),/батаре|патрон|Basic Set|реализац/);
  }
  assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-4*p.rof);
 });
 test(p.name+': finite complete set, NR, last pulse, cancellation, duplicate and reload',async()=>{
  const f=await fixture(p.modeId);await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).capacity,2*p.shots);const stale=f.state(),before=f.state();
  await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);
  await f.service.saveState(stale);await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,2*p.shots-1);
  await f.service.spendWeaponCharge(f.weapon().id,2*p.shots-2);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
  const state=f.state();delete state.weapons[0].exoticBeamBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await assert.rejects(()=>f.shoot());await f.battery();await assert.rejects(()=>f.shoot(p.rof+1));
 });
 test(p.name+': hardware isolation, stale profile, owner permission and no physical ammunition',async()=>{
  const f=await fixture(p.modeId);await assert.rejects(()=>f.configure({psionicMode:'death'}));await f.hardware(['eraser','death']);const profile=f.profile();await f.configure({psionicMode:'death'});assert.throws(()=>validateWeaponExecution(f.weapon(),profile));
  await assert.rejects(()=>f.hardware([]));await assert.rejects(()=>f.hardware(['invented']));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:10}));
  f.actor.isOwner=false;await assert.rejects(()=>f.configure({psionicMode:'eraser'}));await assert.rejects(()=>f.shoot());
 });
}
test('Psionic: IQ0/Digital Mind immunities, active Mind Shield, ignored DR and unchanged HT',async()=>{
 const f=await fixture(rows[0].modeId),shot=await f.shoot(),e=messageResistanceEffect(shot.message);
 assert.equal(visionResistanceModifier(e,{...conditions,dr:999,sealed:true,mindShield:3}).modifier,e.modifier+3);
 for(const field of ['iqZero','digitalMind']){const h=nativeHarness({conditions:{...conditions,[field]:true}});h.actor.system.attributes.WILL={value:12};assert.equal((await rollResistance(shot.message,h.rt)).immune,true);assert.equal(h.calls.length,0);}
 const defaults=afflictionTraitDefaults({system:{attributes:{IQ:{value:0}},ads:{a:{name:'Mind Shield',level:4},b:{name:'Digital Mind'}}}});assert.equal(defaults.mindShield,4);assert.equal(defaults.iqZero,true);assert.equal(defaults.digitalMind,true);
 assert.equal(resistanceEffect({...e,attribute:'HT'}),null);assert.equal(resistanceEffect({...e,setting:'imaginary'}),null);
 assert.equal(visionResistanceModifier({condition:'sonic-stunner',modifier:-3},{distance:'beyond',dr:10,limb:false}).modifier,2);
});
test('Psionic: exact consequences and partial Death immunities, never automatic status/memory',async()=>{
 const f=await fixture(rows[0].modeId);await f.hardware(Object.keys(PSIONIC_SETTINGS));const n={finaltarget:9,rtotal:12,margin:-3,failure:true,isCritSuccess:false,isCritFailure:false};
 const expected={eraser:/Daze.*3 мин.*предыдущая секунда/,death:/Choking: 6 с/,insanity:/Hallucinations: 3 мин/,neutralizer:/подавлены: 3 мин/};
 for(const setting of Object.keys(expected)){await f.configure({psionicMode:setting});const e=f.profile().damage.rules.resistanceEffect;assert.match(resistanceOutcome(e,n,conditions).consequence,expected[setting]);}
 const e={...f.profile().damage.rules.resistanceEffect,setting:'death'};assert.match(resistanceOutcome(e,{...n,margin:-5},conditions).consequence,/Heart Attack/);assert.match(resistanceOutcome(e,n,{...conditions,doesntBreathe:true}).consequence,/не действует/);assert.match(resistanceOutcome(e,{...n,margin:-5},{...conditions,noVitals:true}).consequence,/не действует/);
 assert.match(resistanceOutcome({...e,setting:'insanity'},{...n,margin:-5},conditions).consequence,/Coma.*Nightmares \(12\).*1d недель/);
 assert.match(resistanceOutcome({...e,setting:'eraser'},{...n,margin:-5},conditions).consequence,/Unconsciousness.*Daze/);
});
test('Psionic equipment UI: installed options, price and Ready; cancel conditions under ru/en',async()=>{
 const f=await fixture(rows[1].modeId);assert.doesNotMatch(exoticBeamControlsHTML(f.weapon(),String),/<select/);await f.hardware(['eraser','insanity']);assert.match(exoticBeamHardwareHTML(rows[1].modeId,f.weapon(),String),/\$1800/);assert.match(exoticBeamControlsHTML(f.weapon(),String),/Ready/);
 const shot=await f.shoot();for(const lang of ['ru','en']){const h=nativeHarness({dialog:async o=>{assert.match(o.content,/Mind Shield/);assert.doesNotMatch(o.content,/name="(?:ht|sm)"/);return false;}});h.actor.system.attributes.WILL={value:11};h.rt.game.i18n={lang};assert.equal(await rollResistance(shot.message,h.rt),null);assert.equal(h.calls.length,0);}
});
