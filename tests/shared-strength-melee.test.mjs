import test from 'node:test';
import assert from 'node:assert/strict';
import {basicStrengthDamage} from '../scripts/tools/gurps-strength-damage.js';
import {readActorStrength,readStrengthAdvantages,resolveStrengthDamage,StrengthService} from '../scripts/tools/strength-service.js';
import {inferMeleeDamageModel,formatMeleeDamageModel,parseCompleteMeleeDamage} from '../scripts/tools/melee-damage-model.js';
import {prepareEffectiveMeleeDamage,executeNativeMeleeDamage,freezeMeleeAttackProfile} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {applyMeleeAttackOverride,normalizeMeleeAssistantState,setMeleeAttackOverride} from '../scripts/tools/melee-assistant-state.js';
import {validateMeleeAttackOverride} from '../scripts/tools/melee-attack-editor.js';

function actor(){const flags={};return {id:'one',uuid:'Actor.one',isOwner:true,system:{attributes:{ST:{import:10,value:10}},
  swing:'1d+2',thrust:'1d-1',ads:{a:{originalName:'Striking ST',level:2},b:{name:'Container',collapsed:{a:{originalName:'Lifting ST',level:3},b:{originalName:'Arm ST',level:2}}}}},
  getFlag:(s,k)=>flags[s+'.'+k],setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};}
const attack=(derived='sw',bonus='+3',type='cut')=>({name:'Sword',mode:derived,damage:derived+bonus+' '+type,
  sourceDamage:derived+bonus+' '+type,damageAction:{type:'deriveddamage',derivedformula:derived,formula:bonus,damagetype:type}});
const set=async(a,mods)=>new StrengthService(a).save(mods);

test('B16 exact rows, low and high ST remain exact',()=>{
  for(const [st,thr,sw]of [[1,'1d-6','1d-5'],[10,'1d-2','1d'],[13,'1d','2d-1'],[16,'1d+1','2d+2'],[40,'4d+1','7d-1'],[45,'5d','7d+1'],[100,'11d','13d'],[110,'12d','14d']]){
    assert.equal(basicStrengthDamage(st,'thrust'),thr);assert.equal(basicStrengthDamage(st,'swing'),sw);
  }
  for(const st of [0,-1,1.5,NaN])assert.equal(basicStrengthDamage(st,'swing'),null);
});
test('actual GGA .level, nested collapsed advantages, zero missing/empty and duplicate identity',()=>{
  const a=actor();a.system.ads.c={uuid:'same',originalName:'Striking ST',level:''};a.system.ads.d={uuid:'same',originalName:'Striking ST',level:99};
  assert.deepEqual(readStrengthAdvantages(a).levels,{striking:2,lifting:3,arm:2});
  a.system.ads={};const s=readActorStrength(a);for(const k of ['striking','lifting','arm'])assert.equal(s.kinds[k].current,0);
});
test('GCS damage already includes Striking ST; fresh table avoids double addition',async()=>{
  const a=actor(),before=structuredClone(a.system);
  assert.equal(resolveStrengthDamage(a,'swing').baseFormula,'1d+2');
  assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:attack()})).formula,'1d+5 cut');
  await set(a,{st:3});
  const p=await prepareEffectiveMeleeDamage({actor:a,attack:attack()});
  assert.equal(p.formula,'2d+4 cut');assert.equal(p.evidence.strength.effectiveST,15);assert.deepEqual(a.system,before);
});
test('Lifting is independent; Arm requires explicit per-attack choice; subtype and base mods combine',async()=>{
  const a=actor();await set(a,{st:3,lifting:40,arm:1,striking:0});
  assert.equal(resolveStrengthDamage(a,'swing').effectiveST,15);
  assert.equal(resolveStrengthDamage(a,'swing',{applyArmST:true}).effectiveST,18);
  assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:{...attack(),applyArmST:true}})).formula,'3d+3 cut');
  assert.equal(readActorStrength(a).kinds.lifting.effective,56);
});
test('equipped GGA Item ST bonuses linked to advantages are not counted twice',()=>{
  const a=actor();a.system.attributes.ST.value=12;a.system.ads.a.itemid='striking';
  a.items={contents:[{id:'striking',type:'feature',system:{bonuses:'ST+2'}}]};
  const old=globalThis.GURPS;delete globalThis.GURPS;
  try{assert.equal(readActorStrength(a).kinds.st.baseCurrent,10);assert.equal(resolveStrengthDamage(a,'swing').effectiveST,12);}
  finally{globalThis.GURPS=old;}
});
test('OWNER writes only module flags; blank is zero; revision rejects concurrent stale saves',async()=>{
  const a=actor(),other=actor(),system=JSON.stringify(a.system),s=new StrengthService(a);
  await s.save({st:'',striking:'2',lifting:null,arm:-1},{expectedRevision:0});
  assert.deepEqual(readActorStrength(a).modifiers,{st:0,striking:2,lifting:0,arm:-1});
  await assert.rejects(s.save({st:1},{expectedRevision:0}),/уже изменены/);
  await assert.rejects(s.save({st:1.5}),/целым/);
  await assert.rejects(s.save({unknown:2}),/целым/);
  a.isOwner=false;await assert.rejects(s.save({st:1}),/прав/);
  assert.equal(readActorStrength(other).modifiers.striking,0);assert.equal(JSON.stringify(a.system),system);
});
test('ambiguous imported damage remains unchanged at baseline and refuses guessed modified ST',async()=>{
  const a=actor();a.system.swing='9d';a.system.thrust='8d';
  assert.equal(resolveStrengthDamage(a,'swing').baseFormula,'9d');
  await set(a,{st:1});assert.equal(resolveStrengthDamage(a,'swing').ready,false);
  await assert.rejects(prepareEffectiveMeleeDamage({actor:a,attack:attack()}),/не согласуются/);
});
test('unused Lifting and Arm modifiers never alter or block ambiguous imported ordinary damage',async()=>{
  const a=actor();a.system.swing='9d';a.system.thrust='8d';
  await set(a,{lifting:5,arm:7});assert.equal(resolveStrengthDamage(a,'swing').baseFormula,'9d');
  assert.equal(resolveStrengthDamage(a,'swing',{applyArmST:true}).ready,false);
  delete a.system.ads.b.collapsed.b;await set(a,{lifting:5});
  assert.equal(resolveStrengthDamage(a,'swing',{applyArmST:true}).baseFormula,'9d');
});
test('Swing/Thrust signed weapon bonus, type, divisor and minimum round-trip; complex/numeric fixed stays intact',()=>{
  for(const raw of ['sw+3(2)! cut','thr-2 imp','sw cr dkb'])assert.equal(formatMeleeDamageModel(inferMeleeDamageModel(raw)),raw);
  for(const raw of ['2d+2 imp','sw+1 cut, 1d burn','3d×2(2) burn','sw+2 cut *Costs 1FP']){
    const m=inferMeleeDamageModel(raw);assert.equal(m.mode,'fixed');assert.equal(formatMeleeDamageModel(m),raw);
  }
  const v=validateMeleeAttackOverride({skillLevel:14,reach:'1',damageMode:'thrust',damageBonus:-2,damageType:'imp',damageDivisor:'2',applyArmST:'on'});
  assert.equal(v.value.damage,'thr-2(2) imp');assert.equal(v.value.applyArmST,true);
  assert.equal(validateMeleeAttackOverride({skillLevel:14,reach:'1',damageMode:'swing',damageBonus:1.5,damageType:'cut'}).valid,false);
});
test('legacy overrides load without migration; explicit Arm and structured mode survive serialization',()=>{
  const a={key:'uuid:sword',uuid:'sword',damage:'sw cut',data:{damage:'sw cut'}};
  const legacy={skillLevel:14,damage:'sw+1 cut',reach:'1',parry:'0'},state=normalizeMeleeAssistantState({});
  setMeleeAttackOverride(state,a,legacy);assert.equal(Object.hasOwn(applyMeleeAttackOverride(a,state),'damageModel'),false);
  setMeleeAttackOverride(state,a,{...legacy,applyArmST:true,damageModel:inferMeleeDamageModel(legacy.damage)});
  const result=applyMeleeAttackOverride(a,normalizeMeleeAssistantState(JSON.parse(JSON.stringify(state))));
  assert.equal(result.applyArmST,true);assert.equal(result.damageModel.bonus,1);assert.equal(a.data.damage,'sw cut');
});
test('martial damage and Dices&Adds follow the new numeric base once; fixed ignores ST',async()=>{
  const a=actor();await set(a,{st:3});
  for(const [options,expected]of [[{},'2d+4 cut'],[{dicePlusAdds:true},'3d cut'],[{allOutStrong:true,dicePlusAdds:true},'3d+2 cut'],[{committedStrong:true},'2d+5 cut'],[{defensiveAttack:true},'2d+2 cut']])
    assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:attack(),...options})).formula,expected);
  const fixed={damage:'2d+2 imp',damageAction:{type:'damage',formula:'2d+2',damagetype:'imp'}};
  assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:fixed})).formula,'2d+2 imp');
  assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:attack('thr','-1','imp')})).formula,'1d imp');
});
test('every derived component uses GGA parser, numeric damage and single-pass martial modifiers',async()=>{
  const old=globalThis.GURPS;
  const a=actor(),calls=[],p=x=>({action:x==='sw+3 cut'?attack().damageAction:x==='1d burn'?{type:'damage',formula:'1d',damagetype:'burn'}:x==='sw+3 cut, 1d burn'?attack().damageAction:null});
  const parsed=parseCompleteMeleeDamage('sw+3 cut, 1d burn',p);assert.equal(parsed.next.damagetype,'burn');
  globalThis.GURPS={parseForRollOrDamage:p,DamageChat:{create:async(...args)=>{calls.push(args);}}};
  try{
    const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:{damage:'sw+3 cut, 1d burn'},committedStrong:true});
    assert.equal(prepared.formula,'1d+6 cut, 1d+1 burn');
    await set(a,{st:10});await executeNativeMeleeDamage({actor:a,preparedDamage:prepared,committedStrong:true});
    assert.deepEqual(calls.map(c=>c[1]),['1d+6','1d+1']);
  }finally{globalThis.GURPS=old;}
});
test('frozen common snapshot stores numeric components, exact strength evidence and martial flags without advantage notes',async()=>{
  const a=actor();a.system.ads.a.notes='private-note';await set(a,{st:3});
  const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:attack(),dicePlusAdds:true});
  const profile=freezeMeleeAttackProfile({actor:a,attack:attack(),preparedDamage:prepared});
  const shot=createShotSnapshot(profile,{attackId:'attack',messageId:'message'}),before=JSON.stringify(shot);
  await set(a,{st:-2});prepared.action.formula='99d';
  assert.equal(shot.profile.damage.rules.meleeSnapshot.action.formula,'3d');
  assert.equal(shot.profile.damage.rules.meleeSnapshot.evidence.strength.effectiveST,15);
  assert.equal(shot.profile.damage.rules.meleeSnapshot.evidence.martial.dicePlusAdds,true);
  assert.equal(JSON.stringify(shot),before);assert.equal(before.includes('private-note'),false);assert.equal(shot.spent,0);
});

test('ST and structured damage UI stay Russian in ru and en without changing a language setting',async()=>{
  const priorFoundry=globalThis.foundry,priorGame=globalThis.game;
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
  const {StrengthEditorApp}=await import('../scripts/tools/strength-editor-app.js');
  const {openMeleeAttackEditor}=await import('../scripts/tools/melee-attack-editor.js');
  const outputs=[];
  try{
    for(const lang of ['ru','en']){
      globalThis.game={i18n:{lang},settings:{set(){throw Error('Language write forbidden');}}};
      const st=await StrengthEditorApp.prototype._renderHTML.call({actor:actor(),id:'st',saved:{revision:0},modifiers:{st:0,striking:0,lifting:0,arm:0}});
      let damage='';await openMeleeAttackEditor({DialogV2:{wait:async options=>{damage=options.content;return null;}},actor:actor(),attack:{...attack(),label:'Sword',level:14,reach:'1'},escapeHTML:String});
      assert.match(st,/Временная поправка/);assert.match(damage,/Применять Arm ST к этой атаке/);outputs.push({st,damage});
    }
    assert.deepEqual(outputs[0],outputs[1]);
  }finally{globalThis.foundry=priorFoundry;globalThis.game=priorGame;}
});
