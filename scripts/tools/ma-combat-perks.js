import { finiteLevel, objectSkillRows, readCombatTechniqueSkills } from './combat-technique-data.js';

export const perkKey = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()
  .replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, ' ');

export function readCombatPerks(actor, name) {
  const base = perkKey(name);
  const seen = new Set();
  return objectSkillRows(actor?.system?.ads).flatMap(entry => {
    if (entry.disabled === true || entry.active === false) return [];
    const levels = Math.max(1, Math.trunc(Number(entry.levels) || 1));
    const nameWithRank = perkKey(entry.name);
    const suffix = ' ' + levels;
    const part = entry.levels && nameWithRank.endsWith(suffix) ? nameWithRank.slice(0,-suffix.length) : nameWithRank;
    const label = [part,perkKey(entry.originalName)].find(n => n === base || n.startsWith(base + ' (') && n.endsWith(')'));
    if (!label) return [];
    const id=entry.uuid??entry.itemid;
    if(id&&seen.has(id))return [];
    if(id)seen.add(id);
    const specialization = label === base ? perkKey(entry.specialization ?? entry.specialty ?? entry.skillName) :
      label.slice(base.length + 2, -1);
    return [{ specialization, levels }];
  });
}

const skillKey = name => perkKey(name).replace(/\s*\/\s*tl\d+(?=\s|$)/i, '');
export const hasSpecializedCombatPerk = (actor, perk, skill) => !!skill &&
  readCombatPerks(actor, perk).some(({ specialization }) => specialization === skillKey(skill));

export function strongbowBonus(actor) {
  if (!readCombatPerks(actor, 'Strongbow').some(p => !p.specialization)) return 0;
  const dx = finiteLevel({ level: actor?.system?.attributes?.DX?.value });
  const bonuses = readCombatTechniqueSkills(actor, { objectRows: true }).flatMap(entry => {
    if (perkKey(entry.name) !== 'bow' && perkKey(entry.originalName) !== 'bow') return [];
    if (!(entry.learned === true || Number(entry.points) > 0) || perkKey(entry.type) === 'technique') return [];
    const relative = /^dx(?:\s*([+-])\s*(\d+))?$/i.exec(String(entry.relativelevel ?? entry.relativeLevel ?? '').trim());
    const level = finiteLevel(entry);
    return [relative ? Number(relative[2] ?? 0) * (relative[1] === '-' ? -1 : 1) :
      dx !== null && level !== null ? level - dx : 0];
  });
  return Math.min(2, Math.max(0, ...bonuses));
}

export function armorFamiliarity(actor, skill, penalty) {
  const levels = readCombatPerks(actor, 'Armor Familiarity').filter(p => p.specialization === skillKey(skill))
    .reduce((sum, perk) => sum + perk.levels, 0);
  return Math.min(Math.max(0, penalty), levels);
}

export function techniqueMastery(actor, rule, skill, maximum, specialization = null, defense = null) {
  if (!Number.isFinite(maximum) || maximum < 0 || defense || skill?.defense || rule.specialProfile?.action ||
      rule.specialProfile?.kind === 'defense' || rule.specialProfile?.defenseChoice || rule.targeted ||
      ['basicPunch', 'basicKick', 'judoGrapple', 'karatePunch'].includes(rule.id)) return null;
  const parts = [skillKey(skill?.name), perkKey(specialization)].filter(Boolean);
  if (!parts.length) return null;
  const names = (rule.aliases ?? [rule.name]).map(perkKey);
  const matching = readCombatPerks(actor, 'Technique Mastery').some(perk =>
    names.some(name => perk.specialization === name + ' (' + parts.join(', ') + ')' ||
      parts.length === 2 && perk.specialization === name + ' (' + parts[0] + ') (' + parts[1] + ')'));
  if (!matching) return null;
  const modifier = maximum === 0 ? 4 : 2;
  return { name: 'Technique Mastery', modifier, maximum: maximum + modifier, source: 'MA52' };
}

export function adaptedTechniqueDefault(actor, rule, skill, defaults) {
  const target = skillKey(skill);
  const names = (rule.aliases ?? [rule.name]).map(perkKey);
  const pairs = Object.entries(defaults).filter(([name, value]) =>
    !['dx', 'unarmed', 'weapon'].includes(perkKey(name)) && Number.isFinite(value));
  const allowed = readCombatPerks(actor, 'Skill Adaptation').flatMap(({ specialization }) => {
    const match = /^(.+?) (?:defaults? to) (.+)$/.exec(specialization);
    if (!match || skillKey(match[2]) !== target) return [];
    return names.includes(match[1]) ? pairs : pairs.filter(([name]) => match[1] === skillKey(name) + ' techniques');
  });
  const kicking = rule.id==='kicking'||/kick/i.test(rule.name)&&['foot','feet'].includes(rule.strikeProfile?.part);
  const acrobatic = target === 'acrobatics' && kicking && readCombatPerks(actor, 'Acrobatic Kicks').some(p => !p.specialization);
  if (acrobatic) allowed.push(...pairs.filter(([name]) => ['brawling', 'karate'].includes(perkKey(name))));
  if (!allowed.length) return null;
  return { name: acrobatic ? 'Acrobatic Kicks' : 'Skill Adaptation', defaultModifier: Math.max(...allowed.map(([, value]) => value)), source: 'MA51' };
}

export const kickingAdaptation = (actor, skill) => adaptedTechniqueDefault(actor,
  {id:'kicking',name:'Kicking'}, skill, {Brawling:-2,Karate:-2});

const exoticBalance = {
  'lt:trident': 'LT64,69', 'lt:three-part-staff': 'LT70', 'lt:dueling-long-shield': 'LT116',
  'lt:hungamunga': 'LT78', 'lt:large-hungamunga': 'LT78', 'lt:large-throwing-knife': 'LT78',
  'lt:small-throwing-knife': 'LT78', 'lt:qian-kun-ri-yue-dao': 'LT60', 'lt:haladie': 'LT56',
  'lt:harpoon': 'LT72'
};

export function weaponPenaltyPerk(actor, profile, skill, penalty) {
  if (!Number.isFinite(penalty) || penalty >= 0) return null;
  const published = profile?.skillAttackModifiers?.[skill] ?? profile?.attackModifier;
  if (penalty !== published) return null;
  const balanceSource = exoticBalance[profile?.modelId];
  if (balanceSource && hasSpecializedCombatPerk(actor, 'Exotic Weapon Training', profile.name))
    return { name: 'Exotic Weapon Training', modifier: -penalty, source: 'MA50; ' + balanceSource };
  if (profile?.improvised === true && profile.sourcePages.includes('LT63') &&
      hasSpecializedCombatPerk(actor, 'Improvised Weapons', skill))
    return { name: 'Improvised Weapons', modifier: -penalty, source: 'MA50; LT9,63' };
  return null;
}

// B208–221/B273: directed replacement defaults for these one-handed skill families.
const oneHandedReplacements = {
  Broadsword: ['Shortsword', 'Rapier', 'Saber'],
  Shortsword: ['Broadsword', 'Smallsword', 'Saber', 'Knife', 'Jitte/Sai', 'Tonfa'],
  Smallsword: ['Shortsword', 'Rapier', 'Saber', 'Main-Gauche'],
  Rapier: ['Broadsword', 'Smallsword', 'Saber', 'Main-Gauche'],
  Saber: ['Broadsword', 'Shortsword', 'Rapier', 'Smallsword', 'Main-Gauche'],
  Knife: ['Shortsword', 'Main-Gauche'],
  'Main-Gauche': ['Knife', 'Rapier', 'Saber', 'Smallsword', 'Jitte/Sai'],
  'Jitte/Sai': ['Shortsword', 'Main-Gauche'],
  Tonfa: ['Shortsword']
};
// B208: the arrows point from the published skill to the replacement whose Default names it.
const twoHandedReplacements = {
  Spear: ['Staff', 'Polearm'],
  Staff: ['Spear', 'Polearm'],
  Polearm: ['Staff', 'Spear', 'Two-Handed Axe/Mace'],
  'Two-Handed Axe/Mace': ['Polearm', 'Two-Handed Flail'],
  'Two-Handed Flail': ['Two-Handed Axe/Mace']
};

export function weaponAdaptations(actor, profile) {
  if (!profile || profile.technique || profile.improvised) return [];
  const twoHands = profile.hands === 2 || profile.requiresTwoHands || /[†‡]/.test(profile.stats?.st ?? '');
  const replacements = twoHands ? twoHandedReplacements : oneHandedReplacements;
  return readCombatPerks(actor, 'Weapon Adaptation').flatMap(({ specialization }) => {
    const [usual, replacement, extra] = specialization.split(' to ');
    const current = profile.primarySkills.find(name => perkKey(name) === usual && Object.hasOwn(replacements, name));
    const skill = current && replacements[current].find(name => perkKey(name) === replacement);
    if (!skill || extra !== undefined || profile.primarySkills.includes(skill)) return [];
    return [{ name: 'Weapon Adaptation', from: current, skill, hands: twoHands ? 2 : 1, source: 'MA52; B208-221,273' }];
  });
}

const intoxication = [
  ['drunk', 'GURPS.modifierAfflictionDrunk', 2],
  ['tipsy', 'GURPS.modifierAfflictionTipsy', 1]
];

export function combatIntoxication(actor) {
  const states = intoxication.filter(([status]) => actor?.statuses?.has(status));
  if (!states.length) return null;
  const effects = Array.from(actor.effects ?? []);
  const conditions = actor.system?.conditions?.self?.modifiers ?? [];
  const sources = states.map(([status, key, bonus]) => {
    const ids = effects.filter(effect => !effect.disabled && !effect.isSuppressed && effect.statuses?.has(status))
      .map(effect => 'eft:' + effect.id);
    const modifiers = conditions.filter(modifier => {
      const words=String(modifier).split(/\s+/);
      return words[0]===key&&(words.some(word=>word.startsWith('@')&&ids.includes(word.slice(1)))||
        words.includes('@combatmod')&&words.includes('#'+status));
    });
    return {status, key, bonus, ids, modifiers};
  });
  return { status: states[0][0], severity: states[0][2], sources };
}

export function drunkenFighting(actor, condition = combatIntoxication(actor)) {
  if (!condition || !readCombatPerks(actor, 'Drunken Fighting').some(p => !p.specialization) ||
      !readCombatPerks(actor, 'Trained by a Master').length && !readCombatPerks(actor, 'Weapon Master').length) return null;
  return { ...condition, name: 'Drunken Fighting', modifier: condition.severity, source: 'MA49-50; B428' };
}

export function drunkenPreviewCredit(perk, entries, i18n = globalThis.game?.i18n) {
  if (!perk) return 0;
  return entries.reduce((sum, entry) => {
    const source = perk.sources.find(source => (source.ids.includes(entry.itemId)||
      entry.itemId==='combatmod'&&entry.tags?.includes(source.status)&&source.modifiers.length>0) &&
      entry.desc === i18n?.localize(source.key) && entry.modint === -source.bonus);
    return sum + (source?.bonus ?? 0);
  }, 0);
}

export function drunkenTaggedCredit(actor, attack, perk, type, game = globalThis.game) {
  if (!perk || !game?.settings) return 0;
  const settings = game.settings.get('gurps', 'use-tagged-modifiers');
  if (!settings?.autoAdd) return 0;
  const tags = new Set([settings.allRolls, settings.allAttackRolls,
    type === 'melee' ? settings.allMeleeRolls : settings.allRangedRolls,
    (attack?.data ?? attack)?.modifierTags].flatMap(tags => String(tags ?? '').split(',').map(tag => tag.trim().toLowerCase())));
  const inCombat = game.combat?.isActive && game.combat.combatants.some(combatant => combatant.actor?.id === actor.id);
  if (inCombat ? tags.has(settings.nonCombatOnlyTag) : tags.has(settings.combatOnlyTag)) return 0;
  return perk.sources.reduce((sum, {bonus, modifiers}) => sum + modifiers.reduce((credit, raw) =>
    credit + bonus * (raw.match(/#\S+/g) ?? []).filter(tag => tags.has(tag.slice(1).toLowerCase())).length, 0), 0);
}

export function combatPerkLabel(perk, i18n = globalThis.game?.i18n) {
  const key = 'OleGURPS.CombatPerk.' + perk.name.replace(/[^a-z]/gi, '');
  const label = i18n?.has?.(key) ? i18n.localize(key) : perk.name;
  const value = perk.modifier ?? perk.defaultModifier;
  return label + (Number.isFinite(value) ? ' ' + (value >= 0 ? '+' : '') + value : perk.skill ? ' · ' + perk.skill : '') +
    ' (' + perk.source + ')';
}

export function rangedPerkContext(calculation) {
  const { combatPerks, rangedHand, intoxication } = calculation?.metadata ?? {};
  return {
    ...(combatPerks?.length ? {combatPerks} : {}),
    ...(rangedHand ? {rangedHand} : {}),
    ...(intoxication ? {intoxication} : {})
  };
}
