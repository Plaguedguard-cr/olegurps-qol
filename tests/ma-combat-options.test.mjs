import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  expandedRapidStrikeCount, extendedMeleeReach, extraAttackRanks, MA_MELEE_OPTIONS,
  maOptionText, maProjectedAttack, maRapidStrikePenalty, movementChecks, movementOutcome,
  planCombatFatigue, readShieldDefenseBonus, resolveMeleeCombatOptions, spendCombatFatigue
} from '../scripts/tools/ma-combat-options.js';
import { getMeleeAttackSlots } from '../scripts/tools/melee-attack-slots.js';
import { buildMeleeDamageAction, resolveMeleeCombatCalculation } from '../scripts/tools/melee-service.js';
import { maRangedKinds, quickBowPlan, readiedThrowFeed, thrownBurstPlan, thrownSequencePlan } from '../scripts/tools/ma-ranged-options.js';
import { basicDamageOnly } from '../scripts/tools/melee-native-damage.js';
import { resolveCombatTechnique } from '../scripts/tools/combat-technique-registry.js';

const row = (name, level) => ({ name, level, import: level, points: 4 });
const actor = {
  isOwner: true,
  system: {
    attributes: { DX: { value: 12 }, ST: { value: 13 }, IQ: { value: 10 }, PER: { value: 15 } },
    FP: { value: 12, max: 12 },
    skills: Object.fromEntries([row('Broadsword', 18), row('Brawling', 14), row('Acrobatics', 15),
      row('Jumping', 16), row('Bow', 16), row('Fast-Draw (Arrow)', 14), row('Throwing', 14)]
      .map((item, index) => [index, item])),
    ads: {}
  }
};
const sword = { name: 'Broadsword', mode: 'Swing', damage: 'sw cut',
  reach: '1,2*', meleeProfile: { motion: 'swing', reach: '1,2*', hands: { hands: 1 } } };
const skill = { name: 'Broadsword', level: 18, resolved: true, learned: true };
const baseline = { actor, attack: sword, governingSkill: skill, baseSkill: 18 };
const calc = overrides => resolveMeleeCombatCalculation({ ...baseline, ...overrides });

test('1: long attack preserves skill, changes reach and penalizes only swing', async () => {
  assert.equal(extendedMeleeReach('C,1,3*'), '1,2,4*');
  const options = { allOutAttack: true, allOutAttackMode: 'long' };
  const calculation = calc(options);
  assert.equal(calculation.effectiveSkill, 18);
  const maOptions = calculation.metadata.maOptions;
  const action = await buildMeleeDamageAction({ actor, attack: sword, damage: '3d+2 cut', maOptions });
  assert.equal(action.formula, '3d-1');
  const thrust = { ...sword, damage: '2d+2 imp', meleeProfile: { ...sword.meleeProfile, motion: 'thrust' } };
  assert.equal((await buildMeleeDamageAction({ actor, attack: thrust,
    maOptions: calc({ ...options, attack: thrust }).metadata.maOptions })).formula, '2d+2');
  assert.match(calc({ ...options, attack: { ...sword, meleeProfile: { grip: 'defensive' } } })
    .metadata.maOptions.error, /Defensive Grip/);
  assert.equal(sword.reach, '1,2*');
});

test('3: Acrobatic Attack applies -2 to the stunt and to Move and Attack', () => {
  assert.equal(movementChecks(actor, 'acrobatic', {})[0].level, 13);
  assert.equal(calc({ baseSkill: 14, moveAndAttack: true, maOptions: { movement: 'acrobatic' } }).effectiveSkill, 8);
  assert.equal(calc({ moveAndAttack: true, maOptions: { movement: 'acrobatic' } }).effectiveSkill, 9);
});

test('4: Flying Attack tests Jumping and uses -5 and cap 9', () => {
  assert.deepEqual(movementChecks(actor, 'flying')[0], { name: 'Jumping', level: 16, procedure: 'flying' });
  assert.equal(calc({ baseSkill: 13, moveAndAttack: true, maOptions: { movement: 'flying' } }).effectiveSkill, 8);
  assert.equal(calc({ moveAndAttack: true, maOptions: { movement: 'flying' } }).effectiveSkill, 9);
});

test('5: Pummeling uses a suitable close weapon and the unarmed skill route', () => {
  assert.ok(maProjectedAttack({ ...baseline, maOptions: { attackOption: 'pummel' } }).error);
  const result = maProjectedAttack({ ...baseline, maOptions: { attackOption: 'pummel', pummelConfirmed: true } });
  assert.deepEqual([result.reach, result.level, result.skill, result.bonus, result.formula],
    ['C', 13, 'Brawling', 1, 'thr cr']);
  const haladie = { ...sword, name: 'Haladie' };
  assert.ok(maProjectedAttack({ ...baseline, attack: haladie, maOptions: { attackOption: 'pummel' } }).error);
});

test('6: Shin Kicks replace a boot bonus with the rigid-leg-armor bonus', () => {
  const options = { actor, attack: { name: 'Kick', unarmedRef: { id: 'boots' } },
    maOptions: { attackOption: 'shin', attackOptionConfirmed: true } };
  assert.equal(maProjectedAttack(options).flat, -1);
  assert.equal(maProjectedAttack({ ...options, maOptions: { ...options.maOptions, shinArmor: true } }).flat, 0);
  const jam=maProjectedAttack({...options,maOptions:{...options.maOptions,shinArmor:true}},{strikes:[{id:'jam'}]});
  assert.equal(jam.flat,1);
  const shin = { ...actor, system: { ...actor.system, ads: { a: { name: 'Striker (Crushing; Limb, Shin)' } } } };
  const result = maProjectedAttack({ ...options, actor: shin });
  assert.deepEqual([result.bonus, result.selfInjuryDR], [1, 3]);
});

test('7: Weapon shove uses maximum Reach, a per-die one-hand penalty, and a safe damage roll', async () => {
  const options = calc({ maOptions: { attackOption: 'shove' } }).metadata.maOptions;
  assert.equal(options.projected.formula, 'thr+2 cr');
  assert.equal(options.projected.bonus, -1);
  const action = await buildMeleeDamageAction({ actor, attack: sword, maOptions: options });
  assert.equal(basicDamageOnly(action), true);
  assert.equal(action.damagetype, 'cr');
});

test('10: Shield DB offsets -4, and only a hand-held shield can be disarmed at an extra -2', () => {
  const options = { attackOption: 'strikeShield', shieldDB: 2 };
  assert.equal(calc({ hitLocationPenalty: -5, maOptions: options }).effectiveSkill, 16);
  assert.ok(calc({ maOptions: { ...options, shieldDisarm: true } }).metadata.maOptions.error);
  assert.equal(calc({ maOptions: { ...options, shieldDisarm: true, shieldHandheld: true } }).effectiveSkill, 14);
});

test('11: Extra Attack supports enabled ranks, Multi-Strike, and independent slots', () => {
  assert.deepEqual(extraAttackRanks(actor), []);
  const boosted = { system: { ads: { a: { name: 'Extra Attack 3 (Multi-Strike; Single Skill: Broadsword)' },
    b: { name: 'Extra Attack 7', disabled: true } } } };
  const ranks = extraAttackRanks(boosted);
  assert.equal(ranks.length, 3);
  assert.deepEqual(ranks[0], { multiStrike: true, singleSkill: 'broadsword', unresolvedSpecialization: false });
  const slots = getMeleeAttackSlots({ allOutAttack: true, allOutAttackMode: 'double', rapidStrike: true,
    rapidCount: 3, extraAttacks: ranks });
  assert.deepEqual(slots.map(slot => slot.label), ['AoA', 'RS 1', 'RS 2', 'RS 3', 'EA 1', 'EA 2', 'EA 3']);
  assert.deepEqual(slots.filter(slot => slot.extraAttack).map(slot => slot.rapidStrike), [false, false, false]);
  for(const [techniqueSequence,sequence] of [['dualWeaponAttack',['DWA 1','DWA 2']],['combination',['C 1','C 2']]]){
    const combination=getMeleeAttackSlots({techniqueSequence,extraAttacks:ranks.slice(0,1)});
    assert.deepEqual(combination.map(slot=>slot.label),[...sequence,'EA 1']);
    assert.equal(calc({maOptions:{extraAttack:combination.at(-1).extraAttack}}).effectiveSkill,18);
  }
});

test('12: Expanded Rapid Strike follows the cinematic setting and uniform penalties', () => {
  assert.equal(expandedRapidStrikeCount(4, false), 2);
  assert.equal(expandedRapidStrikeCount(4, true), 4);
  assert.equal(maRapidStrikePenalty(3, false, false), -12);
  assert.equal(maRapidStrikePenalty(4, true, false), -9);
});

test('13: Feint slot uses the existing distinct Feint, Beat and Ruse bases before slot penalties', () => {
  const values = ['feint', 'beat', 'ruse', 'defensive'].map(specialFeint => {
    const resolved = resolveCombatTechnique('feint', { ...baseline, context: { specialFeint } });
    return resolved.special.rolls[0].level;
  });
  assert.deepEqual(values, [18, 19, 16, 18]);
  assert.equal(calc({ baseSkill: values[1], rapidStrikePenalty: -6 }).effectiveSkill, 13);
});

test('15: Flurry is per Rapid Strike slot, rounds toward zero, and disallows Move and Attack', () => {
  const options = { rapidStrikePenalty: -9, maOptions: { effort: 'flurry' } };
  assert.equal(calc(options).effectiveSkill, 14);
  assert.equal(calc(options).metadata.maOptions.effortCost, 1);
  assert.equal(calc({ ...options, moveAndAttack: true }).metadata.maOptions, undefined);
  assert.equal(calc({ ...options, maOptions: { effort: 'flurry', spend: false } }).effectiveSkill, 9);
});

test('16: Mighty Blows reuses Strong damage and only applies to Attack', async () => {
  const maOptions = calc({ maOptions: { effort: 'mighty' } }).metadata.maOptions;
  assert.equal(maOptions.effortCost, 1);
  const damage = await buildMeleeDamageAction({ actor, attack: sword, damage: '3d cut', maOptions });
  assert.equal(damage.formula, '3d+3');
  assert.equal(calc({ committedAttack: true, maOptions: { effort: 'mighty' } }).metadata.maOptions, undefined);
});

test('17: Great Lunge shares Long reach and swing penalty and is unavailable for AoA/Defensive', () => {
  const maOptions = calc({ committedAttack: true, maOptions: { effort: 'lunge' } }).metadata.maOptions;
  assert.deepEqual([maOptions.long, maOptions.swingPenalty, maOptions.effortCost], [true, true, 1]);
  for (const field of ['allOutAttack', 'defensiveAttack']) {
    assert.equal(calc({ [field]: true, maOptions: { effort: 'lunge' } }).metadata.maOptions, undefined);
  }
});

test('18: Heroic Charge removes only the standard melee Move and Attack penalty and cap', () => {
  for (const [movement, expected] of [[null, 18], ['flying', 17], ['acrobatic', 16]]) {
    const result = calc({ moveAndAttack: true, maOptions: { effort: 'charge', movement } });
    assert.equal(result.effectiveSkill, expected);
    assert.deepEqual(result.metadata.meleeCaps, []);
  }
  assert.equal(calc({ moveAndAttack: true, visibilityCap: true, maOptions: { effort: 'charge' } }).effectiveSkill, 9);
});

test('19: Quick-Shooting has two Bow checks, advantage reductions, and a separate optional Fast-Draw', () => {
  const bow = { name: 'Bow', acc: 3, data: { shots: '1(2)' } }, skill = { name: 'Bow', level: 16 };
  assert.deepEqual(maRangedKinds(bow, skill), ['quickBow']);
  assert.deepEqual(maRangedKinds(bow, { name: 'Crossbow' }), []);
  const plan = quickBowPlan({ actor, attack: bow, skill, allOutAttack: true, fastDraw: true });
  assert.deepEqual([plan.penalty, plan.draw, plan.fastDraw], [-6, 11, 14]);
  const trained = { ...actor, system: { ...actor.system, ads: {
    a: { name: 'Heroic Archer' }, b: { name: 'Weapon Master (Bows)' }
  } } };
  assert.equal(quickBowPlan({ actor: trained, attack: bow, skill }).penalty, -1);
  assert.equal(quickBowPlan({ actor, attack: bow, skill, moveAndAttack: true }), null);
});

test('20: thrown Rapid Strike declares all throws first and bounds ready weapons', () => {
  const attack = { name: 'Dagger', data: { shots: 'T(1)' } }, skill = { name: 'Thrown Weapon (Knife)' };
  assert.deepEqual(maRangedKinds(attack, skill), ['thrownSequence', 'thrownBurst']);
  assert.equal(thrownSequencePlan({ actor, attack, skill, count: 3, ready: 3, weight: 0.25 }).penalty, -12);
  assert.equal(thrownSequencePlan({ actor, attack, skill, count: 2, ready: 2, weight: 1 }), null);
});

test('21: thrown burst has 4/5 boundary, weight limit, Throwing, Rcl 2 and one RoF', () => {
  const input = { actor, attack: { data: { damage: '1d-1 cut', range: '6/13' } },
    selection: { ready: true, sharp: true, weight: 0.1 } };
  const four = thrownBurstPlan({ ...input, count: 4 });
  const five = thrownBurstPlan({ ...input, count: 5 });
  assert.deepEqual([four.damage, four.range, four.rof, four.rcl], ['1d-2 cut', '4/8', 4, 2]);
  assert.deepEqual([five.skill, five.damage, five.range, five.rof, five.rcl], ['Throwing', '1d-3 cut', '2/4', 5, 2]);
  assert.equal(thrownBurstPlan({ ...input, count: 17 }).maxWeight, 1.7);
  assert.equal(thrownBurstPlan({ ...input, count: 18 }), null);
  assert.equal(thrownBurstPlan({...input,selection:{...input.selection,container:true},count:18}).bulk,-6);
});

test('B426: low FP remains legal, and spending is serialized on the actor', async () => {
  const cases=[[12,1,11,0],[1,1,0,0],[0,1,-1,1],[-3,1,-4,1],[1,3,-2,2],[-11,2,-12,2],[-12,1,-12,1]];
  for(const [before,cost,after,injury] of cases){
    const receipt=planCombatFatigue(before,12,cost);
    assert.deepEqual([receipt.after,receipt.injury],[after,injury]);
  }
  const changes=[];
  const testActor = { ...actor, system: { FP: { value: 1, max: 12 }, HP:{value:12} }, async update(change) {
    changes.push(change);
    this.system.FP.value = change['system.FP.value'];
    if('system.HP.value' in change)this.system.HP.value=change['system.HP.value'];
  } };
  const receipts = await Promise.all([spendCombatFatigue(testActor, 1), spendCombatFatigue(testActor, 1)]);
  assert.deepEqual(receipts.map(record => [record.before, record.after,record.hpBefore,record.hpAfter]), [[1, 0,12,12], [0, -1,12,11]]);
  assert.deepEqual(changes,[{'system.FP.value':0},{'system.FP.value':-1,'system.HP.value':11}]);
  testActor.system.FP.value=-12;
  await assert.rejects(spendCombatFatigue(testActor,1,{requireConscious:true}),/B426/);
  assert.equal(changes.length,2);
  const forced=await spendCombatFatigue(testActor,1);
  assert.deepEqual([forced.after,forced.hpAfter],[-12,10]);
  await assert.rejects(spendCombatFatigue({...testActor,isOwner:false},1),/OWNER/);
  await assert.rejects(spendCombatFatigue({...testActor,update:async()=>{throw Error('update failed');}},1),/update failed/);
});

test('Acrobatic Attack separates skill routes, rebound checks and movement outcomes', () => {
  const acrobat=structuredClone(actor);
  acrobat.system.attributes.HT={value:10};
  Object.assign(acrobat.system.skills,{run:row('Running',17),skate:row('Skating',15)});
  assert.deepEqual(movementChecks(acrobat,'acrobatic',{stunt:'ticTac',stuntRebounds:3}).map(check=>check.level),[10,8,6]);
  assert.deepEqual(movementChecks(acrobat,'acrobatic',{stunt:'spinning'}).map(check=>[check.name,check.level]),[['Running (DX)',17]]);
  assert.deepEqual(movementChecks(acrobat,'acrobatic',{stunt:'skid'}).map(check=>[check.name,check.level]),[['Skating (DX)',13]]);
  assert.deepEqual(movementChecks(acrobat,'acrobatic',{stunt:'evade',evadeJump:true,stuntPenalty:-2}).map(check=>[check.name,check.level]),[['Jumping',12]]);
  assert.equal(movementOutcome({procedure:'evade'},{success:true}).manual,true);
  assert.equal(movementOutcome({procedure:'tumbling'},{success:false}).manual,true);
  assert.equal(movementOutcome({procedure:'tumbling'},{success:false,criticalFailure:true}).manual,false);
  const maOptions={movement:'acrobatic',stunt:'ticTac',stuntRebounds:3,effort:'charge'};
  assert.equal(calc({moveAndAttack:true,maOptions}).effectiveSkill,12);
});

test('Reversed butt strikes use unmodified weapon thrust and shields use unambiguous equipped DB', () => {
  const reversed={...sword,damage:'thr+2 imp',meleeProfile:{...sword.meleeProfile,grip:'reversed',reach:'1'}};
  const pommel=maProjectedAttack({...baseline,attack:reversed,maOptions:{attackOption:'pummel',pummelConfirmed:true}});
  assert.deepEqual(pommel,{action:'pummel',reach:'1',formula:'thr+1 cr',reversed:true});
  const defender={system:{equipment:{carried:{a:{type:'shield',equipped:true,db:'2',handheld:false,uuid:'shield-a'}}}}};
  const recorded=readShieldDefenseBonus(defender);
  assert.deepEqual(recorded,{value:2,handheld:false,instanceId:'shield-a'});
  const withShield=shieldDisarm=>maProjectedAttack({...baseline,maOptions:{attackOption:'strikeShield',targetShield:recorded,shieldDisarm}});
  assert.equal(withShield(false).hitModifier,-2);
  assert.ok(withShield(true).error);
  defender.system.equipment.carried.b={type:'cloak',equipped:true};
  assert.equal(readShieldDefenseBonus(defender),null);
});

test('Throwing Art requires range evidence and a readied lot can differ from the loaded lot', () => {
  const thrower=structuredClone(actor);
  thrower.system.skills.art=row('Throwing Art',13);
  const attack={data:{damage:'1d-1 cut',range:'6/13'}};
  const selection={ready:true,weight:0.1,throwingArt:true};
  assert.equal(thrownBurstPlan({actor:thrower,attack,selection,count:4}),null);
  const burst=thrownBurstPlan({actor:thrower,attack,selection:{...selection,rangeWithArt:'7/15'},count:4});
  assert.deepEqual([burst.range,burst.damage,burst.artRangeSource],['4/10','1d cut','confirmed Throwing Art range']);
  const multiplied=thrownBurstPlan({actor:thrower,attack:{data:{...attack.data,range:'x0.5/x1'}},selection,count:4});
  assert.deepEqual([multiplied.range,multiplied.artRangeSource],['5/10','ST multiplier']);
  const weapon={standaloneModeId:'WofsykiukDG6DrXBB',ammunitionInventory:{stocks:[
    {key:'second',type:{label:'Second lot'},rounds:3}
  ]}};
  assert.deepEqual(readiedThrowFeed(weapon,{kind:'physical-magazine',magazineId:'feed',
    ammoKey:'first',available:1},'second'),{loaded:0,stock:3,available:3,ammoKey:'second',type:{label:'Second lot'}});
});

test('the 17 options have bilingual page-linked help and use ASCII minus', () => {
  const saved = globalThis.game;
  try {
    assert.equal(Object.keys(MA_MELEE_OPTIONS).length, 17);
    for (const id of Object.keys(MA_MELEE_OPTIONS)) {
      globalThis.game = { i18n: { lang: 'en' } };
      const en = maOptionText(id);
      globalThis.game = { i18n: { lang: 'ru' } };
      const ru = maOptionText(id);
      assert.notEqual(ru.hint, en.hint);
      assert.match(ru.hint, /\b(MA|B)\d+/);
      assert.doesNotMatch(ru.hint + en.hint, /−/);
    }
  } finally { globalThis.game = saved; }
});
