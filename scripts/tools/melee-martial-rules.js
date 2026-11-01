import { meleeSource } from '../melee-source-data.js';

export const meleeMartialMessages = Object.freeze({
  ru: {
    balancedHint: 'Урон: −2 или −1/куб, что хуже; +1 к разрешённому Parry или Block.',
    unbalancedHint: 'Урон: −2 или −1/куб, что хуже; этим оружием Parry без +1, другим оружием Parry/Block +1.',
    kickHint: 'Урон: −2 или −1/куб, что хуже; +2 против захвата ноги и к DX против падения.',
    unknownHint: 'Урон: −2 или −1/куб, что хуже; условия защиты – MA100.',
    noParryHint: 'Урон: −2 или −1/куб, что хуже; Parry недоступен, другая защита – MA100.',
    strongHint: 'Determined: +2 к попаданию. Strong: +1 только к подтверждённому sw/thr Damage. Фиксированный урон не увеличивается. Разрешённые активные защиты: −2; Retreat недоступен. MA99–100.',
    strongApplied: 'Committed Attack (Strong): +1 к ST-based Damage',
    strongUnchanged: 'Committed Attack (Strong): урон не увеличен; ST-based источник не подтверждён'
  },
  en: {
    balancedHint: 'Damage: −2 or −1/die, whichever is worse; +1 to an eligible Parry or Block.',
    unbalancedHint: 'Damage: −2 or −1/die, whichever is worse; this weapon parries without +1, another weapon gets Parry/Block +1.',
    kickHint: 'Damage: −2 or −1/die, whichever is worse; +2 against Leg Grapple and to DX to avoid falling.',
    unknownHint: 'Damage: −2 or −1/die, whichever is worse; defense conditions: MA100.',
    noParryHint: 'Damage: −2 or −1/die, whichever is worse; no Parry, other defenses follow MA100.',
    strongHint: 'Determined: +2 to hit. Strong: +1 only to confirmed ST-based swing/thrust damage. Fixed damage is unchanged. Eligible active defenses: −2; no Retreat. MA99–100.',
    strongApplied: 'Committed Attack (Strong): +1 ST-based damage',
    strongUnchanged: 'Committed Attack (Strong): unchanged damage; no confirmed ST-based source'
  }
});
// Module-owned UI stays Russian independently of Foundry's language.
export const meleeMartialText = (key, language='ru') => meleeMartialMessages[language]?.[key] ?? meleeMartialMessages.ru[key];
const stExpression = value => /^(?:sw(?:ing)?|thr(?:ust)?)(?=\s|[+\-(!]|$)/i.test(String(value??'').trim());

/** Require unmaterialized provenance. Numeric imported totals cannot prove that +1 is absent. */
export function committedStrongEligible(attack, action=null) {
  if (action?.olegurpsCommittedStrong?.applied) return false;
  if (attack?.meleeProfile?.motion === 'fixed') return false;
  if (attack?.hasMeleeDamageOverride && !stExpression(attack.damage)) return false;
  action ??= [attack?.damageAction,attack?.action?.damage,attack?.data?.damageAction,
    attack?.data?.action?.damage,attack?.data?.parsedDamage,attack?.data?.damage]
    .map(a=>a?.action??a).find(a=>['damage','deriveddamage'].includes(a?.type));
  action = action?.action ?? action;
  if (action) return action.type === 'deriveddamage' && /^(?:sw(?:ing)?|thr(?:ust)?)$/i.test(String(action.derivedformula??'').trim());
  return stExpression(attack?.damage) && (!attack?.meleeProfile || ['swing','thrust'].includes(attack.meleeProfile.motion));
}

/** Only the selected attack/mode supplies balance and kick identity; no item-name inference. */
export function defensiveAttackContext(attack) {
  const profile=attack?.meleeProfile;
  const source=profile?.modeId ? meleeSource(profile.modeId) : null;
  const kick=source?.technique==='Kicking' || profile?.attackType==='kick' ||
    (!profile && (attack?.attackType==='kick' || attack?.data?.attackType==='kick' ||
      /^(?:kick|kicking|удар ногой)$/iu.test(String(attack?.mode??attack?.data?.mode??'').trim())));
  const currentParry=profile?.parry ?? attack?.parry ?? attack?.data?.parry;
  const unavailable=value=>/^(?:no|none|нет|нельзя|[-–])$/iu.test(String(value??'').trim());
  const noParry=unavailable(currentParry)||unavailable(source?.stats?.parry);
  const parry=String(source?.stats?.parry ?? currentParry ?? '').trim();
  const kind=kick?'kick':noParry?'noParry':/^[+-]?\d+[UF]*U[UF]*$/i.test(parry)?'unbalanced':/^[+-]?\d+F?$/i.test(parry)?'balanced':'unknown';
  return {kind,hint:meleeMartialText(kind+'Hint')};
}
