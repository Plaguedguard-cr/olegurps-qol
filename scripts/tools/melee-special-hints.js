import { moduleText } from '../localization.js';
import { meleeSource } from '../melee-source-data.js';
import { learnedMeleeSkills, meleeSkillFamily } from './melee-penalty-techniques.js';
import { strikeReachValues } from './melee-strike-techniques.js';
import { meleeSpecialReferences as references } from './melee-special-data.js';

const fencing = ['main-gauche', 'rapier', 'saber', 'smallsword'];
const longWeaponSkills = ['polearm', 'spear', 'staff', 'two-handed axe/mace', 'two-handed flail', 'two-handed sword'];
const flexibleSkills = ['flail', 'kusari', 'monowire whip', 'two-handed flail', 'whip', 'net', 'garrote', 'cloak'];
const publishedHookModels = ['lt:khopesh', 'lt:cane', 'lt:strigil', 'lt:dueling-long-shield'];

export function meleeSpecialHintContext(attack, governingSkill, actor) {
  if (!attack?.key && !attack?.name) return {};
  const mode = attack.meleeProfile;
  const source = meleeSource(mode?.modeId);
  const unarmed = attack.unarmedRef?.profile;
  const weapon = !unarmed && !mode?.unarmed;
  const hands = mode?.strength?.hands;
  const family = meleeSkillFamily(governingSkill);
  const learned = new Set(learnedMeleeSkills(actor).map(meleeSkillFamily));
  const has = (...families) => families.some(skill => family === skill || learned.has(skill));
  const hasParry = /^-?\d/.test(String(mode?.parry ?? attack.parry ?? attack.data?.parry ?? '').trim());
  const reach = strikeReachValues(mode?.reach ?? attack.reach ?? attack.data?.reach);
  const longWeapon = weapon && hands !== 1 && reach.some(value => value >= 2) && longWeaponSkills.includes(family);
  const jitte = family === 'jitte/sai';
  const fencer = fencing.includes(family);
  const shield = family === 'shield';
  const grip = mode?.grip;

  return {
    any: true,
    weapon,
    parry: hasParry,
    sweep: longWeapon || !weapon && (has('judo', 'karate', 'sumo wrestling') ||
      unarmed?.part === 'striker' && has('brawling')),
    hook: weapon && (source?.hook === true || ['hook-edge', 'kama-edge'].includes(source?.damagePart) ||
      publishedHookModels.includes(source?.modelId) || !source && ['axe/mace', 'two-handed axe/mace', 'polearm'].includes(family)),
    bind: weapon && (jitte || fencer),
    kusari: weapon && (source?.modelId === 'lt:kusari' || !source && family === 'kusari'),
    snap: !weapon || jitte,
    trip: has('judo', 'sumo wrestling', 'wrestling'),
    aggressive: has('boxing', 'brawling', 'karate'),
    jam: has('brawling', 'karate'),
    lowLine: has('boxing', 'sumo wrestling'),
    catch: has('judo', 'sumo wrestling', 'wrestling', 'parry missile weapons'),
    clap: has('judo', 'karate'),
    roll: has('acrobatics', 'boxing', 'brawling', 'karate', 'judo', 'sumo wrestling', 'wrestling'),
    cross: hasParry && hands !== 2,
    supported: weapon && hasParry && hands !== 2,
    breakfall: has('acrobatics', 'judo', 'wrestling'),
    acrobatic: has('acrobatics'),
    shin: mode?.attackType === 'kick' || ['kick', 'boots', 'gripboots'].includes(unarmed?.id) ||
      unarmed?.part === 'striker' || has('brawling', 'karate'),
    shove: weapon && (shield || !flexibleSkills.includes(family) && reach.some(value => value >= 1)),
    longSlam: longWeapon && (family !== 'two-handed sword' || grip === 'defensive'),
    stopThrust: weapon && (mode?.motion === 'thrust' || /^thr\b/.test(String(attack.damage ?? ''))),
    longAttack: grip !== 'defensive',
    pummel: weapon && source?.modelId !== 'lt:haladie' && (fencer || ['broadsword', 'shortsword', 'two-handed sword', 'tonfa'].includes(family) ||
      reach.some(value => value <= 1))
  };
}

function referenceText(key, english) {
  const i18n = globalThis.game?.i18n;
  if (i18n?.lang === 'en') {
    const translated = i18n.localize?.(key);
    if (translated && translated !== key) return translated;
    if (english) return english;
  }
  return moduleText(key);
}

export function meleeSpecialHints({ attack, governingSkill, actor } = {}) {
  const context = meleeSpecialHintContext(attack, governingSkill, actor);
  return references.filter(([, , , condition]) => context[condition]).map(([id]) => meleeSpecialHint(id));
}

export function meleeSpecialHint(id) {
  const reference = references.find(row => row[0] === id);
  if (!reference) return null;
  const [, name, sources] = reference;
  const key = 'OleGURPS.MeleeSpecialHint.' + id;
  return { id, name, title: referenceText(key + '.Title', name), text: referenceText(key + '.Text'), sources };
}

export const meleeSpecialHintIds = Object.freeze(references.map(([id]) => id));
