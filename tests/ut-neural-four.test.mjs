import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,sourceRows,nativeHarness} from './helpers/sonic-neural-context.mjs';
import {SONIC_NEURAL_PROFILES,neuralDesign,NEURAL_SETTINGS,sonicNeuralHardwareHTML,sonicNeuralControlsHTML} from '../scripts/ut-sonic-neural-source.js';
import {readWeaponBattery,batteryExpectation,validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome,rollResistance,afflictionTraitDefaults,resistanceEffect} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=sourceRows.filter(r=>r.implementationGroup==='neural'&&!r.utName.includes('Mindripper'));
test('B: exactly four individual Neural table/skills/defaults, no inferred base setting',async()=>{
 assert.equal(rows.length,4);
 for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id],m=catalogs.getMode(id),s=r.source.tableRows[0].fields;
  assert.equal(p.equipmentId,r.equipmentId);assert.equal(p.name,r.utName);assert.equal(catalogs.getEquipmentForMode(id).tech_level,'11^');
  for(const[a,b]of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[a],s[b]);
  assert.equal(m.raw_calc.damage,s.Damage);assert.equal(p.weightLb,Number(s.Weight.split('/')[0]));assert.equal(p.cost,Number(s.Cost.replace(/[$,]/g,'')));assert.equal(p.lc,Number(s.LC));
  assert.equal(p.shots,parseInt(s.Shots));assert.equal(p.rof,Number(s.RoF));assert.equal(m.governing_skill.skill.specialization,p.specialty);
  assert.equal(m.governing_skill.skill.name,p.specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.defaults.length,3);
  const f=await fixture(id,{settings:null});assert.equal(f.profile().damage.nativeSafe,false);assert.match(f.attack().readinessReason,/Установите настройку/);await assert.rejects(()=>f.shoot());
 }
});
for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id];
 test(p.name+': native attack, burst power, all six installed effects and concise history',async()=>{
  const f=await fixture(id,{settings:Object.keys(NEURAL_SETTINGS)}),n=p.rof===10?10:1;
  assert.equal(neuralDesign(f.weapon()).cost,3.5*p.cost);assert.equal(neuralDesign(f.weapon()).tl,12);
  for(const setting of Object.keys(NEURAL_SETTINGS)){
   await f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:setting});const shot=await f.shoot(n),e=messageResistanceEffect(shot.message);
   assert.equal(e.setting,setting);assert.equal(shot.receipt.power.spent,n);assert.equal(shot.profile.damage.formula,null);assert.deepEqual(shot.profile.damage.components,[]);assert.equal(shot.rollData.followon,'');
   const saved=JSON.stringify(shot.snapshot),h=nativeHarness({conditions:{distance:'beyond',sealed:false,nervousSystem:true}}),before=f.state();
   for(let i=0;i<2;i++){const ht=await rollResistance(shot.message,h.rt);assert.equal(ht.modifier,p.modifier+3);assert.equal(ht.message.flags['olegurps-qol'].resistanceResult.setting,setting);}
   assert.deepEqual(f.state(),before);assert.equal(JSON.stringify(shot.snapshot),saved);assert.equal(h.hooks.size,0);
   const chat=ammunitionChatData(shot.profile);assert.ok(chat.lines.length<=3);assert.doesNotMatch(chat.lines.join(' '),/батаре|патрон|Basic Set|реализац/);
  }
  assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-6*n);assert.equal(f.weapon().ammunitionInventory,undefined);
 });
 test(p.name+': NR, stale configuration Save/reload, cancellation, missing/zero, ownership and RoF',async()=>{
  const f=await fixture(id);await f.battery(true);const stale=f.state(),shot=await f.shoot();await f.service.saveState(stale);
  await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,2*p.shots-1);
  assert.equal(messageResistanceEffect(shot.message).setting,'stun');await f.hardware({neuralSettings:['agony']});assert.equal(messageResistanceEffect(shot.message).setting,'stun');
  const before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);await assert.rejects(()=>f.shoot(p.rof+1));
  await f.service.spendWeaponCharge(f.weapon().id,2*p.shots-1);await assert.rejects(()=>f.shoot());const state=f.state();delete state.weapons[0].sonicNeuralBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await assert.rejects(()=>f.shoot());await f.battery();
  f.actor.isOwner=false;await assert.rejects(()=>f.shoot());await assert.rejects(()=>f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:'agony'}));
 });
 test(p.name+': concurrent duplicate, stale profile, unsupported magazines/LP/ETC and mode injection',async()=>{
  const f=await fixture(id,{settings:['stun','paralysis']}),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);
  const profile=f.profile();await f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:'paralysis'});assert.throws(()=>validateWeaponExecution(f.weapon(),profile));
  await assert.rejects(()=>f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:'death'}));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:5}));
  for(const executionVariant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
 });
}
test('Neural: Sealed is full immunity, ordinary DR ignored, explicit nervous traits only',async()=>{
 const f=await fixture('WLl_MaLTZuEsWMFbQ'),shot=await f.shoot(),e=messageResistanceEffect(shot.message),c={distance:'within',sealed:false,nervousSystem:true,dr:999};
 assert.equal(visionResistanceModifier(e,c).modifier,-3);
 for(const conditions of [{...c,sealed:true},{...c,nervousSystem:false}]){const h=nativeHarness({conditions});assert.equal((await rollResistance(shot.message,h.rt)).immune,true);assert.equal(h.calls.length,0);}
 for(const name of ['Injury Tolerance (Diffuse)','Injury Tolerance (No Brain)','Injury Tolerance (Homogenous)','Injury Tolerance (Unliving)','Machine'])assert.equal(afflictionTraitDefaults({system:{ads:{a:{name}}}}).nervousSystem,false,name);
 assert.equal(afflictionTraitDefaults({name:'Machine',system:{ads:{}}}).nervousSystem,true);
 assert.equal(afflictionTraitDefaults({system:{ads:{a:{name:'Machine',inactive:true}}}}).nervousSystem,true);
 assert.equal(afflictionTraitDefaults({system:{ads:{a:{name:'Injury Tolerance (No Vitals, No Brain)'}}}}).nervousSystem,false);
 assert.equal(afflictionTraitDefaults({system:{ads:{a:{name:'Injury Tolerance (No Vitals)'}}}}).noVitals,true);
 assert.equal(visionResistanceModifier({...e,setting:'ecstasy'},{...c,killjoy:true}).applies,false);
 assert.equal(visionResistanceModifier({...e,setting:'death'},{...c,noVitals:true}).applies,false);
 assert.equal(visionResistanceModifier({...e,setting:'agony'},{...c,noVitals:true}).applies,true);
});
test('Neural: exact effects, aftermath, Heart Attack at 5+ and Death Beam on any failure',async()=>{
 const f=await fixture('WHpARyY40tap9KlXu',{settings:Object.keys(NEURAL_SETTINGS)}),expected={agony:/Agony.*Moderate Pain/,ecstasy:/Ecstasy.*Euphoria/,stun:/Unconsciousness/,paralysis:/Paralysis/,seizure:/Seizure/,death:/Heart Attack/};
 for(const setting of Object.keys(NEURAL_SETTINGS)){
  await f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:setting});const e=f.profile().damage.rules.resistanceEffect,n={finaltarget:8,rtotal:12,margin:-4,failure:true,isCritSuccess:false,isCritFailure:false};
  const result=resistanceOutcome(e,n).consequence;assert.match(result,expected[setting]);if(setting!=='death')assert.doesNotMatch(result,/Heart Attack/);
  if(['agony','ecstasy'].includes(setting))assert.match(resistanceOutcome(e,{...n,margin:-5}).consequence,/Heart Attack/);
  assert.equal(resistanceOutcome(e,{...n,failure:false,margin:1,rtotal:7}).success,true);
  assert.equal(resistanceEffect({...e,setting:'uninstalled-fiction'}),null);
 }
});
test('Tunable uses instance hardware, exact cost/TL, single mode has no selector, campaign TL blocks Death',async()=>{
 const f=await fixture('WLl_MaLTZuEsWMFbQ'),single=sonicNeuralControlsHTML(f.weapon(),String);assert.doesNotMatch(single,/<select/);
 await f.hardware({neuralSettings:['paralysis','seizure']});assert.equal(neuralDesign(f.weapon()).costMultiplier,1.5);assert.match(sonicNeuralControlsHTML(f.weapon(),String),/name="neuralMode"/);
 const power=readWeaponBattery(f.weapon());await f.actor.setFlag('olegurps-qol','campaignTL',11);await assert.rejects(()=>f.hardware({neuralSettings:['death']}));assert.deepEqual(readWeaponBattery(f.weapon()),power);
 await f.actor.setFlag('olegurps-qol','campaignTL',12);await f.hardware({neuralSettings:['death']});assert.equal(neuralDesign(f.weapon()).tl,12);assert.equal(neuralDesign(f.weapon()).costMultiplier,1);
 await f.actor.setFlag('olegurps-qol','campaignTL',11);await f.hardware({neuralSettings:['death']});assert.equal(neuralDesign(f.weapon()).tl,12);
 assert.match(sonicNeuralHardwareHTML('WLl_MaLTZuEsWMFbQ',f.weapon(),String),/TL12/);
});
test('New affliction dialogs require owned Actor, no HT/SM inputs, Russian under ru/en, Cancel writes nothing',async()=>{
 for(const id of ['W-_cDjyLwIO0mQQq9','WQ7YiOiM0eRtAcXjw','WLl_MaLTZuEsWMFbQ']){
  const f=await fixture(id),shot=await f.shoot();for(const lang of ['ru','en']){
   let seen=0;const h=nativeHarness({dialog:async o=>{seen++;assert.equal(o.modal,false);assert.match(o.content,/Дистанция/);assert.doesNotMatch(o.content,/name="(?:ht|sm)"/);return false;}});h.rt.game.i18n={lang};
   assert.equal(await rollResistance(shot.message,h.rt),null);assert.equal(seen,1);assert.equal(h.calls.length,0);
  }
  await assert.rejects(()=>rollResistance(shot.message,nativeHarness({actorless:true}).rt));const foreign=nativeHarness();foreign.actor.isOwner=false;await assert.rejects(()=>rollResistance(shot.message,foreign.rt));
 }
});
