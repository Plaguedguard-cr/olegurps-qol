import test from 'node:test';import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
import {readWeaponBattery} from '../scripts/tools/weapon-power.js';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
import {WeaponConfigurationDraft} from '../scripts/tools/weapon-configuration.js';
import {rollResistance} from '../scripts/tools/resistance-roll.js';
const id='WouV3E3GYwAURw6k4';
for(const total of [13,14,17,18])test('Hotshot Malf14: native total '+total+' is tested independently of skill and consumes exactly two charges',async()=>{
 const f=await gaussFixture(id);await f.service.setBlasterConfiguration(f.weapon().id,{blasterHotshot:true});
 const rt={game,canvas:{tokens:{placeables:[]}},GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
  Roll:{create:formula=>({formula,total,dice:[{results:[4,4,total-8].map(result=>({result}))}],async evaluate(){return this;}})},
  renderTemplate:async(_path,data)=>data.followon,
  ChatMessage:{getSpeaker:()=>({actor:f.actor.id}),create:async data=>({...data,id:crypto.randomUUID(),
   async setFlag(s,k,v){(this.flags[s]??={})[k]=structuredClone(v);},getFlag(s,k){return this.flags?.[s]?.[k];}})}};
 const r=await f.shoot(1,{execute:({profile})=>executePreparedGgaRoll({actor:f.actor,attack:f.attack(),attackProfile:profile,
  shotSnapshot:createShotSnapshot(profile,{attackId:crypto.randomUUID()}),effectiveSkill:30,physicalShots:1,effectiveRoF:1,rcl:1,consumeAction:false,runtime:rt})});
 assert.equal(r.rollData.failure,total>=14);assert.equal(readWeaponBattery(f.weapon()).charge,38);assert.equal(r.snapshot.profile.weaponReliability.malf,14);
 if(total>=14)assert.match(r.message.content,/Отказ Hotshot/);else assert.doesNotMatch(r.message.content,/Отказ Hotshot/);
});
test('Omni instance editor drafts are reversible; explicit Save installs without restoring power',async()=>{
 const f=await gaussFixture(id);await f.shoot();const before=f.state(),draft=new WeaponConfigurationDraft({actor:f.actor,state:before,attacks:[f.attack()],existing:f.weapon(),catalogs});
 assert.equal(draft.omniBlaster,false);draft.omniBlaster=true;draft.omniChanged=true;assert.deepEqual(f.state(),before);
 const r=await draft.commit({id:f.weapon().id});assert.equal(r.weapon.omniBlasterRequest,true);assert.equal(f.weapon().omniBlaster,undefined);
 await f.service.saveState(r.state);assert.equal(f.weapon().omniBlaster,true);assert.equal(readWeaponBattery(f.weapon()).charge,39);
 await f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'stun'});assert.equal(attackProfilePresentation(f.profile()).damageText,'HT-3 (3) aff');
 const off=f.state();off.weapons[0].omniBlasterRequest=false;await f.service.saveState(off);assert.equal(f.weapon().blasterMode,'normal');
});
test('Omni resistance preserves Actor-only HT contract and rejects actorless manual HT',async()=>{
 const f=await gaussFixture(id),state=f.state();state.weapons[0].omniBlasterRequest=true;await f.service.saveState(state);
 await f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'stun'});const effect=f.profile().damage.rules.resistanceEffect;
 await assert.rejects(()=>rollResistance({flags:{'olegurps-qol':{resistanceEffect:effect}}},{game:{user:{isGM:true}},canvas:{tokens:{controlled:[]}}}),/ровно один/);
});
test('Stun and Hotshot retain saved profile after subsequent instance reconfiguration',async()=>{
 const f=await gaussFixture(id),st=f.state();st.weapons[0].omniBlasterRequest=true;await f.service.saveState(st);
 await f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'stun',blasterHotshot:true});const r=await f.shoot(),saved=JSON.stringify(r.snapshot);
 assert.equal(r.snapshot.profile.damage.rules.resistanceEffect.modifier,-4);assert.equal(r.receipt.power.spent,2);
 await f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'normal',blasterHotshot:false,blasterEnvironment:'vacuum'});
 assert.equal(JSON.stringify(r.snapshot),saved);assert.equal(r.snapshot.profile.damage.formula,null);assert.equal(f.profile().damage.formula,'3d(5) burn sur');
});
