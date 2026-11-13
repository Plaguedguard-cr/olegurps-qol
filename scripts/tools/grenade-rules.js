import { fragmentRangeModifier } from './explosion-fragmentation.js';
import { readActorStrength } from './strength-service.js';

// B355, B226. Basic Lift uses real ST; the skill bonus affects distance ST only.
const DISTANCES = [[.05,3.5],[.1,2.5],[.15,2],[.2,1.5],[.25,1.2],[.3,1.1],[.4,1],
  [.5,.8],[.75,.7],[1,.6],[1.5,.4],[2,.3],[2.5,.25],[3,.2],[4,.15],[5,.12],[6,.1],[7,.09],[8,.08]];
const number = value => value === '' || value == null ? NaN : Number(value);
export const grenadeDirectionLabel=direction=>['вперёд','вперёд-вправо','назад-вправо','назад','назад-влево','вперёд-влево'][Number(direction)-1]??'без разброса';
export function grenadeSkills(actor, target = 'ground') {
  const dx = number(actor?.system?.attributes?.DX?.value), strength=readActorStrength(actor),st=number(strength.kinds.st.effective);
  const skills = [];
  const visit = tree => { for (const row of Object.values(tree ?? {})) {
    if (!row || typeof row !== 'object') continue;
    skills.push(row); visit(row.contains); visit(row.collapsed);
  }};
  visit(actor?.system?.skills);
  const level = name => Math.max(0, ...skills.filter(s => [s.name,s.originalName].some(n => String(n ?? '').trim().toLowerCase() === name))
    .map(s => number(s.level ?? s.import)).filter(Number.isFinite));
  const throwing = level('throwing'), dropping = level('dropping');
  const base = throwing || (target === 'ground' ? dx : Math.max(dx - 3, dropping ? dropping - 4 : -Infinity));
  return { dx, st, strengthRevision:strength.revision,throwing, base, label: throwing ? 'Throwing' : target === 'ground' ? 'DX (B355)' : dropping - 4 > dx - 3 ? 'Throwing (Dropping-4)' : 'Throwing (DX-3)',
    rangeBonus: throwing >= dx + 2 ? 2 : throwing >= dx + 1 ? 1 : 0 };
}
export function grenadeRange({ st, weight, rangeBonus = 0, saucer = false, basicLift = null }) {
  if (![st,weight,rangeBonus].every(Number.isFinite) || st <= 0 || weight <= 0) throw Error('Нужны достоверные ST и масса гранаты.');
  if (saucer) return { max: st * 5, half: st * 3, hands: 1, source: 'UT147' };
  const bl = basicLift ?? st * st / 5;
  if (!Number.isFinite(bl) || bl <= 0) throw Error('Некорректный Basic Lift.');
  const ratio = weight / bl;
  const row = DISTANCES.find(([r]) => ratio <= r);
  return { max: row ? (st + rangeBonus) * row[1] : 0, hands: ratio > 2 ? 2 : 1, source: 'B355/B226' };
}
export function grenadeCheck({ base, distance, target = 'ground', modifier = 0, unfamiliar = false, bounce = false, handlingPenalty=0 }) {
  if (![base,distance,modifier,handlingPenalty].every(Number.isFinite) || handlingPenalty>0 || distance < 0 || !['ground','individual'].includes(target)) throw Error('Проверьте навык, дистанцию и модификаторы.');
  const range = fragmentRangeModifier(distance), area = target === 'ground' ? 4 : 0;
  return { base, range, area, modifier, handlingPenalty,unfamiliar: unfamiliar ? -5 : 0, bounce: bounce ? -3 : 0,
    effective: Math.trunc(base + range + area + modifier + handlingPenalty - (unfamiliar ? 5 : 0) - (bounce ? 3 : 0)) };
}
export function grenadeScatter({ total, skill, distance, direction = 1, special = false, dodgeMargin = null }) {
  if (![total,skill,distance].every(Number.isFinite) || !Number.isInteger(total) || total < 3 || total > 18 || distance < 0 || !Number.isInteger(direction) || direction < 1 || direction > 6 ||
      dodgeMargin !== null && (!Number.isFinite(dodgeMargin) || dodgeMargin < 0)) throw Error('Некорректные данные разброса.');
  const criticalFailure = total === 18 || total === 17 && skill <= 15 || total - skill >= 10;
  const criticalSuccess = total <= 4 || total === 5 && skill >= 15 || total === 6 && skill >= 16;
  const success = criticalSuccess || total < 17 && total <= skill;
  const dodged = dodgeMargin !== null && success && !criticalSuccess;
  const margin = Math.max(0, total - skill), basis = dodged ? dodgeMargin : margin;
  const ambiguousAutomaticFailure=!success&&total===17&&margin===0;
  const yards = success && !dodged ? 0 : Math.min(special && !dodged ? basis ** 2 : basis, Math.ceil(distance / 2));
  return { total, skill, success: success && !dodged, criticalSuccess, criticalFailure, margin, dodgeMargin: dodged ? dodgeMargin : null,
    yards: criticalFailure||ambiguousAutomaticFailure ? null : yards, direction: criticalFailure||ambiguousAutomaticFailure||!yards ? null : direction,
    rule: dodged ? 'B414-Dodge' : special ? 'B414-square-capped-user' : 'B414', needsReview: criticalFailure||ambiguousAutomaticFailure };
}
// Continuous coordinates, in yards, clockwise bearing from north. No canvas access.
export function grenadeLanding({ intended, facing = 0, scatter }) {
  if (!intended || ![intended.x,intended.y,facing].every(Number.isFinite) || scatter.yards === null) return null;
  const angle = (facing + ((scatter.direction ?? 1) - 1) * 60) * Math.PI / 180;
  return { x: intended.x + Math.sin(angle) * scatter.yards, y: intended.y - Math.cos(angle) * scatter.yards };
}
