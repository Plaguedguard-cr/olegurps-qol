import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFamilyTests} from './helpers/exotic-beam-tests.mjs';
import {fixture} from './helpers/exotic-beam-context.mjs';
import {configureExoticDamageApplication,updateExoticScreen,exoticDamageContract,installExoticBeamDamage} from '../scripts/tools/exotic-beam-damage.js';
import {shotDamageComponents} from '../scripts/tools/damage-shot-link.js';
sourceFamilyTests('ghost');
test('Ghost: separate frozen direct/collateral profiles, ×3 wounding after screen, ordinary collateral DR',async()=>{
 const f=await fixture('Ws-cZZZh97ol2rCjy'),shot=await f.shoot(),m=shot.message;m.visible=true;m.isContentVisible=true;
 assert.equal(shot.profile.damage.rules.internalExplosion,true);assert.equal(shot.profile.damage.rules.radiation,true);assert.equal(shot.profile.damage.rules.surge,true);
 const components=shotDamageComponents(m);assert.equal(components.length,1);assert.equal(components[0].role,'collateral');assert.equal(components[0].formula,'6dx10 burn ex');assert.equal(components[0].label,'Побочный взрыв');
 const make=()=>({actor:{isOwner:true},_calculator:{_calculators:[{}],effectiveVulnerabilityMultiple:1,pointsToApply:60,effectiveDR:90},submitDirectApply(){},resolveInjury(){}}),rt={game:{user:{isGM:false}}};
 const direct=make();configureExoticDamageApplication(direct,{family:'ghost',component:'kinetic'},rt);assert.equal(direct._calculator.effectiveDR,0);assert.equal(direct._calculator.totalWoundingModifier,3);assert.equal(direct._calculator.isExplosion,false);
 assert.equal(updateExoticScreen(direct,{screenDR:100,realityStabilized:false}),0);assert.equal(updateExoticScreen(direct,{screenDR:100,realityStabilized:true}),20);direct._calculator.isExplosion=true;assert.equal(direct._calculator.isExplosion,false);
 const collateral=make();configureExoticDamageApplication(collateral,{family:'ghost',component:'collateral'},rt);assert.equal(collateral._calculator.effectiveDR,90);assert.equal(collateral._calculator.isExplosion,true);assert.equal(collateral._calculator.totalWoundingModifier,undefined);
});
test('Special native Apply: provenance, mixed components, ownership and unrelated passthrough',async()=>{
 class Actor{isOwner=true;handleDamageDrop(d){return {ordinary:d};}}
 let created=0;const nativeIds=[];class Apply{constructor(actor,_data,options){created++;nativeIds.push(options.id);this.actor=actor;this._calculator={_calculators:[{}],pointsToApply:0};}resolveInjury(){}submitDirectApply(){}render(){}}
 const f=await fixture('Ws-cZZZh97ol2rCjy'),shot=await f.shoot(),p={damage:100,damageType:'burn',damageModifier:'ex',armorDivisor:-1,olegurpsExoticBeam:{version:1,sourceMessageId:shot.message.id,attackId:shot.snapshot.attackId,component:'kinetic'}};
 const rt={CONFIG:{Actor:{documentClass:Actor}},game:{user:{isGM:false},messages:{get:id=>id===shot.message.id?shot.message:null}},__olegurpsExoticDamageLoader:async()=>({default:Apply})},installation=installExoticBeamDamage(rt),actor=new Actor();
 assert.deepEqual(await actor.handleDamageDrop({damage:5}),{ordinary:{damage:5}});await actor.handleDamageDrop(p);await actor.handleDamageDrop(p);assert.equal(created,2);assert.equal(new Set(nativeIds).size,2);
 await assert.rejects(()=>actor.handleDamageDrop([p,{damage:1}]));actor.isOwner=false;await assert.rejects(()=>actor.handleDamageDrop(p));assert.equal(created,2);
 assert.throws(()=>exoticDamageContract({...p,armorDivisor:1000000},rt));assert.throws(()=>exoticDamageContract({...p,olegurpsExoticBeam:{...p.olegurpsExoticBeam,attackId:'wrong'}},rt));installation.uninstall();assert.deepEqual(actor.handleDamageDrop(p),{ordinary:p});
});
