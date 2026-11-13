import test from 'node:test';
import assert from 'node:assert/strict';
import {rangedModifierKind,nativeRangedModifierEvidence,externalRangedModifierEvidence} from '../scripts/tools/ranged-modifier-provenance.js';
import {sceneDistanceToYards,measureTokenDistanceYards,createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {blindFightingContextKey} from '../scripts/tools/blind-fighting-context.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';

test('F40 only explicit semantic evidence receives a credit, never an opaque number',()=>{
 assert.equal(rangedModifierKind('+1 Weapon Bond (Pistol) @self #ranged'),'weaponBond');
 for(const s of ['Weapon Bonded','Minimum ST','+1 other bonus',''])assert.equal(rangedModifierKind(s),null);
 const item={id:'perk',type:'feature',name:'Weapon Bond (Pistol)',system:{globalid:'same',bonuses:'R:"Pistol" +1'}};
 const actor={items:{contents:[item,{...item,id:'duplicate'}]}};
 const runtime={GURPS:{parselink:()=>({action:{type:'attack',isRanged:true,name:'Pistol',mod:'+1'}})}};
 assert.equal(nativeRangedModifierEvidence(actor,{name:'Pistol'},runtime).length,1);
 assert.deepEqual(nativeRangedModifierEvidence(actor,{name:'Other'},runtime),[]);
 assert.deepEqual(nativeRangedModifierEvidence(actor,{name:'Pistol',standaloneRef:{}},runtime),[]);
 assert.deepEqual(nativeRangedModifierEvidence({items:[]},{name:'Pistol',level:16,import:15},runtime),[]);
 assert.deepEqual(externalRangedModifierEvidence([{desc:'Weapon Bond',modint:1}],'bucket').map(e=>e.value),[1]);
});

test('F40 mirrors native GGA tag multiplicity and credits the known bond to the manual total',()=>{
 const before={game:globalThis.game,GURPS:globalThis.GURPS};
 const actor={system:{attributes:{ST:{value:12}}}},token={actor};
 globalThis.game={user:{targets:new Set()},settings:{get:()=>({autoAdd:true,allRolls:'all',allRangedRolls:'ranged'})}};
 globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}},EffectModifierControl:{_ui:{getToken:()=>token,getData:()=>({selfmodifiers:[{desc:'+1 Weapon Bond',tags:['all','ranged']}],targets:[]})}}};
 try{
  const service=new FireService({actor,token}),f=createFireControlContext({token,fireService:service}),bands=[{index:0,max:2,penalty:0}],values={rangeIndex:0,manualRangeSelected:true,shots:1},target={getSelection:()=>({penalty:0})};
  for(const [selected,expected]of [[true,16],[false,15]]){const d=f.calculateEffectiveFireSkillDetails({name:'Pistol',level:15,weaponBond:selected},values,bands,target);assert.equal(d.effectiveSkill,expected);assert.equal(d.combatCalculation.channels.find(c=>c.id==='ggaEffects').resolvedValue,2);assert.equal(d.modifierEvidence.length,2);}
 }finally{Object.assign(globalThis,before);}
});

test('F18 preserves Foundry scale and rejects missing distances or unknown units',()=>{
 const source={center:{x:0,y:0}},target={center:{x:100,y:0}},runtime={canvas:{scene:{grid:{units:'yd'}},grid:{measurePath:()=>({spaces:1,distance:5})}}};
 assert.equal(measureTokenDistanceYards(source,target,runtime),5);
 for(const value of [null,undefined,'',NaN,Infinity])assert.equal(sceneDistanceToYards(value,runtime),null);
 runtime.canvas.scene.grid.units='hex';assert.equal(measureTokenDistanceYards(source,target,runtime),null);
 runtime.canvas.scene.grid.units='yd';runtime.canvas.grid.measurePath=()=>({spaces:1});assert.equal(measureTokenDistanceYards(source,target,runtime),null);
});

test('F14/F15 bare HT165 metadata cannot prove a clean or known-included imported base',()=>{
 const raw={damage:'4d-1 pi+',range:'100/1000',st:'9'},p=resolveAmmunitionEffects({raw,variantId:'ht_plus_p',baseStatus:'compatible',constructionStatus:'compatible',facts:{weaponTL:5}});
 assert.equal(p.rules.requiredStrength.value,10);
 // These inputs are declared controls, not evidence of an actual character import.
 const before={game:globalThis.game,GURPS:globalThis.GURPS};
 globalThis.game={user:{targets:new Set()},settings:{get:()=>null}};globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
 try{for(const st of [9,10])for(const plusP of [false,true])for(const level of [15,14]){
  const actor={system:{attributes:{ST:{value:st}}}},token={actor},f=createFireControlContext({token,fireService:new FireService({actor,token})});
  const attack={name:'Declared control',level,...plusP?{ammunitionRequiredStrength:p.rules.requiredStrength}:{}};
  const d=f.calculateEffectiveFireSkillDetails(attack,{rangeIndex:0,manualRangeSelected:true,shots:1},[{index:0,max:2,penalty:0}],{getSelection:()=>({penalty:0})});
  // No catalog/instance binding or numerical provenance is supplied here.
  // The source-bound CLEAN/KNOWN_INCLUDED +P controls are in ranged-weapon-strength.test.mjs.
  assert.equal(d.effectiveSkill,level);assert.equal(d.combatCalculation.metadata.weaponStrength.provenanceStatus,'UNKNOWN');
  assert.equal(d.combatCalculation.metadata.weaponStrength.proposedDelta,null);assert.deepEqual(d.modifierEvidence,[]);
 }}finally{Object.assign(globalThis,before);}
});

globalThis.foundry={applications:{api:{ApplicationV2:class{}}},utils:{deepClone:structuredClone}};
const {MeleeAssistantApp}=await import('../scripts/tools/melee-assistant-app.js');
const {executeMeleeAttackSnapshot}=await import('../scripts/tools/melee-attack-execution-app.js');
const {FirePreparationApp}=await import('../scripts/tools/fire-preparation-app.js');
function blindApp(){const app=Object.create(MeleeAssistantApp.prototype);Object.assign(app,{actor:{id:'a'},token:{id:'t'},attack:{uuid:'exact',name:'Sword',mode:'Swing'},visibility:{mode:'unseen'},_activeAttackSlot:0,_attackSlots:[{type:'attack'},{type:'rs1'}]});return app;}
test('F75 keeps a result for its context and discards it permanently on target, mode, weapon, grip, or visibility change',()=>{
 const old=globalThis.game;globalThis.game={user:{targets:new Set([{id:'target'}])}};
 try{for(const mutate of [a=>a.attack.uuid='other',a=>a.attack.mode='Thrust',a=>a.attack.meleeProfile={grip:'defensive'},a=>a.visibility={mode:'blind'},()=>game.user.targets=new Set([{id:'other'}]),a=>a._activeAttackSlot=1]){
  game.user.targets=new Set([{id:'target'}]);const a=blindApp(),context=blindFightingContextKey(a);a._blindFighting={context,result:'success',used:false};assert.equal(a._getBlindFightingAttempt()?.result,'success');mutate(a);assert.equal(a._getBlindFightingAttempt(),null);assert.equal(a._blindFighting,null);
 }
 const a=blindApp();a._blindFighting={context:blindFightingContextKey(a),result:'success',used:true};assert.equal(a._getBlindFightingAttempt(),null);assert.equal(blindApp()._getBlindFightingAttempt(),null);
 }finally{globalThis.game=old;}
});

test('F75 queued attacks reject consumed or changed-context successes before any roll',async()=>{
 await assert.rejects(executeMeleeAttackSnapshot({blindFightingAttempt:{result:'success',used:true}}),/Blind Fighting/);
 await assert.rejects(executeMeleeAttackSnapshot({blindFightingAttempt:{result:'success',used:false},isBlindFightingCurrent:()=>false}),/Blind Fighting/);
});

test('F75 canceled or exceptional native execution releases the one-attack receipt',async()=>{
 const previous={GURPS:globalThis.GURPS,game:globalThis.game};globalThis.game={user:{targets:new Set()}};
 const attempt={result:'success',used:false},attack={name:'Control sword',level:15,damage:'1d cut',damageAction:{type:'damage',formula:'1d',damagetype:'cut'}};
 const slot={actor:{id:'a',system:{}},sourceAttack:attack,selectedAttack:attack,effectiveSkill:15,blindFightingAttempt:attempt,damageOptions:{attack},isBlindFightingCurrent:()=>true};
 try{
  globalThis.GURPS={SetLastActor(){},performAction:async()=>false};const canceled=await executeMeleeAttackSnapshot(slot);assert.equal(canceled.completed,false);assert.equal(attempt.used,false);
  GURPS.performAction=async()=>{throw Error('controlled execution failure');};await assert.rejects(executeMeleeAttackSnapshot(slot),/controlled execution failure/);assert.equal(attempt.used,false);
 }finally{Object.assign(globalThis,previous);}
});

test('F18 unavailable target conversion clears an old automatic range but preserves an explicit manual choice',()=>{
 const previous={game:globalThis.game,canvas:globalThis.canvas};globalThis.game={user:{targets:new Set([{center:{x:100,y:0}}])}};globalThis.canvas={scene:{grid:{units:'hex'}},grid:{measurePath:()=>({distance:5,spaces:1})}};
 try{const app=Object.create(FirePreparationApp.prototype);app.token={center:{x:0,y:0}};app.rangeBands=[{index:1,max:5,penalty:-2}];app.fireState={manualRangeSelected:false,selectedRangeIndex:1,height:'4',elevationDirection:'high'};app._syncTargetElevation();assert.equal(app.fireState.selectedRangeIndex,null);assert.equal(app.fireState.height,'');app.fireState={manualRangeSelected:true,selectedRangeIndex:1,height:'4',elevationDirection:'high'};app._syncTargetElevation();assert.equal(app.fireState.selectedRangeIndex,1);assert.equal(app.fireState.height,'4');}finally{Object.assign(globalThis,previous);}
});

test('F18/F20 keeps GGA target range compensation and excludes an already tagged Bucket entry',()=>{
 const previous={game:globalThis.game,GURPS:globalThis.GURPS};
 const actor={system:{}},token={actor},target={name:'Control target'},group={name:target.name,targetmodifiers:[{desc:'-1 Control target',tags:['ranged'],itemId:'combatmod'}]};
 globalThis.game={user:{targets:new Set([target])},settings:{get:()=>({autoAdd:true,allRangedRolls:'ranged'})}};
 globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[{modint:-1,desc:'Control target',tagged:true},{modint:-3,desc:'Independent',tagged:false}]}},EffectModifierControl:{_ui:{targets:[group],getToken:()=>token,getData:()=>({selfmodifiers:[],targets:[group]})}}};
 try{const f=createFireControlContext({token,fireService:new FireService({actor,token})}),bands=[{index:0,max:2,penalty:0},{index:1,max:3,penalty:-1},{index:2,max:5,penalty:-2}];for(const [rangeIndex,expected]of [[0,12],[1,11],[2,10]]){const d=f.calculateEffectiveFireSkillDetails({name:'Control',level:15},{rangeIndex,manualRangeSelected:true,shots:1},bands,{getSelection:()=>({penalty:0})});assert.equal(d.effectiveSkill,expected);assert.equal(d.combatCalculation.channels.find(c=>c.id==='modifierBucket').resolvedValue,-3);}}finally{Object.assign(globalThis,previous);}
});
