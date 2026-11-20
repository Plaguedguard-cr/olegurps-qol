import { meleeSource } from '../melee-source-data.js';
import { finiteLevel } from './combat-technique-data.js';
import { allowsCinematicTechniqueDefaults } from './combat-technique-preference.js';
import { cinematicTraining, findTechniqueLevel, isMeleeTechniqueWeaponSkill, learnedMeleeSkills, meleeSkillFamily } from './melee-penalty-techniques.js';
import { meleeSpecialHintContext } from './melee-special-hints.js';
import { specialUnarmedSkills as unarmed } from './melee-special-data.js';
import { adaptedTechniqueDefault, armorFamiliarity, readCombatPerks, techniqueMastery } from './ma-combat-perks.js';

const fencing = ['main-gauche', 'rapier', 'saber', 'smallsword'];
const reachPenalties = { close: -5, one: -4, long: -3 };
const weaponSizes = [
  ['close', 'Reach C или пистолет'],
  ['one', 'Reach 1 или карабин'],
  ['long', 'Reach 2+ или винтовка']
];



const attributes = (actor, key) => finiteLevel({ level: actor?.system?.attributes?.[key]?.value });
const familyIn = (skill, names) => names?.some(name => meleeSkillFamily({ name }) === meleeSkillFamily(skill));
const readyWeapon = attack => !!attack?.name && !attack?.unarmedRef && !attack?.meleeProfile?.unarmed;
const defenseScore = value => {
  const match = /^\s*(\d+)(?:[A-Z!*]*)\s*$/i.exec(String(value ?? ''));
  return match && Number(match[1]) > 0 ? Number(match[1]) : null;
};

function specialBases(rule, { actor, attack, governingSkill, context }) {
  const profile = rule.specialProfile;
  const { ref, bases, kind, defenseChoice } = profile;
  const learned = learnedMeleeSkills(actor);
  const fixed = governingSkill && finiteLevel(governingSkill) !== null ? governingSkill : null;
  const isUnarmed = !readyWeapon(attack);
  const candidates = (names) => learned.filter(skill => familyIn(skill, names))
    .map(entry => ({ ...entry, entry, level: finiteLevel(entry), learned: true }));
  const asDefense = (skill, defense, level) => level === null ? null : { ...skill, level, underlyingLevel: finiteLevel(skill), defense };
  const basicParry = skill => Math.floor(skill.level / 2) + 3;
  const selectedParry = defenseScore(attack?.meleeProfile?.parry ?? attack?.parry ?? attack?.data?.parry);
  if (defenseChoice) {
    const parry = fixed && asDefense(fixed, 'Parry', selectedParry);
    const blockValue = defenseScore(attack?.meleeProfile?.block ?? attack?.data?.block ?? attack?.block);
    const shields = candidates(['Shield', 'Cloak']);
    const exactBlock = fixed && familyIn(fixed, ['Shield', 'Cloak']) ? fixed : null;
    const blocks = exactBlock && blockValue !== null ? [asDefense(exactBlock, 'Block', blockValue)] :
      shields.map(skill => asDefense(skill, 'Block', basicParry(skill)));
    const dodgeValue = defenseScore(actor?.getCurrentDodge?.() ?? actor?.system?.currentdodge ?? actor?.system?.dodge?.value);
    const dodge = ref === 'TimedDefense' && asDefense({ name: 'Dodge', learned: true }, 'Dodge', dodgeValue);
    return [parry, ...blocks, dodge].filter(Boolean);
  }
  if (kind === 'defense') return candidates(bases).map(skill => {
    if (fixed && meleeSkillFamily(fixed) === meleeSkillFamily(skill) && isUnarmed && selectedParry !== null)
      return asDefense({...skill,armor:attack.meleeProfile?.unarmed?.perks?.find(perk=>perk.name==='Armor Familiarity')}, 'Parry', selectedParry);
    const penalty=familyIn(skill,['Judo','Karate'])?Number(Object.values(actor?.system?.encumbrance??{}).find(row=>row.current)?.level??0):0;
    const reduction=armorFamiliarity(actor,skill.name,penalty);
    const armor=reduction?{name:'Armor Familiarity',modifier:reduction,source:'MA49; B203'}:null;
    return asDefense({...skill,armor}, 'Parry', basicParry(skill)-penalty+reduction);
  });
  if (bases) {
    const defaults=Object.fromEntries(bases.map(name=>[name,rule.defaultModifier]));
    const adapted=kind==='skill'?learned.flatMap(entry=>{
      if(familyIn(entry,bases))return [];
      const perk=adaptedTechniqueDefault(actor,rule,entry.name,defaults);
      return perk?[{...entry,entry,level:finiteLevel(entry),learned:true,adaptation:perk}]:[];
    }):[];
    return [...candidates(bases),...adapted];
  }
  if (ref === 'Feint' && !['beat','ruse','resist-ruse'].includes(context?.specialFeint) &&
      readCombatPerks(actor, 'Acrobatic Feints').some(p => !p.specialization)) {
    const acrobatic=candidates(['Acrobatics']).map(skill=>({...skill,adaptation:{name:'Acrobatic Feints',source:'MA51; MA101'}}));
    const regular=isUnarmed?(fixed&&familyIn(fixed,unarmed)?[fixed]:candidates(unarmed)):
      fixed&&isMeleeTechniqueWeaponSkill(fixed)?[fixed]:[];
    return [...regular,...acrobatic];
  }
  if (ref === 'Sweep' && isUnarmed) {
    return candidates(attack?.unarmedRef?.profile?.part === 'striker' ? ['Brawling'] : profile.unarmed);
  }
  if (ref === 'SnapWeapon') {
    const hands = attributes(actor, 'ST');
    if (!isUnarmed) return fixed && familyIn(fixed, ['Jitte/Sai']) ? [fixed] : [];
    return hands === null ? [] : [{ name: 'ST', level: hands, learned: true }];
  }
  if (!fixed) return [];
  if (isUnarmed && !familyIn(fixed, unarmed)) return ref === 'Counterattack' ? [] : candidates(unarmed);
  if (!isUnarmed && !isMeleeTechniqueWeaponSkill(fixed)) return [];
  return [fixed];
}

function specialFields(ref, roll, context) {
  const fields = [];
  const select = (name, label, choices) => fields.push({ name: 'special' + name, label, choices });
  const check = (name, label) => fields.push({ name: 'special' + name, label, type: 'check' });
  if (['Disarming', 'Hook'].includes(ref)) {
    select('Target', 'Цель для броска', [['', 'Выберите'], ...weaponSizes,
      ...(ref === 'Hook' ? [['shield', 'Щит']] : [])]);
    if (ref === 'Hook' && context.specialTarget === 'shield') select('DB', 'DB щита', [['', 'Выберите'], ...[0, 1, 2, 3, 4].map(value => [String(value), String(value)])]);
  }
  if (['Disarming', 'GrandDisarm', 'RetainWeapon', 'Hook', 'BindWeapon', 'Entangle'].includes(ref)) check('ST', 'Состязание на ST');
  if (ref === 'Hook' && context.specialTarget === 'shield' && roll?.hands == null) check('TwoHands', 'Зацеп двуручным оружием');
  if (ref === 'RetainWeapon' && roll?.hands == null) check('TwoHands', 'Оружие держат двумя руками');
  if (ref === 'Feint') select('Feint', 'Вариант финта', [['', 'Feint'], ['beat', 'Beat (ST)'], ['ruse', 'Ruse (IQ)'], ['resist-ruse', 'Сопротивление Ruse (Per)'], ['defensive', 'Defensive Feint']]);
  if (ref === 'Evade') select('Evade', 'Положение противника', [['', 'Выберите'], ['standing', 'Стоит'], ['kneeling', 'На коленях'], ['prone', 'Лежит'], ['other', 'Другое']]);
  if (ref === 'Evade') select('Approach', 'Направление', [['', 'Спереди'], ['side', 'Сбоку'], ['back', 'Сзади']]);
  if (ref === 'Trip') select('Trip', 'Условие подножки', [['', 'Выберите'], ['slam', 'Двуногий противник делает Slam'], ['run', 'Бегущий мимо в 1 ярде, свободная стопа'], ['dive', 'Dive поперёк пути']]);
  if (['AggressiveParry', 'Jam', 'HandCatch'].includes(ref)) {
    select('Incoming', 'Входящая атака', [['', 'Выберите'], ['hand', 'Кисть'], ['arm', 'Рука'], ['foot', 'Стопа'], ['leg', 'Нога'],
      ...weaponSizes.flatMap(([size, name]) => [['swing-' + size, 'Swing, ' + name], ['thrust-' + size, 'Thrust, ' + name]]),
      ...(ref === 'HandCatch' ? [['missile-large', 'Крупное метательное оружие'], ['missile-small', 'Мелкое метательное оружие'],
        ['missile-arrow', 'Стрела'], ['missile-bolt', 'Болт или дротик'], ['missile-bullet', 'Пуля с Enhanced Time Sense']] : [])]);
    if (ref !== 'HandCatch' && /^(arm|hand|leg|foot)$/.test(context.specialIncoming ?? '')) check('Retraction', 'У противника Rapid Retraction');
  }
  if (ref === 'AcrobaticStand') select('Encumbrance', 'Нагрузка', [['', 'Из листа'], ...[0, 1, 2, 3, 4].map(value => [String(value), String(value)])]);
  if (ref === 'RollWithBlow') fields.push({ name: 'specialKnockback', label: 'Ярдов отбрасывания для DX', type: 'number' });
  return fields;
}

const combatCheck = (id, kind, label, level, rest = {}) => ({ id, kind, label, level, ...rest });
const sum = (base, mod) => Number.isFinite(base) && Number.isFinite(mod) ? base + mod : null;
const attrShift = (value, actor, attr) => sum(value,
  Number.isFinite(attributes(actor, attr)) && Number.isFinite(attributes(actor, 'DX')) ? attributes(actor, attr) - attributes(actor, 'DX') : null);

function specialRolls(rule, skill, result, context, { actor, attack }) {
  const { ref, kind } = rule.specialProfile;
  const base = result.level;
  const family = meleeSkillFamily(skill);
  const st = check => context.specialST ? attrShift(check, actor, 'ST') : check;
  const disarming = () => findTechniqueLevel({ actor, rule: { id: 'disarming', name: 'Disarming', defaultModifier: 0 },
    skill, maximum: 5 })?.level ?? skill.level;
  const disarmBonus = ['jitte/sai', 'kusari', 'whip'].includes(family) ? 2 : 0;
  const twoHands = result.hands === 2 || result.hands == null && context.specialTwoHands;
  const targetMod = reachPenalties[context.specialTarget] ?? null;
  const hit = (level, damage = null) => combatCheck('hit', 'hit', 'Бросок попадания', level, { damage });
  const contest = (level, damage = null) => combatCheck('contest', 'contest', 'Мой бросок состязания', level, { damage });
  if (ref === 'Counterattack') return [combatCheck('attack', 'attack', 'Атака', base)];
  if (ref === 'Disarming') return [hit(sum(base, sum(targetMod, fencing.includes(family) ? 0 : -2))), contest(sum(st(base), disarmBonus))];
  if (ref === 'GrandDisarm') return [hit(base), contest(sum(st(disarming()), disarmBonus))];
  if (ref === 'RetainWeapon') return [contest(sum(st(base), twoHands ? 2 : 0))];
  if (ref === 'Sweep') return [hit(base), contest(Math.max(base, attributes(actor, 'ST') ?? base))];
  if (ref === 'BindWeapon') return [hit(base), contest(st(base)), combatCheck('retain', 'skill', 'Удержать своё оружие после освобождения силой',
    Math.max(skill.level, findTechniqueLevel({ actor, rule: { id: 'retainWeapon', name: 'Retain Weapon', defaultModifier: 0 },
      skill, maximum: 5 })?.level ?? skill.level))];
  if (ref === 'Hook') {
    const shield = context.specialTarget === 'shield';
    const db = /^[0-4]$/.test(context.specialDB ?? '') ? Number(context.specialDB) : null;
    const source = meleeSource(attack?.meleeProfile?.modeId);
    const damage = (source?.hook === true || source?.damagePart === 'hook-edge') && /\bcut\b/.test(attack?.damage ?? '') ? 'weapon' : null;
    return [hit(sum(base, shield ? sum(-4, db) : targetMod), damage),
      contest(context.specialTarget ? sum(st(disarming()), disarmBonus + (shield ? (twoHands ? 2 : 0) : 2)) : null)];
  }
  if (ref === 'SnapWeapon') return [contest(family === 'st' ? base : attrShift(base, actor, 'ST'), 'thr cr')];
  if (ref === 'Feint') {
    const stat = { beat: 'ST', ruse: 'IQ', 'resist-ruse': 'PER' }[context.specialFeint];
    return [contest(stat ? attrShift(base, actor, stat) : base)];
  }
  if (ref === 'Evade') {
    const facing = { side: 2, back: 5 }[context.specialApproach] ?? 0;
    const posture = { standing: -5, kneeling: -2, prone: 5, other: 0 }[context.specialEvade] ?? null;
    return [contest(sum(base, sum(posture, facing)))];
  }
  if (ref === 'Trip') {
    const bonus = context.specialTrip === 'dive' && family === 'judo' ? 2 : 0;
    return [combatCheck('defense', 'Parry', 'Парирование', context.specialTrip ? base + bonus : null)];
  }
  if (['AggressiveParry', 'Jam', 'HandCatch'].includes(ref)) {
    const incoming = context.specialIncoming ?? '';
    const weapon = /^(swing|thrust)-(close|one|long)$/.exec(incoming);
    const kick = ['leg', 'foot'].includes(incoming);
    const catchWeapon = ref === 'HandCatch';
    if (catchWeapon && family === 'parry missile weapons') {
      const modifier = { 'missile-large': 4, 'missile-small': 2, 'missile-arrow': 0, 'missile-bolt': -2, 'missile-bullet': -5 }[incoming];
      return [combatCheck('defense', 'Parry', 'Перехват снаряда', sum(base, modifier))];
    }
    const swing = weapon?.[1] === 'swing';
    const extra = catchWeapon
      ? weapon && ['sumo wrestling', 'wrestling'].includes(family) ? -3 : 0
      : swing && ['boxing', 'brawling'].includes(family) ? -3 : kick && family === 'boxing' ? -2 : 0;
    const limb = ref === 'Jam' ? { leg: 0, arm: -2, foot: -2, hand: -4 } :
      { leg: -2, arm: -2, foot: -4, hand: -4 };
    const valid = catchWeapon ? !!weapon : !!weapon || Object.hasOwn(limb, incoming);
    const parry = combatCheck('defense', 'Parry', 'Парирование', valid ? base + extra : null);
    const strike = weapon ? -3 + reachPenalties[weapon[2]] + extra :
      (limb[incoming] ?? 0) + (kick && family === 'boxing' ? -2 : 0) - (context.specialRetraction ? 1 : 0);
    return [parry, combatCheck('followup', 'skill', catchWeapon ? 'Перехват оружия после Parry' : 'Ответное попадание после Parry',
      valid ? skill.underlyingLevel + strike - (ref === 'Jam' ? 2 : 0) : null,
      { damage: ref === 'Jam' ? 'jam' : ref === 'AggressiveParry' ? 'aggressiveParry' : null })];
  }
  if (kind === 'defense') return [combatCheck('defense', skill.defense ?? 'Parry', 'Своя активная защита', base)];
  if (ref === 'AcrobaticStand') {
    const auto = Number(Object.values(actor?.system?.encumbrance ?? {}).find(item => item.current)?.level);
    const level = /^[0-4]$/.test(context.specialEncumbrance ?? '') ? Number(context.specialEncumbrance) : Number.isInteger(auto) && auto >= 0 && auto <= 4 ? auto : null;
    return [combatCheck('skill', 'skill', 'Бросок подъёма', sum(base, level === null ? null : -level))];
  }
  const rolls = [combatCheck('skill', 'skill', 'Бросок техники', base)];
  if (ref === 'Entangle') rolls.push(contest(sum(st(disarming()), 2)));
  if (ref === 'RollWithBlow') {
    const yards = /^\d+$/.test(context.specialKnockback ?? '') ? Number(context.specialKnockback) : null;
    rolls.push(combatCheck('balance', 'DX', 'Устоять после отбрасывания', sum(attributes(actor, 'DX'), yards > 0 ? -yards : null)));
  }
  return rolls;
}

export function evaluateMeleeSpecial(rule, options = {}) {
  const { actor, attack, governingSkill, context = {} } = options;
  const profile = rule.specialProfile;
  const { ref, kind, confirm, cinematic, action } = profile;
  const hintContext = meleeSpecialHintContext(attack, governingSkill, actor);
  const matchup = !profile.context || hintContext[profile.context];
  const candidates = matchup ? specialBases(rule, options) : [];
  const requested = context.specialSkills?.[rule.id];
  const choices = candidates.map(skill => {
    const key = skill.defense && skill.defense !== skill.name ? skill.defense + ':' + skill.name : skill.name;
    const fencer = fencing.includes(meleeSkillFamily(skill));
    const defaultModifier = ref === 'GrandDisarm' && fencer ? -9 : rule.defaultModifier;
    const trained = !cinematic || cinematicTraining(actor, skill, attack, context);
    const learned = !action && trained && skill.learned !== false ? findTechniqueLevel({ actor, rule, skill,
      defaultModifier, maximum: rule.maximum, ...(skill.defense && profile.defenseChoice ? { defense: skill.defense } : {}) }) : null;
    const permitted = !cinematic || learned || (context.cinematicDefaults ?? allowsCinematicTechniqueDefaults());
    const level = learned ? learned.level : skill.level + defaultModifier;
    const mastery=techniqueMastery(actor,rule,skill,rule.maximum);
    return { key, skill, learned: !!learned, level, defaultModifier, permitted: !!permitted, mastery };
  });
  const choice = requested ? choices.find(item => item.key === requested) :
    choices.filter(item => item.permitted).sort((a, b) => b.level - a.level)[0];
  const parent = choice?.skill;
  const output = {
    id: rule.id, name: rule.name, operation: rule.operation, sources: rule.sources, notes: [],
    available: !!choice?.permitted, reason: !matchup ? 'Техника неприменима к выбранному профилю.' :
      choices.length ? 'Выберите допустимую специализацию или разрешите кинематографический Default.' : 'Нужен подходящий базовый навык или защита.',
    cap: null, reach: null, damageFlat: 0, damageType: null, damageReduction: false,
    special: { kind, ref, action, selectedSkill: choice?.key ?? requested,
      choices: choices.filter(item => item.permitted).map(({ key, skill, learned, level }) => ({ key, name: skill.name, learned, level })) }
  };
  if (!output.available) return output;
  const { level, learned, defaultModifier } = choice;
  const hands = attack?.meleeProfile?.strength?.hands ?? attack?.meleeProfile?.hands?.hands ?? null;
  const perks=[parent.adaptation,parent.armor,choice.mastery].filter(Boolean);
  Object.assign(output, { level, defaultLevel: parent.level + defaultModifier, maximum: parent.level + (choice.mastery?.maximum??rule.maximum),
    ...(perks.length?{perks}:{}),
    originalModifier: defaultModifier, defaultModifier, modifier: level - parent.level,
    governingSkill: parent.name, governingSkillLevel: parent.level, learned, hands, reason: null });
  const error = confirm && !context.specialConfirmed?.[ref] ? confirm : null;
  const attackCheck = kind === 'attack';
  const rolls = specialRolls(rule, parent, output, context, options);
  output.special = { ...output.special, confirm, error, hands, rolls, underlyingLevel: parent.underlyingLevel,
    fields: specialFields(ref, output, context) };
  if (attackCheck) output.notes.push('Против этой атаки Parry -2, Dodge и Block -1. Защита разрешается вручную. MA70.');
  return output;
}
