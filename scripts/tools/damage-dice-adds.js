import { parseKineticDamage } from './kinetic-damage-math.js';

export const DAMAGE_DICE_ADDS_FLAG = 'convertDamageAddsToDice';
const scope = 'olegurps-qol';

// User document storage, shared across browsers, never a world/client setting.
export function readDamageDiceAddsPolicy(user = globalThis.game?.user) {
  return { version: 1, source: 'B269', userId: user?.id ?? null,
    enabled: user?.getFlag?.(scope, DAMAGE_DICE_ADDS_FLAG) !== false };
}

export async function saveDamageDiceAddsPreference(enabled, runtime = globalThis) {
  const user = runtime.game?.user;
  if (!user?.setFlag) throw new Error('UserUnavailable');
  await user.setFlag(scope, DAMAGE_DICE_ADDS_FLAG, enabled === true);
}

// B269, after all per-die bonuses and source conversions. Preserve GGA suffixes.
export function normalizeDamageDiceAdds(formula) {
  const p = parseKineticDamage(formula);
  if (!p || !Number.isInteger(p.dice) || p.adds < 4) return formula;
  const pairs = Math.floor(p.adds / 7), remainder = p.adds % 7;
  const dice = p.dice + pairs * 2 + (remainder >= 4 ? 1 : 0);
  const adds = remainder >= 4 ? remainder - 4 : remainder;
  return dice + 'd' + (adds ? '+' + adds : '') +
    (p.multiplier !== 1 ? 'x' + p.multiplier : '') +
    (p.divisor !== 1 ? '(' + p.divisor + ')' : '') + p.minimum + ' ' + p.type + p.suffix;
}

// Only the confirmed firearm's primary piercing component; payloads keep their own math.
export function applyDamageDiceAdds(damage, { policy, mode, book }) {
  const eligible = ['ht', 'ut', 'lt'].includes(String(book ?? '').toLowerCase()) &&
    mode?.combat_type === 'ranged' && mode.weapon_family === 'firearm' &&
    (damage.rules.primaryDamageRole ?? 'kinetic') === 'kinetic' &&
    damage.nativeSafe && !!parseKineticDamage(damage.formula);
  const from = damage.formula;
  if (policy.enabled && eligible) {
    damage.formula = normalizeDamageDiceAdds(from);
    for (const component of damage.components)
      if (component.role === 'kinetic' && component.status === 'resolved')
        component.formula = normalizeDamageDiceAdds(component.formula);
    damage.effectiveChanges = { ...damage.effectiveChanges, damage: damage.formula };
  }
  const applied = from !== damage.formula;
  if (applied) damage.transformations.push({ source: 'B269', effectId: 'damage-dice-adds',
    field: 'damage', from, to: damage.formula, applied: true,
    order: damage.transformations.length + 1, reason: 'after-source-and-ammunition-modifiers' });
  return { ...policy, eligible: !!eligible, applied };
}
