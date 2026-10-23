import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFamilyTests} from './helpers/exotic-beam-tests.mjs';
import {fixture} from './helpers/exotic-beam-context.mjs';
import {EXOTIC_BEAM_PROFILES} from '../scripts/ut-exotic-beam-source.js';
import {configureExoticDamageApplication,exoticDamageContract,exoticDamageProvenance} from '../scripts/tools/exotic-beam-damage.js';
import {validateWeaponExecution} from '../scripts/tools/weapon-power.js';
sourceFamilyTests('force');
test('Force: Kinetic Stun switches without price/delay, snapshot validation and full cr dkb payload',async()=>{
 for(const p of Object.values(EXOTIC_BEAM_PROFILES).filter(p=>p.family==='force')){
  const f=await fixture(p.modeId),normal=f.profile();await f.configure({kineticStun:true});assert.throws(()=>validateWeaponExecution(f.weapon(),normal));
  const shot=await f.shoot(),rule=shot.profile.damage.rules.exoticBeam;assert.equal(rule.kineticStun,true);assert.equal(shot.profile.damage.formula,p.damage);
  const provenance=exoticDamageProvenance({status:'linked',sourceMessageId:shot.message.id,shot:{...shot.snapshot,damage:shot.profile.damage},component:'kinetic'});
  const payload={olegurpsExoticBeam:provenance,damage:21,damageType:'cr',damageModifier:'dkb',armorDivisor:0};
  const rt={game:{user:{isGM:false},messages:{get:()=>shot.message}}},contract=exoticDamageContract(payload,rt);assert.equal(contract.kineticStun,true);
  let applied;const individual={basicDamage:21,get injury(){return 21;}},calc={_calculators:[individual],get pointsToApply(){return individual.injury;}},actor={isOwner:true};
  const app={actor,_calculator:calc,resolveInjury(_k,n){applied=n;},submitDirectApply(){}};configureExoticDamageApplication(app,contract,rt);
  assert.equal(individual.basicDamage,21);assert.equal(individual.injury,0);app.submitDirectApply(true,true);assert.equal(applied,0);
  // The adapter leaves the native calculated/effective blunt-trauma path intact.
  Object.defineProperty(calc,'pointsToApply',{get:()=>4});app.submitDirectApply(true,true);assert.equal(applied,4);
  actor.isOwner=false;assert.throws(()=>app.submitDirectApply(true,true),/прав/);
 }
});
