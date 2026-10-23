import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,sourceRows,nativeHarness} from './helpers/sonic-neural-context.mjs';
import {SONIC_NEURAL_PROFILES,MINDRIPPER_PROJECT_POLICY,sonicNeuralControlsHTML} from '../scripts/ut-sonic-neural-source.js';
import {messageResistanceEffect,rollResistance,resistanceEffect,visionResistanceModifier,resistanceOutcome,afflictionTraitDefaults} from '../scripts/tools/resistance-roll.js';
import {readWeaponBattery} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
const rows=sourceRows.filter(r=>r.utName.includes('Mindripper'));
const choices={distance:'within',mindShield:0,iqZero:false,digitalMind:false,nervousSystem:true};
test('E: original UT122 rows retained; explicit approved HT/single-target policy is separate from the table',async()=>{
 assert.equal(Object.keys(SONIC_NEURAL_PROFILES).length,18);assert.equal(rows.length,2);assert.equal(MINDRIPPER_PROJECT_POLICY.approved,true);
 for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id],m=catalogs.getMode(id),s=r.source.tableRows[0].fields,f=await fixture(id);
  assert.equal(p.equipmentId,r.equipmentId);assert.equal(p.name,r.utName);assert.equal(p.rof,Number(s.RoF));assert.equal(p.shots,parseInt(s.Shots));assert.equal(p.cells,s.Weight.includes('2C')?2:1);
  assert.equal(m.governing_skill.skill.specialization,p.specialty);assert.equal(m.raw_calc.damage,s.Damage);assert.equal(catalogs.getEquipmentForMode(id).tech_level,'12^');
  for(const[a,b]of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[a],s[b]);
  assert.equal(m.attack_resolution.geometry.type,'single-target');assert.equal(m.attack_resolution.project_policy.attribute,'HT');assert.equal(f.profile().damage.rules.sonicNeural.coneWidth,0);assert.equal(f.attack().platformRules.hitLocationNotApplicable,true);
  assert.equal(f.attack().readinessReason,null);assert.equal(f.profile().effective.damage,`HT${p.modifier} aff`);assert.match(m.raw_calc.damage,/1 yd/);
 }
});
for(const r of rows){const id=r.modeIds[0],p=SONIC_NEURAL_PROFILES[id];
 test(p.name+': native HT with shield/half range, source policy/history and compact single-target card',async()=>{
  const f=await fixture(id),shot=await f.shoot(p.rof),e=messageResistanceEffect(shot.message),saved=JSON.stringify(shot.snapshot),before=f.state();
  assert.equal(e.attribute,'HT');assert.equal(e.modifier,p.modifier);assert.match(e.source,/проект/);assert.equal(shot.rollData.followon,'');assert.equal(shot.receipt.power.spent,p.rof);assert.equal(shot.profile.damage.formula,null);
  const h=nativeHarness({conditions:{...choices,distance:'beyond',mindShield:4}}),result=await rollResistance(shot.message,h.rt);assert.equal(result.modifier,p.modifier+7);assert.equal(result.base,11);assert.deepEqual(f.state(),before);assert.equal(JSON.stringify(shot.snapshot),saved);
  const chat=ammunitionChatData(shot.profile);assert.equal(chat.lines.length,2);assert.doesNotMatch(chat.lines.join(' '),/Конус|батаре|патрон|Basic Set/);assert.equal(sonicNeuralControlsHTML(f.weapon(),String),'');
 });
 test(p.name+': complete finite set, NR, last/zero/missing, cancellation and stale Save/reload',async()=>{
  const f=await fixture(id);await f.battery(true);const stale=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),stale);await f.shoot();await f.service.saveState(stale);await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,p.shots*2-1);
  await f.service.spendWeaponCharge(f.weapon().id,p.shots*2-2);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
  const state=f.state();delete state.weapons[0].sonicNeuralBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());await f.battery();assert.equal(readWeaponBattery(f.weapon()).capacity,p.shots);
 });
 test(p.name+': queue duplicates, ownership, source RoF and no invented configuration or cartridges',async()=>{
  const f=await fixture(id),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,p.shots-1);await assert.rejects(()=>f.shoot(p.rof+1));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:5}));await assert.rejects(()=>f.service.setSonicNeuralConfiguration(f.weapon().id,{neuralMode:'death'}));
  for(const executionVariant of ['etc','lp']){const st=f.state();st.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',st);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
  f.actor.isOwner=false;await assert.rejects(()=>f.shoot());await assert.rejects(()=>f.battery());
 });
}
test('Mindripper immunity union: IQ0/Digital Mind/nervous system; Sealed and DR do not protect',async()=>{
 const f=await fixture(rows[0].modeIds[0]),shot=await f.shoot(),e=messageResistanceEffect(shot.message);
 assert.equal(visionResistanceModifier(e,{...choices,sealed:true,dr:99999}).modifier,e.modifier);assert.equal(resistanceEffect({...e,attribute:'Will'}),null);
 for(const conditions of [{...choices,iqZero:true},{...choices,digitalMind:true},{...choices,nervousSystem:false}]){const h=nativeHarness({conditions});assert.equal((await rollResistance(shot.message,h.rt)).immune,true);assert.equal(h.calls.length,0);}
 for(const name of ['Injury Tolerance (Diffuse)','Injury Tolerance (No Brain)','Injury Tolerance (Homogenous)','Injury Tolerance (Unliving)','Machine'])assert.equal(afflictionTraitDefaults({system:{ads:{a:{name}}}}).nervousSystem,false);
});
test('Mindripper consequences are descriptive Coma/copy and severe Amnesia, never a consciousness database',async()=>{
 const f=await fixture(rows[0].modeIds[0]),e=f.profile().damage.rules.resistanceEffect,n={finaltarget:8,rtotal:12,margin:-4,failure:true,isCritSuccess:false,isCritFailure:false};
 assert.match(resistanceOutcome(e,n).consequence,/Coma.*low-resolution fragment/);assert.doesNotMatch(resistanceOutcome(e,n).consequence,/Total Amnesia/);assert.match(resistanceOutcome(e,{...n,margin:-5}).consequence,/Coma.*Total Amnesia.*high-resolution emulation/);assert.equal(resistanceOutcome(e,{...n,failure:false,margin:1,rtotal:7}).success,true);
});
test('Mindripper nonmodal Russian conditions under ru/en, no HT/SM or Sealed fields; Cancel is inert',async()=>{
 const f=await fixture(rows[1].modeIds[0]),shot=await f.shoot();for(const lang of ['ru','en']){const h=nativeHarness({dialog:async o=>{assert.equal(o.modal,false);assert.match(o.content,/Mind Shield/);assert.match(o.content,/нервная система/);assert.doesNotMatch(o.content,/name="(?:ht|sm|sealed)"/);return false;}});h.rt.game.i18n={lang};assert.equal(await rollResistance(shot.message,h.rt),null);assert.equal(h.calls.length,0);}
});
test('Tactical Screamer retains table TL9 and source TL9^ conflict is not silently guessed',()=>{
 assert.equal(catalogs.getEquipment('efMOZeAfM7krJAOes').tech_level,'9');assert.equal(SONIC_NEURAL_PROFILES.W3KOwjjpG9lL6GNQj.tl,'9');
});
