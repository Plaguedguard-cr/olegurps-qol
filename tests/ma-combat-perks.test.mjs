import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptedTechniqueDefault, armorFamiliarity, drunkenFighting, drunkenPreviewCredit, drunkenTaggedCredit,
  strongbowBonus, techniqueMastery, weaponAdaptations, weaponPenaltyPerk
} from '../scripts/tools/ma-combat-perks.js';
import { resolveMeleeCombatCalculation } from '../scripts/tools/melee-service.js';
import { evaluateMeleeSpecial } from '../scripts/tools/melee-special-techniques.js';
import { MA_SPECIAL_RULES } from '../scripts/tools/melee-special-data.js';
import { evaluateMeleePenalty } from '../scripts/tools/melee-penalty-techniques.js';
import { offHandAttackPenalty } from '../scripts/tools/melee-technique-sequences.js';
import { collectUnarmedAttacks, resolveUnarmedAttack, BS_UNARMED, unarmedSkills } from '../scripts/tools/bs-unarmed.js';
import { getCombatRule } from '../scripts/tools/combat-technique-registry.js';
import { ltBowDrawing, resolveLTBowBase } from '../scripts/tools/lt-bow.js';
import { LT_BOW_PROFILES } from '../scripts/lt-bow-source.js';
import { LT_IMPROVISED_PROFILES, resolveImprovisedTechnique } from '../scripts/lt-improvised-source.js';
import { meleeSource } from '../scripts/melee-source-data.js';
import { resolveStandaloneSkill } from '../scripts/tools/standalone-skill-service.js';
import { canChooseRangedHand } from '../scripts/tools/ranged-weapon-strength.js';

const rows = items => Object.fromEntries(items.map((item, i) => [String(i).padStart(5, '0'), item]));
const skills = [
  ['Bow',14], ['Karate',14], ['Brawling',13], ['Broadsword',16], ['Shortsword',13],
  ['Smallsword',15], ['Staff',15], ['Acrobatics',15], ['Counterattack (Broadsword)',21,'technique'],
  ['Dual-Weapon Attack (Broadsword)',16,'technique'], ['Feint (Acrobatics)',17,'technique']
];
const actor = (...traits) => ({
  id:'qa', system:{
    attributes:{ DX:{value:12}, ST:{value:12,import:12} },
    encumbrance:{ a:{level:2,current:true} },
    skills:rows(skills.map(([name,level,type])=>({name,level,points:4,type}))),
    ads:rows(traits.map(trait=>typeof trait==='string'?{name:trait,points:1}:trait))
  }
});
const sword = {name:'Broadsword',mode:'Swing',damage:'sw cut',parry:'11'};
const broadsword = {name:'Broadsword',level:16,learned:true,resolved:true};
const skill = (a, profile, name, penalty=profile.attackModifier) => resolveStandaloneSkill({
  actor:a, record:{id:'qa'}, mode:{modeId:profile.modeId,overrides:{governingSkill:name},
    snapshot:{governing_skill:{status:'resolved',skill:{name},attack_modifier:penalty}}}
});

test('Strongbow uses learned Bow relative DX and never changes Rated ST, Damage, range or crossbow draw ST', () => {
  const bow=Object.values(LT_BOW_PROFILES).find(p=>p.kind==='bow');
  const crossbow=Object.values(LT_BOW_PROFILES).find(p=>p.kind==='steel');
  const configuration={ratedST:12,drawMethod:'hand'};
  const untrained=resolveLTBowBase({modeId:bow.modeId,configuration,actor:actor()});
  const owner=actor('Strongbow');
  const trained=resolveLTBowBase({modeId:bow.modeId,configuration,actor:owner});
  assert.equal(trained.drawing.strength,untrained.drawing.strength+2);
  for(const field of ['ratedST','dice','range'])assert.deepEqual(trained[field],untrained[field]);
  assert.equal(ltBowDrawing(owner,crossbow.modeId,configuration).strength,ltBowDrawing(actor(),crossbow.modeId,configuration).strength);
  owner.system.skills['00000'].relativelevel='DX+1';
  assert.equal(strongbowBonus(owner),1);
  owner.system.skills['00000'].points=0;
  assert.equal(strongbowBonus(owner),0);
});

test('Strongbow hand-draw evidence stays independent of the Rated ST profile', () => {
  const bow=Object.values(LT_BOW_PROFILES).find(p=>p.kind==='bow'&&p.minRatedST<=12);
  for(const rank of [0,1,2]){
    const a=rank?actor('Strongbow'):actor();
    a.system.skills['00000'].relativelevel='DX+'+rank;
    for(const ratedST of [12,13,14,15]){
      const input={modeId:bow.modeId,configuration:{ratedST,drawMethod:'hand'}};
      const projected=resolveLTBowBase({...input,actor:a});
      const published=resolveLTBowBase(input);
      const deficit=Math.max(0,ratedST-12-rank);
      assert.equal(projected.drawing.strength,12+rank);
      assert.equal(projected.drawing.drawDeficit,deficit);
      assert.equal(projected.drawing.assessment,deficit?'over-strength':'full-draw');
      assert.deepEqual([projected.dice,projected.range,projected.ratedST],[published.dice,published.range,ratedST]);
    }
  }
});

test('Drunken Fighting credits only matching native GGA status penalties with enabled tags', () => {
  const owner=actor('Drunken Fighting','Trained by a Master');
  owner.statuses=new Set(['drunk']);
  owner.system.conditions={self:{modifiers:[
    'GURPS.modifierAfflictionDrunk #drunk #dx #iq @combatmod',
    'GURPS.modifierAfflictionDrunkCR #drunk #control @combatmod'
  ]}};
  const perk=drunkenFighting(owner);
  assert.equal(perk.modifier,2);
  const tagged=autoAdd=>({settings:{get:()=>({autoAdd,allMeleeRolls:'dx'})}});
  assert.equal(drunkenTaggedCredit(owner,sword,perk,'melee',tagged(true)),2);
  assert.equal(drunkenTaggedCredit(owner,sword,perk,'melee',tagged(false)),0);
  const i18n={localize:key=>key.endsWith('DrunkCR')?'-4 checks':'-2 DX/IQ'};
  assert.equal(drunkenPreviewCredit(perk,[{itemId:'combatmod',desc:'-2 DX/IQ',modint:-2,tags:['drunk']}],i18n),2);
  assert.equal(drunkenPreviewCredit(perk,[{itemId:'custom',desc:'-2 DX/IQ',modint:-2,tags:['drunk']}],i18n),0);
  owner.statuses.clear();
  assert.equal(drunkenFighting(owner),null);
  assert.equal(drunkenFighting({...actor('Drunken Fighting'),statuses:new Set(['drunk'])}),null);
});

test('Armor Familiarity caps the reduction and Biting Mastery selects Karate without changing damage type', () => {
  const armor={name:'Armor Familiarity (Karate) 2',originalName:'Armor Familiarity (Karate)',levels:2};
  const owner=actor('Biting Mastery',armor);
  assert.equal(armorFamiliarity(owner,'Karate',1),1);
  assert.equal(armorFamiliarity(owner,'Karate',3),2);
  assert.equal(armorFamiliarity(owner,'Judo',3),0);
  assert.deepEqual(unarmedSkills(actor(),BS_UNARMED.bite).map(s=>s.name),['DX','Brawling']);
  for(const [id,type,trait] of [['bite','cr'],['sharp-teeth','cut','Sharp Teeth'],['fangs','imp','Fangs'],['sharp-beak','pi+','Sharp Beak']]){
    const fixture=trait?actor('Biting Mastery',armor,trait):owner;
    const source=collectUnarmedAttacks(fixture,[],{includeAvailable:true}).find(a=>a.unarmedRef.id===id);
    const attack=resolveUnarmedAttack(fixture,source,{skill:'Karate'});
    assert.equal(attack.level,14);
    assert.equal(attack.meleeProfile.unarmed.bonusPerDie,2);
    assert.equal(attack.damage.split(' ').at(-1),type);
  }
});

test('Exotic Weapon Training applies the exact model penalty for Shield or Staff', () => {
  const shield=meleeSource('wLTM25Edgewbr_iBGO9QK06x2dG');
  const owner=actor('Exotic Weapon Training (Dueling Long Shield)');
  assert.equal(skill(actor(),shield,'Staff',-4).level,11);
  assert.equal(skill(owner,shield,'Staff',-4).level,15);
  assert.equal(weaponPenaltyPerk(owner,shield,'Shield',-2).modifier,2);
  assert.equal(weaponPenaltyPerk(owner,shield,'Shield',-3),null);
  assert.equal(weaponPenaltyPerk(owner,meleeSource('wmiyMIKahFDNHoCMT'),'Spear',-2),null);
});

test('Improvised Weapons removes the published object penalty from both ordinary and technique routes', () => {
  const abacus=Object.values(LT_IMPROVISED_PROFILES).find(p=>p.name==='Abacus');
  const stick=Object.values(LT_IMPROVISED_PROFILES).find(p=>p.name==='Chopstick'&&p.technique==='Hammer Fist');
  assert.equal(skill(actor(),abacus,'Brawling').level,11);
  assert.equal(skill(actor('Improvised Weapons (Brawling)'),abacus,'Brawling').level,13);
  assert.equal(skill(actor('Improvised Weapons (Karate)'),abacus,'Brawling').level,11);
  const result=resolveImprovisedTechnique(actor('Improvised Weapons (Karate)'),stick);
  assert.equal(result.baseSkill,'Karate');
  assert.equal(result.defaultPenalty,-1);
  assert.equal(result.directWeaponPenalty,0);
  assert.equal(result.level,13);
});

test('Off-Hand Weapon Training uses the governing skill and never the weapon name', () => {
  const owner=actor('Off-Hand Weapon Training (Broadsword)','Off-Hand Weapon Training (Guns (Pistol))');
  assert.equal(offHandAttackPenalty(owner,sword,broadsword,'off'),0);
  assert.equal(offHandAttackPenalty(owner,sword,{name:'Shortsword'},'off'),-4);
  assert.equal(offHandAttackPenalty(owner,sword,{name:'Guns/TL9 (Pistol)'},'off'),0);
  assert.equal(offHandAttackPenalty(owner,sword,{name:'Guns/TL9 (Rifle)'},'off'),-4);
  assert.equal(offHandAttackPenalty(actor('Ambidexterity'),sword,broadsword,'off'),0);
  const attack={...sword,standaloneRef:{governingSkill:{source:'learned'}},meleeProfile:{strength:{hands:1}}};
  const options={attack,governingSkill:broadsword,baseSkill:16,meleeTechniques:{ids:[],context:{hand:'off',weaponHands:1}}};
  assert.equal(resolveMeleeCombatCalculation({...options,actor:actor()}).effectiveSkill,12);
  assert.equal(resolveMeleeCombatCalculation({...options,actor:owner}).effectiveSkill,16);
});

test('Skill Adaptation takes the easiest listed default and Feint uses the exact Acrobatics improvement', () => {
  const owner=actor('Skill Adaptation (Drop Kick defaults to Karate)','Acrobatic Feints');
  const rule=getCombatRule('dropKick');
  assert.equal(adaptedTechniqueDefault(owner,rule,'Karate',{Brawling:-1,Wrestling:-2}).defaultModifier,-1);
  assert.equal(adaptedTechniqueDefault(owner,rule,'Acrobatics',{Brawling:-1,Wrestling:-2}),null);
  const feint=MA_SPECIAL_RULES.find(r=>r.id==='feint');
  const result=evaluateMeleeSpecial(feint,{actor:owner,attack:sword,governingSkill:broadsword,context:{specialSkills:{feint:'Acrobatics'}}});
  assert.equal(result.level,17);
  assert.equal(result.governingSkill,'Acrobatics');
  const kicker=actor('Acrobatic Kicks');
  const kick=collectUnarmedAttacks(kicker,[],{includeAvailable:true}).find(a=>a.unarmedRef.id==='kick');
  const adapted=resolveUnarmedAttack(kicker,kick,{skill:'Acrobatics'});
  assert.equal(adapted.level,13);
  assert.equal(adapted.meleeProfile.unarmed.bonusPerDie,0);
});

test('Technique Mastery changes the cap without granting levels and excludes negative and defense maxima', () => {
  const owner=actor('Technique Mastery (Counterattack (Broadsword))','Technique Mastery (Disarming (Broadsword))');
  const rule=MA_SPECIAL_RULES.find(r=>r.id==='counterattack');
  const options={attack:sword,governingSkill:broadsword,context:{specialConfirmed:{Counterattack:true}}};
  assert.equal(evaluateMeleeSpecial(rule,{...options,actor:owner}).level,20);
  assert.equal(evaluateMeleeSpecial(rule,{...options,actor:actor()}).level,16);
  assert.equal(techniqueMastery(owner,rule,{name:'Shortsword'},0),null);
  assert.equal(techniqueMastery(owner,rule,broadsword,-1),null);
  assert.equal(techniqueMastery(owner,rule,broadsword,0,null,'Parry'),null);
  assert.equal(techniqueMastery(owner,MA_SPECIAL_RULES.find(r=>r.id==='disarming'),broadsword,5).maximum,7);
  owner.system.skills['00008'].points=0;
  assert.equal(evaluateMeleeSpecial(rule,{...options,actor:owner}).level,11);
});

test('Unusual Training only unlocks learned DWA improvement against one confirmed target', () => {
  const rule=getCombatRule('dualWeaponAttack');
  const owner=actor('Unusual Training (Dual-Weapon Attack, Both attacks must target the same foe)');
  const result=sameDualWeaponTarget=>evaluateMeleePenalty(rule,{actor:owner,attack:sword,governingSkill:broadsword,
    context:{weaponHands:1,sameDualWeaponTarget,cinematicDefaults:false}});
  assert.equal(result(true).modifier,0);
  assert.equal(result(false).modifier,-4);
  owner.system.skills['00009'].points=0;
  assert.equal(result(true).modifier,-4);
});

test('One-handed Weapon Adaptation requires the exact directed pair and matching hands', () => {
  const owner=actor('Weapon Adaptation (Shortsword to Smallsword)');
  const source={name:'Shortsword',modelId:'lt:shortsword',primarySkills:['Shortsword'],stats:{st:'8'},hands:1};
  assert.equal(weaponAdaptations(owner,source)[0].skill,'Smallsword');
  assert.deepEqual(weaponAdaptations(owner,{...source,hands:2}),[]);
  assert.deepEqual(weaponAdaptations(actor('Weapon Adaptation (Smallsword to Shortsword)'),source),[]);
  assert.deepEqual(weaponAdaptations(actor('Weapon Adaptation (Shortsword to Staff)'),source),[]);
});

test('Weapon Adaptation allows a sourced two-handed Spear to Staff pair and rejects the one-handed grip', () => {
  const a=actor('Weapon Adaptation (Spear to Staff)');
  const spear=meleeSource('wCpgORe2Si2QGIVZF');
  const one=meleeSource('wxMjDbyVMoR20JSB5');
  assert.equal(weaponAdaptations(a,spear)[0].hands,2);
  assert.deepEqual(weaponAdaptations(a,one),[]);
  const request={actor:a,record:{id:'qa'},mode:{modeId:spear.modeId,overrides:{governingSkill:'Staff'},
    snapshot:{governing_skill:{status:'resolved',skill:{name:'Spear'},attack_modifier:0}}}};
  assert.equal(resolveStandaloneSkill({...request,hands:2}).level,15);
  assert.equal(resolveStandaloneSkill({...request,hands:1}).resolved,false);
});

test('Fire hand choice requires a proven pistol family, a clean skill and no confirmed two-handed grip', () => {
  const a=actor();
  const attack={standaloneRef:{combatType:'ranged',weaponId:'pistol'}};
  const profile={binding:{confirmed:{modeId:'pistol'}},weaponStrength:{support:{}}};
  const skill={name:'Guns/TL5 (Pistol)',level:14};
  const mode={weapon_family:'firearm',governing_skill:{skill:{name:'Guns',specialization:'Pistol'}},stats:{strength:'9'}};
  const catalog={getMode:()=>mode};
  assert.equal(canChooseRangedHand(a,attack,profile,skill,catalog),true);
  assert.equal(canChooseRangedHand(a,{},profile,skill,catalog),false);
  assert.equal(canChooseRangedHand(a,attack,{...profile,raw:{st:'9†'}},skill,catalog),false);
  assert.equal(canChooseRangedHand(a,attack,{...profile,weaponStrength:{support:{confirmedType:'pistol-two-handed'}}},skill,catalog),false);
  assert.equal(canChooseRangedHand(a,attack,profile,skill,{getMode:()=>({...mode,governing_skill:{skill:{name:'Guns',specialization:'Rifle'}}})}),false);
});

test('Armor Familiarity affects calculated Judo Parry and preserves an explicit imported Parry', () => {
  const a=actor('Armor Familiarity (Judo)');
  a.system.skills.judo={name:'Judo',level:14,points:4};
  const trip=MA_SPECIAL_RULES.find(r=>r.id==='trip');
  const attack={name:'Punch',unarmedRef:{id:'punch'},parry:'8'};
  const ask={actor:a,attack,context:{specialSkills:{trip:'Parry:Judo'}}};
  assert.equal(evaluateMeleeSpecial(trip,ask).governingSkillLevel,9);
  const imported=evaluateMeleeSpecial(trip,{...ask,governingSkill:{name:'Judo',level:14,learned:true}});
  assert.equal(imported.governingSkillLevel,8);
  assert.equal(imported.perks,undefined);
});
