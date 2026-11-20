export const meleeSpecialReferences = [
  ['Counterattack', 'Counterattack', 'MA70', 'any'],
  ['Disarming', 'Disarming', 'MA70; B400–401', 'parry'],
  ['GrandDisarm', 'Grand Disarm', 'MA82, 84; B401, 556', 'parry'],
  ['RetainWeapon', 'Retain Weapon', 'MA78; B401', 'weapon'],
  ['Sweep', 'Sweep', 'MA81', 'sweep'],
  ['Hook', 'Hook', 'MA74; B400–401', 'hook'],
  ['BindWeapon', 'Bind Weapon', 'MA67–68', 'bind'],
  ['Entangle', 'Entangle (Kusari)', 'B401, 406; MA71, 121', 'kusari'],
  ['SnapWeapon', 'Snap Weapon', 'MA82, 84, 87; B483', 'snap'],
  ['Feint', 'Feint', 'B365; MA73, 100–101', 'any'],
  ['Beat', 'Beat', 'MA100–101', 'any'],
  ['Ruse', 'Ruse', 'MA100–101', 'any'],
  ['DefensiveFeint', 'Defensive Feint', 'MA101; B365', 'any'],
  ['StopHit', 'Stop Hit', 'MA108', 'any'],
  ['Trip', 'Trip', 'MA81, 123–124', 'trip'],
  ['AggressiveParry', 'Aggressive Parry', 'MA65; B400', 'aggressive'],
  ['Jam', 'Jam', 'MA74–75; B400', 'jam'],
  ['LowLineDefense', 'Low-Line Defense', 'MA77', 'lowLine'],
  ['HandCatch', 'Hand Catch', 'MA82, 84; B400', 'catch'],
  ['HandClapParry', 'Hand-Clap Parry', 'MA82, 84', 'clap'],
  ['RollWithBlow', 'Roll with Blow', 'MA82, 87; B378', 'roll'],
  ['TimedDefense', 'Timed Defense', 'MA82, 89; B391', 'any'],
  ['Riposte', 'Riposte', 'MA124–125', 'parry'],
  ['DualWeaponDefense', 'Dual-Weapon Defense', 'MA82–83, 123', 'parry'],
  ['CrossParry', 'Cross Parry', 'MA121; B376', 'cross'],
  ['SupportedParry', 'Supported Parry', 'MA121; B376', 'supported'],
  ['LegParry', 'Parries with Legs or Feet', 'MA123; B420', 'jam'],
  ['Breakfall', 'Breakfall', 'MA68–69; B431', 'breakfall'],
  ['Evade', 'Evade', 'MA71; B368', 'any'],
  ['AcrobaticStand', 'Acrobatic Stand', 'MA65, 98; B364', 'acrobatic'],
  ['EvaluateDefense', 'Evaluate against Feints', 'MA100; B364–365', 'any'],
  ['ShinKick', 'Shin Kick', 'MA112; B379', 'shin'],
  ['WeaponShove', 'Shoves with Weapons', 'MA112; B372', 'shove'],
  ['LongWeaponSlam', 'Slams with Long Weapons', 'MA112; B371–372', 'longSlam'],
  ['AllOutSlam', 'Slams as All-Out Attacks', 'MA98; B365, 371–372', 'any'],
  ['StrikeShield', 'Striking at Shields', 'MA112; B400–401, B484', 'any'],
  ['BreakWeapon', 'Breaking a Weapon', 'B400–401, 483–484', 'any'],
  ['StopThrust', 'Stop Thrust', 'B366, 385', 'stopThrust'],
  ['AllOutAttackLong', 'All-Out Attack (Long)', 'MA97–98; B365', 'longAttack'],
  ['Pummeling', 'Pummeling', 'MA111–112', 'pummel'],
  ['AcrobaticAttack', 'Acrobatic Attack', 'MA105–107; B365', 'any'],
  ['FlyingAttack', 'Flying Attack', 'MA107; B352, 365', 'any']
];

export const specialUnarmedSkills = ['Boxing', 'Brawling', 'Karate', 'Judo', 'Sumo Wrestling', 'Wrestling'];
const wrestling = ['Judo', 'Sumo Wrestling', 'Wrestling'];

// TECH-CORE-1 descriptors use the names and sources from the reference catalogue.
const definitions = [
  ['Counterattack', 'attack', -5, 0, { confirm: 'Успешно защитился от этой цели перед своим ходом' }],
  ['Disarming', 'hit', 0, 5, { context: 'parry' }],
  ['GrandDisarm', 'hit', -11, 0, { context: 'parry', cinematic: true, confirm: 'Особый All-Out Attack, цели в 1 ярде' }],
  ['RetainWeapon', 'contest', 0, 5, { context: 'weapon' }],
  ['Sweep', 'hit', -3, 0, { context: 'sweep', unarmed: ['Judo', 'Karate', 'Sumo Wrestling'] }],
  ['Hook', 'hit', -5, 0, { context: 'hook', confirm: 'Оружие имеет подходящий крюк или выступ' }],
  ['BindWeapon', 'hit', -3, 0, { context: 'bind', confirm: 'Подходящее оружие и дистанция для связывания' }],
  ['SnapWeapon', 'contest', -4, 3, { context: 'snap', cinematic: true, confirm: 'Оружие уже перехвачено по MA87' }],
  ['Feint', 'contest', 0, 4, {}],
  ['Trip', 'defense', -1, 0, { bases: wrestling, confirm: 'ST цели не выше моего Basic Lift (двойного при Dive)' }],
  ['AggressiveParry', 'defense', -1, 0, { bases: ['Boxing', 'Brawling', 'Karate'] }],
  ['Jam', 'defense', -1, 0, { bases: ['Brawling', 'Karate'], confirm: 'Атака по нижней части тела, Jam доступен в этом ходу' }],
  ['LowLineDefense', 'defense', -2, 0, { bases: ['Boxing', 'Sumo Wrestling'] }],
  ['HandCatch', 'defense', -3, 0, { bases: [...wrestling, 'Parry Missile Weapons'], cinematic: true,
    confirm: 'Подходящее оружие или снаряд и свободная рука' }],
  ['HandClapParry', 'defense', -5, 0, { bases: ['Judo', 'Karate'], cinematic: true, confirm: 'Две пустые руки, атака оружием' }],
  ['RollWithBlow', 'skill', -2, 0, { bases: ['Acrobatics', ...specialUnarmedSkills], cinematic: true, confirm: 'Получен дробящий удар' }],
  ['TimedDefense', 'defense', -2, 0, { defenseChoice: true, cinematic: true, confirm: 'Атака сбоку или с забеганием за спину' }],
  ['DualWeaponDefense', 'defense', -1, 0, { defenseChoice: true, cinematic: true, confirm: 'Противник выполняет Dual-Weapon Attack' }],
  ['Breakfall', 'skill', 0, 5, { bases: ['Acrobatics', 'Judo', 'Wrestling'] }],
  ['Evade', 'contest', 0, 5, { bases: ['Acrobatics', 'Judo'] }],
  ['AcrobaticStand', 'skill', -6, 0, { bases: ['Acrobatics'] }],
  ['Entangle', 'skill', 0, 0, { action: true, context: 'kusari', confirm: 'Цепь Kusari парирована оружием' }]
];

const rules = definitions.map(([ref, kind, defaultModifier, maximum, properties]) => {
  const id = ref[0].toLowerCase() + ref.slice(1);
  const [, name, sources] = meleeSpecialReferences.find(row => row[0] === ref);
  const rule = { id, name, aliases: [name], combatType: 'melee', kind: properties.action ? 'maneuver' : 'technique',
    operation: kind === 'attack' ? 'REPLACE' : 'SPECIAL_CHECK', meleePenalty: true,
    penaltyChannel: kind === 'attack' ? 'techniqueCounterattack' : null,
    sources: [sources], defaultModifier, maximum, specialProfile: { ref, kind, ...properties } };
  return rule;
});

export const MA_SPECIAL_RULES = Object.freeze(rules);
