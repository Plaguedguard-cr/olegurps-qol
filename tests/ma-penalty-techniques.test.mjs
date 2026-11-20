import test from 'node:test';
import assert from 'node:assert/strict';
import {getCombatRule,resolveMeleePenaltyTechnique,resolveMeleeTechniques} from '../scripts/tools/combat-technique-registry.js';
import {resolveMeleeCombatCalculation,prepareEffectiveMeleeDamage,freezeMeleeAttackProfile} from '../scripts/tools/melee-service.js';
import {resolveCombination,validateDualWeaponSequence,offHandAttackPenalty} from '../scripts/tools/melee-technique-sequences.js';
import {readMeleePosture,cinematicTraining} from '../scripts/tools/melee-penalty-techniques.js';
import {TargetingService,BODYPLAN_DEFINITIONS} from '../scripts/tools/targeting-service.js';
import {BS_UNARMED,resolveUnarmedAttack} from '../scripts/tools/bs-unarmed.js';
import {getMeleeAttackSlots} from '../scripts/tools/melee-attack-slots.js';
import {createMeleeTargetedAttackContext} from '../scripts/tools/targeted-attack-service.js';
import {addSequenceChannel} from '../scripts/tools/melee-technique-sequences.js';
import {sequenceUseCount,recordSequenceUse,nativeTechniqueCheck,assertMeleeTechniqueReady,advanceMeleeTechniqueTurn,acknowledgeTechniqueReady,resolvePressureContest,initialCarvingProgress} from '../scripts/tools/melee-technique-procedures.js';
import {allowsCinematicTechniqueDefaults,saveCinematicTechniqueDefaults} from '../scripts/tools/combat-technique-preference.js';
import {meleeTechniqueChoices} from '../scripts/tools/melee-technique-controls.js';
import {assertMeleeExecutionState} from '../scripts/tools/melee-execution-state.js';
const cases=[
 ['attackFromAbove','Broadsword',-2,{fromAbove:true}],
 ['backKick','Karate',-4,{behindKnown:true,legsFree:true},'kick'],
 ['backStrike','Broadsword',-2,{behindKnown:true,legsFree:true}],
 ['cavalryTraining','Broadsword',-2,{mounted:true,mountAttacked:true,ridingSkill:'Riding (Horse)'}],
 ['closeCombat','Broadsword',-4,{closeCombat:true}],
 ['groundFighting','Karate',-4,{posture:'prone'}],
 ['lowFighting','Karate',-2,{posture:'kneeling'}],
 ['fightingWhileSeated','Karate',-2,{posture:'seated',cinematicDefaults:true}],
 ['crack','Whip',-4,{ordinaryWhip:true}],
 ['hammerFist','Brawling',-1,{},'punch'],
 ['kicking','Karate',-2,{},'kick'],
 ['pressurePointStrike','Karate',-2,{pressureSkill:'Pressure Points'},'punch'],
 ['reverseGrip','Broadsword',-6,{reversibleWeapon:true,canThrust:true,weaponHands:1}],
 ['dualWeaponAttack','Broadsword',-4,{weaponHands:1}],
 ['initialCarving','Rapier',-4,{letter:'Z',stroke:2,strokeCount:3,carvingId:'test-Z',cinematicDefaults:true}]
];
function fixture([id,name,penalty,context,type],modifier=null,extra={}){
 const rule=getCombatRule(id),base={name,level:14,points:4,type:'skill'};
 const technique=modifier===null?{}:{t:{name:rule.name+' ('+name+')'+(id==='initialCarving'?' (Z)':''),level:14+modifier,points:5,type:'technique'}};
 const actor={id:'ma-actor',isOwner:true,system:{attributes:{DX:{value:12},ST:{value:12}},swing:'1d+2',thrust:'1d-1',skills:{base,...technique,
  riding:{name:'Riding (Horse)',level:12,points:4},pressure:{name:'Pressure Points',level:16,points:8}},ads:extra.cinematic?{a:{name:'Trained by a Master'}}:{}}};
 if(id==='pressurePointStrike')actor.system.ads={a:{name:'Trained by a Master'}};
 const attack={key:'weapon-a',name:'Test weapon',mode:'Thrust',level:14,damage:'thr+1 imp',sourceDamage:'thr+1 imp',reach:'1',
  meleeProfile:{motion:'thrust',skill:{...base,learned:true,resolved:true,source:'learned'},gripEffects:{},strength:{maximumST:null}}};
 if(type){attack.unarmedRef={native:false,id:type,profile:{id:type,...BS_UNARMED[type]}};attack.meleeProfile.attackType=type==='kick'?'kick':'unarmed';
  attack.meleeProfile.unarmed={alreadyIncluded:false,manualDamage:false,attackPenalty:type==='kick'?-2:0};attack.damage=BS_UNARMED[type].damage;attack.sourceDamage=attack.damage;attack.level=type==='kick'?12:14;}
 if(id==='initialCarving'){attack.damage='thr-1 cut';attack.sourceDamage=attack.damage;attack.mode='Tip Slash';}
 return {actor,attack,governingSkill:{...base,learned:true,resolved:true},context:{...context},rule,penalty};
}
for(const row of cases)test('MA-PENALTY-1 '+row[0]+' default / partial / maximum / wrong parent / restrictions',()=>{
 const [id,,penalty]=row;
 for(const [modifier,expected]of [[null,penalty],[penalty+1,Math.min(0,penalty+1)],[0,0],[10,0]]){
  const f=fixture(row,modifier,{cinematic:true});f.actor.system.ads={a:{name:'Trained by a Master'}};
  const before=structuredClone(f.actor.system),r=resolveMeleePenaltyTechnique(id,f);
  assert.equal(r.available,true,r.reason);assert.equal(r.modifier,id==='closeCombat'?Math.min(-2,expected):expected);
  assert.equal(r.level,14+r.modifier);assert.equal(r.defaultLevel,14+penalty);assert.deepEqual(f.actor.system,before);
 }
 const changed=fixture(row,penalty+1,{cinematic:true});changed.actor.system.skills.t.relativelevel=String(penalty+1);
 changed.actor.system.skills.base.level=changed.governingSkill.level=16;
 const moved=resolveMeleePenaltyTechnique(id,changed);assert.equal(moved.level,16+Math.min(id==='closeCombat'?-2:0,penalty+1),'relative technique follows changed base');
 const wrongWeapon=structuredClone(changed.attack);wrongWeapon.meleeProfile.skill={name:'Different physical skill',resolved:true};
 assert.equal(resolveMeleePenaltyTechnique(id,{...changed,attack:wrongWeapon}).available,false,'different physical governing skill cannot inherit this technique');
 const f=fixture(row,0,{cinematic:true});f.actor.system.ads={a:{name:'Trained by a Master'}};
 f.actor.system.skills.t.name=f.rule.name+' (Knife)';
 assert.equal(resolveMeleePenaltyTechnique(id,f).learned,false,'different specialty must fall back, not transfer');
 assert.equal(resolveMeleePenaltyTechnique(id,{...f,governingSkill:{name:'Not a combat skill',level:14}}).available,false);
 assert.equal(resolveMeleePenaltyTechnique(id,{...f,governingSkill:{...f.governingSkill,learned:false}}).available,false);
});

test('MA64 Ground Fighting plus Kicking uses one attack and two independent relative levels',()=>{
 const f=fixture(cases.find(c=>c[0]==='kicking'),-1),ground={name:'Ground Fighting (Karate)',level:12,points:3,type:'technique'};
 f.actor.system.skills.g=ground;
 const attack=resolveUnarmedAttack(f.actor,{name:'Kick',level:12,damage:'thr cr',data:{},unarmedRef:{native:false,id:'kick',profile:{id:'kick',...BS_UNARMED.kick}}},{skill:'Karate'});
 assert.equal(attack.level,13);assert.equal(attack.meleeProfile.unarmed.technique.learned,true);
 const calc=resolveMeleeCombatCalculation({actor:f.actor,attack,baseSkill:attack.level,governingSkill:attack.meleeProfile.skill,
  meleeTechniques:{ids:['groundFighting','kicking'],context:{posture:'prone'}}});
 assert.equal(calc.metadata.meleeTechniques.available,true,calc.metadata.meleeTechniques.errors.join(' '));
 assert.equal(calc.effectiveSkill,11);assert.equal(calc.channels.filter(c=>c.id==='techniqueStrike').length,1);
 assert.equal(resolveMeleeTechniques({...f,selection:{ids:['backKick','kicking'],context:{behindKnown:true,legsFree:true}}}).available,false);
});

test('MA69 longest Reach, C, swing Damage and Cavalry Riding/Combat Riding cap remain separate',async()=>{
 const f=fixture(cases.find(c=>c[0]==='closeCombat'),0);f.attack.reach='1-2*';f.attack.damage='sw+2 cut';f.attack.sourceDamage=f.attack.damage;f.attack.meleeProfile.motion='swing';f.attack.damageAction={type:'deriveddamage',derivedformula:'sw',formula:'+2',damagetype:'cut'};
 let plan=resolveMeleeTechniques({...f,selection:{ids:['closeCombat'],context:f.context}});
 assert.equal(plan.results[0].originalModifier,-8);assert.equal(plan.channels[0].value,-4);assert.equal(plan.damageFlat,-2);
 const damage=await prepareEffectiveMeleeDamage({actor:f.actor,attack:f.attack,techniquePlan:plan});assert.equal(damage.formula,'1d+2 cut');
 const profile=freezeMeleeAttackProfile({actor:f.actor,attack:f.attack,preparedDamage:damage});assert.equal(profile.damage.rules.meleeTechniques.damageFlat,-2);
 f.attack.reach='C,1';assert.equal(resolveMeleePenaltyTechnique('closeCombat',f).available,false);
 const c=fixture(cases.find(c=>c[0]==='cavalryTraining'),-1);c.context.fastMount=true;
 let r=resolveMeleePenaltyTechnique('cavalryTraining',c);assert.equal(r.originalModifier,-3);assert.equal(r.modifier,-1);assert.equal(r.damageFlat,1);assert.equal(r.cap,12);
 c.actor.system.skills.cr={name:'Combat Riding (Riding (Horse))',level:15,points:5,type:'technique'};
 r=resolveMeleePenaltyTechnique('cavalryTraining',c);assert.equal(r.cap,15);
});

test('DWA realistic default, cinematic improvement and off-hand are independent',()=>{
 const row=cases.find(c=>c[0]==='dualWeaponAttack'),f=fixture(row,0);
 assert.equal(resolveMeleePenaltyTechnique('dualWeaponAttack',f).modifier,-4);
 f.actor.system.ads={a:{name:'Trained by a Master'}};assert.equal(resolveMeleePenaltyTechnique('dualWeaponAttack',f).modifier,0);
 assert.equal(offHandAttackPenalty(f.actor,f.attack,f.governingSkill,'off'),-4);
 f.actor.system.ads.b={name:'Off-Hand Weapon Training (Broadsword)'};assert.equal(offHandAttackPenalty(f.actor,f.attack,f.governingSkill,'off'),0);
 const a={attack:{...f.attack,standaloneRef:{weaponId:'weapon-a'}},skill:f.governingSkill,hand:'main',hands:1,targetId:'a'},b={...a,attack:{...f.attack,key:'weapon-b',standaloneRef:{weaponId:'weapon-b'}},hand:'off',targetId:'b'};
 assert.equal(validateDualWeaponSequence({actor:f.actor,steps:[a,b]}).available,false);
 assert.equal(validateDualWeaponSequence({actor:f.actor,steps:[a,b],adjacent:true}).available,true);
 assert.equal(validateDualWeaponSequence({actor:f.actor,steps:[a,{...b,attack:a.attack}],adjacent:true}).available,false);
 assert.equal(validateDualWeaponSequence({actor:f.actor,steps:[a,b],adjacent:true,rapidStrike:true}).available,false);
 assert.deepEqual(getMeleeAttackSlots({techniqueSequence:'dualWeaponAttack',allOutAttack:true,allOutAttackMode:'double'}).map(s=>s.type),['aoa','dwaMain','dwaOff']);
});

test('MA80 fixed split Combination has point-based common improvement and does not invent a third Rapid Strike',()=>{
 const f=fixture(cases[0]),steps=[0,1,2].map(i=>({attack:{...f.attack,key:'w'+i,standaloneRef:{weaponId:'w'+i}},skill:f.governingSkill,attackName:i===1?'Thrust':'Swing',targetKey:i===1?'Vitals':'Face',effectiveSkill:i===1?12:11,hand:'main',hands:1}));
 let r=resolveCombination({actor:f.actor,steps:steps.slice(0,2)});assert.equal(r.available,true);assert.equal(r.defaultModifier,-6);assert.deepEqual(r.steps.map(s=>s.level),[5,6]);
 r=resolveCombination({actor:f.actor,steps});assert.equal(r.available,false);
 f.actor.system.skills.c={name:r.name,points:5,type:'technique'};r=resolveCombination({actor:f.actor,steps});assert.equal(r.available,true);assert.equal(r.modifier,-11);
 assert.equal(resolveCombination({actor:f.actor,steps,fixedName:'Combination (Other)'}).available,false);
 assert.equal(resolveCombination({actor:f.actor,steps,rapidStrike:true}).available,false);
 f.actor.system.ads={a:{name:'Trained by a Master'}};r=resolveCombination({actor:f.actor,steps});assert.equal(r.defaultModifier,-6);
 const alternate=steps.map((s,i)=>({...s,hand:i===1?'off':'main'}));r=resolveCombination({actor:f.actor,steps:alternate});assert.equal(r.defaultModifier,-5);
 assert.equal(resolveCombination({actor:f.actor,steps:[{...steps[0],grapple:true},steps[1]]}).available,false);
});

test('GGA known posture wins over manual state, but seated support can refine sit',()=>{
 const actor={system:{conditions:{posture:'prone'}}};assert.equal(readMeleePosture(actor,'standing').value,'prone');
 actor.system.conditions.posture='sit';assert.equal(readMeleePosture(actor,'seated').value,'seated');
});

test('MA68 TA explicitly distinguishes combat-skill and Kicking parents; original weapon route stays unchanged',()=>{
 const f=fixture(cases.find(c=>c[0]==='kicking'),-1),strike=resolveMeleePenaltyTechnique('kicking',f);
 f.actor.system.skills.ta={name:'TA (Karate Kicking/Face)',governingSkill:'Karate',level:11,points:5,type:'technique'};
 let ctx=createMeleeTargetedAttackContext({actor:f.actor,attack:f.attack});
 const specialty=ctx.specialtyOptions.find(s=>s.label==='Karate').value;
 let r=ctx.resolve({specialty,target:'face',basePenalty:-5,strikeTechnique:strike});
 assert.equal(r.strikeDefaultIncluded,true);assert.equal(r.effectivePenalty,-2);
 assert.equal(14+strike.modifier+r.effectivePenalty,11,'combat-parent TA includes original Kick penalty exactly once');
 f.actor.system.skills.ta={name:'TA (Kicking/Face)',governingSkill:'Kicking',level:11,points:5,type:'technique'};
 ctx=createMeleeTargetedAttackContext({actor:f.actor,attack:f.attack});r=ctx.resolve({specialty,target:'face',basePenalty:-5,strikeTechnique:strike});
 assert.equal(r.strikeDefaultIncluded,false);assert.equal(r.effectivePenalty,-2);
 assert.equal(14+strike.modifier+r.effectivePenalty,11);
});

test('GGA penalty provenance is mandatory, bounded, and ignored for clean profiles; caps survive sequence channels',()=>{
 const f=fixture(cases[0],0),options={...f,selection:{ids:['attackFromAbove'],context:{fromAbove:true}}};
 assert.equal(resolveMeleeTechniques(options).available,true);
 f.attack.meleeProfile.skill.source='gga-imported-total';
 assert.equal(resolveMeleeTechniques(options).available,false);
 options.selection.context.includedModifiers={attackFromAbove:-2};
 let p=resolveMeleeTechniques(options);assert.equal(p.available,true);assert.equal(p.channels[0].value,2);
 options.selection.context.includedModifiers.attackFromAbove=-3;assert.equal(resolveMeleeTechniques(options).available,false);
 f.attack.meleeProfile.skill.source='learned';p=resolveMeleeTechniques(options);assert.equal(p.available,true);assert.equal(p.channels[0].value,0);
 const c=resolveMeleeCombatCalculation({...f,baseSkill:20,moveAndAttack:true});
 const next=addSequenceChannel(c,'combination',-6,{});assert.equal(next.uncappedSkill,10);assert.equal(next.effectiveSkill,9);
 const carving=fixture(cases.find(c=>c[0]==='initialCarving'),-1,{cinematic:true});
 carving.actor.system.skills.t.name='Initial Carving (Rapier/Z)';assert.equal(resolveMeleePenaltyTechnique('initialCarving',carving).modifier,-1);
});

test('MA64 Art/Sport shares relative improvement; structured prerequisites retain exact parent and changed base',()=>{
 const f=fixture(cases[0],null);f.actor.system.skills.art={name:'Broadsword Art',level:18,points:8};
 f.actor.system.skills.t={name:'Attack from Above (Broadsword Art)',level:17,points:3,type:'technique'};
 assert.equal(resolveMeleePenaltyTechnique('attackFromAbove',f).level,13);
 f.governingSkill.level=16;assert.equal(resolveMeleePenaltyTechnique('attackFromAbove',f).level,15);
 f.actor.system.skills.t={name:'Attack from Above',defaults:[{name:'Broadsword'}],level:15,points:3,type:'technique'};
 assert.equal(resolveMeleePenaltyTechnique('attackFromAbove',f).modifier,-1);
 f.actor.system.skills.t.defaults=[{name:'Shortsword'}];assert.equal(resolveMeleePenaltyTechnique('attackFromAbove',f).learned,false);
});

test('Combination ordinal stays fixed for every step/target of one use, including parallel actor writes',async()=>{
 const actor=()=>({isOwner:true,data:null,getFlag(){return this.data},async setFlag(_s,_k,v){this.data=structuredClone(v)}}),a=actor(),b=actor();
 const sequence={kind:'combination',id:'one',name:'fixed',targetId:'target',encounter:'fight'};
 assert.equal(sequenceUseCount(a,sequence),0);
 await Promise.all([recordSequenceUse(a,sequence),recordSequenceUse(a,sequence),recordSequenceUse(b,sequence)]);
 assert.equal(sequenceUseCount(a,sequence),0,'second step retains first-use ordinal');
 const second={...sequence,id:'two'};assert.equal(sequenceUseCount(a,second),1);
 await recordSequenceUse(a,second);assert.equal(sequenceUseCount(a,second),1);
 assert.equal(sequenceUseCount(a,{...sequence,id:'three'}),2);
 assert.equal(sequenceUseCount(b,{...sequence,id:'three'}),1,'other Actor has its own uses');
});

test('Native procedure captures its exact roll and respects GGA critical-failure flag, including nonpositive targets',async()=>{
 const prior={GURPS:globalThis.GURPS,ChatMessage:globalThis.ChatMessage},actor={id:'native-owner',isOwner:true};
 try{
  globalThis.ChatMessage={async create(data){return {...data,id:data.rolls[0].formula,rolls:data.rolls}}};
  globalThis.GURPS={lastTargetedRoll:{rtotal:7,finaltarget:99},lastTargetedRolls:{},async performAction(action){
   await ChatMessage.create({speaker:{actor:actor.id},rolls:[{formula:'3d6[Other]',total:7}]});
   this.lastTargetedRolls[actor.id]={rtotal:10,finaltarget:-5,failure:true,isCritFailure:false};
   await ChatMessage.create({speaker:{actor:actor.id},rolls:[{formula:'3d6['+action.name+']',total:10}]});return false;
  }};
  const result=await nativeTechniqueCheck({actor,name:'Reverse Grip (Broadsword)',level:16});
  assert.equal(result.message.id,'3d6[Reverse Grip (Broadsword)]');assert.equal(result.finaltarget,-5);assert.equal(result.success,false);
  assert.equal(result.criticalFailure,false,'Do not invent a critical from margin when GGA says otherwise');
 }finally{globalThis.GURPS=prior.GURPS;globalThis.ChatMessage=prior.ChatMessage;}
});

test('MA64 weapon skill by a confirmed default permits technique default, never transfers learned improvement',()=>{
 const f=fixture(cases.find(c=>c[0]==='backStrike'),0);
 f.actor.system.skills.base={name:'Shortsword',level:16,points:8};
 f.governingSkill={name:'Broadsword',level:14,resolved:true,learned:false,source:'skill-default',sourceName:'Shortsword',rule:{from:'Shortsword',modifier:-2}};
 f.attack.meleeProfile.skill=f.governingSkill;
 const r=resolveMeleePenaltyTechnique('backStrike',f);assert.equal(r.available,true);assert.equal(r.learned,false);assert.equal(r.modifier,-2);
 const calc=resolveMeleeCombatCalculation({...f,baseSkill:14,meleeTechniques:{ids:['backStrike'],context:f.context}});
 assert.equal(calc.effectiveSkill,12);assert.equal(calc.channels.find(c=>c.id==='techniqueRear').resolvedValue,-2);
});

test('Sequence and off-hand penalties precede Deceptive Attack normalization and skill caps',()=>{
 for(const [base,extra,requested,expected,deceptive]of [[16,-6,-4,10,0],[20,-6,-8,10,-4],[16,-4,-4,10,-2]]){
  const calc=resolveMeleeCombatCalculation({baseSkill:base,deceptiveAttack:requested,sequenceModifier:{id:'combination',value:extra}});
  assert.equal(calc.effectiveSkill,expected);assert.equal(calc.metadata.deceptivePenalty,deceptive);
 }
});

test('Reverse Grip failure ends actor turn across weapons; advancing turn does not pick up a dropped weapon',async()=>{
 const flags={meleeTechniqueManualTurn:'1',meleeTechniqueReadiness:{'weapon%3Aa':{turnKey:'manual:1',dropped:true,turnEnded:true}}};
 const actor={isOwner:true,getFlag:(_s,k)=>flags[k],async setFlag(_s,k,v){flags[k]=v}};
 const first={standaloneRef:{weaponId:'a'}},other={standaloneRef:{weaponId:'b'}};
 assert.throws(()=>assertMeleeTechniqueReady(actor,other,'2'),/ход/);
 assert.throws(()=>assertMeleeExecutionState(actor,other),/ход/);
 await assert.rejects(()=>advanceMeleeTechniqueTurn(actor,'1'),/новый/);
 await advanceMeleeTechniqueTurn(actor,'2');assert.doesNotThrow(()=>assertMeleeExecutionState(actor,other));
 assert.throws(()=>assertMeleeExecutionState(actor,first),/выпущено/);
 await acknowledgeTechniqueReady(actor,first,'2');assert.doesNotThrow(()=>assertMeleeExecutionState(actor,first));
});

test('Crack cinematic whip-like exception obeys the personal default and retains physical weapon penalties',()=>{
 const f=fixture(cases.find(c=>c[0]==='crack'),-1);f.context={whipKind:'cinematic-like',cinematicDefaults:false};
 assert.equal(resolveMeleePenaltyTechnique('crack',f).available,false);
 f.context.cinematicDefaults=true;
 const r=resolveMeleePenaltyTechnique('crack',f);assert.equal(r.modifier,-1);assert.equal(r.damageFlat,2);
 f.attack.level=12;
 const calc=resolveMeleeCombatCalculation({...f,baseSkill:12,meleeTechniques:{ids:['crack'],context:f.context}});
 assert.equal(calc.effectiveSkill,11,'Existing physical penalty remains below base Whip 14');
 f.attack.meleeProfile.skill={name:'Broadsword',level:14,resolved:true};assert.equal(resolveMeleePenaltyTechnique('crack',f).available,false);
});

test('Cinematic defaults are enabled initially and follow only the current user',async()=>{
 const fakeUser=()=>({flags:{},getFlag(_scope,key){return this.flags[key];},async setFlag(_scope,key,value){this.flags[key]=value;}});
 const owner=fakeUser(),gm=fakeUser(),prior=globalThis.game;
 try{
  const f=fixture(cases.find(c=>c[0]==='fightingWhileSeated'));
  const selection={ids:['fightingWhileSeated'],context:{posture:'seated',cinematicDefaults:false}};
  const calculate=()=>resolveMeleeCombatCalculation({...f,baseSkill:f.attack.level,meleeTechniques:selection});
  globalThis.game={user:owner};
  assert.equal(calculate().metadata.meleeTechniques.available,true,'legacy per-attack false does not override User');
  await saveCinematicTechniqueDefaults(false,owner);
  assert.equal(allowsCinematicTechniqueDefaults(gm),true);
  assert.equal(calculate().metadata.meleeTechniques.available,false);
  globalThis.game={user:gm};
  assert.equal(calculate().metadata.meleeTechniques.available,true);
 }finally{globalThis.game=prior;}
});

test('Initial Carving matches typed Russian and English letters exactly and permits blank Default',()=>{
 const f=fixture(cases.find(c=>c[0]==='initialCarving'),-1,{cinematic:true});
 f.actor.system.skills.cyr={name:'Initial Carving (Rapier/З)',relativelevel:'-2',points:3,type:'technique'};
 f.actor.system.skills.other={name:'Initial Carving (Saber/Б)',relativelevel:'0',points:5,type:'technique'};
 for(const [letter,penalty,learned]of [['',-4,false],['a',-4,false],['z',-1,true],['з',-2,true]]){
  const result=resolveMeleePenaltyTechnique('initialCarving',{...f,context:{...f.context,letter}});
  assert.equal(result.modifier,penalty);assert.equal(result.learned,learned);
 }
 const choices=meleeTechniqueChoices(f).learned.filter(c=>c.id==='initialCarving');
 assert.deepEqual(choices.map(c=>c.letter),['Z','З']);
});

test('Initial Carving progress uses only successful or misaligned lines of the current inscription',()=>{
 const parts=[],actor={getFlag:()=>({draft:{parts},different:{parts:[{stroke:1,hit:true}]}})};
 const context={carvingId:'draft',strokeCount:3};
 assert.equal(initialCarvingProgress(actor,context).stroke,1);
 parts.push({stroke:1,hit:true,mark:false});
 assert.equal(initialCarvingProgress(actor,context).stroke,1);
 parts.push({stroke:1,hit:true,mark:null},{stroke:2,hit:false,misaligned:true,mark:null},{stroke:3,hit:false});
 assert.equal(initialCarvingProgress(actor,context).stroke,3);
 parts.push({stroke:3,hit:true,mark:null});
 assert.equal(initialCarvingProgress(actor,context).finished,true);
});

test('Weapon Master scope, off-hand specialization and defaults are never inferred from an unqualified perk',()=>{
 const f=fixture(cases[0]);f.actor.system.ads={wm:{name:'Weapon Master',points:20},off:{name:'Off-Hand Weapon Training',points:1}};
 assert.equal(cinematicTraining(f.actor,f.governingSkill,f.attack),false);
 assert.equal(cinematicTraining(f.actor,f.governingSkill,f.attack,{weaponMasterApplies:true}),true);
 assert.equal(cinematicTraining(f.actor,{name:'Karate',level:14,learned:true},{unarmedRef:{id:'punch'}},{weaponMasterApplies:true}),false);
 assert.equal(offHandAttackPenalty(f.actor,f.attack,f.governingSkill,'off'),-4);
 f.actor.system.ads.off.specialization='Broadsword';assert.equal(offHandAttackPenalty(f.actor,f.attack,f.governingSkill,'off'),0);
 f.actor.system.ads.wm.points=45;assert.equal(cinematicTraining(f.actor,f.governingSkill,f.attack),true);
 assert.equal(cinematicTraining(f.actor,{...f.governingSkill,learned:false},f.attack),false);
});

test('Mixed Weapon Master Combination has split defaults and a common improvement bounded by every underlying attack',()=>{
 const f=fixture(cases[0]);f.actor.system.skills.k={name:'Karate',level:14,points:4};f.actor.system.ads={wm:{name:'Weapon Master (Broadsword)',points:20}};
 const steps=[{attack:{...f.attack,standaloneRef:{weaponId:'blade'}},skill:f.governingSkill,attackName:'Swing',targetKey:'Torso',effectiveSkill:14,hand:'main',hands:1},
  {attack:{...f.attack,unarmedRef:{id:'punch',profile:{part:'hand'}}},skill:{name:'Karate',level:14,learned:true},attackName:'Punch',targetKey:'Torso',effectiveSkill:14,hand:'off',hands:1}];
 let r=resolveCombination({actor:f.actor,steps});assert.equal(r.available,true);assert.deepEqual(r.defaultModifiers,[-2,-4]);assert.deepEqual(r.steps.map(s=>s.level),[12,10]);
 f.actor.system.skills.combo={name:r.name,points:99,type:'technique'};r=resolveCombination({actor:f.actor,steps});assert.equal(r.improvement,2);assert.deepEqual(r.steps.map(s=>s.level),[14,12]);
});

test('Initial Carving Tip Slash preserves quality and changes only primary Damage; shared targeting admits Pressure Secrets precision',async()=>{
 const f=fixture(cases.find(c=>c[0]==='initialCarving'),-1,{cinematic:true});f.attack.damage=f.attack.sourceDamage='thr+1 imp';f.attack.damageAction={type:'deriveddamage',derivedformula:'thr',formula:'+1',damagetype:'imp'};
 f.attack.meleeProfile.quality={damageBonus:1,damageTypes:['imp','cut']};f.context.carvingTipSlash=true;f.context.tipSlashReach='2';
 const plan=resolveMeleeTechniques({...f,selection:{ids:['initialCarving'],context:f.context}});assert.equal(plan.available,true);assert.equal(plan.damageType,'cut');assert.equal(plan.damageFlat,-2);
 const damage=await prepareEffectiveMeleeDamage({actor:f.actor,attack:f.attack,techniquePlan:plan});assert.equal(damage.formula,'1d-1 cut');assert.equal(damage.action.overridetxt,'1d-1');
 f.actor.system.skills.cc={name:'Close Combat (Rapier)',level:10,relativelevel:'-4',points:5,type:'technique'};
 const combined=resolveMeleeTechniques({...f,selection:{ids:['initialCarving','closeCombat'],context:{...f.context,closeCombat:true}}});
 assert.equal(combined.available,true,combined.errors.join(' '));assert.equal(combined.damageFlat,-4,'Tip Slash is a swing and retains longest-Reach CC damage penalty');
 const combinedDamage=await prepareEffectiveMeleeDamage({actor:f.actor,attack:f.attack,techniquePlan:combined}),frozen=freezeMeleeAttackProfile({actor:f.actor,attack:f.attack,preparedDamage:combinedDamage});
 assert.equal(combinedDamage.formula,'1d-3 cut');assert.equal(frozen.effective.reach,'2');assert.equal(frozen.effective.motion,'swing');
 const definition=BODYPLAN_DEFINITIONS.humanoid,make=overrides=>new TargetingService({definition,table:definition.randomTable,tableSource:'test',attack:{data:{damage:'1d cr'},meleeTechniqueTargeting:overrides}});
 assert.equal(make({pressureSecrets:true}).getZone('vitals').available,true);assert.equal(make({damageType:'cut'}).getZone('vitals').available,false);
});

test('A different mode UUID does not make a second physical weapon; unready first mode blocks reuse in a later ready mode',()=>{
 const f=fixture(cases[0]),one={attack:{...f.attack,uuid:'mode1',name:'One Sword'},skill:f.governingSkill,hand:'main',hands:1,targetId:'foe'},two={...one,hand:'off',attack:{...f.attack,uuid:'mode2',name:'One Sword'}};
 assert.equal(validateDualWeaponSequence({actor:f.actor,steps:[one,two]}).available,false);
 const ready={...one,attackName:'Thrust',targetKey:'Torso',effectiveSkill:14},unready={...ready,attack:{...one.attack,meleeProfile:{...one.attack.meleeProfile,strength:{hands:2,ready:true}}}};
 assert.equal(resolveCombination({actor:f.actor,steps:[unready,ready]}).available,false);
});

test('Published physical hands govern Reverse Grip and DWA without changing caller context',()=>{
 const f=fixture(cases.find(c=>c[0]==='reverseGrip'));
 f.attack.meleeProfile.strength={hands:2,ready:false};f.context.weaponHands=1;
 const before=structuredClone(f.context);
 assert.equal(resolveMeleePenaltyTechnique('reverseGrip',f).defaultModifier,-4);
 assert.deepEqual(f.context,before);
 assert.equal(resolveMeleePenaltyTechnique('dualWeaponAttack',f).available,false);
});

test('Native OTF damage types restrict precision after Pressure Secrets is removed',()=>{
 const previous=globalThis.GURPS;
 globalThis.GURPS={parselink:text=>text.startsWith('[')?{}:{action:{type:'deriveddamage',damagetype:text.split(' ').at(-1)}}};
 try{const definition=BODYPLAN_DEFINITIONS.humanoid,make=attack=>new TargetingService({definition,table:definition.randomTable,tableSource:'test',attack});
  assert.equal(make({data:{damage:'thr-1 cr'},meleeTechniqueTargeting:{pressureSecrets:true}}).getZone('vitals').available,true);
  assert.equal(make({data:{damage:'thr-1 cr'}}).getZone('vitals').available,false);
  assert.equal(make({data:{damage:'thr+1 imp'}}).getZone('vitals').available,true);
  assert.equal(make({data:{damage:'sw cut'}}).getZone('vitals').available,false);
 }finally{globalThis.GURPS=previous;}
});

test('Pressure Points resistance needs attacker success and a winning margin; unowned HT messages are rejected',async()=>{
 const previous=globalThis.game,attacker={id:'attacker',isOwner:true},target={id:'target',testUserPermission:()=>true};
 let procedure,defenderMargin,permitted=true;
 target.testUserPermission=()=>permitted;
 const defense={id:'HT-message',author:{id:'owner',isGM:false},speaker:{actor:'target'},rolls:[{total:12}],getFlag:()=>({attackMessageId:'attack',actorId:'target',nativeGga:true,margin:defenderMargin})};
 const shot={actorId:'attacker',profile:{damage:{rules:{meleeTechniques:{selection:{context:{targetLocationKeys:['face']}}}}}}};
 const message={id:'attack',content:'native',getFlag:(_s,k)=>k==='shotSnapshot'?shot:procedure,async setFlag(_s,_k,v){procedure=v;},async update(){}};
 globalThis.game={actors:new Map([['attacker',attacker],['target',target]]),messages:[defense],user:{isGM:false}};
 try{
  for(const [success,margin,resistance,won]of [[false,-1,-5,false],[true,3,3,false],[true,4,3,true]]){
   procedure={kind:'pressurePoints',status:'awaiting-defender-HT',targetActorId:'target',attackerRoll:{success,margin}};defenderMargin=resistance;
   assert.equal((await resolvePressureContest(message)).won,won);
  }
  procedure={kind:'pressurePoints',status:'awaiting-defender-HT',targetActorId:'target',attackerRoll:{success:true,margin:4}};permitted=false;
  await assert.rejects(()=>resolvePressureContest(message),/владельца/);
 }finally{globalThis.game=previous;}
});
