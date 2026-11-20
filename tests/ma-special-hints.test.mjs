import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meleeSpecialHints } from '../scripts/tools/melee-special-hints.js';
import { LT_FLEXIBLE_PROFILES } from '../scripts/lt-flexible-source.js';
import { getCombatRule, resolveCombatTechnique } from '../scripts/tools/combat-technique-registry.js';
import { meleeTechniqueControls } from '../scripts/tools/melee-technique-controls.js';
import { resolveMeleeCombatCalculation, meleeSpecialRollPreviews, prepareEffectiveMeleeDamage } from '../scripts/tools/melee-service.js';

const dictionaries = Object.fromEntries(['ru', 'en'].map(lang => [
  lang, JSON.parse(readFileSync(new URL('../lang/' + lang + '.json', import.meta.url), 'utf8'))
]));
const keyPrefix = 'OleGURPS.MeleeSpecialHint.';
const skill = name => ({ name, level: 14, resolved: true });
const punch = { key: 'punch', name: 'Punch', level: 14, parry: '0', reach: 'C', damage: 'thr-1 cr',
  unarmedRef: { profile: { id: 'punch', part: 'hand' } } };
const weapon = (modeId, reach, hands) => ({
  key: modeId ?? 'imported', name: 'QA Weapon', parry: '0', reach, meleeProfile: { modeId, strength: { hands } }
});
const mode = (modelId, damagePart) => Object.values(LT_FLEXIBLE_PROFILES)
  .find(row => row.modelId === modelId && (!damagePart || row.damagePart === damagePart)).modeId;
const ids = (attack, name) => new Set(meleeSpecialHints({ attack, governingSkill: skill(name) }).map(h => h.id));
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

test('reference cards respect the selected attack and exact equipment variants', () => {
  const brawling = ids(punch, 'Brawling');
  for (const id of ['Counterattack', 'Disarming', 'GrandDisarm', 'SnapWeapon', 'StopHit', 'Feint', 'Jam'])
    assert.ok(brawling.has(id), id);
  for (const id of ['Sweep', 'Hook', 'RetainWeapon', 'Entangle', 'BindWeapon'])
    assert.ok(!brawling.has(id), id);
  assert.ok(ids(punch, 'Karate').has('Sweep'));
  assert.ok(ids(weapon(undefined, '1, 2*', 2), 'Staff').has('Sweep'));
  assert.ok(!ids(weapon(undefined, '1, 2*', 1), 'Staff').has('Sweep'));
  assert.ok(ids(weapon(undefined, '1', 1), 'Jitte/Sai').has('BindWeapon'));
  assert.ok(ids(weapon(undefined, '1', 1), 'Rapier').has('RetainWeapon'));
  assert.ok(ids(weapon(mode('lt:kusari'), '1–4*', 2), 'Kusari').has('Entangle'));
  assert.ok(!ids(weapon(mode('lt:whip'), '1–4*', 1), 'Whip').has('Entangle'));
  assert.ok(!ids(weapon(mode('lt:kusarigama', 'blade-on-chain'), '1, 2*', 2), 'Kusari').has('Entangle'));
  assert.ok(ids(weapon(mode('lt:kusarigama', 'kama-edge'), '1', 2), 'Axe/Mace').has('Hook'));
  assert.ok(!ids(weapon(mode('lt:kusari'), '4', 2), 'Kusari').has('Hook'));
  assert.deepEqual(meleeSpecialHints({ attack: { key: '', name: '' } }), []);
});

test('RU and EN references use the original penalty timing, sources and ASCII minus', t => {
  for (const [lang, dictionary] of Object.entries(dictionaries)) {
    globalThis.game = { i18n: { lang, localize: key => dictionary[key] ?? key } };
    const [counter] = meleeSpecialHints({ attack: punch, governingSkill: skill('Brawling') });
    assert.equal(counter.title, lang === 'ru' ? 'Ответная атака' : 'Counterattack');
    assert.equal(counter.sources, 'MA70');
    assert.match(counter.text, lang === 'ru' ? /Против этого удара Parry -2, Dodge и Block -1/ :
      /Against this attack, Parry is at -2 and Dodge and Block at -1/);
    for (const [key, value] of Object.entries(dictionary).filter(([key]) => key.startsWith(keyPrefix))) {
      assert.ok(value && dictionaries[lang === 'ru' ? 'en' : 'ru'][key], key);
      assert.doesNotMatch(value, /\u2212/u, key);
    }
    const entangle = meleeSpecialHints({ attack: weapon(mode('lt:kusari'), '1–4*', 2),
      governingSkill: skill('Kusari') }).find(h => h.id === 'Entangle');
    assert.match(entangle.text, lang === 'ru' ? /полный навык Kusari/ : /full Kusari skill/);
    assert.match(entangle.sources, /B401, 406/);
  }
  t.after(() => { delete globalThis.game; });
});

test('active techniques show shared help while pure rules stay out of learned and combat state', () => {
  const actor = { system: { attributes: { ST: { value: 12 }, DX: { value: 12 } } } };
  const options = { actor, attack: punch, governingSkill: skill('Brawling'), baseSkill: 14 };
  const initial = structuredClone(options);
  const baseline = resolveMeleeCombatCalculation(options);
  const all = meleeTechniqueControls({ ...options, picker: { mode: 'all', query: 'ответная атака' } }, escape);
  const counter = all.match(/<button[^>]*data-melee-technique-add="counterattack"[^>]*>/)?.[0];
  assert.doesNotMatch(counter, /\bhidden\b/);
  assert.match(all, /data-technique-empty hidden/);
  const active = meleeTechniqueControls({ ...options, selection: { ids: ['counterattack'] }, activeOpen: true }, escape);
  assert.match(active, /data-tooltip="[^"]*MA70\./);
  assert.match(active, /Активные техники \(1\)/);
  assert.match(active, /Default 9/);
  const learned = meleeTechniqueControls({ ...options, picker: { mode: 'learned' } }, escape);
  assert.doesNotMatch(learned, /data-melee-special-hint/);
  for (const id of ['stopHit', 'crossParry', 'evaluateDefense', 'beat', 'ruse']) assert.equal(getCombatRule(id), null);
  assert.equal(getCombatRule('entangle').specialProfile.action, true);
  assert.deepEqual(options, initial);
  assert.deepEqual(resolveMeleeCombatCalculation(options), baseline);
});

const entries = Object.fromEntries(['Broadsword','Rapier','Jitte/Sai','Staff','Karate','Judo','Boxing','Brawling','Acrobatics','Kusari']
  .map((name,i)=>[i,{name,level:16,points:4,type:'skill'}]));
const fixtureActor = () => ({system:{attributes:{ST:{value:14},DX:{value:12},IQ:{value:13},PER:{value:11}},
  skills:structuredClone(entries), ads:{tbam:{name:'Trained by a Master'}}, currentdodge:9,
  encumbrance:{'00000':{current:true,level:0}},thrust:'1d cr',swing:'2d cr'}});
const sword = {...weapon(undefined,'1',1),level:16,parry:'11',damage:'1d+1 cut'};
const staff = {...weapon(undefined,'1,2',2),level:16,parry:'11',damage:'1d+1 cr'};
const specialPunch = {...punch,level:16,parry:'11'};
const fixedSkill = name => ({name,level:16,learned:true,resolved:true});

test('Counterattack uses its own Default and exact learned specialization in normal attack math', async () => {
  const actor=fixtureActor(), governingSkill=fixedSkill('Broadsword');
  const options={actor,attack:sword,governingSkill,baseSkill:16,
    meleeTechniques:{ids:['counterattack'],context:{specialConfirmed:{Counterattack:true}}}};
  const learned = level => ({name:'Counterattack (Broadsword)',points:4,level,type:'technique'});
  for(const [level,expected] of [[null,11],[14,14],[19,16]]){
    actor.system.skills.wrong={name:'Counterattack (Rapier)',points:4,level:19,type:'technique'};
    if(level!==null)actor.system.skills.correct=learned(level);
    const result=resolveMeleeCombatCalculation(options);
    assert.equal(result.effectiveSkill,expected);
    assert.equal(result.metadata.defenseModifier,0);
    assert.match(result.metadata.meleeTechniques.special.notes[0],/Parry -2, Dodge и Block -1/);
    assert.equal(resolveMeleeCombatCalculation({...options,manualModifier:2}).effectiveSkill,expected+2);
    const damage=await prepareEffectiveMeleeDamage({actor,attack:sword,techniquePlan:result.metadata.meleeTechniques});
    assert.equal(damage.formula,'1d+1 cut');
  }
});

const scenarios = [
 ['disarming','Broadsword',sword,'Broadsword',{specialTarget:'one'},[10,16],[13,19]],
 ['grandDisarm','Rapier',sword,'Rapier',{},[7,16],[10,16]],
 ['retainWeapon','Staff',staff,'Staff',{specialST:true},[20],[23]],
 ['sweep','Staff',staff,'Staff',{},[13,14],[16,16]],
 ['hook','Broadsword',{...sword,meleeProfile:{modeId:'wKPtQScfJKNLG7P4d',strength:{hands:1}}},'Broadsword',{specialTarget:'shield',specialDB:'2'},[9,16],[12,16]],
 ['bindWeapon','Jitte/Sai',sword,'Jitte/Sai',{specialST:true},[13,15,16],[16,18,16]],
 ['snapWeapon','ST',specialPunch,'Karate',{},[10],[13]],
 ['feint','Broadsword',sword,'Broadsword',{specialFeint:'ruse'},[17],[20]],
 ['trip','Judo',specialPunch,'Judo',{specialTrip:'dive'},[12],[13]],
 ['aggressiveParry','Boxing',specialPunch,'Boxing',{specialIncoming:'swing-one'},[7,6],[8,6]],
 ['jam','Brawling',specialPunch,'Brawling',{specialIncoming:'leg'},[10,14],[11,14]],
 ['lowLineDefense','Boxing',specialPunch,'Boxing',{},[9],[11]],
 ['handCatch','Judo',specialPunch,'Judo',{specialIncoming:'thrust-one'},[8,9],[11,9]],
 ['handClapParry','Judo',specialPunch,'Judo',{},[6],[9]],
 ['rollWithBlow','Acrobatics',specialPunch,'Karate',{specialKnockback:'2'},[14,10],[16,10]],
 ['timedDefense','Dodge',sword,'Broadsword',{specialSkills:{timedDefense:'Dodge'}},[7],[9]],
 ['dualWeaponDefense','Parry / Broadsword',sword,'Broadsword',{specialSkills:{dualWeaponDefense:'Parry:Broadsword'}},[10],[11]],
 ['breakfall','Acrobatics',specialPunch,'Karate',{},[16],[19]],
 ['evade','Acrobatics',specialPunch,'Karate',{specialEvade:'standing',specialApproach:'side'},[13],[16]],
 ['acrobaticStand','Acrobatics',specialPunch,'Karate',{specialEncumbrance:'2'},[8],[11]]
];

for(const [id,parent,attack,skillName,extra,defaults,trained] of scenarios)test(id+' Default, learned cap, own roll and no ordinary Damage',async()=>{
  const actor=fixtureActor(), rule=getCombatRule(id);
  const key=rule.specialProfile.kind==='defense'&&parent!=='Dodge'?'Parry:'+parent:parent;
  const context={...extra,cinematicDefaults:true,specialConfirmed:{[rule.specialProfile.ref]:true},
    specialSkills:{...extra.specialSkills,[id]:extra.specialSkills?.[id]??key}};
  const options={actor,attack,governingSkill:fixedSkill(skillName),baseSkill:16,context};
  const initial=resolveCombatTechnique(id,options);
  assert.equal(initial.available,true,initial.reason);
  assert.deepEqual(initial.special.rolls.map(r=>r.level),defaults);
  actor.system.skills.tech={name:rule.name+' ('+parent+')',points:4,level:initial.defaultLevel+3,type:'technique'};
  const selected=resolveCombatTechnique(id,options);
  assert.equal(selected.learned,true);
  assert.deepEqual(selected.special.rolls.map(r=>r.level),trained);
  actor.system.skills.tech.level=99;
  const capped=resolveCombatTechnique(id,options);
  assert.equal(capped.level,capped.maximum);
  const plan=resolveMeleeCombatCalculation({...options,meleeTechniques:{ids:[id],context}}).metadata.meleeTechniques;
  assert.equal(plan.available,true,plan.errors.join(' '));
  assert.deepEqual(meleeSpecialRollPreviews({...options,manualModifier:2},plan.special.special).map(r=>r.effectiveLevel),
    plan.special.special.rolls.map(r=>r.level+2));
  assert.equal(await prepareEffectiveMeleeDamage({actor,attack,techniquePlan:plan}),null);
});

test('cinematic gating, defense specialization, and alternate Feint attributes are distinct',()=>{
  const actor=fixtureActor(), options={actor,attack:sword,governingSkill:fixedSkill('Broadsword'),baseSkill:16};
  const blocked=resolveCombatTechnique('grandDisarm',{...options,context:{cinematicDefaults:false}});
  assert.equal(blocked.available,false);
  actor.system.skills.trained={name:'Grand Disarm (Broadsword)',level:12,points:4,type:'technique'};
  assert.equal(resolveCombatTechnique('grandDisarm',{...options,context:{cinematicDefaults:false}}).level,12);
  actor.system.skills.defense={name:'Timed Defense (Block / Broadsword)',level:99,points:4,type:'technique'};
  const defense=resolveCombatTechnique('timedDefense',{...options,context:{cinematicDefaults:true,
    specialSkills:{timedDefense:'Parry:Broadsword'}}});
  assert.equal(defense.learned,false);
  assert.equal(defense.level,9);
  for(const [variant,level] of [['beat',18],['ruse',17],['resist-ruse',15],['defensive',16]]){
    assert.equal(resolveCombatTechnique('feint',{...options,context:{specialFeint:variant}}).special.rolls[0].level,level);
  }
});

test('shield Hook uses Hook to hit and the separately learned Disarming in its contest',()=>{
  const actor=fixtureActor();
  const attack={...staff,damage:'thr-1 cut',meleeProfile:{modeId:'w7LQ6T1CaH1Voey4j',strength:{hands:2}}};
  actor.system.skills.hook={name:'Hook (Polearm)',level:14,points:4,type:'technique'};
  actor.system.skills.disarm={name:'Disarming (Polearm)',level:19,points:4,type:'technique'};
  const result=resolveCombatTechnique('hook',{actor,attack,governingSkill:fixedSkill('Polearm'),
   context:{specialTarget:'shield',specialDB:'2',specialConfirmed:{Hook:true}}});
  assert.deepEqual(result.special.rolls.map(({level,damage})=>[level,damage??null]),[[12,'weapon'],[21,null]]);
});
