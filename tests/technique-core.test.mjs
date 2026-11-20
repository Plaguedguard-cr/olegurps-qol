import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_RULES,getCombatRule,getCombatRules,resolveCombatTechnique,inspectCombatTechnique,
  createCombatTechniqueContext,combatGripAvailable,readCombatTechniqueSkills} from '../scripts/tools/combat-technique-registry.js';
import {RANGED_TECHNIQUES,getRangedTechniqueRows} from '../scripts/tools/ranged-techniques-registry.js';
import {resolveRangedRapidStrike} from '../scripts/tools/ranged-rapid-strike-service.js';
import {resolveCloseQuartersBattle} from '../scripts/tools/close-quarters-battle-service.js';
import {resolveCloseHipShooting,findCloseHipShooting} from '../scripts/tools/close-hip-shooting-service.js';
import {createTargetedAttackContext,createMeleeTargetedAttackContext} from '../scripts/tools/targeted-attack-service.js';
import {LT_IMPROVISED_PROFILES,resolveImprovisedTechnique} from '../scripts/lt-improvised-source.js';
import {techniqueCoreScenarios,captureTechniqueCore} from './fixtures/technique-core-scenarios.mjs';
const learnedIds=['rangedTargetedAttack','meleeTargetedAttack','quickShot','closeQuartersBattle','closeHipShooting','hammerFist','kicking'];
const profile=name=>Object.values(LT_IMPROVISED_PROFILES).find(p=>p.technique===name);
const options=row=>({...row,moveAndAttack:true,movePenalty:-5,physicalDistance:8,enabled:true,target:'face',basePenalty:-5});

test('TECH-CORE-1 single registry owns seven existing learned routes, categories and legacy panel identities',()=>{
 assert.equal(new Set(COMBAT_RULES.map(r=>r.id)).size,COMBAT_RULES.length);
 const added=['attackFromAbove','backKick','backStrike','cavalryTraining','closeCombat','combatRiding','groundFighting','lowFighting','fightingWhileSeated','crack','pressurePointStrike','reverseGrip','dualWeaponAttack','initialCarving','combination'];
 const strikes=['axeKick','dropKick','earClap','elbowDrop','elbowStrike','exoticHandStrike','eyePoke','eyeRake','headButt','jumpKick','kneeDrop','kneeStrike','pushKick','returnStrike','spinningPunch','spinningKick','spinningStrike','stampKick','twoHandedPunch','uppercut','eyePluck','lethalEyePoke','flyingJumpKick','flyingLunge','lethalKick','lethalStrike','poleVaultKick','springingAttack','whirlwindAttack'];
 assert.deepEqual(COMBAT_RULES.filter(r=>r.kind==='learned-technique').map(r=>r.id).sort(),[...learnedIds,...added,...strikes].toSorted());
 for(const id of learnedIds){const r=getCombatRule(id);for(const field of ['name','sources','baseSkills','specialization','levelPolicy','restrictions','interactions','snapshot','calculate','availability'])assert.ok(r[field],id+': '+field);assert.equal(r.type,'learned-technique');assert.equal(r.category,r.combatType);}
 for(const [id,kind] of [['rangedRapidStrike','combat-option'],['telegraphicAttack','combat-option'],['committedStrong','maneuver'],['weaponBond','perk'],['reversedGrip','grip'],['basicKick','attack-mode']])assert.equal(getCombatRule(id).kind,kind);
 assert.equal(getCombatRule('reverseGrip').operation,'CONTEXT');
 assert.deepEqual(RANGED_TECHNIQUES.map(r=>r.id),['rangedRapidStrike','closeHipShooting']);
 assert.ok(RANGED_TECHNIQUES.every(r=>getCombatRule(r.id)===r));
 assert.ok(getCombatRules('melee').every(r=>r.channel&&r.resolve));
});

for(const row of techniqueCoreScenarios())test('TECH-CORE-1 compatible dispatch, inputs untouched: '+row.variant,()=>{
 const before=structuredClone(row),o=options(row);
 for(const [id,legacy] of [['quickShot',resolveRangedRapidStrike],['closeQuartersBattle',resolveCloseQuartersBattle],['closeHipShooting',resolveCloseHipShooting]]){
  assert.deepEqual(resolveCombatTechnique(id,o),legacy(o));
  const evidence=inspectCombatTechnique(id,o);assert.equal(evidence.id,id);assert.equal(evidence.reason===null,evidence.available);
 }
 assert.deepEqual(findCloseHipShooting(o),getCombatRule('closeHipShooting').find(o));
 for(const [id,legacy,attack] of [['rangedTargetedAttack',createTargetedAttackContext,row.attack],['meleeTargetedAttack',createMeleeTargetedAttackContext,row.melee]]){
  const c={...o,attack},ctx=createCombatTechniqueContext(id,c),old=legacy(c),specialty=ctx.specialtyOptions.find(s=>s.label==='Brawling')?.value;
  assert.deepEqual(ctx.resolve({...c,specialty}),old.resolve({...c,specialty}));
 }
 for(const [id,name]of [['hammerFist','Hammer Fist'],['kicking','Kicking']]){
  const p=profile(name);assert.deepEqual(resolveCombatTechnique(id,{actor:row.actor,profile:p}),resolveImprovisedTechnique(row.actor,p));
 }
 assert.deepEqual(row,before);
});

test('TECH-CORE-1 golden pre-refactor results for learned, absent and changed-base cases',async()=>{
 const rows=await captureTechniqueCore(p=>import('../scripts/'+p));
 const summarize=o=>[o.rangedTargetedAttack?.effectivePenalty??null,o.meleeTargetedAttack?.effectivePenalty??null,
  o.quickShot.penalty,o.closeQuartersBattle?.effectivePenalty??null,o.closeHipShooting?.effectivePenalty??null,
  o.hammerFist.level,o.kicking.level,o.bsKick.level];
 assert.deepEqual(rows.map(r=>summarize(r.output)),[
  [-2,-2,-2,-1,-2,12,13,13], // MA-PENALTY-1: learned Kicking now applies to ordinary BS Kick.
  [null,null,-6,null,null,11,11,11],
  [null,null,-6,null,null,null,10,null],
  [null,-2,-6,null,null,11,11,11],
  [-2,null,-2,-1,-2,12,13,13],
  [-2,-2,-2,-1,-2,12,13,13],
  [-4,-4,-4,-3,-4,13,13,13]
 ]);
});

test('TECH-CORE-1 unarmed restrictions and learned/default distinction survive the common API',()=>{
 const {actor}=techniqueCoreScenarios()[0];
 assert.equal(resolveCombatTechnique('hammerFist',{actor,profile:{technique:'Hammer Fist',modeId:'invented'}}),null);
 assert.equal(resolveCombatTechnique('kicking',{actor,profile:profile('Hammer Fist')}),null);
 const available=inspectCombatTechnique('kicking',{actor,profile:profile('Kicking')});
 assert.equal(available.learned,true);assert.equal(available.learnedLevel,13);
 assert.equal(available.governingSkillLevel,13);assert.equal(available.defaultLevel,11);assert.equal(available.defaultModifier,-2);
 const missing=inspectCombatTechnique('hammerFist',{actor,profile:{modeId:'other'}});
 assert.equal(missing.reason,'unsupported-profile');
 const absent=inspectCombatTechnique('kicking',{actor:techniqueCoreScenarios()[1].actor,profile:profile('Kicking')});
 assert.equal(absent.learned,false);assert.equal(absent.available,true);
});

test('TECH-CORE-1 exact legacy grips and panel controls remain available without learned Reverse Grip',()=>{
 assert.equal(combatGripAvailable('reversed',['reversed']),true);
 assert.equal(combatGripAvailable('reversed',['defensive']),false);
 const row=techniqueCoreScenarios()[0];
 assert.deepEqual(getRangedTechniqueRows({...row,fireState:{rangedRapidStrike:true,closeHipShooting:true},rrsAvailable:true,rrsPenalty:-2}).map(r=>[r.id,r.available,r.active]),[['rangedRapidStrike',true,true],['closeHipShooting',true,true]]);
});

test('TECH-CORE-1 fresh repeated/concurrent resolution has no shared attack state',async()=>{
 const cases=techniqueCoreScenarios(),before=structuredClone(cases);
 const run=i=>inspectCombatTechnique('quickShot',options(cases[i%cases.length]));
 const expected=Array.from({length:14},(_,i)=>run(i));
 assert.deepEqual(await Promise.all(Array.from({length:14},async(_,i)=>run(i))),expected);
 assert.deepEqual(cases,before);
});

test('TECH-CORE-1 shared read-only traversal preserves nested skill records',()=>{
 const row={name:'Quick-Shot (Rifle)',level:12},actor={system:{skills:{folder:{name:'Folder',collapsed:{row}}}}};
 assert.ok(readCombatTechniqueSkills(actor).includes(row));
 assert.ok(readCombatTechniqueSkills(actor,{objectRows:true}).includes(row));
 assert.throws(()=>resolveCombatTechnique('not-implemented'),/Unknown combat rule/);
});
