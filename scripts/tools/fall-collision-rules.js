import { basicDamageDice } from './basic-damage-dice.js';
import { basicStrengthDamage } from './gurps-strength-damage.js';

// GURPS Basic Set 4e: B430–432. Pure functions; no Actor or Foundry writes.
export const FALL_PRESETS = Object.freeze({
  prone: { label: 'Человек – плашмя', optionLabel: 'Плашмя (60)', terminal: 60 },
  normal: { label: 'Человек – обычное падение', optionLabel: 'Обычное падение (80)', terminal: 80 },
  streamlined: { label: 'Человек – ногами или головой вниз', optionLabel: 'Вертикально (100)', terminal: 100 },
  dense: { label: 'Плотный или обтекаемый предмет', optionLabel: 'Плотный предмет (200)', terminal: 200 }
});
export const FALL_COLLISION_DEFAULTS = Object.freeze({
  gravity: .138, pressure: 1, height: 19, hp: 10, fallType: 'normal', customTerminal: 120,
  hardSurface: true, acrobatics: false, breakable: false, barrierHp: 10, barrierDr: 0,
  tab: 'fall', collisionMode: 'object',
  object: Object.freeze({ hpA: 10, hpB: 10, speedA: 5, speedB: 5, angle: 'headOn' }),
  obstacle: Object.freeze({ hp: 10, speed: 5, hardSurface: true, breakable: false, barrierHp: 10, barrierDr: 0 }),
  overrun: Object.freeze({ hpA: 60, hpB: 10, speedA: 25, speedB: 5, angle: 'rearEnd', smA: 2, smB: 0, st: '' })
});
export const ANGLES = Object.freeze({ headOn: 'Лобовое', rearEnd: 'Удар сзади', sideOn: 'Боковое' });
export const COLLISION_MODES = Object.freeze({ object: 'С объектом', obstacle: 'С препятствием', overrun: 'Наезд (Overrun)' });
export const asBool = v => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
export function numeric(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return NaN;
  return Number(String(value).trim().replace(',', '.'));
}
function number(value, label, positive = false) {
  const n = numeric(value);
  if (!Number.isFinite(n) || (positive ? n <= 0 : n < 0)) throw Error(`${label}: требуется ${positive ? 'положительное' : 'неотрицательное'} конечное число.`);
  return n;
}
function finite(value) {
  if (!Number.isFinite(value)) throw Error('Слишком большие значения для расчёта.');
  return value;
}

/** Read old world.gurpsFallDamageMacro flags without writing a migration on open. */
export function fallCollisionSettings(saved = {}) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const d = FALL_COLLISION_DEFAULTS, result = { ...d, ...saved };
  const old = numeric(saved.terminalEarth);
  result.fallType = Object.hasOwn(FALL_PRESETS, saved.fallType) || saved.fallType === 'custom' ? saved.fallType :
    old > 0 && Number.isFinite(old) ? Object.entries(FALL_PRESETS).find(([, p]) => Math.abs(p.terminal - old) < .001)?.[0] ?? 'custom' : d.fallType;
  result.customTerminal = numeric(saved.customTerminal) > 0 && Number.isFinite(numeric(saved.customTerminal)) ? numeric(saved.customTerminal) :
    old > 0 && Number.isFinite(old) ? old : d.customTerminal;
  for (const k of ['gravity', 'pressure', 'height', 'hp', 'barrierHp', 'barrierDr']) result[k] = saved[k] ?? d[k];
  for (const k of ['hardSurface', 'acrobatics', 'breakable']) result[k] = saved[k] === undefined ? d[k] : asBool(saved[k]);
  result.tab = saved.tab === 'collision' ? 'collision' : 'fall';
  result.collisionMode = Object.hasOwn(COLLISION_MODES, saved.collisionMode) ? saved.collisionMode : 'object';
  for (const k of ['object', 'obstacle', 'overrun']) result[k] = { ...d[k], ...(saved[k] && typeof saved[k] === 'object' ? saved[k] : {}) };
  for (const k of ['hardSurface', 'breakable']) result.obstacle[k] = asBool(result.obstacle[k]);
  return result;
}

export function freeFallVelocity(height, gravity) {
  return Math.round(Math.sqrt(finite(21.4 * number(gravity, 'Гравитация') * number(height, 'Высота'))));
}
export function localTerminalVelocity(earth, gravity, pressure) {
  earth = number(earth, 'Земная конечная скорость', true);
  gravity = number(gravity, 'Гравитация'); pressure = number(pressure, 'Давление');
  return pressure === 0 ? Infinity : finite(earth * Math.sqrt(gravity) / Math.sqrt(pressure));
}
export function collisionDice(hp, speed) {
  const rawDice = finite(number(hp, 'HP', true) * number(speed, 'Скорость') / 100);
  return { rawDice, dice: basicDamageDice(rawDice), type: 'cr' };
}
export function barrierLimit(enabled, hp, dr) {
  return enabled ? finite(number(hp, 'HP преграды', true) + number(dr, 'DR преграды')) : null;
}
// This cap is applied to points after a damage roll, never converted into dice.
export function limitBarrierDamage(rolledDamage, cap) {
  const damage = number(rolledDamage, 'Выпавшие повреждения');
  return cap === null ? damage : Math.min(damage, number(cap, 'Предел повреждений'));
}
export function immovableCollision({ hp, speed, hardSurface = true, breakable = false, barrierHp, barrierDr }) {
  hp = number(hp, 'HP движущегося объекта', true); speed = number(speed, 'Скорость');
  const effectiveHp = finite(hp * (asBool(hardSurface) ? 2 : 1));
  const damage = collisionDice(effectiveHp, speed), cap = barrierLimit(asBool(breakable), barrierHp, barrierDr);
  return { hp, speed, effectiveHp, hardSurface: asBool(hardSurface), damage, cap,
    barrierHp: cap === null ? null : numeric(barrierHp), barrierDr: cap === null ? null : numeric(barrierDr),
    toObstacle: damage, toMover: damage };
}
export function calculateFall(input) {
  const height = number(input.height, 'Высота'), gravity = number(input.gravity, 'Гравитация'), pressure = number(input.pressure, 'Давление');
  const acrobatics = asBool(input.acrobatics), effectiveHeight = Math.max(0, height - (acrobatics ? 5 : 0));
  if (!Object.hasOwn(FALL_PRESETS, input.fallType) && input.fallType !== 'custom') throw Error('Выберите допустимый тип падения.');
  const terminalEarth = input.fallType === 'custom' ? number(input.customTerminal, 'Земная конечная скорость', true) : FALL_PRESETS[input.fallType].terminal;
  const freeSpeed = freeFallVelocity(effectiveHeight, gravity), terminalSpeed = localTerminalVelocity(terminalEarth, gravity, pressure);
  const speed = Math.min(freeSpeed, terminalSpeed);
  return { kind: 'fall', height, effectiveHeight, acrobatics, gravity, pressure, terminalEarth, freeSpeed, terminalSpeed,
    fallType: input.fallType, limited: freeSpeed > terminalSpeed,
    ...immovableCollision({ ...input, speed }) };
}
export function collisionVelocity(speedA, speedB, angle) {
  speedA = number(speedA, 'Скорость A'); speedB = number(speedB, 'Скорость B');
  if (!Object.hasOwn(ANGLES, angle)) throw Error('Выберите характер столкновения.');
  return angle === 'headOn' ? finite(speedA + speedB) : angle === 'rearEnd' ? Math.max(0, speedA - speedB) : speedA;
}
export function objectCollision(input) {
  const hpA = number(input.hpA, 'HP участника A', true), hpB = number(input.hpB, 'HP участника B', true);
  const speedA = number(input.speedA, 'Скорость A'), speedB = number(input.speedB, 'Скорость B'), angle = input.angle;
  const speed = collisionVelocity(speedA, speedB, angle);
  const originalA = collisionDice(hpA, speed), originalB = collisionDice(hpB, speed);
  let a = originalA.rawDice, b = originalB.rawDice;
  const limits = [];
  if (angle === 'headOn' && speedA < speedB && a > b) { a = b; limits.push('A'); }
  if ((angle === 'headOn' && speedB < speedA || angle !== 'headOn') && b > a) { b = a; limits.push('B'); }
  return { kind: 'object', hpA, hpB, speedA, speedB, angle, speed, originalA, originalB,
    toB: { rawDice: a, dice: basicDamageDice(a), type: 'cr' },
    toA: { rawDice: b, dice: basicDamageDice(b), type: 'cr' }, limits };
}
export function overrunDamage({ hpA, st, smA, smB }, speed) {
  const sizes = [numeric(smA), numeric(smB)];
  if (!sizes.every(Number.isSafeInteger)) throw Error('SM обоих участников должны быть целыми числами.');
  const hasST = st !== undefined && st !== null && String(st).trim() !== '';
  const basis = hasST ? number(st, 'ST ударяющего объекта', true) : number(hpA, 'HP ударяющего объекта', true);
  const effectiveST = Math.floor(basis / 2); // General rounding down, B9.
  const eligible = sizes[0] - sizes[1] >= 2 && number(speed, 'Скорость столкновения') > 0;
  const dice = eligible ? basicStrengthDamage(effectiveST, 'thrust') : null;
  return { eligible, dice, type: 'cr', basis, source: hasST ? 'ST' : 'HP', effectiveST, smA: sizes[0], smB: sizes[1],
    reason: sizes[0] - sizes[1] < 2 ? 'Разница SM меньше 2.' : speed <= 0 ? 'Нет столкновения: скорость равна 0.' :
      dice === null ? 'Половина HP/ST вне поддерживаемого диапазона таблицы thrust; дополнительный урон определяется вручную.' : 'SM объекта A больше SM цели минимум на 2 (B432).' };
}
export function calculateCollision(mode, input) {
  if (mode === 'obstacle') return { kind: 'obstacle', ...immovableCollision(input) };
  if (!['object', 'overrun'].includes(mode)) throw Error('Выберите режим столкновения.');
  const collision = objectCollision(input);
  return mode === 'overrun' ? { ...collision, kind: 'overrun', overrun: overrunDamage(input, collision.speed) } : collision;
}
