import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT_RULES,getCombatRule,resolveCombatTechnique } from '../scripts/tools/combat-technique-registry.js';
import { resolveMeleeCombatCalculation,prepareEffectiveMeleeDamage,freezeMeleeAttackProfile } from '../scripts/tools/melee-service.js';
import { getMeleeAttackSlots } from '../scripts/tools/melee-attack-slots.js';
import { BS_UNARMED,resolveUnarmedAttack } from '../scripts/tools/bs-unarmed.js';
import { orderedWhirlwindTargets } from '../scripts/tools/melee-strike-sequence.js';
import { meleeTechniqueChoices } from '../scripts/tools/melee-technique-controls.js';
import { runningBroadJump } from '../scripts/tools/melee-strike-techniques.js';

const power={committedAttack:true,committedMode:'strong'};
const out={allOutAttack:true,allOutAttackMode:'determined'};
const move={moveAndAttack:true};
const lying={strikeTargetPosture:'prone'};
const rows=[
 ['axeKick','Karate',-4,'1d+2 cr','C, 1',power],
 ['dropKick','Brawling',-1,'1d cr','2',move,{strikeMovement:2,strikeClosing:0}],
 ['earClap','Boxing',-3,'1d-2 cr','C'],
 ['elbowDrop','Brawling',-4,'1d+2 cr','C',power,lying],
 ['elbowStrike','Karate',-2,'1d cr','C',{}, {strikeRear:true}],
 ['exoticHandStrike','Karate',-1,'1d+1 cr','C'],
 ['eyePoke','Boxing',-9,'1d-4 cr','C'],
 ['eyeRake','Brawling',-5,'1d-2 cr','C'],
 ['headButt','Brawling',-1,'1d-2 cr','C'],
 ['jumpKick','Karate',-4,'1d+2 cr','C, 1, 2',power,{strikeTwoSteps:true}],
 ['kneeDrop','Brawling',-3,'1d+2 cr','C',power,lying],
 ['kneeStrike','Brawling',-1,'1d cr','C'],
 ['pushKick','Karate',-3,'1d+1 kb','C, 1'],
 ['returnStrike','Flail',-5,'1d+2 cr','1',{}, {strikeDistance:1,strikeWeaponConfirmed:true}],
 ['spinningPunch','Karate',-2,'1d cr','C',power,{strikeOpponentLevel:12}],
 ['spinningKick','Karate',-3,'1d+1 cr','C, 1',power,{strikeOpponentLevel:12}],
 ['spinningStrike','Broadsword',-2,'1d+2 cr','2',power,{strikeOpponentLevel:12,strikeWeaponConfirmed:true}],
 ['stampKick','Brawling',-3,'1d+1 cr','C',{}, lying],
 ['twoHandedPunch','Brawling',-2,'1d+1 cr','C'],
 ['uppercut','Brawling',-1,'1d cr','C'],
 ['eyePluck','Brawling',-10,'1d-3 cr','C'],
 ['lethalEyePoke','Karate',-11,'1d-1 pi','C'],
 ['flyingJumpKick','Karate',-7,'1d+3 cr','C, 1',move,{strikeMovement:2,strikeLeap:2}],
 ['flyingLunge','Broadsword',-4,'1d+2 imp','2',move,{strikeMovement:2,strikeLeap:2}],
 ['lethalKick','Karate',-4,'1d pi','C, 1',{}, {strikeFootwear:'bare'}],
 ['lethalStrike','Karate',-2,'1d-1 pi','C',{}, {strikeHandwear:'fingered'}],
 ['poleVaultKick','Karate',-4,'1d+4 cr','C, 1, 2',out,{strikeTwoSteps:true,strikePole:true}],
 ['springingAttack','Karate',-2,'1d+2 cr','C',{}, {strikeCrouchedTurn:true}],
 ['whirlwindAttack','Boxing',-5,'1d cr','C, 1',out,{strikeWhirlwind:true,strikeDirection:'cw'}]
];
const weaponIds=new Set(['returnStrike','spinningStrike','flyingLunge']);
const fixture=([id,name,defaultModifier,expected,reach,maneuver={},extra={}],relative=null)=>{
 const rule=getCombatRule(id),skill={name,level:14,baseLevel:14,learned:true,resolved:true,dx:12};
 const actor={id:'strike-unit',isOwner:true,system:{attributes:{DX:{value:12},ST:{value:12},SM:{value:0}},
  basicmove:{value:5},HP:{max:12},swing:'1d+2',thrust:'1d-1',skills:{main:{name,level:14,points:4},jump:{name:'Jumping',level:12,points:1}},
  ads:{master:{name:'Trained by a Master'}}}};
 if(relative!==null)actor.system.skills.tech={name:rule.name+' ('+name+')',type:'technique',points:4,relativelevel:String(relative)};
 const profile={id:'punch',...BS_UNARMED.punch};
 const attack=weaponIds.has(id)?{key:'weapon',name:'Weapon',level:14,damage:id==='flyingLunge'?'thr+1 imp':'sw cr',reach:'2',
  meleeProfile:{motion:id==='flyingLunge'?'thrust':'swing',skill,strength:{maximumST:null}}}:
  resolveUnarmedAttack(actor,{key:'punch',level:14,name:'Punch',damage:profile.damage,reach:'C',data:{},unarmedRef:{id:'punch',profile,native:false}},
    {skill:['Boxing','Karate','Brawling'].includes(name)?name:'DX'});
 const [source,damagetype]=attack.damage.split(' ');
 const [,derivedformula,formula]=/^(sw|thr)(.*)$/.exec(source);
 attack.damageAction={type:'deriveddamage',derivedformula,formula,damagetype,orig:attack.damage};
 const context={cinematicDefaults:true,posture:'standing',strikeTargetPosture:'standing',strikeLimbConfirmed:true,
  strikeTargetSM:0,targetLocationKeys:['torso'],...extra};
 return {actor,attack,governingSkill:weaponIds.has(id)?skill:attack.meleeProfile.skill,baseSkill:attack.level,context,
  ...maneuver,meleeTechniques:{ids:[id],context}};
};

test('Unusual Training admits learned Pole-Vault Kick only for the matching technique and its existing prerequisites',()=>{
 const f=fixture(rows.find(([id])=>id==='poleVaultKick'),-1);
 f.context.cinematicDefaults=false;
 f.actor.system.ads={unusual:{name:'Unusual Training (Pole-Vault Kick)'}};
 const admitted=resolveCombatTechnique('poleVaultKick',f);
 assert.equal(admitted.level,13);
 assert.equal(admitted.perks.some(perk=>perk.name==='Unusual Training'),true);
 delete f.actor.system.skills.jump;
 assert.equal(resolveCombatTechnique('poleVaultKick',f).available,false);
 f.actor.system.skills.jump={name:'Jumping',level:12,points:1};
 f.actor.system.ads.unusual.name='Unusual Training (Other cinematic technique)';
 assert.equal(resolveCombatTechnique('poleVaultKick',f).available,false);
});

for(const row of rows)test('MA-STRIKE '+row[0]+' default, specialization, caps and Damage',async()=>{
 const [id,name,penalty,formula,reach]=row;
 const {maximum,cinematic,strikeProfile}=getCombatRule(id);
 for(const relative of [null,penalty+1,maximum,maximum+5]){
  const f=fixture(row,relative),before=structuredClone(f.actor.system);
  const result=resolveCombatTechnique(id,f);
  assert.equal(result.available,true,result.reason);
  assert.equal(result.governingSkill,name);
  assert.equal(result.modifier,relative===null?penalty:Math.min(maximum,relative));
  if(relative!==null){
   f.actor.system.skills.tech.name=getCombatRule(id).name+' (Jitte/Sai)';
   assert.equal(resolveCombatTechnique(id,f).modifier,penalty);
   continue;
  }
  const calculation=resolveMeleeCombatCalculation(f),plan=calculation.metadata.meleeTechniques;
  assert.equal(plan.available,true,plan.errors.join(' '));
  if(strikeProfile.maneuver)assert.equal(calculation.effectiveSkill,14+penalty);
  const prepared=await prepareEffectiveMeleeDamage({...f,techniquePlan:plan,allOutStrong:true,committedStrong:true});
  const base=await prepareEffectiveMeleeDamage({...f,techniquePlan:plan});
  assert.equal(base.formula,formula,JSON.stringify(plan.primaryStrike));
  assert.equal(plan.reach,reach);
  if(strikeProfile.maneuver)assert.equal(prepared.formula,formula,'ordinary Strong bonuses replaced');
  const snapshot=freezeMeleeAttackProfile({actor:f.actor,attack:f.attack,preparedDamage:base});
  assert.equal(snapshot.damage.rules.meleeSnapshot.action.formula,base.action.formula);
  assert.deepEqual(f.actor.system,before);
  if(id!=='headButt'){
   delete f.actor.system.skills.main;
   assert.equal(resolveCombatTechnique(id,f).available,false);
  }
  const opposite=f.attack.unarmedRef?{...f.attack,unarmedRef:null}:{...f.attack,unarmedRef:{profile:BS_UNARMED.punch}};
  if(strikeProfile.part!=='underlying')assert.equal(resolveCombatTechnique(id,{...fixture(row),attack:opposite}).available,false);
  if(cinematic&&!strikeProfile.realisticDefault){
   const c=fixture(row);c.actor.system.ads={};
   assert.equal(resolveCombatTechnique(id,{...c,context:{...c.context,cinematicDefaults:false}}).available,false);
  }
 }
});

test('MA76 manual grip removes only the frontal groin penalty and sets defense once',()=>{
 const f=fixture(rows.find(row=>row[0]==='kneeStrike'));
 f.hitLocationBasePenalty=-3;f.context.targetLocationKeys=['groin'];
 const ordinary=resolveMeleeCombatCalculation(f);
 f.context.strikeGrapple='held';
 const held=resolveMeleeCombatCalculation(f);
 f.context.strikeGrapple='front';
 const front=resolveMeleeCombatCalculation(f);
 assert.equal(ordinary.effectiveSkill,10);
 assert.equal(held.effectiveSkill,10);
 assert.equal(front.effectiveSkill,13);
 assert.equal(held.metadata.defenseModifier,-2);
 assert.equal(front.metadata.defenseModifier,-2);
 assert.equal(front.metadata.meleeTechniques.strikes[0].grapple.retreat,false);
});

test('MA118 Uppercut uses the manually completed first attack and adds Strong damage only in the head',async()=>{
 const f=fixture(rows.find(row=>row[0]==='uppercut'));
 f.context.strikeGrapple='newHead';f.context.targetLocationKeys=['face'];f.attackSlot='aoa2';
 assert.equal(resolveMeleeCombatCalculation(f).metadata.meleeTechniques.available,false);
 f.allOutAttack=true;f.allOutAttackMode='double';
 assert.deepEqual(getMeleeAttackSlots({...f,manualGrappleFirstAttack:true}).map(slot=>slot.type),['aoa2']);
 const prepared=()=>prepareEffectiveMeleeDamage({...f,techniquePlan:resolveMeleeCombatCalculation(f).metadata.meleeTechniques});
 assert.equal((await prepared()).formula,'1d+2 cr');
 f.context.targetLocationKeys=['torso'];
 assert.equal((await prepared()).formula,'1d cr');
});

test('MA82, MA85 and MA115 gating, anatomy and independent Eye-Poke location',()=>{
 const eye=fixture(rows.find(row=>row[0]==='eyePoke'));
 eye.hitLocationBasePenalty=-9;
 assert.equal(resolveMeleeCombatCalculation(eye).effectiveSkill,5);
 eye.context.strikeTarget={hasEyes:false};
 assert.equal(resolveCombatTechnique('eyePoke',eye).available,false);
 const upper=fixture(rows.find(row=>row[0]==='uppercut'));
 upper.actor.system.ads.hor={name:'Horizontal'};
 assert.equal(resolveCombatTechnique('uppercut',upper).available,false);
 const lethal=fixture(rows.find(row=>row[0]==='lethalStrike'),0);
 lethal.context.cinematicDefaults=false;lethal.actor.system.ads={wm:{name:'Weapon Master (all weapons)'}};
 assert.equal(resolveCombatTechnique('lethalStrike',lethal).modifier,-2);
 lethal.actor.system.ads.tbm={name:'Trained by a Master'};
 assert.equal(resolveCombatTechnique('lethalStrike',lethal).modifier,0);
 const pole=fixture(rows.find(row=>row[0]==='poleVaultKick'));delete pole.actor.system.skills.jump;
 assert.equal(resolveCombatTechnique('poleVaultKick',pole).available,false);
 assert.equal(runningBroadJump(6,2),13/3);
 assert.equal(runningBroadJump(6,12),6);
});

test('All strike variants use the common picker, including an exact learned skill with a RU search title',()=>{
 const f=fixture(rows.find(row=>row[0]==='kneeStrike'),0);
 const choices=meleeTechniqueChoices(f);
 assert.equal(COMBAT_RULES.filter(r=>r.strikeProfile).length,rows.length);
 assert.equal(choices.all.find(s=>s.id==='kneeStrike').title,'Удар коленом');
 assert.equal(choices.learned.find(s=>s.id==='kneeStrike').name,'Knee Strike (Brawling)');
});

test('MA89 theater order retains distinct targets and rejects ambiguity',()=>{
 const actor={id:'a'},actors=[{id:'b',name:'Второй'},{id:'c',name:'Первый'}];
 const options={direction:'cw',confirmed:true,actor,actors};
 assert.deepEqual(orderedWhirlwindTargets({...options,theaterNames:'Первый; Второй'}).map(s=>s.actorId),['c','b']);
 assert.throws(()=>orderedWhirlwindTargets({...options,theaterNames:'Первый; Первый'}));
 assert.throws(()=>orderedWhirlwindTargets({...options,theaterNames:'Неизвестный'}));
});

test('MA70/76 Wrestling adds its ST bonus for Knee Drop; Sumo adds per-die slam damage',async()=>{
 const damage=options=>prepareEffectiveMeleeDamage({...options,techniquePlan:resolveMeleeCombatCalculation(options).metadata.meleeTechniques});
 const drop=rows.find(row=>row[0]==='dropKick');
 assert.equal((await damage(fixture([drop[0],'Wrestling',-2,...drop.slice(3)]))).formula,'1d-1 cr');
 assert.equal((await damage(fixture([drop[0],'Sumo Wrestling',-1,...drop.slice(3)]))).formula,'1d+1 cr');
 const knee=rows.find(row=>row[0]==='kneeDrop');
 assert.equal((await damage(fixture([knee[0],'Wrestling',-4,...knee.slice(3)]))).formula,'1d+3 cr');
});

test('MA99 existing posture compensation and the strike posture channel never both apply',()=>{
 const f=fixture(rows.find(row=>row[0]==='elbowDrop'));
 f.context.posture='kneeling';f.context.targetLocationKeys=['torso'];
 const calc=resolveMeleeCombatCalculation(f);
 assert.equal(calc.effectiveSkill,8);
 assert.equal(calc.channels.find(c=>c.id==='techniqueBodyPosture').resolvedValue,-2);
 f.meleeTechniques.ids.push('lowFighting');
 const combined=resolveMeleeCombatCalculation(f);
 assert.equal(combined.metadata.meleeTechniques.available,true);
 assert.equal(combined.channels.some(c=>c.id==='techniqueBodyPosture'),false);
 const stomp=fixture(rows.find(row=>row[0]==='stampKick'));
 stomp.context.posture='prone';
 assert.equal(resolveMeleeCombatCalculation(stomp).metadata.meleeTechniques.available,false);
});
