// Read-only credits for explicitly named, already applied native modifiers.
// Never infer a modifier from the difference between skill and imported attack totals.
import { getAttackOverride } from './weapon-attack-overrides.js';
export function rangedModifierKind(description) {
  const label = String(description ?? '').replace(/^[+-]\d+\s*/, '')
    .replace(/\s*(?:@|#).*$/, '').trim();
  return /^Weapon Bond(?:\s*\([^()]*\))?$/iu.test(label) ? 'weaponBond' : null;
}
export function nativeRangedModifierEvidence(actor, attack, runtime = globalThis) {
  // An explicit skill override replaces the native level; its composition is opaque.
  if (attack?.standaloneRef || getAttackOverride(actor?.getFlag?.('world', 'gurpsAmmoManager'), attack)) return [];
  const rows = [], seen = new Set();
  const name = String(attack?.data?.name ?? attack?.name ?? '');
  for (const item of actor?.items?.contents ?? actor?.items ?? []) {
    const data = item.system ?? {};
    if ((item.type === 'equipment' && !(data.equipped && data.carried)) ||
        !data.bonuses || (data.globalid && seen.has(data.globalid))) continue;
    if (data.globalid) seen.add(data.globalid);
    const kind = rangedModifierKind(data.ads?.originalName || data.ads?.name || item.name);
    if (!kind) continue;
    for (const raw of String(data.bonuses).split('\n')) {
      const otf = raw.trim().replace(/^\[(.*)\]$/, '$1');
      const action = runtime.GURPS?.parselink?.(otf)?.action;
      if (action?.type !== 'attack' || !action.isRanged || action.name !== name) continue;
      const value = Number(action.mod);
      if (!Number.isFinite(value)) continue;
      rows.push({kind, value, source: 'GGA Item bonuses', itemId: item.id,
        globalId: data.globalid ?? null, otf, attackName: name});
    }
  }
  return rows;
}
export function externalRangedModifierEvidence(entries, source) {
  return entries.flatMap(entry => {
    const kind = rangedModifierKind(entry.desc);
    if (!kind) return [];
    const value = Number(entry.modint ?? entry.mod ?? String(entry.desc).match(/^[+-]\d+/)?.[0]);
    return Number.isFinite(value)
      ? [{kind, value, source, description: String(entry.desc), tags: entry.tags ?? []}] : [];
  });
}
